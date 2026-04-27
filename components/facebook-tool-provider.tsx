"use client";

import * as React from "react";

const STORAGE_KEY = "facebook-bot-config";

/** สำรองในเบราว์เซอร์ — ใช้เมื่อโหลดจากเซิร์ฟเวอร์ไม่ได้ แต่เคยบันทึกไว้แล้ว */
function readFacebookLocalBackup(): {
  cookie: string;
  token: string;
  activeAccountId: string | null;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cookie: "", token: "", activeAccountId: null };
    const parsed = JSON.parse(raw) as {
      cookie?: string;
      access_token?: string;
      active_account_id?: string | null;
    };
    return {
      cookie: typeof parsed.cookie === "string" ? parsed.cookie : "",
      token:
        typeof parsed.access_token === "string"
          ? parsed.access_token.trim()
          : "",
      activeAccountId:
        typeof parsed.active_account_id === "string"
          ? parsed.active_account_id
          : null,
    };
  } catch {
    return { cookie: "", token: "", activeAccountId: null };
  }
}

function writeFacebookLocalBackup(
  cookie: string,
  token: string,
  activeAccountId: string | null = null,
) {
  const c = cookie.trim();
  const t = token.trim();
  if (!c && !t) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cookie: c,
        access_token: t,
        ...(activeAccountId ? { active_account_id: activeAccountId } : {}),
      }),
    );
  } catch {
    /* ignore */
  }
}

export type Profile = {
  id: string;
  name: string;
  pictureUrl: string | null;
  verifiedToken: string;
};

export type GroupRow = {
  id: string;
  name: string;
  privacy?: string;
  member_count?: number;
};

export type FacebookAccountListEntry = {
  id: string;
  label: string;
  isConnected: boolean;
};

function normalizeServerAccounts(
  raw: unknown,
): FacebookAccountListEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => {
      const o = a as {
        id?: string;
        label?: string;
        is_connected?: boolean;
      };
      if (typeof o.id !== "string" || typeof o.label !== "string") {
        return null;
      }
      return {
        id: o.id,
        label: o.label,
        isConnected:
          typeof o.is_connected === "boolean" ? o.is_connected : true,
      };
    })
    .filter(Boolean) as FacebookAccountListEntry[];
}

type MeResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string | null };

async function fetchFacebookProfile(
  accessToken: string,
  cookie: string,
): Promise<MeResult> {
  const token = accessToken.trim();
  if (!token) return { ok: false, error: null };
  try {
    const res = await fetch("/api/facebook/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        cookie: cookie.trim() || undefined,
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      id?: string;
      name?: string;
      pictureUrl?: string | null;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "เชื่อมต่อไม่สำเร็จ" };
    }
    return {
      ok: true,
      profile: {
        id: data.id ?? "",
        name: data.name ?? "",
        pictureUrl: data.pictureUrl ?? null,
        verifiedToken: token,
      },
    };
  } catch {
    return { ok: false, error: "เครือข่ายผิดพลาด ลองใหม่อีกครั้ง" };
  }
}

