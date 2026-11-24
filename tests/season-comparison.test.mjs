import assert from "node:assert/strict";
import test from "node:test";
import { MIN_SEASON_READINGS, pickSeasonDay, seasonImageGap, seasonSummary, seasonWindow, windowDays, windowRelationship } from "../lib/copernicus/season-comparison.ts";
import { dateObservationWindow, MAX_HISTORY_DAYS } from "../lib/copernicus/request.ts";

const row = (date, indices, coverage = 0.9) => ({ from: `${date}T00:00:00Z`, to: new Date(Date.parse(date) + 86_400_000).toISOString(),
  ndvi: null, ndwi: null, ndmi: null, clearCoverage: coverage, clearPixels: 80, cloudFraction: 1 - coverage, ...indices });

test("season windows include both UTC dates, reject invalid or oversized intervals, and preserve the 366-day report", () => {
  const exact = seasonWindow("2024-02-01", "2024-03-01");
  assert.equal(windowDays(exact), 30);
  assert.equal(exact.to, "2024-03-02T00:00:00.000Z");
  assert.equal(windowDays(seasonWindow("2017-01-01", "2017-01-01")), 1);
  for (const [a, b] of [["2024-02-01", "2024-03-02"], ["2024-02-30", "2024-03-02"], ["2024-03-02", "2024-03-01"],
    ["2016-12-30", "2017-01-02"], ["2099-01-01", "2099-01-02"], ["2024-2-01", "2024-02-02"]]) assert.equal(seasonWindow(a, b), null);
  assert.equal(windowDays(dateObservationWindow("2024-01-01", "2024-12-31")), MAX_HISTORY_DAYS);
});

test("identical, overlapping and adjacent windows are distinct; image gap uses UTC and is symmetric", () => {
  const a = seasonWindow("2024-02-01", "2024-02-25");
  assert.equal(windowRelationship(a, seasonWindow("2024-02-01", "2024-02-25")), "identical");
  assert.equal(windowRelationship(a, seasonWindow("2024-02-25", "2024-02-29")), "overlap");
  assert.equal(windowRelationship(a, seasonWindow("2024-02-26", "2024-02-29")), "separate");
  const first = row("2024-02-28", { ndvi: 0.3 }), second = row("2024-03-01", { ndvi: 0.5 });
  assert.equal(seasonImageGap(first, second), 2);
  assert.equal(seasonImageGap(second, first), 2);
  assert.equal(seasonImageGap(first, first), 0);
});

test("summaries use per-index samples; preserve zero and omit masked, rejected and absent values", () => {
  const window = seasonWindow("2024-08-01", "2024-08-10");
  const days = [row("2024-08-01", { ndvi: 0, ndwi: -0.2 }), row("2024-08-02", { ndvi: 0.25, ndmi: 0.11 }),
    row("2024-08-03", { ndvi: 0.75, ndmi: 0.24 }), row("2024-08-04", { ndvi: 1 }), row("2024-08-05", { ndvi: 0.9 }, 0.1)];
  const report = { window, days };
  const result = seasonSummary(report);
  assert.equal(MIN_SEASON_READINGS, 3);
  assert.deepEqual([result.usable.length, result.rejected, result.unobserved], [4, 1, 5]);
  assert.deepEqual(result.metrics, [
    { index: "ndvi", count: 4, missing: 0, summary: { median: 0.5, min: 0, max: 1 } },
    { index: "ndwi", count: 1, missing: 3, summary: null },
    { index: "ndmi", count: 2, missing: 2, summary: null },
  ]);
  assert.equal(pickSeasonDay(report, "2024-08-01"), days[0]);
  for (const date of ["", "2024-08-05", "2024-08-06"]) assert.equal(pickSeasonDay(report, date), null);
});

test("an empty or rejected-only window does not yield seasonal summaries or image dates", () => {
  const window = seasonWindow("2024-08-01", "2024-08-03");
  for (const days of [[], [row("2024-08-01", { ndmi: 0 }, 0.2)]]) {
    const report = { window, days };
    const result = seasonSummary(report);
    assert.deepEqual([result.usable.length, result.rejected, result.unobserved], [0, days.length, 3 - days.length]);
    assert.ok(result.metrics.every(metric => metric.count === 0 && metric.summary === null));
    assert.equal(pickSeasonDay(report, "2024-08-01"), null);
  }
});
