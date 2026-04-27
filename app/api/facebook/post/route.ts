import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { resolveActiveFacebookAccount } from "@/lib/facebook-account-server";
import {
  executeFacebookGroupPost,
  MAX_GROUP_POST_IMAGE_BYTES,
  type FacebookError,
  type GraphPayload,
} from "@/lib/facebook-group-post-internal";
import {
  assertCanPost,
  QuotaExceededError,
  recordSuccessfulGroupPost,
} from "@/lib/group-post-quota";
import { normalizeAccessToken } from "@/lib/facebook-graph";
import { userFacingFacebookGraphError } from "@/lib/facebook-graph-user-message";

export const runtime = "nodejs";

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function formatFacebookError(err: FacebookError | undefined): string {
  if (!err) {
    return "โพสต์ไม่สำเร็จ (ไม่มีรายละเอียดจาก Facebook)";
  }

  const userMsg =
    typeof err.error_user_msg === "string" ? err.error_user_msg.trim() : "";
  if (userMsg) {
    return userFacingFacebookGraphError(userMsg);
  }

  const title =
    typeof err.error_user_title === "string" ? err.error_user_title.trim() : "";
  const baseMsg =
    typeof err.message === "string" ? err.message.trim() : "ข้อผิดพลาดจาก Graph API";

  const hints: string[] = [];
  if (title) {
    hints.push(title);
  }
  if (err.code != null) {
    hints.push(`code: ${err.code}`);
  }
  if (err.error_subcode != null) {
    hints.push(`subcode: ${err.error_subcode}`);
  }
  if (err.type) {
    hints.push(`type: ${err.type}`);
  }
  if (err.fbtrace_id) {
    hints.push(`trace: ${err.fbtrace_id}`);
  }

  const suffix = hints.length > 0 ? ` (${hints.join(", ")})` : "";
  return userFacingFacebookGraphError(`${baseMsg}${suffix}`);
}

function facebookPostErrorHint(err: FacebookError | undefined): string | undefined {
  if (!err || err.type !== "OAuthException") {
    return undefined;
  }

  if (err.code === 1) {
    return [
      "สิ่งที่ควรตรวจ (ฝั่ง Meta / โทเคน — ไม่ใช่บั๊กของเว็บนี้):",
      "• ใช้ User access token จากแอปของคุณที่ developers.facebook.com เปิด permissions ที่เกี่ยวกับกลุ่ม/การโพสต์ตามที่ Meta ให้ใช้กับแอปนั้น และผ่านขั้นตอนอนุมัติ/โหมด Live ถ้าจำเป็น",
      "• โทเคนจาก Graph API Explorer มักดึงโปรไฟล์กับรายการกลุ่มได้ แต่โพสต์ลงกลุ่มผ่าน API ถูกปฏิเสธได้บ่อย",
      "• บัญชีต้องเป็นสมาชิกและมีสิทธิ์โพสต์ในกลุ่มนั้น — กลุ่มบางแบบไม่อนุญาตแอปภายนอก",
      "• หลังแก้ permissions ในแอป ให้สร้าง token ใหม่แล้ววางใน Cookie / Access token อีกครั้ง",
    ].join("\n");
  }

  if (err.code === 190) {
    return "โทเคนหมดอายุหรือไม่ถูกต้อง — สร้าง User access token ใหม่แล้ววางในแบบฟอร์ม";
  }

  if (err.code === 10 || err.code === 200) {
    return "แอปหรือโทเคนไม่มีสิทธิ์กับทรัพยากรนี้ — ตรวจสอบ permissions ใน Meta for Developers และสถานะแอป (Development / Live)";
  }

  return undefined;
}

function normalizeUploadedImage(raw: FormDataEntryValue | null): File | null {
  if (raw == null) {
    return null;
  }
  if (raw instanceof File && raw.size > 0) {
    return raw;
  }
  if (raw instanceof Blob && raw.size > 0) {
    const name = raw instanceof File ? raw.name : "upload.jpg";
    const type = raw.type || "image/jpeg";
    return new File([raw], name, { type });
  }
  return null;
}

function mapExecuteFailure(
  exec: { ok: false; res: Response; data: GraphPayload },
): NextResponse {
  const fbErr = exec.data.error;
  const isOAuth1 = fbErr?.type === "OAuthException" && fbErr?.code === 1;

  const msg = isOAuth1
    ? fbErr?.fbtrace_id
      ? `Facebook ปฏิเสธการโพสต์ลงกลุ่ม (code 1) — อ้างอิง: ${fbErr.fbtrace_id}`
      : "Facebook ปฏิเสธการโพสต์ลงกลุ่ม (code 1)"
    : formatFacebookError(fbErr);

  const hint = facebookPostErrorHint(fbErr);
  const status =
    exec.res.status === 401 || exec.res.status === 403
      ? exec.res.status
      : exec.res.status >= 400 && exec.res.status < 500
        ? exec.res.status
        : 400;
  return NextResponse.json(
    {
      error: msg,
      ...(hint ? { hint } : {}),
      fb: fbErr ?? null,
    },
    { status },
  );
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonError("ต้องเข้าสู่ระบบ", 401);
  }

  const { account } = await resolveActiveFacebookAccount(userId);
  const access_token = normalizeAccessToken(
    account?.facebookAccessToken ?? "",
  );
  const cookie =
    typeof account?.facebookCookie === "string" &&
    account.facebookCookie.length > 0
      ? account.facebookCookie
      : undefined;

  if (!access_token) {
    return jsonError(
      "ยังไม่มี access token ในบัญชีที่เลือก — บันทึกที่หน้าเชื่อมต่อก่อน",
      400,
    );
  }

  let group_id = "";
  let message = "";
  let image: File | null = null;

  const ct = req.headers.get("content-type") || "";

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      group_id = String(form.get("group_id") ?? "").trim();
      message = String(form.get("message") ?? "").trim();
      image = normalizeUploadedImage(form.get("image"));
    } else {
      const body = (await req.json()) as {
        group_id?: unknown;
        message?: unknown;
      };
      group_id =
        typeof body.group_id === "string" ? body.group_id.trim() : "";
      message = typeof body.message === "string" ? body.message.trim() : "";
    }
  } catch {
    return jsonError("รูปแบบคำขอไม่ถูกต้อง", 400);
  }

  if (!group_id) {
    return jsonError("กรุณาเลือกกลุ่ม", 400);
  }

  const hasImage = image !== null;

  if (!hasImage && !message) {
    return jsonError("กรุณากรอกข้อความหรือแนบรูป", 400);
  }
  if (hasImage && image!.size > MAX_GROUP_POST_IMAGE_BYTES) {
    return jsonError("ไฟล์รูปใหญ่เกิน 12 MB", 400);
  }

  try {
    await assertCanPost(userId);
  } catch (e) {
    if (e instanceof QuotaExceededError) {
      return jsonError(e.message, 429, {
        quota: { limit: e.limit, used: e.used },
      });
    }
    throw e;
  }

  try {
    const exec = await executeFacebookGroupPost({
      groupId: group_id,
      access_token,
      cookie,
      message,
      image,
    });

    if (!exec.ok) {
      return mapExecuteFailure(exec);
    }

    await recordSuccessfulGroupPost(userId);

    return NextResponse.json({
      ok: true,
      id: exec.id,
      post_id: exec.post_id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "เครือข่ายล้มเหลว";
    return jsonError(msg, 502);
  }
}
