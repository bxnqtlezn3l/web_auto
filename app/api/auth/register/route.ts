import { hash } from "bcryptjs";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { LANDING_STATS_TAG } from "@/lib/landing-stats";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
    };

    const email = String(body.email ?? "")
      .toLowerCase()
      .trim();
    const password = String(body.password ?? "");
    const nameRaw = body.name;
    const name =
      typeof nameRaw === "string" && nameRaw.trim()
        ? nameRaw.trim().slice(0, 191)
        : null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกอีเมลและรหัสผ่าน" },
        { status: 400 },
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "รูปแบบอีเมลไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
        { status: 400 },
      );
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "อีเมลนี้ถูกใช้ลงทะเบียนแล้ว" },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    revalidateTag(LANDING_STATS_TAG);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "สร้างบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}
