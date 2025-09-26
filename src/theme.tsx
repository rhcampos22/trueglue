// src/theme.ts
import React from "react";

export type ThemeName = "light" | "dark";

/** Colors (expanded for buttons, tabs, and focus rings) */
export const TG_LIGHT = {
  primary: "#8A1538",
  primaryDim: "#B44B66",
  primarySoft: "#F8EDEF",     // used for active tab pill bg (light tint)
  accent: "#D4AF37",
  onAccent: "#000000",
  onPrimary: "#FFFFFF",       // text on primary buttons
  onDanger: "#FFFFFF",        // text on danger buttons
  focus: "#6B4DE6",           // visible keyboard focus outline color

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
  primarySoft: "#2A1A20",     // subtle tint for dark theme tab pill bg
  accent: "#D4AF37",
  onAccent: "#000000",
  onPrimary: "#0F1115",       // darker text over light-ish primary in dark mode
  onDanger: "#FFFFFF",
  focus: "#6B4DE6",

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

/** New: design tokens for spacing, radius, shadows, typography */
export const TG_TOKENS = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  shadow: {
    sm: "0 1px 2px rgba(0,0,0,.06)",
    md: "0 4px 10px rgba(0,0,0,.08)",
    lg: "0 10px 24px rgba(0,0,0,.12)",
  },
  font: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, h2: 24, h1: 28 },
} as const;

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  toggle: () => void;
  colors: typeof TG_LIGHT;
  tokens: typeof TG_TOKENS; // ← added
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
    // Expose colors as CSS vars for global styles
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
      tokens: TG_TOKENS, // ← added
    }),
    [theme, colors]
  );

  // Wrapper exposes --tg-focus for your :focus-visible rule
  return (
    <ThemeContext.Provider value={value}>
      <div
        data-theme={theme}
        style={{ ["--tg-focus" as any]: colors.focus }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
