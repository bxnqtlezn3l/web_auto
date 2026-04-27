"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckboxToggle } from "@/components/ui/checkbox-toggle";
import { FilePicker } from "@/components/ui/file-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFacebookTool } from "@/components/facebook-tool-provider";
import { cn } from "@/lib/utils";

type ApiJob = {
  id: string;
  groupId: string;
  groupName: string | null;
  message: string;
  imageStoredName: string | null;
  scheduledAt: string;
  repeat: "none" | "daily" | "weekly";
  enabled: boolean;
  lastRunAt: string | null;
  lastError: string | null;
  lastPostId: string | null;
};

const AUTO_RUN_KEY = "fb-schedule-auto-run";
const INTERVAL_SEC_KEY = "fb-schedule-interval-sec";
const DEFAULT_OFFSET_MIN_KEY = "fb-schedule-default-offset-min";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatThaiShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("th-TH", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function repeatLabel(r: ApiJob["repeat"]): string {
  if (r === "daily") return "ทุกวัน";
  if (r === "weekly") return "ทุกสัปดาห์";
  return "ครั้งเดียว";
}

export function FacebookScheduledPostPanel() {
  const {
    facebookSettingsReady,
    canUseFacebookPostUi,
    accessToken,
    facebookGraphOptIn,
    profile,
    groups,
    groupsLoading,
    groupsError,
    postableGroupList,
  } = useFacebookTool();

  const [jobs, setJobs] = React.useState<ApiJob[]>([]);
  const [jobsLoading, setJobsLoading] = React.useState(true);
  const [jobsError, setJobsError] = React.useState<string | null>(null);

  const [message, setMessage] = React.useState("");
  const [image, setImage] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [scheduledLocal, setScheduledLocal] = React.useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 15 * 60 * 1000)),
  );
  const [repeat, setRepeat] = React.useState<ApiJob["repeat"]>("none");

  const [submitLoading, setSubmitLoading] = React.useState(false);
  const [submitOk, setSubmitOk] = React.useState<string | null>(null);
  const [submitErr, setSubmitErr] = React.useState<string | null>(null);

  const [runLoading, setRunLoading] = React.useState(false);
  const [runLog, setRunLog] = React.useState<string | null>(null);

  const [autoRun, setAutoRun] = React.useState(false);
  /** ช่วงรันคิวอัตโนมัติ (วินาที) — ตั้งได้ในหน้าเว็บ */
  const [autoRunIntervalSec, setAutoRunIntervalSec] = React.useState(60);
  const [intervalInputStr, setIntervalInputStr] = React.useState("60");
  /** ค่าเริ่มต้น “โพสต์หลังจากนี้” สำหรับฟอร์มเพิ่มคิว (นาที) */
  const [defaultOffsetMin, setDefaultOffsetMin] = React.useState(15);
  const [offsetInputStr, setOffsetInputStr] = React.useState("15");

  const [scheduleSelectedByGroupId, setScheduleSelectedByGroupId] = React.useState<
    Record<string, boolean>
  >({});

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editMessage, setEditMessage] = React.useState("");
  const [editTimeLocal, setEditTimeLocal] = React.useState("");
  const [editRepeat, setEditRepeat] = React.useState<ApiJob["repeat"]>("none");
  const [editGroupId, setEditGroupId] = React.useState("");
  const [editSaving, setEditSaving] = React.useState(false);
  const [editErr, setEditErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setAutoRun(localStorage.getItem(AUTO_RUN_KEY) === "1");
      const i = Number.parseInt(
        localStorage.getItem(INTERVAL_SEC_KEY) ?? "60",
        10,
      );
      const o = Number.parseInt(
        localStorage.getItem(DEFAULT_OFFSET_MIN_KEY) ?? "15",
        10,
      );
      const iv = clamp(Number.isFinite(i) ? i : 60, 15, 3600);
      const ov = clamp(Number.isFinite(o) ? o : 15, 1, 10080);
      setAutoRunIntervalSec(iv);
      setIntervalInputStr(String(iv));
      setDefaultOffsetMin(ov);
      setOffsetInputStr(String(ov));
      setScheduledLocal(
        toDatetimeLocalValue(new Date(Date.now() + ov * 60 * 1000)),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const persistAutoRun = React.useCallback((on: boolean) => {
    setAutoRun(on);
    try {
      if (on) localStorage.setItem(AUTO_RUN_KEY, "1");
      else localStorage.removeItem(AUTO_RUN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const persistIntervalSec = React.useCallback((raw: number) => {
    const v = clamp(Math.floor(raw), 15, 3600);
    setAutoRunIntervalSec(v);
    setIntervalInputStr(String(v));
    try {
      localStorage.setItem(INTERVAL_SEC_KEY, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const persistDefaultOffsetMin = React.useCallback((raw: number) => {
    const v = clamp(Math.floor(raw), 1, 10080);
    setDefaultOffsetMin(v);
    setOffsetInputStr(String(v));
    try {
      localStorage.setItem(DEFAULT_OFFSET_MIN_KEY, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const applyDefaultTimeToForm = React.useCallback(() => {
    const d = new Date(Date.now() + defaultOffsetMin * 60 * 1000);
    setScheduledLocal(toDatetimeLocalValue(d));
  }, [defaultOffsetMin]);

  const loadJobs = React.useCallback(async () => {
    setJobsError(null);
    try {
      const res = await fetch("/api/facebook/scheduled", { cache: "no-store" });
      const data = (await res.json()) as { error?: string; jobs?: ApiJob[] };
      if (!res.ok) {
        setJobs([]);
        setJobsError(data.error ?? "โหลดคิวไม่สำเร็จ");
        return;
      }
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch {
      setJobs([]);
      setJobsError("เครือข่ายผิดพลาด");
    } finally {
      setJobsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  React.useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(image);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [image]);

  React.useEffect(() => {
    setScheduleSelectedByGroupId((prev) => {
      const next: Record<string, boolean> = {};
      for (const g of postableGroupList) {
        next[g.id] = prev[g.id] ?? false;
      }
      return next;
    });
  }, [postableGroupList]);

  const scheduleSelectedTargetIds = React.useMemo(
    () =>
      postableGroupList
        .filter((g) => scheduleSelectedByGroupId[g.id])
        .map((g) => g.id),
    [postableGroupList, scheduleSelectedByGroupId],
  );

  const [scheduleGroupSearch, setScheduleGroupSearch] = React.useState("");

  const postableGroupsForScheduleList = React.useMemo(() => {
    const q = scheduleGroupSearch.trim().toLowerCase();
    if (!q) {
      return postableGroupList;
    }
    return postableGroupList.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.id.includes(q) ||
        (g.privacy?.toLowerCase().includes(q) ?? false),
    );
  }, [postableGroupList, scheduleGroupSearch]);

  const runDueQueue = React.useCallback(async () => {
    setRunLoading(true);
    setRunLog(null);
    try {
      const res = await fetch("/api/facebook/scheduled/run", {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        processed?: number;
        results?: { jobId: string; ok: boolean; post_id?: string; error?: string }[];
      };
      if (!res.ok) {
        setRunLog(data.error ?? "รันคิวไม่สำเร็จ");
        return;
      }
      const n = data.processed ?? 0;
      const lines =
        data.results?.map((r) =>
          r.ok
            ? `· ${r.jobId.slice(0, 8)}… สำเร็จ${r.post_id ? ` (${r.post_id})` : ""}`
            : `· ${r.jobId.slice(0, 8)}… ล้มเหลว: ${r.error ?? "ไม่ทราบสาเหตุ"}`,
        ) ?? [];
      setRunLog(
        n === 0
          ? "ไม่มีรายการที่ถึงเวลา"
          : [`ประมวลผล ${n} รายการ`, ...lines].join("\n"),
      );
      await loadJobs();
    } catch {
      setRunLog("เครือข่ายผิดพลาด");
    } finally {
      setRunLoading(false);
    }
  }, [loadJobs]);

  React.useEffect(() => {
    if (!autoRun || !canUseFacebookPostUi) return;
    const ms = clamp(autoRunIntervalSec, 15, 3600) * 1000;
    const id = window.setInterval(() => {
      void runDueQueue();
    }, ms);
    return () => window.clearInterval(id);
  }, [autoRun, canUseFacebookPostUi, runDueQueue, autoRunIntervalSec]);

  const applyPreset = React.useCallback((kind: "m5" | "h1" | "tomorrow9") => {
    const d = new Date();
    if (kind === "m5") {
      d.setMinutes(d.getMinutes() + 5);
    } else if (kind === "h1") {
      d.setHours(d.getHours() + 1);
    } else {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    }
    setScheduledLocal(toDatetimeLocalValue(d));
  }, []);

  const handleAddJob = React.useCallback(async () => {
    if (scheduleSelectedTargetIds.length === 0) {
      setSubmitErr("เลือกอย่างน้อยหนึ่งกลุ่มปลายทางจากรายการติ๊ก");
      return;
    }
    if (!message.trim() && !image) {
      setSubmitErr("กรุณากรอกข้อความหรือแนบรูป");
      return;
    }
    const when = new Date(scheduledLocal);
    if (Number.isNaN(when.getTime())) {
      setSubmitErr("เวลาไม่ถูกต้อง");
      return;
    }

    setSubmitLoading(true);
    setSubmitErr(null);
    setSubmitOk(null);

    try {
      for (const gid of scheduleSelectedTargetIds) {
        const g = postableGroupList.find((x) => x.id === gid);
        const fd = new FormData();
        fd.set("group_id", gid);
        if (g?.name) {
          fd.set("group_name", g.name);
        }
        fd.set("message", message.trim());
        fd.set("scheduled_at", when.toISOString());
        fd.set("repeat", repeat);
        if (image) {
          fd.set("image", image);
        }

        const res = await fetch("/api/facebook/scheduled", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json()) as { error?: string; ok?: boolean };
        if (!res.ok) {
          setSubmitErr(
            (data.error ?? "เพิ่มคิวไม่สำเร็จ") +
              (scheduleSelectedTargetIds.length > 1
                ? ` (กลุ่ม: ${g?.name ?? gid})`
                : ""),
          );
          await loadJobs();
          return;
        }
      }
      setSubmitOk(
        scheduleSelectedTargetIds.length > 1
          ? `เพิ่มเข้าคิว ${scheduleSelectedTargetIds.length} รายการ`
          : "เพิ่มเข้าคิวแล้ว",
      );
      setMessage("");
      setImage(null);
      await loadJobs();
    } catch {
      setSubmitErr("เครือข่ายผิดพลาด");
    } finally {
      setSubmitLoading(false);
    }
  }, [
    scheduleSelectedTargetIds,
    postableGroupList,
    message,
    image,
    scheduledLocal,
    repeat,
    loadJobs,
  ]);

  const toggleEnabled = React.useCallback(
    async (job: ApiJob, enabled: boolean) => {
      try {
        const res = await fetch("/api/facebook/scheduled", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: job.id, enabled }),
        });
        if (res.ok) await loadJobs();
      } catch {
        /* ignore */
      }
    },
    [loadJobs],
  );

  const removeJob = React.useCallback(
    async (id: string) => {
      if (!window.confirm("ลบรายการนี้จากคิว?")) return;
      try {
        const res = await fetch(
          `/api/facebook/scheduled?id=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        if (res.ok) await loadJobs();
      } catch {
        /* ignore */
      }
    },
    [loadJobs],
  );

  const startEditJob = React.useCallback((j: ApiJob) => {
    setEditingId(j.id);
    setEditMessage(j.message);
    setEditTimeLocal(toDatetimeLocalValue(new Date(j.scheduledAt)));
    setEditRepeat(j.repeat);
    setEditGroupId(j.groupId);
    setEditErr(null);
  }, []);

  const cancelEditJob = React.useCallback(() => {
    setEditingId(null);
    setEditErr(null);
  }, []);

  const saveEditJob = React.useCallback(async () => {
    if (!editingId) return;
    const when = new Date(editTimeLocal);
    if (Number.isNaN(when.getTime())) {
      setEditErr("เวลาไม่ถูกต้อง");
      return;
    }
    const trimmed = editMessage.trim();
    const job = jobs.find((x) => x.id === editingId);
    if (!trimmed && !job?.imageStoredName) {
      setEditErr("ต้องมีข้อความหรือรูปเดิมในคิว");
      return;
    }
    if (!editGroupId.trim()) {
      setEditErr("เลือกกลุ่ม");
      return;
    }
    const g = postableGroupList.find((x) => x.id === editGroupId);
    const group_name = g?.name ?? job?.groupName ?? null;
    setEditSaving(true);
    setEditErr(null);
    try {
      const res = await fetch("/api/facebook/scheduled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          message: trimmed,
          scheduled_at: when.toISOString(),
          repeat: editRepeat,
          group_id: editGroupId.trim(),
          group_name,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEditErr(data.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      setEditingId(null);
      await loadJobs();
    } catch {
      setEditErr("เครือข่ายผิดพลาด");
    } finally {
      setEditSaving(false);
    }
  }, [
    editingId,
    editTimeLocal,
    editMessage,
    editRepeat,
    editGroupId,
    jobs,
    postableGroupList,
    loadJobs,
  ]);

  if (!facebookSettingsReady) {
    return (
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85">
        <CardContent className="py-10">
          <p className="text-center text-sm text-muted-foreground">
            กำลังตรวจสอบการเชื่อมต่อ…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!canUseFacebookPostUi) {
    const hasToken = Boolean(accessToken.trim());
    return (
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            ตั้งเวลาโพสต์อัตโนมัติ
          </CardTitle>
          <CardDescription className="text-[15px] leading-relaxed">
            {hasToken && !facebookGraphOptIn ? (
              <>
                กรุณากดเชื่อมต่อ Facebook ที่หน้า{" "}
                <Link
                  href="/dashboard"
                  className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                >
                  เชื่อมต่อ
                </Link>
              </>
            ) : (
              <>
                ต้องมี Access token และกดเชื่อมต่อที่หน้า{" "}
                <Link
                  href="/dashboard"
                  className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                >
                  เชื่อมต่อ
                </Link>
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <CardHeader className="border-b border-border/60 pb-4 dark:border-white/[0.06]">
          <CardTitle className="text-lg font-semibold text-foreground">
            การตั้งค่า (จำในเบราว์เซอร์นี้)
          </CardTitle>
          <CardDescription>
            ปรับช่วงออโต้รันและเวลาเริ่มต้นของแบบฟอร์ม — บันทึกทันทีเมื่อเปลี่ยนค่า
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sched_cfg_interval">
              ออโต้รันคิวทุกกี่วินาที (15–3600)
            </Label>
            <Input
              id="sched_cfg_interval"
              type="text"
              inputMode="numeric"
              value={intervalInputStr}
              onChange={(e) => setIntervalInputStr(e.target.value)}
              onBlur={() => {
                const n = Number.parseInt(intervalInputStr, 10);
                persistIntervalSec(Number.isFinite(n) ? n : autoRunIntervalSec);
              }}
              className="max-w-[12rem]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched_cfg_offset">
              เวลาในแบบฟอร์ม “โพสต์ครั้งถัดไป” เริ่มที่ +กี่นาที (1–10080)
            </Label>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                id="sched_cfg_offset"
                type="text"
                inputMode="numeric"
                value={offsetInputStr}
                onChange={(e) => setOffsetInputStr(e.target.value)}
                onBlur={() => {
                  const n = Number.parseInt(offsetInputStr, 10);
                  persistDefaultOffsetMin(
                    Number.isFinite(n) ? n : defaultOffsetMin,
                  );
                }}
                className="max-w-[12rem]"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={applyDefaultTimeToForm}
              >
                ใส่ในเวลาโพสต์
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <CardHeader className="space-y-3 border-b border-border/60 pb-5 dark:border-white/[0.06]">
          <CardTitle className="text-xl font-semibold text-foreground">
            ตั้งเวลาโพสต์ลงกลุ่ม
          </CardTitle>
          <CardDescription className="max-w-3xl text-[15px] leading-relaxed">
            สร้างคิวโพสต์ล่วงหน้า — ตอนถึงเวลาระบบจะใช้ token ที่{" "}
            <strong className="font-medium text-foreground/90">บันทึกไว้บนเซิร์ฟเวอร์</strong>{" "}
            (หน้าเชื่อมต่อ) ในการโพสต์
            {profile ? ` · ${profile.name}` : null}
          </CardDescription>
          <p className="text-xs leading-relaxed text-amber-700/90 dark:text-amber-400/90">
            หมายเหตุ: การรันคิวอัตโนมัติทำงานขณะเปิดหน้านี้ (หรือกดรันด้วยตนเอง)
            — ถ้าปิดเบราว์เซอร์ ต้องใช้งาน scheduler ภายนอกหรือเปิดหน้านี้ค้างไว้
          </p>
        </CardHeader>
        <CardContent className="space-y-8 pt-6 sm:pt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={runLoading}
              onClick={() => void runDueQueue()}
            >
              {runLoading ? "กำลังรันคิว…" : "รันคิวที่ถึงเวลาแล้ว"}
            </Button>
            <label
              htmlFor="fb-sched-auto-run"
              className="flex cursor-pointer items-center gap-3 text-sm text-foreground"
            >
              <CheckboxToggle
                id="fb-sched-auto-run"
                checked={autoRun}
                onCheckedChange={(on) => {
                  persistAutoRun(on);
                  if (on) void runDueQueue();
                }}
                disabled={runLoading}
                aria-label="ออโต้รันคิวขณะเปิดหน้านี้"
              />
              ออโต้รันคิว (ขณะเปิดหน้านี้) ทุก {clamp(autoRunIntervalSec, 15, 3600)}{" "}
              วินาที
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => void loadJobs()}
            >
              รีเฟรชรายการ
            </Button>
          </div>
          {runLog ? (
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
              {runLog}
            </pre>
          ) : null}

          {groupsLoading ? (
            <p className="text-sm text-muted-foreground">
              กำลังโหลดรายการกลุ่ม…
            </p>
          ) : null}
          {groupsError ? (
            <p
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {groupsError}
            </p>
          ) : null}
          {!groupsLoading && !groupsError && groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ไม่พบกลุ่ม — ตรวจสอบโทเคนที่หน้าเชื่อมต่อ
            </p>
          ) : null}

          <div className="space-y-3 rounded-xl border border-border/90 bg-gradient-to-b from-muted/30 to-muted/10 p-4 shadow-sm dark:border-white/[0.08] dark:from-white/[0.04] dark:to-transparent dark:shadow-none">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label className="text-base font-semibold text-foreground">
                  กลุ่มปลายทาง
                </Label>
                <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                  ติ๊กเลือกหนึ่งกลุ่มหรือหลายกลุ่ม — จะสร้างคิวแยกต่อกลุ่ม
                  (ข้อความ/เวลา/รูปเดียวกัน)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={postableGroupList.length === 0}
                  onClick={() => {
                    setScheduleSelectedByGroupId((prev) => {
                      const next = { ...prev };
                      for (const g of postableGroupList) {
                        next[g.id] = true;
                      }
                      return next;
                    });
                  }}
                >
                  เลือกทั้งหมด
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={postableGroupList.length === 0}
                  onClick={() => {
                    setScheduleSelectedByGroupId((prev) => {
                      const next = { ...prev };
                      for (const g of postableGroupList) {
                        next[g.id] = false;
                      }
                      return next;
                    });
                  }}
                >
                  ยกเลิกทั้งหมด
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              เลือกแล้ว {scheduleSelectedTargetIds.length} กลุ่ม
            </p>
            {postableGroupList.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="fb_sched_group_search" className="text-sm">
                  ค้นหากลุ่ม
                </Label>
                <Input
                  id="fb_sched_group_search"
                  type="search"
                  value={scheduleGroupSearch}
                  onChange={(e) => setScheduleGroupSearch(e.target.value)}
                  placeholder="ชื่อกลุ่ม, รหัสกลุ่ม, หรือความเป็นส่วนตัว (privacy)…"
                  className="text-sm"
                  autoComplete="off"
                />
                {scheduleGroupSearch.trim() ? (
                  <p className="text-[11px] text-muted-foreground">
                    แสดง {postableGroupsForScheduleList.length} /{" "}
                    {postableGroupList.length} กลุ่ม
                  </p>
                ) : null}
              </div>
            ) : null}
            <ul className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-background/50 p-3 dark:border-white/10 dark:bg-[#141416]/50">
              {postableGroupList.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  ไม่มีกลุ่ม — โหลดกลุ่มใหม่ที่หน้าเชื่อมต่อหรือตรวจสอบ token
                </li>
              ) : postableGroupsForScheduleList.length === 0 ? (
                <li className="text-sm text-amber-800 dark:text-amber-200/90">
                  ไม่พบกลุ่มที่ตรงกับคำค้น &quot;{scheduleGroupSearch.trim()}
                  &quot; — ลองค้นหาคำอื่น
                </li>
              ) : (
                postableGroupsForScheduleList.map((g) => (
                  <li key={g.id}>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <CheckboxToggle
                        id={`fb-sched-group-${g.id}`}
                        size="sm"
                        className="mt-0.5"
                        checked={scheduleSelectedByGroupId[g.id] ?? false}
                        onCheckedChange={(on) =>
                          setScheduleSelectedByGroupId((prev) => ({
                            ...prev,
                            [g.id]: on,
                          }))
                        }
                        aria-label={`เลือกกลุ่ม ${g.name}`}
                      />
                      <span className="min-w-0 pt-0.5">
                        <span className="font-medium">{g.name}</span>
                        <span className="text-muted-foreground"> · {g.id}</span>
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sched_msg">ข้อความ</Label>
            <Textarea
              id="sched_msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[88px] resize-y text-[15px]"
              placeholder="ข้อความโพสต์ (ว่างได้ถ้ามีรูป)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sched_img">รูป (ไม่บังคับ)</Label>
            <FilePicker
              id="sched_img"
              accept="image/*"
              value={image}
              onChange={setImage}
            />
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="mt-2 max-h-36 rounded-md border object-contain"
              />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sched_time">เวลาโพสต์</Label>
              <Input
                id="sched_time"
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className="text-[15px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyPreset("m5")}
                >
                  +5 นาที
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyPreset("h1")}
                >
                  +1 ชม.
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyPreset("tomorrow9")}
                >
                  พรุ่งนี้ 9:00
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyDefaultTimeToForm}
                  title="ใช้ค่า +นาทีจากการตั้งค่าด้านบน"
                >
                  +{defaultOffsetMin} นาที (ตามการตั้งค่า)
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched_repeat">ความถี่</Label>
              <select
                id="sched_repeat"
                className={cn(
                  "flex h-11 w-full rounded-lg border border-input bg-background/80 px-3 text-sm dark:border-white/12 dark:bg-[#141416]/90",
                )}
                value={repeat}
                onChange={(e) =>
                  setRepeat(e.target.value as ApiJob["repeat"])
                }
              >
                <option value="none">ครั้งเดียว (เสร็จแล้วลบจากคิว)</option>
                <option value="daily">ทุกวัน (หลังโพสต์สำเร็จเลื่อน +1 วัน)</option>
                <option value="weekly">ทุกสัปดาห์ (+7 วัน)</option>
              </select>
            </div>
          </div>

          {submitErr ? (
            <p className="text-sm text-destructive" role="alert">
              {submitErr}
            </p>
          ) : null}
          {submitOk ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {submitOk}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={() => void handleAddJob()}
            disabled={
              submitLoading ||
              scheduleSelectedTargetIds.length === 0 ||
              (!message.trim() && !image)
            }
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            {submitLoading ? "กำลังเพิ่ม…" : "เพิ่มเข้าคิว"}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">คิวที่ตั้งไว้</CardTitle>
          <CardDescription>
            {jobsLoading
              ? "กำลังโหลด…"
              : `${jobs.length} รายการ · เรียงตามเวลาโพสต์`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {groupsLoading || groupsError ? (
            <p className="text-sm text-muted-foreground">
              {groupsError ?? "กำลังโหลดกลุ่ม…"}
            </p>
          ) : null}
          {jobsError ? (
            <p className="text-sm text-destructive">{jobsError}</p>
          ) : null}
          {!jobsLoading && jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีคิว</p>
          ) : null}
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-foreground">
                      {j.groupName ?? j.groupId}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {repeatLabel(j.repeat)}
                        {j.imageStoredName ? " · มีรูป" : ""}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      โพสต์: {formatThaiShort(j.scheduledAt)}
                      {!j.enabled ? " · หยุดชั่วคราว" : ""}
                    </p>
                    {j.message.trim() ? (
                      <p className="whitespace-pre-wrap text-[13px] text-foreground/90">
                        {j.message}
                      </p>
                    ) : null}
                    {j.lastError ? (
                      <p className="text-xs text-destructive">
                        ล่าสุด: {j.lastError}
                      </p>
                    ) : null}
                    {j.lastPostId ? (
                      <p className="text-xs text-muted-foreground">
                        post_id ล่าสุด: {j.lastPostId}
                      </p>
                    ) : null}
                    {j.imageStoredName ? (
                      <p className="text-[11px] text-muted-foreground">
                        แก้ไขรูป: ลบคิวนี้แล้วสร้างใหม่พร้อมแนบรูป
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        editingId === j.id ? cancelEditJob() : startEditJob(j)
                      }
                    >
                      {editingId === j.id ? "ยกเลิกแก้ไข" : "แก้ไข"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void toggleEnabled(j, !j.enabled)}
                    >
                      {j.enabled ? "ปิด" : "เปิด"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void removeJob(j.id)}
                    >
                      ลบ
                    </Button>
                  </div>
                </div>
                {editingId === j.id ? (
                  <div className="mt-4 space-y-3 border-t border-border/60 pt-4 dark:border-white/10">
                    <div className="space-y-2">
                      <Label htmlFor={`edit_grp_${j.id}`}>กลุ่ม</Label>
                      <select
                        id={`edit_grp_${j.id}`}
                        className="flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 text-sm dark:border-white/12 dark:bg-[#141416]/90"
                        value={editGroupId}
                        onChange={(e) => setEditGroupId(e.target.value)}
                      >
                        {editingId === j.id &&
                        editGroupId &&
                        !postableGroupList.some((g) => g.id === editGroupId) ? (
                          <option value={editGroupId}>
                            {j.groupName ?? editGroupId} (ไม่อยู่ในรายการติ๊กปัจจุบัน)
                          </option>
                        ) : null}
                        {postableGroupList.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edit_msg_${j.id}`}>ข้อความ</Label>
                      <Textarea
                        id={`edit_msg_${j.id}`}
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        className="min-h-[72px] text-[15px]"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`edit_time_${j.id}`}>เวลาโพสต์</Label>
                        <Input
                          id={`edit_time_${j.id}`}
                          type="datetime-local"
                          value={editTimeLocal}
                          onChange={(e) => setEditTimeLocal(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit_rep_${j.id}`}>ความถี่</Label>
                        <select
                          id={`edit_rep_${j.id}`}
                          className="flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 text-sm dark:border-white/12 dark:bg-[#141416]/90"
                          value={editRepeat}
                          onChange={(e) =>
                            setEditRepeat(e.target.value as ApiJob["repeat"])
                          }
                        >
                          <option value="none">ครั้งเดียว</option>
                          <option value="daily">ทุกวัน</option>
                          <option value="weekly">ทุกสัปดาห์</option>
                        </select>
                      </div>
                    </div>
                    {editErr ? (
                      <p className="text-xs text-destructive">{editErr}</p>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      disabled={editSaving}
                      onClick={() => void saveEditJob()}
                      className="bg-blue-600 text-white hover:bg-blue-500"
                    >
                      {editSaving ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
