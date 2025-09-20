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
    success: (colors as any).success ?? "#3BB273",
    danger: (colors as any).danger ?? "#E85C5C",
    shadow: theme === "dark"
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
  children, onClick, disabled, T,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  T: Theme;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        borderRadius: 12,
        padding: "12px 16px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
        background: T.primary,
        color: "#001315",
        opacity: disabled ? 0.6 : 1,
        outline: "none",
      }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
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
