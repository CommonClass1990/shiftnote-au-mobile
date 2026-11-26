// ============================================================================
// ShiftNote AU - Deterministic NDIS Pricing Arrangements & Price Limits Engine
// ============================================================================
// Strictly enforces NDIS Core Supports item codes, price caps, day/time bracket
// resolution, and Plan Manager OCR invoice formatting.
// ============================================================================

import type {
  AllowedNdisCode,
  InvoiceLineItem,
  SupportCategory,
  TimeBracket,
} from "./types";

export interface NdisCatalogueItem {
  code: AllowedNdisCode;
  name: string;
  registrationGroup: string;
  supportCategory: SupportCategory;
  timeBracket: TimeBracket | "travel_km";
  unit: "H" | "KM";
  priceCapAud: number;
}

export const ALLOWED_NDIS_CODES: readonly AllowedNdisCode[] = [
  "01_011_0107_1_1",
  "01_012_0107_1_1",
  "01_013_0107_1_1",
  "01_014_0107_1_1",
  "01_015_0107_1_1",
  "04_102_0125_6_1",
  "04_103_0125_6_1",
  "04_104_0125_6_1",
  "04_105_0125_6_1",
  "04_106_0125_6_1",
  "01_799_0107_1_1",
  "04_799_0125_6_1",
] as const;

/**
 * Deterministic NDIS Core Supports Lookup Table.
 * `priceCapAud` holds the current national maximum amounts from the
 * NDIS Pricing Schedule 2026-27 (effective 1 July 2026, reconfirmed in the
 * schedule effective 24 September 2026). Shifts delivered before 1 July 2026
 * are capped using PRICE_CAPS_2025_26 below (see getPriceCapForDate).
 * Never allow any AI model or client payload to use codes outside this table.
 */
