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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxToggle } from "@/components/ui/checkbox-toggle";
import { useFacebookTool } from "@/components/facebook-tool-provider";
import { MAX_FACEBOOK_ACCOUNTS_PER_USER } from "@/lib/max-facebook-accounts";

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

export function FacebookSettingsPanel() {
  const {
    cookie,
    setCookie,
    accessToken,
    setAccessToken,
    saved,
    saveLoading,
    settingsLoadError,
    profile,
    loginLoading,
    loginError,
    profileActive,
    handleSave,
    handleClear,
    handleLogout,
    handleFacebookConnect,
    facebookSettingsReady,
    facebookAccounts,
    activeFacebookAccountId,
    switchFacebookAccount,
    createFacebookAccount,
    deleteFacebookAccount,
    renameFacebookAccount,
    setAccountConnection,
  } = useFacebookTool();

  const [credentialEditorOpen, setCredentialEditorOpen] = React.useState(false);
  const [addAccountOpen, setAddAccountOpen] = React.useState(false);
  /** แยกจาก cookie/accessToken ของบัญชีที่ใช้งาน — ไม่โชว์ token เก่าในฟอร์มเพิ่มบัญชี */
  const [addAccountCookie, setAddAccountCookie] = React.useState("");
  const [addAccountToken, setAddAccountToken] = React.useState("");
  const [accountActionLoading, setAccountActionLoading] = React.useState(false);
  const [addAccountErr, setAddAccountErr] = React.useState<string | null>(null);
  const [connectionMsg, setConnectionMsg] = React.useState<string | null>(
    null,
  );

  const connectedAccounts = React.useMemo(
    () => facebookAccounts.filter((a) => a.isConnected),
    [facebookAccounts],
  );
  const connectedCount = connectedAccounts.length;

  const hasStoredCredentials = Boolean(
    cookie.trim() || accessToken.trim(),
  );
  const useCompactCredentialUi =
    facebookSettingsReady &&
    hasStoredCredentials &&
    !credentialEditorOpen;

  React.useEffect(() => {
    if (!facebookSettingsReady) return;
    if (!cookie.trim() && !accessToken.trim()) {
      setCredentialEditorOpen(true);
    }
  }, [facebookSettingsReady, cookie, accessToken]);

  React.useEffect(() => {
    if (saved) setCredentialEditorOpen(false);
  }, [saved]);

  return (
    <>
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-none backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0c0c0e]/85 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <CardHeader className="space-y-3 border-b border-border/60 pb-5 dark:border-white/[0.06]">
          <CardTitle className="text-xl font-semibold text-foreground">
            {profileActive ? "บัญชี Facebook" : "การตั้งค่า Facebook"}
          </CardTitle>
          <CardDescription className="max-w-3xl text-[15px] leading-relaxed">
            {profileActive
              ? "จัดการบัญชีและ credential — เลือกกลุ่มและโพสต์ได้ที่เมนู “โพสต์ & ตั้งเวลา”"
              : useCompactCredentialUi
                ? "Cookie และ Access token เก็บในบัญชีแล้ว — กดเชื่อมต่อเพื่อโหลดโปรไฟล์และกลุ่ม หรือเปิดแก้ไขเมื่อ token เปลี่ยน"
                : "กรอก Cookie และ Access token ครั้งแรก แล้วกดบันทึกลงบัญชี — ครั้งถัดไปไม่ต้องกรอกซ้ำ (แก้ไขได้เมื่อจำเป็น)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6 sm:pt-8">
          {facebookSettingsReady ? (
            <div className="rounded-xl border border-border/90 bg-muted/15 p-4 dark:border-white/[0.08]">
              <h3 className="text-sm font-semibold text-foreground">
                สลับบัญชี Facebook
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                เพิ่มได้ 1–{MAX_FACEBOOK_ACCOUNTS_PER_USER} บัญชี — ติ๊ก
                <strong className="font-medium text-foreground/90"> เชื่อมต่อแอป</strong>{" "}
                กี่บัญชีก็ได้ (ต้องมีเชื่อมต่ออย่างน้อย 1) — คิวโพสต์ใช้ token
                ของ
                <strong className="font-medium text-foreground/90"> บัญชีที่กำลังใช้งาน</strong>{" "}
                ข้างล่าง
              </p>
              {connectionMsg ? (
                <p
                  className="mt-2 text-xs text-destructive"
                  role="status"
                >
                  {connectionMsg}
                </p>
              ) : null}
              {facebookAccounts.length > 0 ? (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    เชื่อมต่อแอปแล้ว {connectedCount} /{" "}
                    {MAX_FACEBOOK_ACCOUNTS_PER_USER} บัญชี (รวมบันทึก{" "}
                    {facebookAccounts.length} รายการ)
                  </p>
                  <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-2 dark:border-white/10">
                    {facebookAccounts.map((a) => {
                      const isActive = activeFacebookAccountId === a.id;
                      return (
                        <li
                          key={a.id}
                          className="flex flex-col gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 sm:items-center">
                            <CheckboxToggle
                              id={`fb-conn-${a.id}`}
                              size="sm"
                              className="mt-0.5 shrink-0"
                              checked={a.isConnected}
                              disabled={accountActionLoading}
                              onCheckedChange={(on) => {
                                setConnectionMsg(null);
                                setAccountActionLoading(true);
                                void setAccountConnection(a.id, on)
                                  .then((r) => {
                                    if (!r.ok) {
                                      setConnectionMsg(r.error);
                                    }
                                  })
                                  .finally(() =>
                                    setAccountActionLoading(false),
                                  );
                              }}
                              aria-label={`เชื่อมต่อแอป: ${a.label}`}
                            />
                            <span className="min-w-0 text-sm">
                              <span
                                className={
                                  isActive
                                    ? "font-semibold text-foreground"
                                    : "font-medium"
                                }
                              >
                                {a.label}
                                {isActive
                                  ? " · กำลังใช้ token นี้"
                                  : null}
                              </span>
                              <span className="mt-0.5 block break-all text-[11px] text-muted-foreground sm:mt-0 sm:inline">
                                {" "}
                                · {a.id}
                              </span>
                            </span>
                          </label>
                          <div className="flex shrink-0 flex-wrap justify-end gap-1.5 sm:pl-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              disabled={accountActionLoading}
                              onClick={() => {
                                const name = window.prompt(
                                  "ชื่อเรียกบัญชี (เช่น ร้าน A, บัญชีส่วนตัว)",
                                  a.label,
                                );
                                if (name == null || !name.trim()) return;
                                setAccountActionLoading(true);
                                void renameFacebookAccount(
                                  a.id,
                                  name.trim(),
                                ).finally(() => setAccountActionLoading(false));
                              }}
                            >
                              แก้ชื่อ
                            </Button>
                            {facebookAccounts.length > 1 ? (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="h-8"
                                disabled={accountActionLoading}
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      `ลบ “${a.label}” จากระบบ? (token ของบัญชีนี้จะถูกลบ)`,
                                    )
                                  ) {
                                    return;
                                  }
                                  setAccountActionLoading(true);
                                  void deleteFacebookAccount(a.id).finally(
                                    () => setAccountActionLoading(false),
                                  );
                                }}
                              >
                                ลบ
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="space-y-1.5">
                    <Label htmlFor="fb_account_pick">บัญชีที่กำลังใช้งาน (token)</Label>
                    <p className="text-[11px] text-muted-foreground">
                      เลือกได้เฉพาะบัญชีที่ติ๊ก &quot;เชื่อมต่อแอป&quot; แล้ว
                    </p>
                    {connectedCount === 0 ? (
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        ไม่มีบัญชีเชื่อมต่อ — กำลังซ่อมสถานะ หรือติ๊กเชื่อมต่อ
                        บัญชีใดก็ได้หนึ่งรายการ
                      </p>
                    ) : (
                      <select
                        id="fb_account_pick"
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm dark:border-white/12 dark:bg-[#141416]/90"
                        value={activeFacebookAccountId ?? ""}
                        disabled={accountActionLoading}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id || id === activeFacebookAccountId) return;
                          setAccountActionLoading(true);
                          void switchFacebookAccount(id).finally(() =>
                            setAccountActionLoading(false),
                          );
                        }}
                      >
                        {connectedAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  ยังไม่มีบัญชี — บันทึก Cookie/Token ครั้งแรกด้านล่าง
                </p>
              )}

              <div className="mt-4 border-t border-border/60 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={
                    facebookAccounts.length >=
                    MAX_FACEBOOK_ACCOUNTS_PER_USER
                  }
                  title={
                    facebookAccounts.length >=
                    MAX_FACEBOOK_ACCOUNTS_PER_USER
                      ? `เพิ่มได้สูงสุด ${MAX_FACEBOOK_ACCOUNTS_PER_USER} บัญชี`
                      : undefined
                  }
                  onClick={() => {
                    if (
                      facebookAccounts.length >=
                      MAX_FACEBOOK_ACCOUNTS_PER_USER
                    ) {
                      return;
                    }
                    if (!addAccountOpen) {
                      setAddAccountCookie("");
                      setAddAccountToken("");
                      setAddAccountErr(null);
                    }
                    setAddAccountOpen((o) => !o);
                  }}
                >
                  {addAccountOpen ? "ปิดฟอร์ม" : "+ เพิ่มบัญชีใหม่"}
                </Button>
                {facebookAccounts.length >=
                MAX_FACEBOOK_ACCOUNTS_PER_USER ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ครบ {MAX_FACEBOOK_ACCOUNTS_PER_USER} บัญชีแล้ว —
                    ลบบัญชีออกก่อนเพิ่มใหม่
                  </p>
                ) : null}
                {addAccountOpen ? (
                  <div className="mt-3 space-y-3 rounded-lg border border-dashed border-border/80 bg-background/40 p-3 dark:border-white/12">
                    <p className="text-xs text-muted-foreground">
                      กรอก Cookie และ Access token ของบัญชีที่จะเพิ่ม แล้วกดปุ่มด้านล่าง
                      — ระบบตั้งชื่อแสดงในรายการให้อัตโนมัติ
                    </p>
                    {profileActive ? (
                      <div className="grid gap-4 sm:gap-5">
                        <div className="space-y-2">
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                            <Label
                              htmlFor="fb_add_cookie"
                              className="text-sm font-medium text-foreground"
                            >
                              Cookie
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              ไม่บังคับถ้าใช้แค่ access token
                            </span>
                          </div>
                          <Textarea
                            id="fb_add_cookie"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="วางคุกกี้ของบัญชีใหม่…"
                            value={addAccountCookie}
                            onChange={(e) => setAddAccountCookie(e.target.value)}
                            className="min-h-[5rem] max-h-48 resize-y break-all font-mono text-[13px] leading-relaxed"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="fb_add_token"
                            className="text-sm font-medium text-foreground"
                          >
                            Access token
                          </Label>
                          <Textarea
                            id="fb_add_token"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="EAAG… (ของบัญชีใหม่)"
                            value={addAccountToken}
                            onChange={(e) => setAddAccountToken(e.target.value)}
                            className="min-h-[5rem] max-h-48 resize-y break-all font-mono text-[13px] leading-relaxed"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        ใช้ช่อง Cookie / Access token ในฟอร์มด้านล่างของหน้านี้
                        แล้วกดปุ่มเพิ่มบัญชี
                      </p>
                    )}
                    {addAccountErr ? (
                      <p className="text-sm text-destructive" role="alert">
                        {addAccountErr}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        accountActionLoading ||
                        !addAccountToken.trim() ||
                        facebookAccounts.length >=
                          MAX_FACEBOOK_ACCOUNTS_PER_USER
                      }
                      onClick={() => {
                        setAddAccountErr(null);
                        setAccountActionLoading(true);
                        void createFacebookAccount({
                          cookie: addAccountCookie.trim(),
                          access_token: addAccountToken.trim(),
                        })
                          .then((r) => {
                            if (r.ok) {
                              setAddAccountOpen(false);
                              setAddAccountCookie("");
                              setAddAccountToken("");
                              setCredentialEditorOpen(false);
                            } else {
                              setAddAccountErr(r.error);
                            }
                          })
                          .finally(() => setAccountActionLoading(false));
                      }}
                    >
                      {accountActionLoading
                        ? "กำลังสร้าง…"
                        : "เพิ่มบัญชีจาก Cookie / Token นี้"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {profileActive && profile ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-4 rounded-lg border border-border bg-muted/40 px-4 py-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-background">
                    {profile.pictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Facebook CDN hosts vary; native img avoids remotePatterns churn
                      <img
                        src={profile.pictureUrl}
                        alt={
                          profile.name
                            ? `รูปโปรไฟล์ ${profile.name}`
                            : "รูปโปรไฟล์ Facebook"
                        }
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-lg font-medium text-muted-foreground"
                        aria-hidden
                      >
                        {profile.name
                          ? profile.name.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-base font-semibold text-foreground">
                      {profile.name || "Facebook"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      เชื่อมต่อแล้ว · ID {profile.id}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={handleLogout}
                >
                  ออกจากระบบ Facebook
                </Button>
              </div>

              <div className="border-t border-border pt-6">
                <Button
                  asChild
                  className="w-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 dark:shadow-blue-600/25 sm:w-auto"
                >
                  <Link href="/dashboard/post">ไปหน้าโพสต์ &amp; ตั้งเวลา</Link>
                </Button>
              </div>
            </>
          ) : null}

          {!profileActive ? (
            <div className="space-y-8">
              <div className="space-y-3">
                {loginError ? (
                  <p
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                    role="alert"
                  >
                    {loginError}
                  </p>
                ) : null}
                {settingsLoadError ? (
                  <p
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
                    role="status"
                  >
                    {settingsLoadError}
                  </p>
                ) : null}
              </div>

              {!facebookSettingsReady ? (
                <p className="text-sm text-muted-foreground">
                  กำลังโหลดการตั้งค่า…
                </p>
              ) : useCompactCredentialUi ? (
                <div className="space-y-4 rounded-lg border border-border bg-muted/20 px-4 py-4 dark:bg-white/[0.03]">
                  <p className="text-sm leading-relaxed text-foreground">
                    ใช้ Cookie / Access token ที่บันทึกไว้แล้ว — กดเชื่อมต่อได้ทันที
                    ไม่ต้องกรอกซ้ำ
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button
                      type="button"
                      onClick={handleFacebookConnect}
                      disabled={loginLoading || !accessToken.trim()}
                      className="h-11 w-full min-w-0 shrink-0 sm:w-auto sm:min-w-[11rem]"
                    >
                      {loginLoading ? "กำลังเชื่อมต่อ…" : "เชื่อมต่อ Facebook"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full min-w-0 shrink-0 sm:w-auto sm:min-w-[11rem]"
                      onClick={() => setCredentialEditorOpen(true)}
                    >
                      แก้ไข Cookie / Token
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClear}
                      className="h-11 w-full min-w-0 shrink-0 sm:w-auto sm:min-w-[9rem]"
                    >
                      ล้างค่า
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-8 sm:gap-10">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                        <Label
                          htmlFor="cookie"
                          className="text-sm font-medium text-foreground"
                        >
                          Cookie
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          ไม่บังคับถ้าใช้แค่ access token
                        </span>
                      </div>
                      <Textarea
                        id="cookie"
                        name="cookie"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="วางคุกกี้จากเบราว์เซอร์…"
                        value={cookie}
                        onChange={(e) => setCookie(e.target.value)}
                        className="min-h-[5.5rem] max-h-60 resize-y break-all font-mono text-[13px] leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                        <Label
                          htmlFor="access_token"
                          className="text-sm font-medium text-foreground"
                        >
                          Access token
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          จำเป็นสำหรับเชื่อมต่อ Graph
                        </span>
                      </div>
                      <Textarea
                        id="access_token"
                        name="access_token"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="EAAG…"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        className="min-h-[5.5rem] max-h-60 resize-y break-all font-mono text-[13px] leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-border/60 pt-6 dark:border-white/[0.06]">
                    <p className="text-xs font-medium text-muted-foreground">
                      การทำงาน
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
                      <Button
                        type="button"
                        onClick={handleFacebookConnect}
                        disabled={loginLoading || !accessToken.trim()}
                        className="h-11 w-full min-w-0 shrink-0 sm:w-auto sm:min-w-[11rem]"
                      >
                        {loginLoading
                          ? "กำลังเชื่อมต่อ…"
                          : "เชื่อมต่อ Facebook"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSave}
                        variant="outline"
                        className="h-11 w-full min-w-0 shrink-0 sm:w-auto sm:min-w-[9rem]"
                        disabled={saveLoading}
                      >
                        {saveLoading
                          ? "กำลังบันทึก…"
                          : saved
                            ? "บันทึกแล้ว"
                            : "บันทึกลงบัญชี"}
                      </Button>
                      {hasStoredCredentials ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-11 w-full min-w-0 shrink-0 sm:w-auto"
                          onClick={() => setCredentialEditorOpen(false)}
                        >
                          ย่อช่องกรอก
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClear}
                        className="h-11 w-full min-w-0 shrink-0 sm:w-auto sm:min-w-[9rem]"
                      >
                        ล้างค่า
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {profile && !profileActive ? (
                <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
                  Access token เปลี่ยนแล้ว — กด &quot;เชื่อมต่อ Facebook&quot;
                  อีกครั้งเพื่ออัปเดตโปรไฟล์
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <FontAttribution />
    </>
  );
}
