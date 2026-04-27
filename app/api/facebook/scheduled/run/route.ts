import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { executeFacebookGroupPost } from "@/lib/facebook-group-post-internal";
import { normalizeAccessToken } from "@/lib/facebook-graph";
import { resolveActiveFacebookAccount } from "@/lib/facebook-account-server";
import {
  assertCanPost,
  QuotaExceededError,
  recordSuccessfulGroupPost,
} from "@/lib/group-post-quota";
import {
  addRepeatInterval,
  deleteScheduledJob,
  jobImageAbsolutePath,
  listScheduledJobs,
  replaceJobAfterRun,
  type ScheduledGroupPostJob,
} from "@/lib/scheduled-group-post-store";

export const runtime = "nodejs";

type RunResult = {
  jobId: string;
  ok: boolean;
  post_id?: string;
  error?: string;
  skipped?: string;
};

function guessImageMime(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".gif") return "image/gif";
  if (e === ".webp") return "image/webp";
  return "image/jpeg";
}

async function postJobToFacebook(
  accessToken: string,
  cookie: string | undefined,
  job: ScheduledGroupPostJob,
): Promise<{ ok: true; post_id: string } | { ok: false; error: string }> {
  let image: File | null = null;
  const imgPath = jobImageAbsolutePath(job.userId, job);
  if (imgPath && job.imageStoredName) {
    try {
      const buf = await fs.readFile(imgPath);
      const ext = path.extname(job.imageStoredName) || ".jpg";
      const mime = guessImageMime(ext);
      const name = `scheduled${ext}`;
      image = new File([new Uint8Array(buf)], name, { type: mime });
    } catch {
      return { ok: false, error: "อ่านไฟล์รูปในคิวไม่ได้" };
    }
  }

  const exec = await executeFacebookGroupPost({
    groupId: job.groupId,
    access_token: accessToken,
    cookie,
    message: job.message,
    image,
  });

  if (!exec.ok) {
    const fb = exec.data.error;
    const msg =
      typeof fb?.message === "string" && fb.message.trim()
        ? fb.message.trim()
        : "โพสต์ล้มเหลว";
    return { ok: false, error: msg };
  }

  return { ok: true, post_id: exec.post_id };
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { account } = await resolveActiveFacebookAccount(userId);

  const accessToken = normalizeAccessToken(
    account?.facebookAccessToken ?? "",
  );
  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "ยังไม่มี Facebook access token ในบัญชีที่เลือก — บันทึกที่หน้าเชื่อมต่อก่อน",
        results: [] as RunResult[],
      },
      { status: 400 },
    );
  }

  const cookie =
    typeof account?.facebookCookie === "string" &&
    account.facebookCookie.length > 0
      ? account.facebookCookie
      : undefined;

  const now = Date.now();
  const jobs = await listScheduledJobs(userId);
  const due = jobs
    .filter((j) => j.enabled && new Date(j.scheduledAt).getTime() <= now)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

  const results: RunResult[] = [];

  for (const job of due) {
    if (!job.message.trim() && !job.imageStoredName) {
      results.push({
        jobId: job.id,
        ok: false,
        skipped: "ไม่มีข้อความหรือรูป",
      });
      continue;
    }

    try {
      await assertCanPost(userId);
    } catch (e) {
      const msg =
        e instanceof QuotaExceededError
          ? e.message
          : "ตรวจโควต้าไม่สำเร็จ";
      const next: ScheduledGroupPostJob = {
        ...job,
        lastRunAt: new Date().toISOString(),
        lastError: msg,
        updatedAt: new Date().toISOString(),
      };
      await replaceJobAfterRun(userId, next);
      results.push({ jobId: job.id, ok: false, error: msg });
      continue;
    }

    const posted = await postJobToFacebook(accessToken, cookie, job);

    if (!posted.ok) {
      const next: ScheduledGroupPostJob = {
        ...job,
        lastRunAt: new Date().toISOString(),
        lastError: posted.error,
        updatedAt: new Date().toISOString(),
      };
      await replaceJobAfterRun(userId, next);
      results.push({ jobId: job.id, ok: false, error: posted.error });
      continue;
    }

    await recordSuccessfulGroupPost(userId);

    if (job.repeat === "none") {
      await deleteScheduledJob(userId, job.id);
      results.push({
        jobId: job.id,
        ok: true,
        post_id: posted.post_id,
      });
      continue;
    }

    const nextScheduled = addRepeatInterval(job.scheduledAt, job.repeat);
    const next: ScheduledGroupPostJob = {
      ...job,
      scheduledAt: nextScheduled,
      lastRunAt: new Date().toISOString(),
      lastError: null,
      lastPostId: posted.post_id,
      updatedAt: new Date().toISOString(),
    };
    await replaceJobAfterRun(userId, next);
    results.push({
      jobId: job.id,
      ok: true,
      post_id: posted.post_id,
    });
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}
