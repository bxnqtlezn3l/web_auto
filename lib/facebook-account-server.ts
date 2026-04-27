import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function rethrowIfMissingFacebookAccountsTable(e: unknown): never {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2021"
  ) {
    throw new Error(
      "ฐานข้อมูลยังไม่มีตาราง user_facebook_accounts — ในโฟลเดอร์ web รัน `npx prisma db push` (dev) หรือ `npx prisma migrate deploy` / baseline migration (production)",
      { cause: e },
    );
  }
  throw e;
}

/**
 * ย้าย cookie/token จากแถว users ไปบัญชีแรก (ครั้งเดียวต่อ user)
 */
export async function ensureFacebookAccountsMigrated(
  userId: string,
): Promise<void> {
  let count: number;
  try {
    count = await prisma.userFacebookAccount.count({
      where: { userId },
    });
  } catch (e) {
    rethrowIfMissingFacebookAccountsTable(e);
  }
  if (count > 0) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { facebookCookie: true, facebookAccessToken: true },
  });
  const hasToken =
    (user?.facebookAccessToken?.trim()?.length ?? 0) > 0 ||
    (user?.facebookCookie?.trim()?.length ?? 0) > 0;
  if (!hasToken) {
    return;
  }

  const acc = await prisma.userFacebookAccount.create({
    data: {
      userId,
      label: "บัญชีหลัก",
      isConnected: true,
      facebookCookie: user?.facebookCookie,
      facebookAccessToken: user?.facebookAccessToken,
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { activeFacebookAccountId: acc.id },
  });
}

export type FacebookAccountSecret = {
  id: string;
  label: string;
  facebookCookie: string | null;
  facebookAccessToken: string | null;
};

export type FacebookAccountListItem = {
  id: string;
  label: string;
  isConnected: boolean;
};

export async function resolveActiveFacebookAccount(userId: string): Promise<{
  account: FacebookAccountSecret | null;
  accounts: FacebookAccountListItem[];
}> {
  await ensureFacebookAccountsMigrated(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeFacebookAccountId: true,
      facebookAccounts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          label: true,
          isConnected: true,
          facebookCookie: true,
          facebookAccessToken: true,
        },
      },
    },
  });

  let list = user?.facebookAccounts ?? [];
  if (list.length === 0) {
    return { account: null, accounts: [] };
  }

  const connected = list.filter((a) => a.isConnected);
  if (connected.length === 0) {
    const first = list[0]!;
    await prisma.userFacebookAccount.update({
      where: { id: first.id },
      data: { isConnected: true },
    });
    list = list.map((a) =>
      a.id === first.id ? { ...a, isConnected: true } : a,
    );
  }

  let activeId = user?.activeFacebookAccountId;
  let current = activeId
    ? list.find((a) => a.id === activeId)
    : undefined;
  if (!current) {
    current = list[0]!;
    activeId = current.id;
    await prisma.user.update({
      where: { id: userId },
      data: { activeFacebookAccountId: activeId },
    });
  }

  if (!current.isConnected) {
    const pick =
      list.find((a) => a.isConnected) ?? list[0]!;
    activeId = pick.id;
    current = pick;
    await prisma.user.update({
      where: { id: userId },
      data: { activeFacebookAccountId: pick.id },
    });
  }

  return {
    account: {
      id: current.id,
      label: current.label,
      facebookCookie: current.facebookCookie,
      facebookAccessToken: current.facebookAccessToken,
    },
    accounts: list.map((a) => ({
      id: a.id,
      label: a.label,
      isConnected: a.isConnected,
    })),
  };
}

export async function setActiveFacebookAccount(
  userId: string,
  accountId: string,
): Promise<boolean> {
  await ensureFacebookAccountsMigrated(userId);
  const ok = await prisma.userFacebookAccount.findFirst({
    where: { id: accountId, userId, isConnected: true },
    select: { id: true },
  });
  if (!ok) {
    return false;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { activeFacebookAccountId: accountId },
  });
  return true;
}

/**
 * ติ๊ก “เชื่อมต่อแอป” — ต้องมีเชื่อมต่ออย่างน้อย 1 บัญชีเสมอ
 */
export async function setFacebookAccountConnection(
  userId: string,
  accountId: string,
  isConnected: boolean,
): Promise<"ok" | "not_found" | "last_connected" | "invalid"> {
  await ensureFacebookAccountsMigrated(userId);

  const acc = await prisma.userFacebookAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true, isConnected: true },
  });
  if (!acc) {
    return "not_found";
  }
  if (acc.isConnected && !isConnected) {
    const n = await prisma.userFacebookAccount.count({
      where: { userId, isConnected: true },
    });
    if (n <= 1) {
      return "last_connected";
    }
  }

  await prisma.userFacebookAccount.update({
    where: { id: accountId },
    data: { isConnected },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeFacebookAccountId: true },
  });
  if (user?.activeFacebookAccountId === accountId && !isConnected) {
    const next = await prisma.userFacebookAccount.findFirst({
      where: { userId, isConnected: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (next) {
      await prisma.user.update({
        where: { id: userId },
        data: { activeFacebookAccountId: next.id },
      });
    }
  }

  return "ok";
}
