import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  ensureFacebookAccountsMigrated,
  resolveActiveFacebookAccount,
} from "@/lib/facebook-account-server";
import { prisma } from "@/lib/prisma";

function norm(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t.length ? t : null;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureFacebookAccountsMigrated(userId);
  const { account, accounts } = await resolveActiveFacebookAccount(userId);

  return NextResponse.json({
    cookie: account?.facebookCookie ?? "",
    access_token: account?.facebookAccessToken ?? "",
    active_account_id: account?.id ?? null,
    accounts: accounts.map((a) => ({
      id: a.id,
      label: a.label,
      is_connected: a.isConnected,
    })),
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { cookie?: unknown; access_token?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const cookie = norm(body.cookie);
  const access_token = norm(body.access_token);

  await ensureFacebookAccountsMigrated(userId);
  const { account } = await resolveActiveFacebookAccount(userId);

  if (!account) {
    const acc = await prisma.userFacebookAccount.create({
      data: {
        userId,
        label: "บัญชี 1",
        isConnected: true,
        facebookCookie: cookie,
        facebookAccessToken: access_token,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { activeFacebookAccountId: acc.id },
    });
  } else {
    await prisma.userFacebookAccount.update({
      where: { id: account.id },
      data: {
        facebookCookie: cookie,
        facebookAccessToken: access_token,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
