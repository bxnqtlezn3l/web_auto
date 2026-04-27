"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from "@/components/icons";
import {
  AuthDividerOr,
  AuthSocialButtons,
} from "@/components/auth-social-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
      const next =
        callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/dashboard";
      router.push(next);
      router.refresh();
    } catch {
      setError("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-white">
        เข้าสู่ระบบ
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        ใช้อีเมลและรหัสผ่าน หรือบัญชีโซเชียล (เร็ว ๆ นี้)
      </p>

      <div className="mt-8 space-y-6">
        <AuthSocialButtons actionLabel="เข้าสู่ระบบ" />
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
            <label htmlFor="email" className="sr-only">
              อีเมล
            </label>
            <div className="relative">
              <IconMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
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
                autoComplete="current-password"
                required
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
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-blue-600 text-base font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500"
          >
            {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          ยังไม่มีบัญชี?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-500 hover:text-blue-400"
          >
            สมัครสมาชิก
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
