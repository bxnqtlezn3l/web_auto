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
import { appendKeywordsToMessage } from "@/lib/post-message-keywords";

function DashboardFontAttribution() {
  return (
    <p className="mt-10 text-center text-xs text-muted-foreground">
      ฟอนต์{" "}
      <a
        className="underline decoration-border underline-offset-4 hover:text-foreground"
        href="https://fonts.google.com/specimen/IBM+Plex+Sans+Thai"
        target="_blank"
        rel="noreferrer"
      >
        IBM Plex Sans Thai
      </a>
    </p>
  );
}

function sleep(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}

type QuotaInfo = {
  max_posts_per_day: number | null;
  used_today: number;
  remaining: number | null;
};

export function FacebookPostPanel({
  showFontAttribution = true,
}: {
  showFontAttribution?: boolean;
} = {}) {
  const {
    profile,
    accessToken,
    cookie,
    facebookSettingsReady,
    facebookGraphOptIn,
    canUseFacebookPostUi,
    groups,
    groupsLoading,
    groupsError,
    postMessage,
    setPostMessage,
    postImage,
    setPostImage,
    postPreviewUrl,
    postableGroupList,
  } = useFacebookTool();

  const [quota, setQuota] = React.useState<QuotaInfo | null>(null);
  const [quotaLoading, setQuotaLoading] = React.useState(false);
  const [maxPostsDraft, setMaxPostsDraft] = React.useState("");
  const [quotaSaveOk, setQuotaSaveOk] = React.useState(false);

  const [selectedByGroupId, setSelectedByGroupId] = React.useState<
    Record<string, boolean>
  >({});
  const [messageMode, setMessageMode] = React.useState<"same" | "perGroup">(
    "same",
  );
  const [sharedKeywords, setSharedKeywords] = React.useState("");
  const [perGroupFields, setPerGroupFields] = React.useState<
    Record<string, { body: string; kw: string }>
  >({});

  const [localLoading, setLocalLoading] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [localHint, setLocalHint] = React.useState<string | null>(null);
  const [localOk, setLocalOk] = React.useState<string | null>(null);

  const refreshQuota = React.useCallback(async () => {
    setQuotaLoading(true);
    try {
      const res = await fetch("/api/user/group-post-settings");
      const data = (await res.json()) as QuotaInfo & { error?: string };
      if (res.ok) {
        setQuota({
          max_posts_per_day: data.max_posts_per_day ?? null,
          used_today: data.used_today ?? 0,
          remaining: data.remaining ?? null,
        });
        setMaxPostsDraft(
          data.max_posts_per_day != null && data.max_posts_per_day > 0
            ? String(data.max_posts_per_day)
            : "",
        );
      } else {
        setQuota(null);
      }
    } catch {
      setQuota(null);
    } finally {
      setQuotaLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  React.useEffect(() => {
    setSelectedByGroupId((prev) => {
      const next: Record<string, boolean> = {};
      for (const g of postableGroupList) {
        next[g.id] = prev[g.id] ?? false;
      }
      return next;
    });
  }, [postableGroupList]);

  React.useEffect(() => {
    setPerGroupFields((prev) => {
      const next = { ...prev };
      for (const g of postableGroupList) {
        if (!(g.id in next)) {
          next[g.id] = { body: "", kw: "" };
        }
      }
      return next;
    });
  }, [postableGroupList]);

  const selectedTargetIds = React.useMemo(
    () => postableGroupList.filter((g) => selectedByGroupId[g.id]).map((g) => g.id),
    [postableGroupList, selectedByGroupId],
  );

  const saveQuotaSettings = React.useCallback(async () => {
    setQuotaSaveOk(false);
    const raw = maxPostsDraft.trim();
    let max_posts_per_day: number | null;
    if (raw === "") {
      max_posts_per_day = null;
    } else {
      const n = Number.parseInt(raw, 10);
      max_posts_per_day =
        Number.isFinite(n) && n > 0 ? Math.min(n, 100_000) : null;
    }
    try {
      const res = await fetch("/api/user/group-post-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_posts_per_day }),
      });
      if (res.ok) {
        setQuotaSaveOk(true);
        window.setTimeout(() => setQuotaSaveOk(false), 2000);
        await refreshQuota();
      }
    } catch {
      /* ignore */
    }
  }, [maxPostsDraft, refreshQuota]);

  const submitOne = React.useCallback(
    async (groupId: string, message: string) => {
      const fd = new FormData();
      fd.set("group_id", groupId);
      fd.set("message", message);
      if (postImage) {
        fd.set("image", postImage);
      }
      const res = await fetch("/api/facebook/post", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        ok?: boolean;
        post_id?: string;
        id?: string;
        quota?: { limit: number; used: number };
      };
      return { res, data };
    },
    [postImage],
  );

  const handleSubmitPostFixed = React.useCallback(async () => {
    setLocalError(null);
    setLocalHint(null);
    setLocalOk(null);

    const targets = selectedTargetIds;

    if (targets.length === 0) {
      setLocalError("เลือกอย่างน้อยหนึ่งกลุ่มปลายทางจากรายการติ๊ก");
      return;
    }

    const buildMessageForGroup = (gid: string): string => {
      if (messageMode === "same") {
        return appendKeywordsToMessage(postMessage, sharedKeywords);
      }
      const row = perGroupFields[gid] ?? { body: "", kw: "" };
      return appendKeywordsToMessage(row.body, row.kw);
    };

    for (const gid of targets) {
      const msg = buildMessageForGroup(gid);
      if (!msg.trim() && !postImage) {
        setLocalError(
          messageMode === "same"
            ? "กรุณากรอกข้อความ/keyword หรือแนบรูป"
            : `ทุกกลุ่มที่เลือกต้องมีข้อความหรือ keyword (หรือแนบรูปร่วม)`,
        );
        return;
      }
    }

    try {
      const qr = await fetch("/api/user/group-post-settings");
      const qd = (await qr.json()) as QuotaInfo;
      if (
        qr.ok &&
        qd.remaining != null &&
        qd.remaining < targets.length
      ) {
        setLocalError(
          `โควต้าวันนี้เหลือ ${qd.remaining} โพสต์ แต่จะโพสต์ ${targets.length} กลุ่ม — ลดจำนวนกลุ่มหรือเพิ่มโควต้า`,
        );
        return;
      }
    } catch {
      /* ignore */
    }

    setLocalLoading(true);
    const lines: string[] = [];
    let stopped = false;

    try {
      for (let i = 0; i < targets.length; i++) {
        const gid = targets[i]!;
        const msg = buildMessageForGroup(gid);
        const gname =
          postableGroupList.find((g) => g.id === gid)?.name ?? gid;
        const { res, data } = await submitOne(gid, msg);
        if (!res.ok) {
          if (res.status === 429) {
            setLocalError(
              data.error ??
                `เกินโควต้าโพสต์ต่อวัน (${data.quota?.used ?? "?"}/${data.quota?.limit ?? "?"})`,
            );
            if (typeof data.hint === "string") setLocalHint(data.hint);
            lines.push(`· ${gname}: หยุด — โควต้าเต็ม`);
            stopped = true;
            break;
          }
          setLocalError(data.error ?? "โพสต์ไม่สำเร็จ");
          if (typeof data.hint === "string") setLocalHint(data.hint);
          lines.push(`· ${gname}: ล้มเหลว`);
          stopped = true;
          break;
        }
        const pid = data.post_id || data.id || "";
        lines.push(`· ${gname}: สำเร็จ${pid ? ` (${pid})` : ""}`);
        if (i < targets.length - 1) {
          await sleep(2000);
        }
      }

      if (!stopped && lines.length > 0) {
        setLocalOk(lines.join("\n"));
        setPostMessage("");
        setSharedKeywords("");
        setPerGroupFields((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(next)) {
            next[id] = { body: "", kw: "" };
          }
          return next;
        });
        setPostImage(null);
      }
      await refreshQuota();
    } catch {
      setLocalError("เครือข่ายผิดพลาด");
    } finally {
      setLocalLoading(false);
    }
  }, [
    selectedTargetIds,
    messageMode,
    postMessage,
    sharedKeywords,
    perGroupFields,
    postImage,
    postableGroupList,
    submitOne,
    setPostMessage,
    setPostImage,
    refreshQuota,
  ]);

  if (!facebookSettingsReady) {
    return (
      <>
        <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <CardContent className="py-10">
            <p className="text-center text-sm text-muted-foreground">
              กำลังตรวจสอบการเชื่อมต่อ Facebook…
            </p>
          </CardContent>
        </Card>
        {showFontAttribution ? <DashboardFontAttribution /> : null}
      </>
    );
  }

  if (!canUseFacebookPostUi) {
    const hasToken = Boolean(accessToken.trim());
    return (
      <>
        <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              โพสต์ลงกลุ่ม
            </CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              {hasToken && !facebookGraphOptIn ? (
                <>
                  คุณออกจากเซสชัน Facebook แล้ว — ไปหน้า{" "}
                  <Link
                    href="/dashboard"
                    className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                  >
                    เชื่อมต่อ
                  </Link>{" "}
                  แล้วกด &quot;เชื่อมต่อ Facebook&quot; อีกครั้งเพื่อโหลดกลุ่มและโพสต์
                </>
              ) : (
                <>
                  กรุณาตั้งค่าและใส่ Access token ที่หน้า{" "}
                  <Link
                    href="/dashboard"
                    className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                  >
                    เชื่อมต่อ
                  </Link>{" "}
                  ก่อน จึงจะโหลดกลุ่มและโพสต์ได้
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">ไปหน้าเชื่อมต่อ</Link>
            </Button>
          </CardContent>
        </Card>
        {showFontAttribution ? <DashboardFontAttribution /> : null}
      </>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <CardHeader className="space-y-3 border-b border-border/60 pb-5 dark:border-white/[0.06]">
          <CardTitle className="text-xl font-semibold text-foreground">
            โพสต์ลงกลุ่ม
          </CardTitle>
          <CardDescription className="max-w-3xl text-[15px] leading-relaxed">
            เลือกปลายทางด้วย Checkbox (หนึ่งหรือหลายกลุ่ม) จากรายการที่ติ๊กไว้ที่หน้าเชื่อมต่อ — จำกัดโควต้าต่อวันได้
            {profile ? ` · ${profile.name}` : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6 sm:pt-8">
          <div className="rounded-xl border border-border/90 bg-muted/20 p-4 dark:border-white/[0.08]">
            <h3 className="text-sm font-semibold text-foreground">
              จำกัดโพสต์ต่อวัน (บัญชีแอปนี้ · นับตามเวลา UTC)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              ว่าง = ไม่จำกัด · นับเฉพาะเมื่อตั้งตัวเลข · ใช้ได้เมื่อล็อกอินเว็บแล้ว
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="max_posts_day">สูงสุดกี่โพสต์ / วัน</Label>
                <Input
                  id="max_posts_day"
                  type="text"
                  inputMode="numeric"
                  placeholder="ไม่จำกัด"
                  value={maxPostsDraft}
                  onChange={(e) => setMaxPostsDraft(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => void saveQuotaSettings()}>
                บันทึกการตั้งค่า
              </Button>
              {quotaSaveOk ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  บันทึกแล้ว
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {quotaLoading
                ? "กำลังโหลดสถานะโควต้า…"
                : quota
                  ? quota.max_posts_per_day == null
                    ? "ไม่จำกัดจำนวนโพสต์ต่อวัน (ระบบไม่นับโควต้า)"
                    : `วันนี้โพสต์แล้ว ${quota.used_today} / ${quota.max_posts_per_day} เหลือ ${quota.remaining ?? 0}`
                  : "ไม่มีข้อมูลโควต้า"}
            </p>
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            สร้างโพสต์ลงกลุ่ม
          </h2>
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


          <div className="space-y-6">
            <div className="space-y-3 rounded-xl border border-border/90 bg-gradient-to-b from-muted/30 to-muted/10 p-4 shadow-sm dark:border-white/[0.08] dark:from-white/[0.04] dark:to-transparent dark:shadow-none">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label className="text-base font-semibold text-foreground">
                    กลุ่มปลายทาง
                  </Label>
                  <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                    ติ๊กเลือกหนึ่งกลุ่มหรือหลายกลุ่ม — โพสต์จะส่งไปทุกกลุ่มที่เลือก
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={postableGroupList.length === 0}
                    onClick={() => {
                      setSelectedByGroupId((prev) => {
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
                      setSelectedByGroupId((prev) => {
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
                เลือกแล้ว {selectedTargetIds.length} กลุ่ม
              </p>
              <ul className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-background/50 p-3 dark:border-white/10 dark:bg-[#141416]/50">
                {postableGroupList.length === 0 ? (
                  <li className="text-sm text-muted-foreground">
                    ไม่มีกลุ่ม — โหลดกลุ่มใหม่ที่หน้าเชื่อมต่อหรือตรวจสอบ token
                  </li>
                ) : (
                  postableGroupList.map((g) => (
                    <li key={g.id}>
                      <label className="flex cursor-pointer items-start gap-3 text-sm">
                        <CheckboxToggle
                          id={`fb-post-group-${g.id}`}
                          size="sm"
                          className="mt-0.5"
                          checked={selectedByGroupId[g.id] ?? false}
                          onCheckedChange={(on) =>
                            setSelectedByGroupId((prev) => ({
                              ...prev,
                              [g.id]: on,
                            }))
                          }
                          aria-label={`เลือกกลุ่ม ${g.name}`}
                        />
                        <span className="min-w-0 pt-0.5">
                          <span className="font-medium">{g.name}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {g.id}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-4 dark:border-white/10">
              <p className="text-sm font-medium text-foreground">รูปแบบข้อความ</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="msg_mode"
                    checked={messageMode === "same"}
                    onChange={() => setMessageMode("same")}
                  />
                  ข้อความเดียวกันทุกกลุ่ม (+ keyword ร่วม)
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="msg_mode"
                    checked={messageMode === "perGroup"}
                    onChange={() => setMessageMode("perGroup")}
                  />
                  ข้อความ / keyword แยกต่อกลุ่ม
                </label>
              </div>
            </div>

            {messageMode === "same" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="post_message">ข้อความหลัก</Label>
                  <Textarea
                    id="post_message"
                    placeholder="พิมพ์ข้อความ…"
                    value={postMessage}
                    onChange={(e) => setPostMessage(e.target.value)}
                    className="min-h-[88px] resize-y text-[15px] leading-relaxed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post_kw_shared">
                    Keyword / แฮชแท็ก (คั่นด้วยคอมม่าหรือขึ้นบรรทัด — ต่อท้ายโพสต์อัตโนมัติ)
                  </Label>
                  <Textarea
                    id="post_kw_shared"
                    placeholder="เช่น โปรโมชัน, #sale, ลดราคา"
                    value={sharedKeywords}
                    onChange={(e) => setSharedKeywords(e.target.value)}
                    className="min-h-[60px] resize-y text-sm"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  กรอกข้อความและ keyword แยกแต่ละกลุ่ม — รูปเดียวกันจะถูกใช้ทุกกลุ่มถ้ามีการแนบรูป
                </p>
                <div className="max-h-80 space-y-4 overflow-y-auto pr-2">
                  {postableGroupList.filter((g) => selectedByGroupId[g.id])
                    .length === 0 ? (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      ติ๊กเลือกกลุ่มปลายทางอย่างน้อยหนึ่งกลุ่มด้านบน
                    </p>
                  ) : null}
                  {postableGroupList
                    .filter((g) => selectedByGroupId[g.id])
                    .map((g) => (
                    <div
                      key={g.id}
                      className="rounded-lg border border-border/80 bg-muted/10 p-3 dark:border-white/10"
                    >
                      <p className="mb-2 text-sm font-medium">{g.name}</p>
                      <Textarea
                        placeholder="ข้อความในกลุ่มนี้…"
                        value={perGroupFields[g.id]?.body ?? ""}
                        onChange={(e) =>
                          setPerGroupFields((prev) => ({
                            ...prev,
                            [g.id]: {
                              body: e.target.value,
                              kw: prev[g.id]?.kw ?? "",
                            },
                          }))
                        }
                        className="mb-2 min-h-[64px] text-sm"
                      />
                      <Input
                        placeholder="keyword กลุ่มนี้ (คั่นด้วยคอมม่า)"
                        value={perGroupFields[g.id]?.kw ?? ""}
                        onChange={(e) =>
                          setPerGroupFields((prev) => ({
                            ...prev,
                            [g.id]: {
                              body: prev[g.id]?.body ?? "",
                              kw: e.target.value,
                            },
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="post_image">รูปภาพ (ไม่บังคับ · ใช้ร่วมทุกกลุ่มในครั้งนี้)</Label>
              <FilePicker
                id="post_image"
                accept="image/*"
                value={postImage}
                onChange={setPostImage}
              />
              <p className="text-xs text-muted-foreground">
                สูงสุดประมาณ 12 MB
              </p>
              {postPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={postPreviewUrl}
                  alt="ตัวอย่างรูปที่จะโพสต์"
                  className="mt-2 max-h-40 rounded-md border border-border object-contain"
                />
              ) : null}
            </div>

            {localError ? (
              <div
                className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                <p>{localError}</p>
                {localHint ? (
                  <p className="whitespace-pre-line border-t border-destructive/20 pt-2 text-xs leading-relaxed text-destructive/90">
                    {localHint}
                  </p>
                ) : null}
              </div>
            ) : null}
            {localOk ? (
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                {localOk}
              </pre>
            ) : null}

            <Button
              type="button"
              onClick={() => void handleSubmitPostFixed()}
              disabled={localLoading || selectedTargetIds.length === 0}
              className="bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 dark:shadow-blue-600/25"
            >
              {localLoading
                ? "กำลังโพสต์…"
                : selectedTargetIds.length === 0
                  ? "โพสต์ลงกลุ่ม"
                  : `โพสต์ ${selectedTargetIds.length} กลุ่ม`}
            </Button>
          </div>
        </CardContent>
      </Card>
      {showFontAttribution ? <DashboardFontAttribution /> : null}
    </>
  );
}
