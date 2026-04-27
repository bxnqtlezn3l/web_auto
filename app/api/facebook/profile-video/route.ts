import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { FacebookGraphActionError } from "@/lib/facebook-graph-action-error";
import { normalizeAccessToken } from "@/lib/facebook-graph";
import { postProfileTimelineVideo } from "@/lib/facebook-profile-video";

export const runtime = "nodejs";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "ใช้ multipart/form-data เท่านั้น" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "อ่านฟอร์มไม่ได้" }, { status: 400 });
  }

  const access_token = normalizeAccessToken(
    String(form.get("access_token") ?? ""),
  );
  const cookieRaw = form.get("cookie");
  const cookie =
    typeof cookieRaw === "string" && cookieRaw.length > 0
      ? cookieRaw
      : undefined;
  const description = String(form.get("description") ?? "").trim();

  if (!access_token) {
    return NextResponse.json(
      { error: "กรุณาระบุ User access token" },
      { status: 400 },
    );
  }

  const file = form.get("video");
  if (!(file instanceof File) || file.size < 1) {
    return NextResponse.json(
      { error: "แนบไฟล์วิดีโอ (ฟิลด์ video)" },
      { status: 400 },
    );
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "วิดีโอใหญ่เกิน 100 MB" },
      { status: 400 },
    );
  }
  const name = file.name?.toLowerCase() ?? "";
  const mime = file.type?.toLowerCase() ?? "";
  if (!name.endsWith(".mp4") && mime !== "video/mp4") {
    return NextResponse.json(
      { error: "ใช้วิดีโอ .mp4" },
      { status: 400 },
    );
  }

  try {
    const buf = await file.arrayBuffer();
    const { id } = await postProfileTimelineVideo(
      access_token,
      buf,
      file.name || "video.mp4",
      {
        description: description || undefined,
        cookie,
      },
    );
    return NextResponse.json({
      ok: true,
      video_id: id,
      note: "โพสต์เป็นโพสต์วิดีโอบนโปรไฟล์ (Timeline) ไม่ใช่สตอรี่วง 24 ชม.",
    });
  } catch (e) {
    if (e instanceof FacebookGraphActionError) {
      return NextResponse.json(
        {
          error: e.message,
          ...(e.hint ? { hint: e.hint } : {}),
          ...(e.fbCode != null ? { fb_code: e.fbCode } : {}),
          ...(e.fbtraceId ? { fbtrace_id: e.fbtraceId } : {}),
        },
        { status: e.httpStatus },
      );
    }
    const msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
