// ============================================================================
// ShiftNote AU - Deterministic NDIS Engine Unit Tests
// Verifies rate-cap enforcement, 5-bracket day/time resolution, OCR line item
// formatting, Reference string formatting, and math accuracy.
// ============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./helpers/load-ts.mjs";

const ndis = await loadLib("ndis-catalogue");
const parser = await loadLib("transcript-parser");

test("1. Catalogue completeness: Contains all 12 Core Support & Provider Travel codes", () => {
  const expectedCodes = [
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
  ];
  for (const code of expectedCodes) {
    assert.equal(ndis.isValidNdisCode(code), true, `Expected ${code} to be valid`);
  }
  assert.equal(ndis.isValidNdisCode("99_999_9999_9_9"), false);
});

test("2. Day/Time Bracket Resolution: Weekday Daytime, Weekday Evening, Saturday, Sunday, Public Holiday", () => {
  // Monday 2026-11-02 09:00-12:00 -> weekday_daytime
  assert.equal(
    ndis.resolveTimeBracket("2026-11-02", "09:00", "12:00", false),
    "weekday_daytime"
  );

  // Monday 2026-11-02 18:30-21:00 -> weekday_evening
  assert.equal(
    ndis.resolveTimeBracket("2026-11-02", "18:30", "21:00", false),
    "weekday_evening"
  );

  // Saturday 2026-11-07 10:00-14:00 -> saturday
  assert.equal(
    ndis.resolveTimeBracket("2026-11-07", "10:00", "14:00", false),
    "saturday"
  );

  // Sunday 2026-11-08 10:00-14:00 -> sunday
  assert.equal(
    ndis.resolveTimeBracket("2026-11-08", "10:00", "14:00", false),
    "sunday"
  );

  // Public Holiday via statutory date (Christmas 2026-12-25) -> public_holiday
  assert.equal(
    ndis.resolveTimeBracket("2026-12-25", "09:00", "12:00", false),
    "public_holiday"
  );

  // Public Holiday via explicit flag -> public_holiday
  assert.equal(
    ndis.resolveTimeBracket("2026-11-02", "09:00", "12:00", true),
    "public_holiday"
  );
});

test("3. Rate-Cap Validation: Clamps rates above NDIS maximum and preserves lower negotiated rates", () => {
  // Above cap ($85.00 > $73.58 2026-27 cap for Weekday Daytime Self-Care)
  const capped = ndis.enforceNdisPriceCap("01_011_0107_1_1", 85.0);
  assert.equal(capped.appliedRate, 73.58);
  assert.equal(capped.wasCapped, true);

  // Below cap ($62.50 <= $73.58 cap)
  const negotiated = ndis.enforceNdisPriceCap("01_011_0107_1_1", 62.5);
  assert.equal(negotiated.appliedRate, 62.5);
  assert.equal(negotiated.wasCapped, false);

  // Null/default rate uses exact NDIS cap
  const defaulted = ndis.enforceNdisPriceCap("04_106_0125_6_1", null);
  assert.equal(defaulted.appliedRate, 133.5);
  assert.equal(defaulted.wasCapped, false);
});

test("4. Plan Manager OCR Line Description & Reference Formatting", () => {
  const lineDesc = ndis.formatPlanManagerLineDescription(
    "04_104_0125_6_1",
    "Access Community Social and Rec Activ - Standard - Weekday Daytime",
    "2026-11-02",
    "09:00",
    "12:00"
  );
  assert.equal(
    lineDesc,
    "04_104_0125_6_1 - Access Community Social and Rec Activ - Standard - Weekday Daytime (2026-11-02, 09:00-12:00)"
  );

  const ref = ndis.formatInvoiceReference("430 918 274", "Liam O'Connor");
  assert.equal(ref, "NDIS# 430918274 - Liam O'Connor");
});

test("5. Full Shift Line Item Math Accuracy (Labour + Provider Travel KMs)", () => {
  const result = ndis.buildValidatedShiftLineItems({
    supportCategory: "community_access",
    shiftDate: "2026-11-02", // Monday
    startTime: "09:00",
    endTime: "12:00", // 3.0 hours
    kmTravelled: 14, // 14 km @ $0.99 = $13.86
    isPublicHoliday: false,
    hourlyRateOverride: null, // $73.58 * 3 = $220.74
  });

  assert.equal(result.bracket, "weekday_daytime");
  assert.equal(result.durationHours, 3);
  assert.equal(result.lineItems.length, 2);
  assert.equal(result.lineItems[0].ndis_code, "04_104_0125_6_1");
  assert.equal(result.lineItems[0].line_total, 220.74);
  assert.equal(result.lineItems[0].max_price_limit, 73.58);
  assert.equal(result.lineItems[0].gst_code, "EXEMPTOUTPUT");
  assert.equal(result.lineItems[1].ndis_code, "04_799_0125_6_1");
  assert.equal(result.lineItems[1].line_total, 13.86);
  assert.equal(result.totalAmount, 234.6);
});

