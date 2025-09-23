import React from "react";
import { useTheme } from "../theme";
import { useApp } from "../app"; // access logConflictResolved()

/** ================================================================
 * ConflictWorkflow (extracted old design) – drop-in component
 * - State machine: QUALIFY → REVIEW → QUESTIONS → CALM → SCHEDULE → REPAIR → RESOLVED
 * - Gentle language guard, Calm & Prepare (prayer timer + scripture topic)
 * - .ics export, one-time reschedule, Testimony Corner
 * - Style tips by conflict style (optional)
 * - LocalStorage persistence (key: trueglue_conflicts_v5)
 * ================================================================= */

type UserId = "A" | "B";
type ConflictStep =
  | "QUALIFY"
  | "RECIPIENT_REVIEW"
  | "QUESTIONS_SELFCRITIQUE"
  | "CALM_PREPARE"
  | "SCHEDULE"
  | "DIALOGUE"              // NEW
  | "DECISION_REPAIR"
  | "RESOLVED";
type ConflictHeat = "crisis" | "hot" | "tense" | "cool";
type JourneyStatus = "forward" | "wall" | "upstream" | "reset";
type AgreementDimension = "personal" | "relational" | "structural" | "cultural";
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
  heat?: ConflictHeat;
  journey?: JourneyStatus;
  reviewAt?: number;               
  dimensions?: AgreementDimension[]; 
  topicTags?: string[];            
  identityA?: string;
  identityB?: string;
  bothAnd?: string;
  dialogue?: {
    aParaphrase?: string;
    bParaphrase?: string;
    completed?: boolean;
  };
};

/* ----------------------------- THEME ----------------------------- */

