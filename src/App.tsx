import React, { useEffect, useMemo, useState, createContext, useContext } from "react";
import TrueGlueLogo from "./assets/TrueGlue Logo - No Text.png";
import ConflictWorkflow from "./components/ConflictWorkflow";
import { TG_COLORS, ThemeProvider, useTheme } from "./theme.tsx";
import { createPortal } from "react-dom";

function ThemeTogglePortal() {
  const { theme, toggle, colors } = useTheme();
  const btn = (
    <button
      aria-label="Toggle light/dark theme"
      onClick={toggle}
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 2147483647,
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        color: colors.text,
        cursor: "pointer",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
      {theme === "dark" ? "☾ Dark" : "☀︎ Light"}
    </button>
  );
  return createPortal(btn, document.body);
}


// ===== Conflict Workflow: Types =====
type UserId = "A" | "B";
type ConflictStep =
  | "QUALIFY"
  | "RECIPIENT_REVIEW"
  | "QUESTIONS_SELFCRITIQUE"
  | "CALM_PREPARE"
  | "SCHEDULE"
  | "DECISION_REPAIR"
  | "RESOLVED";

type TestimonyVisibility = "private" | "church" | "community";

type ConflictSession = {
  id: string;
  initiator: UserId;
  recipient: UserId;

  issueSentence?: string;
  issueDetails?: string;
  initiatorAcceptedSingleFocus?: boolean;
  recipientAcceptedSingleFocus?: boolean;

  hasPromptForRecipient?: boolean;
  hasPromptForInitiator?: boolean;

  recipientReviewSummary?: string;
  nonhostileQuestions?: string;
  selfCritique?: string;

  calmShownToInitiator?: boolean;
  calmShownToRecipient?: boolean;

  proposedDate?: string;
  proposedTime?: string;
  proposedDescriptor?: string;
  confirmedDateTimeByRecipient?: boolean;
  rescheduleCount?: number; // max 1

  decisionsAgreements?: string;
  apologiesForgiveness?: string;
  followUpPlan?: string;
  recap?: string;

  testimonyText?: string;
  testimonyVisibility?: TestimonyVisibility;

  step: ConflictStep;
  createdAt: number;
  resolvedAt?: number;
};

// ===== Conflict Workflow: Persistence (localStorage MVP) =====
const LS_CONFLICTS = "trueglue_conflicts_v5";
const loadConflicts = (): ConflictSession[] =>
  JSON.parse(localStorage.getItem(LS_CONFLICTS) || "[]");
const saveConflicts = (items: ConflictSession[]) =>
  localStorage.setItem(LS_CONFLICTS, JSON.stringify(items));

// ===== Conflict Workflow: Utilities =====
const uid = () => Math.random().toString(36).slice(2);
const fmtDateTime = (d: number) =>
  new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// “Gentle start” language guard
const roughPhrases = [
  /you always/i, /you never/i, /whatever/i, /shut up/i, /that’s stupid/i, /that's stupid/i, /as usual/i,
  /everyone knows/i, /obviously/i,
];
const needsGentleStart = (text: string) => !!text && roughPhrases.some((r) => r.test(text));
const gentleTemplate =
  'Try: "I feel ⟨emotion⟩ when ⟨specific event⟩ because ⟨impact⟩. I need ⟨clear ask⟩."';

// iCalendar (.ics) helpers (for proposed/confirmed schedule)
function formatICSDateLocal(dateISO: string, timeHHMM: string) {
  const dt = new Date(`${dateISO}T${timeHHMM || "09:00"}`);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}00`;
}
function addMinutes(hhmm: string, mins: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m + mins, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function escapeICS(s: string) {
  return (s || "").replace(/[\n\r]/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function downloadICS({
  title, description, dateISO, timeHHMM,
}: { title: string; description: string; dateISO?: string; timeHHMM?: string }) {
  const dtStart = dateISO ? formatICSDateLocal(dateISO, timeHHMM || "09:00") : "";
  const dtEnd = dateISO ? formatICSDateLocal(dateISO, timeHHMM ? addMinutes(timeHHMM, 45) : "09:45") : "";
  const body =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TrueGlue//Conflict Meeting//EN
BEGIN:VEVENT
UID:${uid()}
SUMMARY:${escapeICS(title)}
DESCRIPTION:${escapeICS(description)}
${dateISO ? `DTSTART:${dtStart}` : ""}
${dateISO ? `DTEND:${dtEnd}` : ""}
END:VEVENT
END:VCALENDAR
`;
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "trueglue-conflict.ics"; a.click();
  URL.revokeObjectURL(url);
}

/** ============================================================
 *  TRUEGLUE — Unified App (React + TypeScript) • Single-file entry
 *  Design vibe: Made One’s clean layout + TrueGlue color palette
 *  Storage: localStorage (offline-friendly) w/ simple versioning
 *  Routing: minimal hash router (#/home, #/microhabits, etc.)
 *  A11y: WAI-ARIA tabs (tablist/tab/tabpanel), labels, keyboard arrows
 *  ============================================================ */

/* -------------------- THEME (TrueGlue palette) -------------------- */

const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "16px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 0 18px 0",
};

const h1Style: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  letterSpacing: 0.2,
  color: TG_COLORS.logoBlue,
};

