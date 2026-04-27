/**
 * Facebook **Page** Stories (Graph API) — วิดีโอและรูป (รูปข้อความ)
 * ต้องใช้ **Page access token** + สิทธิ์ pages_manage_posts ฯลฯ
 * @see https://developers.facebook.com/docs/page-stories-api/
 */

import { GRAPH_BASE } from "@/lib/facebook-graph";

type GraphJson = Record<string, unknown> & {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_user_msg?: string;
  };
};

async function readGraphJson(res: Response): Promise<GraphJson> {
  const text = await res.text();
  try {
    return JSON.parse(text) as GraphJson;
  } catch {
    return {
      error: {
        message:
          text.length > 0
            ? `คำตอบไม่ใช่ JSON: ${text.slice(0, 240)}`
            : "คำตอบว่างจาก Facebook",
      },
    };
  }
}

function formatErr(data: GraphJson, fallback: string): string {
  const e = data.error;
  if (!e) {
    return fallback;
  }
  const u =
    typeof e.error_user_msg === "string" ? e.error_user_msg.trim() : "";
  if (u) {
    return u;
  }
  const m = typeof e.message === "string" ? e.message.trim() : "";
  if (m) {
    return e.code != null ? `${m} (code ${e.code})` : m;
  }
  return fallback;
}

/** เริ่มอัปโหลดวิดีโอสตอรี่ — ได้ video_id + upload_url */
export async function pageVideoStoryStart(
  pageId: string,
  pageAccessToken: string,
): Promise<{ video_id: string; upload_url: string }> {
  const url = new URL(
    `${GRAPH_BASE}/${encodeURIComponent(pageId)}/video_stories`,
  );
  url.searchParams.set("access_token", pageAccessToken);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_phase: "start" }),
    cache: "no-store",
  });
  const data = await readGraphJson(res);
  if (!res.ok || data.error) {
    throw new Error(
      formatErr(data, "เริ่มอัปโหลดวิดีโอสตอรี่ไม่สำเร็จ"),
    );
  }
  const video_id = data.video_id;
  const upload_url = data.upload_url;
  if (typeof video_id !== "string" || typeof upload_url !== "string") {
    throw new Error("Facebook ไม่คืน video_id หรือ upload_url");
  }
  return { video_id, upload_url };
}

/** อัปโหลดไบนารีวิดีโอไป rupload.facebook.com */
export async function pageVideoRupload(
  uploadUrl: string,
  pageAccessToken: string,
  bytes: ArrayBuffer,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${pageAccessToken}`,
      offset: "0",
      file_size: String(bytes.byteLength),
    },
    body: bytes,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = `อัปโหลดไฟล์วิดีโอไม่สำเร็จ (HTTP ${res.status})`;
    if (text) {
      try {
        const data = JSON.parse(text) as GraphJson;
        msg = formatErr(data, msg);
      } catch {
        msg = `${msg}: ${text.slice(0, 200)}`;
      }
    }
    throw new Error(msg);
  }
  if (!text.trim()) {
    return;
  }
  let data: GraphJson;
  try {
    data = JSON.parse(text) as GraphJson;
  } catch {
    return;
  }
  if (data.error) {
    throw new Error(formatErr(data, "อัปโหลดไฟล์วิดีโอไม่สำเร็จ"));
  }
  if (data.success === false) {
    throw new Error("Facebook ปฏิเสธการอัปโหลดวิดีโอ");
  }
}

/** จบเซสชันและเผยแพร่สตอรี่วิดีโอ */
export async function pageVideoStoryFinish(
  pageId: string,
  pageAccessToken: string,
  videoId: string,
): Promise<{ post_id: string }> {
  const url = new URL(
    `${GRAPH_BASE}/${encodeURIComponent(pageId)}/video_stories`,
  );
  url.searchParams.set("access_token", pageAccessToken);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_phase: "finish",
      video_id: videoId,
    }),
    cache: "no-store",
  });
  const data = await readGraphJson(res);
  if (!res.ok || data.error) {
    throw new Error(
      formatErr(data, "เผยแพร่วิดีโอสตอรี่ไม่สำเร็จ"),
    );
  }
  if (data.success !== true) {
    throw new Error("เผยแพร่สตอรี่ไม่สมบูรณ์");
  }
  const post_id = data.post_id;
  if (post_id === undefined || post_id === null) {
    throw new Error("Facebook ไม่คืน post_id หลังเผยแพร่สตอรี่");
  }
  return { post_id: String(post_id) };
}

/** อัปโหลดรูปแบบยังไม่เผยแพร่ (เตรียม photo story) */
export async function pageUploadPhotoUnpublished(
  pageId: string,
  pageAccessToken: string,
  imageBytes: Uint8Array,
  filename: string,
): Promise<string> {
  const form = new FormData();
  form.set("access_token", pageAccessToken);
  form.set("published", "false");
  form.set(
    "source",
    new Blob([Buffer.from(imageBytes)], { type: "image/png" }),
    filename || "story.png",
  );

  const res = await fetch(
    `${GRAPH_BASE}/${encodeURIComponent(pageId)}/photos`,
    {
      method: "POST",
      body: form,
      cache: "no-store",
    },
  );
  const data = await readGraphJson(res);
  if (!res.ok || data.error) {
    throw new Error(formatErr(data, "อัปโหลดรูปไม่สำเร็จ"));
  }
  const id = data.id;
  if (typeof id !== "string" || !id) {
    throw new Error("Facebook ไม่คืนรหัสรูปหลังอัปโหลด");
  }
  return id;
}

/** เผยแพร่ photo story */
export async function pagePublishPhotoStory(
  pageId: string,
  pageAccessToken: string,
  photoId: string,
): Promise<{ post_id: string }> {
  const url = new URL(
    `${GRAPH_BASE}/${encodeURIComponent(pageId)}/photo_stories`,
  );
  url.searchParams.set("access_token", pageAccessToken);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo_id: photoId }),
    cache: "no-store",
  });
  const data = await readGraphJson(res);
  if (!res.ok || data.error) {
    throw new Error(formatErr(data, "เผยแพร่รูปสตอรี่ไม่สำเร็จ"));
  }
  if (data.success !== true) {
    throw new Error("เผยแพร่สตอรี่รูปไม่สมบูรณ์");
  }
  const post_id = data.post_id;
  if (post_id === undefined || post_id === null) {
    throw new Error("Facebook ไม่คืน post_id หลังเผยแพร่สตอรี่รูป");
  }
  return { post_id: String(post_id) };
}

/** โฟลว์เต็ม: อัปโหลดวิดีโอจาก ArrayBuffer แล้วโพสต์สตอรี่ */
export async function publishPageVideoStory(
  pageId: string,
  pageAccessToken: string,
  videoBytes: ArrayBuffer,
): Promise<{ post_id: string; video_id: string }> {
  const { video_id, upload_url } = await pageVideoStoryStart(
    pageId,
    pageAccessToken,
  );
  await pageVideoRupload(upload_url, pageAccessToken, videoBytes);
  const { post_id } = await pageVideoStoryFinish(
    pageId,
    pageAccessToken,
    video_id,
  );
  return { post_id, video_id };
}
