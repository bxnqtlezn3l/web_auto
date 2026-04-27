import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ensureFacebookAccountsMigrated, resolveActiveFacebookAccount } from "@/lib/facebook-account-server";
import { MAX_FACEBOOK_ACCOUNTS_PER_USER } from "@/lib/max-facebook-accounts";
import { prisma } from "@/lib/prisma";

function norm(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t.length ? t : null;
}

/** รายการบัญชี (ไม่ส่ง token) + id ที่กำลังใช้ */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureFacebookAccountsMigrated(userId);
  const { account, accounts } = await resolveActiveFacebookAccount(userId);

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      label: a.label,
      is_connected: a.isConnected,
    })),
    active_account_id: account?.id ?? null,
  });
}

/** สร้างบัญชีใหม่แล้วสลับเป็นบัญชีที่ใช้งาน */
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    label?: unknown;
    cookie?: unknown;
    access_token?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const access_token = norm(body.access_token);
  if (!access_token) {
    return NextResponse.json(
      { error: "ต้องมี access_token" },
      { status: 400 },
    );
  }

  const labelRaw = typeof body.label === "string" ? body.label.trim() : "";

  await ensureFacebookAccountsMigrated(userId);

  const existing = await prisma.userFacebookAccount.count({
    where: { userId },
  });
  if (existing >= MAX_FACEBOOK_ACCOUNTS_PER_USER) {
    return NextResponse.json(
      { error: `บันทึกได้สูงสุด ${MAX_FACEBOOK_ACCOUNTS_PER_USER} บัญชี` },
      { status: 400 },
    );
  }

  const nextIndex = existing + 1;
  const label =
    labelRaw.length > 0
      ? labelRaw.slice(0, 191)
      : `บัญชี ${nextIndex}`;

  const acc = await prisma.userFacebookAccount.create({
    data: {
      userId,
      label,
      isConnected: true,
      facebookCookie: norm(body.cookie),
      facebookAccessToken: access_token,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { activeFacebookAccountId: acc.id },
  });

  return NextResponse.json({
    ok: true,
    account: { id: acc.id, label: acc.label },
  });
}
