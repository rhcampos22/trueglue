// App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Button, TabPill } from "./ui";

/**
 * TrueGlue – Single-file React + TypeScript demo (no deps)
 * New in this version:
 *  - .ics calendar export for proposed/confirmed times
 *  - One-time reschedule (either spouse requests, initiator re-proposes)
 *  - Reduced Motion toggle (global, persisted)
 *  - Always-visible “Abuse resources” modal from footer
 *  - Testimony Corner on resolved conflicts (private / church-only / community)
 *  - Keeps all prior improvements (safety banner, calm & prepare, CSV export, tips, a11y)
 *
 * Paste into src/App.tsx in a React+TS template (Replit works).
 */

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
  rescheduleCount?: number; // NEW: max 1
  decisionsAgreements?: string;
  apologiesForgiveness?: string;
  followUpPlan?: string;
  recap?: string;
  testimonyText?: string; // NEW
  testimonyVisibility?: TestimonyVisibility; // NEW
  step: ConflictStep;
  createdAt: number;
  resolvedAt?: number;
};

type Lesson = { id: string; title: string; description: string; body: string };
type Scripture = { ref: string; text: string; topics: string[] };

type Theme = typeof themeDark;
type ThemeName = "dark" | "light";

/* ----------------------------- THEME ---------------------------------- */

const focusRing = "0 0 0 3px rgba(47,165,165,.35)";

const themeDark = {
  bg: "#0B0D10",
  bgGrad:
    "linear-gradient(180deg, rgba(11,13,16,1) 0%, rgba(11,13,16,0.92) 65%, rgba(11,13,16,0.88) 100%)",
  card: "#111318",
  soft: "#2A2F36",
  text: "#F4F6F8",
  muted: "#A8AFB9",
  primary: "#2FA5A5",
  primary600: "#2A9595",
  accent: "#C7A13A",
  success: "#3BB273",
  danger: "#E85C5C",
  shadow: "0 10px 28px rgba(0,0,0,0.35)",
};

const themeLight = {
  bg: "#F7F9FC",
  bgGrad:
    "linear-gradient(180deg, rgba(247,249,252,1) 0%, rgba(247,249,252,0.92) 65%, rgba(247,249,252,0.88) 100%)",
  card: "#FFFFFF",
  soft: "#E4E8EE",
  text: "#1B1F24",
  muted: "#5B6675",
  primary: "#2FA5A5",
  primary600: "#2A9595",
  accent: "#C7A13A",
  success: "#2E8F63",
  danger: "#CC5151",
  shadow: "0 10px 28px rgba(0,0,0,0.08)",
};

/* -------------------------- STATIC CONTENT ---------------------------- */

const seedLessons: Lesson[] = [
  {
    id: "gen-2-3-design",
    title: "God’s Design for Marriage (Gen 2–3)",
    description:
      "God’s covenant design for unity, complementarity, and stewardship in marriage.",
    body:
      "In Genesis 2–3, God forms a union of two becoming one flesh—mutual help, shared purpose, and trust in God’s word. Sin distorts this unity with blame and shame, but the gospel restores covenant love.\n\nPractical: Name good in one another daily, pray together, share responsibility.",
  },
  {
    id: "eph-5-mutual-submission",
    title: "Mutual Submission (Eph 5)",
    description:
      "What it means to submit to one another out of reverence for Christ.",
    body:
      "Ephesians 5 frames marriage as a picture of Christ and the Church. Mutual submission begins with surrender to Christ. Husbands love sacrificially; wives respond with respect. Both emulate Christ.\n\nPractical: Ask, “How can I serve you this week?” and schedule it.",
  },
  {
    id: "intimacy-1cor7",
    title: "Sexual Intimacy (1 Cor 7)",
    description:
      "Pursuing unity, generosity, and care in marital intimacy.",
    body:
      "1 Corinthians 7 urges mutuality and consideration. Intimacy thrives under trust and service, not entitlement.\n\nPractical: Discuss needs kindly, agree on rhythms, protect time from distractions.",
  },
  {
    id: "four-horsemen",
    title: "Four Horsemen vs. Biblical Love",
    description:
      "Contrast criticism, contempt, defensiveness, stonewalling with 1 Cor 13 love.",
    body:
      "Replace criticism with gentle starts; contempt with honor; defensiveness with ownership; stonewalling with regulated breaks.\n\nPray for a patient and kind spirit (1 Cor 13).",
  },
  {
    id: "conflict-types",
    title: "Conflict Types (Littlejohn)",
    description:
      "Understanding conflict types to choose wiser responses.",
    body:
      "Clarify whether conflict is about values, data, interests, or structure. Respond with listening, shared definitions, and collaborative problem-solving.",
  },
  {
    id: "love-maps",
    title: "Love Maps & Curiosity",
    description:
      "Build knowledge of your spouse’s inner world as a daily habit.",
    body:
      "Curiosity disarms conflict. Ask small, daily questions; take notes. Practice appreciative inquiry: “Tell me more about…”",
  },
  {
    id: "dopamine-attention",
    title: "Dopamine & Attention Stewardship",
    description:
      "Reclaim attention from distraction to invest in your marriage.",
    body:
      "Set phone-free zones, sabbath screens together, and create rituals of connection. Attention is love made visible.",
  },
];

const seedScriptures: Scripture[] = [
  {
    ref: "Colossians 3:14",
    text:
      "And above all these put on love, which binds everything together in perfect harmony.",
    topics: ["unity", "love", "glue"],
  },
  {
    ref: "James 1:19–20",
    text:
      "Let every person be quick to hear, slow to speak, slow to anger; for the anger of man does not produce the righteousness of God.",
    topics: ["qualification", "anger", "listening"],
  },
  {
    ref: "Proverbs 12:18",
    text:
      "There is one whose rash words are like sword thrusts, but the tongue of the wise brings healing.",
    topics: ["disclosure", "speech"],
  },
  {
    ref: "Philippians 2:4",
    text:
      "Let each of you look not only to his own interests, but also to the interests of others.",
    topics: ["review", "empathy"],
  },
  {
    ref: "Colossians 3:13",
    text:
      "Bear with each other and forgive one another... Forgive as the Lord forgave you.",
    topics: ["repair", "forgiveness"],
  },
  {
    ref: "1 Peter 4:8",
    text:
      "Above all, keep loving one another earnestly, since love covers a multitude of sins.",
    topics: ["love", "covering", "hope"],
  },
];

/* --------------------------- STORAGE HELPERS -------------------------- */

const LS_CONFLICTS = "trueglue_conflicts_v5";
const LS_THEME = "trueglue_theme";
const LS_STYLES = "trueglue_styles_v1";
const LS_PREFS = "trueglue_prefs_v1"; // reduced motion etc.

const loadConflicts = (): ConflictSession[] => {
  try {
    const raw = localStorage.getItem(LS_CONFLICTS);
    return raw ? (JSON.parse(raw) as ConflictSession[]) : [];
  } catch {
    return [];
  }
};
const saveConflicts = (items: ConflictSession[]) =>
  localStorage.setItem(LS_CONFLICTS, JSON.stringify(items));

type StyleKey = "Avoider" | "Critic" | "Stonewaller" | "Peacemaker" | "Collaborator";
type UserStyles = { primary?: StyleKey; secondary?: StyleKey };
type AllStyles = { A: UserStyles; B: UserStyles };

const loadStyles = (): AllStyles => {
  try {
    const raw = localStorage.getItem(LS_STYLES);
    return raw ? (JSON.parse(raw) as AllStyles) : { A: {}, B: {} };
  } catch {
    return { A: {}, B: {} };
  }
};
const saveStyles = (styles: AllStyles) =>
  localStorage.setItem(LS_STYLES, JSON.stringify(styles));

const loadTheme = (): ThemeName => {
  try {
    const raw = localStorage.getItem(LS_THEME) as ThemeName | null;
    return raw ?? "light";
  } catch {
    return "light";
  }
};
const saveTheme = (t: ThemeName) => localStorage.setItem(LS_THEME, t);

