/**
 * โพสต์วิดีโอลงโปรไฟล์ส่วนตัว (Timeline) ผ่าน POST /me/videos
 * — ไม่ใช่ “สตอรี่วง” 24 ชม. (Meta ไม่เปิด API สตอรี่ส่วนตัวให้แอปภายนอก)
 * @see https://developers.facebook.com/docs/graph-api/reference/user/videos/
 */

import { FacebookGraphActionError } from "@/lib/facebook-graph-action-error";
import { GRAPH_BASE, GRAPH_USER_AGENT } from "@/lib/facebook-graph";

type GraphJson = Record<string, unknown> & {
  id?: string;
  video_id?: string;
  upload_session_id?: string | number;
  start_offset?: string | number;
  end_offset?: string | number;
  success?: boolean;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_msg?: string;
    fbtrace_id?: string;
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

const CHECKPOINT_HINT_LINES = [
  "บัญชีอยู่ในสถานะยืนยันความปลอดภัย (checkpoint) หรือเซสชันไม่ผ่าน — ไม่ใช่บั๊กของเว็บนี้",
  "ลอง: เปิด facebook.com ในเบราว์เซอร์ ล็อกอินด้วยบัญชีเดียวกับโทเคน แล้วทำตามขั้นตอนยืนยันจนใช้งานได้ปกติ จากนั้นสร้าง User access token ใหม่",
  "รอแล้วลองใหม่ ลดความถี่การเรียก API",
] as const;

function throwGraphError(data: GraphJson, fallback: string): never {
  const e = data.error;
  const code = e?.code;
  const trace =
    typeof e?.fbtrace_id === "string" ? e.fbtrace_id.trim() : undefined;
  const msg = formatErr(data, fallback);

  const traceLine = trace ? `fbtrace_id: ${trace}` : "";

  if (code === 368 || code === 459) {
    const hint = [
      code === 459
        ? "Facebook แจ้งว่าเซสชันไม่ถูกต้องเพราะบัญชีถูก checkpoint — ต้องแก้ในเบราว์เซอร์ก่อน"
        : "Facebook บล็อกการกระทำชั่วคราวหรือขอให้ยืนยันความปลอดภัยของบัญชี (checkpoint)",
      ...CHECKPOINT_HINT_LINES,
      traceLine,
    ]
      .filter(Boolean)
      .join("\n");
    throw new FacebookGraphActionError({
      message: msg,
      fbCode: code,
      fbtraceId: trace,
      hint,
      httpStatus: 403,
    });
  }

  if (code === 190) {
    throw new FacebookGraphActionError({
      message: msg,
      fbCode: 190,
      hint: "โทเคนหมดอายุหรือไม่ถูกต้อง — สร้าง User access token ใหม่แล้ววางในฟอร์ม / หน้าเชื่อมต่อ",
      fbtraceId: trace,
      httpStatus: 401,
    });
  }

  if (code === 10 || code === 200) {
    throw new FacebookGraphActionError({
      message: msg,
      fbCode: code,
      hint: "แอปหรือโทเคนไม่มีสิทธิ์โพสต์วิดีโอบนโปรไฟล์ — ตรวจ permissions และสถานะแอป (Development / Live) ใน Meta for Developers",
      fbtraceId: trace,
      httpStatus: 403,
    });
  }

  if (code === 352) {
    throw new FacebookGraphActionError({
      message: msg,
      fbCode: 352,
      hint: "รูปแบบไฟล์ไม่รองรับ — ใช้วิดีโอ H.264 ใน .mp4 (ลองแปลงด้วย FFmpeg)",
      fbtraceId: trace,
      httpStatus: 400,
    });
  }

  if (code === 6000 || code === 6001) {
    throw new FacebookGraphActionError({
      message: msg,
      fbCode: code,
      hint: [
        "อัปโหลดวิดีโอล้มเหลวชั่วคราว — ถ้าโพสต์แบบครั้งเดียวล้มเหลว แอปจะลองอัปโหลดแบบแบ่งชิ้นอัตโนมัติ",
        "ลองไฟล์เล็กลง แปลงโค้ดเอก H.264 + AAC ใน .mp4 หรือลองใหม่ภายหลัง",
        traceLine,
      ]
        .filter(Boolean)
        .join("\n"),
      fbtraceId: trace,
      httpStatus: 502,
    });
  }

  throw new FacebookGraphActionError({
    message: msg,
    fbCode: code,
    fbtraceId: trace,
    hint: traceLine || undefined,
    httpStatus: 502,
  });
}

export type PostProfileVideoOptions = {
  /** คำบรรยายใต้โพสต์วิดีโอ */
  description?: string;
  cookie?: string;
};

/** ไฟล์ใหญ่หรือ error อัปโหลด — ใช้ upload_phase start/transfer/finish ตามเอกสาร User Videos */
const USE_CHUNKED_FIRST_BYTES = 8 * 1024 * 1024;

function parseGraphNumeric(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string" && v.length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return undefined;
}

function graphHeadersForCookie(cookie?: string): Headers {
  const headers = new Headers();
  headers.set("User-Agent", GRAPH_USER_AGENT);
  const c = cookie?.trim();
  if (c) {
    headers.set("Cookie", c);
  }
  return headers;
}

function sessionIdFromStart(data: GraphJson): string {
  const raw = data.upload_session_id;
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  return "";
}

function videoIdFromPayload(data: GraphJson): string {
  return (
    (typeof data.id === "string" && data.id) ||
    (typeof data.video_id === "string" && data.video_id) ||
    ""
  );
}

async function postProfileTimelineVideoSimple(
  userAccessToken: string,
  videoBytes: ArrayBuffer,
  filename: string,
  options?: PostProfileVideoOptions,
): Promise<{ id: string }> {
  const form = new FormData();
  form.set("access_token", userAccessToken);
  form.set(
    "source",
    new Blob([videoBytes], { type: "video/mp4" }),
    filename || "video.mp4",
  );
  const desc = options?.description?.trim();
  if (desc) {
    form.set("description", desc);
  }

  const res = await fetch(`${GRAPH_BASE}/me/videos`, {
    method: "POST",
    headers: graphHeadersForCookie(options?.cookie),
    body: form,
    cache: "no-store",
  });
  const data = await readGraphJson(res);
  if (!res.ok || data.error) {
    throwGraphError(data, "โพสต์วิดีโอลงโปรไฟล์ไม่สำเร็จ");
  }
  const id = videoIdFromPayload(data);
  if (!id) {
    throw new Error("Facebook ไม่คืนรหัสวิดีโอหลังอัปโหลด");
  }
  return { id };
}

async function postProfileTimelineVideoChunked(
  userAccessToken: string,
  videoBytes: ArrayBuffer,
  filename: string,
  options?: PostProfileVideoOptions,
): Promise<{ id: string }> {
  const headers = graphHeadersForCookie(options?.cookie);
  const fileSize = videoBytes.byteLength;
  const bytes = new Uint8Array(videoBytes);

  const startParams = new URLSearchParams();
  startParams.set("access_token", userAccessToken);
  startParams.set("upload_phase", "start");
  startParams.set("file_size", String(fileSize));

  const startHeaders = new Headers(headers);
  startHeaders.set("Content-Type", "application/x-www-form-urlencoded");

  const startRes = await fetch(`${GRAPH_BASE}/me/videos`, {
    method: "POST",
    headers: startHeaders,
    body: startParams.toString(),
    cache: "no-store",
  });
  const startData = await readGraphJson(startRes);
  if (!startRes.ok || startData.error) {
    throwGraphError(startData, "เริ่มอัปโหลดแบบแบ่งชิ้นไม่สำเร็จ");
  }

  const uploadSessionId = sessionIdFromStart(startData);
  if (!uploadSessionId) {
    throw new Error("Facebook ไม่คืน upload_session_id");
  }

  let startOffset = parseGraphNumeric(startData.start_offset) ?? 0;
  let endOffset = parseGraphNumeric(startData.end_offset) ?? fileSize;

  let guard = 0;
  const maxChunks = Math.max(4096, Math.ceil(fileSize / (64 * 1024)) + 32);

  while (startOffset < fileSize) {
    if (guard++ > maxChunks) {
      throw new Error("อัปโหลดแบบแบ่งชิ้น: วนซ้ำเกินขีดจำกัด — ลองไฟล์เล็กลงหรือลองใหม่ภายหลัง");
    }
    const end = Math.min(endOffset, fileSize);
    const chunkLen = end - startOffset;
    if (chunkLen <= 0) {
      throw new Error("อัปโหลดแบบแบ่งชิ้น: ช่วงข้อมูลไม่ถูกต้องจาก Facebook");
    }
    const chunk = bytes.subarray(startOffset, end);

    const form = new FormData();
    form.set("access_token", userAccessToken);
    form.set("upload_phase", "transfer");
    form.set("upload_session_id", uploadSessionId);
    form.set("start_offset", String(startOffset));
    form.set(
      "video_file_chunk",
      new Blob([chunk], { type: "application/octet-stream" }),
      filename || "chunk.bin",
    );

    const transferRes = await fetch(`${GRAPH_BASE}/me/videos`, {
      method: "POST",
      headers,
      body: form,
      cache: "no-store",
    });
    const transferData = await readGraphJson(transferRes);
    if (!transferRes.ok || transferData.error) {
      throwGraphError(transferData, "ส่งชิ้นวิดีโอไม่สำเร็จ");
    }

    const nextStart = parseGraphNumeric(transferData.start_offset);
    const nextEnd = parseGraphNumeric(transferData.end_offset);
    if (nextStart != null && nextEnd != null) {
      if (nextStart === startOffset && nextEnd === endOffset) {
        throw new Error("อัปโหลดแบบแบ่งชิ้น: Facebook คืนตำแหน่งซ้ำ — ลองใหม่ภายหลัง");
      }
      startOffset = nextStart;
      endOffset = nextEnd;
      continue;
    }

    if (transferData.success === true || startOffset + chunkLen >= fileSize) {
      break;
    }
    throw new Error("Facebook ไม่คืนตำแหน่งชิ้นถัดไปหลังอัปโหลด");
  }

  const finishParams = new URLSearchParams();
  finishParams.set("access_token", userAccessToken);
  finishParams.set("upload_phase", "finish");
  finishParams.set("upload_session_id", uploadSessionId);
  const desc = options?.description?.trim();
  if (desc) {
    finishParams.set("description", desc);
  }

  const finishHeaders = new Headers(headers);
  finishHeaders.set("Content-Type", "application/x-www-form-urlencoded");

  const finishRes = await fetch(`${GRAPH_BASE}/me/videos`, {
    method: "POST",
    headers: finishHeaders,
    body: finishParams.toString(),
    cache: "no-store",
  });
  const finishData = await readGraphJson(finishRes);
  if (!finishRes.ok || finishData.error) {
    throwGraphError(finishData, "จบการอัปโหลดวิดีโอไม่สำเร็จ");
  }

  const id = videoIdFromPayload(finishData);
  if (!id) {
    throw new Error("Facebook ไม่คืนรหัสวิดีโอหลังอัปโหลดแบบแบ่งชิ้น");
  }
  return { id };
}

/**
 * อัปโหลดวิดีโอเป็นโพสต์บนโปรไฟล์ผู้ใช้ (ใช้ User access token)
 * — ไฟล์ใหญ่หรือ error อัปโหลดชั่วคราวจะลองแบบแบ่งชิ้นอัตโนมัติ (ไม่แก้กรณี 368/459 จาก Meta)
 */
export async function postProfileTimelineVideo(
  userAccessToken: string,
  videoBytes: ArrayBuffer,
  filename: string,
  options?: PostProfileVideoOptions,
): Promise<{ id: string }> {
  const size = videoBytes.byteLength;
  if (size >= USE_CHUNKED_FIRST_BYTES) {
    return postProfileTimelineVideoChunked(
      userAccessToken,
      videoBytes,
      filename,
      options,
    );
  }
  try {
    return await postProfileTimelineVideoSimple(
      userAccessToken,
      videoBytes,
      filename,
      options,
    );
  } catch (e) {
    if (
      e instanceof FacebookGraphActionError &&
      (e.fbCode === 6000 || e.fbCode === 6001)
    ) {
      return postProfileTimelineVideoChunked(
        userAccessToken,
        videoBytes,
        filename,
        options,
      );
    }
    throw e;
  }
}
