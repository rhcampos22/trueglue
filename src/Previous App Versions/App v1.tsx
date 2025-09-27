import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./ui";

/**
 * TrueGlue – Single-file React + TypeScript demo
 * Additions:
 *  - Light/Dark theme with persistence (Light is default)
 *  - Conflict Style Mini-Assessment (per user) -> primary/secondary styles
 *  - Just-in-time tip chips during conflict steps, driven by styles
 *
 * No external dependencies. Paste into src/App.tsx in a React+TS project (e.g., Replit).
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
  decisionsAgreements?: string;
  apologiesForgiveness?: string;
  followUpPlan?: string;
  step: ConflictStep;
  createdAt: number;
  resolvedAt?: number;
};

type Lesson = { id: string; title: string; description: string; body: string };
type Scripture = { ref: string; text: string; topics: string[] };

type Theme = typeof themeDark;
type ThemeName = "dark" | "light";

/* ----------------------------- THEME ---------------------------------- */

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

const LS_CONFLICTS = "trueglue_conflicts_v3";
const LS_THEME = "trueglue_theme";
const LS_STYLES = "trueglue_styles_v1"; // stores per-user assessment results

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

/* ------------------------------ UTILS --------------------------------- */

const uid = () => Math.random().toString(36).slice(2);
const fmtDateTime = (d: number) =>
  new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ------------------------------- APP ---------------------------------- */

type Tab = "Conflicts" | "Lessons" | "Scripture" | "Profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Conflicts");
  const [activeUser, setActiveUser] = useState<UserId>("A");
  const [conflicts, setConflicts] = useState<ConflictSession[]>([]);
  const [themeName, setThemeName] = useState<ThemeName>(loadTheme());
  const [styles, setStyles] = useState<AllStyles>(loadStyles());

  const T: Theme = themeName === "dark" ? themeDark : themeLight;

  useEffect(() => setConflicts(loadConflicts()), []);
  useEffect(() => saveConflicts(conflicts), [conflicts]);
  useEffect(() => saveTheme(themeName), [themeName]);
  useEffect(() => saveStyles(styles), [styles]);

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
                width: 36,
                height: 36,
                borderRadius: 999,
                background: T.accent,
                display: "grid",
                placeItems: "center",
                color: themeName === "dark" ? "#1b1500" : "#3a2f00",
                fontWeight: 900,
                letterSpacing: "0.04em",
              }}
              title="TrueGlue"
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
             
            />
            <span style={{ color: T.muted, fontSize: 13, marginLeft: 8 }}>Theme:</span>
            <ToggleButtons
              options={["Light", "Dark"]}
              value={themeName === "dark" ? "Dark" : "Light"}
              onChange={(v) => setThemeName(v === "Dark" ? "dark" : "light")}
             
            />
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["Conflicts", "Lessons", "Scripture", "Profile"] as Tab[]).map((t) => (
            <TabButton key={t} active={activeTab === t} onClick={() => setActiveTab(t)}>
              {t}
            </TabButton>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main style={layoutStyle}>
        {activeTab === "Conflicts" && (
          <ConflictsView
           
            activeUser={activeUser}
            conflicts={conflicts}
            setConflicts={setConflicts}
            myOpen={myOpen}
            myResolved={myResolved}
            userStyles={styles}
          />
        )}
        {activeTab === "Lessons" && <LessonsView />}
        {activeTab === "Scripture" && <ScriptureView />}
        {activeTab === "Profile" && (
          <ProfileView
           
            activeUser={activeUser}
            styles={styles}
            setStyles={setStyles}
          />
        )}
      </main>

      <footer style={{ padding: 24, opacity: 0.7, textAlign: "center", fontSize: 12, color: T.muted }}>
        Demo: local two-user simulation. Data stored in your browser.
      </footer>
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

function TabButton({
  children,
  active,
  onClick,
  T,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  T: Theme;
}) {
  const base: React.CSSProperties = {
    border: `1px solid ${T.soft}`,
    borderRadius: 12,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
    background: "transparent",
    color: T.text,
    transition: "transform 120ms ease, filter 120ms ease, background 120ms ease",
  };
  const activeStyle: React.CSSProperties = {
    background: T.primary,
    color: "#001315",
    borderColor: T.primary,
  };
  return (
    <button
      style={{ ...base, ...(active ? activeStyle : {}), willChange: "transform" }}
      onClick={onClick}
      onMouseEnter={(e) => ((e.currentTarget.style.filter = "brightness(1.05)"))}
      onMouseLeave={(e) => ((e.currentTarget.style.filter = "brightness(1.0)"))}
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
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  T: Theme;
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
              padding: "6px 10px",
              fontWeight: 600,
              cursor: "pointer",
              background: active ? T.accent : "transparent",
              color: active ? (T === themeDark ? "#1b1500" : "#3a2f00") : T.text,
            }}
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
              padding: "6px 10px",
              cursor: "pointer",
            }}
            onClick={onClose}
            aria-label="Close"
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
    <Pill color={T.accent}>
      Scripture: {refText}
    </Pill>
  );
}

