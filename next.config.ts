import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** โฟลเดอร์ `web` — ลด warning lockfile ซ้ำรากข้างบน (EEEE vs web) และให้ Vercel trace ไฟล์ตรงโปรเจกต์ */
const appDir = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: appDir,
  /** โหลดแบบ Node runtime ไม่ให้ Webpack บันเดิลไบนารี / native (build + Vercel) */
  serverExternalPackages: ["@prisma/client", "@resvg/resvg-js"],
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
