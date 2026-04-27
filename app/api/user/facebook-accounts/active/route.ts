import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { setActiveFacebookAccount } from "@/lib/facebook-account-server";

export async function PUT(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { account_id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const accountId =
    typeof body.account_id === "string" ? body.account_id.trim() : "";
  if (!accountId) {
    return NextResponse.json({ error: "ต้องมี account_id" }, { status: 400 });
  }

  const ok = await setActiveFacebookAccount(userId, accountId);
  if (!ok) {
    return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
