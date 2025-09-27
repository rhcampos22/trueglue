import React, { useEffect, useMemo, useState, createContext, useContext } from "react";
import TrueGlueLogo from "./assets/TrueGlueLogoNoText.png";
import ConflictWorkflow from "./components/ConflictWorkflow";
import { TG_COLORS, ThemeProvider, useTheme } from "./theme";
import { createPortal } from "react-dom";
import { useT, cardStyle, focusRing, PrimaryButton, Pill } from "./ui";
import SignInPanel from "./features/auth/SignInPanel";
import CouplePanel from "./features/couple/CouplePanel";

function ThemeTogglePortal() {
  const { theme, toggle, colors } = useTheme();  // call hook unconditionally
  if (typeof document === "undefined") return null;  // then guard SSR
  
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

// ===== Conflict Workflow: Utilities =====

/* -------------------- App Utilities (keep in App.tsx) -------------------- */
// Used at module load to create stable IDs for the ASSESSMENT questions.
const uid = () => Math.random().toString(36).slice(2);


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
  fontSize: 13,
};

const navStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  margin: "10px 0 18px",
};


/* -------------------- TYPES & DATA MODELS -------------------- */
 export type TGRoute =
   | "home"
   | "microhabits"
   | "lessons"
   | "profile"
   | "workflow"
   | "assessments"
   | "church"
   | "metrics";

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
  | "calmBreath"
  | "journal"; // NEW

type LifeStage = "engaged" | "newlywed" | "parenting" | "emptyNest" | "blended" | "retired";
type KidsStage = "none" | "infant" | "elementary" | "teen" | "adult";

type UserProfile = {
  displayName?: string;
  email?: string;
  spouseName?: string;
  anniversary?: string; // YYYY-MM-DD
  church?: string;

  // NEW personalization fields gathered during onboarding:
  ageRange?: "18–24" | "25–34" | "35–44" | "45–54" | "55–64" | "65+";
  lifeStage?: "engaged" | "newlywed" | "raising-kids" | "empty-nesters" | "single-parent" | "widowed" | "other";
  kidsCount?: number;       // total # of kids
  yearsMarried?: number;    // approximate
};

type Couple = {
  id: string;              // shared couple id (local placeholder; will be Supabase id later)
  inviteCode?: string;     // generated share code the other device can use
  spouseEmail?: string;    // optional: for future email invite
  joinedAt?: number;       // timestamp when both accepted
};

// ==== Journaling types (optional; works without migrations) ====
type JournalEntry = {
  id: string;
  isoDateTime: string; // e.g., 2025-09-23T07:45:00-07:00
  encrypted?: { iv: string; blob: string }; // AES-GCM encrypted JSON: { text: string }
  onPaper?: boolean;   // true when they marked done without typing
  // sharedTo?: ("spouse" | "pastor")[]; // optional future
};

// NEW — global privacy prefs
type PrivacyPrefs = {
  allowPastorView: boolean; // master toggle for leader/mentor visibility of anonymized metrics
  pinEnabled?: boolean;
  autoLockMinutes?: 5 | 10 | 30 | 60;
  consentLog?: Array<{ at: number; allow: boolean }>;
};

type JournalPrefs = {
  remindDaily: boolean;
  remindTime?: string;              // "HH:MM" 24h, e.g. "08:30"
  remindAfterWorkflow: boolean;
  historyView: "list" | "calendar"; // toggle the default view
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

// -------------------- ONBOARDING FLAG (separate from UserState) --------------------
const ONBOARD_KEY = "trueglue.v2.onboarding.done";
function hasOnboarded() {
  try { return localStorage.getItem(ONBOARD_KEY) === "1"; } catch { return false; }
}
function setOnboarded() {
  try { localStorage.setItem(ONBOARD_KEY, "1"); } catch {}
}

// ---- New intro flag (separate from the old "welcome" gate) ----
const INTRO_KEY = "trueglue.v2.onboarding.intro.done";
function hasIntroDone() {
  try { return localStorage.getItem(INTRO_KEY) === "1"; } catch { return false; }
}
function setIntroDone() {
  try { localStorage.setItem(INTRO_KEY, "1"); } catch {}
}

// ---- tiny query param helpers (work with hash routing + ?query) ----
function getQueryParam(name: string): string | null {
  const q = (typeof window !== "undefined" ? window.location.href : "").split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get(name);
}

function setQueryParam(name: string, value?: string | null) {
  if (typeof window === "undefined") return;
  const [base, search] = window.location.href.split("?");
  const params = new URLSearchParams(search || "");
  if (value == null) params.delete(name);
  else params.set(name, value);
  const next = params.toString() ? `${base}?${params.toString()}` : base;
  window.history.replaceState({}, "", next);
}

/* -------------------- STORAGE (versioned + migration stub) -------------------- */
export const STORAGE_KEY = "trueglue.v2.user";
export const STORAGE_VERSION = 7;

// === Conflict Styles (NEW) ===
type ConflictStyle = "Avoidant" | "Competitive" | "Cooperative";

export type UserState = {
  version: number;
  completedHabits: Partial<Record<MicroHabitId, string[]>>;
  assessmentScores: Partial<Record<"cooperative" | "avoidant" | "competitive", number>>;
  /** Dates (YYYY-MM-DD) a conflict was marked “resolved”. */
  conflictResolutions?: string[];

  selectedVerseTopic: VerseTopic;

  // NEW — results
  stylePrimary?: ConflictStyle;
  styleSecondary?: ConflictStyle;

  // NEW
  profile?: UserProfile;

  // NEW — Journaling (optional so older blobs load fine)
  journal?: {
    entries: JournalEntry[];
    prefs: JournalPrefs;
  };

  // NEW — Privacy (optional; default provided in load/migrate)
  privacy?: PrivacyPrefs;

// NEW
  couple?: Couple;
};

// ===== Defaults for new fields =====
export const DEFAULT_PRIVACY: PrivacyPrefs = {
  allowPastorView: false,
  pinEnabled: false,
  autoLockMinutes: 10,
  consentLog: [],
};

export const DEFAULT_JOURNAL: NonNullable<UserState["journal"]> = {
  entries: [],
  prefs: { remindDaily: false, remindTime: "20:30", remindAfterWorkflow: false, historyView: "list" },
};

function DEFAULT_USER_FROM(old: any, overrides: Partial<UserState> = {}): UserState {
  return {
    version: STORAGE_VERSION,
    completedHabits: old.completedHabits ?? {},
    assessmentScores: old.assessmentScores ?? {},
    conflictResolutions: old.conflictResolutions ?? [],
    selectedVerseTopic: "unity",
    stylePrimary: old.stylePrimary,
    styleSecondary: old.styleSecondary,
    profile: old.profile ?? undefined,
    journal: old.journal ?? DEFAULT_JOURNAL,
    privacy: old.privacy ?? DEFAULT_PRIVACY,
    couple: old.couple ?? undefined,           // <-- add this line
    ...overrides,
  };
}

function migrate(old: any): UserState | null {
  if (!old || typeof old !== "object") return null;

  
  if (old.version === 1) {
  return DEFAULT_USER_FROM(old, { selectedVerseTopic: old.selectedVerseTopic ?? "unity" });
}

  if (old.version === 2) return { ...DEFAULT_USER_FROM(old, { selectedVerseTopic: old.selectedVerseTopic ?? "unity" }) };

  // ✅ v3 → current (catch the missing case)
  if (old.version === 3) {
    return {
      version: STORAGE_VERSION,
      completedHabits: old.completedHabits ?? {},
      assessmentScores: old.assessmentScores ?? {},
      conflictResolutions: old.conflictResolutions ?? [],      
      selectedVerseTopic: old.selectedVerseTopic ?? "unity",
      stylePrimary: old.stylePrimary,
      styleSecondary: old.styleSecondary,
      profile: old.profile ?? undefined,
      journal: old.journal ?? DEFAULT_JOURNAL,
      privacy: old.privacy ?? DEFAULT_PRIVACY,
    };
  }

  // Generic forwarder: any older < STORAGE_VERSION we don’t know about
  if (Number.isFinite(old.version) && old.version < STORAGE_VERSION) {
    return {
      version: STORAGE_VERSION,
      completedHabits: old.completedHabits ?? {},
      assessmentScores: old.assessmentScores ?? {},
      conflictResolutions: old.conflictResolutions ?? [],      
      selectedVerseTopic: old.selectedVerseTopic ?? "unity",
      stylePrimary: old.stylePrimary,
      styleSecondary: old.styleSecondary,
      profile: old.profile ?? undefined,
      journal: old.journal ?? DEFAULT_JOURNAL,
      privacy: old.privacy ?? DEFAULT_PRIVACY,
    };
  }

  return null;
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
  conflictResolutions: [],  
  selectedVerseTopic: "unity",
  journal: DEFAULT_JOURNAL,         // ← add
  privacy: DEFAULT_PRIVACY,         // existing
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
      conflictResolutions: (next.conflictResolutions ?? []).filter((d) => d >= dateAdd(todayISO(), -180)),    
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // LocalStorage can throw in private mode; ignore but consider telemetry here
  }
}

