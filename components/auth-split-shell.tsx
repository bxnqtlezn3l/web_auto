import Link from "next/link";
import type { ReactNode } from "react";

export function AuthSplitShell({
  mode,
  children,
}: {
  mode: "signin" | "signup";
  children: ReactNode;
}) {
  const copy =
    mode === "signup"
      ? {
          title: "เริ่มต้นการเดินทางกับเรา",
          subtitle: "สร้างบัญชีเพื่อเริ่มต้นใช้งาน โพสเฟสจ้าาาาาาา",
        }
      : {
          title: "ยินดีต้อนรับกลับ",
          subtitle: "เข้าสู่ระบบเพื่อใช้งานแดชบอร์ดและเครื่องมือ Facebook",
        };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="border-b border-white/[0.06] px-4 py-4 lg:hidden">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-blue-500 sm:text-xl"
        >
          <span className="text-blue-400">โพสเฟส</span>
          <span className="text-blue-600">จ้าาาาาาา</span>
        </Link>
      </div>

      <div className="lg:grid lg:min-h-[100dvh] lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-[#0c0c0e] lg:flex lg:flex-col lg:border-r lg:border-white/[0.06]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(255,255,255,0.065) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
            <Link href="/" className="w-fit text-xl font-bold tracking-tight">
              <span className="text-blue-400">โพสเฟส</span>
              <span className="text-blue-600">จ้าาาาาาา</span>
            </Link>

            <div className="max-w-md">
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl xl:leading-tight">
                {copy.title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                {copy.subtitle}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Trusted by teams at
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm font-semibold text-zinc-500">
                {["dub", "stripe", "clerk", "bolt"].map((name) => (
                  <span key={name} className="opacity-70">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-[calc(100dvh-57px)] flex-col justify-center px-4 py-12 sm:px-8 lg:min-h-[100dvh] lg:px-16 lg:py-16">
          <div className="mx-auto w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </main>
  );
}
