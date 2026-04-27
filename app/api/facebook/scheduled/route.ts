import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  createScheduledJob,
  deleteScheduledJob,
  getJob,
  listScheduledJobs,
  type RepeatKind,
  updateScheduledJob,
} from "@/lib/scheduled-group-post-store";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseRepeat(raw: string): RepeatKind | null {
  const t = raw.trim().toLowerCase();
  if (t === "none" || t === "daily" || t === "weekly") return t;
  return null;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonError("Unauthorized", 401);
  }
  const jobs = await listScheduledJobs(userId);
  const sorted = [...jobs].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  return NextResponse.json({ jobs: sorted });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  const ct = req.headers.get("content-type") || "";
  let group_id = "";
  let group_name: string | null = null;
  let message = "";
  let scheduled_at = "";
  let repeat: RepeatKind = "none";
  let image: File | null = null;

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      group_id = String(form.get("group_id") ?? "").trim();
      const gn = String(form.get("group_name") ?? "").trim();
      group_name = gn.length ? gn : null;
      message = String(form.get("message") ?? "");
      scheduled_at = String(form.get("scheduled_at") ?? "").trim();
      const r = parseRepeat(String(form.get("repeat") ?? "none"));
      if (r) repeat = r;
      const f = form.get("image");
      if (f instanceof File && f.size > 0) {
        image = f;
      }
    } else {
      const body = (await req.json()) as {
        group_id?: unknown;
        group_name?: unknown;
        message?: unknown;
        scheduled_at?: unknown;
        repeat?: unknown;
      };
      group_id =
        typeof body.group_id === "string" ? body.group_id.trim() : "";
      group_name =
        typeof body.group_name === "string" && body.group_name.trim()
          ? body.group_name.trim()
          : null;
      message = typeof body.message === "string" ? body.message : "";
      scheduled_at =
        typeof body.scheduled_at === "string" ? body.scheduled_at.trim() : "";
      const r = parseRepeat(
        typeof body.repeat === "string" ? body.repeat : "none",
      );
      if (r) repeat = r;
    }
  } catch {
    return jsonError("รูปแบบคำขอไม่ถูกต้อง", 400);
  }

  if (!group_id) {
    return jsonError("กรุณาระบุกลุ่ม (group_id)", 400);
  }
  if (!message.trim() && !image) {
    return jsonError("กรุณากรอกข้อความหรือแนบรูป", 400);
  }
  if (!scheduled_at) {
    return jsonError("กรุณาระบุเวลาโพสต์ (scheduled_at แบบ ISO)", 400);
  }
  const when = new Date(scheduled_at);
  if (Number.isNaN(when.getTime())) {
    return jsonError("เวลาไม่ถูกต้อง", 400);
  }
  if (image && image.size > MAX_IMAGE_BYTES) {
    return jsonError("รูปใหญ่เกิน 12 MB", 400);
  }

  let imageBytes: Buffer | undefined;
  if (image) {
    const ab = await image.arrayBuffer();
    imageBytes = Buffer.from(ab);
  }

  const job = await createScheduledJob({
    userId,
    groupId: group_id,
    groupName: group_name,
    message: message.trim(),
    scheduledAtIso: when.toISOString(),
    repeat,
    imageBytes,
    imageOriginalName: image?.name,
  });

  return NextResponse.json({ ok: true, job });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  let body: {
    id?: unknown;
    enabled?: unknown;
    scheduled_at?: unknown;
    repeat?: unknown;
    message?: unknown;
    group_id?: unknown;
    group_name?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("JSON ไม่ถูกต้อง", 400);
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return jsonError("ต้องมี id", 400);
  }

  const existing = await getJob(userId, id);
  if (!existing) {
    return jsonError("ไม่พบรายการ", 404);
  }

  const patch: Parameters<typeof updateScheduledJob>[2] = {};
  if (typeof body.enabled === "boolean") {
    patch.enabled = body.enabled;
  }
  if (typeof body.scheduled_at === "string" && body.scheduled_at.trim()) {
    const d = new Date(body.scheduled_at.trim());
    if (Number.isNaN(d.getTime())) {
      return jsonError("scheduled_at ไม่ถูกต้อง", 400);
    }
    patch.scheduledAt = d.toISOString();
  }
  if (typeof body.repeat === "string") {
    const r = parseRepeat(body.repeat);
    if (!r) {
      return jsonError("repeat ต้องเป็น none | daily | weekly", 400);
    }
    patch.repeat = r;
  }
  if (typeof body.message === "string") {
    const trimmed = body.message.trim();
    if (!trimmed && !existing.imageStoredName) {
      return jsonError("ข้อความว่างได้เฉพาะคิวที่แนบรูปไว้", 400);
    }
    patch.message = trimmed;
  }
  if (typeof body.group_id === "string" && body.group_id.trim()) {
    patch.groupId = body.group_id.trim();
  }
  if (typeof body.group_name === "string") {
    patch.groupName = body.group_name.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return jsonError("ไม่มีฟิลด์ที่อัปเดต", 400);
  }

  const updated = await updateScheduledJob(userId, id, patch);
  if (!updated) {
    return jsonError("อัปเดตไม่สำเร็จ", 500);
  }
  return NextResponse.json({ ok: true, job: updated });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (!id) {
    return jsonError("ต้องมี id", 400);
  }
  const ok = await deleteScheduledJob(userId, id);
  if (!ok) {
    return jsonError("ไม่พบรายการ", 404);
  }
  return NextResponse.json({ ok: true });
}