/* -------------------- SEED CONTENT -------------------- */
export const SeedVersesByTopic: Record<VerseTopic, { ref: string; text: string }[]> = {
  patience: [
    { ref: "James 1:19", text: "Wherefore, my beloved brethren, let every man be swift to hear, slow to speak, slow to wrath." },
    { ref: "Proverbs 15:1", text: "A soft answer turneth away wrath: but grievous words stir up anger." },
  ],
  forgiveness: [
    { ref: "Ephesians 4:32", text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you." },
    { ref: "Colossians 3:13", text: "Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye." },
  ],
  unity: [
    { ref: "Ephesians 4:3", text: "Endeavouring to keep the unity of the Spirit in the bond of peace." },
    { ref: "Philippians 2:2", text: "Fulfil ye my joy, that ye be likeminded, having the same love, being of one accord, of one mind." },
  ],
  kindness: [
    { ref: "Proverbs 3:3", text: "Let not mercy and truth forsake thee: bind them about thy neck; write them upon the table of thine heart." },
  ],
  humility: [
    { ref: "Philippians 2:3", text: "Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves." },
  ],
  "self-control": [
    { ref: "Galatians 5:22–23", text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law." },
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

// ===================== FULL LESSON (ARTICLE) PAGES =====================
type LessonMeta = typeof LessonsIndex[number];
type LessonBodyFn = (meta: LessonMeta) => string;


/** ============ Individual lesson bodies (long-form articles; inner HTML only) ============ */
const LESSON_BODIES: Record<string, LessonBodyFn> = {
  biblical_submission: (m) =>
`<h1>${m.title}</h1>
<p class="sub">${m.estMin}–15 min • Scriptures: ${m.scriptures.join(", ")} • Commentary-style lesson</p>

<div class="toc"><span class="badge">Outline</span> ${m.outline.join(" • ")}</div>

<h2>1) Big Idea</h2>
<p>
“Submission” in Scripture is a <em>Christ-shaped ordering of love</em>, never a claim of inferiority. 
It sits within a wider call to <strong>mutual self-giving</strong> and Christlike headship that protects, nourishes, 
and lays down power to serve (Eph 5:21–33).
</p>

<h2>2) Context</h2>
<p>
Ephesians was written to establish the church’s identity in Christ (chs. 1–3) and its outworked ethics (chs. 4–6). 
Household instructions (5:22–6:9) apply the gospel to marriage, parenting, and work. 
Note the banner command: <strong>“submitting to one another out of reverence for Christ” (Eph 5:21)</strong>.
</p>

<h2>3) Language & Exegesis</h2>
<ul>
  <li><strong>hypotássō</strong> (Greek “submit”) often means a <em>willed ordering</em> for the good of another or the community—not cowering or erasure of personhood.</li>
  <li><strong>Kephalē</strong> (“head”) in 5:23 carries responsibility to <em>nourish and cherish</em> (5:29), patterned after Christ who gives himself for the church.</li>
  <li>Imperatives: wives are called to a trusting, wise ordering; husbands are commanded to <strong>love sacrificially</strong> (5:25). The heavier verb lands on husbands.</li>
</ul>

<h2>4) Cultural Background</h2>
<p>
In Greco-Roman codes, husbands wielded near-absolute authority. Paul both honors household stability and <em>reforms</em> it under the lordship of Christ: 
authority becomes <strong>cruciform service</strong>. Domination and abuse have no sanction here.
</p>

<h2>5) Theology</h2>
<p>
Marriage is a living parable of Christ and the church (5:32). Roles are not about rank but <strong>displaying the gospel</strong>: 
he gives himself; she responds in trust; together they grow in holy unity.
</p>

<h2>6) Guardrails (What this <em>doesn’t</em> mean)</h2>
<ul>
  <li><strong>Never</strong> a justification for abuse, coercion, or law-breaking. Seek help and safety when harm is present.</li>
  <li>Not a gag order on a wife’s wisdom (cf. Prov 31). Mutual counsel is assumed.</li>
  <li>Not male perfection: husbands are called to repent and grow as servant-leaders.</li>
</ul>

<h2>7) Application to Marriage</h2>
<ul>
  <li><strong>Shared Discernment Rhythm:</strong> Pray, seek Scripture, list options, and decide as one. Where stuck, husbands lead by <em>bearing the cost</em> of love, not by demanding.</li>
  <li><strong>Honor & Voice:</strong> Create a norm that the wife’s concerns are surfaced first and summarized back accurately before moving to action.</li>
  <li><strong>Servant Headship Plan:</strong> Husbands identify two weekly ways to “nourish and cherish” (time, protection of margin, tangible care).</li>
</ul>

<h2>8) Christ at the Center</h2>
<p>
Christ is the pattern and power. His cross resets how we wield influence: not grasping, but giving. 
His Spirit produces the fruit (Gal 5:22–23) that makes this beautiful in ordinary life.
</p>

<div class="hr"></div>
<h3>Practice This Week</h3>
<ol>
  <li>Read <span class="ref">Eph 5:21–33</span> together. Each shares one fear and one hope about biblical submission/headship.</li>
  <li>Write a 2-sentence “serve plan” for the week: one way to prefer your spouse’s good.</li>
  <li>Pray: “Lord Jesus, make our marriage a living picture of your love.”</li>
</ol>

<div class="cta"><button onclick="window.print()">Print</button></div>`,

  theology_of_sin: (m) =>
`<h1>${m.title}</h1>
<p class="sub">${m.estMin}–18 min • Scriptures: ${m.scriptures.join(", ")} • Commentary-style lesson</p>

<div class="toc"><span class="badge">Outline</span> ${m.outline.join(" • ")}</div>

<h2>1) Big Idea</h2>
<p>
Sin is both <em>lawlessness</em> and <em>misdirected love</em>—it fractures our fellowship with God and one another. 
Repair requires <strong>confession, repentance, and faith</strong> in Christ who cleanses, reconciles, and empowers new obedience.
</p>

<h2>2) Word & Text Notes</h2>
<ul>
  <li><strong>Hamartía</strong> (Greek): “missing the mark”—failure to aim at God’s glory (Rom 3:23).</li>
  <li><strong>Peshaʿ</strong> (Hebrew): rebellion/treachery—covenant breach (e.g., Ps 51).</li>
  <li><strong>1 John 1:9</strong>: God is faithful and just to forgive and cleanse—because of Christ’s atonement.</li>
</ul>

<h2>3) Theological Frame</h2>
<p>
Sin is vertical (against God) and horizontal (against neighbor/spouse). Christ’s cross addresses both—justification before God and reconciliation within relationships.
</p>

<h2>4) Why We Avoid Repair</h2>
<ul>
  <li>Self-justification (“I had to”).</li>
  <li>Shame and hiding (Gen 3 echoes).</li>
  <li>Pride (protecting self-image).</li>
</ul>

<h2>5) Gospel Repair Path (Personal & Marriage)</h2>
<ol>
  <li><strong>Conviction:</strong> Name the specific wrong without defensiveness.</li>
  <li><strong>Confession:</strong> To God first (Ps 51), then to spouse: “I was wrong when I ____. No excuse.”</li>
  <li><strong>Repentance:</strong> Turn from the pattern; make a concrete plan to walk differently.</li>
  <li><strong>Receiving Forgiveness:</strong> Believe the promise (<span class="ref">1 Jn 1:9</span>); in marriage, say and hear the words: “I forgive you.”</li>
  <li><strong>Repair Actions:</strong> Where possible, make restitution and rebuild trust with consistent fruit (Luke 3:8).</li>
</ol>

<h2>6) Common Marital Sin Patterns</h2>
<ul>
  <li><strong>Withdrawing</strong> (avoidant self-protection).</li>
  <li><strong>Domineering</strong> (control, harshness).</li>
  <li><strong>Scorekeeping</strong> (weaponized memory).</li>
  <li><strong>Deceit</strong> (image management).</li>
</ul>

<h2>7) Christ at the Center</h2>
<p>
Jesus is our substitute and shepherd. He bears guilt, breaks sin’s dominion, and gives his Spirit. 
Repair isn’t willpower—it’s grace-powered honesty and new obedience in Him.
</p>

<div class="hr"></div>
<h3>Practice This Week</h3>
<ul>
  <li><strong>Evening 5-Minute Examen:</strong> Where did I fail to love today? Confess to God; share one item with your spouse.</li>
  <li><strong>Repair Script:</strong> “I was wrong when I ____. It hurt you by ____. Will you forgive me?”</li>
  <li><strong>Fruit Plan:</strong> Choose 1 replacement behavior (Eph 4 pattern: put off / put on).</li>
</ul>

<div class="cta"><button onclick="window.print()">Print</button></div>`
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
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localDaySeed() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return Number(`${y}${m}${day}`);
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

function streak(dates: string[]): number {
  if (!Array.isArray(dates) || dates.length === 0) return 0;
  const set = new Set(dates);
  let s = 0;
  let day = todayISO();
  while (set.has(day)) {
    s++;
    day = dateAdd(day, -1);
  }
  return s;
}

/** Maximum consecutive-day streak from an array of YYYY-MM-DD dates (unsorted OK). */
function maxStreak(dates: string[]): number {
  if (!Array.isArray(dates) || dates.length === 0) return 0;
  const has = new Set(dates);
  let best = 0;
  for (const d of has) {
    // only start from streak-beginnings
    const prev = dateAdd(d, -1);
    if (!has.has(prev)) {
      let run = 1;
      let day = dateAdd(d, 1);
      while (has.has(day)) {
        run++;
        day = dateAdd(day, 1);
      }
      if (run > best) best = run;
    }
  }
  return best;
}

function countInLastNDays(dates: string[], n: number): number {
  if (!dates?.length) return 0;
  const cutoff = dateAdd(todayISO(), -n + 1); // include today
  return dates.filter((d) => d >= cutoff).length;
}

function distinctJournalDays(entries: JournalEntry[], n?: number): number {
  if (!entries?.length) return 0;
  const set = new Set<string>();
  const cutoffTs = n ? Date.now() - n * 86400_000 : null;
  for (const e of entries) {
    const ts = new Date(e.isoDateTime).getTime();
    if (cutoffTs !== null && ts < cutoffTs) continue;
    set.add(e.isoDateTime.slice(0, 10));
  }
  return set.size;
}

/** Consecutive-day journaling streak based on distinct days with any entry. */
function journalStreak(entries: JournalEntry[]): number {
  if (!entries?.length) return 0;
  const days = new Set(entries.map(e => e.isoDateTime.slice(0,10)));
  let s = 0;
  let d = todayISO();
  while (days.has(d)) {
    s++;
    d = dateAdd(d, -1);
  }
  return s;
}

function countsBy(predicate: (e: JournalEntry) => boolean, entries: JournalEntry[]): number {
  return entries.reduce((acc, e) => acc + (predicate(e) ? 1 : 0), 0);
}

/** Shared, anonymized rollup you can show in Metrics and Church panels */
function computeAnonymizedMetrics(u: UserState) {
  const habits = u.completedHabits ?? {};
  const habitDayCount = Object.values(habits).reduce((acc, arr) => acc + (arr?.length ?? 0), 0);

  const entries = u.journal?.entries ?? [];
  const journalCount = entries.length;
  const journalDaysLast30 = distinctJournalDays(entries, 30);
  const journalOnPaper = countsBy((e) => !!e.onPaper, entries);

  const conflictDates = u.conflictResolutions ?? [];
  const conflictsResolvedTotal = conflictDates.length;
  const conflictsLast30 = countInLastNDays(conflictDates, 30);

  const anyHabitDaysLast30 = distinctDaysWithAnyHabit(u, 30);

  return {
    habitDayCount,
    anyHabitDaysLast30,
    journalCount,
    journalOnPaper,
    journalDaysLast30,
    conflictsResolvedTotal,
    conflictsLast30,
    updatedAt: Date.now(),
  };
}

/** Unique days in last N with at least one habit completed. */
function distinctDaysWithAnyHabit(u: UserState, n: number): number {
  const set = new Set<string>();
  const cutoff = dateAdd(todayISO(), -n + 1);
  for (const arr of Object.values(u.completedHabits ?? {})) {
    (arr ?? []).forEach((d) => { if (d >= cutoff) set.add(d); });
  }
  return set.size;
}

/** Unique YYYY-MM-DD days extracted from journal entries */
function journalDays(entries?: JournalEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries ?? []) set.add(e.isoDateTime.slice(0, 10));
  return Array.from(set).sort();
}

/** Build a presence array (0/1) for the last N days ending today (inclusive) */
function presenceSeries(dates: string[], n: number): number[] {
  const N = Math.max(0, Math.floor(n || 0));
  if (N === 0) return [];
  const has = new Set(dates);
  const start = dateAdd(todayISO(), -N + 1);
  const out: number[] = [];
  let day = start;
  for (let i = 0; i < N; i++) {
    out.push(has.has(day) ? 1 : 0);
    day = dateAdd(day, 1);
  }
  return out;
}

/** Minimal sparkline as tiny bars */
const Sparkline = React.memo(function Sparkline(
  { series, T }: { series: number[]; T: ReturnType<typeof useT> }
) {
  const max = Math.max(1, ...series);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
      {series.map((v, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            width: 6,
            height: Math.round(((v / max) || 0) * 22) + 4,
            borderRadius: 3,
            background: v ? T.primary : T.soft,
          }}
        />
      ))}
    </div>
  );
});


async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard may not be available in some contexts (no-op)
  }
}

// TODO: Replace base64 with AES-GCM using Web Crypto API when moving off local-only storage.

// ===== Strong crypto (AES-GCM with PIN-derived key) =====
async function deriveKeyFromPin(pin: string, saltB64: string) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
async function encryptJSONWithKey(key: CryptoKey, data: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(data)));
  return { iv: btoa(String.fromCharCode(...iv)), blob: btoa(String.fromCharCode(...new Uint8Array(cipher))) };
}
async function decryptJSONWithKey<T>(key: CryptoKey, payload: { iv: string; blob: string }): Promise<T> {
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
  const bytes = Uint8Array.from(atob(payload.blob), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, bytes);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(plain)));
}
let SESSION_AES_KEY: CryptoKey | null = null;
function getOrCreateSaltB64() {
  const k = "trueglue.v2.salt";
  let s = localStorage.getItem(k);
  if (!s) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    s = btoa(String.fromCharCode(...bytes));
    localStorage.setItem(k, s);
  }
  return s;
}
function isLocked(u: UserState) {
  return !!u.privacy?.pinEnabled && !SESSION_AES_KEY;
}

/* -------------------- CONTEXT -------------------- */
type AppCtx = {
  user: UserState;
  setUser(u: UserState): void;
  completeHabit(id: MicroHabitId): void;
  setVerseTopic(t: VerseTopic): void;
  track(event: string, props?: Record<string, any>): void;

  // NEW
  setBlockNav(on: boolean): void;
  isNavBlocked(): boolean;
  /** Append today to conflictResolutions and persist. */
  logConflictResolved(): void;
};

 export const Ctx = createContext<AppCtx | null>(null);
 
 export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("Ctx missing");
  return v;
}

// -------------------- Toast (mini) --------------------
const ToastCtx = createContext<(msg: string) => void>(() => {});
function useToast() {
  return useContext(ToastCtx);
}

function ToastHost({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 2000);
    return () => window.clearTimeout(id);
  }, [msg]);

  return (
    <ToastCtx.Provider value={setMsg}>
      {children}

      {/* Visible toast */}
      {msg && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#000",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 10,
            opacity: 0.92,
            zIndex: 2147483647,
          }}
        >
          {msg}
        </div>
      )}

      {/* SR-only polite live region */}
      <div
        aria-live="polite"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        {msg ?? ""}
      </div>
    </ToastCtx.Provider>
  );
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
      {/* ✅ This nav now renders the TAB BUTTONS (not the panels) */}
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
          const panelId = `panel-${t.id}`;
          const tabId = `tab-${t.id}`;
          return (
            <button
              key={t.id}
              id={tabId}
              role="tab"
              aria-controls={panelId}
              aria-selected={active}
              onClick={() => onChange(t.id)}
              type="button"
              style={active ? activePillS : pillS}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* ✅ Panels rendered once, below the nav */}
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
      {/* render ALWAYS to preserve state */}
      {t.panel}
    </div>
  );
})}
    </div>
  );
}

/** =================== OnboardingIntro (multi-card; writes to profile) =================== */
function OnboardingIntro({
  open,
  onFinish,
  onSkipAll,
}: {
  open: boolean;
  onFinish: () => void;
  onSkipAll: () => void;
}) {
  const T = useT();
  const { user, setUser } = useApp();
  const [step, setStep] = React.useState(0);
  const total = 3;

  // local form state seeded from existing profile
  const [form, setForm] = React.useState<Required<Pick<UserProfile,
    "displayName" | "spouseName" | "email" | "ageRange" | "lifeStage" | "kidsCount" | "yearsMarried"
  >> & { church?: string }>({
    displayName: user.profile?.displayName ?? "",
    spouseName:  user.profile?.spouseName  ?? "",
    email:       user.profile?.email       ?? "",
    ageRange:    (user.profile?.ageRange ?? "") as any,
    lifeStage:   (user.profile?.lifeStage ?? "") as any,
    kidsCount:   user.profile?.kidsCount ?? 0,
    yearsMarried:user.profile?.yearsMarried ?? 0,
    church:      user.profile?.church ?? "",
  });

  // readable selects in both themes (closed state)
  const input = {
    base: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: `1px solid ${T.soft}`,
      background: T.card,       // solid background so text is visible
      color: T.text,            // readable in both themes
      fontSize: 14,
    } as React.CSSProperties,
    label: { fontSize: 13, color: T.muted, marginBottom: 6 } as React.CSSProperties,
    row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as React.CSSProperties,
  };