test("6. Weekday Evening follows NDIS definitions (finishes after 8pm, not starts after 6pm)", () => {
  // Starts at 18:00 but finishes before 20:00 -> still Weekday Daytime
  assert.equal(ndis.resolveTimeBracket("2026-11-02", "18:00", "19:30"), "weekday_daytime");
  // Finishes exactly at 20:00 -> Weekday Daytime
  assert.equal(ndis.resolveTimeBracket("2026-11-02", "17:00", "20:00"), "weekday_daytime");
  // Crosses 20:00 with one worker -> higher (evening) rate for whole support
  assert.equal(ndis.resolveTimeBracket("2026-11-02", "18:30", "20:30"), "weekday_evening");
  // Starts at/after 20:00 -> Weekday Evening
  assert.equal(ndis.resolveTimeBracket("2026-11-02", "20:00", "22:00"), "weekday_evening");
});

test("7. NSW additional public holidays and 2027 dates are detected", () => {
  // Anzac Day 2026 fell on a Saturday; NSW observed Monday 27 April
  assert.equal(ndis.resolveTimeBracket("2026-04-27", "09:00", "12:00"), "public_holiday");
  assert.equal(ndis.resolveTimeBracket("2027-01-26", "09:00", "12:00"), "public_holiday");
  assert.equal(ndis.resolveTimeBracket("2027-03-26", "09:00", "12:00"), "public_holiday");
  assert.equal(ndis.resolveTimeBracket("2027-12-27", "09:00", "12:00"), "public_holiday");
});

test("8. Price caps are effective-dated (2025-26 before 1 July 2026, 2026-27 after)", () => {
  assert.equal(ndis.getPriceCapForDate("01_011_0107_1_1", "2026-06-30"), 70.23);
  assert.equal(ndis.getPriceCapForDate("01_011_0107_1_1", "2026-07-01"), 73.58);
  const backdated = ndis.buildValidatedShiftLineItems({
    supportCategory: "self_care",
    shiftDate: "2026-06-01", // Monday
    startTime: "09:00",
    endTime: "11:00",
  });
  assert.equal(backdated.lineItems[0].unit_price, 70.23);
  assert.equal(backdated.totalAmount, 140.46);
});

test("9. Transcript parser reads dictated date, times, duration and KMs", () => {
  const liam = parser.extractShiftDetails(
    "Just wrapped up a 3 hour community access shift with Liam O'Connor today, 2nd of November 2026, from 1:30pm to 4:30pm. We travelled 18 kilometres round trip to Miranda Library.",
    "2026-11-26"
  );
  assert.equal(liam.shiftDate, "2026-11-02");
  assert.equal(liam.startTime, "13:30");
  assert.equal(liam.endTime, "16:30");
  assert.equal(liam.durationHours, 3);
  assert.equal(liam.kmTravelled, 18);
  assert.equal(liam.supportCategory, "community_access");

  const marcus = parser.extractShiftDetails(
    "Finished a 4 hour Sunday community access shift with Marcus Vance on 1st of November 2026 from 10:00am to 2:00pm. Drove 22 kilometres.",
    "2026-11-26"
  );
  assert.equal(marcus.shiftDate, "2026-11-01");
  assert.equal(marcus.startTime, "10:00");
  assert.equal(marcus.endTime, "14:00");
  assert.equal(marcus.durationHours, 4);
  assert.equal(ndis.resolveTimeBracket(marcus.shiftDate, marcus.startTime, marcus.endTime), "sunday");

  const chloe = parser.extractShiftDetails(
    "Completed a two and a half hour Saturday morning personal care shift with Chloe from 8am to 10:30am.",
    "2026-10-31"
  );
  assert.equal(chloe.startTime, "08:00");
  assert.equal(chloe.endTime, "10:30");
  assert.equal(chloe.durationHours, 2.5);
  assert.equal(chloe.supportCategory, "self_care");
  assert.equal(chloe.shiftDate, "2026-10-31");

  assert.deepEqual(parser.parseTimeRange("from 9 to 12pm"), { startTime: "09:00", endTime: "12:00" });
  assert.equal(parser.parseTimeRange("a 2 to 3 hour shift"), null);
  assert.equal(parser.parseShiftDate("worked yesterday", "2026-11-01"), "2026-10-31");
});

test("10. Transcript parser never invents travel KMs", () => {
  const noTravel = parser.extractShiftDetails(
    "Two hour personal care shift from 9am to 11am, no driving needed.",
    "2026-11-02"
  );
  assert.equal(noTravel.kmTravelled, 0);
  assert.equal(noTravel.detected.km, false);
  const result = ndis.buildValidatedShiftLineItems({
    supportCategory: noTravel.supportCategory,
    shiftDate: noTravel.shiftDate,
    startTime: noTravel.startTime,
    endTime: noTravel.endTime,
    kmTravelled: noTravel.kmTravelled,
  });
  assert.equal(result.lineItems.length, 1);
});

test("11. Demo shift history matches the deterministic engine", async () => {
  // Guards against demo data drifting from the rate engine (e.g. Saturday rate on a Sunday)
  const cases = [
    { category: "community_access", date: "2026-11-02", start: "09:00", end: "12:00", km: 14, total: 234.6, code: "04_104_0125_6_1" },
    { category: "self_care", date: "2026-10-31", start: "08:00", end: "10:30", km: 0, total: 258.85, code: "01_013_0107_1_1" },
  ];
  for (const c of cases) {
    const r = ndis.buildValidatedShiftLineItems({
      supportCategory: c.category,
      shiftDate: c.date,
      startTime: c.start,
      endTime: c.end,
      kmTravelled: c.km,
    });
    assert.equal(r.lineItems[0].ndis_code, c.code);
    assert.equal(r.totalAmount, c.total);
  }
});
