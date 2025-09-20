import React from "react";
import { TG_COLORS } from "../theme";

function PillButton({ children, onClick, kind = "outline", disabled = false }: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "outline" | "solid";
  disabled?: boolean;
}) {
 
  const pillStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${TG_COLORS.border}`,
    background: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
  };
  const base = { ...pillStyle };
  const solid = {
    ...pillStyle,
    background: TG_COLORS.primary,
    color: "#fff",
    borderColor: TG_COLORS.primary,
  };
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={kind === "solid" ? solid : base}
    >
      {children}
    </button>
  );
}


/* ===================== TYPES ===================== */
export type UserId = "A" | "B";
export type ConflictStep =
  | "QUALIFY"
  | "RECIPIENT_REVIEW"
  | "QUESTIONS_SELFCRITIQUE"
  | "CALM_PREPARE"
  | "SCHEDULE"
  | "DECISION_REPAIR"
  | "RESOLVED";

export type TestimonyVisibility = "private" | "church" | "community";

export type ConflictSession = {
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

/* ===================== PERSISTENCE (localStorage MVP) ===================== */
const LS_CONFLICTS = "trueglue_conflicts_v5";
const loadConflicts = (): ConflictSession[] =>
  JSON.parse(localStorage.getItem(LS_CONFLICTS) || "[]");
const saveConflicts = (items: ConflictSession[]) =>
  localStorage.setItem(LS_CONFLICTS, JSON.stringify(items));

/* ===================== UTILITIES ===================== */
const uid = () => Math.random().toString(36).slice(2);
const fmtDateTime = (d: number) =>
  new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// “Gentle start” guard
const roughPhrases = [
  /you always/i,
  /you never/i,
  /whatever/i,
  /shut up/i,
  /that’s stupid/i,
  /that's stupid/i,
  /as usual/i,
  /everyone knows/i,
  /obviously/i,
];
const needsGentleStart = (text: string) =>
  !!text && roughPhrases.some((r) => r.test(text));
const gentleTemplate =
  'Try: "I feel ⟨emotion⟩ when ⟨specific event⟩ because ⟨impact⟩. I need ⟨clear ask⟩."';

// iCalendar (.ics) helpers
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
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}
function escapeICS(s: string) {
  return (s || "")
    .replace(/[\n\r]/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
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
  const dtStart = dateISO
    ? formatICSDateLocal(dateISO, timeHHMM || "09:00")
    : "";
  const dtEnd = dateISO
    ? formatICSDateLocal(dateISO, timeHHMM ? addMinutes(timeHHMM, 45) : "09:45")
    : "";
  const body = `BEGIN:VCALENDAR
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
  a.href = url;
  a.download = "trueglue-conflict.ics";
  a.click();
  URL.revokeObjectURL(url);
}

/* ===================== UI: CALM ===================== */
function CalmPrepare({ onProceed }: { onProceed: () => void }) {
  return (
    <div style={{ padding: 8 }}>
      <p>Pause to breathe and pray before writing or responding.</p>
      <button onClick={onProceed}>Proceed</button>
    </div>
  );
}

