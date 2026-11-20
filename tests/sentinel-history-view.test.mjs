import assert from "node:assert/strict";
import test from "node:test";
import { historyDayAtPointer, historyView, historyX } from "../lib/copernicus/history-view.ts";

const DAY = 86_400_000;
const start = Date.parse("2024-02-28T00:00:00Z");
const stamp = n => new Date(start + n * DAY).toISOString();
const observation = (n, overrides) => ({ from: stamp(n), to: stamp(n + 1), clearCoverage: 0.8, clearPixels: 100,
  cloudFraction: 0.2, ndvi: 0.53, ndwi: -0.41, ndmi: 0.1, ...overrides });
const report = (length, days) => ({ window: { from: stamp(0), to: stamp(length) }, days });

test("plots only provider readings and separates missing indices, rejected scenes and empty UTC days", () => {
  const days = [observation(6, { ndwi: 0 }), observation(2, { clearCoverage: 0.2 }), observation(0, { ndwi: null })];
  const { days: plot, counts } = historyView(report(8, days), "ndwi");
  assert.deepEqual(counts, { reading: 1, unavailable: 1, rejected: 1, unobserved: 5 });
  assert.deepEqual([plot[0].status, plot[0].usable, plot[0].value], ["unavailable", true, null]);
  assert.deepEqual([plot[1].date, plot[1].status, plot[1].value], ["2024-02-29", "unobserved", null]);
  assert.deepEqual([plot[2].status, plot[2].usable, plot[2].value], ["rejected", false, null]);
  assert.deepEqual([plot[6].status, plot[6].value], ["reading", 0]);
  assert.equal(historyView(report(8, days), "ndvi").days[0].value, 0.53);
  assert.equal(historyView(report(8, days), "ndmi").days[0].value, 0.1);
});

test("keeps the exact temporal spacing for one day and 30, 90 and 365 days", () => {
  for (const length of [1, 30, 90, 365]) {
    const { days, counts } = historyView(report(length, [observation(0), observation(length)]), "ndwi");
    assert.equal(days.length, length);
    assert.equal(days.at(-1).date, stamp(length - 1).slice(0, 10));
    assert.equal(counts.reading, 1);
    assert.equal(counts.unobserved, length - 1);
    assert.equal(historyX(0, length), length === 1 ? 50 : 0);
    assert.equal(historyX(length - 1, length), length === 1 ? 50 : 100);
  }
});

test("pointer tolerance picks nearby real dates on long mobile timelines but preserves unobserved gaps", () => {
  const { days } = historyView(report(365, [observation(8), observation(170), observation(280, { clearPixels: 0 })]), "ndmi");
  const width = 250;
  const position = day => historyX(day, days.length) * width / 100;
  assert.equal(historyDayAtPointer(days, position(170), width), 170);
  assert.equal(historyDayAtPointer(days, position(174), width), 170);
  assert.equal(historyDayAtPointer(days, position(210), width), 210);
  assert.equal(historyDayAtPointer(days, position(280), width), 280);
  assert.equal(historyDayAtPointer(days, position(400), width), 364);
  assert.equal(historyDayAtPointer(days, position(-400), width), 8);
});
