import React, { useEffect, useMemo, useState, createContext, useContext } from "react";
import TrueGlueLogo from "./assets/TrueGlue Logo - No Text.png";
import ConflictWorkflow from "./components/ConflictWorkflow";
import { TG_COLORS } from "./theme";
import { Button } from "./ui";

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

const appStyle: React.CSSProperties = {
  fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  background: TG_COLORS.bg,
  color: TG_COLORS.text,
  minHeight: "100vh",
};

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

export type MicroHabitId = "gratitude" | "loveMap" | "scriptureVOTD" | "prayer";

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
export const STORAGE_VERSION = 2;

export type UserState = {
  version: number;
  // Narrow types prevent typos; Partial allows adding new keys without breaking old blobs
  completedHabits: Partial<Record<MicroHabitId, string[]>>;
  assessmentScores: Partial<Record<"cooperative" | "avoidant" | "competitive", number>>;
  selectedVerseTopic: VerseTopic;
};

function migrate(old: any): UserState | null {
  // Example scaffold: v1 -> v2 set default selectedVerseTopic
  if (old && typeof old === "object" && old.version === 1) {
    return {
      version: STORAGE_VERSION,
      completedHabits: old.completedHabits ?? {},
      assessmentScores: old.assessmentScores ?? {},
      selectedVerseTopic: "unity",
    };
  }
  return null; // unknown or unsupported version
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
  // Initialize route from hash BEFORE first paint to avoid flashing "Home"
  const initialRoute = ((): TGRoute => {
    if (typeof window === "undefined") return "home";
    const h = window.location.hash.replace("#/", "") as TGRoute;
    return (h as TGRoute) || "home";
  })();

  const [user, setUser] = useState<UserState>(() => loadState());
  const [route, setRoute] = useState<TGRoute>(initialRoute);

  // Persist user state (with pruning)
  useEffect(() => saveState(user), [user]);

  // Minimal hash router for deep-linking/back/forward
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
        const d = todayISO(); // local date
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
      track: (_event, _props) => {
        // Wire up to PostHog/Mixpanel later
      },
    }),
    [user]
  );

  return (
    <div style={appStyle}>
      <div style={containerStyle}>
     <header style={headerStyle}>
  <img
    src={TrueGlueLogo}
    alt="TrueGlue logo"
    style={{
      width: 50,
      height: 50,
      borderRadius: "50%", // circular crop
      objectFit: "cover",  // fills the circle without distortion
      border: `2px solid ${TG_COLORS.accent}`, // same gold border as before
      boxShadow: "0 0 0 2px rgba(212,175,55,0.2)", // same soft glow
    }}
  />
  <div>
    <h1 style={h1Style}>TrueGlue</h1>
    <p style={taglineStyle}>Gospel-centered tools for everyday marriage.</p>
  </div>
</header>


        <Ctx.Provider value={api}>
          <AppTabs route={route} setRoute={setRoute} />
        </Ctx.Provider>

        <Footer />
      </div>
    </div>
  );
}

/* -------------------- TABS + ROUTING (refactored use) -------------------- */
type AppTabsProps = {
  route: TGRoute;
  setRoute: (r: TGRoute) => void;
};

function AppTabs({ route, setRoute }: AppTabsProps) {
  // Compose items (conditionally include Church if enabled)
  const tabItems = React.useMemo<ReadonlyArray<TabItem<TGRoute>>>(() => {
    const base: ReadonlyArray<TabItem<TGRoute>> = [
      { id: "home",         label: "Home",              panel: <Home /> },
      { id: "microhabits",  label: "Micro-Habits",      panel: <MicroHabits /> },
      { id: "lessons",      label: "Lessons",           panel: <Lessons /> },
      { id: "workflow",     label: "Conflict Workflow", panel: <ConflictWorkflow /> },
      { id: "assessments",  label: "Assessments",       panel: <Assessments /> },
      { id: "calm",         label: "Calm",              panel: <CalmTools /> },
    ];
    if (FEATURES.churchMode) {
      const copy = base.slice();
      const calmIndex = copy.findIndex((t) => t.id === "calm");
      copy.splice(calmIndex, 0, { id: "church", label: "Church", panel: <ChurchPanel /> });
      return copy;
    }
    return base;
  }, []);

  // Hash <-> state sync
  const onChange = React.useCallback(
    (id: TGRoute) => {
      window.location.hash = `#/${id}`;
      setRoute(id);
    },
    [setRoute]
  );

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

      <Card title="Scripture — Verse of the Day">
        <div style={{ marginBottom: 10 }}>See Home for your Verse of the Day (topic selectable there).</div>
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

/* -------------------- ASSESSMENTS -------------------- */
function Assessments() {
  const { user, setUser } = useApp();
  const [temp, setTemp] = useState(3); // 1–5 cooperative score (example)

  return (
    <>
      <Card title="Conflict Style (quick check)">
        <div style={{ marginBottom: 8 }}>
          On a scale of 1–5, how cooperative did you feel in your last conflict?
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={temp}
          onChange={(e) => setTemp(parseInt(e.currentTarget.value))}
          aria-label="Cooperative score"
        />
        <div style={{ marginTop: 6 }}>Selected: {temp}</div>
        <button
          type="button"
          onClick={() => {
            const next = {
              ...user,
              assessmentScores: { ...user.assessmentScores, cooperative: temp },
            };
            setUser(next);
          }}
          style={{ ...pillStyle, marginTop: 8, borderColor: TG_COLORS.primary }}
        >
          Save score
        </button>

        <div style={{ marginTop: 10, color: TG_COLORS.textDim, fontSize: 13 }}>
          Last saved: {user.assessmentScores.cooperative ?? "—"}
        </div>
      </Card>

      <Card title="Planned: Full Assessment Battery">
        <div style={{ lineHeight: 1.6 }}>
          We’ll expand to avoidance / competitive indices, plus longitudinal charts.
        </div>
      </Card>
    </>
  );
}

/* -------------------- CALM TOOLS (safer timer) -------------------- */
function CalmTools() {
  const [sec, setSec] = useState(60);
  const [running, setRunning] = useState(false);
  const intervalRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
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
  }, [running]);

  useEffect(() => {
    if (sec === 0 && running) setRunning(false);
  }, [sec, running]);

  const pct = Math.round(((60 - sec) / 60) * 100);

  return (
    <>
      <Card title="1-Minute Breathing">
        <div>Inhale 4 • Hold 4 • Exhale 6 — repeat gently.</div>
        <div style={{ marginTop: 8, fontSize: 32, fontWeight: 800 }} aria-live="polite">
          {sec}s
        </div>
        <div
          aria-hidden
          style={{
            marginTop: 10,
            height: 10,
            borderRadius: 6,
            background: "#F1EDF2",
            overflow: "hidden",
            border: `1px solid ${TG_COLORS.border}`,
          }}
        >
          <div style={{ width: `${pct}%`, height: "100%", background: TG_COLORS.accent }} />
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setSec(60);
              setRunning(true);
            }}
            style={{ ...pillStyle, borderColor: TG_COLORS.primary }}
          >
            Start
          </button>
          <button type="button" onClick={() => setRunning(false)} style={pillStyle}>
            Pause
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setSec(60);
            }}
            style={pillStyle}
          >
            Reset
          </button>
        </div>
      </Card>

      <Card title="Fast Prayer">
        <div>“Lord Jesus, give us patience, humility, and unity. Help us listen well. Amen.”</div>
      </Card>
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

