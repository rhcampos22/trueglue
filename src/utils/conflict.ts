// src/utils/conflict.ts
export type UserId = "A" | "B";
export type ConflictStep =
  | "QUALIFY" | "RECIPIENT_REVIEW" | "QUESTIONS_SELFCRITIQUE"
  | "CALM_PREPARE" | "SCHEDULE" | "DECISION_REPAIR" | "RESOLVED";

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
  rescheduleCount?: number;
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

// LocalStorage helpers (MVP persistence)
const LS_CONFLICTS = "trueglue_conflicts_v5";
export const loadConflicts = (): ConflictSession[] =>
  JSON.parse(localStorage.getItem(LS_CONFLICTS) || "[]");
export const saveConflicts = (items: ConflictSession[]) =>
  localStorage.setItem(LS_CONFLICTS, JSON.stringify(items));

// Presentation helpers
export const fmtDateTime = (d: number) =>
  new Date(d).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

// Gentle-start language
const roughPhrases = [
  /you always/i, /you never/i, /whatever/i, /shut up/i, /that’s stupid/i, /that's stupid/i, /as usual/i,
  /everyone knows/i, /obviously/i,
];
export const needsGentleStart = (text: string) => !!text && roughPhrases.some((r) => r.test(text));
export const gentleTemplate =
  'Try: "I feel ⟨emotion⟩ when ⟨specific event⟩ because ⟨impact⟩. I need ⟨clear ask⟩."';

// iCalendar helpers (with UTC + DTSTAMP for better TZ behavior)
function escapeICS(s: string) {
  return (s || "").replace(/[\n\r]/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function toUTCStamp(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}
export function downloadICS({
  title, description, dateISO, timeHHMM,
}: { title: string; description: string; dateISO?: string; timeHHMM?: string }) {
  let dtStartZ = "", dtEndZ = "";
  if (dateISO) {
    const [h, m] = (timeHHMM || "09:00").split(":").map(Number);
    const start = new Date(dateISO);
    start.setHours(h, m ?? 0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000);
    dtStartZ = toUTCStamp(start);
    dtEndZ = toUTCStamp(end);
  }
  const body =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TrueGlue//Conflict Meeting//EN
BEGIN:VEVENT
UID:${crypto?.randomUUID?.() ?? String(Math.random()).slice(2)}
DTSTAMP:${toUTCStamp(new Date())}
SUMMARY:${escapeICS(title)}
DESCRIPTION:${escapeICS(description)}
${dateISO ? `DTSTART:${dtStartZ}` : ""}
${dateISO ? `DTEND:${dtEndZ}` : ""}
END:VEVENT
END:VCALENDAR`;
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "trueglue-conflict.ics"; a.click();
  URL.revokeObjectURL(url);
}
