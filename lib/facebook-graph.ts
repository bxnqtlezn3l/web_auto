/** ตรงกับ index.js (FacebookGroupBot) */
export const GRAPH_VERSION = "v19.0";
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
/** UA เก่ามากบางครั้งถูกจัดกลุ่มความเสี่ยง — ใช้โครงสร้าง Chrome รุ่นปัจจุบัน */
export const GRAPH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function normalizeAccessToken(raw: string): string {
  let t = raw.trim();
  if (t.toLowerCase().startsWith("bearer ")) {
    t = t.slice(7).trim();
  }
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

export function graphHeaders(cookie: string | undefined): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent": GRAPH_USER_AGENT,
    "Content-Type": "application/json",
  };
  const c = cookie?.trim();
  if (c) {
    h.Cookie = c;
  }
  return h;
}

/** สำหรับ POST /feed แบบ form — Graph มักรับ application/x-www-form-urlencoded ได้ดีกว่า JSON จาก fetch */
export function graphHeadersFormUrlEncoded(
  cookie: string | undefined,
): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent": GRAPH_USER_AGENT,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const c = cookie?.trim();
  if (c) {
    h.Cookie = c;
  }
  return h;
}
