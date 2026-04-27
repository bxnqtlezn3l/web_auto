"use client";

import * as React from "react";

import { FacebookPostPanel } from "@/components/facebook-post-panel";
import { FacebookScheduledPostPanel } from "@/components/facebook-scheduled-post-panel";
import { CheckboxToggle } from "@/components/ui/checkbox-toggle";
import { cn } from "@/lib/utils";

const STORAGE_GROUP = "fb-dash-enable-group-post";
const STORAGE_SCHEDULE = "fb-dash-enable-scheduled-post";

export function FacebookGroupDashboardPage() {
  const [showGroupPost, setShowGroupPost] = React.useState(true);
  const [showSchedule, setShowSchedule] = React.useState(true);
  const [prefsReady, setPrefsReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const g = localStorage.getItem(STORAGE_GROUP);
      const s = localStorage.getItem(STORAGE_SCHEDULE);
      if (g !== null) setShowGroupPost(g === "1");
      if (s !== null) setShowSchedule(s === "1");
      if (
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("schedule") === "1"
      ) {
        setShowSchedule(true);
        localStorage.setItem(STORAGE_SCHEDULE, "1");
      }
    } catch {
      /* ignore */
    } finally {
      setPrefsReady(true);
    }
  }, []);

  const persistGroup = React.useCallback((on: boolean) => {
    setShowGroupPost(on);
    try {
      localStorage.setItem(STORAGE_GROUP, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const persistSchedule = React.useCallback((on: boolean) => {
    setShowSchedule(on);
    try {
      localStorage.setItem(STORAGE_SCHEDULE, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const nothingEnabled = prefsReady && !showGroupPost && !showSchedule;

  return (
    <div className="space-y-8">
      <section
        className={cn(
          "rounded-xl border border-border/90 bg-card/50 p-4 shadow-sm backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/60",
        )}
        aria-label="เลือกฟังก์ชันที่จะแสดง"
      >
        <p className="text-sm font-semibold text-foreground">
          เปิดใช้งานฟังก์ชันบนหน้านี้
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          ติ๊กเพื่อแสดงส่วนโพสต์ทันทีและ/หรือตั้งเวลา — การตั้งค่าจำในเบราว์เซอร์นี้
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <label
            htmlFor="fb-dash-toggle-group"
            className="flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground"
          >
            <CheckboxToggle
              id="fb-dash-toggle-group"
              checked={showGroupPost}
              onCheckedChange={persistGroup}
              aria-label="เปิดโพสต์ลงกลุ่ม"
            />
            โพสต์ลงกลุ่ม
          </label>
          <label
            htmlFor="fb-dash-toggle-schedule"
            className="flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground"
          >
            <CheckboxToggle
              id="fb-dash-toggle-schedule"
              checked={showSchedule}
              onCheckedChange={persistSchedule}
              aria-label="เปิดตั้งเวลาโพสต์"
            />
            ตั้งเวลาโพสต์
          </label>
        </div>
      </section>

      {nothingEnabled ? (
        <p
          className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100"
          role="status"
        >
          ยังไม่ได้เปิดฟังก์ชันใด — ติ๊กอย่างน้อยหนึ่งช่องด้านบนเพื่อใช้งาน
        </p>
      ) : null}

      {showGroupPost ? (
        <FacebookPostPanel showFontAttribution={false} />
      ) : null}
      {showSchedule ? <FacebookScheduledPostPanel /> : null}
    </div>
  );
}