type Prefs = { reducedMotion?: boolean };
const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(LS_PREFS);
    return raw ? (JSON.parse(raw) as Prefs) : {};
  } catch {
    return {};
  }
};
const savePrefs = (p: Prefs) => localStorage.setItem(LS_PREFS, JSON.stringify(p));

/* ------------------------------ UTILS --------------------------------- */

const uid = () => Math.random().toString(36).slice(2);
const fmtDateTime = (d: number) =>
  new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/* Calendar (.ics) utilities */
function formatICSDateLocal(dateISO: string, timeHHMM: string) {
  // Treat as local without timezone; good enough for a demo PWA
  const dt = new Date(`${dateISO}T${timeHHMM || "09:00"}`);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}00`;
}
function downloadICS({
  title,
  description,
  dateISO,
  timeHHMM,
}: {
  title: string;
  description: string;
  dateISO?: string;
  timeHHMM?: string;
}) {
  const dtStart = dateISO ? formatICSDateLocal(dateISO, timeHHMM || "09:00") : "";
  const dtEnd = dateISO
    ? formatICSDateLocal(dateISO, timeHHMM ? addMinutes(timeHHMM, 45) : "09:45")
    : "";
  const uidStr = uid();
  const body =
    `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TrueGlue//Conflict Meeting//EN
BEGIN:VEVENT
UID:${uidStr}
SUMMARY:${escapeICS(title)}
DESCRIPTION:${escapeICS(description)}
${dateISO ? `DTSTART:${dtStart}` : ""}
${dateISO ? `DTEND:${dtEnd}` : ""}
END:VEVENT
END:VCALENDAR`.replace(/\n+$/,"") + "\n";
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "trueglue-conflict.ics";
  a.click();
  URL.revokeObjectURL(url);
}
function escapeICS(s: string) {
  return (s || "").replace(/[\n\r]/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function addMinutes(hhmm: string, mins: number) {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(h, m + mins, 0, 0);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/* -------------------------- LANGUAGE GUARDS --------------------------- */

const roughPhrases = [
  /you always/i, /you never/i, /whatever/i, /shut up/i, /that’s stupid/i, /that's stupid/i, /as usual/i,
  /everyone knows/i, /obviously/i,
];
const needsGentleStart = (text: string) => !!text && roughPhrases.some((r) => r.test(text));
const gentleTemplate =
  'Try: "I feel ⟨emotion⟩ when ⟨specific event⟩ because ⟨impact⟩. I need ⟨clear ask⟩."';

/* ------------------------------- APP ---------------------------------- */

type Tab = "Conflicts" | "Lessons" | "Scripture" | "Profile";
type VerseTopic = "anger" | "patience" | "unity" | "forgiveness";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Conflicts");
  const [activeUser, setActiveUser] = useState<UserId>("A");
  const [conflicts, setConflicts] = useState<ConflictSession[]>([]);
  const [themeName, setThemeName] = useState<ThemeName>(loadTheme());
  const [styles, setStyles] = useState<AllStyles>(loadStyles());
  const [verseTopic, setVerseTopic] = useState<VerseTopic>("unity");
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs());
  const [showAbuseModal, setShowAbuseModal] = useState(false);

  const T: Theme = themeName === "dark" ? themeDark : themeLight;
  const RM = !!prefs.reducedMotion;

  useEffect(() => setConflicts(loadConflicts()), []);
  useEffect(() => saveConflicts(conflicts), [conflicts]);
  useEffect(() => saveTheme(themeName), [themeName]);
  useEffect(() => saveStyles(styles), [styles]);
  useEffect(() => savePrefs(prefs), [prefs]);

  const myOpen = useMemo(
    () =>
      conflicts.filter(
        (c) => c.step !== "RESOLVED" && (c.initiator === activeUser || c.recipient === activeUser)
      ),
    [conflicts, activeUser]
  );
  const myResolved = useMemo(
    () =>
      conflicts.filter(
        (c) => c.step === "RESOLVED" && (c.initiator === activeUser || c.recipient === activeUser)
      ),
    [conflicts, activeUser]
  );

  const pendingForMe = useMemo(
    () =>
      conflicts.filter(
        (c) =>
          c.step !== "RESOLVED" &&
          ((c.recipient === activeUser && c.hasPromptForRecipient) ||
            (c.initiator === activeUser && c.hasPromptForInitiator))
      ),
    [conflicts, activeUser]
  );

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: T.bg,
    color: T.text,
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fontSize: 16,
    lineHeight: 1.6,
  };

  const layoutStyle: React.CSSProperties = {
    padding: 16,
    maxWidth: 1100,
    margin: "0 auto",
  };

  const pill: React.CSSProperties = {
    display: "inline-block",
    border: `1px solid ${T.soft}`,
    padding: "6px 12px",
    borderRadius: 999,
    color: T.muted,
    fontSize: 12,
    letterSpacing: "0.02em",
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: T.bgGrad,
          borderBottom: `1px solid ${T.soft}`,
          padding: "18px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                background: T.accent,
                display: "grid",
                placeItems: "center",
                color: themeName === "dark" ? "#1b1500" : "#3a2f00",
                fontWeight: 900,
                letterSpacing: "0.04em",
                transition: RM ? "none" : "transform 120ms ease",
              }}
              title="TrueGlue"
              aria-label="TrueGlue Logo"
            >
              TG
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, letterSpacing: "0.06em" }}>TrueGlue</h1>
              <span style={{ ...pill, borderColor: T.accent, color: T.accent }}>
                Christ-centered Conflict
              </span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: T.muted, fontSize: 13 }}>Active User:</span>
            <ToggleButtons
              options={["A", "B"]}
              value={activeUser}
              onChange={(v) => setActiveUser(v as UserId)}
             
              RM={RM}
            />
            <span style={{ color: T.muted, fontSize: 13, marginLeft: 8 }}>Theme:</span>
            <ToggleButtons
              options={["Light", "Dark"]}
              value={themeName === "dark" ? "Dark" : "Light"}
              onChange={(v) => setThemeName(v === "Dark" ? "dark" : "light")}
             
              RM={RM}
            />
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }} aria-label="Primary">
          {(["Conflicts", "Lessons", "Scripture", "Profile"] as Tab[]).map((t) => (
            <TabButton key={t} active={activeTab === t} onClick={() => setActiveTab(t)} RM={RM}>
              {t}
            </TabButton>
          ))}
        </nav>
      </header>

      {/* Pending action ribbon */}
      {pendingForMe.length > 0 && (
        <div style={{ ...layoutStyle, paddingTop: 12 }}>
          <Banner color={T.primary}>
            You have {pendingForMe.length} session{pendingForMe.length > 1 ? "s" : ""} waiting for your action.
            Open “Conflicts” to continue.
          </Banner>
        </div>
      )}

      {/* Content */}
      <main style={layoutStyle}>
        {activeTab === "Conflicts" && (
          <ConflictsView
           
            RM={RM}
            activeUser={activeUser}
            conflicts={conflicts}
            setConflicts={setConflicts}
            myOpen={myOpen}
            myResolved={myResolved}
            userStyles={styles}
            verseTopic={verseTopic}
            setVerseTopic={setVerseTopic}
          />
        )}
        {activeTab === "Lessons" && <LessonsView />}
        {activeTab === "Scripture" && <ScriptureView />}
        {activeTab === "Profile" && (
          <ProfileView
           
            RM={RM}
            activeUser={activeUser}
            styles={styles}
            setStyles={setStyles}
            prefs={prefs}
            setPrefs={setPrefs}
          />
        )}
      </main>

      <footer style={{ padding: 24, opacity: 0.9, textAlign: "center", fontSize: 12, color: T.muted }}>
        Demo: local two-user simulation. Data stored in your browser.{" "}
        <button
          onClick={() => setShowAbuseModal(true)}
          style={{ border: "none", background: "transparent", color: T.accent, cursor: "pointer", textDecoration: "underline" }}
          aria-label="Open abuse resources"
        >
          Abuse resources
        </button>
      </footer>

      {showAbuseModal && (
        <Modal title="Safety & Abuse Resources" onClose={() => setShowAbuseModal(false)}>
          <p style={{ marginTop: 0 }}>
            TrueGlue is not for emergencies or unsafe situations.
            If you are in danger, seek local help immediately.
          </p>
          <ul>
            <li>US: National Domestic Violence Hotline — 1-800-799-SAFE (7233)</li>
            <li>Text: START to 88788</li>
            <li>911 (or your local emergency number)</li>
            <li>Talk to a trusted pastor/elder or counselor.</li>
          </ul>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------- UI PRIMITIVES ---------------------------- */

function cardStyle(T: Theme): React.CSSProperties {
  return {
    background: T.card,
    border: `1px solid ${T.soft}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: T.shadow,
  };
}

