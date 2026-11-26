// ============================================================================
// ShiftNote AU - Deterministic Transcript Field Extraction (offline fallback)
// Pulls shift date, start/end times, duration, travel KMs, support category and
// public holiday flag out of a post-shift voice transcript so the claim matches
// what the worker actually dictated.
// ============================================================================

import type { SupportCategory } from "./types";

export interface TranscriptShiftDetails {
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationHours: number;
  kmTravelled: number;
  supportCategory: SupportCategory;
  isPublicHoliday: boolean;
  /** Which fields were read from the transcript (vs. defaulted). */
  detected: {
    date: boolean;
    times: boolean;
    duration: boolean;
    km: boolean;
  };
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

const pad2 = (n: number) => String(n).padStart(2, "0");

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** Returns the local calendar date (YYYY-MM-DD) of a Date, not the UTC date. */
export function toLocalYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseShiftDate(text: string, referenceDate: string): string | null {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso && isValidYmd(+iso[1]!, +iso[2]!, +iso[3]!)) return iso[0];

  const refYear = Number(referenceDate.slice(0, 4));
  const monthNames = Object.keys(MONTHS).join("|");

  // "2nd of November 2026", "2 November", "2nd Nov, 2026"
  const dmy = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})\\b\\.?,?(?:\\s+(\\d{4}))?`,
    "i"
  ).exec(text);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = MONTHS[dmy[2]!.toLowerCase()]!;
    const y = dmy[3] ? Number(dmy[3]) : refYear;
    if (isValidYmd(y, m, d)) return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // "November 2nd, 2026", "Nov 2"
  const mdy = new RegExp(
    `\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b,?(?:\\s+(\\d{4}))?`,
    "i"
  ).exec(text);
  if (mdy) {
    const m = MONTHS[mdy[1]!.toLowerCase()]!;
    const d = Number(mdy[2]);
    const y = mdy[3] ? Number(mdy[3]) : refYear;
    if (isValidYmd(y, m, d)) return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  if (/\byesterday\b/i.test(text)) return shiftYmd(referenceDate, -1);
  if (/\btoday\b|\btonight\b|\bthis (?:morning|afternoon|evening)\b/i.test(text)) {
    return referenceDate;
  }
  return null;
}

interface RawTime {
  hour: number;
  minute: number;
  meridiem: "am" | "pm" | null;
}

function toRawTime(h: string, m: string | undefined, mer: string | undefined): RawTime | null {
  const hour = Number(h);
  const minute = m ? Number(m) : 0;
  if (minute > 59) return null;
  const meridiem = mer ? (mer.toLowerCase().startsWith("p") ? "pm" : "am") : null;
  if (meridiem ? hour < 1 || hour > 12 : hour > 23) return null;
  return { hour, minute, meridiem };
}

function to24h(t: RawTime, meridiem: "am" | "pm" | null): number {
  let h = t.hour;
  if (meridiem === "pm" && h < 12) h += 12;
  if (meridiem === "am" && h === 12) h = 0;
  return h * 60 + t.minute;
}

const minsToHhmm = (mins: number) => {
  const norm = ((mins % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(norm / 60))}:${pad2(norm % 60)}`;
};

export function parseTimeRange(text: string): { startTime: string; endTime: string } | null {
  const time = String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?`;
  const re = new RegExp(
    String.raw`(?:\bfrom\s+|\bbetween\s+|\b)${time}\s*(?:to|until|till|and|-|–|—)\s*${time}`,
    "gi"
  );
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = toRawTime(match[1]!, match[2], match[3]);
    const end = toRawTime(match[4]!, match[5], match[6]);
    if (!start || !end) continue;
    // Require a real clock signal so "2 to 3 hours" or "5-10 km" isn't read as a time.
    const hasSignal =
      Boolean(start.meridiem || end.meridiem) || (match[2] !== undefined && match[5] !== undefined);
    if (!hasSignal) continue;
    const after = text.slice(re.lastIndex, re.lastIndex + 12);
    if (/^\s*(?:km|kilomet|hours?|hrs?|mins?|minutes?)\b/i.test(after)) continue;

    const endMer = end.meridiem;
    let startMer = start.meridiem;
    if (!startMer && endMer) {
      // "9 to 12pm" -> 9am; "6 to 8pm" -> 6pm. Pick the reading that keeps start before end.
      const sameMer = to24h(start, endMer);
      startMer = sameMer < to24h(end, endMer) ? endMer : endMer === "pm" ? "am" : "pm";
    }
    const endFinal = endMer ?? startMer;
    return {
      startTime: minsToHhmm(to24h(start, startMer)),
      endTime: minsToHhmm(to24h(end, endFinal)),
    };
  }
  return null;
}

export function parseDurationHours(text: string): number | null {
  const numWords = Object.keys(WORD_NUMBERS).join("|");
  const re = new RegExp(
    `\\b(\\d+(?:\\.\\d+)?|${numWords})(\\s+and\\s+a\\s+half)?[-\\s]+(?:hours?|hrs?)\\b`,
    "i"
  );
  const m = re.exec(text);
  if (!m) return null;
  const raw = m[1]!.toLowerCase();
  const base = WORD_NUMBERS[raw] ?? Number(raw);
  const hours = base + (m[2] ? 0.5 : 0);
  return hours > 0 && hours <= 24 ? hours : null;
}

export function parseKilometres(text: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*(?:km|kms|kilomet(?:re|er)s?)\b/i.exec(text);
  return m ? Number(m[1]) : null;
}

export function detectSupportCategory(text: string): SupportCategory {
  return /self[- ]?care|shower|personal care|medication|dressing|hygiene/i.test(text)
    ? "self_care"
    : "community_access";
}

export function extractShiftDetails(text: string, referenceDate: string): TranscriptShiftDetails {
  const supportCategory = detectSupportCategory(text);
  const parsedDate = parseShiftDate(text, referenceDate);
  const range = parseTimeRange(text);
  const spokenDuration = parseDurationHours(text);
  const km = parseKilometres(text);

  let startTime: string;
  let endTime: string;
  let durationHours: number;

  if (range) {
    startTime = range.startTime;
    endTime = range.endTime;
    const [sh, sm] = startTime.split(":").map(Number) as [number, number];
    const [eh, em] = endTime.split(":").map(Number) as [number, number];
    let diff = eh * 60 + em - (sh * 60 + sm);
    if (diff <= 0) diff += 1440;
    durationHours = Math.round((diff / 60) * 100) / 100;
  } else {
    // No clock times dictated: keep the legacy defaults, but honour a spoken duration.
    startTime = supportCategory === "self_care" ? "18:30" : "09:00";
    durationHours = spokenDuration ?? (supportCategory === "self_care" ? 2 : 3);
    const [sh, sm] = startTime.split(":").map(Number) as [number, number];
    endTime = minsToHhmm(sh * 60 + sm + Math.round(durationHours * 60));
  }

  return {
    shiftDate: parsedDate ?? referenceDate,
    startTime,
    endTime,
    durationHours,
    // Never invent billable travel: no KMs dictated means no travel line item.
    kmTravelled: km ?? 0,
    supportCategory,
    isPublicHoliday: /public holiday/i.test(text),
    detected: {
      date: parsedDate !== null,
      times: range !== null,
      duration: range !== null || spokenDuration !== null,
      km: km !== null,
    },
  };
}