const optionStyle: React.CSSProperties = { background: T.card, color: T.text };

  if (!open) return null;

  function saveProfileAndFinish() {
    const next: UserState = {
      ...user,
      profile: {
        ...(user.profile ?? {}),
        displayName: form.displayName.trim() || undefined,
        spouseName:  form.spouseName.trim()  || undefined,
        email:       form.email.trim()       || undefined,
        church:      form.church?.trim()     || undefined,
        ageRange:    form.ageRange || undefined,
        lifeStage:   form.lifeStage || undefined,
        kidsCount:   Number.isFinite(form.kidsCount) ? form.kidsCount : undefined,
        yearsMarried:Number.isFinite(form.yearsMarried) ? form.yearsMarried : undefined,
      },
    };
    setUser(next);     // ← persists via your existing save effect
    onFinish();        // ← parent opens the tour next
  }

  const Step1 = (
    <>
      <p style={{ marginTop: 0 }}>
        Welcome to <strong>TrueGlue</strong> — gospel-centered tools for everyday marriage.
      </p>
      <div style={input.row}>
        <label>
          <div style={input.label}>Your name</div>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.currentTarget.value })}
            style={input.base}
            placeholder="e.g., Ryan"
          />
        </label>
        <label>
          <div style={input.label}>Spouse name</div>
          <input
            type="text"
            value={form.spouseName}
            onChange={(e) => setForm({ ...form, spouseName: e.currentTarget.value })}
            style={input.base}
            placeholder="e.g., Taylor"
          />
        </label>
      </div>

      <div style={{ height: 10 }} />
      <label>
        <div style={input.label}>Email (optional)</div>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.currentTarget.value })}
          style={input.base}
          placeholder="you@example.com"
        />
      </label>
    </>
  );

  const Step2 = (
    <>
      <div style={input.row}>
        <label>
          <div style={input.label}>Age range</div>
          <select
  value={form.lifeStage}
  onChange={(e) => setForm({ ...form, lifeStage: e.currentTarget.value as any })}
  style={input.base}
>
  <option value="" disabled style={optionStyle}>Choose…</option>
  <option value="engaged"        style={optionStyle}>Engaged</option>
  <option value="newlywed"       style={optionStyle}>Newlywed</option>
  <option value="raising-kids"   style={optionStyle}>Raising kids</option>
  <option value="empty-nesters"  style={optionStyle}>Empty nesters</option>
  <option value="single-parent"  style={optionStyle}>Single parent</option>
  <option value="widowed"        style={optionStyle}>Widowed</option>
  <option value="other"          style={optionStyle}>Other</option>
</select>
        </label>

        <label>
  <div style={input.label}>Age range</div>
  <select
    value={form.ageRange} // ✅ correct: bound to ageRange
    onChange={(e) => setForm({ ...form, ageRange: e.currentTarget.value as any })}
    style={input.base}
  >
    <option value="" disabled>Choose…</option>
    <option value="18–24">18–24</option>
    <option value="25–34">25–34</option>
    <option value="35–44">35–44</option>
    <option value="45–54">45–54</option>
    <option value="55–64">55–64</option>
    <option value="65+">65+</option>
  </select>
</label>
      </div>

      <div style={{ height: 10 }} />
      <div style={input.row}>
  {/* Kids (count) as a select */}
  <label>
    <div style={input.label}>Kids</div>
    <select
      value={String(form.kidsCount ?? 0)}
      onChange={(e) => setForm({ ...form, kidsCount: Number(e.currentTarget.value) })}
      style={input.base}
    >
      <option value="0" style={optionStyle}>0</option>
      <option value="1" style={optionStyle}>1</option>
      <option value="2" style={optionStyle}>2</option>
      <option value="3" style={optionStyle}>3</option>
      <option value="4" style={optionStyle}>4</option>
      <option value="5" style={optionStyle}>5</option>
      <option value="6" style={optionStyle}>6+</option>
    </select>
  </label>

  {/* Years married as a select (stores numeric buckets) */}
  <label>
    <div style={input.label}>Years married</div>
    <select
      value={String(form.yearsMarried ?? 0)}
      onChange={(e) => setForm({ ...form, yearsMarried: Number(e.currentTarget.value) })}
      style={input.base}
    >
      <option value="0"  style={optionStyle}>0</option>
      <option value="1"  style={optionStyle}>1</option>
      <option value="2"  style={optionStyle}>2</option>
      <option value="3"  style={optionStyle}>3</option>
      <option value="4"  style={optionStyle}>4</option>
      <option value="5"  style={optionStyle}>5</option>
      <option value="6"  style={optionStyle}>6</option>
      <option value="7"  style={optionStyle}>7</option>
      <option value="8"  style={optionStyle}>8</option>
      <option value="9"  style={optionStyle}>9</option>
      <option value="10" style={optionStyle}>10</option>
      <option value="15" style={optionStyle}>15</option>
      <option value="20" style={optionStyle}>20</option>
      <option value="25" style={optionStyle}>25</option>
      <option value="30" style={optionStyle}>30+</option>
    </select>
  </label>
</div>
    </>
  );

  const Step3 = (
    <>
      <p style={{ marginTop: 0 }}>
        You’re all set. We’ll personalize prompts (and future content) using what you shared.
      </p>
      <label>
        <div style={input.label}>Church (optional)</div>
        <input
          type="text"
          value={form.church ?? ""}
          onChange={(e) => setForm({ ...form, church: e.currentTarget.value })}
          style={input.base}
          placeholder="e.g., Redemption Church"
        />
      </label>
      <p style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
        Your data stays on this device. You can change these in Profile anytime.
      </p>
    </>
  );

  const body = [Step1, Step2, Step3][step];

  return createPortal(
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      display: "grid", placeItems: "center", zIndex: 2147483647, padding: 16
    }}>
      <div style={{
        maxWidth: 680, width: "100%", background: T.card, color: T.text,
        border: `1px solid ${T.soft}`, borderRadius: 16, boxShadow: T.shadow, padding: 18
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Welcome</h3>
          <button
            type="button"
            onClick={onSkipAll}
            style={{
              padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.soft}`,
              background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
            }}
          >
            Skip
          </button>
        </div>

        <div style={{ marginTop: 12 }}>{body}</div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "space-between" }}>
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              padding: "8px 12px", borderRadius: 999,
              border: `1px solid ${step === 0 ? T.soft : T.primary}`,
              background: "transparent", color: T.text,
              cursor: step === 0 ? "default" : "pointer", fontSize: 13, opacity: step === 0 ? .6 : 1
            }}
          >
            Back
          </button>

          {step < total - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
              style={{
                padding: "8px 14px", borderRadius: 999, border: `1px solid ${T.primary}`,
                background: "transparent", color: T.text, cursor: "pointer", fontSize: 13, fontWeight: 700
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={saveProfileAndFinish}
              style={{
                padding: "8px 14px", borderRadius: 999, border: `1px solid ${T.primary}`,
                background: "transparent", color: T.text, cursor: "pointer", fontSize: 13, fontWeight: 700
              }}
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** =================== OnboardingTour (5-step, ID-anchored) =================== */
function OnboardingTour({ open, onClose, setRoute }: {
  open: boolean; onClose: () => void; setRoute: (r: TGRoute) => void;
}) {
  const T = useT();
  const steps: Array<{
    targetId: string;
    title: string;
    text: string;
    route?: TGRoute;
  }> = [
    { targetId: "tab-home",        title: "Home",          text: "See your Verse of the Day, short commentary, and helpful suggestions.", route: "home" },
    { targetId: "tab-microhabits", title: "Micro-Habits",  text: "Small daily actions (gratitude, love map, prayer, calm timer, journal).", route: "microhabits" },
    { targetId: "tab-workflow",    title: "Conflict Flow", text: "A guided, biblical path for tough moments—repair with clarity and grace.", route: "workflow" },
    { targetId: "tab-metrics",     title: "Metrics",       text: "Track streaks and trends (counts only). Export CSV/JSON for weekly reviews.", route: "metrics" },
    { targetId: "tab-profile",     title: "Profile",       text: "Set reminders, privacy & PIN, and personalize your experience.", route: "profile" },
  ];

  const [i, setI] = React.useState(0);
  const [box, setBox] = React.useState<{x:number;y:number;w:number;h:number} | null>(null);
  const bubbleRef = React.useRef<HTMLDivElement>(null);
  const [bubbleSize, setBubbleSize] = React.useState<{w:number;h:number}>({ w: 0, h: 0 });

  React.useEffect(() => {
    if (!open) return;
    const r = steps[i].route;
    if (r) setRoute(r);
    const t = window.setTimeout(measureTarget, 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i]);

  React.useEffect(() => {
    if (!open) return;
    const on = () => { measureTarget(); measureBubble(); };
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [open]);

  React.useLayoutEffect(() => {
  if (!open) return;
  measureBubble();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, i, steps[i].text]);

  function measureTarget() {
    const el = document.getElementById(steps[i].targetId);
    if (!el) { setBox(null); return; }
    const r = el.getBoundingClientRect();
    setBox({ x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height });
    try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
  }

  function measureBubble() {
    const b = bubbleRef.current?.getBoundingClientRect();
    if (b) setBubbleSize({ w: b.width, h: b.height });
  }

  function next() { i < steps.length - 1 ? setI(i + 1) : onClose(); }
  function prev() { if (i > 0) setI(i - 1); }

  if (!open) return null;

  // --- Compute final bubble position (never overlaps the target) ---
const gap = 12;
const bubbleW = Math.min(380, window.innerWidth - 32);  // keep bubble inside 16px gutters
const vpLeft = window.scrollX + 16;
const vpRight = window.scrollX + window.innerWidth - 16;

let bubbleTop = 32;
let bubbleLeft = 16;
let placedAbove = false;         // track where the bubble sits (for arrow direction)
let arrowXWithinBubble = 24;     // px from bubble's left edge where the arrow should sit

if (box) {
  // Prefer above if there's enough room in the *viewport* above the target
  const roomAbove = (box.y - window.scrollY);
  const roomBelow = (window.scrollY + window.innerHeight) - (box.y + box.h);
  placedAbove = roomAbove > roomBelow && roomAbove > (bubbleSize.h + gap + 16);

  const topIfAbove = box.y - bubbleSize.h - gap;
  const topIfBelow = box.y + box.h + gap;
  bubbleTop = Math.max(16, placedAbove ? topIfAbove : topIfBelow);

  // Center bubble to the target's center, but clamp within viewport
  const centerX = box.x + box.w / 2;
  bubbleLeft = Math.min(vpRight - bubbleW, Math.max(vpLeft, centerX - bubbleW / 2));

  // Arrow anchor: keep it visually pointing at the target center
  // Compute where the target center lands *relative to bubble's left*
  arrowXWithinBubble = Math.round(centerX - bubbleLeft);

  // Clamp arrow within bubble’s padding so it doesn’t draw outside
  const arrowMargin = 18;
  arrowXWithinBubble = Math.max(arrowMargin, Math.min(bubbleW - arrowMargin, arrowXWithinBubble));
}
// --- end placement calc ---
const step = steps[i];

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label="App tour"
      style={{ position: "fixed", inset: 0, zIndex: 2147483647, pointerEvents: "none" }}
    >
      {/* dim background */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)" }} />

      {/* highlight box */}
      {box && (
        <div aria-hidden
          style={{
            position: "absolute",
            left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12,
            borderRadius: 10, border: `2px solid ${T.accent}`,
            boxShadow: "0 0 0 9999px rgba(0,0,0,.55)",
            pointerEvents: "none"
          }}
        />
      )}

      {/* measured bubble */}
      <div
  ref={bubbleRef}
  style={{
    position: "absolute",
    top: bubbleTop,
    left: bubbleLeft,
    width: bubbleW,
    background: T.card,
    color: T.text,
    border: `1px solid ${T.soft}`,
    borderRadius: 14,
    boxShadow: T.shadow,
    padding: 12,
    pointerEvents: "auto",
  }}
>
  {/* Arrow: two layered triangles (outer = border, inner = card) */}
  {/* OUTER (gives a clean border edge) */}
  <div
    aria-hidden
    style={{
      position: "absolute",
      left: arrowXWithinBubble - 9, // center of 18px-wide triangle
      ...(placedAbove
        ? { bottom: -10, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `10px solid ${T.soft}` }
        : { top: -10,    borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderBottom: `10px solid ${T.soft}` }
      ),
      width: 0, height: 0,
    }}
  />
  {/* INNER (fills with card color so arrow matches bubble) */}
  <div
    aria-hidden
    style={{
      position: "absolute",
      left: arrowXWithinBubble - 8,
      ...(placedAbove
        ? { bottom: -8, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `8px solid ${T.card}` }
        : { top: -8,    borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: `8px solid ${T.card}` }
      ),
      width: 0, height: 0,
    }}
  />

  <div style={{ fontWeight: 800 }}>{step.title}</div>
  <div style={{ marginTop: 6, lineHeight: 1.5 }}>{step.text}</div>

  <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
    <div style={{ display: "flex", gap: 8 }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          border: `1px solid ${T.soft}`,
          background: "transparent",
          color: T.text,
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Skip tour
      </button>
      <button
        type="button"
        onClick={prev}
        disabled={i === 0}
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          border: `1px solid ${i === 0 ? T.soft : T.primary}`,
          background: "transparent",
          color: T.text,
          cursor: i === 0 ? "default" : "pointer",
          fontSize: 13,
          opacity: i === 0 ? 0.6 : 1,
        }}
      >
        Back
      </button>
    </div>

    <button
      type="button"
      onClick={next}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${T.primary}`,
        background: "transparent",
        color: T.text,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {i === steps.length - 1 ? "Finish" : "Next"}
    </button>
  </div>
</div>
    </div>,
    document.body
  );
}

/* -------------------- ROOT -------------------- */
export default function App() {
  console.log("✅ Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
  console.log(
    "✅ Supabase Key:",
    String(import.meta.env.VITE_SUPABASE_ANON_KEY)?.slice(0, 10) + "..."
  );
   return (
    <ThemeProvider>
      <ToastHost>
        <AppShell />
      </ToastHost>
    </ThemeProvider>
  );
}

function AppShell() {
const toast = useToast();
  // Initialize route from hash BEFORE first paint to avoid flashing "Home"
  const initialRoute = ((): TGRoute => {
  if (typeof window === "undefined") return "home";
  const raw = window.location.hash.replace("#/", "");
  const mapped = raw === "calm" ? "microhabits" : raw;
  return (mapped as TGRoute) || "home";
})();

  const T = useT();

const appStyle: React.CSSProperties = {
  fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  background: T.bg,
  color: T.text,
  minHeight: "100vh",
};

  const [user, setUser] = useState<UserState>(() => loadState());
  const [route, setRoute] = useState<TGRoute>(initialRoute);

// Onboarding state
const [showTour, setShowTour] = useState(false);
const [showIntro, setShowIntro] = React.useState(false);

// Debug helpers: call from DevTools console
// window.tgOpenTour()      → opens the tour immediately
// window.tgResetOnboarding → re-opens Welcome, clears the done flag
// window.tgFinishOnboarding→ marks onboarding done (skips welcome)
if (typeof window !== "undefined") {
  (window as any).tgOpenTour = () => {
    setShowTour(true);
  };
  (window as any).tgResetOnboarding = () => {
    try { localStorage.removeItem("trueglue.v2.onboarding.done"); } catch {}
    try { localStorage.removeItem("trueglue.v2.intro.done"); } catch {}
    setShowIntro(true);
    setShowTour(false);
  };
  (window as any).tgFinishOnboarding = () => {
    try { localStorage.setItem("trueglue.v2.onboarding.done", "1"); } catch {}
    setShowTour(false);
  };
}

useEffect(() => {
  if (typeof window === "undefined") return;
  const join = getQueryParam("join");
  if (!join) return;

  // naive acceptance: if codes match (or you have no couple yet), set the couple id
  setUser((u) => {
    const myCouple = u.couple ?? { id: Math.random().toString(36).slice(2) };
    // Accept if the code matches our invite or we don't have one yet
    const accepted = !myCouple.inviteCode || myCouple.inviteCode === join;
    if (accepted) {
      return { ...u, couple: { ...myCouple, inviteCode: join, joinedAt: Date.now() } };
    }
    return u;
  });

  setQueryParam("join", null);
  toast("Joined couple (local)");
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

useEffect(() => {
  if (typeof window === "undefined") return;

  const forceIntro   = getQueryParam("intro") === "1";
  const forceWelcome = getQueryParam("welcome") === "1"; // legacy → map to intro
  const forceTour    = getQueryParam("tour") === "1";

  if (forceIntro || forceWelcome) {
    setShowIntro(true);
  } else if (!hasIntroDone()) {
    setShowIntro(true);
  } else if (!hasOnboarded()) {
    setShowTour(true);
  }

  if (forceTour) setShowTour(true);
}, []);

function finishTour() {
  setShowTour(false);
  setOnboarded();
  toast("You’re all set! 🙌");
}

  useEffect(() => {
  const id = window.setTimeout(() => saveState(user), 200);
  return () => window.clearTimeout(id);
}, [user]);

  useEffect(() => {
  const titles: Record<TGRoute, string> = {
  home: "Home",
  microhabits: "Micro-Habits",
    metrics: "Metrics",  
  lessons: "Lessons",
  workflow: "Conflict Workflow",
  assessments: "Assessments",
  profile: "Profile",
  church: "Church",
};
  document.title = `TrueGlue — ${titles[route] ?? "App"}`;
}, [route]);

  useEffect(() => {
  const applyHash = () => {
    const raw = window.location.hash.replace("#/", "");
    const mapped = raw === "calm" ? "microhabits" : raw;
    if (mapped) setRoute(mapped as TGRoute);
  };
  window.addEventListener("hashchange", applyHash);
  return () => window.removeEventListener("hashchange", applyHash);
}, []);
  const navBlockRef = React.useRef(false);
useEffect(() => {
  const h = (e: BeforeUnloadEvent) => {
    if (navBlockRef.current) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", h);
  return () => window.removeEventListener("beforeunload", h);
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
        toast("Marked done");
      }
    },
    setVerseTopic: (t) => setUser({ ...user, selectedVerseTopic: t }),
    track: (_event, _props) => {},

    // NEW
    setBlockNav: (on) => { navBlockRef.current = on; },
    isNavBlocked: () => navBlockRef.current,
    logConflictResolved: () => {
      const d = todayISO();
      const list = user.conflictResolutions ?? [];
      if (!list.includes(d)) {
        setUser({ ...user, conflictResolutions: [...list, d] });
        toast("Logged: conflict resolved");
      }
    }, 
  }),
  [user, toast]   // ✅ include toast
);

// Auto-lock session AES key after inactivity (only when PIN enabled)
// in AppShell
const [, force] = React.useReducer((x) => x + 1, 0);

useEffect(() => {
  const minutes = user.privacy?.autoLockMinutes ?? 10;
  if (!user.privacy?.pinEnabled) return;
  let timer: number | null = null;
  const reset = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      SESSION_AES_KEY = null;
      force(); // force a render so UI updates from Unlocked → Locked
    }, minutes * 60 * 1000);
  };
  const events = ["mousemove", "keydown", "click", "visibilitychange"];
  events.forEach((ev) => window.addEventListener(ev, reset));
  reset();
  return () => {
    if (timer) window.clearTimeout(timer);
    events.forEach((ev) => window.removeEventListener(ev, reset));
  };
}, [user.privacy?.pinEnabled, user.privacy?.autoLockMinutes]);

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
                border: `2px solid ${T.accent}`,
                boxShadow: "0 0 0 2px rgba(47,165,165,0.20)",

              }}
            />
            <div>
              <h1 style={h1Style}>TrueGlue</h1>
              <p style={{ ...taglineStyle, color: T.muted }}>
  Gospel-centered tools for everyday marriage.