export const NDIS_CATALOGUE: Record<AllowedNdisCode, NdisCatalogueItem> = {
  // --------------------------------------------------------------------------
  // Category 01: Assistance with Daily Life (Self-Care Activities - Standard)
  // --------------------------------------------------------------------------
  "01_011_0107_1_1": {
    code: "01_011_0107_1_1",
    name: "Assistance With Self-Care Activities - Standard - Weekday Daytime",
    registrationGroup: "0107 Daily Personal Activities",
    supportCategory: "self_care",
    timeBracket: "weekday_daytime",
    unit: "H",
    priceCapAud: 73.58,
  },
  "01_015_0107_1_1": {
    code: "01_015_0107_1_1",
    name: "Assistance With Self-Care Activities - Standard - Weekday Evening",
    registrationGroup: "0107 Daily Personal Activities",
    supportCategory: "self_care",
    timeBracket: "weekday_evening",
    unit: "H",
    priceCapAud: 81.07,
  },
  "01_013_0107_1_1": {
    code: "01_013_0107_1_1",
    name: "Assistance With Self-Care Activities - Standard - Saturday",
    registrationGroup: "0107 Daily Personal Activities",
    supportCategory: "self_care",
    timeBracket: "saturday",
    unit: "H",
    priceCapAud: 103.54,
  },
  "01_014_0107_1_1": {
    code: "01_014_0107_1_1",
    name: "Assistance With Self-Care Activities - Standard - Sunday",
    registrationGroup: "0107 Daily Personal Activities",
    supportCategory: "self_care",
    timeBracket: "sunday",
    unit: "H",
    priceCapAud: 133.50,
  },
  "01_012_0107_1_1": {
    code: "01_012_0107_1_1",
    name: "Assistance With Self-Care Activities - Standard - Public Holiday",
    registrationGroup: "0107 Daily Personal Activities",
    supportCategory: "self_care",
    timeBracket: "public_holiday",
    unit: "H",
    priceCapAud: 163.46,
  },

  // --------------------------------------------------------------------------
  // Category 04: Assistance with Social, Economic and Community Participation
  // --------------------------------------------------------------------------
  "04_104_0125_6_1": {
    code: "04_104_0125_6_1",
    name: "Access Community Social and Rec Activ - Standard - Weekday Daytime",
    registrationGroup: "0125 Participation in Community, Social and Civic Activities",
    supportCategory: "community_access",
    timeBracket: "weekday_daytime",
    unit: "H",
    priceCapAud: 73.58,
  },
  "04_103_0125_6_1": {
    code: "04_103_0125_6_1",
    name: "Access Community Social and Rec Activ - Standard - Weekday Evening",
    registrationGroup: "0125 Participation in Community, Social and Civic Activities",
    supportCategory: "community_access",
    timeBracket: "weekday_evening",
    unit: "H",
    priceCapAud: 81.07,
  },
  "04_105_0125_6_1": {
    code: "04_105_0125_6_1",
    name: "Access Community Social and Rec Activ - Standard - Saturday",
    registrationGroup: "0125 Participation in Community, Social and Civic Activities",
    supportCategory: "community_access",
    timeBracket: "saturday",
    unit: "H",
    priceCapAud: 103.54,
  },
  "04_106_0125_6_1": {
    code: "04_106_0125_6_1",
    name: "Access Community Social and Rec Activ - Standard - Sunday",
    registrationGroup: "0125 Participation in Community, Social and Civic Activities",
    supportCategory: "community_access",
    timeBracket: "sunday",
    unit: "H",
    priceCapAud: 133.50,
  },
  "04_102_0125_6_1": {
    code: "04_102_0125_6_1",
    name: "Access Community Social and Rec Activ - Standard - Public Holiday",
    registrationGroup: "0125 Participation in Community, Social and Civic Activities",
    supportCategory: "community_access",
    timeBracket: "public_holiday",
    unit: "H",
    priceCapAud: 163.46,
  },

  // --------------------------------------------------------------------------
  // Provider Travel - Non-Labour Costs (Kilometres)
  // --------------------------------------------------------------------------
  "01_799_0107_1_1": {
    code: "01_799_0107_1_1",
    name: "Provider travel - non-labour costs (Daily Personal Activities)",
    registrationGroup: "0107 Daily Personal Activities",
    supportCategory: "self_care",
    timeBracket: "travel_km",
    unit: "KM",
    priceCapAud: 0.99,
  },
  "04_799_0125_6_1": {
    code: "04_799_0125_6_1",
    name: "Provider travel - non-labour costs (Community Access)",
    registrationGroup: "0125 Participation in Community, Social and Civic Activities",
    supportCategory: "community_access",
    timeBracket: "travel_km",
    unit: "KM",
    priceCapAud: 0.99,
  },
};

/**
 * National maximum amounts from the NDIS Pricing Arrangements and Price Limits
 * 2025-26, applied to shifts delivered from 1 July 2025 to 30 June 2026.
 */
export const PRICE_CAPS_2025_26: Readonly<Record<AllowedNdisCode, number>> = {
  "01_011_0107_1_1": 70.23,
  "01_015_0107_1_1": 77.38,
  "01_013_0107_1_1": 98.83,
  "01_014_0107_1_1": 127.43,
  "01_012_0107_1_1": 156.03,
  "04_104_0125_6_1": 70.23,
  "04_103_0125_6_1": 77.38,
  "04_105_0125_6_1": 98.83,
  "04_106_0125_6_1": 127.43,
  "04_102_0125_6_1": 156.03,
  "01_799_0107_1_1": 0.99,
  "04_799_0125_6_1": 0.99,
};

/** First shift date (inclusive) that the current `priceCapAud` values apply to. */
export const CURRENT_PRICE_CAPS_EFFECTIVE_FROM = "2026-07-01";

/**
 * Returns the national price cap for a code on a given shift date (YYYY-MM-DD).
 * Without a date, the current (2026-27) cap is returned.
 */
export function getPriceCapForDate(code: AllowedNdisCode, shiftDate?: string): number {
  const item = NDIS_CATALOGUE[code];
  if (!item) {
    throw new Error(`NDIS code "${code}" is not in the approved deterministic catalogue.`);
  }
  if (shiftDate && shiftDate < CURRENT_PRICE_CAPS_EFFECTIVE_FROM) {
    return PRICE_CAPS_2025_26[code];
  }
  return item.priceCapAud;
}