function useFacebookToolState() {
  const [cookie, setCookie] = React.useState("");
  const [accessToken, setAccessToken] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [settingsLoadError, setSettingsLoadError] = React.useState<
    string | null
  >(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [groups, setGroups] = React.useState<GroupRow[]>([]);
  const [groupsLoading, setGroupsLoading] = React.useState(false);
  const [groupsError, setGroupsError] = React.useState<string | null>(null);
  /** กลุ่มที่ติ๊กว่า “โพสต์กลุ่มนี้ได้” */
  const [postableByGroupId, setPostableByGroupId] = React.useState<
    Record<string, boolean>
  >({});
  const [groupSearch, setGroupSearch] = React.useState("");

  const [postGroupId, setPostGroupId] = React.useState("");
  const [postMessage, setPostMessage] = React.useState("");
  const [postImage, setPostImage] = React.useState<File | null>(null);
  const [postPreviewUrl, setPostPreviewUrl] = React.useState<string | null>(
    null,
  );
  const [postLoading, setPostLoading] = React.useState(false);
  const [postError, setPostError] = React.useState<string | null>(null);
  const [postErrorHint, setPostErrorHint] = React.useState<string | null>(null);
  const [postOk, setPostOk] = React.useState<string | null>(null);

  /**
   * หลังกด "ออกจากระบบ Facebook" เป็น false — ไม่โหลดกลุ่ม/ไม่แสดงฟอร์มโพสต์จนกว่าจะกดเชื่อมต่อใหม่
   * (token อาจยังอยู่ในฟอร์มเพื่อกดเชื่อมต่อซ้ำได้ง่าย)
   */
  const [facebookGraphOptIn, setFacebookGraphOptIn] = React.useState(true);

  /** โหลด /api/user/facebook-settings จบแล้ว (ใช้ซ่อนช่อง Cookie/Token เมื่อมีค่าจากเซิร์ฟเวอร์) */
  const [facebookSettingsReady, setFacebookSettingsReady] =
    React.useState(false);

  const [facebookAccounts, setFacebookAccounts] = React.useState<
    FacebookAccountListEntry[]
  >([]);
  const [activeFacebookAccountId, setActiveFacebookAccountId] = React.useState<
    string | null
  >(null);

  const applySettingsPayload = React.useCallback(
    (data: {
      cookie?: string;
      access_token?: string;
      active_account_id?: string | null;
      accounts?: unknown;
    }) => {
      const serverCookie = typeof data.cookie === "string" ? data.cookie : "";
      const serverToken =
        typeof data.access_token === "string"
          ? data.access_token.trim()
          : "";
      setCookie(serverCookie);
      setAccessToken(serverToken);
      setActiveFacebookAccountId(
        typeof data.active_account_id === "string"
          ? data.active_account_id
          : null,
      );
      setFacebookAccounts(normalizeServerAccounts(data.accounts));
      return { serverCookie, serverToken };
    },
    [],
  );

  React.useEffect(() => {
    let cancelled = false;
    setSettingsLoadError(null);

    const hydrateFromCredentials = async (
      cookieVal: string,
      tokenVal: string,
      activeId: string | null,
    ) => {
      setCookie(cookieVal);
      setAccessToken(tokenVal);
      setActiveFacebookAccountId(activeId);
      const me = await fetchFacebookProfile(tokenVal, cookieVal);
      if (!cancelled && me.ok) {
        setProfile(me.profile);
      }
    };

    (async () => {
      const backup = readFacebookLocalBackup();

      try {
        const res = await fetch("/api/user/facebook-settings");
        if (cancelled) return;

        if (res.status === 401) {
          return;
        }

        if (!res.ok) {
          setSettingsLoadError("โหลดการตั้งค่าจากเซิร์ฟเวอร์ไม่สำเร็จ");
          if (backup.token || backup.cookie) {
            await hydrateFromCredentials(
              backup.cookie,
              backup.token,
              backup.activeAccountId,
            );
          }
          return;
        }

        const data = (await res.json()) as {
          cookie?: string;
          access_token?: string;
          active_account_id?: string | null;
          accounts?: unknown;
        };
        const { serverCookie, serverToken } = applySettingsPayload(data);

        if (serverCookie || serverToken) {
          writeFacebookLocalBackup(
            serverCookie,
            serverToken,
            typeof data.active_account_id === "string"
              ? data.active_account_id
              : null,
          );
          await hydrateFromCredentials(
            serverCookie,
            serverToken,
            typeof data.active_account_id === "string"
              ? data.active_account_id
              : null,
          );
          return;
        }

        if (backup.token || backup.cookie) {
          try {
            const put = await fetch("/api/user/facebook-settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cookie: backup.cookie.trim() || "",
                access_token: backup.token.trim(),
              }),
            });
            if (!cancelled && put.ok) {
              const r2 = await fetch("/api/user/facebook-settings");
              if (r2.ok) {
                const d2 = (await r2.json()) as typeof data;
                applySettingsPayload(d2);
                await hydrateFromCredentials(
                  backup.cookie,
                  backup.token,
                  typeof d2.active_account_id === "string"
                    ? d2.active_account_id
                    : null,
                );
              } else {
                await hydrateFromCredentials(
                  backup.cookie,
                  backup.token,
                  backup.activeAccountId,
                );
              }
              return;
            }
          } catch {
            /* ignore */
          }
          await hydrateFromCredentials(
            backup.cookie,
            backup.token,
            backup.activeAccountId,
          );
        }
      } catch {
        if (!cancelled) {
          setSettingsLoadError("โหลดการตั้งค่าไม่สำเร็จ");
        }
        if (!cancelled && (backup.token || backup.cookie)) {
          await hydrateFromCredentials(
            backup.cookie,
            backup.token,
            backup.activeAccountId,
          );
        }
      } finally {
        if (!cancelled) {
          setFacebookSettingsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySettingsPayload]);

  const handleSave = React.useCallback(async () => {
    setSaveLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/facebook-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie: cookie.trim(),
          access_token: accessToken.trim(),
        }),
      });
      if (!res.ok) {
        return;
      }
      writeFacebookLocalBackup(
        cookie.trim(),
        accessToken.trim(),
        activeFacebookAccountId,
      );
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setSaveLoading(false);
    }
  }, [cookie, accessToken, activeFacebookAccountId]);

  const handleClear = React.useCallback(async () => {
    try {
      await fetch("/api/user/facebook-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: "", access_token: "" }),
      });
    } catch {
      /* ignore */
    }
    setCookie("");
    setAccessToken("");
    setProfile(null);
    setLoginError(null);
    setGroups([]);
    setGroupsError(null);
    setPostableByGroupId({});
    setGroupSearch("");
    localStorage.removeItem(STORAGE_KEY);
    setFacebookGraphOptIn(false);
  }, []);

  const handleLogout = React.useCallback(() => {
    setFacebookGraphOptIn(false);
    setProfile(null);
    setLoginError(null);
    setGroups([]);
    setGroupsError(null);
    setPostableByGroupId({});
    setGroupSearch("");
    setPostGroupId("");
    setPostMessage("");
    setPostImage(null);
    setPostError(null);
    setPostErrorHint(null);
    setPostOk(null);
  }, []);

  React.useEffect(() => {
    if (!postImage) {
      setPostPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(postImage);
    setPostPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [postImage]);

  const handlePostToGroup = React.useCallback(async () => {
    const msg = postMessage.trim();
    if (!postGroupId) {
      setPostError("กรุณาเลือกกลุ่ม");
      return;
    }
    if (!msg && !postImage) {
      setPostError("กรุณากรอกข้อความหรือเลือกรูป");
      return;
    }

    setPostLoading(true);
    setPostError(null);
    setPostErrorHint(null);
    setPostOk(null);

    try {
      const fd = new FormData();
      fd.set("group_id", postGroupId);
      fd.set("message", msg);
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
      };

      if (!res.ok) {
        setPostError(data.error ?? "โพสต์ไม่สำเร็จ");
        setPostErrorHint(
          typeof data.hint === "string" && data.hint.trim()
            ? data.hint.trim()
            : null,
        );
        return;
      }

      const id = data.post_id || data.id || "";
      setPostOk(id ? `โพสต์สำเร็จ (ID: ${id})` : "โพสต์สำเร็จ");
      setPostMessage("");
      setPostImage(null);
    } catch {
      setPostError("เครือข่ายผิดพลาด");
    } finally {
      setPostLoading(false);
    }
  }, [postGroupId, postMessage, postImage]);

  const handleFacebookConnect = React.useCallback(async () => {
    const token = accessToken.trim();
    if (!token) {
      setLoginError("กรุณากรอก access token ก่อน");
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const me = await fetchFacebookProfile(accessToken, cookie);
      if (!me.ok) {
        setProfile(null);
        setLoginError(me.error ?? "เชื่อมต่อไม่สำเร็จ");
        return;
      }
      setProfile(me.profile);
      setFacebookGraphOptIn(true);
      writeFacebookLocalBackup(
        cookie.trim(),
        accessToken.trim(),
        activeFacebookAccountId,
      );
    } finally {
      setLoginLoading(false);
    }
  }, [accessToken, cookie, activeFacebookAccountId]);

  const switchFacebookAccount = React.useCallback(
    async (accountId: string) => {
      const res = await fetch("/api/user/facebook-accounts/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });
      if (!res.ok) return false;
      const r = await fetch("/api/user/facebook-settings");
      if (!r.ok) return false;
      const data = (await r.json()) as {
        cookie?: string;
        access_token?: string;
        active_account_id?: string | null;
        accounts?: unknown;
      };
      applySettingsPayload(data);
      writeFacebookLocalBackup(
        typeof data.cookie === "string" ? data.cookie : "",
        typeof data.access_token === "string" ? data.access_token.trim() : "",
        typeof data.active_account_id === "string"
          ? data.active_account_id
          : null,
      );
      setFacebookGraphOptIn(false);
      setProfile(null);
      setLoginError(null);
      setGroups([]);
      setGroupsError(null);
      setPostableByGroupId({});
      setGroupSearch("");
      setPostGroupId("");
      return true;
    },
    [applySettingsPayload],
  );

  const createFacebookAccount = React.useCallback(
    async (opts: {
      cookie: string;
      access_token: string;
      label?: string;
    }): Promise<
      { ok: true } | { ok: false; error: string }
    > => {
      const res = await fetch("/api/user/facebook-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie: opts.cookie,
          access_token: opts.access_token,
          ...(opts.label?.trim()
            ? { label: opts.label.trim() }
            : {}),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        return {
          ok: false,
          error: j.error ?? "เพิ่มบัญชีไม่สำเร็จ",
        };
      }
      const r = await fetch("/api/user/facebook-settings");
      if (r.ok) {
        const data = (await r.json()) as {
          cookie?: string;
          access_token?: string;
          active_account_id?: string | null;
          accounts?: unknown;
        };
        applySettingsPayload(data);
        writeFacebookLocalBackup(
          typeof data.cookie === "string" ? data.cookie : "",
          typeof data.access_token === "string"
            ? data.access_token.trim()
            : "",
          typeof data.active_account_id === "string"
            ? data.active_account_id
            : null,
        );
      }
      setFacebookGraphOptIn(false);
      setProfile(null);
      setGroups([]);
      setGroupsError(null);
      setPostableByGroupId({});
      setPostGroupId("");
      return { ok: true };
    },
    [applySettingsPayload],
  );

  const deleteFacebookAccount = React.useCallback(
    async (accountId: string) => {
      const res = await fetch(
        `/api/user/facebook-accounts/${encodeURIComponent(accountId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) return false;
      const r = await fetch("/api/user/facebook-settings");
      if (r.ok) {
        const data = (await r.json()) as {
          cookie?: string;
          access_token?: string;
          active_account_id?: string | null;
          accounts?: unknown;
        };
        applySettingsPayload(data);
        writeFacebookLocalBackup(
          typeof data.cookie === "string" ? data.cookie : "",
          typeof data.access_token === "string"
            ? data.access_token.trim()
            : "",
          typeof data.active_account_id === "string"
            ? data.active_account_id
            : null,
        );
      }
      setFacebookGraphOptIn(false);
      setProfile(null);
      setGroups([]);
      setGroupsError(null);
      setPostableByGroupId({});
      setPostGroupId("");
      return true;
    },
    [applySettingsPayload],
  );

  const setAccountConnection = React.useCallback(
    async (accountId: string, isConnected: boolean) => {
      const tokenBefore = accessToken.trim();
      const activeBefore = activeFacebookAccountId;
      const res = await fetch(
        `/api/user/facebook-accounts/${encodeURIComponent(accountId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_connected: isConnected }),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false as const, error: j.error ?? "อัปเดตไม่สำเร็จ" };
      }
      const r = await fetch("/api/user/facebook-settings");
      if (!r.ok) {
        return { ok: false as const, error: "โหลดสถานะล่าสุดไม่สำเร็จ" };
      }
      const data = (await r.json()) as {
        cookie?: string;
        access_token?: string;
        active_account_id?: string | null;
        accounts?: unknown;
      };
      applySettingsPayload(data);
      const tokenAfter =
        typeof data.access_token === "string" ? data.access_token.trim() : "";
      const activeAfter =
        typeof data.active_account_id === "string"
          ? data.active_account_id
          : null;
      writeFacebookLocalBackup(
        typeof data.cookie === "string" ? data.cookie : "",
        tokenAfter,
        activeAfter,
      );
      if (
        tokenAfter !== tokenBefore ||
        activeAfter !== activeBefore
      ) {
        setFacebookGraphOptIn(false);
        setProfile(null);
        setLoginError(null);
        setGroups([]);
        setGroupsError(null);
        setPostableByGroupId({});
        setGroupSearch("");
        setPostGroupId("");
      }
      return { ok: true as const };
    },
    [
      accessToken,
      activeFacebookAccountId,
      applySettingsPayload,
    ],
  );

  const renameFacebookAccount = React.useCallback(
    async (accountId: string, label: string) => {
      const res = await fetch(
        `/api/user/facebook-accounts/${encodeURIComponent(accountId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: label.trim().slice(0, 191) }),
        },
      );
      if (!res.ok) return false;
      const r = await fetch("/api/user/facebook-settings");
      if (r.ok) {
        const d = (await r.json()) as {
          cookie?: string;
          access_token?: string;
          active_account_id?: string | null;
          accounts?: unknown;
        };
        applySettingsPayload(d);
      }
      return true;
    },
    [applySettingsPayload],
  );

  const profileActive =
    profile !== null &&
    profile.verifiedToken.trim() === accessToken.trim();

  const canUseFacebookPostUi =
    facebookSettingsReady &&
    Boolean(accessToken.trim()) &&
    facebookGraphOptIn;

  React.useEffect(() => {
    if (!canUseFacebookPostUi) {
      setGroups([]);
      setGroupsError(null);
      setGroupsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const res = await fetch("/api/facebook/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken.trim(),
            cookie: cookie.trim() || undefined,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          groups?: GroupRow[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setGroups([]);
          setGroupsError(data.error ?? "โหลดกลุ่มไม่สำเร็จ");
          return;
        }
        setGroups(Array.isArray(data.groups) ? data.groups : []);
      } catch {
        if (!cancelled) {
          setGroups([]);
          setGroupsError("เครือข่ายผิดพลาด");
        }
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseFacebookPostUi, accessToken, cookie]);

  React.useEffect(() => {
    if (groups.length === 0) {
      setPostableByGroupId({});
      return;
    }
    const accId = activeFacebookAccountId;
    let stored: Record<string, boolean> | null = null;
    if (accId) {
      try {
        const raw = localStorage.getItem(`fb-postable:${accId}`);
        if (raw) {
          stored = JSON.parse(raw) as Record<string, boolean>;
        }
      } catch {
        /* ignore */
      }
    }
    setPostableByGroupId((prev) => {
      const next: Record<string, boolean> = {};
      for (const g of groups) {
        if (stored && g.id in stored) {
          next[g.id] = Boolean(stored[g.id]);
        } else {
          next[g.id] = g.id in prev ? Boolean(prev[g.id]) : true;
        }
      }
      const hasAny = groups.some((g) => next[g.id]);
      if (!hasAny && groups.length > 0) {
        for (const g of groups) {
          next[g.id] = true;
        }
      }
      return next;
    });
  }, [groups, activeFacebookAccountId]);

  React.useEffect(() => {
    if (!activeFacebookAccountId) {
      return;
    }
    if (Object.keys(postableByGroupId).length === 0) {
      return;
    }
    try {
      localStorage.setItem(
        `fb-postable:${activeFacebookAccountId}`,
        JSON.stringify(postableByGroupId),
      );
    } catch {
      /* ignore */
    }
  }, [postableByGroupId, activeFacebookAccountId]);

  const postableGroupList = React.useMemo(
    () => groups.filter((g) => postableByGroupId[g.id]),
    [groups, postableByGroupId],
  );

  const filteredGroupsForPicker = React.useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.id.includes(q) ||
        (g.privacy?.toLowerCase().includes(q) ?? false),
    );
  }, [groups, groupSearch]);

  React.useEffect(() => {
    if (!postGroupId) return;
    if (!postableByGroupId[postGroupId]) {
      setPostGroupId("");
    }
  }, [postGroupId, postableByGroupId]);

  /** ติ๊กได้แค่กลุ่มเดียว — เลือกปลายทางให้อัตโนมัติ */
  React.useEffect(() => {
    if (postableGroupList.length !== 1) return;
    const onlyId = postableGroupList[0]!.id;
    if (postGroupId !== onlyId) {
      setPostGroupId(onlyId);
    }
  }, [postableGroupList, postGroupId]);

  const selectedPostGroup = React.useMemo(
    () => postableGroupList.find((g) => g.id === postGroupId),
    [postableGroupList, postGroupId],
  );

  const togglePostable = React.useCallback((id: string) => {
    setPostableByGroupId((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectAllPostable = React.useCallback(() => {
    setPostableByGroupId((prev) => {
      const next = { ...prev };
      for (const g of groups) next[g.id] = true;
      return next;
    });
  }, [groups]);

  const clearAllPostable = React.useCallback(() => {
    setPostableByGroupId((prev) => {
      const next = { ...prev };
      for (const g of groups) next[g.id] = false;
      return next;
    });
  }, [groups]);

  return {
    cookie,
    setCookie,
    accessToken,
    setAccessToken,
    saved,
    setSaved,
    saveLoading,
    setSaveLoading,
    settingsLoadError,
    setSettingsLoadError,
    profile,
    setProfile,
    loginLoading,
    setLoginLoading,
    loginError,
    setLoginError,
    groups,
    setGroups,
    groupsLoading,
    setGroupsLoading,
    groupsError,
    setGroupsError,
    postableByGroupId,
    setPostableByGroupId,
    groupSearch,
    setGroupSearch,
    postGroupId,
    setPostGroupId,
    postMessage,
    setPostMessage,
    postImage,
    setPostImage,
    postPreviewUrl,
    setPostPreviewUrl,
    postLoading,
    setPostLoading,
    postError,
    setPostError,
    postErrorHint,
    setPostErrorHint,
    postOk,
    setPostOk,
    handleSave,
    handleClear,
    handleLogout,
    handlePostToGroup,
    handleFacebookConnect,
    togglePostable,
    selectAllPostable,
    clearAllPostable,
    profileActive,
    postableGroupList,
    filteredGroupsForPicker,
    selectedPostGroup,
    facebookSettingsReady,
    facebookGraphOptIn,
    canUseFacebookPostUi,
    facebookAccounts,
    activeFacebookAccountId,
    switchFacebookAccount,
    createFacebookAccount,
    deleteFacebookAccount,
    renameFacebookAccount,
    setAccountConnection,
  };
}

export type FacebookToolContextValue = ReturnType<typeof useFacebookToolState>;

const FacebookToolContext =
  React.createContext<FacebookToolContextValue | null>(null);

export function useFacebookTool() {
  const v = React.useContext(FacebookToolContext);
  if (v == null) {
    throw new Error("useFacebookTool must be used within FacebookToolProvider");
  }
  return v;
}

export function FacebookToolProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useFacebookToolState();
  return (
    <FacebookToolContext.Provider value={value}>
      {children}
    </FacebookToolContext.Provider>
  );
}