</p>
            </div>
          </header>

          <Ctx.Provider value={api}>
  <AppTabs route={route} setRoute={setRoute} />

  {/* Auth then couple linking */}
  <div style={{ marginTop: 24 }}>
    <SignInPanel />
    <CouplePanel />
  </div>

  <OnboardingIntro
    open={showIntro}
    onFinish={() => {
      setShowIntro(false);
      setOnboarded();
      setShowTour(true);
      setQueryParam("intro", null);
    }}
    onSkipAll={() => {
      setShowIntro(false);
      setQueryParam("intro", null);
      setShowWelcome(true);
    }}
  />

  <OnboardingTour open={showTour} onClose={finishTour} setRoute={setRoute} />
</Ctx.Provider>

<Footer />

        </div>
      </div>
    </>
  );
}

/* -------------------- TABS + ROUTING -------------------- */
type AppTabsProps = {
  route: TGRoute;
  setRoute: (r: TGRoute) => void;
};

function AppTabs({ route, setRoute }: AppTabsProps) {
  // Theme must be read inside a component
  const T = useT();

  // Now it's safe to use T inside these styles
  const pillStyleThemed: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${T.soft}`,    // shorthand (prevents React warning)
    background: "transparent",
    color: T.text,
    cursor: "pointer",
    fontSize: 13,
  };

  const activePillStyleThemed: React.CSSProperties = {
    ...pillStyleThemed,
    background: "rgba(47,165,165,0.10)", // subtle teal tint
    border: `1px solid ${T.primary}`,     // shorthand here too
    color: T.text,
    boxShadow: "0 0 0 2px rgba(47,165,165,0.20)",
  };

  // Base set of tabs (always visible)
  const itemsBase: ReadonlyArray<TabItem<TGRoute>> = [
    { id: "home",        label: "Home",          panel: <Home /> },
    { id: "microhabits", label: "Micro-Habits",  panel: <MicroHabits /> },
    { id: "metrics",     label: "Metrics",       panel: <MetricsDashboard /> },    
    { id: "lessons",     label: "Lessons",       panel: <Lessons /> },
    { id: "workflow",    label: "Conflict Flow", panel: <ConflictWorkflow /> },
    { id: "assessments", label: "Assessments",   panel: <Assessments /> },
    { id: "profile",     label: "Profile",       panel: <Profile /> },
  ];

  // Add "Church" only if feature flag is enabled
  const items = FEATURES.churchMode
    ? [...itemsBase, { id: "church", label: "Church", panel: <ChurchPanel /> }]
    : itemsBase;

  return (
    <Tabs
      label="Main navigation"
      value={route}
      onChange={setRoute}
      items={items}
      pillStyle={pillStyleThemed}
      activePillStyle={activePillStyleThemed}
    />
  );
}

/* -------------------- HOME -------------------- */
function Card(p: React.PropsWithChildren<{ title: string; sub?: string }>) {
  const T = useT();
  return (
    <section
      style={{
        background: T.card,
        border: `1px solid ${T.soft}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        boxShadow: T.shadow,
        color: T.text,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16, color: T.text }}>{p.title}</h3>
      {p.sub && <p style={{ marginTop: 4, color: T.muted }}>{p.sub}</p>}
      <div style={{ marginTop: 10 }}>{p.children}</div>
    </section>
  );
}

