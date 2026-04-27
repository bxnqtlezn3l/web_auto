import Link from "next/link";

import { auth } from "@/auth";
import { LandingRainbowCta } from "@/components/landing-rainbow-cta";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { formatStatNumber, getLandingStats } from "@/lib/landing-stats";

export default async function LandingPage() {
  const session = await auth();
  const loggedIn = !!session?.user;
  const stats = await getLandingStats();

  const nav = [
    { href: "/", label: "หน้าแรก" },
    { href: "#services", label: "บริการ" },
    { href: "/signup", label: "เติมเงิน" },
    { href: "/signin", label: "ประวัติ" },
  ] as const;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#09090b] text-zinc-100">
      <div className="bg-landing-grid pointer-events-none absolute inset-0 min-h-[120vh] mask-[linear-gradient(to_bottom,black_55%,transparent)]" />

      {/* ไอคอนลอย + แสงพื้นหลัง */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-20 top-28 h-72 w-72 rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute -right-16 top-40 h-64 w-64 rounded-full bg-violet-600/15 blur-[90px]" />
        <div className="absolute bottom-1/3 left-1/4 h-48 w-48 rounded-full bg-cyan-500/10 blur-[80px]" />
        <span className="absolute left-[8%] top-[22%] text-5xl opacity-[0.12] blur-[2px] grayscale">
          f
        </span>
        <span className="absolute right-[12%] top-[18%] text-5xl opacity-[0.1] blur-[3px]">
          ♪
        </span>
        <span className="absolute right-[20%] top-[38%] text-5xl opacity-[0.11] blur-[2px]">
          ◎
        </span>
      </div>

      <div className="relative">
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-md">
          <div className="relative mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-blue-500 sm:text-xl"
            >
              โพสเฟสจ้าาาาาาา
            </Link>

            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex"
              aria-label="เมนูหลัก"
            >
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <ThemeToggle className="text-zinc-400 hover:bg-white/10 hover:text-white" />
              {loggedIn ? (
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-blue-600 px-5 text-white hover:bg-blue-500"
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="hidden text-zinc-300 hover:bg-white/10 hover:text-white sm:inline-flex"
                  >
                    <Link href="/signin">เข้าสู่ระบบ</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-blue-600 px-4 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 sm:px-5"
                  >
                    <Link href="/signup">สมัครสมาชิก</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <nav
          className="flex gap-6 overflow-x-auto border-b border-white/[0.06] px-4 py-3 md:hidden"
          aria-label="เมนูหลัก (มือถือ)"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 text-center sm:px-6 sm:pt-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur-sm sm:text-sm">
            <span aria-hidden>🚀</span>
            <span>ใช้งานได้ตลอด 24 ชั่วโมง</span>
            <span className="text-zinc-500" aria-hidden>
              ↗
            </span>
          </div>

          <h1 className="mx-auto mt-8 max-w-4xl text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl sm:leading-[1.12] md:text-6xl">
            เครื่องมือโซเชียล — เชื่อม Facebook จัดการกลุ่ม และโพสต์ได้เร็ว
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
            รวดเร็ว ปลอดภัย และเชื่อถือได้ — ตรวจโปรไฟล์ คัดกลุ่มสำหรับโพสต์
            และเก็บ Cookie / Access token ในเบราว์เซอร์ของคุณเท่านั้น
          </p>

          <div className="relative mx-auto mt-12">
            <LandingRainbowCta
              href={loggedIn ? "/dashboard" : "/signup"}
              label={loggedIn ? "เปิดแดชบอร์ด" : "บริการทั้งหมด"}
            />
          </div>

          {/* สถิติ */}
          <div className="relative mx-auto mt-24 max-w-4xl">
            <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <p className="relative mx-auto inline-block bg-[#09090b] px-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
              เชื่อถือโดยผู้ใช้มากมาย
            </p>
            <ul className="mt-10 grid gap-10 sm:grid-cols-3">
              {(
                [
                  { v: stats.users, l: "ผู้ใช้งาน" },
                  { v: stats.graphConnections, l: "การเชื่อมต่อสำเร็จ" },
                  { v: stats.features, l: "ฟีเจอร์หลัก" },
                ] as const
              ).map((s) => (
                <li key={s.l} className="text-center">
                  <p className="text-3xl font-bold tabular-nums text-white sm:text-4xl">
                    {formatStatNumber(s.v)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">{s.l}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="services"
          className="relative mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6"
        >
          <ul className="grid gap-5 sm:grid-cols-3">
            {[
              {
                title: "บัญชีปลอดภัย",
                body: "รหัสผ่านเข้ารหัสด้วย bcrypt เก็บในฐานข้อมูล MySQL ของคุณ",
              },
              {
                title: "Facebook แยกชั้น",
                body: "เชื่อมต่อ Graph แบบเดียวกับสคริปต์ Node — โปรไฟล์และกลุ่ม",
              },
              {
                title: "ธีมสว่าง / มืด",
                body: "สลับโหมดจากแดชบอร์ดหรือหน้าแรก — IBM Plex Sans Thai",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-6 backdrop-blur-sm transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]"
              >
                <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ปุ่มแชทลอย */}
      <a
        href="mailto:support@example.com"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/40 transition-transform hover:scale-105 hover:bg-blue-500"
        aria-label="ติดต่อสอบถาม"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </a>
    </main>
  );
}