function focusable(): React.CSSProperties {
  return {
    outline: "none",
  };
}

function TabButton({
  children,
  active,
  onClick,
  T,
  RM,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  T: Theme;
  RM?: boolean;
}) {
  const base: React.CSSProperties = {
    border: `1px solid ${T.soft}`,
    borderRadius: 12,
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 600,
    background: "transparent",
    color: T.text,
    transition: RM ? "none" : "transform 120ms ease, filter 120ms ease, background 120ms ease",
  };
  const activeStyle: React.CSSProperties = {
    background: T.primary,
    color: "#001315",
    borderColor: T.primary,
  };
  return (
    <button
      style={{ ...base, ...(active ? activeStyle : {}), ...focusable() }}
      onClick={onClick}
      onMouseEnter={(e) => !RM && ((e.currentTarget.style.filter = "brightness(1.05)"))}
      onMouseLeave={(e) => !RM && ((e.currentTarget.style.filter = "brightness(1.0)"))}
      onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function ToggleButtons({
  options,
  value,
  onChange,
  T,
  RM,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  T: Theme;
  RM?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 6,
        padding: 4,
        borderRadius: 999,
        border: `1px solid ${T.soft}`,
        background: "transparent",
      }}
      role="tablist"
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            aria-pressed={active}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "8px 12px",
              fontWeight: 600,
              cursor: "pointer",
              background: active ? T.accent : "transparent",
              color: active ? (T === themeDark ? "#1b1500" : "#3a2f00") : T.text,
              transition: RM ? "none" : "filter 120ms ease, background 120ms ease",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children, T, color }: { children: React.ReactNode; T: Theme; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        border: `1px solid ${color ?? T.soft}`,
        padding: "6px 12px",
        borderRadius: 999,
        color: color ?? T.muted,
        fontSize: 12,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}

function ReadBox({ title, value, T }: { title: string; value: string; T: Theme }) {
  return (
    <div style={{ background: "transparent", border: `1px solid ${T.soft}`, borderRadius: 12, padding: 12 }}>
      <div style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>{title}</div>
      <div style={{ whiteSpace: "pre-wrap", maxWidth: "70ch" }}>{value || "—"}</div>
    </div>
  );
}

function Banner({ children, T, color }: { children: React.ReactNode; T: Theme; color: string }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        background: "transparent",
        border: `1px solid ${color}`,
        color,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function InfoNote({ children, T }: { children: React.ReactNode; T: Theme }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        background: "transparent",
        border: `1px dashed ${T.soft}`,
        color: T.muted,
      }}
    >
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  T,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  T: Theme;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 16,
      }}
    >
      <div style={{ ...cardStyle(T), maxWidth: 640, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 style={{ marginTop: 0 }}>{title}</h3>
          <button
            style={{
              border: `1px solid ${T.soft}`,
              background: "transparent",
              color: T.text,
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
            }}
            onClick={onClose}
            aria-label="Close"
            onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function ScriptureInline({ refText, T }: { refText: string; T: Theme }) {
  return (
    <TabPill color={T.accent}>
      Scripture: {refText}
    </TabPill>
  );
}

function SafetyBanner({ T }: { T: Theme }) {
  return (
    <div
      role="note"
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${T.danger}`,
        color: T.danger,
      }}
    >
      Not for emergencies or unsafe situations. If you are in danger, seek local help immediately.
    </div>
  );
}

function PrayerTimer({ T }: { T: Theme }) {
  const [sec, setSec] = useState(60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || sec <= 0) return;
    const id = setInterval(() => setSec((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running, sec]);
  return (
    <div style={{ ...cardStyle(T) }}>
      <h4 style={{ marginTop: 0 }}>Pray Together</h4>
      <p style={{ color: T.muted, marginTop: 0 }}>
        “Lord, make us quick to hear, slow to speak, and bind us in Your love.”
      </p>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{sec}s</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Button onClick={() => { setRunning(true); if (sec === 0) setSec(60); }}>
          {running ? "Running…" : "Start 60s"}
        </Button>
        <Button variant="ghost" onClick={() => { setRunning(false); }}>
          Pause
        </Button>
        <Button variant="ghost" onClick={() => { setRunning(false); setSec(60); }}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/* ----------------------- CALM & PREPARE (ENHANCED) ------------------- */

type VerseTopic = "anger" | "patience" | "unity" | "forgiveness";
const verseTopics: VerseTopic[] = ["anger", "patience", "unity", "forgiveness"];
const verseByTopic: Record<VerseTopic, Scripture[]> = {
  anger: seedScriptures.filter(
    (s) => s.topics.includes("anger") || s.text.toLowerCase().includes("anger")
  ),
  patience: seedScriptures.filter((s) =>
    s.text.toLowerCase().includes("patient")
  ),
  unity: seedScriptures.filter(
    (s) => s.topics.includes("unity") || s.text.toLowerCase().includes("binds")
  ),
  forgiveness: seedScriptures.filter(
    (s) => s.topics.includes("forgiveness") || s.text.toLowerCase().includes("forgive")
  ),
};
function pickVerse(topic: VerseTopic, dayIndex = 0) {
  const list = verseByTopic[topic];
  if (!list || list.length === 0) return seedScriptures[0];
  return list[dayIndex % list.length];
}

function CalmPrepare({
  T,
  compact,
  topic,
  onTopicChange,
}: {
  T: Theme;
  compact?: boolean;
  topic: VerseTopic;
  onTopicChange: (t: VerseTopic) => void;
}) {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const verse = pickVerse(topic, dayIndex);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!compact && (
        <p style={{ color: T.muted, marginTop: 0, maxWidth: "70ch" }}>
          Before you write or respond, practice calm: a brief breath, a short prayer, and a verse.
        </p>
      )}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ ...cardStyle(T) }}>
          <h4 style={{ marginTop: 0 }}>Breathing (60s)</h4>
          <p style={{ color: T.muted }}>
            Inhale 4 • Hold 4 • Exhale 6 — repeat 6–8 times. Relax your jaw and shoulders.
          </p>
        </div>
        <PrayerTimer />
      </div>
      <div style={{ ...cardStyle(T) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h4 style={{ marginTop: 0 }}>Today’s Scripture</h4>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ color: T.muted, fontSize: 13 }}>Topic:</label>
            <select
              aria-label="Scripture topic"
              value={topic}
              onChange={(e) => onTopicChange(e.target.value as VerseTopic)}
              style={{
                border: `1px solid ${T.soft}`,
                background: "transparent",
                color: T.text,
                padding: "8px 10px",
                borderRadius: 10,
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              {verseTopics.map((t) => (
                <option key={t} value={t} style={{ color: "black" }}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ color: T.accent, fontWeight: 700 }}>{verse.ref}</div>
        <div style={{ marginTop: 6, maxWidth: "70ch" }}>{verse.text}</div>
      </div>
    </div>
  );
}

/* ----------------------- CONFLICT STYLE TIPS -------------------------- */

type StyleKey = "Avoider" | "Critic" | "Stonewaller" | "Peacemaker" | "Collaborator";
const styleTips: Record<
  StyleKey,
  { general: string[]; byStep: Partial<Record<ConflictStep, string[]>> }
> = {
  Avoider: {
    general: [
      "Speak your need in one sentence; silence can be misread.",
      "Schedule the talk—structure lowers anxiety.",
    ],
    byStep: {
      QUALIFY: ["Name the issue plainly; resist the urge to defer."],
      RECIPIENT_REVIEW: ["Reflect back what you heard—two sentences is enough."],
      QUESTIONS_SELFCRITIQUE: ["Ask one curious question before you explain."],
      CALM_PREPARE: ["Do 2 extra breath cycles before writing."],
      DECISION_REPAIR: ["Commit to one small follow-up you control."],
    },
  },
  Critic: {
    general: [
      "Trade judgments for observations: start with 'I feel… when… because…'.",
      "Aim for one ask, not a list.",
    ],
    byStep: {
      QUALIFY: ["Use a gentle start; avoid 'always/never'."],
      RECIPIENT_REVIEW: ["Summarize without rebuttal; no 'but'."],
      QUESTIONS_SELFCRITIQUE: ["Own 10% you could do better."],
      CALM_PREPARE: ["Pray for kindness before clarity."],
      DECISION_REPAIR: ["Phrase decisions as shared goals."],
    },
  },
  Stonewaller: {
    general: [
      "Taking a break is fine—name it and return time.",
      "Regulate before you write; your body leads your words.",
    ],
    byStep: {
      QUALIFY: ["If flooded, pause 10 minutes, then return."],
      RECIPIENT_REVIEW: ["Keep eye contact with the idea; stay present."],
      QUESTIONS_SELFCRITIQUE: ["Type one feeling word, even if it's 'overwhelmed'."],
      CALM_PREPARE: ["Double exhale length to downshift."],
      SCHEDULE: ["Prefer earlier-in-the-evening slots to avoid fatigue shutdown."],
    },
  },
  Peacemaker: {
    general: [
      "Harmony matters—but don’t skip truth.",
      "Affirm first, then ask for one change.",
    ],
    byStep: {
      QUALIFY: ["Include one concrete example."],
      RECIPIENT_REVIEW: ["Affirm what makes sense before adding your view."],
      QUESTIONS_SELFCRITIQUE: ["Avoid self-blame masking a real ask."],
      DECISION_REPAIR: ["Ensure the agreement is specific, not vague peace."],
    },
  },
  Collaborator: {
    general: [
      "Your strength is synthesis—guard against over-talking.",
      "Share the pen; invite your spouse’s words.",
    ],
    byStep: {
      QUALIFY: ["Keep it to one sentence; save ideas for later."],
      QUESTIONS_SELFCRITIQUE: ["Ask one clarifying question, then listen."],
      SCHEDULE: ["Propose 1 time, not 3."],
      DECISION_REPAIR: ["Choose 1–2 actions; avoid scope creep."],
    },
  },
};

type AllStyles = { A: UserStyles; B: UserStyles };
type UserStyles = { primary?: StyleKey; secondary?: StyleKey };

function TipChips({
  T,
  styles,
  step,
  role,
}: {
  T: Theme;
  styles?: UserStyles;
  step: ConflictStep;
  role: "initiator" | "recipient";
}) {
  if (!styles?.primary) return null;
  const p = styles.primary!;
  const s = styles.secondary;
  const collect = (k: StyleKey) => [
    ...(styleTips[k].byStep[step] || []),
    ...(role === "initiator" ? styleTips[k].general.slice(0, 1) : []),
  ];
  const tips = [...collect(p), ...(s ? collect(s) : [])].slice(0, 3);
  if (tips.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {tips.map((t, i) => (
        <TabPill key={i} color={T.primary}>
          {t}
        </TabPill>
      ))}
    </div>
  );
}

/* --------------------------- CONFLICTS VIEW --------------------------- */

function ConflictsView({
  T,
  RM,
  activeUser,
  conflicts,
  setConflicts,
  myOpen,
  myResolved,
  userStyles,
  verseTopic,
  setVerseTopic,
}: {
  T: Theme;
  RM: boolean;
  activeUser: UserId;
  conflicts: ConflictSession[];
  setConflicts: React.Dispatch<React.SetStateAction<ConflictSession[]>>;
  myOpen: ConflictSession[];
  myResolved: ConflictSession[];
  userStyles: AllStyles;
  verseTopic: VerseTopic;
  setVerseTopic: (t: VerseTopic) => void;
}) {
  const [showCalm, setShowCalm] = useState(false);

  const startNew = () => setShowCalm(true);
  const actuallyCreate = () => {
    const recipient: UserId = activeUser === "A" ? "B" : "A";
    const c: ConflictSession = {
      id: uid(),
      initiator: activeUser,
      recipient,
      step: "QUALIFY",
      createdAt: Date.now(),
      calmShownToInitiator: true,
      hasPromptForRecipient: true,
      rescheduleCount: 0,
    };
    setConflicts((arr) => [c, ...arr]);
    setShowCalm(false);
  };

  const exportCSV = () => {
    const resolved = myResolved;
    if (resolved.length === 0) return;
    const headers = [
      "id","initiator","recipient","createdAt","resolvedAt",
      "issueSentence","issueDetails","recipientReviewSummary",
      "nonhostileQuestions","selfCritique",
      "proposedDate","proposedTime","proposedDescriptor","confirmedByRecipient",
      "decisionsAgreements","apologiesForgiveness","followUpPlan","recap",
      "testimonyText","testimonyVisibility","rescheduleCount"
    ];
    const rows = resolved.map(c => [
      c.id,c.initiator,c.recipient,
      new Date(c.createdAt).toISOString(),
      c.resolvedAt ? new Date(c.resolvedAt).toISOString() : "",
      (c.issueSentence||"").replace(/\n/g," "),
      (c.issueDetails||"").replace(/\n/g," "),
      (c.recipientReviewSummary||"").replace(/\n/g," "),
      (c.nonhostileQuestions||"").replace(/\n/g," "),
      (c.selfCritique||"").replace(/\n/g," "),
      c.proposedDate||"", c.proposedTime||"", c.proposedDescriptor||"",
      c.confirmedDateTimeByRecipient ? "yes":"no",
      (c.decisionsAgreements||"").replace(/\n/g," "),
      (c.apologiesForgiveness||"").replace(/\n/g," "),
      (c.followUpPlan||"").replace(/\n/g," "),
      (c.recap||"").replace(/\n/g," "),
      (c.testimonyText||"").replace(/\n/g," "),
      c.testimonyVisibility||"",
      String(c.rescheduleCount ?? 0),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"}); 
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "trueglue_resolved.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showCalm && (
        <Modal onClose={() => setShowCalm(false)} title="Calm & Prepare">
          <CalmPrepare topic={verseTopic} onTopicChange={setVerseTopic} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button onClick={actuallyCreate}>I’m ready to begin</Button>
            <Button variant="ghost" onClick={() => setShowCalm(false)}>Cancel</Button>
          </div>
        </Modal>
      )}

      <div style={cardStyle(T)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ margin: 0, letterSpacing: "0.02em" }}>Conflict Sessions</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <AccentButton onClick={startNew}>+ Start Conflict</AccentButton>
            {myResolved.length > 0 && (
              <Button variant="ghost" onClick={exportCSV}>Export Resolved CSV</Button>
            )}
          </div>
        </div>
        <p style={{ color: T.muted, marginTop: 6, maxWidth: "70ch" }}>
          Guided, cooperative path with Scripture—and coaching matched to your style.
        </p>
      </div>

      {myOpen.length > 0 && (
        <section style={{ ...cardStyle(T), borderColor: T.primary }}>
          <h3 style={{ marginTop: 0 }}>Open</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {myOpen.map((c) => (
              <ConflictCard
                key={c.id}
                c={c}
                me={activeUser}
                setConflicts={setConflicts}
               
                RM={RM}
                myStyles={userStyles[activeUser]}
                verseTopic={verseTopic}
                setVerseTopic={setVerseTopic}
              />
            ))}
          </div>
        </section>
      )}

      <section style={cardStyle(T)}>
        <h3 style={{ marginTop: 0 }}>Previous Conflicts (view-only)</h3>
        {myResolved.length === 0 && (
          <p style={{ color: T.muted, marginBottom: 0 }}>No resolved sessions yet.</p>
        )}
        <div style={{ display: "grid", gap: 12 }}>
          {myResolved.map((c) => (
            <ResolvedCard key={c.id} c={c} me={activeUser} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ConflictCard({
  c,
  me,
  setConflicts,
  T,
  RM,
  myStyles,
  verseTopic,
  setVerseTopic,
}: {
  c: ConflictSession;
  me: UserId;
  setConflicts: React.Dispatch<React.SetStateAction<ConflictSession[]>>;
  T: Theme;
  RM: boolean;
  myStyles?: UserStyles;
  verseTopic: VerseTopic;
  setVerseTopic: (t: VerseTopic) => void;
}) {
  const iAmInitiator = c.initiator === me;
  const iAmRecipient = c.recipient === me;

  const [sentence, setSentence] = useState(c.issueSentence ?? "");
  const [details, setDetails] = useState(c.issueDetails ?? "");
  const [reviewSummary, setReviewSummary] = useState(c.recipientReviewSummary ?? "");
  const [nonhostile, setNonhostile] = useState(c.nonhostileQuestions ?? "");
  const [selfCrit, setSelfCrit] = useState(c.selfCritique ?? "");
  const [date, setDate] = useState(c.proposedDate ?? "");
  const [time, setTime] = useState(c.proposedTime ?? "");
  const [desc, setDesc] = useState(c.proposedDescriptor ?? "");
  const [decisions, setDecisions] = useState(c.decisionsAgreements ?? "");
  const [apologies, setApologies] = useState(c.apologiesForgiveness ?? "");
  const [followUp, setFollowUp] = useState(c.followUpPlan ?? "");
  const [showCalm, setShowCalm] = useState(false);

  useEffect(() => {
    if (iAmRecipient && !c.calmShownToRecipient) {
      setShowCalm(true);
      update((x) => {
        x.calmShownToRecipient = true;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(mutator: (x: ConflictSession) => void) {
    setConflicts((arr) =>
      arr.map((s) => {
        if (s.id !== c.id) return s;
        const copy = { ...s };
        mutator(copy);
        return copy;
      })
    );
  }

  function canAdvanceFromQualify(): boolean {
    if (!c.issueSentence || !c.issueDetails || !c.initiatorAcceptedSingleFocus) return false;
    if (!c.recipientAcceptedSingleFocus) return false;
    return true;
  }

  function advanceFromQualify() {
    if (!canAdvanceFromQualify()) return;
    update((x) => {
      x.step = "RECIPIENT_REVIEW";
      x.hasPromptForInitiator = true;
    });
  }

  function canCompleteReview(): boolean {
    return !!c.issueSentence && !!c.issueDetails && !!reviewSummary.trim();
  }

  function completeReview() {
    if (!canCompleteReview()) return;
    update((x) => {
      x.recipientReviewSummary = reviewSummary.trim();
      x.step = "QUESTIONS_SELFCRITIQUE";
    });
  }

  function completeQuestionsSelf() {
    update((x) => {
      x.nonhostileQuestions = nonhostile.trim();
      x.selfCritique = selfCrit.trim();
      x.step = "CALM_PREPARE";
    });
  }

  function proceedFromCalmPrepare() {
    update((x) => {
      x.step = "SCHEDULE";
    });
  }

  function proposeTime() {
    if (!iAmInitiator) return;
    if (!date && !time && !desc.trim()) return;
    update((x) => {
      x.proposedDate = date || "";
      x.proposedTime = time || "";
      x.proposedDescriptor = desc.trim();
    });
  }

  function recipientConfirmTime() {
    if (!iAmRecipient) return;
    update((x) => {
      x.confirmedDateTimeByRecipient = true;
      x.step = "DECISION_REPAIR";
    });
  }

  function requestReschedule() {
    if ((c.rescheduleCount ?? 0) >= 1) return;
    update((x) => {
      x.confirmedDateTimeByRecipient = false;
      x.step = "SCHEDULE";
      x.rescheduleCount = (x.rescheduleCount ?? 0) + 1;
      x.hasPromptForInitiator = true; // nudge initiator to re-propose
    });
    alert("Reschedule requested. Initiator can propose a new time.");
  }

  function downloadIcsNow() {
    const when = `${c.proposedDate || ""} ${c.proposedTime || ""} ${c.proposedDescriptor || ""}`.trim();
    downloadICS({
      title: "TrueGlue: Conflict Discussion",
      description:
        `Issue: ${c.issueSentence || ""}\\nDetails: ${c.issueDetails || ""}\\nWhen: ${when || "TBD"}`,
      dateISO: c.proposedDate,
      timeHHMM: c.proposedTime,
    });
  }

  function makeRecap(): string {
    const scheduled =
      c.confirmedDateTimeByRecipient
        ? `${c.proposedDate || ""} ${c.proposedTime || ""} ${c.proposedDescriptor || ""}`.trim()
        : "—";
    return [
      `Issue: ${c.issueSentence ?? ""}`,
      `Details: ${c.issueDetails ?? ""}`,
      `Recipient Summary: ${c.recipientReviewSummary ?? ""}`,
      `Questions: ${c.nonhostileQuestions ?? ""}`,
      `Self-critique: ${c.selfCritique ?? ""}`,
      `Scheduled: ${scheduled}`,
      `Agreements: ${decisions}`,
      `Apologies & Forgiveness: ${apologies}`,
      `Follow-up: ${followUp}`,
    ].join("\n");
  }

  function completeDecisionRepair() {
    const recap = makeRecap();
    update((x) => {
      x.decisionsAgreements = decisions.trim();
      x.apologiesForgiveness = apologies.trim();
      x.followUpPlan = followUp.trim();
      x.recap = recap;
      x.step = "RESOLVED";
      x.resolvedAt = Date.now();
      x.hasPromptForInitiator = false;
      x.hasPromptForRecipient = false;
    });
  }

  const stepOrder: ConflictStep[] = [
    "QUALIFY",
    "RECIPIENT_REVIEW",
    "QUESTIONS_SELFCRITIQUE",
    "CALM_PREPARE",
    "SCHEDULE",
    "DECISION_REPAIR",
    "RESOLVED",
  ];
  const currentIndex = stepOrder.indexOf(c.step);

  const schedulePreview =
    (date || time || desc) ?
      `Proposed: ${[date, time, desc].filter(Boolean).join(" • ")}` : "";

  return (
    <div style={{ ...cardStyle(T), borderColor: T.primary }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TabPill>Session #{c.id.slice(0, 6)}</TabPill>
        <TabPill>Initiator: <b>{c.initiator}</b></TabPill>
        <TabPill>Recipient: <b>{c.recipient}</b></TabPill>
        <TabPill>Started {fmtDateTime(c.createdAt)}</TabPill>
        {c.resolvedAt && <TabPill>Resolved {fmtDateTime(c.resolvedAt)}</TabPill>}
      </div>

      {iAmRecipient && c.hasPromptForRecipient && (
        <Banner color={T.primary}>Your partner invited you to continue this session.</Banner>
      )}
      {iAmInitiator && c.hasPromptForInitiator && (
        <Banner color={T.accent}>Your partner responded. Continue when ready.</Banner>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }} aria-label="Progress">
        {stepOrder.map((s, i) => (
          <TabPill key={s} color={i <= currentIndex ? (i === currentIndex ? T.primary : T.soft) : T.soft}>
            {i + 1}. {labelForStep(s)}
          </TabPill>
        ))}
      </div>

      {showCalm && (
        <Modal onClose={() => setShowCalm(false)} title="Calm & Prepare">
          <CalmPrepare compact topic={verseTopic} onTopicChange={setVerseTopic} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button onClick={() => setShowCalm(false)}>Proceed</Button>
          </div>
        </Modal>
      )}

      <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
        {/* STEP 1 */}
        {c.step === "QUALIFY" && (
          <div style={{ ...cardStyle(T) }}>
            <h3 style={{ marginTop: 0 }}>Step 1 – Qualification (single-sentence focus)</h3>
            <ScriptureInline refText="James 1:19–20" />
            <p style={{ color: T.muted, maxWidth: "70ch" }}>
              Initiator writes a <b>single sentence</b> issue, adds brief details, accepts the single focus,
              then the recipient reviews and accepts.
            </p>
            <SafetyBanner />
            <TipChips styles={myStyles} step="QUALIFY" role={iAmInitiator ? "initiator" : "recipient"} />

            {(needsGentleStart(details) || needsGentleStart(sentence)) && (
              <Banner color={T.accent}>
                Gentle start tip: {gentleTemplate}
              </Banner>
            )}

            {/* Initiator input */}
            <fieldset style={{ border: "none", padding: 0, margin: 0 }} disabled={!iAmInitiator}>
              <Field
                label="One-sentence issue"
                value={sentence}
                onChange={setSentence}
               
                placeholder="e.g., I feel hurt when plans change last minute without telling me."
              />
              <Field
                label="Details (short)"
                value={details}
                onChange={setDetails}
               
                textarea
                placeholder="Share concise facts + context."
              />

              {!c.initiatorAcceptedSingleFocus ? (
                <Button
                 
                  disabled={!sentence || !details}
                  onClick={() =>
                    update((x) => {
                      x.issueSentence = sentence.trim();
                      x.issueDetails = details.trim();
                      x.initiatorAcceptedSingleFocus = true;
                      x.hasPromptForRecipient = true;
                    })
                  }
                >
                  Accept single-focus & notify partner
                </Button>
              ) : (
                <div style={{ color: T.success, fontSize: 14 }}>
                  ✓ You accepted the single-focus. Waiting for recipient…
                </div>
              )}
            </fieldset>

            {/* Recipient acceptance */}
            {iAmRecipient && c.initiatorAcceptedSingleFocus && !c.recipientAcceptedSingleFocus && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ margin: "8px 0" }}>Review your partner’s issue</h4>
                <ReadBox title="One-sentence issue" value={c.issueSentence || ""} />
                <ReadBox title="Details" value={c.issueDetails || ""} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Button
                   
                    onClick={() =>
                      update((x) => {
                        x.recipientAcceptedSingleFocus = true;
                        x.hasPromptForRecipient = false;
                      })
                    }
                  >
                    I accept the single-focus
                  </Button>
                </div>
              </div>
            )}

            {/* Advance gate */}
            {canAdvanceFromQualify() && (
              <div style={{ marginTop: 16 }}>
                <Button variant="ghost" onClick={advanceFromQualify}>
                  Continue to Step 3 (Recipient reviews partner’s view)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 – recipient only */}
        {c.step === "RECIPIENT_REVIEW" && iAmRecipient && (
          <div style={{ ...cardStyle(T) }}>
            <h3 style={{ marginTop: 0 }}>Step 3 – Review Partner’s View (recipient only)</h3>
            <ScriptureInline refText="Philippians 2:4" />
            <TipChips styles={myStyles} step="RECIPIENT_REVIEW" role="recipient" />
            <ReadBox title="Partner’s one-sentence issue" value={c.issueSentence || ""} />
            <ReadBox title="Partner’s details" value={c.issueDetails || ""} />
            <Field
              label="Summarize your partner’s view (to their satisfaction)"
              value={reviewSummary}
              onChange={setReviewSummary}
             
              textarea
              placeholder="Paraphrase what you heard to show understanding."
            />
            <Button
             
              disabled={!canCompleteReview()}
              onClick={completeReview}
            >
              Complete Step 3
            </Button>
          </div>
        )}
        {c.step === "RECIPIENT_REVIEW" && iAmInitiator && (
          <InfoNote>Waiting for recipient to complete Step 3 (Review Partner’s View).</InfoNote>
        )}

        {/* STEP 4 */}
        {c.step === "QUESTIONS_SELFCRITIQUE" && (
          <div style={{ ...cardStyle(T) }}>
            <h3 style={{ marginTop: 0 }}>Step 4 – Nonhostile Questions & Self-Critique</h3>
            <TipChips styles={myStyles} step="QUESTIONS_SELFCRITIQUE" role={iAmInitiator ? "initiator" : "recipient"} />
            {(needsGentleStart(nonhostile) || needsGentleStart(selfCrit)) && (
              <Banner color={T.accent}>
                Gentle language tip: {gentleTemplate}
              </Banner>
            )}
            <p style={{ color: T.muted }}>Use “I” statements; avoid sarcasm; own your side.</p>
            <Field
              label="Nonhostile questions"
              value={nonhostile}
              onChange={setNonhostile}
             
              textarea
              placeholder='e.g., Can you help me understand what you need from me when plans change?'
            />
            <Field
              label="Self-critique"
              value={selfCrit}
              onChange={setSelfCrit}
             
              textarea
              placeholder="e.g., I’ve reacted sharply; I can pause and ask before assuming."
            />
            <Button onClick={completeQuestionsSelf}>
              Continue to Calm & Prepare
            </Button>
          </div>
        )}

        {/* STEP 5 */}
        {c.step === "CALM_PREPARE" && (
          <div style={{ ...cardStyle(T) }}>
            <h3 style={{ marginTop: 0 }}>Step 5 – Calm & Prepare</h3>
            <ScriptureInline refText="1 Peter 4:8" />
            <TipChips styles={myStyles} step="CALM_PREPARE" role={iAmInitiator ? "initiator" : "recipient"} />
            <CalmPrepare compact topic={verseTopic} onTopicChange={setVerseTopic} />
            <div style={{ marginTop: 8 }}>
              <Button onClick={proceedFromCalmPrepare}>
                Proceed to Schedule
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6 */}
        {c.step === "SCHEDULE" && (
          <div style={{ ...cardStyle(T) }}>
            <h3 style={{ marginTop: 0 }}>Step 6 – Schedule</h3>
            <p style={{ color: T.muted, maxWidth: "70ch" }}>
              Initiator proposes; recipient confirms. Add a descriptor like <i>"after dinner"</i> or <i>"after kids are in bed"</i>.
            </p>
            <TipChips styles={myStyles} step="SCHEDULE" role={iAmInitiator ? "initiator" : "recipient"} />
            <fieldset style={{ border: "none", padding: 0 }} disabled={!iAmInitiator}>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                <FieldRaw label="Date">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={inputStyle(T)}
                    aria-label="Proposed date"
                  />
                </FieldRaw>
                <FieldRaw label="Time">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={inputStyle(T)}
                    aria-label="Proposed time"
                  />
                </FieldRaw>
              </div>
              <FieldRaw label='Descriptor (optional, e.g., "after dinner")'>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder='e.g., "after kids are in bed"'
                  style={inputStyle(T)}
                  aria-label="Proposed descriptor"
                />
              </FieldRaw>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button onClick={proposeTime}>
                  Save Proposed Time
                </Button>
                {(date || time || desc) && (
                  <Button variant="ghost" onClick={() => downloadICS({
                    title: "TrueGlue: Conflict Discussion (proposed)",
                    description: `Issue: ${c.issueSentence || ""}\\nDetails: ${c.issueDetails || ""}`,
                    dateISO: date,
                    timeHHMM: time,
                  })}>
                    Download .ics (proposed)
                  </Button>
                )}
              </div>
            </fieldset>

            {schedulePreview && (
              <div style={{ ...cardStyle(T), marginTop: 12 }}>
                <h4 style={{ marginTop: 0 }}>Proposed</h4>
                <div>{schedulePreview}</div>
              </div>
            )}

            {iAmRecipient && (c.proposedDate || c.proposedTime || c.proposedDescriptor) && !c.confirmedDateTimeByRecipient && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button onClick={recipientConfirmTime}>
                  Confirm Proposed Time
                </Button>
                <Button variant="ghost" onClick={downloadIcsNow}>
                  Download .ics
                </Button>
              </div>
            )}

            {c.confirmedDateTimeByRecipient && (
              <div style={{ color: T.success, marginTop: 8 }}>
                ✓ Recipient confirmed. Proceed to Decision & Repair.
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button variant="ghost" onClick={downloadIcsNow}>Download .ics (confirmed)</Button>
                  {(c.rescheduleCount ?? 0) < 1 && (
                    <Button variant="ghost" onClick={requestReschedule}>
                      Request one reschedule
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 7 */}
        {c.step === "DECISION_REPAIR" && (
          <div style={{ ...cardStyle(T) }}>
            <h3 style={{ marginTop: 0 }}>Step 7 – Decision & Repair</h3>
            <ScriptureInline refText="Colossians 3:13" />
            <TipChips styles={myStyles} step="DECISION_REPAIR" role={iAmInitiator ? "initiator" : "recipient"} />
            <Field
              label="Agreements / Decisions"
              value={decisions}
              onChange={setDecisions}
             
              textarea
              placeholder="Specific actions, boundaries, or agreements."
            />
            <Field
              label="Apologies & Forgiveness"
              value={apologies}
              onChange={setApologies}
             
              textarea
              placeholder="Words of confession and forgiveness."
            />
            <Field
              label="Follow-up Plan"
              value={followUp}
              onChange={setFollowUp}
             
              textarea
              placeholder="When/how to check in and keep commitments."
            />
            <AccentButton onClick={completeDecisionRepair}>
              Mark as Resolved
            </AccentButton>
          </div>
        )}

        {/* RESOLVED */}
        {c.step === "RESOLVED" && (
          <div style={{ ...cardStyle(T) }}>
            <h3 style={{ marginTop: 0 }}>Resolved</h3>
            <ResolvedCard c={c} me={me} editableTestimony onChange={(mut) => update(mut)} />
          </div>
        )}
      </div>
    </div>
  );
}

function ResolvedCard({
  c,
  me,
  T,
  editableTestimony,
  onChange,
}: {
  c: ConflictSession;
  me: UserId;
  T: Theme;
  editableTestimony?: boolean;
  onChange?: (mut: (x: ConflictSession) => void) => void;
}) {
  const [testimony, setTestimony] = useState(c.testimonyText ?? "");
  const [vis, setVis] = useState<TestimonyVisibility>(c.testimonyVisibility ?? "private");

  const copyRecap = async () => {
    const text =
      c.recap ??
      [
        `Issue: ${c.issueSentence ?? ""}`,
        `Details: ${c.issueDetails ?? ""}`,
        `Recipient Summary: ${c.recipientReviewSummary ?? ""}`,
        `Questions: ${c.nonhostileQuestions ?? ""}`,
        `Self-critique: ${c.selfCritique ?? ""}`,
        `Agreements: ${c.decisionsAgreements ?? ""}`,
        `Apologies & Forgiveness: ${c.apologiesForgiveness ?? ""}`,
        `Follow-up: ${c.followUpPlan ?? ""}`,
      ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Recap copied.");
    } catch {
      alert("Copy failed—select and copy manually.");
    }
  };

  const scheduled =
    c.confirmedDateTimeByRecipient
      ? `${c.proposedDate || ""} ${c.proposedTime || ""} ${c.proposedDescriptor || ""}`.trim()
      : "—";

  const canSaveTestimony = editableTestimony && testimony.trim().length > 0;

  return (
    <div style={cardStyle(T)}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <TabPill>Initiator {c.initiator}</TabPill>
        <TabPill>Recipient {c.recipient}</TabPill>
        <TabPill>Created {fmtDateTime(c.createdAt)}</TabPill>
        {c.resolvedAt && <TabPill>Resolved {fmtDateTime(c.resolvedAt)}</TabPill>}
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        <ReadBox title="Issue" value={c.issueSentence || ""} />
        <ReadBox title="Details" value={c.issueDetails || ""} />
        <ReadBox title="Recipient Summary" value={c.recipientReviewSummary || ""} />
        <ReadBox title="Nonhostile Questions" value={c.nonhostileQuestions || ""} />
        <ReadBox title="Self-Critique" value={c.selfCritique || ""} />
        <ReadBox title="Scheduled" value={scheduled} />
        <ReadBox title="Agreements / Decisions" value={c.decisionsAgreements || ""} />
        <ReadBox title="Apologies & Forgiveness" value={c.apologiesForgiveness || ""} />
        <ReadBox title="Follow-up Plan" value={c.followUpPlan || ""} />
        {c.recap && <ReadBox title="Recap" value={c.recap} />}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Button variant="ghost" onClick={copyRecap}>Copy Recap</Button>
        {(c.proposedDate || c.proposedTime || c.proposedDescriptor) && (
          <Button variant="ghost" onClick={() => downloadICS({
            title: "TrueGlue: Conflict Discussion",
            description: `Issue: ${c.issueSentence || ""}\\nDetails: ${c.issueDetails || ""}`,
            dateISO: c.proposedDate,
            timeHHMM: c.proposedTime,
          })}>Download .ics</Button>
        )}
      </div>

      {/* Testimony Corner */}
      <div style={{ marginTop: 16 }}>
        <h4 style={{ marginTop: 0 }}>Testimony Corner (optional)</h4>
        {editableTestimony ? (
          <>
            <Field
              label="Share a 1–2 sentence encouragement (≤250 chars)"
              value={testimony}
              onChange={(v) => setTestimony(v.slice(0, 250))}
             
              textarea
              placeholder="How did God meet you two through this?"
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <label style={{ color: T.muted, fontSize: 13, marginRight: 8 }}>Visibility:</label>
                <select
                  value={vis}
                  onChange={(e) => setVis(e.target.value as TestimonyVisibility)}
                  style={{
                    border: `1px solid ${T.soft}`,
                    background: "transparent",
                    color: T.text,
                    padding: "8px 10px",
                    borderRadius: 10,
                    outline: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  <option value="private" style={{ color: "black" }}>Private</option>
                  <option value="church" style={{ color: "black" }}>Church only (opt-in)</option>
                  <option value="community" style={{ color: "black" }}>Community (opt-in)</option>
                </select>
              </div>
              <Button
               
                disabled={!canSaveTestimony}
                onClick={() => {
                  onChange?.((x) => {
                    x.testimonyText = testimony.trim();
                    x.testimonyVisibility = vis;
                  });
                  alert("Testimony saved.");
                }}
              >
                Save Testimony
              </Button>
              {c.testimonyText && (
                <Button variant="ghost" onClick={() => {
                  onChange?.((x) => { x.testimonyText = ""; x.testimonyVisibility = "private"; });
                }}>
                  Withdraw
                </Button>
              )}
            </div>
          </>
        ) : c.testimonyText ? (
          <>
            <ReadBox title={`Testimony (${c.testimonyVisibility || "private"})`} value={c.testimonyText} />
          </>
        ) : (
          <p style={{ color: T.muted, marginTop: 0 }}>No testimony shared.</p>
        )}
      </div>

      <p style={{ color: T.muted, marginTop: 8, marginBottom: 0 }}>
        View-only. Resolved sessions are preserved for reflection.
      </p>
    </div>
  );
}

/* -------------------------- FORM UTILITIES ---------------------------- */

function labelStyle(T: Theme): React.CSSProperties {
  return { fontSize: 13, color: T.muted, marginBottom: 6 };
}
function inputStyle(T: Theme): React.CSSProperties {
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
function textareaStyle(T: Theme): React.CSSProperties {
  return { ...inputStyle(T), minHeight: 106, resize: "vertical" as const };
}

function Field({
  label,
  value,
  onChange,
  T,
  textarea,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  T: Theme;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle(T)}>{label}</label>
      {textarea ? (
        <textarea
          style={textareaStyle(T)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
          onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
        />
      ) : (
        <input
          style={inputStyle(T)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
          onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
        />
      )}
    </div>
  );
}

function FieldRaw({
  label,
  T,
  children,
}: {
  label: string;
  T: Theme;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle(T)}>{label}</label>
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  T,
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
        transition: "filter 120ms ease",
        outline: "none",
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.filter = "brightness(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1.0)")}
      onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  T,
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
        transition: "background 120ms ease, filter 120ms ease",
        outline: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {children}
    </button>
  );
}

function AccentButton({
  children,
  onClick,
  T,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  T: Theme;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 12,
        padding: "12px 16px",
        cursor: "pointer",
        fontWeight: 700,
        background: T.accent,
        color: themeDark === T ? "#1b1500" : "#3a2f00",
        transition: "filter 120ms ease",
        outline: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1.0)")}
      onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {children}
    </button>
  );
}

/* ------------------------------ VIEWS --------------------------------- */

function LessonsView({ T }: { T: Theme }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle(T)}>
        <h2 style={{ marginTop: 0 }}>Mini Lesson Library</h2>
        <p style={{ color: T.muted, marginTop: 6, maxWidth: "70ch" }}>
          Short, Scripture-rooted learning for real marriage moments.
        </p>
      </div>
      {seedLessons.map((l) => {
        const open = openId === l.id;
        return (
          <div key={l.id} style={cardStyle(T)}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: "6px 0" }}>{l.title}</h3>
                <p style={{ color: T.muted, marginTop: 4, maxWidth: "70ch" }}>{l.description}</p>
              </div>
              <Button onClick={() => setOpenId(open ? null : l.id)}>
                {open ? "Close" : "Open"}
              </Button>
            </div>
            {open && (
              <div style={{ marginTop: 10, border: `1px solid ${T.soft}`, borderRadius: 12, padding: 12 }}>
                <div style={{ whiteSpace: "pre-wrap", maxWidth: "70ch" }}>{l.body}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Button variant="ghost" onClick={() => alert("Action idea: Send one gratitude text now.")}>
                    Do Together: Gratitude Text
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function ScriptureView({ T }: { T: Theme }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return seedScriptures;
    return seedScriptures.filter(
      (s) =>
        s.ref.toLowerCase().includes(term) ||
        s.text.toLowerCase().includes(term) ||
        s.topics.some((t) => t.includes(term))
    );
  }, [q]);

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle(T)}>
        <h2 style={{ marginTop: 0 }}>Scripture Bank</h2>
        <p style={{ color: T.muted, marginTop: 6, maxWidth: "70ch" }}>
          Search by topic or reference (e.g., “forgiveness”, “anger”, “Colossians”).
        </p>
        <div style={{ marginTop: 8 }}>
          <input
            style={inputStyle(T)}
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search Scriptures"
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {results.map((s) => (
          <div key={s.ref} style={cardStyle(T)}>
            <div style={{ color: T.accent, fontWeight: 700 }}>{s.ref}</div>
            <div style={{ marginTop: 6, maxWidth: "70ch" }}>{s.text}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {s.topics.map((t) => (
                <TabPill key={t}>{t}</TabPill>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------- MINI ASSESSMENT VIEW ------------------------ */

type QA = { q: string; map: Partial<Record<StyleKey, number>> };

const assessment: QA[] = [
  { q: "When a conflict starts, I’m most likely to…", map: { Avoider: 2, Stonewaller: 1, Peacemaker: 1 } },
  { q: "When I feel unheard, my first draft sounds like…", map: { Critic: 2, Collaborator: 1 } },
  { q: "I feel safest in conflict when…", map: { Peacemaker: 2, Collaborator: 1 } },
  { q: "Under time pressure, I tend to…", map: { Critic: 1, Avoider: 1, Stonewaller: 1 } },
  { q: "My natural strength in hard talks is…", map: { Collaborator: 2, Peacemaker: 1 } },
  { q: "When flooded emotionally, I often…", map: { Stonewaller: 2, Avoider: 1 } },
];

function computeStyles(scores: Record<StyleKey, number>): UserStyles {
  const entries = (Object.keys(scores) as StyleKey[]).map((k) => [k, scores[k] || 0]) as [StyleKey, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const primary = entries[0]?.[0];
  const secondary = entries[1]?.[0];
  return { primary, secondary };
}

function ProfileView({
  T,
  RM,
  activeUser,
  styles,
  setStyles,
  prefs,
  setPrefs,
}: {
  T: Theme;
  RM: boolean;
  activeUser: UserId;
  styles: AllStyles;
  setStyles: React.Dispatch<React.SetStateAction<AllStyles>>;
  prefs: Prefs;
  setPrefs: React.Dispatch<React.SetStateAction<Prefs>>;
}) {
  const userStyle = styles[activeUser];
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<number[]>(Array(assessment.length).fill(0));
  const [submitted, setSubmitted] = useState(false);

  const start = () => {
    setTaking(true);
    setSubmitted(false);
    setAnswers(Array(assessment.length).fill(0));
  };

  const submit = () => {
    const totals: Record<StyleKey, number> = {
      Avoider: 0, Critic: 0, Stonewaller: 0, Peacemaker: 0, Collaborator: 0,
    };
    answers.forEach((a, idx) => {
      if (a === 1) {
        const m = assessment[idx].map;
        (Object.keys(m) as StyleKey[]).forEach((k) => (totals[k] += m[k] || 0));
      }
    });
    if (Object.values(totals).every((v) => v === 0)) { totals.Peacemaker = 1; totals.Collaborator = 1; }
    const res = computeStyles(totals);
    setStyles((prev) => ({ ...prev, [activeUser]: res }));
    setSubmitted(true);
    setTaking(false);
  };

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={cardStyle(T)}>
        <h2 style={{ marginTop: 0 }}>Profile</h2>
        <p style={{ color: T.muted, maxWidth: "70ch" }}>
          Your conflict style guides personalized tips during the path.
        </p>
        <SafetyBanner />
      </div>

      <div style={cardStyle(T)}>
        <h3 style={{ marginTop: 0 }}>Your Conflict Style</h3>
        {userStyle?.primary ? (
          <>
            <p style={{ marginTop: 6 }}>
              <b>Primary:</b> {userStyle.primary} {userStyle.secondary ? <>• <b>Secondary:</b> {userStyle.secondary}</> : null}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <TabPill color={T.primary}>Personalized tips are active</TabPill>
            </div>
            <div style={{ marginTop: 12 }}>
              <Button variant="ghost" onClick={start}>Retake Mini-Assessment</Button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: T.muted }}>No results yet for User {activeUser}.</p>
            <Button onClick={start}>Take Mini-Assessment (2–3 min)</Button>
          </>
        )}
      </div>

      {taking && (
        <div style={cardStyle(T)}>
          <h3 style={{ marginTop: 0 }}>Mini-Assessment</h3>
          <p style={{ color: T.muted, marginTop: 0 }}>
            For each statement, choose <i>Agree</i> if it usually fits you.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {assessment.map((qa, i) => (
              <div key={i} style={{ border: `1px solid ${T.soft}`, borderRadius: 12, padding: 12 }}>
                <div style={{ marginBottom: 8 }}>{i + 1}. {qa.q}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <ToggleButtons
                    options={["Neutral", "Agree"]}
                    value={answers[i] === 1 ? "Agree" : "Neutral"}
                    onChange={(v) =>
                      setAnswers((arr) => {
                        const copy = [...arr];
                        copy[i] = v === "Agree" ? 1 : 0;
                        return copy;
                      })
                    }
                   
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button onClick={submit}>Save My Results</Button>
            <Button variant="ghost" onClick={() => setTaking(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {submitted && (
        <Banner color={T.success}>Assessment saved. Your coaching tips will appear during conflict steps.</Banner>
      )}

      <div style={cardStyle(T)}>
        <h3 style={{ marginTop: 0 }}>Accessibility & Preferences</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={!!prefs.reducedMotion}
              onChange={(e) => setPrefs((p) => ({ ...p, reducedMotion: e.target.checked }))}
              aria-label="Reduced motion"
            />
            <span>Reduced motion</span>
          </label>
          <TabPill>{prefs.reducedMotion ? "On" : "Off"}</TabPill>
        </div>
      </div>

      <div style={cardStyle(T)}>
        <h3 style={{ marginTop: 0 }}>About the Name: TrueGlue</h3>
        <p style={{ maxWidth: "70ch" }}>
          Inspired by <b>Colossians 3:14</b> — love binds everything together in perfect harmony.
          A reverent, minimalist tool to help couples turn conflict into growth, forgiveness,
          and unity in Christ.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------ HELPERS ------------------------------- */

function labelForStep(s: ConflictStep) {
  switch (s) {
    case "QUALIFY": return "Qualification";
    case "RECIPIENT_REVIEW": return "Review Partner’s View";
    case "QUESTIONS_SELFCRITIQUE": return "Questions & Self-Critique";
    case "CALM_PREPARE": return "Calm & Prepare";
    case "SCHEDULE": return "Schedule";
    case "DECISION_REPAIR": return "Decision & Repair";
    case "RESOLVED": return "Resolved";
  }
}