function Home() {
  const toast = useToast();
  const T = useT();
  const { user, setVerseTopic } = useApp();
  const day = new Date();
  const dayIndex = localDaySeed();

  // Verse of the Day (deterministic by day & topic)
  const verses = SeedVersesByTopic[user.selectedVerseTopic] || [];
  const v = verses.length ? verses[randIndex(verses, dayIndex)] : null;
  const [openVotd, setOpenVotd] = React.useState(false);
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
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${t === user.selectedVerseTopic ? T.primary : T.soft}`,
    background: "transparent",
    color: T.text,
    cursor: "pointer",
    fontSize: 13,
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
  <div style={{ marginTop: 6, color: T.muted }}>{v.ref}</div>
  <div style={{ marginTop: 10 }}>
  <button
    type="button"
    onClick={() => setOpenVotd(true)}
    style={{
      padding: "8px 12px",
      borderRadius: 999,
      border: `1px solid ${T.primary}`,
      background: "transparent",
      color: T.text,
      cursor: "pointer",
      fontSize: 13,
    }}
  >
    Short commentary &amp; application
  </button>
</div>

{/* Mount the commentary modal right under the card content */}
<VotdCommentaryModal
  open={openVotd}
  onClose={() => setOpenVotd(false)}
  verseRef={v.ref}
  verseText={v.text}
  topic={user.selectedVerseTopic}
/>

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
  const T = useT();
  const { user, completeHabit } = useApp();
  const done = (user.completedHabits[id] ?? []).includes(todayISO());
  const s = streak(user.completedHabits[id] ?? []);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "10px 12px",
        border: `1px solid ${T.soft}`,
        borderRadius: 10,
        background: T.card,
        marginBottom: 8,
        color: T.text,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 6,
          background: done ? T.success : T.soft,
        }}
      />
      <div>
  <div style={{ fontWeight: 600, color: T.text }}>{title}</div>
  <div style={{ fontSize: 13, color: T.muted }}>{tip}</div>
  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
    Streak: {s} day{s === 1 ? "" : "s"}
  </div>
</div>
      <button
        type="button"
        onClick={() => completeHabit(id)}
        disabled={done}
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: `1px solid ${done ? T.success : T.soft}`,
          background: "transparent",
          color: T.text,
          cursor: done ? "default" : "pointer",
          opacity: done ? 0.7 : 1,
          fontSize: 13,
        }}
        aria-label={done ? `${title} completed` : `Mark ${title} done`}
      >
        {done ? "Done" : "Mark done"}
      </button>
    </div>
  );
}

function MicroHabits() {
  const toast = useToast();
  const T = useT();
  const dayIndex = localDaySeed();
const loveMap = React.useMemo(
  () => LoveMapQuestions[randIndex(LoveMapQuestions, dayIndex)],
  [dayIndex]
);
const prayer = React.useMemo(
  () => PrayerNudges[randIndex(PrayerNudges, dayIndex)],
  [dayIndex]
);
  const [openCalm, setOpenCalm] = React.useState(false);
  const [openJournal, setOpenJournal] = React.useState(false);
  const [openHistory, setOpenHistory] = React.useState(false);
  const [openWhy, setOpenWhy] = React.useState(false);

  return (
    <>
      <Card title="Scripture — Verse of the Day">
        <div style={{ marginBottom: 10 }}>
          See Home for your Verse of the Day (topic selectable there).
        </div>
        <HabitRow id="scriptureVOTD" title="Read it together" tip="Ask: What stands out? Why?" />
      </Card>

      <Card title="Gratitude">
        <HabitRow
          id="gratitude"
          title="Send one line of thanks"
          tip='Text your spouse: “Thank you for ____.”'
        />
      </Card>

      <Card title="Love Map — Question of the Day">
        <div style={{ marginBottom: 10, fontWeight: 600 }}>{loveMap}</div>
<div>
  <button
    type="button"
    onClick={() => { copy(`Love Map: ${loveMap}`); toast("Question copied"); }}
    style={{
      padding: "8px 12px",
      borderRadius: 999,
      border: `1px solid ${T.primary}`,
      background: "transparent",
      color: T.text,
      cursor: "pointer",
      fontSize: 13,
      marginBottom: 10,
    }}
  >
    Copy question
  </button>
</div>
        <HabitRow id="loveMap" title="Answer together" tip="Keep it under 2 minutes." />
      </Card>

      <Card title="Prayer Nudge">
        <div style={{ marginBottom: 10 }}>{prayer}</div>
<div>
  <button
    type="button"
    onClick={() => { copy(`Prayer nudge: ${prayer}`); toast("Prayer copied"); }}
    style={{
      padding: "8px 12px",
      borderRadius: 999,
      border: `1px solid ${T.primary}`,
      background: "transparent",
      color: T.text,
      cursor: "pointer",
      fontSize: 13,
      marginBottom: 10,
    }}
  >
    Copy prayer
  </button>
</div>
        <HabitRow id="prayer" title="Pray for 30 seconds" tip="Short and sincere." />
      </Card>

      {/* NEW: Calm — Breathe micro-habit */}
      <Card title="Calm — Breathe" sub="Calm the nervous system, reduce stress, improve mental clarity">
        <div style={{ marginBottom: 10 }}>
          Inhale 4 • Hold 4 • Exhale 6 — repeat gently. You can proceed at any time.
        </div>
        <div style={{ marginBottom: 10 }}>
         <PrimaryButton T={T} variant="accent" onClick={() => setOpenCalm(true)}>
  Open Calm Timer
</PrimaryButton>
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
      
      {/* NEW: Journaling micro-habit */}
      <Card title="Journaling" sub="Capture a quick daily reflection (or mark paper journaling done)">
        <div style={{ marginBottom: 10 }}>
          <PrimaryButton T={T} variant="accent" onClick={() => setOpenJournal(true)}>
            Open Journal
          </PrimaryButton>
        </div>

        <HabitRow
          id="journal"
          title="Make a brief entry"
          tip="2–3 sentences or mark 'Done on paper'."
        />

        <JournalHabitModal
          open={openJournal}
          onClose={() => setOpenJournal(false)}
          onSaved={() => {}}
          onOpenHistory={() => { setOpenJournal(false); setOpenHistory(true); }}
          onOpenWhy={() => { setOpenJournal(false); setOpenWhy(true); }}
        />

        <JournalHistoryModal
          open={openHistory}
          onClose={() => setOpenHistory(false)}
        />

        <WhyJournalModal
          open={openWhy}
          onClose={() => setOpenWhy(false)}
        />
      </Card>
    </>
  );
}

/* -------------------- LESSONS -------------------- */
// -------------------- LessonModal (Full-lesson modal) --------------------
function LessonModal({
  open,
  lessonId,
  onClose,
}: {
  open: boolean;
  lessonId: string | null;
  onClose: () => void;
}) {
  const T = useT();
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Close on Escape, lock scroll, focus trap
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Don’t render without data
  if (!open || !lessonId) return null;

  const meta = LessonsIndex.find((l) => l.id === lessonId);
  const bodyFn = meta ? LESSON_BODIES[lessonId] : undefined;

  const html =
    meta && bodyFn
      ? bodyFn(meta)
      : `<h1>Lesson coming soon</h1><p>We couldn't find the content for <code>${lessonId}</code>.</p>`;

  // Render into <body> so it sits above everything
  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={meta?.title ?? "Lesson"}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 2147483647,
        padding: 16,
      }}
    >
      <style>{`
        .tg-lesson {
          max-width: 900px;
          width: 100%;
          max-height: 85vh;
          overflow: auto;
          background: ${T.card};
          color: ${T.text};
          border: 1px solid ${T.soft};
          border-radius: 16px;
          box-shadow: ${T.shadow};
          padding: 20px;
        }
        .tg-lesson h1 { margin: 0; font-size: 22px; }
        .tg-lesson .sub { color: ${T.muted}; margin-top: 6px; }
        .tg-lesson .toc { margin-top: 10px; font-size: 13px; color: ${T.muted}; }
        .tg-lesson .badge {
          display: inline-block; border: 1px solid ${T.soft}; border-radius: 999px; padding: 2px 8px; margin-right: 6px;
        }
        .tg-lesson .hr { border-top: 1px solid ${T.soft}; margin: 16px 0; }
        .tg-lesson .cta { margin-top: 12px; }
        .tg-lesson .ref { font-weight: 700; }
        .tg-lesson p, .tg-lesson li { line-height: 1.6; }
        @media (max-width: 520px) {
          .tg-lesson { padding: 14px; }
        }
      `}</style>

      <div
        className="tg-lesson"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {meta?.title ?? "Lesson"}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid ${T.soft}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
            }}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {/* Lesson HTML */}
        <div style={{ marginTop: 8 }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>,
    document.body
  );
}

function Lessons() {
  const T = useT();
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

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
          <div style={{ marginTop: 8, fontSize: 13, color: T.muted }}>
            Commentaries / authors to consult: {lsn.commentaryRefs.join("; ")}
          </div>
          <div style={{ marginTop: 10 }}>
            {/* was: openFullLesson(lsn.id) */}
<PrimaryButton
  T={T}
  variant="accent"
  onClick={() => setOpenLessonId(lsn.id)}
>
              Open full lesson
            </PrimaryButton>
          </div>
        </Card>
      ))}

      <Card title="Add More Lessons">
        <div>Drop new items into <code>LessonsIndex</code> (id, title, outline, scriptures, commentaryRefs).</div>
      </Card>

      {/* Mount the full-lesson modal once, driven by the state */}
      <LessonModal
        open={!!openLessonId}
        lessonId={openLessonId}
        onClose={() => setOpenLessonId(null)}
      />
    </>
  );
}

