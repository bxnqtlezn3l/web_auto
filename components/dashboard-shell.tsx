"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

import { useFacebookTool } from "@/components/facebook-tool-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardShell({
  user,
  children,
}: {
  user: { email?: string | null; name?: string | null };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const {
    profile,
    profileActive,
    facebookSettingsReady,
    accessToken,
  } = useFacebookTool();

  const sessionLabel = user.name?.trim() || user.email || "บัญชี";
  const fbName = profile?.name?.trim();
  const navPrimaryLabel =
    profileActive && fbName ? fbName : sessionLabel;
  const navInitial = navPrimaryLabel.charAt(0).toUpperCase();

  const statusBadge = !facebookSettingsReady
    ? {
        dot: "bg-zinc-400",
        text: "กำลังโหลดการตั้งค่า…",
      }
    : profileActive
      ? {
          dot: "bg-emerald-500",
          text: fbName
            ? `เชื่อมต่อ Facebook แล้ว · ${fbName}`
            : "เชื่อมต่อ Facebook แล้ว",
        }
      : accessToken.trim()
        ? {
            dot: "bg-amber-500",
            text: "มี token แต่ยังไม่ยืนยัน — เปิดเมนูเชื่อมต่อแล้วกดยืนยัน",
          }
        : {
            dot: "bg-zinc-400",
            text: "ยังไม่ได้ตั้งค่า Facebook",
          };

          const nav = [
            { href: "/", label: "หน้าแรก" },
            { href: "/dashboard", label: "เชื่อมต่อ" },
    { href: "/dashboard/post", label: "โพสต์ & ตั้งเวลา" },
    { href: "/dashboard/story", label: "สตอรี่ & โปรไฟล์" },
  ] as const;

  const featurePills = ["โปรไฟล์", "กลุ่ม", "โพสต์", "ตั้งเวลา", "สตอรี่"] as const;

  const navActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/post")
      return (
        pathname === "/dashboard/post" ||
        pathname.startsWith("/dashboard/post/") ||
        pathname === "/dashboard/schedule" ||
        pathname.startsWith("/dashboard/schedule/")
      );
    if (href === "/dashboard/story")
      return (
        pathname === "/dashboard/story" ||
        pathname.startsWith("/dashboard/story/")
      );
    return pathname === href;
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-[#09090b] dark:text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-dash-grid-light [mask-image:linear-gradient(to_bottom,black_58%,transparent)] dark:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-dash-grid-dark [mask-image:linear-gradient(to_bottom,black_58%,transparent)] dark:block"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-70 dark:opacity-100"
        aria-hidden
      >
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-400/10 blur-[100px] dark:bg-blue-600/20" />
        <div className="absolute -right-16 top-40 h-64 w-64 rounded-full bg-violet-400/10 blur-[90px] dark:bg-violet-600/15" />
        <div className="absolute bottom-1/4 left-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-[80px] dark:bg-cyan-500/10" />
      </div>

      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#09090b]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6 sm:gap-8">
            <Link
              href="/dashboard"
              className="group flex shrink-0 items-center gap-2.5"
            >
              <span className="text-lg font-bold tracking-tight sm:text-xl">
                <span className="text-blue-500">โพสเฟส</span>
                <span className="text-blue-600 dark:text-blue-500">จ้าาาาาาา</span>
              </span>
            </Link>

            <nav
              className="hidden items-center gap-1 sm:flex"
              aria-label="เมนูหลัก"
            >
              {nav.map((item) => {
                const active = navActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-zinc-900 text-white dark:bg-white/10 dark:text-white"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle className="text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white" />
            <div
              className="mx-1 hidden h-6 w-px bg-zinc-200 dark:bg-white/10 sm:block"
              aria-hidden
            />
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-zinc-200/90 bg-white/90 py-1 pl-1 pr-2 dark:border-white/10 dark:bg-white/[0.06]">
              {profileActive && profile?.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Facebook CDN URLs vary; avoid remotePatterns churn
                <img
                  src={profile.pictureUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-white/15"
                  referrerPolicy="no-referrer"
                  title={
                    fbName
                      ? `${fbName} · ${user.email ?? ""}`
                      : (user.email ?? undefined)
                  }
                />
              ) : (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white"
                  title={
                    profileActive && fbName
                      ? `${fbName} · ${user.email ?? ""}`
                      : (user.email ?? undefined)
                  }
                >
                  {navInitial}
                </span>
              )}
              <span
                className="hidden min-w-0 max-w-[11rem] sm:block"
                title={
                  profileActive && fbName
                    ? `${fbName} · ${user.email ?? ""}`
                    : (user.email ?? undefined)
                }
              >
                <span className="block truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  {navPrimaryLabel}
                </span>
                {profileActive && fbName ? (
                  <span className="block truncate text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
                    {user.email
                      ? `เข้าสู่ระบบ: ${user.email}`
                      : "เชื่อมต่อ Facebook แล้ว"}
                  </span>
                ) : null}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-0.5 shrink-0 border-zinc-200 bg-white/80 text-zinc-800 hover:bg-zinc-50 dark:border-white/15 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-white/10"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              ออกจากระบบ
            </Button>
          </div>
        </div>

        <nav
          className="flex gap-1 border-t border-zinc-200/60 px-4 py-2 dark:border-white/[0.06] sm:hidden"
          aria-label="เมนูมือถือ"
        >
          {nav.map((item) => {
            const active = navActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 rounded-lg px-2 py-2.5 text-center text-sm font-medium transition-colors",
                  active
                    ? "bg-zinc-900 text-white dark:bg-white/10"
                    : "text-zinc-600 dark:text-zinc-400",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="relative">
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <div className="mb-8 space-y-5 sm:mb-10">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200/90 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300">
              <span
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusBadge.dot)}
              />
              <span className="min-w-0 truncate">{statusBadge.text}</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                {pathname === "/dashboard/post" ||
                pathname === "/dashboard/schedule"
                  ? "โพสต์ลงกลุ่ม & ตั้งเวลา"
                  : pathname === "/dashboard/story"
                    ? "สตอรี่ & โปรไฟล์"
                    : "ศูนย์ควบคุม Facebook"}
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
                {pathname === "/dashboard/post" ||
                pathname === "/dashboard/schedule"
                  ? "โพสต์ทันทีหลายกลุ่ม หรือจัดคิวล่วงหน้าได้ในหน้าเดียวกัน — ติ๊กเปิดฟังก์ชันในการ์ดแรกด้านล่าง — ตั้งค่ากลุ่มที่หน้าเชื่อมต่อ"
                  : pathname === "/dashboard/story"
                    ? "สตอรี่เพจ (Page token) หรือวิดีโอโปรไฟล์ส่วนตัวผ่าน User token — โปรไฟล์เป็นโพสต์บน Timeline ไม่ใช่สตอรี่วง 24 ชม. ตามข้อจำกัดของ Meta"
                    : "เชื่อมต่อบัญชีและ credential — โพสต์หรือตั้งเวลาได้ที่เมนู “โพสต์ & ตั้งเวลา” — สลับธีมจากไอคอนด้านบน"}
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {featurePills.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-zinc-200/90 bg-white/60 px-3 py-1 text-xs font-medium text-zinc-700 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