/**
 * National & NSW Statutory Public Holidays (YYYY-MM-DD) for deterministic auto-detection
 */
export const AUSTRALIAN_PUBLIC_HOLIDAYS: ReadonlySet<string> = new Set([
  "2025-01-01", // New Year's Day
  "2025-01-27", // Australia Day Observed
  "2025-04-18", // Good Friday
  "2025-04-19", // Easter Saturday
  "2025-04-20", // Easter Sunday
  "2025-04-21", // Easter Monday
  "2025-04-25", // Anzac Day
  "2025-06-09", // King's Birthday
  "2025-10-06", // Labour Day (NSW/ACT/SA)
  "2025-12-25", // Christmas Day
  "2025-12-26", // Boxing Day
  "2026-01-01", // New Year's Day
  "2026-01-26", // Australia Day
  "2026-04-03", // Good Friday
  "2026-04-04", // Easter Saturday
  "2026-04-05", // Easter Sunday
  "2026-04-06", // Easter Monday
  "2026-04-25", // Anzac Day
  "2026-04-27", // Anzac Day Additional Day (NSW)
  "2026-06-08", // King's Birthday
  "2026-10-05", // Labour Day (NSW/ACT/SA)
  "2026-12-25", // Christmas Day
  "2026-12-26", // Boxing Day
  "2026-12-28", // Boxing Day Additional Day
  "2027-01-01", // New Year's Day
  "2027-01-26", // Australia Day
  "2027-03-26", // Good Friday
  "2027-03-27", // Easter Saturday
  "2027-03-28", // Easter Sunday
  "2027-03-29", // Easter Monday
  "2027-04-25", // Anzac Day
  "2027-04-26", // Anzac Day Additional Day (NSW)
  "2027-06-14", // King's Birthday
  "2027-10-04", // Labour Day (NSW/ACT/SA)
  "2027-12-25", // Christmas Day
  "2027-12-26", // Boxing Day
  "2027-12-27", // Christmas Day Additional Day
  "2027-12-28", // Boxing Day Additional Day
]);

/**
 * Type guard verifying whether a string is a valid AllowedNdisCode in the catalogue.
 */
export function isValidNdisCode(code: string): code is AllowedNdisCode {
  return Object.prototype.hasOwnProperty.call(NDIS_CATALOGUE, code);
}

/**
 * Parses "HH:mm" into total minutes from midnight (0 - 1439).
 */
