// src/ui.tsx
import React from "react";
import { useTheme } from "./theme";

/** ─────────────────────────────────────────────────────────────────────────────
 *  Legacy Theme adapter (kept so existing code keeps working)
 *  You can migrate to useTheme().colors and useTheme().tokens directly later.
 *  ────────────────────────────────────────────────────────────────────────────*/
export type Theme = {
  bg: string;
  card: string;
  soft: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  onPrimary: string;
  onAccent: string;
  success: string;
  danger: string;
  shadow: string;
};

export function useT(): Theme {
  const { theme, colors, tokens } = useTheme();
  return {
    bg: colors.bg,
    card: colors.surface,
    soft: colors.border,
    text: colors.text,
    muted: colors.textDim,
    primary: colors.primary,
    accent: colors.accent,
    onPrimary: (colors as any).onPrimary ?? "#001315",
    onAccent: (colors as any).onAccent ?? "#000000",
    success: (colors as any).success ?? "#3BB273",
    danger: (colors as any).danger ?? "#E85C5C",
    shadow:
      theme === "dark"
        ? "0 10px 28px rgba(0,0,0,0.35)"
        : "0 10px 28px rgba(0,0,0,0.08)",
  };
}

/** Optional: legacy focus ring string, if your code sets boxShadow manually */
export const focusRingShadow = "0 0 0 3px rgba(47,165,165,.35)";

/** New: focus ring as a style helper */
export const focusRing = (focusColor?: string): React.CSSProperties => ({
  outline: `3px solid ${focusColor ?? "var(--tg-focus, #6B4DE6)"}`,
  outlineOffset: 3,
  borderRadius: 10,
});

/** Card style (legacy signature kept) */
export function cardStyle(T: Theme): React.CSSProperties {
  return {
    background: T.card,
    border: `1px solid ${T.soft}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: T.shadow,
  };
}

/** Inputs honoring dark mode (legacy helpers kept) */
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

/** ─────────────────────────────────────────────────────────────────────────────
 *  New Unified Components
 *  ────────────────────────────────────────────────────────────────────────────*/

/** Button */
type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "accent";
type ButtonSize = "sm" | "md" | "lg";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
  }
>(function Button(
  { variant = "primary", size = "md", loading = false, style, children, ...props },
  ref
) {
  const { colors, tokens } = useTheme();

  const paddings: Record<ButtonSize, string> = {
    sm: "6px 10px",
    md: "10px 14px",
    lg: "14px 18px",
  };
  const fontSize =
    size === "sm" ? tokens.font.sm : size === "lg" ? tokens.font.lg : tokens.font.md;

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: colors.primary,
      color: colors.onPrimary,
      border: `1px solid ${colors.primary}`,
    },
    secondary: {
      background: colors.surface,
      color: colors.text,
      border: `1px solid ${colors.border}`,
    },
    ghost: {
      background: "transparent",
      color: colors.text,
      border: `1px dashed ${colors.border}`,
    },
    destructive: {
      background: colors.danger,
      color: colors.onDanger,
      border: `1px solid ${colors.danger}`,
    },
    accent: {
      background: colors.accent,
      color: colors.onAccent ?? "#000",
      border: `1px solid ${colors.accent}`,
    },
  };

  return (
    <button
      ref={ref}
      {...props}
      aria-busy={loading || undefined}
      style={{
        padding: paddings[size],
        fontSize,
        borderRadius: tokens.radius.pill,
        boxShadow: tokens.shadow.sm,
        cursor: props.disabled ? "not-allowed" : "pointer",
        transition: "transform 80ms ease, box-shadow 120ms ease, background 120ms ease",
        userSelect: "none",
        ...variants[variant],
        ...style,
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
      }}
    >
      {loading ? "…" : children}
    </button>
  );
});

/** Keyboard-friendly Tab Pill */
export function TabPill({
  active,
  onSelect,
  children,
  style,
  ...rest
}: {
  active?: boolean;
  onSelect?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { colors, tokens } = useTheme();
  return (
    <button
      role="tab"
      aria-selected={!!active}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.();
      }}
      {...rest}
      style={{
        padding: "8px 12px",
        borderRadius: tokens.radius.pill,
        border: `1px solid ${active ? colors.primary : colors.border}`,
        background: active ? colors.primarySoft : colors.surface,
        color: active ? colors.primary : colors.text,
        transition: "background 120ms ease, border-color 120ms ease",
        marginRight: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Modal with ARIA and Escape/backdrop close */
export function Modal({
  open,
  title,
  onClose,
  children,
  initialFocusRef,
  width = "min(560px, 92vw)",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Pass a ref to focus when the modal opens */
  initialFocusRef?: React.RefObject<HTMLElement>;
  width?: string;
}) {
  const { colors, tokens } = useTheme();

  React.useEffect(() => {
    if (open && initialFocusRef?.current) {
      initialFocusRef.current.focus();
    }
  }, [open, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="tg-fade-in"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.36)",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="tg-scale-in"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: tokens.radius.lg,
          boxShadow: tokens.shadow.lg,
          padding: tokens.spacing.lg,
          width,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: tokens.spacing.md,
          }}
        >
          <h2 id="modal-title" style={{ fontSize: tokens.font.h2, margin: 0 }}>
            {title}
          </h2>
          <Button variant="ghost" aria-label="Close" onClick={onClose}>
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** ─────────────────────────────────────────────────────────────────────────────
 *  Legacy Shims (so your existing components keep working)
 *  ────────────────────────────────────────────────────────────────────────────*/

/** PrimaryButton (shim) */
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
  T: Theme; // ignored in favor of theme context; kept for API compatibility
  variant?: "primary" | "accent" | "outline";
  style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const mapped: ButtonVariant =
    variant === "accent" ? "accent" : variant === "outline" ? "secondary" : "primary";
  return (
    <Button
      variant={mapped}
      disabled={disabled}
      onClick={onClick}
      style={style}
      {...props}
    >
      {children}
    </Button>
  );
}

/** GhostButton (shim) */
export function GhostButton({
  children,
  onClick,
  T, // ignored, kept for compatibility
  style,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  T: Theme;
  style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button variant="ghost" onClick={onClick} style={style} {...props}>
      {children}
    </Button>
  );
}

/** Pill (kept; feel free to migrate to TabPill where appropriate) */
export function Pill({
  children,
  T, // optional legacy adapter
  color,
  style,
  ...rest
}: {
  children: React.ReactNode;
  T?: Theme;
  color?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const { colors, tokens } = useTheme();
  const border = color ?? (T ? T.soft : colors.border);
  const text = color ? color : T ? T.muted : colors.textDim;
  return (
    <span
      {...rest}
      style={{
        display: "inline-block",
        border: `1px solid ${border}`,
        padding: "6px 12px",
        borderRadius: 999,
        color: text,
        fontSize: 12,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

