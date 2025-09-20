// src/ui.tsx
import React from "react";
import { useTheme } from "./theme";

export type Theme = {
  bg: string;
  card: string;
  soft: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  /** text color when placed on primary background */
  onPrimary: string;
  /** text color when placed on accent background */
  onAccent: string;
  success: string;
  danger: string;
  shadow: string;
};

// Build a theme adapter that matches your ConflictWorkflow colors
export function useT(): Theme {
  const { theme, colors } = useTheme();
  return {
    bg: colors.bg,
    card: colors.surface,
    soft: colors.border,
    text: colors.text,
    muted: colors.textDim,
    primary: colors.primary,
    accent: colors.accent,
    // Fallbacks ensure you don't have to touch theme.tsx right now
    onPrimary: (colors as any).onPrimary ?? "#001315",
    onAccent:  (colors as any).onAccent  ?? "#000000",
    success: (colors as any).success ?? "#3BB273",
    danger: (colors as any).danger ?? "#E85C5C",
    shadow:
      theme === "dark"
        ? "0 10px 28px rgba(0,0,0,0.35)"
        : "0 10px 28px rgba(0,0,0,0.08)",
  };
}

export const focusRing = "0 0 0 3px rgba(47,165,165,.35)";

export function cardStyle(T: Theme): React.CSSProperties {
  return {
    background: T.card,
    border: `1px solid ${T.soft}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: T.shadow,
  };
}

// Buttons that visually match your ConflictWorkflow
export function PrimaryButton({
  children,
  onClick,
  disabled,
  T,
  variant = "primary",
  style,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  T: Theme;
  variant?: "primary" | "accent" | "outline";
  style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    border: "1px solid transparent", // use shorthand to avoid borderColor warnings
    background: "transparent",
    color: T.text,
    opacity: disabled ? 0.6 : 1,
    outline: "none",
    boxShadow: "none",
  };

  const byVariant: Record<NonNullable<typeof variant>, React.CSSProperties> = {
    primary: {
      background: T.primary,
      color: T.onPrimary,
      border: `1px solid ${T.primary}`,
    },
    accent: {
      background: T.accent,
      color: T.onAccent,
      border: `1px solid ${T.accent}`,
    },
    outline: {
      background: "transparent",
      color: T.text,
      border: `1px solid ${T.soft}`,
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...props}
      style={{ ...base, ...byVariant[variant], ...style }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(47,165,165,.35)")}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children, onClick, T,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  T: Theme;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${T.soft}`,
        borderRadius: 12,
        padding: "12px 16px",
        cursor: "pointer",
        fontWeight: 600,
        background: "transparent",
        color: T.text,
        outline: "none",
      }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {children}
    </button>
  );
}

// Chips/badges
export function Pill({
  children, T, color,
}: {
  children: React.ReactNode;
  T: Theme;
  color?: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        border: `1px solid ${color ?? T.soft}`,
        padding: "6px 12px",
        borderRadius: 999,
        color: color ?? T.muted,
        fontSize: 12,
      }}
    >
      {children}
    </span>
  );
}

// Inputs that honor dark mode
export function inputStyle(T: Theme): React.CSSProperties {
  return {
    width: "100%",
    background: "transparent",
    color: T.text,
    border: `1px solid ${T.soft}`,
    borderRadius: 12,
    padding: "12px 14px",
    outline: "none",
  };
}

export function textareaStyle(T: Theme): React.CSSProperties {
  return { ...inputStyle(T), minHeight: 106, resize: "vertical" as const };
}