const taglineStyle: React.CSSProperties = {
  margin: 0,
  marginTop: -2,
  color: TG_COLORS.textDim,
  fontSize: 13,
};

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  margin: "10px 0 18px",
};

const pillStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${TG_COLORS.border}`,
  background: TG_COLORS.surface,
  cursor: "pointer",
  fontSize: 13,
};

const activePillStyle: React.CSSProperties = {
  ...pillStyle,
  borderColor: TG_COLORS.primary,
  boxShadow: `0 0 0 2px rgba(138,21,56,0.1)`,
};

function PillButton({
  children,
  onClick,
  kind = "outline",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "outline" | "solid";
  disabled?: boolean;
}) {
  const base = {
    ...pillStyle,
    borderColor: TG_COLORS.border,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  } as React.CSSProperties;

  const solid = {
    ...pillStyle,
    background: TG_COLORS.primary,
    color: "#fff",
    borderColor: TG_COLORS.primary,
  } as React.CSSProperties;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      style={kind === "solid" ? solid : base}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/* -------------------- TYPES & DATA MODELS -------------------- */
export type TGRoute =
  | "home"
  | "microhabits"
  | "lessons"
  | "profile"
  | "workflow"
  | "assessments"
  | "calm"
  | "church";

/** Single source of truth for topics (prevents duplicate type declarations) */
export const TOPICS = [
  "patience",
  "forgiveness",
  "unity",
  "kindness",
  "humility",
  "self-control",
] as const;
export type VerseTopic = typeof TOPICS[number];

export type MicroHabitId =
  | "gratitude"
  | "loveMap"
  | "scriptureVOTD"
  | "prayer"
  | "calmBreath";

type UserProfile = {
  displayName?: string;
  email?: string;
  spouseName?: string;
  anniversary?: string; // YYYY-MM-DD
  church?: string;
};

/* -------------------- FEATURE FLAGS (beta-friendly, immutable) -------------------- */
export const FEATURES = Object.freeze({
  churchMode: true,           // B2B leader tools, content packs
  loveMapDaily: true,
  verseOfTheDay: true,
  prayerNudges: true,
  calmBreathing: true,
  conflictWorkflow: true,
  assessments: true,
  lessons: true,
});

/* -------------------- STORAGE (versioned + migration stub) -------------------- */
export const STORAGE_KEY = "trueglue.v2.user";
export const STORAGE_VERSION = 3;

// === Conflict Styles (NEW) ===
type ConflictStyle = "Avoidant" | "Competitive" | "Cooperative";

export type UserState = {
  version: number;
  // Narrow types prevent typos; Partial allows adding new keys without breaking old blobs
  completedHabits: Partial<Record<MicroHabitId, string[]>>;
  assessmentScores: Partial<Record<"cooperative" | "avoidant" | "competitive", number>>;
  selectedVerseTopic: VerseTopic;

  // NEW — results of the conflict style assessment
  stylePrimary?: ConflictStyle;
  styleSecondary?: ConflictStyle;
 
 // NEW
  profile?: UserProfile;
};

function migrate(old: any): UserState | null {
  // Upgrade chain:
  // - v1 -> v3
  // - v2 -> v3
  if (old && typeof old === "object") {
    if (old.version === 1) {
      return {
        version: STORAGE_VERSION,
        completedHabits: old.completedHabits ?? {},
        assessmentScores: old.assessmentScores ?? {},
        selectedVerseTopic: "unity",
        stylePrimary: old.stylePrimary,      // carry if present
        styleSecondary: old.styleSecondary,  // carry if present
      };
    }
    if (old.version === 2) {
      return {
        version: STORAGE_VERSION,
        completedHabits: old.completedHabits ?? {},
        assessmentScores: old.assessmentScores ?? {},
        selectedVerseTopic: old.selectedVerseTopic ?? "unity",
        stylePrimary: old.stylePrimary,
        styleSecondary: old.styleSecondary,
      };
    }
  }
  return null; // unknown or unsupported -> wipe to defaults in loadState()
}

export function loadState(): UserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("none");
    const parsed = JSON.parse(raw);

    if (parsed.version === STORAGE_VERSION) return parsed as UserState;

    const migrated = migrate(parsed);
    if (migrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    // wipe incompatible
    localStorage.removeItem(STORAGE_KEY);
    throw new Error("mismatch");
  } catch {
    return {
      version: STORAGE_VERSION,
      completedHabits: {},
      assessmentScores: {},
      selectedVerseTopic: "unity",
    };
  }
}

export function saveState(next: UserState) {
  try {
    // Optional: prune old habit completions (>180 days) to cap storage growth
    const pruned: UserState = {
      ...next,
      completedHabits: Object.fromEntries(
        Object.entries(next.completedHabits).map(([k, dates]) => {
          const cutoff = dateAdd(todayISO(), -180); // 180 days ago
          return [k, (dates ?? []).filter((d) => d >= cutoff)];
        })
      ) as UserState["completedHabits"],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // LocalStorage can throw in private mode; ignore but consider telemetry here
  }
}

/* -------------------- SEED CONTENT -------------------- */
export const SeedVersesByTopic: Record<VerseTopic, { ref: string; text: string }[]> = {
  patience: [
    { ref: "James 1:19", text: "Let every person be quick to hear, slow to speak, slow to anger..." },
    { ref: "Proverbs 15:1", text: "A soft answer turns away wrath, but a harsh word stirs up anger." },
  ],
  forgiveness: [
    { ref: "Ephesians 4:32", text: "Be kind to one another... forgiving one another, as God in Christ forgave you." },
    { ref: "Colossians 3:13", text: "As the Lord has forgiven you, so you also must forgive." },
  ],
  unity: [
    { ref: "Ephesians 4:3", text: "Eager to maintain the unity of the Spirit in the bond of peace." },
    { ref: "Philippians 2:2", text: "Complete my joy by being of the same mind, same love, full accord." },
  ],
  kindness: [
    { ref: "Proverbs 3:3", text: "Do not let kindness and truth leave you..." },
  ],
  humility: [
    { ref: "Philippians 2:3", text: "Do nothing from selfish ambition... but in humility count others more significant." },
  ],
  "self-control": [
    { ref: "Galatians 5:22–23", text: "The fruit of the Spirit is love, joy, peace... self-control." },
  ],
};

const LoveMapQuestions = [
  "What’s one thing you’re looking forward to this week?",
  "What would make you feel cared for today?",
  "What’s a small win we can celebrate together?",
  "Is anything weighing on you that I can help with?",
];

const PrayerNudges = [
  "30-second prayer: ‘Lord, unite our hearts and quiet our anxieties. Amen.’",
  "Pray Psalm 23 aloud together (just a few lines).",
  "Pray gratitude: each of you thanks God for 1 specific thing about the other.",
];

const LessonsIndex = [
  {
    id: "biblical_submission",
    title: "Biblical Submission vs Cultural Ideas",
    estMin: 10,
    outline: [
      "Definition from Eph 5:21–33 (mutuality and Christlike love).",
      "Greek notes: hypotassō, voluntary ordering; not inferiority.",
      "Pastoral cautions (abuse never justified).",
    ],
    scriptures: ["Eph 5:21-33", "1 Pet 3:1-7", "Phil 2:3-8"],
    commentaryRefs: [
      "Kostenberger, “God’s Design for Man and Woman”",
      "Carson & Moo, NT Intro (context notes)",
    ],
  },
  {
    id: "theology_of_sin",
    title: "Theology of Sin (Hamartiology) and Repair",
    estMin: 12,
    outline: [
      "Nature of sin: missing the mark (hamartia), rebellion (pashaʿ).",
      "Relational fracture & reconciliation in Christ.",
      "Practical confession & repentance rhythms for couples.",
    ],
    scriptures: ["Rom 3:23", "1 John 1:9", "Ps 51"],
    commentaryRefs: ["Grudem, Systematic Theology (Hamartiology sections)"],
  },
];

// === Style-specific coaching tips (NEW) ===
const STYLE_TIPS: Record<ConflictStyle, string[]> = {
  Avoidant: [
    "Name the issue—don’t delay.",
    "Schedule the talk, don’t escape.",
    "Use “I feel…” to enter gently.",
  ],
  Competitive: [
    "Understand before being understood.",
    "Ask two curious questions first.",
    "Affirm feelings; win together.",
  ],
  Cooperative: [
    "Summarize first, invite correction.",
    "Brainstorm options together.",
    "Pray briefly before deciding.",
  ],
};

// === Conflict Style Assessment Questions (NEW) ===
type Q = { id: string; prompt: string; options: { label: string; style: ConflictStyle }[] };

const ASSESSMENT: Q[] = [
  { id: uid(), prompt: "When conflict appears suddenly, I usually…", options: [
    { label: "Change the subject or cool off alone", style:"Avoidant" },
    { label: "Make my case quickly and firmly", style:"Competitive" },
    { label: "Clarify goals and ask questions", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "If my spouse raises their voice, I…", options: [
    { label: "Go quiet / shut down", style:"Avoidant" },
    { label: "Match energy to be heard", style:"Competitive" },
    { label: "Slow the pace and seek calm", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "I feel most uncomfortable when…", options: [
    { label: "We’re stuck in a tense talk", style:"Avoidant" },
    { label: "My point doesn’t land", style:"Competitive" },
    { label: "We misunderstand each other", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "My first sentence in conflict is often…", options: [
    { label:"“It’s not a big deal.”", style:"Avoidant" },
    { label:"“Here’s what’s wrong.”", style:"Competitive" },
    { label:"“Help me understand…”", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "Deadlines or pressure make me…", options: [
    { label:"Withdraw to think", style:"Avoidant" },
    { label:"Take charge decisively", style:"Competitive" },
    { label:"List options collaboratively", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "When my feelings are hurt, I…", options: [
    { label:"Numb out / distract", style:"Avoidant" },
    { label:"Defend strongly", style:"Competitive" },
    { label:"Name it and invite repair", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "During tough talks, I track…", options: [
    { label:"Exit routes / breaks", style:"Avoidant" },
    { label:"Errors / inconsistencies", style:"Competitive" },
    { label:"Common ground / next steps", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "After conflict, I usually…", options: [
    { label:"Prefer not to revisit it", style:"Avoidant" },
    { label:"Feel I should have pushed more", style:"Competitive" },
    { label:"Debrief for learning & grace", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "In group decisions, I…", options: [
    { label:"Let others choose", style:"Avoidant" },
    { label:"Advocate strongly", style:"Competitive" },
    { label:"Facilitate consensus", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "If plans change last minute…", options: [
    { label:"Relief to avoid conflict", style:"Avoidant" },
    { label:"Push to keep original plan", style:"Competitive" },
    { label:"Renegotiate expectations", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "When my spouse is emotional…", options: [
    { label:"I give space silently", style:"Avoidant" },
    { label:"I try to fix it fast", style:"Competitive" },
    { label:"I validate first, then explore", style:"Cooperative" },
  ]},
  { id: uid(), prompt: "I feel proud after conflict when…", options: [
    { label:"I stayed out of drama", style:"Avoidant" },
    { label:"I proved my point", style:"Competitive" },
    { label:"We understood each other", style:"Cooperative" },
  ]},
];

/* -------------------- UTILITIES (local-date correctness + DST-proof seed) -------------------- */
export function todayISO() {
  // Local calendar date (YYYY-MM-DD) — avoids UTC midnight issues
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localDaySeed() {
  // DST-proof: build a YYYYMMDD integer instead of dividing milliseconds
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return Number(`${y}${m}${day}`); // e.g., 20250918
}

function dateAdd(isoYYYYMMDD: string, deltaDays: number) {
  const [y, m, d] = isoYYYYMMDD.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function randIndex<T>(arr: T[], seed: number) {
  return arr.length ? seed % arr.length : 0;
}

/* -------------------- CONTEXT -------------------- */
type AppCtx = {
  user: UserState;
  setUser(u: UserState): void;
  completeHabit(id: MicroHabitId): void;
  setVerseTopic(t: VerseTopic): void;
  track(event: string, props?: Record<string, any>): void; // stubbed instrumentation
};

const Ctx = createContext<AppCtx | null>(null);
function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("Ctx missing");
  return v;
}

/* -------------------- REUSABLE ACCESSIBLE TABS (INLINE) -------------------- */
/** Generic Tab APIs */
export type TabItem<ID extends string> = {
  id: ID;
  label: string;
  panel: React.ReactNode;
};

type TabsProps<ID extends string> = {
  label?: string;                 // aria-label for the tablist
  value: ID;                      // current active tab id
  onChange: (id: ID) => void;     // handler when tab changes
  items: ReadonlyArray<TabItem<ID>>;
  className?: string;
  pillStyle?: React.CSSProperties;
  activePillStyle?: React.CSSProperties;
};

/**
 * Accessible Tabs with:
 * - WAI-ARIA roles/attrs (tablist, tab, tabpanel, aria-selected, aria-controls, aria-labelledby)
 * - ArrowLeft/ArrowRight keyboard navigation (loops)
 * - Controlled value/onChange
 * Panels are mounted but hidden when inactive (stable layout; easy state retention).
 */
function Tabs<ID extends string>({
  label = "Tabs",
  value,
  onChange,
  items,
  className,
  pillStyle: pillS,
  activePillStyle: activePillS,
}: TabsProps<ID>) {
  const order = React.useMemo(() => items.map((i) => i.id), [items]);

  const focusTab = (id: ID) => {
    const el = document.getElementById(`tab-${id}`);
    (el as HTMLButtonElement | null)?.focus();
  };

  const move = (dir: 1 | -1) => {
    const idx = order.indexOf(value);
    const next = order[(idx + dir + order.length) % order.length] as ID;
    onChange(next);
    focusTab(next);
  };

  return (
    <div className={className}>
      <nav
        role="tablist"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          else if (e.key === "ArrowLeft") move(-1);
        }}
        style={navStyle}
      >
        {items.map((t) => {
          const active = value === t.id;
          const tabId = `tab-${t.id}`;
          const panelId = `panel-${t.id}`;
          return (
            <button
              key={t.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              onClick={() => onChange(t.id)}
              style={active ? activePillS ?? activePillStyle : pillS ?? pillStyle}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {items.map((t) => {
        const active = value === t.id;
        const panelId = `panel-${t.id}`;
        const tabId = `tab-${t.id}`;
        return (
          <div
            key={t.id}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            tabIndex={0}
            hidden={!active}
          >
            {active ? t.panel : null}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------- ROOT -------------------- */
export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  // Initialize route from hash BEFORE first paint to avoid flashing "Home"
  const initialRoute = ((): TGRoute => {
    if (typeof window === "undefined") return "home";
    const h = window.location.hash.replace("#/", "") as TGRoute;
    return (h as TGRoute) || "home";
  })();

  const { colors } = useTheme();

  const appStyle: React.CSSProperties = {
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    background: colors.bg,
    color: colors.text,
    minHeight: "100vh",
  };

  const [user, setUser] = useState<UserState>(() => loadState());
  const [route, setRoute] = useState<TGRoute>(initialRoute);

  useEffect(() => saveState(user), [user]);

  useEffect(() => {
    const applyHash = () => {
      const r = window.location.hash.replace("#/", "") as TGRoute;
      if (r) setRoute(r);
    };
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const api = useMemo<AppCtx>(
    () => ({
      user,
      setUser,
      completeHabit: (id) => {
        const d = todayISO();
        const p = user.completedHabits[id] ?? [];
        if (!p.includes(d)) {
          const next = {
            ...user,
            completedHabits: {
              ...user.completedHabits,
              [id]: [...p, d],
            },
          };
          setUser(next);
        }
      },
      setVerseTopic: (t) => setUser({ ...user, selectedVerseTopic: t }),
      track: (_event, _props) => {},
    }),
    [user]
  );

  return (
    <>
      <ThemeTogglePortal />

      <div style={appStyle}>
        <div style={containerStyle}>
          <header style={headerStyle}>
            <img
              src={TrueGlueLogo}
              alt="TrueGlue logo"
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                objectFit: "cover",
                border: `2px solid ${colors.accent}`,
                boxShadow: "0 0 0 2px rgba(212,175,55,0.2)",
              }}
            />
            <div>
              <h1 style={h1Style}>TrueGlue</h1>
              <p style={{ ...taglineStyle, color: colors.textDim }}>
                Gospel-centered tools for everyday marriage.
              </p>
            </div>
          </header>

          <Ctx.Provider value={api}>
            <AppTabs route={route} setRoute={setRoute} />
          </Ctx.Provider>

          <Footer />
        </div>
      </div>
    </>
  );
}

/* -------------------- TABS + ROUTING (refactored use) -------------------- */
type AppTabsProps = {
  route: TGRoute;
  setRoute: (r: TGRoute) => void;
};

function AppTabs({ route, setRoute }: AppTabsProps) {
  const tabItems = React.useMemo<ReadonlyArray<TabItem<TGRoute>>>(() => {
    const base: ReadonlyArray<TabItem<TGRoute>> = [
      { id: "home",         label: "Home",              panel: <Home /> },
      { id: "microhabits",  label: "Micro-Habits",      panel: <MicroHabits /> },
      { id: "lessons",      label: "Lessons",           panel: <Lessons /> },
      { id: "workflow",     label: "Conflict Workflow", panel: <ConflictWorkflow /> },
      { id: "assessments",  label: "Assessments",       panel: <Assessments /> },
      { id: "profile",      label: "Profile",           panel: <Profile /> },
    ];

    if (FEATURES.churchMode) {
      // insert “Church” after Lessons for visibility
      const copy = base.slice();
      const idx = copy.findIndex(t => t.id === "lessons");
      copy.splice(idx + 1, 0, { id: "church", label: "Church", panel: <ChurchPanel /> });
      return copy;
    }
    return base;
  }, []);

  const onChange = React.useCallback((id: TGRoute) => {
    window.location.hash = `#/${id}`;
    setRoute(id);
  }, [setRoute]);

  return (
    <Tabs
      label="Primary"
      value={route}
      onChange={onChange}
      items={tabItems}
      pillStyle={pillStyle}
      activePillStyle={activePillStyle}
    />
  );
}