function CalmPrepare({ T, compact }: { T: Theme; compact?: boolean }) {
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
        <div style={{ ...cardStyle(T) }}>
          <h4 style={{ marginTop: 0 }}>Prayer</h4>
          <p style={{ color: T.muted }}>
            “Lord Jesus, make me quick to hear, slow to speak, and slow to anger. Bind us in your love.”
          </p>
        </div>
      </div>
      <div style={{ ...cardStyle(T) }}>
        <h4 style={{ marginTop: 0 }}>Today’s Scripture</h4>
        <div style={{ color: T.accent }}>
          Colossians 3:14 — “Above all, put on love, which binds everything together in perfect harmony.”
        </div>
      </div>
    </div>
  );
}

/* ----------------------- CONFLICT STYLE TIPS -------------------------- */

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
        <Pill key={i} color={T.primary}>
          {t}
        </Pill>
      ))}
    </div>
  );
}

/* --------------------------- CONFLICTS VIEW --------------------------- */

function ConflictsView({
  T,
  activeUser,
  conflicts,
  setConflicts,
  myOpen,
  myResolved,
  userStyles,
}: {
  T: Theme;
  activeUser: UserId;
  conflicts: ConflictSession[];
  setConflicts: React.Dispatch<React.SetStateAction<ConflictSession[]>>;
  myOpen: ConflictSession[];
  myResolved: ConflictSession[];
  userStyles: AllStyles;
}) {
  const [showNew, setShowNew] = useState(false);
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
    };
    setConflicts((arr) => [c, ...arr]);
    setShowCalm(false);
    setShowNew(true);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {showCalm && (
        <Modal onClose={() => setShowCalm(false)} title="Calm & Prepare">
          <CalmPrepare />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button onClick={actuallyCreate}>I’m ready to begin</Button>
            <Button variant="ghost" onClick={() => setShowCalm(false)}>Cancel</Button>
          </div>
        </Modal>
      )}

      <div style={cardStyle(T)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ margin: 0, letterSpacing: "0.02em" }}>Conflict Sessions</h2>
          <AccentButton onClick={startNew}>+ Start Conflict</AccentButton>
        </div>
        <p style={{ color: T.muted, marginTop: 6, maxWidth: "70ch" }}>
          Guided, cooperative path with Scripture—and coaching matched to your style.
        </p>

        {showNew && myOpen.length > 0 && myOpen[0].initiator === activeUser && myOpen[0].step === "QUALIFY" && (
          <div style={{ marginTop: 12 }}>
            <ConflictCard
              c={myOpen[0]}
              me={activeUser}
              setConflicts={setConflicts}
             
              myStyles={userStyles[activeUser]}
            />
          </div>
        )}
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
               
                myStyles={userStyles[activeUser]}
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
  myStyles,
}: {
  c: ConflictSession;
  me: UserId;
  setConflicts: React.Dispatch<React.SetStateAction<ConflictSession[]>>;
  T: Theme;
  myStyles?: UserStyles;
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

  function completeDecisionRepair() {
    update((x) => {
      x.decisionsAgreements = decisions.trim();
      x.apologiesForgiveness = apologies.trim();
      x.followUpPlan = followUp.trim();
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

  return (
    <div style={{ ...cardStyle(T), borderColor: T.primary }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Pill>Session #{c.id.slice(0, 6)}</Pill>
        <Pill>Initiator: <b>{c.initiator}</b></Pill>
        <Pill>Recipient: <b>{c.recipient}</b></Pill>
        <Pill>Started {fmtDateTime(c.createdAt)}</Pill>
        {c.resolvedAt && <Pill>Resolved {fmtDateTime(c.resolvedAt)}</Pill>}
      </div>

      {iAmRecipient && c.hasPromptForRecipient && (
        <Banner color={T.primary}>You have a pending action on this session.</Banner>
      )}
      {iAmInitiator && c.hasPromptForInitiator && (
        <Banner color={T.accent}>Your partner responded. Continue when ready.</Banner>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {stepOrder.map((s, i) => (
          <Pill key={s} color={i <= currentIndex ? (i === currentIndex ? T.primary : T.soft) : T.soft}>
            {i + 1}. {labelForStep(s)}
          </Pill>
        ))}
      </div>

      {showCalm && (
        <Modal onClose={() => setShowCalm(false)} title="Calm & Prepare">
          <CalmPrepare />
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
              Initiator states the issue in <b>one sentence</b>, then adds brief details. Initiator accepts the single focus, then the recipient reviews and accepts it too.
            </p>

            {/* Style tips for current user */}
            <TipChips styles={myStyles} step="QUALIFY" role={iAmInitiator ? "initiator" : "recipient"} />

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
            <CalmPrepare compact />
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
                  />
                </FieldRaw>
                <FieldRaw label="Time">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={inputStyle(T)}
                  />
                </FieldRaw>
              </div>
              <FieldRaw label='Descriptor (optional, e.g., "after dinner")'>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder='e.g., "after kids are in bed"'
                  style={inputStyle(T)}
                />
              </FieldRaw>
              <Button onClick={proposeTime}>
                Save Proposed Time
              </Button>
            </fieldset>

            {(c.proposedDate || c.proposedTime || c.proposedDescriptor) && (
              <div style={{ ...cardStyle(T), marginTop: 12 }}>
                <h4 style={{ marginTop: 0 }}>Proposed</h4>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {c.proposedDate && <li>Date: {c.proposedDate}</li>}
                  {c.proposedTime && <li>Time: {c.proposedTime}</li>}
                  {c.proposedDescriptor && <li>Descriptor: {c.proposedDescriptor}</li>}
                </ul>
              </div>
            )}

            {iAmRecipient && (c.proposedDate || c.proposedTime || c.proposedDescriptor) && !c.confirmedDateTimeByRecipient && (
              <div style={{ marginTop: 8 }}>
                <Button onClick={recipientConfirmTime}>
                  Confirm Proposed Time
                </Button>
              </div>
            )}

            {c.confirmedDateTimeByRecipient && (
              <div style={{ color: T.success, marginTop: 8 }}>
                ✓ Recipient confirmed. Proceed to Decision & Repair.
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
            <ResolvedCard c={c} me={me} />
          </div>
        )}
      </div>
    </div>
  );
}

function ResolvedCard({ c, me, T }: { c: ConflictSession; me: UserId; T: Theme }) {
  return (
    <div style={cardStyle(T)}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Pill>Initiator {c.initiator}</Pill>
        <Pill>Recipient {c.recipient}</Pill>
        <Pill>Created {fmtDateTime(c.createdAt)}</Pill>
        {c.resolvedAt && <Pill>Resolved {fmtDateTime(c.resolvedAt)}</Pill>}
      </div>
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        <ReadBox title="Issue" value={c.issueSentence || ""} />
        <ReadBox title="Details" value={c.issueDetails || ""} />
        <ReadBox title="Recipient Summary" value={c.recipientReviewSummary || ""} />
        <ReadBox title="Nonhostile Questions" value={c.nonhostileQuestions || ""} />
        <ReadBox title="Self-Critique" value={c.selfCritique || ""} />
        <ReadBox
          title="Scheduled"
          value={
            c.confirmedDateTimeByRecipient
              ? `${c.proposedDate || ""} ${c.proposedTime || ""} ${c.proposedDescriptor || ""}`.trim()
              : "—"
          }
         
        />
        <ReadBox title="Agreements / Decisions" value={c.decisionsAgreements || ""} />
        <ReadBox title="Apologies & Forgiveness" value={c.apologiesForgiveness || ""} />
        <ReadBox title="Follow-up Plan" value={c.followUpPlan || ""} />
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
    padding: "10px 12px",
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
        />
      ) : (
        <input
          style={inputStyle(T)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
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
        padding: "10px 14px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
        background: T.primary,
        color: "#001315",
        opacity: disabled ? 0.6 : 1,
        transition: "filter 120ms ease",
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.filter = "brightness(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1.0)")}
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
        padding: "10px 14px",
        cursor: "pointer",
        fontWeight: 600,
        background: "transparent",
        color: T.text,
        transition: "background 120ms ease, filter 120ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
        padding: "10px 14px",
        cursor: "pointer",
        fontWeight: 700,
        background: T.accent,
        color: themeDark === T ? "#1b1500" : "#3a2f00",
        transition: "filter 120ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1.0)")}
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
                <Pill key={t}>{t}</Pill>
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
  {
    q: "When a conflict starts, I’m most likely to…",
    map: { Avoider: 2, Stonewaller: 1, Peacemaker: 1 },
  },
  {
    q: "When I feel unheard, my first draft sounds like…",
    map: { Critic: 2, Collaborator: 1 },
  },
  {
    q: "I feel safest in conflict when…",
    map: { Peacemaker: 2, Collaborator: 1 },
  },
  {
    q: "Under time pressure, I tend to…",
    map: { Critic: 1, Avoider: 1, Stonewaller: 1 },
  },
  {
    q: "My natural strength in hard talks is…",
    map: { Collaborator: 2, Peacemaker: 1 },
  },
  {
    q: "When flooded emotionally, I often…",
    map: { Stonewaller: 2, Avoider: 1 },
  },
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
  activeUser,
  styles,
  setStyles,
}: {
  T: Theme;
  activeUser: UserId;
  styles: AllStyles;
  setStyles: React.Dispatch<React.SetStateAction<AllStyles>>;
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
    // Simple scoring: each question contributes its map to totals if "agree" was chosen.
    // For demo: radio 0 = skip/neutral, 1 = agree. (Could expand to Likert easily.)
    const totals: Record<StyleKey, number> = {
      Avoider: 0, Critic: 0, Stonewaller: 0, Peacemaker: 0, Collaborator: 0,
    };
    answers.forEach((a, idx) => {
      if (a === 1) {
        const m = assessment[idx].map;
        (Object.keys(m) as StyleKey[]).forEach((k) => (totals[k] += m[k] || 0));
      }
    });
    // If all zeros (no answers), seed tiny baseline for Collaborator/Peacemaker to avoid empties
    if (Object.values(totals).every((v) => v === 0)) {
      totals.Peacemaker = 1; totals.Collaborator = 1;
    }
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
          Conflict style assessment & personalization live here. Your results guide coaching tips during the conflict path.
        </p>
      </div>

      <div style={cardStyle(T)}>
        <h3 style={{ marginTop: 0 }}>Your Conflict Style</h3>
        {userStyle?.primary ? (
          <>
            <p style={{ marginTop: 6 }}>
              <b>Primary:</b> {userStyle.primary} {userStyle.secondary ? <>• <b>Secondary:</b> {userStyle.secondary}</> : null}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill color={T.primary}>Personalized tips are active</Pill>
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

