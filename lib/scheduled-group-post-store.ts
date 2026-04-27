/**
 * คิวโพสต์ลงกลุ่มตามเวลา — เก็บเป็น JSON ต่อ user ใต้ /data (ไม่ต้อง migrate DB)
 */
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export type RepeatKind = "none" | "daily" | "weekly";

export type ScheduledGroupPostJob = {
  id: string;
  userId: string;
  groupId: string;
  /** สำหรับแสดงใน UI เท่านั้น */
  groupName: string | null;
  message: string;
  /** ชื่อไฟล์ที่บันทึกใต้ data/scheduled-media/{userId}/ */
  imageStoredName: string | null;
  /** ISO 8601 */
  scheduledAt: string;
  repeat: RepeatKind;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  lastError: string | null;
  lastPostId: string | null;
};

type StoreFile = { jobs: ScheduledGroupPostJob[] };

const DATA_DIR = path.join(process.cwd(), "data", "scheduled-posts");

function userMediaDir(userId: string): string {
  return path.join(process.cwd(), "data", "scheduled-media", userId);
}

async function userStorePath(userId: string): Promise<string> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, `${userId}.json`);
}

export async function listScheduledJobs(
  userId: string,
): Promise<ScheduledGroupPostJob[]> {
  const p = await userStorePath(userId);
  try {
    const raw = await fs.readFile(p, "utf8");
    const data = JSON.parse(raw) as StoreFile;
    if (!Array.isArray(data.jobs)) return [];
    return data.jobs.filter((j) => j && typeof j.id === "string");
  } catch {
    return [];
  }
}

async function writeJobs(userId: string, jobs: ScheduledGroupPostJob[]) {
  const p = await userStorePath(userId);
  const payload: StoreFile = { jobs };
  await fs.writeFile(p, JSON.stringify(payload, null, 2), "utf8");
}

export async function getJob(
  userId: string,
  jobId: string,
): Promise<ScheduledGroupPostJob | null> {
  const jobs = await listScheduledJobs(userId);
  return jobs.find((j) => j.id === jobId) ?? null;
}

export async function createScheduledJob(opts: {
  userId: string;
  groupId: string;
  groupName: string | null;
  message: string;
  scheduledAtIso: string;
  repeat: RepeatKind;
  imageBytes?: Buffer;
  imageOriginalName?: string;
}): Promise<ScheduledGroupPostJob> {
  const now = new Date().toISOString();
  const id = randomUUID();
  let imageStoredName: string | null = null;

  if (opts.imageBytes && opts.imageBytes.length > 0) {
    const dir = userMediaDir(opts.userId);
    await fs.mkdir(dir, { recursive: true });
    const ext = safeImageExt(opts.imageOriginalName);
    imageStoredName = `${id}${ext}`;
    await fs.writeFile(path.join(dir, imageStoredName), opts.imageBytes);
  }

  const job: ScheduledGroupPostJob = {
    id,
    userId: opts.userId,
    groupId: opts.groupId.trim(),
    groupName: opts.groupName?.trim() || null,
    message: opts.message,
    imageStoredName,
    scheduledAt: opts.scheduledAtIso,
    repeat: opts.repeat,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    lastError: null,
    lastPostId: null,
  };

  const jobs = await listScheduledJobs(opts.userId);
  jobs.push(job);
  await writeJobs(opts.userId, jobs);
  return job;
}

function safeImageExt(original?: string): string {
  const n = (original ?? "").toLowerCase();
  if (n.endsWith(".png")) return ".png";
  if (n.endsWith(".webp")) return ".webp";
  if (n.endsWith(".gif")) return ".gif";
  return ".jpg";
}

export async function deleteScheduledJob(
  userId: string,
  jobId: string,
): Promise<boolean> {
  const jobs = await listScheduledJobs(userId);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return false;
  const next = jobs.filter((j) => j.id !== jobId);
  await writeJobs(userId, next);
  if (job.imageStoredName) {
    try {
      await fs.unlink(path.join(userMediaDir(userId), job.imageStoredName));
    } catch {
      /* ignore */
    }
  }
  return true;
}

export async function updateScheduledJob(
  userId: string,
  jobId: string,
  patch: Partial<
    Pick<
      ScheduledGroupPostJob,
      "enabled" | "scheduledAt" | "repeat" | "message" | "groupId" | "groupName"
    >
  >,
): Promise<ScheduledGroupPostJob | null> {
  const jobs = await listScheduledJobs(userId);
  const idx = jobs.findIndex((j) => j.id === jobId);
  if (idx < 0) return null;
  const cur = jobs[idx]!;
  const next: ScheduledGroupPostJob = {
    ...cur,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  jobs[idx] = next;
  await writeJobs(userId, jobs);
  return next;
}

export async function replaceJobAfterRun(
  userId: string,
  job: ScheduledGroupPostJob,
): Promise<void> {
  const jobs = await listScheduledJobs(userId);
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx < 0) return;
  jobs[idx] = job;
  await writeJobs(userId, jobs);
}

export function jobImageAbsolutePath(
  userId: string,
  job: ScheduledGroupPostJob,
): string | null {
  if (!job.imageStoredName) return null;
  return path.join(userMediaDir(userId), job.imageStoredName);
}

export function addRepeatInterval(iso: string, repeat: RepeatKind): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (repeat === "daily") {
    d.setUTCDate(d.getUTCDate() + 1);
  } else if (repeat === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return d.toISOString();
}
