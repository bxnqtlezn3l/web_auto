import { headers } from "next/headers";

/** ใช้เรียก API ภายในเซิร์ฟเวอร์เดียวกัน (เช่น รันคิวโพสต์) */
export async function resolveAppBaseUrl(): Promise<string> {
  const h = await headers();
  const hostRaw = h.get("x-forwarded-host") ?? h.get("host");
  const protoRaw = h.get("x-forwarded-proto") ?? "http";
  if (hostRaw) {
    const host = hostRaw.split(",")[0]!.trim();
    const proto = protoRaw.split(",")[0]!.trim() || "http";
    return `${proto}://${host}`;
  }
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (env) {
    return env;
  }
  return "http://127.0.0.1:3000";
}
