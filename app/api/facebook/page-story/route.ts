import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  pagePublishPhotoStory,
  pageUploadPhotoUnpublished,
  publishPageVideoStory,
} from "@/lib/facebook-page-stories";
import { normalizeAccessToken } from "@/lib/facebook-graph";
import { renderStoryTextToPng } from "@/lib/story-text-to-png";

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

  const pageId = String(form.get("page_id") ?? "").trim();
  const pageToken = normalizeAccessToken(
    String(form.get("page_access_token") ?? ""),
  );
  const mode = String(form.get("story_mode") ?? "").trim();

  if (!pageId) {
    return NextResponse.json({ error: "กรุณาระบุ Page ID" }, { status: 400 });
  }
  if (!pageToken) {
    return NextResponse.json(
      { error: "กรุณาระบุ Page access token" },
      { status: 400 },
    );
  }

  try {
    if (mode === "video") {
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
          { error: "ใช้วิดีโอ .mp4 ตามที่ Facebook แนะนำ (สัดส่วน 9:16)" },
          { status: 400 },
        );
      }
      const buf = await file.arrayBuffer();
      const { post_id, video_id } = await publishPageVideoStory(
        pageId,
        pageToken,
        buf,
      );
      return NextResponse.json({ ok: true, post_id, video_id });
    }

    if (mode === "text") {
      const storyText = String(form.get("story_text") ?? "").trim();
      if (!storyText) {
        return NextResponse.json(
          { error: "กรุณากรอกข้อความ (story_text)" },
          { status: 400 },
        );
      }
      const png = await renderStoryTextToPng(storyText);
      const photoId = await pageUploadPhotoUnpublished(
        pageId,
        pageToken,
        new Uint8Array(png),
        "story-text.png",
      );
      const { post_id } = await pagePublishPhotoStory(
        pageId,
        pageToken,
        photoId,
      );
      return NextResponse.json({ ok: true, post_id, photo_id: photoId });
    }

    return NextResponse.json(
      {
        error: 'story_mode ไม่ถูกต้อง — ใช้ "video" หรือ "text"',
      },
      { status: 400 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
