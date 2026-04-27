import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getQuotaStatus,
  setMaxPostsPerDay,
} from "@/lib/group-post-quota";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = await getQuotaStatus(userId);
  return NextResponse.json({
    max_posts_per_day: q.maxPostsPerDay,
    used_today: q.usedToday,
    remaining: q.remaining,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { max_posts_per_day?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const raw = body.max_posts_per_day;
  if (raw === undefined) {
    return NextResponse.json(
      { error: "ต้องมี max_posts_per_day (ตัวเลขหรือ null)" },
      { status: 400 },
    );
  }

  if (raw === null) {
    await setMaxPostsPerDay(userId, null);
  } else if (typeof raw === "number" && Number.isFinite(raw)) {
    await setMaxPostsPerDay(userId, raw <= 0 ? null : Math.floor(raw));
  } else {
    return NextResponse.json({ error: "max_posts_per_day ไม่ถูกต้อง" }, { status: 400 });
  }

  const q = await getQuotaStatus(userId);
  return NextResponse.json({
    ok: true,
    max_posts_per_day: q.maxPostsPerDay,
    used_today: q.usedToday,
    remaining: q.remaining,
  });
}
