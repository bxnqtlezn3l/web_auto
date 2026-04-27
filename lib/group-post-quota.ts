/**
 * จำกัดจำนวนโพสต์ลงกลุ่มต่อวัน (ต่อบัญชีแอป) — นับตาม UTC
 */
import fs from "fs/promises";
import path from "path";

const SETTINGS_DIR = path.join(process.cwd(), "data", "group-post-settings");
const COUNT_DIR = path.join(process.cwd(), "data", "group-post-daily");

export class QuotaExceededError extends Error {
  readonly limit: number;
  readonly used: number;

  constructor(limit: number, used: number) {
    super(
      `ครบโควต้าโพสต์ต่อวันแล้ว (${used}/${limit} ครั้ง) — ปรับที่การตั้งค่าหรือรอวันถัดไป`,
    );
    this.name = "QuotaExceededError";
    this.limit = limit;
    this.used = used;
  }
}

function utcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

type SettingsFile = { maxPostsPerDay: number | null };
type CountFile = { date: string; count: number };

async function readSettingsFile(userId: string): Promise<SettingsFile> {
  try {
    const p = path.join(SETTINGS_DIR, `${userId}.json`);
    const raw = await fs.readFile(p, "utf8");
    const j = JSON.parse(raw) as SettingsFile;
    const n = j.maxPostsPerDay;
    if (n == null || !Number.isFinite(n) || n <= 0) {
      return { maxPostsPerDay: null };
    }
    return { maxPostsPerDay: Math.min(Math.floor(n), 100_000) };
  } catch {
    return { maxPostsPerDay: null };
  }
}

async function readCountFile(userId: string): Promise<CountFile> {
  try {
    const p = path.join(COUNT_DIR, `${userId}.json`);
    const raw = await fs.readFile(p, "utf8");
    const j = JSON.parse(raw) as CountFile;
    const today = utcDateKey();
    if (j.date !== today) {
      return { date: today, count: 0 };
    }
    return { date: j.date, count: Math.max(0, Math.floor(j.count)) };
  } catch {
    return { date: utcDateKey(), count: 0 };
  }
}

async function writeCountFile(userId: string, c: CountFile): Promise<void> {
  await fs.mkdir(COUNT_DIR, { recursive: true });
  const p = path.join(COUNT_DIR, `${userId}.json`);
  await fs.writeFile(p, JSON.stringify(c, null, 2), "utf8");
}

export async function getMaxPostsPerDay(
  userId: string,
): Promise<number | null> {
  const s = await readSettingsFile(userId);
  return s.maxPostsPerDay;
}

export async function setMaxPostsPerDay(
  userId: string,
  max: number | null,
): Promise<void> {
  await fs.mkdir(SETTINGS_DIR, { recursive: true });
  const p = path.join(SETTINGS_DIR, `${userId}.json`);
  if (max == null || !Number.isFinite(max) || max <= 0) {
    await fs.writeFile(
      p,
      JSON.stringify({ maxPostsPerDay: null } satisfies SettingsFile, null, 2),
      "utf8",
    );
    return;
  }
  const v = Math.min(Math.floor(max), 100_000);
  await fs.writeFile(
    p,
    JSON.stringify({ maxPostsPerDay: v } satisfies SettingsFile, null, 2),
    "utf8",
  );
}

export async function getQuotaStatus(userId: string): Promise<{
  maxPostsPerDay: number | null;
  usedToday: number;
  remaining: number | null;
}> {
  const { maxPostsPerDay } = await readSettingsFile(userId);
  const st = await readCountFile(userId);
  const usedToday = st.date === utcDateKey() ? st.count : 0;
  if (maxPostsPerDay == null) {
    return { maxPostsPerDay: null, usedToday, remaining: null };
  }
  return {
    maxPostsPerDay,
    usedToday,
    remaining: Math.max(0, maxPostsPerDay - usedToday),
  };
}

/** เรียกก่อนโพสต์แต่ละครั้ง — โยน QuotaExceededError ถ้าเต็มโควต้า */
export async function assertCanPost(userId: string): Promise<void> {
  const limit = await getMaxPostsPerDay(userId);
  if (limit == null) {
    return;
  }
  const st = await readCountFile(userId);
  const used = st.date === utcDateKey() ? st.count : 0;
  if (used >= limit) {
    throw new QuotaExceededError(limit, used);
  }
}

/** หลังโพสต์สำเร็จ — นับเฉพาะเมื่อตั้งค่าจำกัดต่อวันไว้ */
export async function recordSuccessfulGroupPost(
  userId: string,
): Promise<void> {
  const limit = await getMaxPostsPerDay(userId);
  if (limit == null) {
    return;
  }
  let st = await readCountFile(userId);
  const today = utcDateKey();
  if (st.date !== today) {
    st = { date: today, count: 0 };
  }
  st.count += 1;
  await writeCountFile(userId, st);
}
