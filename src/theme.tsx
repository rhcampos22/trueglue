// src/theme.ts
import React from "react";

export type ThemeName = "light" | "dark";

export const TG_LIGHT = {
  primary: "#8A1538",
  primaryDim: "#B44B66",
  accent: "#D4AF37",
  onAccent: "#000000",
  bg: "#FAF9FB",
  surface: "#FFFFFF",
  text: "#1F2430",
  textDim: "#586074",
  border: "#E6E2E8",
  success: "#2E7D32",
  warn: "#B26A00",
  danger: "#C62828",
} as const;

export const TG_DARK = {
  primary: "#D3839A",
  primaryDim: "#B44B66",
  accent: "#D4AF37",
  bg: "#0F1115",
  surface: "#151822",
  text: "#E6EAF5",
  textDim: "#9AA3B2",
  border: "#2A2F3B",
  success: "#4CAF50",
  warn: "#D28B10",
  danger: "#EF5350",
} as const;

/** Backward-compat: keep TG_COLORS export (defaults to light) */
export const TG_COLORS = TG_LIGHT;

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  toggle: () => void;
  colors: typeof TG_LIGHT;
};

const ThemeContext = React.createContext<ThemeContextType | null>(null);

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider />");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initial = React.useMemo<ThemeName>(() => {
    const saved = localStorage.getItem("tg_theme") as ThemeName | null;
    if (saved === "light" || saved === "dark") return saved;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }, []);

  const [theme, setTheme] = React.useState<ThemeName>(initial);
  const colors = theme === "dark" ? TG_DARK : TG_LIGHT;

  React.useEffect(() => {
    localStorage.setItem("tg_theme", theme);
    // Optional: expose as CSS variables for future CSS use
    const root = document.documentElement;
    Object.entries(colors).forEach(([k, v]) => {
      root.style.setProperty(`--tg-${k}`, String(v));
    });
    document.body.style.background = colors.bg;
    document.body.style.color = colors.text;
  }, [theme, colors]);

  // Respect OS changes until the user explicitly toggles in-app
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const saved = localStorage.getItem("tg_theme");
    const handler = (e: MediaQueryListEvent) => {
      if (!saved) setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [setTheme]);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      colors,
    }),
    [theme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
