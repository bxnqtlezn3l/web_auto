import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  ensureFacebookAccountsMigrated,
  setFacebookAccountConnection,
} from "@/lib/facebook-account-server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId } = await params;
  if (!accountId?.trim()) {
    return NextResponse.json({ error: "ไม่มี id" }, { status: 400 });
  }

  await ensureFacebookAccountsMigrated(userId);

  const existing = await prisma.userFacebookAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
  }

  await prisma.userFacebookAccount.delete({
    where: { id: accountId },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeFacebookAccountId: true },
  });

  if (user?.activeFacebookAccountId === accountId) {
    const next = await prisma.userFacebookAccount.findFirst({
      where: { userId, isConnected: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const fallback = await prisma.userFacebookAccount.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const useId = next?.id ?? fallback?.id;
    await prisma.user.update({
      where: { id: userId },
      data: { activeFacebookAccountId: useId ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId } = await params;
  let body: { label?: unknown; is_connected?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const labelRaw = typeof body.label === "string" ? body.label.trim() : "";
  const hasLabel = labelRaw.length > 0;
  const hasConn = typeof body.is_connected === "boolean";

  if (!hasLabel && !hasConn) {
    return NextResponse.json(
      { error: "ต้องส่ง label หรือ is_connected" },
      { status: 400 },
    );
  }

  await ensureFacebookAccountsMigrated(userId);

  if (hasConn && (body.is_connected === true || body.is_connected === false)) {
    const r = await setFacebookAccountConnection(
      userId,
      accountId,
      body.is_connected,
    );
    if (r === "not_found") {
      return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
    }
    if (r === "last_connected") {
      return NextResponse.json(
        { error: "ต้องเชื่อมต่ออย่างน้อย 1 บัญชี" },
        { status: 400 },
      );
    }
  }

  if (hasLabel) {
    const updated = await prisma.userFacebookAccount.updateMany({
      where: { id: accountId, userId },
      data: { label: labelRaw.slice(0, 191) },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
    }
  }

  return NextResponse.json({ ok: true });
}