export function parseTimeMinutes(hhmm: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!match) {
    throw new Error(`Invalid 24-hour time format "${hhmm}". Expected HH:mm.`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

/**
 * Calculates shift duration in decimal hours rounded to 2 decimal places.
 * Handles overnight shifts where end_time < start_time.
 */
export function calculateDurationHours(startTime: string, endTime: string): number {
  const startMins = parseTimeMinutes(startTime);
  const endMins = parseTimeMinutes(endTime);
  let diffMins = endMins - startMins;
  if (diffMins <= 0) {
    diffMins += 24 * 60;
  }
  return Math.round((diffMins / 60) * 100) / 100;
}

/**
 * Resolves the NDIS Pricing Arrangements day/time bracket from shift_date,
 * start_time, end_time, and public holiday flag.
 *
 * NDIS Rules (Pricing Arrangements 2025-26 / Pricing Schedule 2026-27):
 * - Public Holiday overrides all days.
 * - Sunday -> "sunday"
 * - Saturday -> "saturday"
 * - Weekday (Mon-Fri):
 *   - Weekday Daytime: starts at or after 06:00 and ends at or before 20:00.
 *   - Weekday Evening: starts at or after 20:00 and finishes at or before midnight.
 *   - A support that crosses from daytime into the evening and is delivered by
 *     a single worker is charged at the higher (evening) rate for the whole
 *     support, so any weekday shift finishing after 20:00 is "weekday_evening".
 *   - Shifts that cross midnight or start before 06:00 are Weekday Night
 *     supports. Night items are not in this catalogue yet, so they currently
 *     resolve to "weekday_evening" (the nearest lower rate) rather than being
 *     overcharged.
 */
export function resolveTimeBracket(
  shiftDate: string,
  startTime: string,
  endTime: string,
  isPublicHolidayOverride = false
): TimeBracket {
  if (isPublicHolidayOverride || AUSTRALIAN_PUBLIC_HOLIDAYS.has(shiftDate)) {
    return "public_holiday";
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(shiftDate.trim());
  if (!dateMatch) {
    throw new Error(`Invalid shift_date "${shiftDate}". Expected YYYY-MM-DD.`);
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const utcDate = new Date(Date.UTC(year, month, day));
  const dayOfWeek = utcDate.getUTCDay(); // 0 = Sunday, 6 = Saturday

  if (dayOfWeek === 0) {
    return "sunday";
  }
  if (dayOfWeek === 6) {
    return "saturday";
  }

  const startMins = parseTimeMinutes(startTime);
  const endMins = parseTimeMinutes(endTime);

  // Weekday Evening applies if the shift finishes after 20:00, starts at/after 20:00,
  // or crosses midnight (endMins <= startMins). Starting at 18:00 alone is still daytime.
  if (endMins > 20 * 60 || startMins >= 20 * 60 || endMins <= startMins) {
    return "weekday_evening";
  }

  return "weekday_daytime";
}

/**
 * Deterministically resolves the exact 15-character NDIS Support Item Code
 * given the support category and day/time bracket.
 */
export function resolveSupportItemCode(
  category: SupportCategory,
  bracket: TimeBracket
): AllowedNdisCode {
  if (category === "self_care") {
    switch (bracket) {
      case "weekday_daytime":
        return "01_011_0107_1_1";
      case "weekday_evening":
        return "01_015_0107_1_1";
      case "saturday":
        return "01_013_0107_1_1";
      case "sunday":
        return "01_014_0107_1_1";
      case "public_holiday":
        return "01_012_0107_1_1";
    }
  } else {
    switch (bracket) {
      case "weekday_daytime":
        return "04_104_0125_6_1";
      case "weekday_evening":
        return "04_103_0125_6_1";
      case "saturday":
        return "04_105_0125_6_1";
      case "sunday":
        return "04_106_0125_6_1";
      case "public_holiday":
        return "04_102_0125_6_1";
    }
  }
}

/**
 * Resolves the matching Provider Travel (non-labour KM) code for the given category.
 */
export function resolveTravelItemCode(category: SupportCategory): AllowedNdisCode {
  return category === "self_care" ? "01_799_0107_1_1" : "04_799_0125_6_1";
}

/**
 * Validates and clamps a requested unit price against the NDIS Price Limit cap.
 * NDIS rules prohibit charging above the published maximum price limit, though
 * independent workers may charge at or below the cap.
 */
export function enforceNdisPriceCap(
  code: AllowedNdisCode,
  requestedRate?: number | null,
  shiftDate?: string
): { appliedRate: number; priceCap: number; wasCapped: boolean } {
  const priceCap = getPriceCapForDate(code, shiftDate);
  if (requestedRate === undefined || requestedRate === null || requestedRate <= 0) {
    return { appliedRate: priceCap, priceCap, wasCapped: false };
  }
  const roundedRequested = Math.round(requestedRate * 100) / 100;
  if (roundedRequested > priceCap) {
    return { appliedRate: priceCap, priceCap, wasCapped: true };
  }
  return { appliedRate: roundedRequested, priceCap, wasCapped: false };
}

/**
 * Formats a line item description strictly to Plan Manager OCR standards:
 * "{ndis_code} - {description} ({shift_date}, {start_time}-{end_time})"
 */
export function formatPlanManagerLineDescription(
  ndisCode: AllowedNdisCode,
  description: string,
  shiftDate: string,
  startTime: string,
  endTime: string
): string {
  const cleanDesc = description
    .replace(new RegExp(`^${ndisCode}\\s*-\\s*`, "i"), "")
    .replace(/\s*\(\d{4}-\d{2}-\d{2},\s*\d{2}:\d{2}-\d{2}:\d{2}\)\s*$/, "")
    .trim();
  return `${ndisCode} - ${cleanDesc} (${shiftDate}, ${startTime}-${endTime})`;
}

/**
 * Formats the mandatory Invoice Reference field for NDIS Plan Managers & Xero:
 * "NDIS# {ndis_number} - {participant_full_name}"
 */
export function formatInvoiceReference(
  ndisNumber: string,
  participantFullName: string
): string {
  const sanitizedNumber = ndisNumber.replace(/\s+/g, "").trim();
  return `NDIS# ${sanitizedNumber} - ${participantFullName.trim()}`;
}

/**
 * Builds deterministic, rate-capped NDIS invoice line items (labour + optional KM travel)
 * and computes exact currency totals rounded to 2 decimal places.
 */
export function buildValidatedShiftLineItems(params: {
  supportCategory: SupportCategory;
  shiftDate: string;
  startTime: string;
  endTime: string;
  durationHours?: number;
  kmTravelled?: number;
  isPublicHoliday?: boolean;
  hourlyRateOverride?: number | null;
}): {
  bracket: TimeBracket;
  durationHours: number;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
} {
  const durationHours =
    params.durationHours && params.durationHours > 0
      ? Math.round(params.durationHours * 100) / 100
      : calculateDurationHours(params.startTime, params.endTime);

  const bracket = resolveTimeBracket(
    params.shiftDate,
    params.startTime,
    params.endTime,
    Boolean(params.isPublicHoliday)
  );

  const primaryCode = resolveSupportItemCode(params.supportCategory, bracket);
  const primaryCatalogueItem = NDIS_CATALOGUE[primaryCode];
  const { appliedRate, priceCap: primaryPriceCap } = enforceNdisPriceCap(
    primaryCode,
    params.hourlyRateOverride,
    params.shiftDate
  );

  const primaryLineTotal = Math.round(durationHours * appliedRate * 100) / 100;

  const lineItems: InvoiceLineItem[] = [
    {
      ndis_code: primaryCode,
      support_name: primaryCatalogueItem.name,
      description: formatPlanManagerLineDescription(
        primaryCode,
        primaryCatalogueItem.name,
        params.shiftDate,
        params.startTime,
        params.endTime
      ),
      unit: "H",
      quantity: durationHours,
      unit_price: appliedRate,
      max_price_limit: primaryPriceCap,
      line_total: primaryLineTotal,
      gst_code: "EXEMPTOUTPUT",
    },
  ];

  const kms = params.kmTravelled ? Math.round(params.kmTravelled * 100) / 100 : 0;
  if (kms > 0) {
    const travelCode = resolveTravelItemCode(params.supportCategory);
    const travelCatalogueItem = NDIS_CATALOGUE[travelCode];
    const { appliedRate: travelRate, priceCap: travelPriceCap } = enforceNdisPriceCap(
      travelCode,
      null,
      params.shiftDate
    );
    const travelTotal = Math.round(kms * travelRate * 100) / 100;

    lineItems.push({
      ndis_code: travelCode,
      support_name: travelCatalogueItem.name,
      description: formatPlanManagerLineDescription(
        travelCode,
        travelCatalogueItem.name,
        params.shiftDate,
        params.startTime,
        params.endTime
      ),
      unit: "KM",
      quantity: kms,
      unit_price: travelRate,
      max_price_limit: travelPriceCap,
      line_total: travelTotal,
      gst_code: "EXEMPTOUTPUT",
    });
  }

  const totalAmount =
    Math.round(
      lineItems.reduce((acc, item) => acc + item.line_total, 0) * 100
    ) / 100;

  return {
    bracket,
    durationHours,
    lineItems,
    totalAmount,
  };
}
