import assert from "node:assert/strict";
import { test } from "node:test";
import { compareDays, describeHistory, interpretIndex, latestSharedDay, signedDifference } from "../lib/copernicus/interpretation.ts";
import { dateObservationWindow, inclusiveEnd, isValidHistoryWindow, isValidWindow, observationWindow } from "../lib/copernicus/request.ts";

function observation(day, values = {}) {
  return {
    from: `2026-01-${String(day).padStart(2, "0")}T00:00:00Z`,
    to: `2026-01-${String(day + 1).padStart(2, "0")}T00:00:00Z`,
    clearCoverage: 0.85,
    cloudFraction: 0.1,
    clearPixels: 165,
    waterFraction: 0,
    vegetationFraction: 0.7,
    ndvi: 0.5,
    ndwi: -0.3,
    ndmi: 0.1,
    ...values,
  };
}

test("converts inclusive UTC dates and rejects invalid or overly long periods", () => {
  const window = dateObservationWindow("2025-11-01", "2026-10-31");
  assert.equal(window.to, "2026-11-01T00:00:00.000Z");
  assert.equal(inclusiveEnd(window), "2026-10-31");
  assert.equal(isValidHistoryWindow(window), true);
  assert.equal(isValidWindow(window.from, window.to), false);
  assert.equal(dateObservationWindow("2026-02-30", "2026-03-02"), null);
  assert.equal(dateObservationWindow("2026-01-02", "2026-01-01"), null);
  assert.equal(dateObservationWindow("2024-01-01", "2025-01-01"), null);
  assert.equal(observationWindow(new Date("2026-11-18T05:00:00Z"), 90).from, "2026-08-20T00:00:00.000Z");
});

test("display breakpoints match the raster palette and nulls stay missing", () => {
  assert.equal(interpretIndex("ndvi", -0.001), "Negative contrast");
  assert.equal(interpretIndex("ndvi", 0.2), "Intermediate greenness");
  assert.equal(interpretIndex("ndvi", 1), "Strong positive contrast");
  assert.equal(interpretIndex("ndmi", null), null);
});

test("compares the latest shared usable date with a common index", () => {
  const a = [observation(9), observation(6), observation(4)];
  const b = [observation(9, { clearCoverage: 0.49 }), observation(7), observation(6, { ndvi: 0.4 })];
  const shared = latestSharedDay(a, b);
  assert.equal(shared.left.from, observation(6).from);
  assert.equal(signedDifference(compareDays(shared.left, shared.right, "ndvi")), "-0.10");
  assert.equal(compareDays(observation(9), b[0], "ndvi"), null);
  assert.equal(latestSharedDay(a, [observation(9, { ndvi: null, ndwi: null, ndmi: null })]), null);
  assert.equal(signedDifference(-0.001), "0.00");
});

test("history summaries require six usable readings and ignore gaps and rejected candidates", () => {
  const days = [
    observation(2, { ndvi: 0.3 }), observation(4, { ndvi: 0.2 }),
    observation(6, { ndvi: 0.1 }), observation(9, { ndvi: 0.4 }),
    observation(12, { ndvi: 0.5 }), observation(15, { ndvi: 0.6 }),
    observation(18, { ndvi: 0.9, clearCoverage: 0.3 }), observation(20, { ndvi: null }),
  ];
  assert.equal(describeHistory(days.slice(1), "ndvi"), null);
  assert.deepEqual(describeHistory(days, "ndvi"), { early: 0.2, late: 0.5, first: "2026-01-02", last: "2026-01-15" });
});
