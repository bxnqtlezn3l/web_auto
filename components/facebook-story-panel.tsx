"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilePicker } from "@/components/ui/file-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useFacebookTool } from "@/components/facebook-tool-provider";

function FontAttribution() {
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

type StoryMode = "video" | "text";
type Target = "page" | "profile";

export function FacebookStoryPanel() {
  const {
    facebookSettingsReady,
    facebookGraphOptIn,
    canUseFacebookPostUi,
    accessToken,
    cookie,
  } = useFacebookTool();

  const [target, setTarget] = React.useState<Target>("page");
  const [pageId, setPageId] = React.useState("");
  const [pageToken, setPageToken] = React.useState("");
  const [mode, setMode] = React.useState<StoryMode>("text");
  const [storyText, setStoryText] = React.useState("");
  const [profileVideoCaption, setProfileVideoCaption] = React.useState("");
  const [userTokenOverride, setUserTokenOverride] = React.useState("");
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [videoInputKey, setVideoInputKey] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorHint, setErrorHint] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (target === "profile" && mode === "text") {
      setMode("video");
    }
  }, [target, mode]);

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
        <FontAttribution />
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
              สตอรี่เพจ / วิดีโอโปรไฟล์
            </CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">
              {hasToken && !facebookGraphOptIn ? (
                <>
                  กรุณาเปิดเซสชัน Facebook ที่หน้า{" "}
                  <Link
                    href="/dashboard"
                    className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                  >
                    เชื่อมต่อ
                  </Link>
                </>
              ) : (
                <>
                  ตั้งค่า User access token ที่หน้า{" "}
                  <Link
                    href="/dashboard"
                    className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                  >
                    เชื่อมต่อ
                  </Link>{" "}
                  ก่อน — สตอรี่เพจต้องใช้ Page token เพิ่มในฟอร์ม; โปรไฟล์ส่วนตัวใช้ User
                  token จากหน้าเชื่อมต่อ
                </>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
        <FontAttribution />
      </>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorHint(null);
    setOk(null);

    if (target === "profile") {
      const token = userTokenOverride.trim() || accessToken.trim();
      if (!token) {
        setError("ไม่มี User access token — กรอกที่หน้าเชื่อมต่อหรือช่อง override ด้านล่าง");
        return;
      }
      if (!videoFile || videoFile.size < 1) {
        setError("เลือกไฟล์วิดีโอ .mp4");
        return;
      }

      const fd = new FormData();
      fd.set("access_token", token);
      if (cookie.trim()) {
        fd.set("cookie", cookie.trim());
      }
      fd.set("video", videoFile);
      const cap = profileVideoCaption.trim();
      if (cap) {
        fd.set("description", cap);
      }

      setLoading(true);
      try {
        const res = await fetch("/api/facebook/profile-video", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json()) as {
          error?: string;
          hint?: string;
          ok?: boolean;
          video_id?: string;
          note?: string;
          fb_code?: number;
        };
        if (!res.ok) {
          setError(data.error ?? "โพสต์วิดีโอไม่สำเร็จ");
          setErrorHint(
            typeof data.hint === "string" && data.hint.trim()
              ? data.hint.trim()
              : null,
          );
          return;
        }
        const parts: string[] = [];
        if (data.video_id) {
          parts.push(`video_id: ${data.video_id}`);
        }
        if (data.note) {
          parts.push(data.note);
        }
        setOk(parts.length > 0 ? `สำเร็จ · ${parts.join(" · ")}` : "สำเร็จ");
        setVideoFile(null);
        setVideoInputKey((k) => k + 1);
        setProfileVideoCaption("");
      } catch {
        setError("เครือข่ายผิดพลาด");
      } finally {
        setLoading(false);
      }
      return;
    }

    const pid = pageId.trim();
    const tok = pageToken.trim();
    if (!pid) {
      setError("กรุณากรอก Page ID");
      return;
    }
    if (!tok) {
      setError("กรุณากรอก Page access token");
      return;
    }

    const fd = new FormData();
    fd.set("page_id", pid);
    fd.set("page_access_token", tok);
    fd.set("story_mode", mode);

    if (mode === "text") {
      const t = storyText.trim();
      if (!t) {
        setError("กรุณากรอกข้อความ");
        return;
      }
      fd.set("story_text", t);
    } else {
      if (!videoFile || videoFile.size < 1) {
        setError("เลือกไฟล์วิดีโอ .mp4");
        return;
      }
      fd.set("video", videoFile);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/facebook/page-story", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        ok?: boolean;
        post_id?: string;
        video_id?: string;
        photo_id?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "โพสต์สตอรี่ไม่สำเร็จ");
        setErrorHint(
          typeof data.hint === "string" && data.hint.trim()
            ? data.hint.trim()
            : null,
        );
        return;
      }
      const parts: string[] = [];
      if (data.post_id) {
        parts.push(`post_id: ${data.post_id}`);
      }
      if (data.video_id) {
        parts.push(`video_id: ${data.video_id}`);
      }
      if (data.photo_id) {
        parts.push(`photo_id: ${data.photo_id}`);
      }
      setOk(parts.length > 0 ? `สำเร็จ · ${parts.join(" · ")}` : "สำเร็จ");
      if (mode === "text") {
        setStoryText("");
      } else {
        setVideoFile(null);
        setVideoInputKey((k) => k + 1);
      }
    } catch {
      setError("เครือข่ายผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  const needsVideo =
    target === "profile" || (target === "page" && mode === "video");

  return (
    <>
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <CardHeader className="space-y-3 border-b border-border/60 pb-5 dark:border-white/[0.06]">
          <CardTitle className="text-xl font-semibold text-foreground">
            สตอรี่เพจ &amp; วิดีโอโปรไฟล์
          </CardTitle>
          <CardDescription className="max-w-3xl text-[15px] leading-relaxed">
            <strong className="font-medium text-foreground">เพจ:</strong>{" "}
            <a
              className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
              href="https://developers.facebook.com/docs/page-stories-api/"
              target="_blank"
              rel="noreferrer"
            >
              Page Stories API
            </a>{" "}
            (วิดีโอ/ข้อความเป็นรูป) ต้องใช้ Page ID + Page token —{" "}
            <strong className="font-medium text-foreground">โปรไฟล์ส่วนตัว:</strong>{" "}
            Meta{" "}
            <strong className="font-medium text-foreground">
              ไม่ให้แอปโพสต์ “สตอรี่วง” 24 ชม.
            </strong>{" "}
            ของบัญชีคน — โหมดโปรไฟล์จะอัปโหลดวิดีโอเป็น{" "}
            <strong className="font-medium text-foreground">
              โพสต์วิดีโอบน Timeline
            </strong>{" "}
            ผ่าน{" "}
            <span className="font-mono text-[13px]">POST /me/videos</span>{" "}
            (User token) ข้อความล้วนบนโปรไฟล์ไม่รองรับใน Graph — ใช้โหมดเพจหรือโพสต์ข้อความลงกลุ่มแทน
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 sm:pt-8">
          <form className="mx-auto max-w-xl space-y-6" onSubmit={handleSubmit}>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                โพสต์ไปที่
              </legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="story_target"
                    checked={target === "page"}
                    onChange={() => setTarget("page")}
                    className="h-4 w-4 accent-primary"
                  />
                  เพจ Facebook (สตอรี่เพจ)
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="story_target"
                    checked={target === "profile"}
                    onChange={() => setTarget("profile")}
                    className="h-4 w-4 accent-primary"
                  />
                  โปรไฟล์ส่วนตัว (วิดีโอ → Timeline)
                </label>
              </div>
            </fieldset>

            {target === "profile" ? (
              <>
                <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <Label htmlFor="story_video_profile" className="text-base font-semibold">
                    1) เลือกไฟล์วิดีโอ (.mp4) — จำเป็น
                  </Label>
                  <FilePicker
                    inputKey={videoInputKey}
                    id="story_video_profile"
                    accept="video/mp4,.mp4"
                    value={videoFile}
                    onChange={setVideoFile}
                  />
                  <p className="text-sm text-muted-foreground">
                    ไม่เกิน 100 MB จากนั้นเลื่อนลงไปกดปุ่มสีม่วง{" "}
                    <strong className="font-medium text-foreground">
                      โพสต์วิดีโอลงโปรไฟล์
                    </strong>{" "}
                    ด้านล่างสุดของฟอร์ม
                  </p>
                </div>
                <div className="space-y-4 rounded-lg border border-amber-500/35 bg-amber-500/5 px-3 py-3 text-sm text-foreground dark:border-amber-400/30 dark:bg-amber-500/10">
                  <p className="leading-relaxed">
                    <span className="font-semibold">2) Token &amp; คำบรรยาย</span>{" "}
                    — ผลลัพธ์เป็นโพสต์วิดีโอบนโปรไฟล์คุณ ไม่ใช่แถบสตอรี่ด้านบน
                    ต้องใช้{" "}
                    <strong className="font-medium">User access token</strong>{" "}
                    ที่แอปได้รับอนุญาตให้โพสต์วิดีโอ
                    (หลายแอปถูกจำกัด — ถ้าโดนปฏิเสธให้ตรวจสิทธิ์ใน Meta for Developers)
                    หากขึ้น{" "}
                    <span className="font-mono">code 368</span> แปลว่า Facebook
                    ขอให้ยืนยันความปลอดภัยหรือจำกัดการกระทำ — ต้องแก้ที่บัญชีในเบราว์เซอร์ก่อน
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="profile_user_token">
                      User access token (ไม่บังคับถ้าใช้จากหน้าเชื่อมต่อ)
                    </Label>
                    <Input
                      id="profile_user_token"
                      type="password"
                      placeholder={
                        accessToken.trim()
                          ? "ว่างได้ — ใช้ token จากหน้าเชื่อมต่อ"
                          : "วาง User access token"
                      }
                      value={userTokenOverride}
                      onChange={(e) => setUserTokenOverride(e.target.value)}
                      className="font-mono text-[13px]"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile_video_caption">
                      คำบรรยายใต้วิดีโอ (ไม่บังคับ)
                    </Label>
                    <Textarea
                      id="profile_video_caption"
                      placeholder="ข้อความที่จะแสดงคู่กับโพสต์วิดีโอบนโปรไฟล์…"
                      value={profileVideoCaption}
                      onChange={(e) => setProfileVideoCaption(e.target.value)}
                      className="min-h-[88px] resize-y text-[15px] leading-relaxed"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="story_page_id">Page ID</Label>
                  <Input
                    id="story_page_id"
                    placeholder="เลข ID ของเพจ"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    className="font-mono text-[15px]"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story_page_token">Page access token</Label>
                  <Input
                    id="story_page_token"
                    type="password"
                    placeholder="Page token จาก Meta for Developers / Graph API"
                    value={pageToken}
                    onChange={(e) => setPageToken(e.target.value)}
                    className="font-mono text-[13px]"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    <a
                      className="underline underline-offset-2 hover:text-foreground"
                      href="https://developers.facebook.com/docs/pages/access-tokens"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Page access tokens
                    </a>
                  </p>
                </div>
              </>
            )}

            {target === "page" ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">
                  ประเภทสตอรี่ (เพจ)
                </legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="story_mode"
                      checked={mode === "text"}
                      onChange={() => setMode("text")}
                      className="h-4 w-4 accent-primary"
                    />
                    ข้อความ (สร้างรูป 9:16 อัตโนมัติ)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="story_mode"
                      checked={mode === "video"}
                      onChange={() => setMode("video")}
                      className="h-4 w-4 accent-primary"
                    />
                    วิดีโอ (.mp4)
                  </label>
                </div>
              </fieldset>
            ) : null}

            {target === "page" && mode === "text" ? (
              <div className="space-y-2">
                <Label htmlFor="story_text_body">ข้อความในสตอรี่</Label>
                <Textarea
                  id="story_text_body"
                  placeholder="พิมพ์ข้อความ…"
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  className="min-h-[140px] resize-y text-[15px] leading-relaxed"
                />
              </div>
            ) : target === "page" ? (
              <div className="space-y-2">
                <Label htmlFor="story_video">ไฟล์วิดีโอ (.mp4)</Label>
                <FilePicker
                  inputKey={videoInputKey}
                  id="story_video"
                  accept="video/mp4,.mp4"
                  value={videoFile}
                  onChange={setVideoFile}
                />
                <p className="text-xs text-muted-foreground">
                  ขนาดไม่เกิน 100 MB — เพจ: แนะนำ 9:16 ตามคู่มือสตอรี่ — เลือกไฟล์แล้วกดปุ่มโพสต์ด้านล่าง
                </p>
              </div>
            ) : null}

            {error ? (
              <div
                className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                <p>{error}</p>
                {errorHint ? (
                  <p className="whitespace-pre-line border-t border-destructive/20 pt-2 text-xs leading-relaxed text-destructive/90">
                    {errorHint}
                  </p>
                ) : null}
              </div>
            ) : null}
            {ok ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground dark:bg-white/[0.06]">
                {ok}
              </p>
            ) : null}

            {needsVideo && !videoFile ? (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-100">
                ยังไม่ได้เลือกไฟล์วิดีโอ — กด{" "}
                <strong className="font-semibold">เลือกไฟล์</strong> ด้านบน
                แล้วค่อยกดปุ่มโพสต์ (ถ้ากดโพสต์ก่อนเลือกไฟล์ ระบบจะแจ้งเตือน)
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="h-auto min-h-[52px] w-full border-violet-500/40 bg-violet-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 disabled:opacity-60 dark:shadow-violet-600/25"
            >
              {loading
                ? target === "profile"
                  ? "กำลังอัปโหลดวิดีโอ…"
                  : "กำลังโพสต์สตอรี่…"
                : target === "profile"
                  ? "โพสต์วิดีโอลงโปรไฟล์ (Post)"
                  : mode === "text"
                    ? "โพสต์สตอรี่เพจ (ข้อความ)"
                    : "โพสต์สตอรี่เพจ (วิดีโอ)"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <FontAttribution />
    </>
  );
}