// === CoachTips (NEW) — style-aware tip list ===
function CoachTips({
  primary,
  secondary,
}: {
  primary?: ConflictStyle;
  secondary?: ConflictStyle;
}) {
  const tips = [
    ...(primary ? STYLE_TIPS[primary] : []),
    ...(secondary && secondary !== primary ? STYLE_TIPS[secondary] : []),
  ].slice(0, 5);

  if (!tips.length) {
    return (
      <div style={{ color: TG_COLORS.textDim, fontSize: 13 }}>
        Take the assessment to unlock personalized tips.
      </div>
    );
  }

  return (
    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
      {tips.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

/* -------------------- HOME -------------------- */
function Card(p: React.PropsWithChildren<{ title: string; sub?: string }>) {
  return (
    <section
      style={{
        background: TG_COLORS.surface,
        border: `1px solid ${TG_COLORS.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16 }}>{p.title}</h3>
      {p.sub && <p style={{ marginTop: 4, color: TG_COLORS.textDim }}>{p.sub}</p>}
      <div style={{ marginTop: 10 }}>{p.children}</div>
    </section>
  );
}

function Home() {
  const { user, setVerseTopic } = useApp();
  const day = new Date();
  const dayIndex = localDaySeed(); // local-seeded & DST-proof

  // Verse of the Day (deterministic by day & topic)
  const verses = SeedVersesByTopic[user.selectedVerseTopic] || [];
  const v = verses.length ? verses[randIndex(verses, dayIndex)] : null;

  return (
    <>
      <Card title="Verse of the Day" sub={`Topic: ${user.selectedVerseTopic}`}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setVerseTopic(t)}
              style={{
                ...pillStyle,
                borderColor: t === user.selectedVerseTopic ? TG_COLORS.primary : TG_COLORS.border,
              }}
              aria-pressed={t === user.selectedVerseTopic}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12, lineHeight: 1.5 }}>
          {v ? (
            <>
              <blockquote style={{ margin: 0, fontSize: 15 }}>{v.text}</blockquote>
              <div style={{ marginTop: 6, color: TG_COLORS.textDim }}>{v.ref}</div>
            </>
          ) : (
            <em>Add verses to this topic to enable VOTD.</em>
          )}
        </div>
      </Card>

      <Card title="Today’s Helpful Things" sub={day.toLocaleDateString()}>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Try a <strong>Gratitude</strong> nudge: send one line of thanks to your spouse.</li>
          <li>Answer the <strong>Love Map</strong> question of the day.</li>
          <li>Pray a <strong>30-second</strong> prayer together.</li>
        </ul>
      </Card>
    </>
  );
}

/* -------------------- MICRO-HABITS -------------------- */
function HabitRow({ id, title, tip }: { id: MicroHabitId; title: string; tip: string }) {
  const { user, completeHabit } = useApp();
  const done = (user.completedHabits[id] ?? []).includes(todayISO());
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "10px 12px",
        border: `1px solid ${TG_COLORS.border}`,
        borderRadius: 10,
        background: TG_COLORS.surface,
        marginBottom: 8,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 6,
          background: done ? TG_COLORS.success : TG_COLORS.border,
        }}
      />
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 13, color: TG_COLORS.textDim }}>{tip}</div>
      </div>
      <button
        type="button"
        onClick={() => completeHabit(id)}
        disabled={done}
        style={{
          ...pillStyle,
          background: done ? "#F2F6F2" : TG_COLORS.surface,
          borderColor: done ? TG_COLORS.success : TG_COLORS.border,
          cursor: done ? "default" : "pointer",
        }}
        aria-label={done ? `${title} completed` : `Mark ${title} done`}
      >
        {done ? "Done" : "Mark done"}
      </button>
    </div>
  );
}

function MicroHabits() {
  const dayIndex = localDaySeed();
  const loveMap = LoveMapQuestions[randIndex(LoveMapQuestions, dayIndex)];
  const prayer = PrayerNudges[randIndex(PrayerNudges, dayIndex)];
  const [openCalm, setOpenCalm] = React.useState(false);

  return (
    <>
      <Card title="Gratitude">
        <HabitRow
          id="gratitude"
          title="Send one line of thanks"
          tip='Text your spouse: “Thank you for ____.”'
        />
      </Card>

      <Card title="Love Map — Question of the Day">
        <div style={{ marginBottom: 10, fontWeight: 600 }}>{loveMap}</div>
        <HabitRow id="loveMap" title="Answer together" tip="Keep it under 2 minutes." />
      </Card>

      <Card title="Prayer Nudge">
        <div style={{ marginBottom: 10 }}>{prayer}</div>
        <HabitRow id="prayer" title="Pray for 30 seconds" tip="Short and sincere." />
      </Card>

      {/* NEW: Calm — Breathe micro-habit */}
      <Card title="Calm — Breathe" sub="Calm the nervous system, reduce stress, improve mental clarity">
        <div style={{ marginBottom: 10 }}>
          Inhale 4 • Hold 4 • Exhale 6 — repeat gently. You can proceed at any time.
        </div>
        <div style={{ marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => setOpenCalm(true)}
            style={{ ...pillStyle, borderColor: TG_COLORS.primary }}
          >
            Open Calm Timer
          </button>
        </div>
        <HabitRow
          id="calmBreath"
          title="Do a 60-second breathe"
          tip="Open the timer, take 3–6 slow cycles, then mark done."
        />

        <CalmBreathModal
          open={openCalm}
          onClose={() => setOpenCalm(false)}
          onProceed={() => setOpenCalm(false)}
          seconds={60}
          scripture="James 1:19–20 — Be quick to listen, slow to speak, slow to anger; for human anger does not produce the righteousness of God."
        />
      </Card>

      <Card title="Scripture — Verse of the Day">
        <div style={{ marginBottom: 10 }}>
          See Home for your Verse of the Day (topic selectable there).
        </div>
        <HabitRow id="scriptureVOTD" title="Read it together" tip="Ask: What stands out? Why?" />
      </Card>
    </>
  );
}

/* -------------------- LESSONS -------------------- */
function Lessons() {
  return (
    <>
      {LessonsIndex.map((lsn) => (
        <Card
          key={lsn.id}
          title={lsn.title}
          sub={`${lsn.estMin} min • Scriptures: ${lsn.scriptures.join(", ")}`}
        >
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {lsn.outline.map((pt, i) => (
              <li key={i} style={{ lineHeight: 1.6 }}>
                {pt}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 8, fontSize: 13, color: TG_COLORS.textDim }}>
            Commentaries / authors to consult: {lsn.commentaryRefs.join("; ")}
          </div>
        </Card>
      ))}
      <Card title="Add More Lessons">
        <div>Drop new items into <code>LessonsIndex</code> (id, title, outline, scriptures, commentaryRefs).</div>
      </Card>
    </>
  );
}

// === Assessment (NEW) — multi-question conflict style flow ===
function Assessment({
  onClose,
  onFinish,
}: {
  onClose: () => void;
  onFinish: (primary: ConflictStyle, secondary: ConflictStyle) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, ConflictStyle>>({});
  const [i, setI] = useState(0);
  const q = ASSESSMENT[i];
  const done = Object.keys(answers).length === ASSESSMENT.length;

  const choose = (style: ConflictStyle) => {
    setAnswers((a) => ({ ...a, [q.id]: style }));
    if (i < ASSESSMENT.length - 1) setI(i + 1);
  };

  const compute = () => {
    const score: Record<ConflictStyle, number> = {
      Avoidant: 0,
      Competitive: 0,
      Cooperative: 0,
    };
    Object.values(answers).forEach((s) => (score[s]++));
    const sorted = (Object.keys(score) as ConflictStyle[]).sort(
      (a, b) => score[b] - score[a]
    );
    onFinish(sorted[0], sorted[1]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        border: `1px solid ${TG_COLORS.border}`,
        borderRadius: 12,
        padding: 16,
        background: TG_COLORS.surface,
        color: TG_COLORS.text,
        marginTop: 12,
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
      >
        <h3 style={{ margin: 0 }}>Conflict Style Assessment</h3>
        <button
          type="button"
          onClick={onClose}
          style={{ ...pillStyle, background: "transparent", borderColor: TG_COLORS.border }}
        >
          Close
        </button>
      </div>

      {!done ? (
        <>
          <div style={{ marginTop: 10, fontWeight: 700 }}>
            Question {i + 1} of {ASSESSMENT.length}
          </div>
          <div style={{ marginTop: 8, fontSize: 16, lineHeight: 1.5 }}>{q.prompt}</div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {q.options.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => choose(o.style)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${TG_COLORS.border}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: TG_COLORS.surface,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: TG_COLORS.textDim }}>
            Your answers determine your primary and secondary styles.
          </div>
        </>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>All done!</div>
          <button
            type="button"
            onClick={compute}
            style={{
              background: TG_COLORS.accent,
              color: "#000",
              border: "none",
              borderRadius: 10,
              padding: "12px 16px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            See Results
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------- PROFILE -------------------- */
function Profile() {
  const { user, setUser } = useApp();

  // Initialize form from saved profile or defaults
  const [form, setForm] = React.useState<UserProfile>(() => ({
    displayName: user.profile?.displayName ?? "",
    email:       user.profile?.email ?? "",
    spouseName:  user.profile?.spouseName ?? "",
    anniversary: user.profile?.anniversary ?? "",
    church:      user.profile?.church ?? "",
  }));

  const [saved, setSaved] = React.useState(false);

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    setUser({ ...user, profile: { ...form } });
    setSaved(true);
  }

  function clearProfile() {
    setForm({ displayName: "", email: "", spouseName: "", anniversary: "", church: "" });
    setUser({ ...user, profile: {} });
    setSaved(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: `1px solid ${TG_COLORS.border}`,
    background: TG_COLORS.surface,
    fontSize: 14,
  };

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  };

  return (
    <>
      <Card title="Your Profile" sub="Used to personalize experiences and church features.">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={rowStyle}>
            <label>
              <div style={{ fontSize: 13, color: TG_COLORS.textDim, marginBottom: 4 }}>Display name</div>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update("displayName", e.currentTarget.value)}
                style={inputStyle}
                placeholder="e.g., Ryan"
              />
            </label>
            <label>
              <div style={{ fontSize: 13, color: TG_COLORS.textDim, marginBottom: 4 }}>Email</div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.currentTarget.value)}
                style={inputStyle}
                placeholder="you@example.com"
              />
            </label>
          </div>

          <div style={rowStyle}>
            <label>
              <div style={{ fontSize: 13, color: TG_COLORS.textDim, marginBottom: 4 }}>Spouse name</div>
              <input
                type="text"
                value={form.spouseName}
                onChange={(e) => update("spouseName", e.currentTarget.value)}
                style={inputStyle}
                placeholder="e.g., Taylor"
              />
            </label>
            <label>
              <div style={{ fontSize: 13, color: TG_COLORS.textDim, marginBottom: 4 }}>Anniversary</div>
              <input
                type="date"
                value={form.anniversary}
                onChange={(e) => update("anniversary", e.currentTarget.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <label>
            <div style={{ fontSize: 13, color: TG_COLORS.textDim, marginBottom: 4 }}>Church</div>
            <input
              type="text"
              value={form.church}
              onChange={(e) => update("church", e.currentTarget.value)}
              style={inputStyle}
              placeholder="e.g., Redemption Church"
            />
          </label>

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={save} style={{ ...pillStyle, borderColor: TG_COLORS.primary }}>
              Save
            </button>
            <button type="button" onClick={clearProfile} style={pillStyle}>
              Clear
            </button>
            {saved && <div style={{ alignSelf: "center", color: TG_COLORS.textDim, fontSize: 13 }}>Saved ✅</div>}
          </div>
        </div>
      </Card>

      <Card title="How Profile is Used">
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Personalized greetings and suggestions.</li>
          <li>Future: leader/church features (group assignments, summaries).</li>
          <li>All data stays on this device for now (localStorage).</li>
        </ul>
      </Card>
    </>
  );
}

/* -------------------- ASSESSMENTS -------------------- */
function Assessments() {
  const { user, setUser } = useApp();
  const [show, setShow] = useState(false);

  return (
    <>
      <Card title="Your Conflict Style">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...pillStyle, borderColor: TG_COLORS.border }}>
            Primary: {user.stylePrimary ?? "—"}
          </span>
          <span style={{ ...pillStyle, borderColor: TG_COLORS.border }}>
            Secondary: {user.styleSecondary ?? "—"}
          </span>
        </div>

        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setShow(true)}
            style={{ ...pillStyle, borderColor: TG_COLORS.primary }}
          >
            {user.stylePrimary ? "Retake Assessment" : "Take Assessment"}
          </button>
        </div>

        {/* Personalized tips inline */}
        <div style={{ marginTop: 14 }}>
          <CoachTips primary={user.stylePrimary} secondary={user.styleSecondary} />
        </div>
      </Card>

      {show && (
        <Assessment
          onClose={() => setShow(false)}
          onFinish={(primary, secondary) => {
            setUser({ ...user, stylePrimary: primary, styleSecondary: secondary });
            setShow(false);
          }}
        />
      )}
    </>
  );
}

/** =================== CalmBreathModal (animated calm timer) =================== */
function CalmBreathModal({
  open,
  onClose,
  onProceed,
  seconds = 60,
  scripture = "James 1:19–20 — Be quick to listen, slow to speak, slow to anger; for human anger does not produce the righteousness of God.",
}: {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;           // proceed anytime
  seconds?: number;
  scripture?: string;
}) {
  const [sec, setSec] = React.useState(seconds);
  const [running, setRunning] = React.useState(true);
  const intervalRef = React.useRef<number | null>(null);

  // Reset each time it opens
  React.useEffect(() => {
    if (!open) return;
    setSec(seconds);
    setRunning(true);
  }, [open, seconds]);

  // Safe interval management
  React.useEffect(() => {
    if (!open || !running) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, running]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <style>{`
        @keyframes tg-breathe {
          0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(138,21,56,.14); }
          50%  { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(138,21,56,.08); }
          100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(138,21,56,.14); }
        }
      `}</style>

      <div
        style={{
          maxWidth: 640,
          width: "100%",
          background: TG_COLORS.surface,
          border: `1px solid ${TG_COLORS.border}`,
          borderRadius: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          color: TG_COLORS.text,
          padding: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}></h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              ...pillStyle,
              background: "transparent",
              borderColor: TG_COLORS.border,
            }}
          >
            ✕
          </button>
        </div>

        {/* Ring */}
        <div style={{ display: "grid", placeItems: "center", padding: "14px 0 6px" }}>
          <div
            aria-label="Breathing animation"
            style={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              border: `4px solid ${TG_COLORS.primary}`,
              display: "grid",
              placeItems: "center",
              animation: "tg-breathe 6s ease-in-out infinite",
              background: "transparent",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>Breathe</div>
          </div>
        </div>

        {/* Timer + controls */}
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{sec}s</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onProceed}
              style={{ ...pillStyle, borderColor: TG_COLORS.primary }}
            >
              Proceed
            </button>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              style={pillStyle}
            >
              {running ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setSec(seconds);
              }}
              style={pillStyle}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Scripture line */}
        <p style={{ color: TG_COLORS.textDim, textAlign: "center", marginTop: 14, marginBottom: 6 }}>
          {scripture}
        </p>
      </div>
    </div>
  );
}

/* -------------------- CALM TOOLS (breathing modal) -------------------- */
function CalmTools() {
  const [open, setOpen] = React.useState(true); // auto-open when visiting the Calm tab

  return (
    <>
      {/* A simple card that lets users reopen the modal */}
      <Card title="Calm — Breathe & Pray">
        <div style={{ lineHeight: 1.6 }}>
          Use this before a tough conversation. You can proceed at any time—you don’t have to wait the full 60 seconds.
        </div>
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{ ...pillStyle, borderColor: TG_COLORS.primary }}
          >
            Open Calm Timer
          </button>
        </div>
      </Card>

      <CalmBreathModal
        open={open}
        onClose={() => setOpen(false)}
        onProceed={() => setOpen(false)}
        seconds={60}
        scripture="James 1:19–20 — Be quick to listen, slow to speak, slow to anger; for human anger does not produce the righteousness of God."
      />
    </>
  );
}


/* -------------------- CHURCH / B2B -------------------- */
function ChurchPanel() {
  if (!FEATURES.churchMode) {
    return (
      <Card title="Church features">
        <em>Disabled. Toggle FEATURES.churchMode to enable.</em>
      </Card>
    );
  }

  return (
    <>
      <Card title="Leader Mode (Preview)">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Small-group content packs (lessons + prompts + micro-habits).</li>
          <li>Anonymous engagement metrics (habit completion %, lesson opens).</li>
          <li>Export weekly summary for pastors/leaders.</li>
        </ul>
      </Card>

      <Card title="Acceptance Criteria (Ship-Ready)">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Leaders can assign a weekly lesson + auto micro-habit set.</li>
          <li>Participants see a single “This Week” page tailored by leader.</li>
          <li>Metrics show % of group who: opened lesson, marked 2 micro-habits/day.</li>
        </ul>
      </Card>
    </>
  );
}

/* -------------------- FOOTER -------------------- */
function Footer() {
  return (
    <div style={{ marginTop: 24, padding: "24px 0", color: TG_COLORS.textDim, fontSize: 12 }}>
      <div>© {new Date().getFullYear()} TrueGlue. For marriage health and unity.</div>
    </div>
  );
}
