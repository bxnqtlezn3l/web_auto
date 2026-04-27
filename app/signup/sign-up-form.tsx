"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  IconAtSign,
  IconEye,
  IconEyeOff,
  IconLock,
  IconUser,
} from "@/components/icons";
import {
  AuthDividerOr,
  AuthSocialButtons,
} from "@/components/auth-social-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "ลงทะเบียนไม่สำเร็จ");
        return;
      }

      const sign = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (sign?.error) {
        router.push("/signin");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-white">
        สร้างบัญชีใหม่
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        กรอกข้อมูลด้านล่าง หรือใช้บัญชีโซเชียล (เร็ว ๆ นี้)
      </p>

      <div className="mt-8 space-y-6">
        <AuthSocialButtons actionLabel="สมัคร" />
        <AuthDividerOr />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <p
              className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="name" className="sr-only">
              ชื่อผู้ใช้
            </label>
            <div className="relative">
              <IconUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="username"
                placeholder="ชื่อผู้ใช้"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 border-white/10 bg-zinc-900/60 pl-10 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="sr-only">
              อีเมล
            </label>
            <div className="relative">
              <IconAtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-white/10 bg-zinc-900/60 pl-10 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="sr-only">
              รหัสผ่าน
            </label>
            <div className="relative">
              <IconLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="รหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-white/10 bg-zinc-900/60 pl-10 pr-11 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-300"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? (
                  <IconEyeOff className="h-4 w-4" />
                ) : (
                  <IconEye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-zinc-500">อย่างน้อย 8 ตัวอักษร</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="sr-only">
              ยืนยันรหัสผ่าน
            </label>
            <div className="relative">
              <IconLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="ยืนยันรหัสผ่าน"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 border-white/10 bg-zinc-900/60 pl-10 pr-11 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-300"
                aria-label={showConfirm ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showConfirm ? (
                  <IconEyeOff className="h-4 w-4" />
                ) : (
                  <IconEye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-blue-600 text-base font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500"
          >
            {loading ? "กำลังสร้างบัญชี…" : "สมัครสมาชิก"}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          มีบัญชีอยู่แล้ว?{" "}
          <Link
            href="/signin"
            className="font-medium text-blue-500 hover:text-blue-400"
          >
            เข้าสู่ระบบ
          </Link>
        </p>
        <p className="text-center">
          <Link
            href="/"
            className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            ← กลับหน้าแรก
          </Link>
        </p>
      </div>
    </div>
  );
}
