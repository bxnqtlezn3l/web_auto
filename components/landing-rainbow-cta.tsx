import Link from "next/link";

import { IconChevronRight } from "@/components/icons";

export function LandingRainbowCta({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div
      className="flex flex-row flex-wrap items-center justify-center gap-3 pt-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out fill-mode-both [animation-delay:150ms]"
    >
      <Link
        href={href}
        className="landing-rainbow-cta group relative z-0 inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-visible rounded-full border-0 px-8 text-sm font-medium whitespace-nowrap text-zinc-100 outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-blue-500/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0"
      >
        {label}
        <IconChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