type Theme = {
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

const focusRing = "0 0 0 3px rgba(47,165,165,.35)";


/* ------------------------- STORAGE HELPERS ------------------------ */
const LS_CONFLICTS = "trueglue_conflicts_v5";
const loadConflicts = (): ConflictSession[] => {
  try { return JSON.parse(localStorage.getItem(LS_CONFLICTS) || "[]"); } catch { return []; }
};
const saveConflicts = (items: ConflictSession[]) =>
  localStorage.setItem(LS_CONFLICTS, JSON.stringify(items));

/* ------------------------------ UTILS ---------------------------- */
const uid = () => Math.random().toString(36).slice(2);
const fmtDateTime = (d: number) =>
  new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function formatICSDateLocal(dateISO: string, timeHHMM: string) {
  const dt = new Date(`${dateISO}T${timeHHMM || "09:00"}`);
  const y = dt.getFullYear(); const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0"); const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}00`;
}
function addMinutes(hhmm: string, mins: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(); d.setHours(h, m + mins, 0, 0);
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
  const a = document.createElement("a"); a.href = url; a.download = "trueglue-conflict.ics"; a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------ LANGUAGE GUARDS ------------------------- */
const roughPhrases = [
  /you always/i, /you never/i, /whatever/i, /shut up/i,
  /that'?s stupid/i, /as usual/i, /everyone knows/i, /obviously/i,
  /\byou (are|were|must be) so\b/i, /\bwhy can'?t you\b/i
];

const needsGentleStart = (text: string) => !!text && roughPhrases.some((r) => r.test(text));
const gentleTemplate =
  'Try: "I feel ⟨emotion⟩ when ⟨specific event⟩ because ⟨impact⟩. I need ⟨clear ask⟩."';

function suggestGentleRewrite(raw: string) {
  if (!raw) return "";
  return `When ___ happened, I felt ___ because I value ___. I’d like ___.`;
}

/* ---------------------------- SCRIPTURE --------------------------- */
type Scripture = { ref: string; text: string; topics: string[] };
const seedScriptures: Scripture[] = [
  { ref: "Colossians 3:14", text: "And above all these put on love, which binds everything together in perfect harmony.", topics: ["unity","love","glue"] },
  { ref: "James 1:19–20", text: "Let every person be quick to hear, slow to speak, slow to anger...", topics: ["qualification","anger","listening"] },
  { ref: "Proverbs 12:18", text: "Rash words are like sword thrusts, but the tongue of the wise brings healing.", topics: ["disclosure","speech"] },
  { ref: "Philippians 2:4", text: "Look not only to your own interests, but also to the interests of others.", topics: ["review","empathy"] },
  { ref: "Colossians 3:13", text: "Bear with each other and forgive one another... Forgive as the Lord forgave you.", topics: ["repair","forgiveness"] },
  { ref: "1 Peter 4:8", text: "Keep loving one another earnestly, since love covers a multitude of sins.", topics: ["love","covering","hope"] },
  { ref: "Galatians 5:22", text: "The fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness...", topics: ["patience","fruit"] },

];
type VerseTopic = "anger" | "patience" | "unity" | "forgiveness";
const verseByTopic: Record<VerseTopic, Scripture[]> = {
  anger: seedScriptures.filter(s => s.topics.includes("anger")),
  patience: seedScriptures.filter(s => s.text.toLowerCase().includes("patient")),
  unity: seedScriptures.filter(s => s.topics.includes("unity") || s.text.toLowerCase().includes("bind")),
  forgiveness: seedScriptures.filter(s => s.topics.includes("forgiveness") || s.text.toLowerCase().includes("forgive")),
};
const verseTopics: VerseTopic[] = ["anger","patience","unity","forgiveness"];
function pickVerse(topic: VerseTopic, dayIndex = 0) {
  const list = verseByTopic[topic]; if (!list || list.length === 0) return seedScriptures[0];
  return list[dayIndex % list.length];
}

/* ----------------------------- STYLES ----------------------------- */
type StyleKey = "Avoider" | "Critic" | "Stonewaller" | "Peacemaker" | "Collaborator";
type UserStyles = { primary?: StyleKey; secondary?: StyleKey };
type AllStyles = { A: UserStyles; B: UserStyles };
const styleTips: Record<StyleKey, { general: string[]; byStep: Partial<Record<ConflictStep, string[]>> }> = {
  Avoider: { general: ["Speak your need in one sentence.", "Schedule the talk—structure lowers anxiety."], byStep: { QUALIFY:["Name the issue plainly."], RECIPIENT_REVIEW:["Reflect back in two sentences."], QUESTIONS_SELFCRITIQUE:["Ask one curious question."], CALM_PREPARE:["Do 2 extra breath cycles."], DECISION_REPAIR:["Commit to one small follow-up."] } },
  Critic: { general: ["Use gentle start; one ask."], byStep: { QUALIFY:["Avoid 'always/never'."], RECIPIENT_REVIEW:["Summarize without 'but'."], QUESTIONS_SELFCRITIQUE:["Own 10% you could do better."], CALM_PREPARE:["Pray for kindness."], DECISION_REPAIR:["Phrase as shared goals."] } },
  Stonewaller: { general: ["Name breaks; return time."], byStep: { QUALIFY:["If flooded, pause 10m."], RECIPIENT_REVIEW:["Stay present."], QUESTIONS_SELFCRITIQUE:["Type one feeling word."], CALM_PREPARE:["Double exhale length."], SCHEDULE:["Prefer earlier evening."] } },
  Peacemaker: { general: ["Don’t skip truth; affirm then ask."], byStep: { QUALIFY:["Include one concrete example."], RECIPIENT_REVIEW:["Affirm before adding."], QUESTIONS_SELFCRITIQUE:["Avoid self-blame as mask."], DECISION_REPAIR:["Be specific, not vague peace."] } },
  Collaborator: { general: ["Guard against over-talking."], byStep: { QUALIFY:["Keep it one sentence."], QUESTIONS_SELFCRITIQUE:["Ask one clarifying question."], SCHEDULE:["Propose 1 time, not 3."], DECISION_REPAIR:["Choose 1–2 actions."] } },
};

/* --------------------------- UI PRIMITIVES ------------------------ */
function cardStyle(T: Theme): React.CSSProperties {
  return { background: T.card, border: `1px solid ${T.soft}`, borderRadius: 16, padding: 20, boxShadow: T.shadow };
}
function Pill({ children, T, color }: { children: React.ReactNode; T: Theme; color?: string }) {
  return <span style={{ display: "inline-block", border: `1px solid ${color ?? T.soft}`, padding: "6px 12px", borderRadius: 999, color: color ?? T.muted, fontSize: 12 }}>{children}</span>;
}
function Banner({ children, T, color }: { children: React.ReactNode; T: Theme; color: string }) {
  return <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: `1px solid ${color}`, color, fontWeight: 600 }}>{children}</div>;
}
function ReadBox({ title, value, T }: { title: string; value: string; T: Theme }) {
  return <div style={{ border: `1px solid ${T.soft}`, borderRadius: 12, padding: 12 }}>
    <div style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>{title}</div>
    <div style={{ whiteSpace: "pre-wrap", maxWidth: "70ch" }}>{value || "—"}</div>
  </div>;
}
function Modal({ title, onClose, children, T }: { title: string; onClose: () => void; children: React.ReactNode; T: Theme }) {
  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
    <div style={{ ...cardStyle(T), maxWidth: 640, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <button style={{ border: `1px solid ${T.soft}`, background: "transparent", color: T.text, borderRadius: 10, padding: "8px 12px", cursor: "pointer" }} onClick={onClose} aria-label="Close"
          onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}>✕</button>
      </div>
      <div>{children}</div>
    </div>
  </div>;
}
function ScriptureInline({ refText, T }: { refText: string; T: Theme }) {
  return <Pill T={T} color={T.accent}>Scripture: {refText}</Pill>;
}
function SafetyBanner({ T }: { T: Theme }) {
  return <div role="note" style={{ marginTop: 12, padding: 12, borderRadius: 12, border: `1px solid ${T.danger}`, color: T.danger }}>
    Not for emergencies or unsafe situations. If you are in danger, seek local help immediately.
  </div>;
}
function labelStyle(T: Theme): React.CSSProperties { return { fontSize: 13, color: T.muted, marginBottom: 6 }; }
function inputStyle(T: Theme): React.CSSProperties { return { width: "100%", background: "transparent", color: T.text, border: `1px solid ${T.soft}`, borderRadius: 12, padding: "12px 14px", outline: "none" }; }
function textareaStyle(T: Theme): React.CSSProperties { return { ...inputStyle(T), minHeight: 106, resize: "vertical" as const }; }
function Field({ label, value, onChange, T, textarea, placeholder }: { label: string; value: string; onChange: (v: string) => void; T: Theme; textarea?: boolean; placeholder?: string; }) {
  return <div style={{ marginBottom: 12 }}>
    <label style={labelStyle(T)}>{label}</label>
    {textarea ? <textarea style={textareaStyle(T)} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} /> :
      <input style={inputStyle(T)} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")} />}
  </div>;
}
function FieldRaw({ label, T, children }: { label: string; T: Theme; children: React.ReactNode; }) {
  return <div style={{ marginBottom: 12 }}><label style={labelStyle(T)}>{label}</label>{children}</div>;
}
function PrimaryButton({ children, onClick, disabled, T }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; T: Theme; }) {
  return <button onClick={onClick} disabled={disabled} style={{ border: "none", borderRadius: 12, padding: "12px 16px", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, background: T.primary, color: "#001315", opacity: disabled ? 0.6 : 1, outline: "none" }}
    onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}>{children}</button>;
}
function GhostButton({ children, onClick, T }: { children: React.ReactNode; onClick?: () => void; T: Theme; }) {
  return <button onClick={onClick} style={{ border: `1px solid ${T.soft}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", fontWeight: 600, background: "transparent", color: T.text, outline: "none" }}
    onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)} onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}>{children}</button>;
}
function AccentButton({
  children, onClick, T, ...rest
}: React.PropsWithChildren<{ onClick?: () => void; T: Theme } & React.ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        border: "none", borderRadius: 12, padding: "12px 16px",
        cursor: "pointer", fontWeight: 700, background: T.accent, color: "#1b1500", outline: "none"
      }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {children}
    </button>
  );
}

/* ----------------------- Calm & Prepare (+Timer) ------------------ */
// Minimal Timer controls (no title) to embed inside Breathing card
function BreathingTimer({ T, seconds = 60 }: { T: Theme; seconds?: number }) {
  const [sec, setSec] = React.useState(seconds);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (!running) return;
    if (sec <= 0) { setRunning(false); return; } // stop cleanly at 0
    const id = setInterval(() => setSec((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running, sec]);

  const start = () => {
    if (sec === 0) setSec(seconds);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setSec(seconds); };

  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{sec}s</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <AccentButton T={T} onClick={start}>
          {running ? "Running…" : `Start ${seconds}s`}
        </AccentButton>
        <AccentButton T={T} onClick={pause}>Pause</AccentButton>
        <AccentButton T={T} onClick={reset}>Reset</AccentButton>
      </div>
    </div>
  );
}

// REPLACE your existing CalmPrepare with this version
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

      {/* === Two-column section: Breathing WITH timer (left) + Prayer text (right) === */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        {/* Left: Breathing (with timer inside) */}
        <div style={{ ...cardStyle(T) }}>
          <h4 style={{ marginTop: 0 }}>Breathing (60s)</h4>
          <p style={{ color: T.muted }}>
            Inhale 4 • Hold 4 • Exhale 6 — repeat 6–8 times. Relax your jaw and shoulders.
          </p>
          <div style={{ marginTop: 8 }}>
            {/* Timer moved here */}
            <BreathingTimer T={T} seconds={60} />
          </div>
        </div>

        {/* Right: Prayer text only (no timer) */}
        <div style={{ ...cardStyle(T) }}>
          <h4 style={{ marginTop: 0 }}>Pray Together</h4>
          <p style={{ color: T.muted, marginTop: 0 }}>
            “Lord, make us quick to hear, slow to speak, and bind us in Your love.”
          </p>
        </div>
      </div>

      {/* Scripture card (unchanged, just moved below) */}
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

function HeatGauge({ T, value, onChange }: {
  T: Theme; value: ConflictHeat; onChange: (v: ConflictHeat)=>void;
}) {
  const opts: ConflictHeat[] = ["crisis","hot","tense","cool"];
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      {opts.map(h => (
        <button key={h}
          aria-pressed={value===h} onClick={()=>onChange(h)}
          style={{
            border:`1px solid ${T.soft}`, borderRadius:12, padding:"8px 12px",
            background: value===h ? T.primary : "transparent",
            color: value===h ? "#001315" : T.text, cursor:"pointer"
          }}>
          {h === "crisis" ? "🧯 Crisis" :
           h === "hot" ? "😤 Hot" :
           h === "tense" ? "😐 Tense" : "🙂 Cool"}
        </button>
      ))}
    </div>
  );
}

function PauseAgreementCard({ T, onDone }: {
  T: Theme; onDone: (desc: string) => void;
}) {
  const [until, setUntil] = React.useState("");
  const [rules, setRules] = React.useState('We won’t text except logistics. We’ll reconvene kindly.');
  return (
    <div style={{ ...cardStyle(T) }}>
      <h4 style={{ marginTop:0 }}>Pause Agreement</h4>
      <p style={{ color:T.muted, marginTop:0 }}>
        If emotions are spiking, agree to pause and return at a set time.
      </p>
      <FieldRaw label="Return time/date" T={T}>
        <input type="datetime-local" value={until}
               onChange={(e)=>setUntil(e.target.value)} style={inputStyle(T)} />
      </FieldRaw>
      <Field label="Ground rules" value={rules} onChange={setRules} T={T} textarea />
      <div style={{ display:"flex", gap:8 }}>
        <GhostButton T={T} onClick={()=>{
          const desc = `Pause until ${until || "TBD"} • ${rules}`;
          onDone(desc);
        }}>Create Pause</GhostButton>
      </div>
    </div>
  );
}

function DialogueScaffold({ T, c, update, onComplete }: {
  T: Theme; c: ConflictSession;
  update: (mutator: (x: ConflictSession)=>void) => void;
  onComplete: () => void;
}) {
  const [aPara, setAPara] = React.useState(c.dialogue?.aParaphrase ?? "");
  const [bPara, setBPara] = React.useState(c.dialogue?.bParaphrase ?? "");
  const canFinish = aPara.trim().length>0 && bPara.trim().length>0;

  return (
    <div style={{ ...cardStyle(T) }}>
      <h3 style={{ marginTop:0 }}>Step 6 – Dialogue (paraphrase & parity)</h3>
      <p style={{ color:T.muted, marginTop:0 }}>
        Take turns. A speaks for 2 minutes; B paraphrases. Then swap.
      </p>
      <div style={{ display:"grid", gap:12, gridTemplateColumns:"1fr 1fr" }}>
        <div>
          <h4 style={{ marginTop:0 }}>A speaks (2:00)</h4>
          <BreathingTimer T={T} seconds={120} />
          <Field label="B’s paraphrase of A (required)" value={bPara} onChange={(v)=>{
            setBPara(v);
            update(x => x.dialogue = { ...(x.dialogue||{}), bParaphrase: v });
          }} T={T} textarea />
        </div>
        <div>
          <h4 style={{ marginTop:0 }}>B speaks (2:00)</h4>
          <BreathingTimer T={T} seconds={120} />
          <Field label="A’s paraphrase of B (required)" value={aPara} onChange={(v)=>{
            setAPara(v);
            update(x => x.dialogue = { ...(x.dialogue||{}), aParaphrase: v });
          }} T={T} textarea />
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <PrimaryButton T={T} disabled={!canFinish} onClick={()=>{
          update(x => x.dialogue = { ...(x.dialogue||{}), completed: true });
          onComplete();
        }}>Proceed to Decision & Repair</PrimaryButton>
        <GhostButton T={T} onClick={()=>alert("Paraphrase tip: summarize impact/need without rebuttal.")}>
          Paraphrase tip
        </GhostButton>
      </div>
    </div>
  );
}

/* ----------------------- TIPS (style-based chips) ----------------- */
function TipChips({ T, styles, step, role }: { T: Theme; styles?: UserStyles; step: ConflictStep; role: "initiator" | "recipient"; }) {
  if (!styles?.primary) return null;
  const p = styles.primary!; const s = styles.secondary;
  const collect = (k: StyleKey) => [ ...(styleTips[k].byStep[step] || []), ...(role === "initiator" ? styleTips[k].general.slice(0,1) : []) ];
  const tips = [...collect(p), ...(s ? collect(s) : [])].slice(0, 3);
  if (tips.length === 0) return null;
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
    {tips.map((t, i) => <Pill key={i} T={T} color={T.primary}>{t}</Pill>)}
  </div>;
}

/* ----------------------- CORE: CONFLICTS VIEW --------------------- */

function ConflictsView({
  T, activeUser, conflicts, setConflicts, myOpen, myResolved, userStyles, verseTopic, setVerseTopic,
}: {
  T: Theme;
  activeUser: UserId;
  conflicts: ConflictSession[];
  setConflicts: React.Dispatch<React.SetStateAction<ConflictSession[]>>;
  myOpen: ConflictSession[];
  myResolved: ConflictSession[];
  userStyles: AllStyles;
  verseTopic: VerseTopic;
  setVerseTopic: (t: VerseTopic) => void;
}) {
  const [showCalm, setShowCalm] = React.useState(false);
  const [heat, setHeat] = React.useState<ConflictHeat>("tense");
  const startNew = () => { setHeat("tense"); setShowCalm(true); };
const followups = conflicts
  .filter(c => c.step === "RESOLVED" && typeof c.reviewAt === "number" && Date.now() >= (c.reviewAt || 0));

const actuallyCreate = () => {
  const recipient: UserId = activeUser === "A" ? "B" : "A";
  const c: ConflictSession = {
    id: uid(), initiator: activeUser, recipient,
    step: "QUALIFY", createdAt: Date.now(),
    calmShownToInitiator: true, hasPromptForRecipient: true, rescheduleCount: 0,
    heat, journey: "forward",
  };
  setConflicts(arr => [c, ...arr]);
  setShowCalm(false);
};

  return (
    <div style={{ display: "grid", gap: 16 }}>
    {showCalm && (
  <Modal onClose={() => setShowCalm(false)} title="Prepare to Start" T={T}>
    <div style={{ display:"grid", gap:12 }}>
      <FieldRaw label="How hot is it right now?" T={T}>
        <HeatGauge T={T} value={heat} onChange={setHeat} />
      </FieldRaw>

      {heat === "crisis" ? (
        <PauseAgreementCard T={T} onDone={(desc)=>{
          // Try to parse a date/time from the description for the .ics
          const matchDate = desc.match(/\d{4}-\d{2}-\d{2}/)?.[0];
          const matchTime = desc.match(/\d{2}:\d{2}/)?.[0];
          downloadICS({ title:"TrueGlue: Pause Agreement", description: desc, dateISO: matchDate, timeHHMM: matchTime });
          alert("Pause agreement created. Come back when you’re ready.");
          setShowCalm(false);
        }} />
      ) : (
        <>
          <CalmPrepare T={T} topic={verseTopic} onTopicChange={setVerseTopic} />
          <div style={{ display:"flex", gap:8 }}>
            <PrimaryButton T={T} onClick={actuallyCreate}>
              {heat === "cool" ? "Start" : "I’m calm—start"}
            </PrimaryButton>
            <GhostButton T={T} onClick={()=>setShowCalm(false)}>Cancel</GhostButton>
          </div>
        </>
      )}
    </div>
  </Modal>
)}

    <div style={cardStyle(T)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Conflict Sessions</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <AccentButton T={T} onClick={startNew}>+ Start Conflict</AccentButton>
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
      {myOpen.map(c => (
        <ConflictCard
          key={c.id}
          c={c}
          me={activeUser}
          setConflicts={setConflicts}
          T={T}
          myStyles={userStyles[activeUser]}
          verseTopic={verseTopic}
          setVerseTopic={setVerseTopic}
        />
      ))}
    </div>
  </section>
)}

{followups.length > 0 && (
  <section style={{ ...cardStyle(T), borderColor: T.accent }}>
    <h3 style={{ marginTop: 0 }}>Follow-ups due</h3>
    <ul style={{ marginTop: 6 }}>
      {followups.map(c => (
        <li key={c.id}>
          Session #{c.id.slice(0,6)} • review scheduled {fmtDateTime(c.reviewAt!)}{" "}
          <GhostButton T={T} onClick={() => alert("Guide: Ask ‘Did our agreement help? Keep, Tweak, or Drop?’")}>
            Open review guide
          </GhostButton>
        </li>
      ))}
    </ul>
  </section>
)}

<section style={cardStyle(T)}>
  <h3 style={{ marginTop: 0 }}>Previous Conflicts (view-only)</h3>
  {myResolved.length === 0 && (
    <p style={{ color: T.muted, marginBottom: 0 }}>No resolved sessions yet.</p>
  )}
  <div style={{ display: "grid", gap: 12 }}>
    {myResolved.map(c => (
  <ResolvedCard
    key={c.id}
    c={c}
    me={activeUser}
    T={T}
    collapsible
  />
))}
  </div>
</section>

</div>
);
}

function ConflictCard({
  c, me, setConflicts, T, myStyles, verseTopic, setVerseTopic,
}: {
  c: ConflictSession; me: UserId;
  setConflicts: React.Dispatch<React.SetStateAction<ConflictSession[]>>;
  T: Theme; myStyles?: UserStyles; verseTopic: VerseTopic; setVerseTopic: (t: VerseTopic) => void;
 }) {
  // App-level metrics API (added in App context)
  const { logConflictResolved } = useApp();

  const iAmInitiator = c.initiator === me;
  const iAmRecipient = c.recipient === me;

  const [sentence, setSentence] = React.useState(c.issueSentence ?? "");
  const [details, setDetails] = React.useState(c.issueDetails ?? "");
  const [reviewSummary, setReviewSummary] = React.useState(c.recipientReviewSummary ?? "");
  const [nonhostile, setNonhostile] = React.useState(c.nonhostileQuestions ?? "");
  const [selfCrit, setSelfCrit] = React.useState(c.selfCritique ?? "");
  const [date, setDate] = React.useState(c.proposedDate ?? "");
  const [time, setTime] = React.useState(c.proposedTime ?? "");
  const [desc, setDesc] = React.useState(c.proposedDescriptor ?? "");
  const [decisions, setDecisions] = React.useState(c.decisionsAgreements ?? "");
  const [apologies, setApologies] = React.useState(c.apologiesForgiveness ?? "");
  const [followUp, setFollowUp] = React.useState(c.followUpPlan ?? "");
  const [showCalm, setShowCalm] = React.useState(false);
  const [dims, setDims] = React.useState<AgreementDimension[]>(c.dimensions ?? []);
  const [fair, setFair] = React.useState(false);
  const toggleDim = (k: AgreementDimension) =>
  setDims(d => d.includes(k) ? d.filter(x=>x!==k) : [...d, k]);

  const [myIdentity, setMyIdentity] = React.useState(
  me === "A" ? (c.identityA ?? "") : (c.identityB ?? "")
);

  React.useEffect(() => {
    if (iAmRecipient && !c.calmShownToRecipient) {
      setShowCalm(true);
      update(x => { x.calmShownToRecipient = true; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(mutator: (x: ConflictSession) => void) {
    setConflicts(arr => arr.map(s => s.id === c.id ? (() => { const copy = { ...s }; mutator(copy); return copy; })() : s));
  }

  function canAdvanceFromQualify() {
    return !!c.issueSentence && !!c.issueDetails && !!c.initiatorAcceptedSingleFocus && !!c.recipientAcceptedSingleFocus;
  }
  function advanceFromQualify() { if (!canAdvanceFromQualify()) return; update(x => { x.step = "RECIPIENT_REVIEW"; x.hasPromptForInitiator = true; }); }
  function canCompleteReview() { return !!c.issueSentence && !!c.issueDetails && !!reviewSummary.trim(); }
  function completeReview() { if (!canCompleteReview()) return; update(x => { x.recipientReviewSummary = reviewSummary.trim(); x.step = "QUESTIONS_SELFCRITIQUE"; }); }
  function completeQuestionsSelf() {
  update(x => {
    x.nonhostileQuestions = nonhostile.trim();
    x.selfCritique = selfCrit.trim();
    if (me === "A") x.identityA = myIdentity.trim(); else x.identityB = myIdentity.trim();
    if ((x.identityA?.length ?? 0) > 0 && (x.identityB?.length ?? 0) > 0) {
      x.bothAnd = `How can we protect A’s “${x.identityA}” and B’s “${x.identityB}” at the same time?`;
    }
    x.step = "CALM_PREPARE";
  });
}
  function proceedFromCalmPrepare() { update(x => { x.step = "SCHEDULE"; }); }
  function proposeTime() { if (!iAmInitiator) return; if (!date && !time && !desc.trim()) return; update(x => { x.proposedDate = date || ""; x.proposedTime = time || ""; x.proposedDescriptor = desc.trim(); }); }
  function recipientConfirmTime() {
  if (!iAmRecipient) return;
  update(x => { x.confirmedDateTimeByRecipient = true; x.step = "DIALOGUE"; });
}
  function requestReschedule() {
    if ((c.rescheduleCount ?? 0) >= 1) return;
    update(x => { x.confirmedDateTimeByRecipient = false; x.step = "SCHEDULE"; x.rescheduleCount = (x.rescheduleCount ?? 0) + 1; x.hasPromptForInitiator = true; });
    alert("Reschedule requested. Initiator can propose a new time.");
  }
  function downloadIcsNow() {
    const when = `${c.proposedDate || ""} ${c.proposedTime || ""} ${c.proposedDescriptor || ""}`.trim();
    downloadICS({ title: "TrueGlue: Conflict Discussion", description: `Issue: ${c.issueSentence || ""}\\nDetails: ${c.issueDetails || ""}\\nWhen: ${when || "TBD"}`, dateISO: c.proposedDate, timeHHMM: c.proposedTime });
  }
  function makeRecap() {
    const scheduled = c.confirmedDateTimeByRecipient ? `${c.proposedDate || ""} ${c.proposedTime || ""} ${c.proposedDescriptor || ""}`.trim() : "—";
    return [
      `Issue: ${c.issueSentence ?? ""}`, `Details: ${c.issueDetails ?? ""}`,
      `Recipient Summary: ${c.recipientReviewSummary ?? ""}`, `Questions: ${c.nonhostileQuestions ?? ""}`,
      `Self-critique: ${c.selfCritique ?? ""}`, `Scheduled: ${scheduled}`,
      `Agreements: ${decisions}`, `Apologies & Forgiveness: ${apologies}`, `Follow-up: ${followUp}`,
    ].join("\n");
  }
  function completeDecisionRepair() {
  const recap = makeRecap();
  update(x => {
    x.dimensions = dims;
    x.decisionsAgreements = decisions.trim();
    x.apologiesForgiveness = apologies.trim();
    x.followUpPlan = followUp.trim();
    x.recap = recap;
    x.step = "RESOLVED";
    x.resolvedAt = Date.now();
    x.reviewAt = Date.now() + 7*24*60*60*1000; // +7 days
    x.hasPromptForInitiator = false;
    x.hasPromptForRecipient = false;
  });
  // 👇 update app-wide Metrics (conflicts resolved today)
   logConflictResolved();
}

  const stepOrder: ConflictStep[] = [
  "QUALIFY","RECIPIENT_REVIEW","QUESTIONS_SELFCRITIQUE",
  "CALM_PREPARE","SCHEDULE","DIALOGUE","DECISION_REPAIR","RESOLVED"
];
  const currentIndex = stepOrder.indexOf(c.step);
  const schedulePreview = (date || time || desc) ? `Proposed: ${[date, time, desc].filter(Boolean).join(" • ")}` : "";

  return <div style={{ ...cardStyle(T), borderColor: T.primary }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Pill T={T}>Session #{c.id.slice(0,6)}</Pill>
      <Pill T={T}>Initiator: <b>{c.initiator}</b></Pill>
      <Pill T={T}>Recipient: <b>{c.recipient}</b></Pill>
      <Pill T={T}>Started {fmtDateTime(c.createdAt)}</Pill>
      {c.resolvedAt && <Pill T={T}>Resolved {fmtDateTime(c.resolvedAt)}</Pill>}
    </div>

    {iAmRecipient && c.hasPromptForRecipient && <Banner T={T} color={T.primary}>Your partner invited you to continue this session.</Banner>}
    {iAmInitiator && c.hasPromptForInitiator && <Banner T={T} color={T.accent}>Your partner responded. Continue when ready.</Banner>}

    <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }} aria-label="Progress">
  {stepOrder.map((s, i) => {
    const active = i === currentIndex;
    return (
      <span key={s} aria-current={active ? "step" : undefined}>
        <Pill T={T} color={i <= currentIndex ? (active ? T.primary : T.soft) : T.soft}>
          {i+1}. {labelForStep(s)}
        </Pill>
      </span>
    );
  })}
</div>

    {showCalm && (
      <Modal onClose={() => setShowCalm(false)} title="Calm & Prepare" T={T}>
        <CalmPrepare T={T} compact topic={verseTopic} onTopicChange={setVerseTopic} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <PrimaryButton T={T} onClick={() => setShowCalm(false)}>Proceed</PrimaryButton>
        </div>
      </Modal>
    )}

    <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
      {/* STEP 1 */}
      {c.step === "QUALIFY" && (
        <div style={{ ...cardStyle(T) }}>
          <h3 style={{ marginTop: 0 }}>Step {currentIndex + 1} – Qualification (single-sentence focus)</h3>
          <ScriptureInline refText="James 1:19–20" T={T} />
          <SafetyBanner T={T} />
          <TipChips T={T} styles={myStyles} step="QUALIFY" role={iAmInitiator ? "initiator" : "recipient"} />
          {(needsGentleStart(details) || needsGentleStart(sentence)) && (
  <Banner T={T} color={T.accent}>
    Gentle start tip: {gentleTemplate}
    <div style={{ marginTop: 6, fontSize: 12, color: T.muted }}>
      Try rewriting: {suggestGentleRewrite(sentence || details)}
    </div>
  </Banner>
)}

          <fieldset style={{ border: "none", padding: 0, margin: 0 }} disabled={!iAmInitiator}>
            <Field label="One-sentence issue" value={sentence} onChange={setSentence} T={T}
                   placeholder="e.g., I feel hurt when plans change last minute without telling me." />
            <Field label="Details (short)" value={details} onChange={setDetails} T={T} textarea placeholder="Share concise facts + context." />
            {!c.initiatorAcceptedSingleFocus ? (
              <PrimaryButton T={T} disabled={!sentence || !details} onClick={() => update(x => {
                x.issueSentence = sentence.trim(); x.issueDetails = details.trim();
                x.initiatorAcceptedSingleFocus = true; x.hasPromptForRecipient = true;
              })}>Accept single-focus & notify partner</PrimaryButton>
            ) : <div style={{ color: T.success, fontSize: 14 }}>✓ You accepted the single-focus. Waiting for recipient…</div>}
          </fieldset>

          {iAmRecipient && c.initiatorAcceptedSingleFocus && !c.recipientAcceptedSingleFocus && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "8px 0" }}>Review your partner’s issue</h4>
              <ReadBox title="One-sentence issue" value={c.issueSentence || ""} T={T} />
              <ReadBox title="Details" value={c.issueDetails || ""} T={T} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <PrimaryButton T={T} onClick={() => update(x => { x.recipientAcceptedSingleFocus = true; x.hasPromptForRecipient = false; })}>
                  I accept the single-focus
                </PrimaryButton>
              </div>
            </div>
          )}

          {canAdvanceFromQualify() && (
            <div style={{ marginTop: 16 }}>
              <GhostButton T={T} onClick={advanceFromQualify}>Continue</GhostButton>
            </div>
          )}
        </div>
      )}

      {/* STEP 3 – recipient only */}
      {c.step === "RECIPIENT_REVIEW" && iAmRecipient && (
        <div style={{ ...cardStyle(T) }}>
          <h3 style={{ marginTop: 0 }}>Step {currentIndex + 1} – Review Partner’s View (recipient only)</h3>
          <ScriptureInline refText="Philippians 2:4" T={T} />
          <TipChips T={T} styles={myStyles} step="RECIPIENT_REVIEW" role="recipient" />
          <ReadBox title="Partner’s one-sentence issue" value={c.issueSentence || ""} T={T} />
          <ReadBox title="Partner’s details" value={c.issueDetails || ""} T={T} />
          <Field label="Summarize your partner’s view (to their satisfaction)" value={reviewSummary} onChange={setReviewSummary} T={T} textarea />
          <PrimaryButton T={T} disabled={!canCompleteReview()} onClick={completeReview}>Complete Step 3</PrimaryButton>
        </div>
      )}
      {c.step === "RECIPIENT_REVIEW" && iAmInitiator && (<p style={{ color: T.muted }}>Waiting for recipient to complete Step 3.</p>)}

      {/* STEP 4 */}
      {c.step === "QUESTIONS_SELFCRITIQUE" && (
        <div style={{ ...cardStyle(T) }}>
          <h3 style={{ marginTop: 0 }}>Step {currentIndex + 1} – Nonhostile Questions & Self-Critique</h3>
          <TipChips T={T} styles={myStyles} step="QUESTIONS_SELFCRITIQUE" role={iAmInitiator ? "initiator" : "recipient"} />
          {(needsGentleStart(nonhostile) || needsGentleStart(selfCrit)) && (
  <Banner T={T} color={T.accent}>
    Gentle language tip: {gentleTemplate}
    <div style={{ marginTop: 6, fontSize: 12, color: T.muted }}>
      Try rewriting: {suggestGentleRewrite(nonhostile || selfCrit)}
    </div>
  </Banner>
)}
          <Field label="Nonhostile questions" value={nonhostile} onChange={setNonhostile} T={T} textarea />
          <Field label="Self-critique" value={selfCrit} onChange={setSelfCrit} T={T} textarea />
          <Field
  label="What are you protecting? (1 short line)"
  value={myIdentity}
  onChange={setMyIdentity}
  T={T}
  placeholder='e.g., "being a good steward" or "feeling considered"'
/>
{c.bothAnd && <Banner T={T} color={T.accent}>Both/And: {c.bothAnd}</Banner>}
        <PrimaryButton T={T} onClick={completeQuestionsSelf}>Continue to Calm & Prepare</PrimaryButton>
        </div>
      )}

      {/* STEP 5 */}
      {c.step === "CALM_PREPARE" && (
        <div style={{ ...cardStyle(T) }}>
          <h3 style={{ marginTop: 0 }}>Step {currentIndex + 1} – Calm & Prepare</h3>
          <ScriptureInline refText="1 Peter 4:8" T={T} />
          <TipChips T={T} styles={myStyles} step="CALM_PREPARE" role={iAmInitiator ? "initiator" : "recipient"} />
          <CalmPrepare T={T} compact topic={verseTopic} onTopicChange={setVerseTopic} />
          <div style={{ marginTop: 8 }}>
            <AccentButton T={T} onClick={proceedFromCalmPrepare}>Proceed to Schedule</AccentButton>
         </div>
        </div>
      )}

      {/* STEP 6 */}
            {c.step === "SCHEDULE" && (
        <div style={{ ...cardStyle(T) }}>
          <h3 style={{ marginTop: 0 }}>Step {currentIndex + 1} – Schedule</h3>
          <p style={{ color: T.muted, maxWidth: "70ch" }}>
            Initiator proposes; recipient confirms. Add a descriptor like “after dinner”.
          </p>
          <TipChips T={T} styles={myStyles} step="SCHEDULE" role={iAmInitiator ? "initiator" : "recipient"} />
          <fieldset style={{ border: "none", padding: 0 }} disabled={!iAmInitiator}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <FieldRaw label="Date" T={T}>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={inputStyle(T)}
                  aria-label="Proposed date"
                />
              </FieldRaw>
              <FieldRaw label="Time" T={T}>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={inputStyle(T)}
                  aria-label="Proposed time"
                />
              </FieldRaw>
            </div>
            <FieldRaw label='Descriptor (optional, e.g., "after dinner")' T={T}>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder='e.g., "after kids are in bed"'
                style={inputStyle(T)}
                aria-label="Proposed descriptor"
              />
            </FieldRaw>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PrimaryButton T={T} onClick={proposeTime}>Save Proposed Time</PrimaryButton>
              {(date || time || desc) && (
                <GhostButton
                  T={T}
                  onClick={() =>
                    downloadICS({
                      title: "TrueGlue: Conflict Discussion (proposed)",
                      description: `Issue: ${c.issueSentence || ""}\\nDetails: ${c.issueDetails || ""}`,
                      dateISO: date,
                      timeHHMM: time,
                    })
                  }
                >
                  Download .ics (proposed)
                </GhostButton>
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
              <PrimaryButton T={T} onClick={recipientConfirmTime}>Confirm Proposed Time</PrimaryButton>
              <GhostButton T={T} onClick={downloadIcsNow}>Download .ics</GhostButton>
            </div>
          )}

          {c.confirmedDateTimeByRecipient && (
            <div style={{ color: T.success, marginTop: 8 }}>
              ✓ Recipient confirmed. Proceed to Dialogue.
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <GhostButton T={T} onClick={downloadIcsNow}>Download .ics (confirmed)</GhostButton>
                {(c.rescheduleCount ?? 0) < 1 && (
                  <GhostButton T={T} onClick={requestReschedule}>Request one reschedule</GhostButton>
                )}
              </div>
            </div>
          )}
        </div>
      )}

{/* === NEW STEP: Dialogue === */}
{c.step === "DIALOGUE" && (
  <DialogueScaffold
    T={T}
    c={c}
    update={update}
    onComplete={() => update(x => { x.step = "DECISION_REPAIR"; })}
  />
)}

      {/* STEP 7 */}
      {c.step === "DECISION_REPAIR" && (
        <div style={{ ...cardStyle(T) }}>
          <h3 style={{ marginTop: 0 }}>Step {currentIndex + 1} – Decision & Repair</h3>
          <ScriptureInline refText="Colossians 3:13" T={T} />
          <TipChips T={T} styles={myStyles} step="DECISION_REPAIR" role={iAmInitiator ? "initiator" : "recipient"} />
          <FieldRaw label="What kind of change is this?" T={T}>
  {(["personal","relational","structural","cultural"] as AgreementDimension[]).map(k=>(
    <label key={k} style={{ marginRight:12 }}>
      <input type="checkbox" checked={dims.includes(k)} onChange={()=>toggleDim(k)} />{" "}{k}
    </label>
  ))}
</FieldRaw>
          <Field label="Agreements / Decisions" value={decisions} onChange={setDecisions} T={T} textarea />
<Field label="Apologies & Forgiveness" value={apologies} onChange={setApologies} T={T} textarea />
<Field label="Follow-up Plan" value={followUp} onChange={setFollowUp} T={T} textarea />

<div style={{ margin:"6px 0" }}>
  <label>
    <input type="checkbox" checked={fair} onChange={(e)=>setFair(e.target.checked)} />
    {" "}I confirm both voices were heard and costs feel balanced.
  </label>
</div>

<AccentButton T={T} onClick={completeDecisionRepair} disabled={!fair || !decisions.trim()}>
  Mark as Resolved
</AccentButton>
        </div>
      )}

      {/* RESOLVED */}
      {c.step === "RESOLVED" && (
        <div style={{ ...cardStyle(T) }}>
          <h3 style={{ marginTop: 0 }}>Resolved</h3>
          <ResolvedCard c={c} me={me} T={T} editableTestimony onChange={(mut) => update(mut)} />
        </div>
      )}
    </div>
  </div>;
}

function useAutoHeight(open: boolean) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = React.useState<number>(0);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Measure when content or open state changes
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If opening: set to exact scrollHeight, then after transition ends, let it be 'auto'
    if (open) {
      const full = el.scrollHeight;
      setHeight(full);
      setIsAnimating(true);
    } else {
      // If closing: set to current height first (if we were auto), then to 0 in next tick
      const current = el.getBoundingClientRect().height || el.scrollHeight;
      setHeight(current);
      // allow layout to apply current height before collapsing to 0
      requestAnimationFrame(() => {
        setHeight(0);
        setIsAnimating(true);
      });
    }
  }, [open]);

  // If content size changes while open, keep height in sync
  React.useLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const full = el.scrollHeight;
      setHeight(full);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const onTransitionEnd = () => {
    setIsAnimating(false);
    // When open finishes animating, let the container naturally size (height: auto)
    if (open) setHeight(-1); // sentinel meaning "auto"
  };

  // Compute style for the animated wrapper
  const style: React.CSSProperties = {
    overflow: "hidden",
    // we animate both height and opacity/transform for a nicer feel
    height: height < 0 ? "auto" : `${height}px`,
    opacity: open ? 1 : 0,
    transform: open ? "translateY(0)" : "translateY(-4px)",
    transition: isAnimating
      ? "height 280ms ease, opacity 220ms ease, transform 220ms ease"
      : "opacity 0ms linear, transform 0ms linear",
  };

  return { ref, style, onTransitionEnd };
}

function ResolvedCard({
  c, me, T, editableTestimony, onChange, collapsible = true,
}: {
  c: ConflictSession
  me: UserId
  T: Theme
  editableTestimony?: boolean
  onChange?: (mut: (x: ConflictSession) => void) => void
  /** if true, shows a header row with a toggle and hides details until opened */
  collapsible?: boolean
}) {
  const [open, setOpen] = React.useState(!collapsible);
  const [testimony, setTestimony] = React.useState(c.testimonyText ?? "");
  const [vis, setVis] = React.useState<TestimonyVisibility>(c.testimonyVisibility ?? "private");
  const { ref: detailsRef, style: detailsStyle, onTransitionEnd } = useAutoHeight(open);
  const copyRecap = async () => {
    const text = c.recap ?? [
      `Issue: ${c.issueSentence ?? ""}`, `Details: ${c.issueDetails ?? ""}`,
      `Recipient Summary: ${c.recipientReviewSummary ?? ""}`, `Questions: ${c.nonhostileQuestions ?? ""}`,
      `Self-critique: ${c.selfCritique ?? ""}`, `Agreements: ${c.decisionsAgreements ?? ""}`,
      `Apologies & Forgiveness: ${c.apologiesForgiveness ?? ""}`, `Follow-up: ${c.followUpPlan ?? ""}`,
    ].join("\n");
    try { await navigator.clipboard.writeText(text); alert("Recap copied."); }
    catch { alert("Copy failed—select and copy manually."); }
  };

  const scheduled = c.confirmedDateTimeByRecipient ? `${c.proposedDate || ""} ${c.proposedTime || ""} ${c.proposedDescriptor || ""}`.trim() : "—";
  const canSaveTestimony = editableTestimony && testimony.trim().length > 0;

      return (
    <div style={cardStyle(T)}>
      {/* HEADER (always visible) */}
      <div
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : -1}
        aria-expanded={collapsible ? open : undefined}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        onKeyDown={collapsible ? (e) => ((e.key === "Enter" || e.key === " ") && setOpen(o => !o)) : undefined}
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          cursor: collapsible ? "pointer" : "default",
        }}
      >
        <Pill T={T}>Initiator {c.initiator}</Pill>
        <Pill T={T}>Recipient {c.recipient}</Pill>
        <Pill T={T}>Created {fmtDateTime(c.createdAt)}</Pill>
        {c.resolvedAt && <Pill T={T}>Resolved {fmtDateTime(c.resolvedAt)}</Pill>}

        {collapsible && (
          <span style={{ marginLeft: "auto" }}>
            <GhostButton
              T={T}
              onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
            >
              {open ? "Hide details ▲" : "View details ▼"}
            </GhostButton>
          </span>
        )}
      </div>

      {(!collapsible || open) && (
        <div
          ref={detailsRef}
          style={detailsStyle}
          onTransitionEnd={onTransitionEnd}
          aria-hidden={collapsible ? !open : undefined}
        >
          <div style={{ display: "grid", gap: 8, paddingTop: 10 }}>
            <ReadBox title="Issue" value={c.issueSentence || ""} T={T} />
            <ReadBox title="Details" value={c.issueDetails || ""} T={T} />
            <ReadBox title="Recipient Summary" value={c.recipientReviewSummary || ""} T={T} />
            <ReadBox title="Nonhostile Questions" value={c.nonhostileQuestions || ""} T={T} />
            <ReadBox title="Self-Critique" value={c.selfCritique || ""} T={T} />
            <ReadBox title="Scheduled" value={scheduled} T={T} />
            <ReadBox title="Agreements / Decisions" value={c.decisionsAgreements || ""} T={T} />
            <ReadBox title="Apologies & Forgiveness" value={c.apologiesForgiveness || ""} T={T} />
            <ReadBox title="Follow-up Plan" value={c.followUpPlan || ""} T={T} />
            {c.recap && <ReadBox title="Recap" value={c.recap} T={T} />}

            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <GhostButton T={T} onClick={copyRecap}>Copy Recap</GhostButton>
              {(c.proposedDate || c.proposedTime || c.proposedDescriptor) && (
                <GhostButton
                  T={T}
                  onClick={() => downloadICS({
                    title: "TrueGlue: Conflict Discussion",
                    description: `Issue: ${c.issueSentence || ""}\\nDetails: ${c.issueDetails || ""}`,
                    dateISO: c.proposedDate, timeHHMM: c.proposedTime,
                  })}
                >
                  Download .ics
                </GhostButton>
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
                    T={T}
                    textarea
                    placeholder="How did God meet you two through this?"
                  />
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <label style={{ color: T.muted, fontSize: 13, marginRight: 8 }}>Visibility:</label>
                      <select
                        value={vis}
                        onChange={(e) => setVis(e.target.value as TestimonyVisibility)}
                        style={{ border: `1px solid ${T.soft}`, background: "transparent", color: T.text, padding: "8px 10px", borderRadius: 10, outline: "none" }}
                        onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing)}
                        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                      >
                        <option value="private" style={{ color: "black" }}>Private</option>
                        <option value="church" style={{ color: "black" }}>Church only (opt-in)</option>
                        <option value="community" style={{ color: "black" }}>Community (opt-in)</option>
                      </select>
                    </div>
                    <PrimaryButton
                      T={T}
                      disabled={!canSaveTestimony}
                      onClick={() => {
                        onChange?.((x) => { x.testimonyText = testimony.trim(); x.testimonyVisibility = vis; });
                        alert("Testimony saved.");
                      }}
                    >
                      Save Testimony
                    </PrimaryButton>
                    {c.testimonyText && (
                      <GhostButton
                        T={T}
                        onClick={() => { onChange?.((x) => { x.testimonyText = ""; x.testimonyVisibility = "private"; }); }}
                      >
                        Withdraw
                      </GhostButton>
                    )}
                  </div>
                </>
              ) : c.testimonyText ? (
                <ReadBox title={`Testimony (${c.testimonyVisibility || "private"})`} value={c.testimonyText} T={T} />
              ) : (
                <p style={{ color: T.muted, marginTop: 0 }}>No testimony shared.</p>
              )}
            </div>

            <p style={{ color: T.muted, marginTop: 8, marginBottom: 0 }}>
              View-only. Resolved sessions are preserved for reflection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- HELPERS ---------------------------- */
function labelForStep(s: ConflictStep) {
  switch (s) {
    case "QUALIFY": return "Qualification";
    case "RECIPIENT_REVIEW": return "Review Partner’s View";
    case "QUESTIONS_SELFCRITIQUE": return "Questions & Self-Critique";
    case "CALM_PREPARE": return "Calm & Prepare";
    case "SCHEDULE": return "Schedule";
    case "DIALOGUE": return "Dialogue";
    case "DECISION_REPAIR": return "Decision & Repair";
    case "RESOLVED": return "Resolved";
    default: return String(s);
  }
}

/* ------------------------ DEFAULT EXPORT -------------------------- */
/** Owns its own conflicts state; keep it self-contained. */
export default function ConflictWorkflow() {
  const { theme, colors } = useTheme();

  const T: Theme = {
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

  const [activeUser, setActiveUser] = React.useState<UserId>("A");
  const [verseTopic, setVerseTopic] = React.useState<VerseTopic>("unity");
  const [styles] = React.useState<AllStyles>({ A: {}, B: {} }); // wire from your Profile screen later if desired

  const [conflicts, setConflicts] = React.useState<ConflictSession[]>(loadConflicts());
  React.useEffect(() => saveConflicts(conflicts), [conflicts]);

  const myOpen = conflicts.filter(c => c.step !== "RESOLVED" && (c.initiator === activeUser || c.recipient === activeUser));
  const myResolved = conflicts.filter(c => c.step === "RESOLVED" && (c.initiator === activeUser || c.recipient === activeUser));
  const followups = conflicts
    .filter(c => c.step === "RESOLVED" && typeof c.reviewAt === "number" && Date.now() >= (c.reviewAt || 0));

  return (
    <div style={{ color: T.text }}>
      {/* tiny local header controls so this can run inside any app */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <Pill T={T} color={T.accent}>TrueGlue Conflict Workflow</Pill>
        <span style={{ color: T.muted, fontSize: 13 }}>Viewing as</span>
        <select value={activeUser} onChange={(e) => setActiveUser(e.target.value as UserId)}
          style={{ border: `1px solid ${T.soft}`, background: "transparent", color: T.text, padding: "6px 8px", borderRadius: 10 }} >
          <option value="A">A</option><option value="B">B</option>
        </select>
      </div>

      <ConflictsView
        T={T}
        activeUser={activeUser}
        conflicts={conflicts}
        setConflicts={setConflicts}
        myOpen={myOpen}
        myResolved={myResolved}
        userStyles={styles}
        verseTopic={verseTopic}
        setVerseTopic={setVerseTopic}
      />
    </div>
  );
}