/* ===================== UI: ONE SESSION CARD (STATE MACHINE) ===================== */
function ConflictCard({
  c,
  me,
  setConflicts,
}: {
  c: ConflictSession;
  me: UserId;
  setConflicts: React.Dispatch<React.SetStateAction<ConflictSession[]>>;
}) {
  const iAmInitiator = c.initiator === me;
  const iAmRecipient = c.recipient === me;

  // local draft state
  const [sentence, setSentence] = React.useState(c.issueSentence ?? "");
  const [details, setDetails] = React.useState(c.issueDetails ?? "");
  const [reviewSummary, setReviewSummary] = React.useState(
    c.recipientReviewSummary ?? ""
  );
  const [nonhostile, setNonhostile] = React.useState(
    c.nonhostileQuestions ?? ""
  );
  const [selfCrit, setSelfCrit] = React.useState(c.selfCritique ?? "");
  const [date, setDate] = React.useState(c.proposedDate ?? "");
  const [time, setTime] = React.useState(c.proposedTime ?? "");
  const [desc, setDesc] = React.useState(c.proposedDescriptor ?? "");
  const [decisions, setDecisions] = React.useState(c.decisionsAgreements ?? "");
  const [apologies, setApologies] = React.useState(
    c.apologiesForgiveness ?? ""
  );
  const [followUp, setFollowUp] = React.useState(c.followUpPlan ?? "");

  function update(mutator: (x: ConflictSession) => void) {
    setConflicts((arr) =>
      arr.map((s) =>
        s.id === c.id
          ? (() => {
              const copy = { ...s };
              mutator(copy);
              return copy;
            })()
          : s
      )
    );
  }

  const canAdvanceFromQualify = () =>
    !!c.issueSentence &&
    !!c.issueDetails &&
    !!c.initiatorAcceptedSingleFocus &&
    !!c.recipientAcceptedSingleFocus;

  function advanceFromQualify() {
    if (!canAdvanceFromQualify()) return;
    update((x) => {
      x.step = "RECIPIENT_REVIEW";
      x.hasPromptForInitiator = true;
    });
  }

  function completeReview() {
    if (!reviewSummary.trim()) return;
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
      x.hasPromptForInitiator = true;
    });
  }

  function makeRecap() {
    const scheduled = c.confirmedDateTimeByRecipient
      ? `${c.proposedDate || ""} ${c.proposedTime || ""} ${
          c.proposedDescriptor || ""
        }`.trim()
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

  return (
    <div style={{ border: "1px solid #E6E6EA", borderRadius: 12, padding: 12, margin: "10px 0" }}>
      <div style={{ fontSize: 12, opacity: 0.8, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span>Session #{c.id.slice(0, 6)}</span>
        <span>Initiator: {c.initiator}</span>
        <span>Recipient: {c.recipient}</span>
        <span>Started {fmtDateTime(c.createdAt)}</span>
      </div>

      {c.step === "QUALIFY" && (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {needsGentleStart(details) || needsGentleStart(sentence) ? (
            <div style={{ background: "#fff9e6", padding: 8, borderRadius: 8 }}>
              Gentle start tip: {gentleTemplate}
            </div>
          ) : null}

          {iAmInitiator && !c.initiatorAcceptedSingleFocus && (
            <>
              <input
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="One-sentence issue"
              />
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Short details"
              />
              <button
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
              </button>
            </>
          )}

          {iAmRecipient &&
            c.initiatorAcceptedSingleFocus &&
            !c.recipientAcceptedSingleFocus && (
              <button
                onClick={() =>
                  update((x) => {
                    x.recipientAcceptedSingleFocus = true;
                    x.hasPromptForRecipient = false;
                  })
                }
              >
                I accept the single-focus
              </button>
            )}

          {canAdvanceFromQualify() && (
            <button onClick={advanceFromQualify}>Continue to Step 3</button>
          )}
        </div>
      )}

      {c.step === "RECIPIENT_REVIEW" && iAmRecipient && (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <textarea
            value={reviewSummary}
            onChange={(e) => setReviewSummary(e.target.value)}
            placeholder="Summarize partner’s view"
          />
          <button disabled={!reviewSummary.trim()} onClick={completeReview}>
            Complete Step 3
          </button>
        </div>
      )}

      {c.step === "QUESTIONS_SELFCRITIQUE" && (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {needsGentleStart(nonhostile) || needsGentleStart(selfCrit) ? (
            <div style={{ background: "#fff9e6", padding: 8, borderRadius: 8 }}>
              Gentle language tip: {gentleTemplate}
            </div>
          ) : null}
          <textarea
            value={nonhostile}
            onChange={(e) => setNonhostile(e.target.value)}
            placeholder="Nonhostile questions"
          />
          <textarea
            value={selfCrit}
            onChange={(e) => setSelfCrit(e.target.value)}
            placeholder="Self-critique"
          />
          <button onClick={completeQuestionsSelf}>Continue to Calm & Prepare</button>
        </div>
      )}

      {c.step === "CALM_PREPARE" && (
        <div style={{ marginTop: 8 }}>
          <CalmPrepare onProceed={proceedFromCalmPrepare} />
        </div>
      )}

      {c.step === "SCHEDULE" && (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {iAmInitiator && (
            <>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder='Descriptor (e.g. "after dinner")'
              />
              <button onClick={proposeTime}>Save Proposed Time</button>
              {(date || time || desc) && (
                <button
                  onClick={() =>
                    downloadICS({
                      title: "TrueGlue: Conflict Discussion (proposed)",
                      description: `Issue: ${c.issueSentence || ""}\nDetails: ${c.issueDetails || ""}`,
                      dateISO: date,
                      timeHHMM: time,
                    })
                  }
                >
                  Download .ics (proposed)
                </button>
              )}
            </>
          )}

          {iAmRecipient &&
            (c.proposedDate || c.proposedTime || c.proposedDescriptor) &&
            !c.confirmedDateTimeByRecipient && (
              <>
                <button onClick={recipientConfirmTime}>Confirm Proposed Time</button>
                <button
                  onClick={() =>
                    downloadICS({
                      title: "TrueGlue: Conflict Discussion",
                      description: `Issue: ${c.issueSentence || ""}\nDetails: ${c.issueDetails || ""}`,
                      dateISO: c.proposedDate,
                      timeHHMM: c.proposedTime,
                    })
                  }
                >
                  Download .ics
                </button>
              </>
            )}

          {c.confirmedDateTimeByRecipient && (
            <>
              <div>✓ Confirmed. Proceed to Decision & Repair.</div>
              {(c.rescheduleCount ?? 0) < 1 && (
                <button onClick={requestReschedule}>Request one reschedule</button>
              )}
            </>
          )}
        </div>
      )}

      {c.step === "DECISION_REPAIR" && (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <textarea
            value={decisions}
            onChange={(e) => setDecisions(e.target.value)}
            placeholder="Agreements / Decisions"
          />
          <textarea
            value={apologies}
            onChange={(e) => setApologies(e.target.value)}
            placeholder="Apologies & Forgiveness"
          />
          <textarea
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="Follow-up Plan"
          />
          <button onClick={completeDecisionRepair}>Mark as Resolved</button>
        </div>
      )}
    </div>
  );
}

/* ===================== UI: RESOLVED CARD ===================== */
function ResolvedCard({ c }: { c: ConflictSession }) {
  const copyRecap = async () => {
    const text =
      c.recap ||
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
      alert("Copy failed — select and copy manually.");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
      <PillButton onClick={copyRecap}>Copy Recap</PillButton>
      {(c.proposedDate || c.proposedTime || c.proposedDescriptor) && (
        <PillButton
          onClick={() =>
            downloadICS({
              title: "TrueGlue: Conflict Discussion",
              description: `Issue: ${c.issueSentence || ""}\nDetails: ${c.issueDetails || ""}`,
              dateISO: c.proposedDate,
              timeHHMM: c.proposedTime,
            })
          }
        >
          Download .ics
        </PillButton>
      )}
    </div>
  );
}

/* ===================== UI: CONFLICTS VIEW (LIST + CREATE) ===================== */
function ConflictsView({
  activeUser,
  conflicts,
  setConflicts,
}: {
  activeUser: UserId;
  conflicts: ConflictSession[];
  setConflicts: React.Dispatch<React.SetStateAction<ConflictSession[]>>;
}) {
  const myOpen = conflicts.filter(
    (c) =>
      c.step !== "RESOLVED" &&
      (c.initiator === activeUser || c.recipient === activeUser)
  );
  const myResolved = conflicts.filter(
    (c) =>
      c.step === "RESOLVED" &&
      (c.initiator === activeUser || c.recipient === activeUser)
  );
  const [showCalm, setShowCalm] = React.useState(false);

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

  return (
    <div>
      {showCalm && <CalmPrepare onProceed={actuallyCreate} />}

      <div style={{ marginBottom: 8 }}>
        <PillButton kind="solid" onClick={startNew}>+ Start Conflict</PillButton>
      </div>

      <h3>Open</h3>
      {myOpen.length === 0 && <div>No open sessions.</div>}
      {myOpen.map((c) => (
        <ConflictCard key={c.id} c={c} me={activeUser} setConflicts={setConflicts} />
      ))}

      <h3>Resolved</h3>
      {myResolved.length === 0 && <div>No resolved sessions yet.</div>}
      {myResolved.map((c) => (
        <ResolvedCard key={c.id} c={c} />
      ))}
    </div>
  );
}

/* ===================== DEFAULT EXPORT: PAGE WRAPPER ===================== */
/**
 * This component owns the conflicts array and persists it.
 * Replace the activeUser state with your real auth later.
 */
export default function ConflictWorkflow() {
  const [conflicts, setConflicts] = React.useState<ConflictSession[]>(loadConflicts());
  React.useEffect(() => saveConflicts(conflicts), [conflicts]);

  // TEMP: viewer toggle until you wire actual users
  const [activeUser, setActiveUser] = React.useState<UserId>("A");

  return (
    <div>
      <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Viewing as</span>
        <select
          value={activeUser}
          onChange={(e) => setActiveUser(e.target.value as UserId)}
          aria-label="Select active user"
        >
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
      </div>

      <ConflictsView
        activeUser={activeUser}
        conflicts={conflicts}
        setConflicts={setConflicts}
      />
    </div>
  );
}
