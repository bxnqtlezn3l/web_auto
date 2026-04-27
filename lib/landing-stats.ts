import { revalidateTag, unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

/** ใช้กับ unstable_cache / revalidateTag สำหรับสถิติหน้าแรก */
export const LANDING_STATS_TAG = "landing-stats";

/** ฟีเจอร์หลักในแอป — ใช้ความยาวเป็นเลขจริงบนหน้าแรก */
export const LANDING_CORE_FEATURES = [
  "ตรวจโปรไฟล์ Facebook",
  "ดึงรายการกลุ่ม",
  "โพสต์ข้อความ/รูปลงกลุ่ม",
] as const;

export async function recordFacebookMeSuccess() {
  try {
    await prisma.appStat.upsert({
      where: { id: 1 },
      create: { id: 1, facebookMeSuccess: 1 },
      update: { facebookMeSuccess: { increment: 1 } },
    });
    revalidateTag(LANDING_STATS_TAG);
  } catch {
    /* ตารางยังไม่ migrate / DB ไม่พร้อม — ไม่ทำให้ API ล้ม */
  }
}

export type LandingStats = {
  users: number;
  graphConnections: number;
  features: number;
};

const fetchLandingStats = async (): Promise<LandingStats> => {
  try {
    const [users, row] = await Promise.all([
      prisma.user.count(),
      prisma.appStat.findUnique({ where: { id: 1 } }),
    ]);
    return {
      users,
      graphConnections: row?.facebookMeSuccess ?? 0,
      features: LANDING_CORE_FEATURES.length,
    };
  } catch {
    return {
      users: 0,
      graphConnections: 0,
      features: LANDING_CORE_FEATURES.length,
    };
  }
};

/** แคชสั้น ๆ — ลด query ซ้ำเมื่อมีผู้เข้าหน้าแรกจำนวนมาก; อัปเดตเมื่อมีการเชื่อมต่อ Graph สำเร็จ */
export const getLandingStats = unstable_cache(
  fetchLandingStats,
  ["landing-stats-v1"],
  { revalidate: 120, tags: [LANDING_STATS_TAG] },
);

export function formatStatNumber(n: number) {
  return new Intl.NumberFormat("th-TH").format(n);
}
