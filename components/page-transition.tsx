"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * แอนิเมชาเข้าหน้าเบา ๆ — ไม่ใส่ key ตาม pathname เพื่อลดการรีเมาท์ทั้ง subtree
 * (Next `template.tsx` จะสร้าง instance ใหม่ตอนเปลี่ยน route อยู่แล้ว)
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "min-h-0 w-full animate-page-in motion-reduce:animate-none",
      )}
    >
      {children}
    </div>
  );
}