function InviteSpouseModal({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const T = useT();
  const toast = useToast();
  const { user, setUser } = useApp();

  if (!open) return null;

  const code = user.couple?.inviteCode ?? Math.random().toString(36).slice(2, 8).toUpperCase();
  const coupleId = user.couple?.id ?? Math.random().toString(36).slice(2);

  const link = `${location.origin}${location.pathname}#/home?join=${code}`;

  return createPortal(
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", zIndex: 2147483647, padding: 16
    }}>
      <div style={{
        maxWidth: 640, width: "100%", background: T.card, border: `1px solid ${T.soft}`,
        borderRadius: 14, boxShadow: T.shadow, color: T.text, padding: 16
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Invite your spouse</h3>
          <button type="button" onClick={onClose} style={{
            padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.soft}`,
            background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
          }}>Close</button>
        </div>

        <p style={{ marginTop: 8, color: T.muted }}>
          Share this link with your spouse. When they open it, your apps will share a local “couple id”.
          (Cloud sync comes later.)
        </p>

        <div style={{
          border: `1px solid ${T.soft}`, borderRadius: 8, padding: 10, wordBreak: "break-all", background: "transparent", color: T.text
        }}>
          {link}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(link).then(() => toast("Copied")).catch(() => {});
            }}
            style={{
              padding: "8px 12px", borderRadius: 999, border: `1px solid ${T.primary}`,
              background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
            }}
          >
            Copy link
          </button>

          <button
            type="button"
            onClick={() => {
              setUser({ ...user, couple: { id: coupleId, inviteCode: code, joinedAt: user.couple?.joinedAt } });
              toast("Invite ready");
            }}
            style={{
              padding: "8px 12px", borderRadius: 999, border: `1px solid ${T.soft}`,
              background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
            }}
          >
            Generate code
          </button>
        </div>
      </div>
    </div>,
    document.body
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
  const T = useT();
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
        border: `1px solid ${T.soft}`,
        borderRadius: 12,
        padding: 16,
        background: T.card,
        color: T.text,
        marginTop: 12,
        boxShadow: T.shadow,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Conflict Style Assessment</h3>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: `1px solid ${T.soft}`,
            background: "transparent",
            color: T.text,
            cursor: "pointer",
            fontSize: 13,
          }}
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
                  border: `1px solid ${T.soft}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: "transparent",
                  color: T.text,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: T.muted }}>
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
              background: T.accent,
              color: "#1b1500",
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
  const [openInvite, setOpenInvite] = React.useState(false);
  const T = useT();
  const { user, setUser } = useApp();

  // Initialize form from saved profile or defaults
  const [form, setForm] = React.useState<UserProfile>(() => ({
  displayName:  user.profile?.displayName ?? "",
  email:        user.profile?.email ?? "",
  spouseName:   user.profile?.spouseName ?? "",
  anniversary:  user.profile?.anniversary ?? "",
  church:       user.profile?.church ?? "",
  ageRange:     user.profile?.ageRange ?? "",
  lifeStage:    user.profile?.lifeStage ?? "",
  kidsCount:    user.profile?.kidsCount ?? 0,
  yearsMarried: user.profile?.yearsMarried ?? 0,
}));

// Keep the local form in sync with user.profile whenever it changes
React.useEffect(() => {
  setForm({
    displayName:  user.profile?.displayName ?? "",
    email:        user.profile?.email ?? "",
    spouseName:   user.profile?.spouseName ?? "",
    anniversary:  user.profile?.anniversary ?? "",
    church:       user.profile?.church ?? "",
    ageRange:     user.profile?.ageRange ?? "",
    lifeStage:    user.profile?.lifeStage ?? "",
    kidsCount:    user.profile?.kidsCount ?? 0,
    yearsMarried: user.profile?.yearsMarried ?? 0,
  });
}, [user.profile]);

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
    border: `1px solid ${T.soft}`,
    background: "transparent",
    color: T.text,
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
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Display name</div>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => update("displayName", e.currentTarget.value)}
                style={inputStyle}
                placeholder="e.g., Ryan"
              />
            </label>
            <label>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Email</div>
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
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Spouse name</div>
              <input
                type="text"
                value={form.spouseName}
                onChange={(e) => update("spouseName", e.currentTarget.value)}
                style={inputStyle}
                placeholder="e.g., Taylor"
              />
            </label>
            <label>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Anniversary</div>
              <input
                type="date"
                value={form.anniversary}
                onChange={(e) => update("anniversary", e.currentTarget.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <label>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Church</div>
            <input
              type="text"
              value={form.church}
              onChange={(e) => update("church", e.currentTarget.value)}
              style={inputStyle}
              placeholder="e.g., Redemption Church"
            />
          </label>

{/* NEW: Personalization fields reflected on Profile */}
<div style={rowStyle}>
  <label>
    <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Age range</div>
    <select
      value={form.ageRange ?? ""}
      onChange={(e) => update("ageRange", e.currentTarget.value as any)}
      style={{ ...inputStyle, background: T.card }}   // solid bg so text is visible
    >
      <option value="" disabled>Choose…</option>
      <option value="18–24">18–24</option>
      <option value="25–34">25–34</option>
      <option value="35–44">35–44</option>
      <option value="45–54">45–54</option>
      <option value="55–64">55–64</option>
      <option value="65+">65+</option>
    </select>
  </label>

  <label>
    <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Life stage</div>
    <select
      value={form.lifeStage ?? ""}
      onChange={(e) => update("lifeStage", e.currentTarget.value as any)}
      style={{ ...inputStyle, background: T.card }}   // solid bg so text is visible
    >
      <option value="" disabled>Choose…</option>
      <option value="engaged">Engaged</option>
      <option value="newlywed">Newlywed</option>
      <option value="raising-kids">Raising kids</option>
      <option value="empty-nesters">Empty nesters</option>
      <option value="single-parent">Single parent</option>
      <option value="widowed">Widowed</option>
      <option value="other">Other</option>
    </select>
  </label>
</div>

<div style={rowStyle}>
  <label>
    <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Kids</div>
    <input
      type="number"
      min={0}
      value={form.kidsCount ?? 0}
      onChange={(e) => update("kidsCount", Number(e.currentTarget.value || 0) as any)}
      style={{ ...inputStyle, background: T.card }}   // optional: match select bg
      placeholder="0"
    />
  </label>

  <label>
    <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Years married</div>
    <input
      type="number"
      min={0}
      value={form.yearsMarried ?? 0}
      onChange={(e) => update("yearsMarried", Number(e.currentTarget.value || 0) as any)}
      style={{ ...inputStyle, background: T.card }}   // optional: match select bg
      placeholder="0"
    />
  </label>
</div>

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              type="button"
              onClick={save}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${T.primary}`,
                background: "transparent",
                color: T.text,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Save
            </button>

            <button
              type="button"
              onClick={clearProfile}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${T.soft}`,
                background: "transparent",
                color: T.text,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Clear
            </button>

            {saved && (
              <div style={{ alignSelf: "center", color: T.muted, fontSize: 13 }}>
                Saved ✅
              </div>
            )}
          </div>
        </div>
      </Card>

{/* NEW: Privacy & Sharing */}
<Card title="Privacy & Sharing" sub="Control what is visible to pastors/mentors and secure your data with a PIN.">
  <div style={{ display: "grid", gap: 10 }}>
    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="checkbox"
        checked={user.privacy?.allowPastorView ?? false}
        onChange={(e) => {
          const allow = e.currentTarget.checked;
          setUser({
            ...user,
            privacy: {
              ...(user.privacy ?? DEFAULT_PRIVACY),
              allowPastorView: allow,
              consentLog: [...(user.privacy?.consentLog ?? []), { at: Date.now(), allow }],
            },
          });
        }}
      />
      <span>Allow pastor/mentor to view my anonymized metrics</span>
    </label>

    {user.privacy?.consentLog?.length ? (
      <div style={{ fontSize: 12, color: T.muted }}>
        Last change: {new Date(user.privacy!.consentLog!.at(-1)!.at).toLocaleString()}
      </div>
    ) : null}

    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
      <div>• Journal entries are private by default and stored locally on this device.</div>
      <div>• Only group-level counts (e.g., habit completions, number of journal entries) are shown.</div>
      <div>• You can turn this off anytime.</div>
    </div>

    <div style={{ borderTop: `1px solid ${T.soft}`, marginTop: 12, paddingTop: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>App PIN & Auto-lock</div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={!!user.privacy?.pinEnabled}
          onChange={async (e) => {
  const enable = e.currentTarget.checked;
  let next = {
    ...user,
    privacy: {
      ...(user.privacy ?? DEFAULT_PRIVACY),
      pinEnabled: enable,
      consentLog: user.privacy?.consentLog ?? [],
    },
  };
  setUser(next);

  if (enable) {
    const pin = prompt("Set a 4–6 digit PIN:");
    if (pin && /^\d{4,6}$/.test(pin)) {
      const salt = getOrCreateSaltB64();
      SESSION_AES_KEY = await deriveKeyFromPin(pin, salt);
      toast("PIN set & session unlocked");
    } else {
      // revert
      SESSION_AES_KEY = null;
      next = { ...next, privacy: { ...next.privacy!, pinEnabled: false } };
      setUser(next);
      toast("PIN setup cancelled");
    }
  } else {
    SESSION_AES_KEY = null;
    toast("PIN disabled");
  }
}}
        />
        <span>Enable App PIN (required to view journal text)</span>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: T.muted, width: 180 }}>Auto-lock after</span>
        <select
          value={user.privacy?.autoLockMinutes ?? 10}
onChange={(e) =>
  setUser({
    ...user,
    privacy: {
      ...(user.privacy ?? DEFAULT_PRIVACY),
      // cast to the allowed union; Number(...) yields 5|10|30|60 here
      autoLockMinutes: Number(e.currentTarget.value) as 5 | 10 | 30 | 60,
    },
  })
}
>
  <option value={5}>5 minutes</option>
  <option value={10}>10 minutes</option>
  <option value={30}>30 minutes</option>
  <option value={60}>60 minutes</option>
</select>
</label>

{user.privacy?.pinEnabled && (
  <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
    <button
      type="button"
      onClick={async () => {
        const pin = prompt("Enter your 4–6 digit PIN to unlock this session:");
        if (pin && /^\d{4,6}$/.test(pin)) {
          const salt = getOrCreateSaltB64();
          SESSION_AES_KEY = await deriveKeyFromPin(pin, salt);
          toast("Session unlocked");
        } else if (pin) {
          toast("Invalid PIN format");
        }
      }}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${T.primary}`,
        background: "transparent",
        color: T.text,
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      Unlock with PIN
    </button>
    {SESSION_AES_KEY ? (
      <span style={{ fontSize: 12, color: T.muted }}>Unlocked ✓</span>
    ) : (
      <span style={{ fontSize: 12, color: T.muted }}>Locked</span>
    )}
  </div>
)}
</div> {/* end PIN & auto-lock section */}
</div> {/* end grid container inside Privacy card */}
</Card> {/* end Privacy & Sharing card */}

<Card title="Invite your spouse" sub="Share your couple space (local for now)">
  <div style={{ display: "flex", gap: 8 }}>
    <button
      type="button"
      onClick={() => setOpenInvite(true)}
      style={{
        padding: "8px 12px", borderRadius: 999, border: `1px solid ${T.primary}`,
        background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
      }}
    >
      Open invite
    </button>
    {user.couple?.id && (
      <div style={{ alignSelf: "center", fontSize: 12, color: T.muted }}>
        Couple ID: {user.couple.id.slice(0, 8)}…
      </div>
    )}
  </div>
</Card>

<InviteSpouseModal open={openInvite} onClose={() => setOpenInvite(false)} />

      {/* NEW: Journaling reminder controls */}
      <Card title="Journaling Reminders" sub="Customize how and when you’re nudged to journal.">
        <JournalPrefsEditor />
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

/* -------------------- JournalPrefsEditor (top-level component) -------------------- */
function JournalPrefsEditor() {
  const T = useT();
  const { user, setUser } = useApp();

  // ✅ ensureJournalBucket only when user actually changes
  const u = React.useMemo(() => ensureJournalBucket(user), [user]);

  const [local, setLocal] = React.useState<JournalPrefs>(u.journal!.prefs);

  // ✅ Only update local when the prefs object reference changes
  React.useEffect(() => {
    if (local !== u.journal!.prefs) {
      setLocal(u.journal!.prefs);
    }
  }, [u.journal!.prefs, local]);

  const labelStyle: React.CSSProperties = { fontSize: 13, color: T.muted, marginBottom: 4 };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: `1px solid ${T.soft}`,
    background: "transparent",
    color: T.text,
    fontSize: 14,
  };

  const savePrefs = () => {
    setUser({
      ...u,
      journal: { ...u.journal!, prefs: local, entries: u.journal!.entries },
    });
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={local.remindDaily}
          onChange={(e) => setLocal({ ...local, remindDaily: e.currentTarget.checked })}
        />
        <span>Daily reminder</span>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <div style={labelStyle}>Reminder time</div>
          <input
            type="time"
            value={local.remindTime ?? "20:30"}
            onChange={(e) => setLocal({ ...local, remindTime: e.currentTarget.value })}
            style={inputStyle}
          />
        </label>

        <label style={{ alignSelf: "end" }}>
          <div style={labelStyle}>Prompt after finishing a workflow</div>
          <input
            type="checkbox"
            checked={local.remindAfterWorkflow}
            onChange={(e) =>
              setLocal({ ...local, remindAfterWorkflow: e.currentTarget.checked })
            }
          />{" "}
          Enable
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={savePrefs}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: `1px solid ${T.primary}`,
            background: "transparent",
            color: T.text,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Save
        </button>
        <div style={{ alignSelf: "center", color: T.muted, fontSize: 12 }}>
          (Reminders are stored locally; cross-device sync can be added later.)
        </div>
      </div>
    </div>
  );
}

/* -------------------- ASSESSMENTS -------------------- */
const STYLE_TIPS: Record<ConflictStyle, string[]> = {
  Avoidant: [
    "Say what you need in one sentence before taking space.",
    "Schedule a return time when you step away (e.g., 'back at 7:30').",
    "Share one feeling, one fact, and one ask when you re-engage.",
    "Use 'I feel… when… because… I need…' to start.",
    "Practice micro-brave: one honest sentence per day."
  ],
  Competitive: [
    "Lead with a summary of your spouse’s point before yours.",
    "Ask one clarifying question before making a case.",
    "Trade winning for understanding; aim for a joint win.",
    "Lower volume first; clarity beats intensity.",
    "Name impact + offer repair when you notice pushing."
  ],
  Cooperative: [
    "Time-box collaboration so decisions actually land.",
    "When stuck, propose 2 concrete options with pros/cons.",
    "Guard against overfunctioning; invite shared ownership.",
    "Reflect feelings briefly, then move to next-step planning.",
    "Close with: 'What’s our one small step this week?'"
  ],
};

/* === CoachTips — style-aware tip list (restored) === */
function CoachTips({
  primary,
  secondary,
}: {
  primary?: ConflictStyle;
  secondary?: ConflictStyle;
}) {
  const T = useT();
  const tips = [
    ...(primary ? STYLE_TIPS[primary] : []),
    ...(secondary && secondary !== primary ? STYLE_TIPS[secondary] : []),
  ].slice(0, 5);

  if (!tips.length) {
    return (
      <div style={{ color: T.muted, fontSize: 13 }}>
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

function Assessments() {
  const toast = useToast();
  const { user, setUser } = useApp();
  const [show, setShow] = useState(false);
  const T = useT();

  return (
    <>
      <section style={{ ...cardStyle(T), marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Your Conflict Style</h3>

        {/* Summary pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <Pill T={T}>Primary: {user.stylePrimary ?? "—"}</Pill>
          <Pill T={T}>Secondary: {user.styleSecondary ?? "—"}</Pill>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 12 }}>
          <PrimaryButton
            T={T}
            variant="accent"
            onClick={() => setShow(true)}
          >
            {user.stylePrimary ? "Retake Assessment" : "Take Assessment"}
          </PrimaryButton>
        </div>

        {/* Personalized tips inline */}
        <div style={{ marginTop: 14 }}>
          <CoachTips primary={user.stylePrimary} secondary={user.styleSecondary} />
        </div>
      </section>

      {show && (
        <Assessment
          onClose={() => setShow(false)}
          onFinish={(primary, secondary) => {
            setUser({ ...user, stylePrimary: primary, styleSecondary: secondary });
            setShow(false);
            toast("Assessment saved");
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
  onProceed: () => void;
  seconds?: number;
  scripture?: string;
}) {
  const T = useT();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [sec, setSec] = React.useState(seconds);
  const [running, setRunning] = React.useState(true);
  const intervalRef = React.useRef<number | null>(null);

  // Focus first tabbable when opened
  React.useEffect(() => {
    if (!open) return;
    const first = rootRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    first?.focus();
  }, [open]);

  // Keyboard tab trap (stay within modal)
  function handleTabTrap(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    const nodes = rootRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!nodes || nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey && active === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && active === last) {
      first.focus();
      e.preventDefault();
    }
  }
  
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Attach/detach keydown handler while open
  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => handleTabTrap(e);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  // Reset on open or when `seconds` changes
  React.useEffect(() => {
    if (!open) return;
    setSec(seconds);
    setRunning(true);
  }, [open, seconds]);

  // Safe interval management for countdown
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
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Calm breathing timer"
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
      {/* Correct, separate CSS blocks */}
      <style>{`
        @keyframes tg-breathe {
          0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(138,21,56,.14); }
          50%  { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(138,21,56,.08); }
          100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(138,21,56,.14); }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="Breathing animation"] { animation: none !important; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 640,
          width: "100%",
          background: T.card,
          border: `1px solid ${T.soft}`,
          borderRadius: 14,
          boxShadow: T.shadow,
          color: T.text,
          padding: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Breathe and pray before you begin</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: `1px solid ${T.soft}`,
              background: "transparent",
              color: T.text,
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
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
              border: `4px solid ${T.primary}`,
              display: "grid",
              placeItems: "center",
              animation: "tg-breathe 6s ease-in-out infinite",
              background: "transparent",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>Breathe &amp; Pray</div>
          </div>
        </div>

        {/* Timer + controls */}
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{ textAlign: "center", marginTop: 6 }}
        >
          <div
            style={{ fontSize: 30, fontWeight: 800 }}
            aria-label={`${sec} seconds remaining`}
          >
            {sec}s
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={onProceed}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${T.primary}`,
                background: "transparent",
                color: T.text,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Proceed
            </button>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${T.soft}`,
                background: "transparent",
                color: T.text,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {running ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setSec(seconds);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${T.soft}`,
                background: "transparent",
                color: T.text,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Scripture line */}
        <p style={{ color: T.muted, textAlign: "center", marginTop: 14, marginBottom: 6 }}>
          {scripture}
        </p>
      </div>
    </div>
  );
}

/** =================== Journal Modals (entry, history, why) =================== */
function nowISOWithTZ() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  const offMin = -d.getTimezoneOffset();           // e.g., -420 => PDT
  const sign = offMin >= 0 ? "+" : "-";
  const offH = pad(Math.floor(Math.abs(offMin) / 60));
  const offM = pad(Math.abs(offMin) % 60);
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${offH}:${offM}`;
}

function ensureJournalBucket(u: UserState): UserState {
  if (u.journal) return u;
  return {
    ...u,
    journal: {
      entries: [],
      prefs: {
        remindDaily: false,
        remindTime: "20:30",
        remindAfterWorkflow: false,
        historyView: "list",
      },
    },
  };
}

/** Mini page with scripture + encouragement: "Why Journal?" */
function WhyJournalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const T = useT();
  if (!open) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      display: "grid", placeItems: "center", zIndex: 2147483647, padding: 16
    }}>
      <div style={{
        maxWidth: 700, width: "100%", maxHeight: "80vh", overflow: "auto",
        background: T.card, border: `1px solid ${T.soft}`, borderRadius: 14, boxShadow: T.shadow, color: T.text, padding: 16
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Why Journal?</h3>
          <button type="button" onClick={onClose} style={{
            padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.soft}`,
            background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
          }}>Close</button>
        </div>

        <div style={{ marginTop: 10, lineHeight: 1.6 }}>
          <p><strong>Scripture</strong></p>
          <ul>
            <li><em>Habakkuk 2:2</em> — “Write the vision; make it plain...”</li>
            <li><em>Psalm 77:11–12</em> — “I will remember the deeds of the LORD... and meditate on all your work.”</li>
            <li><em>Deut 6:6–7</em> — Keep God’s words on your heart; talk of them with your family.</li>
          </ul>

          <p style={{ marginTop: 12 }}><strong>Benefits (quick daily entries)</strong></p>
          <ul>
            <li><strong>Marriage:</strong> captures gratitude & repair, lowers reactivity, grows empathy.</li>
            <li><strong>Walk with Christ:</strong> concrete record of prayers, convictions, and answered prayer.</li>
            <li><strong>Parenting:</strong> preserves milestone memories and patterns you want to reinforce.</li>
            <li><strong>Emotional health:</strong> names feelings, tracks triggers, shows growth over time.</li>
          </ul>

          <p style={{ marginTop: 12 }}>
            Prefer pen & paper? Beautiful. Use TrueGlue to <em>remind</em> you daily and to
            check off the habit—even if your words live in a notebook.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Journal History (list + simple calendar toggle) */
function JournalHistoryModal({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const T = useT();
  const { user, setUser } = useApp();
  if (!open) return null;

  const u = ensureJournalBucket(user);
  const view = u.journal!.prefs.historyView;

  const setView = (v: "list" | "calendar") => {
    setUser({ ...u, journal: { ...u.journal!, prefs: { ...u.journal!.prefs, historyView: v } } });
  };

  // simple month grid based on today
  const entries = [...(u.journal!.entries ?? [])].sort((a, b) =>
    (a.isoDateTime > b.isoDateTime ? -1 : 1)
  );

  const byDay = new Map<string, number>();
  entries.forEach((e) => {
    const day = e.isoDateTime.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  });

  // calendar util
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-11
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ label: string; iso?: string; count?: number }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ label: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ label: String(d), iso, count: byDay.get(iso) ?? 0 });
  }

  return createPortal(
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      display: "grid", placeItems: "center", zIndex: 2147483647, padding: 16
    }}>
      <div style={{
        maxWidth: 820, width: "100%", maxHeight: "85vh", overflow: "auto",
        background: T.card, border: `1px solid ${T.soft}`, borderRadius: 14, boxShadow: T.shadow, color: T.text, padding: 16
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Journal History</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              style={{
                padding: "6px 10px", borderRadius: 999, border: `1px solid ${view === "list" ? T.primary : T.soft}`,
                background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
              }}
            >List</button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              aria-pressed={view === "calendar"}
              style={{
                padding: "6px 10px", borderRadius: 999, border: `1px solid ${view === "calendar" ? T.primary : T.soft}`,
                background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
              }}
            >Calendar</button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "6px 10px", borderRadius: 10, border: `1px solid ${T.soft}`,
                background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
              }}
            >Close</button>
          </div>
        </div>

        {view === "list" ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {entries.length === 0 && <div style={{ color: T.muted }}>No entries yet.</div>}
            {entries.map((e) => (
              <div key={e.id} style={{
                border: `1px solid ${T.soft}`, borderRadius: 10, padding: 12, background: "transparent"
              }}>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>
                  {new Date(e.isoDateTime).toLocaleString()}
                  {e.onPaper ? " • (paper)" : ""}
                </div>
                {e.onPaper ? (
  <em style={{ color: T.muted }}>No text (paper entry)</em>
) : e.encrypted ? (
  SESSION_AES_KEY ? (
    <DecryptedText payload={e.encrypted} />
  ) : (
    <em style={{ color: T.muted }}>Locked — enter PIN to view</em>
  )
) : (
  <em style={{ color: T.muted }}>No text</em>
)}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {today.toLocaleString(undefined, { month: "long", year: "numeric" })}
            </div>
            <div style={{
              display: "grid", gap: 6, gridTemplateColumns: "repeat(7, 1fr)"
            }}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} style={{ fontSize: 12, color: T.muted, textAlign: "center" }}>{d}</div>
              ))}
              {cells.map((c, i) => (
                <div key={i} style={{
                  border: `1px solid ${T.soft}`, borderRadius: 8, minHeight: 64, display: "grid",
                  gridTemplateRows: "auto 1fr", padding: 6, textAlign: "right", color: T.text, background: "transparent"
                }}>
                  <div style={{ fontSize: 12, color: T.muted }}>{c.label}</div>
                  <div style={{ alignSelf: "end", justifySelf: "center", fontSize: 12 }}>
                    {c.count ? "•".repeat(Math.min(3, c.count)) : ""}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: T.muted }}>• indicates days with entries</div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Write-or-check modal shown from Micro-Habits */
function JournalHabitModal({
  open, onClose, onSaved, onOpenHistory, onOpenWhy,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onOpenHistory: () => void;
  onOpenWhy: () => void;
}) {
  const T = useT();
  const toast = useToast();
  const { user, setUser, completeHabit } = useApp();
  const [text, setText] = React.useState("");

  React.useEffect(() => { if (open) setText(""); }, [open]);
  if (!open) return null;

  const saveText = async (opts?: { onPaper?: boolean }) => {
  const u = ensureJournalBucket(user);
  let encrypted: { iv: string; blob: string } | undefined = undefined;

  // 👇 Capture the session key once
  const key = SESSION_AES_KEY;

  if (!opts?.onPaper) {
    if (u.privacy?.pinEnabled && !key) {
      toast("Unlock with your PIN first");
      return;
    }
    if (key) {
      encrypted = await encryptJSONWithKey(key, { text: text.trim() });
    } else {
      // PIN not enabled → store plaintext (encrypted = undefined)
      // nothing to do
    }
  }

  const entry: JournalEntry = {
    id: Math.random().toString(36).slice(2),
    isoDateTime: nowISOWithTZ(),
    encrypted,
    onPaper: !!opts?.onPaper,
  };
  const next: UserState = {
    ...u,
    journal: { ...u.journal!, entries: [entry, ...u.journal!.entries], prefs: u.journal!.prefs },
  };
  setUser(next);
  completeHabit("journal");   // mark the habit
  onSaved();
  toast(opts?.onPaper ? "Marked done (paper)" : "Journal saved");
  onClose();
};

  return createPortal(
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      display: "grid", placeItems: "center", zIndex: 2147483647, padding: 16
    }}>
      <div style={{
        maxWidth: 720, width: "100%", background: T.card, border: `1px solid ${T.soft}`,
        borderRadius: 14, boxShadow: T.shadow, color: T.text, padding: 16
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>Quick Journal</h3>
          <button type="button" onClick={onClose} style={{
            padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.soft}`,
            background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
          }}>Close</button>
        </div>

        <div style={{ marginTop: 10 }}>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder="Write a few sentences… (or choose 'Done on paper')"
            style={{
              width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${T.soft}`,
              background: "transparent", color: T.text, fontSize: 14, lineHeight: 1.5
            }}
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => saveText()}
            style={{
              padding: "8px 12px", borderRadius: 999, border: `1px solid ${T.primary}`,
              background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
            }}
          >
            Save Entry
          </button>

          <button
            type="button"
            onClick={() => saveText({ onPaper: true })}
            style={{
              padding: "8px 12px", borderRadius: 999, border: `1px solid ${T.soft}`,
              background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
            }}
          >
            Done on paper
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            style={{
              padding: "8px 12px", borderRadius: 999, border: `1px solid ${T.soft}`,
              background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
            }}
          >
            History
          </button>

          <button
            type="button"
            onClick={onOpenWhy}
            style={{
              padding: "8px 12px", borderRadius: 999, border: `1px solid ${T.soft}`,
              background: "transparent", color: T.text, cursor: "pointer", fontSize: 13
            }}
          >
            Why journal?
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Small helper to render decrypted journal text
function DecryptedText({ payload }: { payload: { iv: string; blob: string } }) {
  const [txt, setTxt] = React.useState<string>(SESSION_AES_KEY ? "(decrypting…)" : "(locked — enter PIN)");
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!SESSION_AES_KEY) return;
      try {
        const obj = await decryptJSONWithKey<{ text: string }>(SESSION_AES_KEY, payload);
        if (alive) setTxt(obj.text);
      } catch {
        if (alive) setTxt("(unable to decrypt)");
      }
    })();
    return () => { alive = false; };
  }, [payload, SESSION_AES_KEY]);
  return <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{txt}</div>;
}

/** =================== VotdCommentaryModal (scholarly short notes + marriage application) =================== */

type VotdNote = { commentary: string; application: string };

/** Curated short notes for the verses you ship in SeedVersesByTopic. */
const VOTD_NOTES: Record<string, VotdNote> = {
  "James 1:19": {
    commentary:
      "Context: James writes to scattered Jewish Christians (Jas 1:1), blending wisdom and prophetic exhortation. The triad “swift to hear, slow to speak, slow to wrath” echoes Israel’s wisdom tradition (cf. Prov) and frames true piety not as mere speech but receptive obedience (see 1:22–25). Language: “swift to hear” (ταχύς εἰς τὸ ἀκοῦσαι) prioritizes attentive, teachable posture; “slow to speak/anger” (βραδύς) counters impulsive, self-assertive rhetoric. Theology: verse 20 grounds this in God’s righteousness—human anger fails to produce God’s covenantal rightness in community.",
    application:
      "Marriage: Practice a ‘listening first’ rule—one spouse summarizes the other before responding. Set a 2-minute “slow to speak” pause in tense moments. Replace quick rebuttals with clarifying questions (“What I hear you saying is… Did I get that right?”)."
  },

  "Proverbs 15:1": {
    commentary:
      "Genre: Hebrew proverb with antithetic parallelism. “Soft answer” (מַעֲנֶה־רַךְ) signals gentle, de-escalating speech; “grievous word” (דְּבַר־עֶצֶב, painful/hurtful) provokes anger. Wisdom frames speech as a tool shaping relational climate. Culturally, the proverb speaks to honor dynamics: restraint maintains honor without shaming the other.",
    application:
      "Marriage: Agree on a shared de-escalation phrase (e.g., “soft start-up”). Read tone before words. If either senses rising heat, switch to gentle statements of impact and need (“When X happens, I feel Y; could we try Z?”)."
  },

  "Ephesians 4:32": {
    commentary:
      "Context: In the “new-life” section (Eph 4–5), Paul grounds ethics in union with Christ. “Kind… tenderhearted… forgiving” culminates the put-off/put-on pattern. Language: “forgiving” (χαριζόμενοι) highlights grace as the pattern—extend favor as those favored in Christ. Theology: The cross supplies the logic and power for forgiveness in everyday wrongs.",
    application:
      "Marriage: Keep a short list. Build a weekly check-in: name small hurts, ask forgiveness without excuses, and grant it explicitly. Tie forgiveness to prayer (“Father, as you forgave us in Christ, help us forgive one another”)."
  },

  "Colossians 3:13": {
    commentary:
      "Context: As God’s chosen people (Col 3:12), the church wears Christlike virtues. Language: “bearing with” (ἀνεχόμενοι) expects ordinary friction; “forgiving” (χαριζόμενοι) mirrors the Lord’s prior forgiveness. Theology: In Christ’s body, forgiveness is not optional but constitutive of our identity.",
    application:
      "Marriage: Pre-decide your posture: we will absorb minor irritations in love, and address patterns with humility. Use a repair script: “I was wrong when I ____. Will you forgive me?”"
  },

  "Ephesians 4:3": {
    commentary:
      "Context: Paul urges unity rooted in one body/Spirit/hope (4:4–6). Language: “eagerly maintain” (σπουδάζοντες) indicates diligence; unity already given by the Spirit must be guarded. Theology: Peace is both a gift and a task—kept through lowliness, gentleness, patience (4:2).",
    application:
      "Marriage: Treat unity as something you ‘maintain’: schedule a weekly 20-minute sync (calendar it). Pray for one-mindedness before high-stakes decisions. Define what ‘bond of peace’ looks like in your home (tone, timing, touch)."
  },

  "Philippians 2:2": {
    commentary:
      "Context: Paul aims for communal ‘same mind’ shaped by the Christ-hymn (2:6–11). Language: like-mindedness (τὸ αὐτὸ φρονεῖν) is not uniformity but shared outlook formed by Christ’s humility. Theology: Joy grows where mutual love replaces self-advancement (2:3–4).",
    application:
      "Marriage: Before decisions, name your shared goal first (“What outcome serves ‘us’?”). Use a ‘we-first’ checklist: mutual understanding, mutual win, mutual timing."
  },

  "Proverbs 3:3": {
    commentary:
      "Language: ‘Mercy and truth’ (חֶסֶד וֶאֱמֶת; ḥesed & ’emet) are covenant love and reliability—God’s own attributes (Exod 34:6). Inscribe them internally (“tablet of your heart”) and externally (“about your neck”). Theology: Formation is both heart and habit.",
    application:
      "Marriage: Choose one ‘mercy’ habit (unearned kindness) and one ‘truth’ habit (honest check-in). Example: daily blessing text + weekly 10-minute candor review."
  },

  "Philippians 2:3": {
    commentary:
      "Language: ‘Vainglory’ (κενοδοξία) is empty status-seeking; ‘lowliness’ (ταπεινοφροσύνη) is Christ-shaped self-placement. Theology: Gospel humility values the other as weighty (δοκεῖν—regard).",
    application:
      "Marriage: In conflict, ask: “What in my spouse can I honor right now?” Practice ‘first-honor’: begin hard talks with a true affirmation of the other’s intent or effort."
  },

  "Galatians 5:22–23": {
    commentary:
      "Context: The fruit contrasts the ‘works of the flesh’ (5:19–21). Language: singular ‘fruit’ (καρπός)—one Spirit-grown character cluster. ‘Temperance’ (ἐγκράτεια) is Spirit-enabled self-governance. Theology: Growth is organic—rooted in life with the Spirit (5:16, 25).",
    application:
      "Marriage: Pick one fruit for a 14-day focus (e.g., patience). Define 2 behaviors that embody it (e.g., wait 3 seconds before replying; paraphrase before disagreeing). Review progress together."
  },
};

/** Fallback if a verse ref isn’t in VOTD_NOTES yet. */
function buildGenericVotdNote(topic: VerseTopic, ref: string, text: string): VotdNote {
  const generic =
    "Context: Read the verse within its paragraph and book to see argument flow. Language: Note key words and any repeated terms; ask how they function. Theology: What does this say about God’s character and His purposes for His people?";
  const apply =
    `Marriage: In light of ${ref}, choose one small behavior that embodies this for your spouse today. Name it, calendar it, and review together this week.`;
  return { commentary: generic, application: apply };
}

function VotdCommentaryModal({ open, onClose, verseRef, verseText, topic }: {
  open: boolean; onClose: () => void; verseRef: string; verseText: string; topic: VerseTopic;
}) {
  const T = useT();

  // ✨ Move hooks before any conditional return
  const closeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);

  if (!open) return null;

  const note = VOTD_NOTES[verseRef] ?? buildGenericVotdNote(topic, verseRef, verseText);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Short commentary and application"
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
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          background: T.card,
          border: `1px solid ${T.soft}`,
          borderRadius: 14,
          boxShadow: T.shadow,
          color: T.text,
          padding: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Short commentary &amp; application</h3>
          <button
            ref={closeRef}
	    type="button"
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid ${T.soft}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>

        {/* Verse header */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 800 }}>{verseRef}</div>
          <blockquote style={{ margin: "6px 0 0 0", fontSize: 15, lineHeight: 1.6 }}>{verseText}</blockquote>
        </div>

        {/* Commentary */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Commentary (short)</div>
          <p style={{ marginTop: 0, lineHeight: 1.6 }}>{note.commentary}</p>
        </div>

        {/* Application to marriage */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>How this relates to marriage</div>
          <p style={{ marginTop: 0, lineHeight: 1.6 }}>{note.application}</p>
        </div>
      </div>
    </div>
  );
}

/* -------------------- METRICS DASHBOARD -------------------- */
const HABIT_LABELS: Record<MicroHabitId, string> = {
  gratitude: "Gratitude",
  loveMap: "Love Map",
  scriptureVOTD: "Scripture (VOTD)",
  prayer: "Prayer",
  calmBreath: "Calm — Breathe",
  journal: "Journaling",
};

function MetricsDashboard() {
  const T = useT();
  const { user, logConflictResolved } = useApp();

  // ---- Window toggle (7/30) ----
  const [windowDays, setWindowDays] = React.useState<7 | 30>(30);
  const set7 = () => setWindowDays(7);
  const set30 = () => setWindowDays(30);

  const habits = user.completedHabits ?? {};
  const entries = user.journal?.entries ?? [];
  const conflictDates = user.conflictResolutions ?? [];

  // ---- Journal streak (consecutive days) ----
  const jDays = React.useMemo(() => journalDays(entries), [entries]);
  const journalStreak = React.useMemo(() => streak(jDays), [jDays]);

  const perHabit = React.useMemo(() => (
  (Object.keys(HABIT_LABELS) as MicroHabitId[]).map((id) => {
    const dates = habits[id] ?? [];
    return {
      id,
      name: HABIT_LABELS[id],
      todayDone: dates.includes(todayISO()),
      currentStreak: streak(dates),
      maxStreak: maxStreak(dates),
      lastN: countInLastNDays(dates, windowDays),
      series: presenceSeries(dates, windowDays),
      total: dates.length,          // ← add this
    };
  })
), [habits, windowDays]);

  const journalStats = React.useMemo(() => ({
    total: entries.length,
    onPaper: countsBy((e) => !!e.onPaper, entries),
    lastNdaysDistinct: distinctJournalDays(entries, windowDays),
    series: presenceSeries(jDays, windowDays),
  }), [entries, jDays, windowDays]);

  const last = (arr: string[]) => arr.length ? arr[arr.length - 1] : undefined;

  const conflictStats = React.useMemo(() => ({
    totalResolved: conflictDates.length,
    lastN: countInLastNDays(conflictDates, windowDays),
    lastResolvedOn: conflictDates.length ? last(conflictDates.slice().sort())! : "—",
  }), [conflictDates, windowDays]);

  const anon = React.useMemo(() => computeAnonymizedMetrics(user), [user]);

  // ---- Export helpers ----
  const summaryForExport = {
    windowDays,
    generatedAt: new Date().toISOString(),
    habits: perHabit.map((h) => ({
      id: h.id,
      name: h.name,
      todayDone: h.todayDone,
      currentStreak: h.currentStreak,
      maxStreak: h.maxStreak,
      lastN: h.lastN,
      total: h.total,
    })),
    journaling: {
      journalStreak,
      total: journalStats.total,
      onPaper: journalStats.onPaper,
      lastNdaysDistinct: journalStats.lastNdaysDistinct,
    },
    conflicts: conflictStats,
    anonymizedPreview: anon,
  };

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(summaryForExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `trueglue-metrics-${windowDays}d.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function toCSV(rows: Record<string, any>[]) {
    if (!rows.length) return "";
    const cols = Object.keys(rows[0]);
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
  }

  function downloadCSV() {
    const rows = [
      // One row per habit
      ...perHabit.map(h => ({
        section: "habit",
        id: h.id,
        name: h.name,
        todayDone: h.todayDone,
        currentStreak: h.currentStreak,
        maxStreak: h.maxStreak,
        lastN: h.lastN,
        total: h.total,
        windowDays,
      })),
      // one row for journaling
      {
        section: "journaling",
        journalStreak,
        total: journalStats.total,
        onPaper: journalStats.onPaper,
        lastNdaysDistinct: journalStats.lastNdaysDistinct,
        windowDays,
      },
      // one row for conflicts
      {
        section: "conflicts",
        totalResolved: conflictStats.totalResolved,
        lastN: conflictStats.lastN,
        lastResolvedOn: conflictStats.lastResolvedOn,
        windowDays,
      },
    ];
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `trueglue-metrics-${windowDays}d.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Quick weekly recap text (simple, friendly) ----
  const weeklyRecap = (() => {
    const topHabit = perHabit.slice().sort((a, b) => b.lastN - a.lastN)[0];
    return [
      `This week you journaled on ${journalStats.lastNdaysDistinct} day(s).`,
      topHabit ? `Most active habit: ${topHabit.name} (${topHabit.lastN}/${windowDays}).` : "",
      `Conflicts resolved: ${conflictStats.lastN} in last ${windowDays} days.`,
    ].filter(Boolean).join(" ");
  })();

  return (
    <>
      {/* Window toggle */}
      <Card title="Time Window">
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={set7}
            aria-pressed={windowDays === 7}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${windowDays === 7 ? T.primary : T.soft}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
            }}
          >Last 7 days</button>
          <button
            type="button"
            onClick={set30}
            aria-pressed={windowDays === 30}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${windowDays === 30 ? T.primary : T.soft}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
            }}
          >Last 30 days</button>
        </div>
      </Card>

      {/* My Metrics (couple-facing quick summary) */}
      <Card title="My Metrics" sub="Snapshot for this window">
        <div style={{ display: "grid", gap: 10 }}>
          <div><strong>Journaling streak:</strong> {journalStreak} day{journalStreak === 1 ? "" : "s"}</div>
          <div><strong>Journal days (last {windowDays}):</strong> {journalStats.lastNdaysDistinct}</div>
          <div><strong>Conflicts resolved (last {windowDays}):</strong> {conflictStats.lastN}</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{weeklyRecap}</div>
        </div>
      </Card>

      {/* Habits with sparklines */}
      <Card title="Habit Streaks & Trends" sub={`Current/max streaks • last ${windowDays} days`}>
        <div style={{ display: "grid", gap: 8 }}>
          {perHabit.map((h) => (
            <div
              key={h.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                border: `1px solid ${T.soft}`,
                borderRadius: 10,
                padding: 10,
                background: T.card,
                color: T.text,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{h.name}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  Today: {h.todayDone ? "✓" : "—"} • Streak {h.currentStreak} (max {h.maxStreak}) • {windowDays}d {h.lastN} • total {h.total}
                </div>
              </div>
              <Sparkline series={h.series} T={T} />
            </div>
          ))}
        </div>
      </Card>

      {/* Journaling with sparkline */}
      <Card title="Journaling" sub={`Counts only; text stays encrypted/private • last ${windowDays} days`}>
        <div style={{ display: "grid", gap: 8 }}>
          <div>Entries total: {journalStats.total} • On paper: {journalStats.onPaper}</div>
          <div>Distinct days with entries: {journalStats.lastNdaysDistinct}</div>
          <div><Sparkline series={journalStats.series} T={T} /></div>
        </div>
      </Card>

      {/* Conflicts */}
      <Card title="Conflict Resolutions" sub={`Simple counts by date • last ${windowDays} days`}>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Total resolved: {conflictStats.totalResolved}</li>
          <li>Resolved in last {windowDays}d: {conflictStats.lastN}</li>
          <li>Most recent: {conflictStats.lastResolvedOn}</li>
        </ul>
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={logConflictResolved}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: `1px solid ${T.primary}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Log “Conflict Resolved” (today)
          </button>
        </div>
      </Card>

      {/* Export */}
      <Card title="Export / Share" sub="Use for weekly check-ins or leader summaries">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={downloadCSV}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: `1px solid ${T.primary}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={downloadJSON}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: `1px solid ${T.soft}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Download JSON
          </button>
        </div>
      </Card>

      {/* Anonymized aggregate preview (unchanged, left as-is) */}
      <Card title="Anonymized Aggregate (Preview)" sub="This is what leaders can see if you enable sharing">
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Total habit completions: {anon.habitDayCount}</li>
          <li>Unique active days with any habit (last 30): {anon.anyHabitDaysLast30}</li>
          <li>Journal entries (count only): {anon.journalCount} (on paper: {anon.journalOnPaper})</li>
          <li>Days with journal entries (last 30): {anon.journalDaysLast30}</li>
          <li>Conflicts resolved: {anon.conflictsResolvedTotal} (last 30: {anon.conflictsLast30})</li>
        </ul>
        <div style={{ marginTop: 6, fontSize: 12, color: T.muted }}>
          Timestamp: {new Date(anon.updatedAt).toLocaleString()}
        </div>
        {!user.privacy?.allowPastorView && (
          <div style={{ marginTop: 8, fontSize: 12, color: T.muted }}>
            Sharing is currently <strong>OFF</strong>. Toggle it in <em>Profile → Privacy &amp; Sharing</em>.
          </div>
        )}
      </Card>
    </>
  );
}

/* -------------------- CHURCH / B2B -------------------- */
function ChurchPanel() {
  const T = useT();
  const { user } = useApp();

  const [windowDays, setWindowDays] = React.useState<7 | 30>(30);
  const set7 = () => setWindowDays(7);
  const set30 = () => setWindowDays(30);

  // reuse anonymized metrics (still 30d inside computeAnonymizedMetrics),
  // but expose export from per-user summary in this view as well.
  const m = computeAnonymizedMetrics(user);

  const summary = {
    windowDays,
    generatedAt: new Date().toISOString(),
    anonymizedPreview: m,
  };

  function exportJSON() {
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `trueglue-leader-${windowDays}d.json`; a.click();
    URL.revokeObjectURL(url);
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

      {/* Window toggle + export */}
      <Card title="Window & Export (Leader)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={set7}
            aria-pressed={windowDays === 7}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${windowDays === 7 ? T.primary : T.soft}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
            }}
          >Last 7 days</button>
          <button
            type="button"
            onClick={set30}
            aria-pressed={windowDays === 30}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${windowDays === 30 ? T.primary : T.soft}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
            }}
          >Last 30 days</button>

          <button
            type="button"
            onClick={exportJSON}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${T.primary}`,
              background: "transparent",
              color: T.text,
              cursor: "pointer",
              fontSize: 13,
              marginLeft: 8,
            }}
          >
            Export JSON
          </button>
        </div>
      </Card>

      {user.privacy?.allowPastorView && (
        <Card title="Group Metrics (Anonymized)">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Total habit completions (count): {m.habitDayCount}</li>
            <li>Total journal entries (count only): {m.journalCount}</li>
            <li>Journal days (last 30): {m.journalDaysLast30}</li>
          </ul>
          <div style={{ marginTop: 6, fontSize: 12, color: T.muted }}>
            These are counts only. No names, emails, or journal text are shared.
          </div>
        </Card>
      )}

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
  const T = useT();
  return (
    <div style={{ marginTop: 24, padding: "24px 0", color: T.muted, fontSize: 12 }}>
      <div>© {new Date().getFullYear()} TrueGlue. For marriage health and unity.</div>
    </div>
  );
}
