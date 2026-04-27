"use client";

import * as React from "react";

const STORAGE_KEY = "fb-toolkit-theme";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemDark() ? "dark" : "light";
  }
  return theme;
}

function applyDomTheme(resolved: "light" | "dark"): void {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">(
    "light",
  );
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored: Theme =
      raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
    setThemeState(stored);
    const resolved = resolveTheme(stored);
    setResolvedTheme(resolved);
    applyDomTheme(resolved);
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyDomTheme(resolved);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [mounted, theme]);

  React.useEffect(() => {
    if (!mounted || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const resolved = resolveTheme("system");
      setResolvedTheme(resolved);
      applyDomTheme(resolved);
    };
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [mounted, theme]);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const value = React.useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme ต้องอยู่ภายใน ThemeProvider");
  }
  return ctx;
}
