import React, { useEffect, useMemo, useState, createContext, useContext } from "react";

/** ============================================================
 *  TRUEGLUE — Unified App (React + TypeScript) • Single-file entry
 *  Design vibe: Made One’s clean layout + TrueGlue color palette
 *  Storage: localStorage (offline-friendly) w/ simple versioning
 *  Routing: minimal hash router (#/home, #/microhabits, etc.)
 *  A11y: tabs w/ roles, aria-selected, aria-controls, aria-labelledby
 *  ============================================================ */

/* -------------------- THEME (TrueGlue palette) -------------------- */
export const TG_COLORS = {
  primary: "#8A1538",   // Deep burgundy (heart/cross vibe)
  primaryDim: "#B44B66",
  accent: "#D4AF37",    // Use for accents/borders/icons; avoid for body text
  bg: "#FAF9FB",
  surface: "#FFFFFF",
  text: "#1F2430",
  textDim: "#586074",
  border: "#E6E2E8",
  success: "#2E7D32",
  warn: "#B26A00",
  danger: "#C62828",
} as const;

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

const logoDotStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 14,
  background: TG_COLORS.primary,
  border: `2px solid ${TG_COLORS.accent}`,
  boxShadow: "0 0 0 2px rgba(212,175,55,0.2)",
};

const h1Style: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  letterSpacing: 0.2,
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
  "selfControl",
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
  selfControl: [
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
          <div style={logoDotStyle} role="img" aria-label="TrueGlue logo" />
          <div>
            <h1 style={h1Style}>TrueGlue</h1>
            <p style={taglineStyle}>Gospel-centered tools for everyday marriage.</p>
          </div>
        </header>

        <Nav route={route} setRoute={setRoute} />

        <Ctx.Provider value={api}>
          <Panel route={route} />
        </Ctx.Provider>

        <Footer />
      </div>
    </div>
  );
}

/* -------------------- NAV (ARIA tabs + keyboard arrows + hide disabled) -------------------- */
function Nav({ route, setRoute }: { route: TGRoute; setRoute(v: TGRoute): void }) {
  const baseTabs = useMemo(
    () =>
      [
        { id: "home", label: "Home" },
        { id: "microhabits", label: "Micro-Habits" },
        { id: "lessons", label: "Lessons" },
        { id: "workflow", label: "Conflict Workflow" },
        { id: "assessments", label: "Assessments" },
        { id: "calm", label: "Calm" },
      ] as const,
    []
  );

  const tabs = useMemo(() => {
    return FEATURES.churchMode
      ? [...baseTabs.slice(0, 5), { id: "church", label: "Church" } as const, baseTabs[5]]
      : baseTabs;
  }, [baseTabs]);

  return (
    <nav
      style={navStyle}
      role="tablist"
      aria-label="Primary"
      onKeyDown={(e) => {
        const order = tabs.map((t) => t.id);
        const i = order.indexOf(route);
        if (e.key === "ArrowRight") {
          const next = order[(i + 1) % order.length];
          window.location.hash = `#/${next}`;
          setRoute(next);
          (document.getElementById(`tab-${next}`) as HTMLButtonElement | null)?.focus();
        } else if (e.key === "ArrowLeft") {
          const prev = order[(i - 1 + order.length) % order.length];
          window.location.hash = `#/${prev}`;
          setRoute(prev);
          (document.getElementById(`tab-${prev}`) as HTMLButtonElement | null)?.focus();
        }
      }}
    >
      {tabs.map((t) => {
        const active = route === t.id;
        const tabId = `tab-${t.id}`;
        const panelId = `panel-${t.id}`;
        return (
          <button
            id={tabId}
            key={t.id}
            type="button"
            onClick={() => {
              window.location.hash = `#/${t.id}`;
              setRoute(t.id);
            }}
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            style={active ? activePillStyle : pillStyle}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

/* -------------------- PANEL ROUTER (with panel ids/roles/labels) -------------------- */
function Panel({ route }: { route: TGRoute }) {
  const pid = (id: TGRoute) => ({
    id: `panel-${id}`,
    role: "tabpanel" as const,
    "aria-labelledby": `tab-${id}`,
    tabIndex: 0, // focusable target when switching tabs via keyboard
  });
  switch (route) {
    case "home":
      return (
        <div {...pid("home")}>
          <Home />
        </div>
      );
    case "microhabits":
      return (
        <div {...pid("microhabits")}>
          <MicroHabits />
        </div>
      );
    case "lessons":
      return (
        <div {...pid("lessons")}>
          <Lessons />
        </div>
      );
    case "workflow":
      return (
        <div {...pid("workflow")}>
          <ConflictWorkflow />
        </div>
      );
    case "assessments":
      return (
        <div {...pid("assessments")}>
          <Assessments />
        </div>
      );
    case "calm":
      return (
        <div {...pid("calm")}>
          <CalmTools />
        </div>
      );
    case "church":
      return (
        <div {...pid("church")}>
          <ChurchPanel />
        </div>
      );
    default:
      return (
        <div {...pid("home")}>
          <Home />
        </div>
      );
  }
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

/* -------------------- CONFLICT WORKFLOW -------------------- */
type Step =
  | "qualification"
  | "disclosure"
  | "review"
  | "nonhostile"
  | "calm"
  | "schedule"
  | "decisionRepair";

const WorkflowCopy: Record<Step, { title: string; body: string[] }> = {
  qualification: {
    title: "Qualification",
    body: [
      "Is the issue safe and appropriate to address now?",
      "Is either spouse too escalated? If so, go to Calm.",
    ],
  },
  disclosure: {
    title: "Disclosure",
    body: [
      "Each spouse shares facts without blame.",
      "Use ‘I’ statements; avoid mind-reading.",
    ],
  },
  review: {
    title: "Review",
    body: [
      "Summarize what you heard your spouse say.",
      "Check accuracy; ask clarifying questions kindly.",
    ],
  },
  nonhostile: {
    title: "Non-Hostile Q&A",
    body: [
      "Ask only curiosity questions; no cross-examining.",
      "Assume good faith; look for underlying needs.",
    ],
  },
  calm: {
    title: "Calm & Prepare",
    body: [
      "Take a 5-minute breathing break if needed.",
      "Pray briefly together for unity & wisdom.",
    ],
  },
  schedule: {
    title: "Schedule the Talk",
    body: [
      "Choose a 30–45 minute window within 24 hours.",
      "Set goal: understanding first, then problem-solve.",
    ],
  },
  decisionRepair: {
    title: "Decision & Repair",
    body: [
      "State specific next steps or amends.",
      "Close with encouragement or gratitude.",
    ],
  },
};

function ConflictWorkflow() {
  const [step, setStep] = useState<Step>("qualification");
  const keys: Step[] = [
    "qualification",
    "disclosure",
    "review",
    "nonhostile",
    "calm",
    "schedule",
    "decisionRepair",
  ];

  return (
    <>
      <Card title="Steps">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setStep(k)}
              style={{
                ...pillStyle,
                borderColor: step === k ? TG_COLORS.primary : TG_COLORS.border,
              }}
              aria-pressed={step === k}
            >
              {WorkflowCopy[k].title}
            </button>
          ))}
        </div>
      </Card>

      <Card title={WorkflowCopy[step].title}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {WorkflowCopy[step].body.map((b, i) => (
            <li key={i} style={{ lineHeight: 1.6 }}>
              {b}
            </li>
          ))}
        </ul>
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
