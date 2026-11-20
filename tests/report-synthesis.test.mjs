import assert from "node:assert/strict";
import test from "node:test";
import { synthesizeReport } from "../lib/report-synthesis-rules.ts";
import { soilPreviewAt } from "../lib/soil-preview.ts";

const coordinates = [52.0423, 23.0804];
const report = { coordinates, radiusMeters: 500, period: { from: "2024-02-01T00:00:00Z", to: "2024-03-05T00:00:00Z" } };
const onDay = (date, extra) => ({
  from: `${date}T00:00:00Z`, to: new Date(Date.parse(date) + 86400000).toISOString(),
  ndvi: 0.5, ndwi: -0.25, ndmi: 0, clearCoverage: 0.75, cloudFraction: 0.25, clearPixels: 101,
  waterFraction: 0, vegetationFraction: 0.5, ...extra,
});
const selected = onDay("2024-03-01");
const reference = onDay("2024-02-29", { ndvi: 0.25, ndmi: 0.125 });
const rejected = onDay("2024-03-02", { clearCoverage: 0.2 });
const days = [rejected, selected, reference];
const stats = { days, observation: selected, latestObserved: rejected, observedDays: 3, window: report.period, resolutionMeters: 20, areaHectares: 78 };
const weatherDay = (date, precipitationMm, temperatureMeanC) => ({ date, precipitationMm, temperatureMeanC });
const weather = (days, extra) => ({ timezone: "UTC", point: { latitude: coordinates[0], longitude: coordinates[1] }, days, ...extra });
const soil = { status: "available", depthCm: [0, 5], resolutionMeters: 250, phPredictionInterval: [3.9, 7.6],
  medians: { phh2o: 5.4, sand: 60.3, silt: 29.8, clay: 5, soc: 21.6, bdod: 1.27 } };
const input = (extra) => ({
  report, selectedDay: "2024-03-01", referenceDay: "2024-02-29",
  satellite: { coordinates, radiusMeters: report.radiusMeters, stats }, soil: { coordinates, reading: soil }, ...extra,
});
const ruleIds = ({ findings }) => findings.map(finding => finding.rule);

test("preserves exact values and provenance from all three sources", () => {
  const primary = weather(Array.from({ length: 30 }, (_, i) =>
    weatherDay(new Date(Date.UTC(2024, 0, 31 + i)).toISOString().slice(0, 10), i, 1.75)));
  const result = synthesizeReport(input({ weather: { primary } }));
  const { sentinel, weather: context, soil: ground } = result.evidence;
  assert.equal(sentinel.status, "available");
  assert.equal(sentinel.indexUnit, "dimensionless");
  assert.deepEqual(sentinel.selected.indices, { ndvi: 0.5, ndwi: -0.25, ndmi: 0 });
  assert.deepEqual(sentinel.selected.coverage, { clearFraction: 0.75, cloudFraction: 0.25, clearPixels: 101 });
  assert.deepEqual(sentinel.comparison.differences, { ndvi: 0.25, ndwi: 0, ndmi: -0.125 });
  assert.equal(sentinel.history[0].usable, false);
  assert.deepEqual(sentinel.history[0].indices, { ndvi: null, ndwi: null, ndmi: null });
  assert.equal(context.status, "available");
  assert.equal(context.observationDay, selected.from.slice(0, 10));
  const { rainSeven, rainThirty, temperatureSeven } = context.metrics;
  assert.deepEqual(rainSeven.range, { from: "2024-02-23", to: "2024-02-29" });
  assert.deepEqual(rainThirty.range, { from: "2024-01-31", to: "2024-02-29" });
  assert.deepEqual([rainSeven.value, rainThirty.value, temperatureSeven.value], [182, 435, 1.75]);
  assert.deepEqual([rainSeven.model, rainSeven.unit, rainSeven.available, rainSeven.missing], ["ERA5", "mm", 7, 0]);
  assert.deepEqual([temperatureSeven.model, temperatureSeven.unit], ["ERA5-Land", "°C"]);
  assert.deepEqual(ground.cell.medians, soil.medians);
  assert.deepEqual(ground.cell.depthCm, [0, 5]);
  assert.equal(ground.cell.resolutionMeters, 250);
  assert.equal(ground.units.sand, "% mass");
  assert.deepEqual(ground.cell.phPredictionInterval, { bounds: [3.9, 7.6], coverage: 0.9, quantiles: [0.05, 0.95], unit: "pH" });
});

test("changes weather windows with the selected UTC day and never includes that day", () => {
  const primary = weather([
    weatherDay("2024-02-22", 9, -2), weatherDay("2024-02-29", 2, 4), weatherDay("2024-03-01", 99, 99),
  ]);
  const before = synthesizeReport(input({ weather: { primary } })).evidence.weather;
  const after = synthesizeReport(input({ weather: { primary }, selectedDay: "2024-02-29" })).evidence.weather;
  assert.equal(before.metrics.rainSeven.value, 2);
  assert.equal(before.metrics.rainThirty.value, 11);
  assert.equal(after.observationDay, "2024-02-29");
  assert.deepEqual(after.metrics.rainSeven.range, { from: "2024-02-22", to: "2024-02-28" });
  assert.deepEqual(after.metrics.rainThirty.range, { from: "2024-01-30", to: "2024-02-28" });
  assert.equal(after.metrics.rainSeven.value, 9);
  assert.equal(after.metrics.temperatureSeven.value, -2);
});

test("retains real zero, represents missing days as null and does not turn partial data into a full sum", () => {
  const primary = weather([weatherDay("2024-02-28", 0, null), weatherDay("2024-02-29", null, null)]);
  const result = synthesizeReport(input({ weather: { primary } }));
  const { rainSeven, temperatureSeven } = result.evidence.weather.metrics;
  assert.equal(result.evidence.weather.status, "partial");
  assert.deepEqual([rainSeven.value, rainSeven.available, rainSeven.missing], [0, 1, 6]);
  assert.deepEqual([temperatureSeven.value, temperatureSeven.available, temperatureSeven.missing], [null, 0, 7]);
  assert.ok(ruleIds(result).includes("weatherPartial"));
  assert.ok(ruleIds(result).includes("rainSeven"));
  assert.ok(!ruleIds(result).includes("temperatureSeven"));
  const absent = synthesizeReport(input());
  assert.equal(absent.evidence.weather.status, "no-data");
  assert.equal(absent.evidence.weather.metrics.rainThirty.missing, 30);
  assert.equal(absent.evidence.weather.metrics.rainThirty.value, null);
  assert.ok(ruleIds(absent).includes("weatherMissing"));
});

test("reuses weather failure fallback without replacing a true archive gap", () => {
  const primaryDays = [weatherDay("2024-02-29", null, 4)];
  const supplemental = weather([weatherDay("2024-02-29", 3, 99)]);
  const failed = synthesizeReport(input({ weather: { primary: weather(primaryDays, { failedSeries: "precipitation" }), supplemental } }));
  assert.equal(failed.evidence.weather.metrics.rainSeven.value, 3);
  assert.equal(failed.evidence.weather.metrics.temperatureSeven.value, 4);
  const archivedGap = synthesizeReport(input({ weather: { primary: weather(primaryDays), supplemental } }));
  assert.equal(archivedGap.evidence.weather.metrics.rainSeven.value, null);
  assert.equal(archivedGap.evidence.weather.metrics.temperatureSeven.value, 4);
});

test("distinguishes every SoilGrids absence and keeps independent Sentinel-2 and weather evidence", () => {
  const noData = soilPreviewAt([45.41, 12.30]);
  const outside = soilPreviewAt([48, 18]);
  const unavailable = soilPreviewAt(coordinates, () => null);
  for (const [point, reading, status, rule] of [
    [[45.41, 12.30], noData, "no-data", "soilNoData"], [[48, 18], outside, "outside", "soilOutside"],
    [coordinates, unavailable, "unavailable", "soilUnavailable"],
  ]) {
    const primary = weather([weatherDay("2024-02-29", 3, 4)], { point: { latitude: point[0], longitude: point[1] } });
    const result = synthesizeReport(input({ report: { ...report, coordinates: point }, satellite: { coordinates: point, radiusMeters: 500, stats },
      soil: { coordinates: point, reading }, weather: { primary } }));
    assert.equal(result.evidence.soil.status, status);
    assert.equal(result.evidence.soil.cell, null);
    assert.equal(result.evidence.sentinel.status, "available");
    assert.equal(result.evidence.weather.metrics.rainSeven.value, 3);
    assert.ok(ruleIds(result).includes(rule));
  }
});

test("preserves partial soil and partial Sentinel-2, compares only pairs present in both days", () => {
  const partial = { ...soil, status: "partial", phPredictionInterval: null, medians: { ...soil.medians, soc: 0, bdod: null } };
  const partialStats = { ...stats, days: [onDay("2024-03-01", { ndmi: null }), reference] };
  const result = synthesizeReport(input({ soil: { coordinates, reading: partial }, satellite: { coordinates, radiusMeters: 500, stats: partialStats } }));
  assert.equal(result.evidence.sentinel.status, "partial");
  assert.equal(result.evidence.sentinel.selected.indices.ndmi, null);
  assert.equal(result.evidence.sentinel.comparison.differences.ndmi, null);
  assert.equal(result.evidence.soil.cell.medians.soc, 0);
  assert.equal(result.evidence.soil.cell.medians.bdod, null);
  assert.equal(result.evidence.soil.cell.phPredictionInterval, null);
  assert.ok(ruleIds(result).includes("soilPartial"));
  assert.ok(ruleIds(result).includes("sentinelPartial"));
});

test("never substitutes another day, rejected observations, weather or soil for missing Sentinel-2", () => {
  for (const selectedDay of ["2024-03-02", "2024-03-03", null]) {
    const result = synthesizeReport(input({ selectedDay, weather: { primary: weather([weatherDay("2024-02-29", 3, 4)]) } }));
    assert.equal(result.evidence.sentinel.status, "no-usable-selection");
    assert.equal(result.evidence.sentinel.selected, null);
    assert.equal(result.evidence.weather.status, "no-anchor");
    assert.equal(result.evidence.weather.metrics, null);
    assert.equal(result.evidence.soil.status, "available");
    assert.ok(!result.findings.some(row => row.section === "observation"));
  }
  const noSources = synthesizeReport(input({ satellite: undefined, soil: undefined }));
  assert.equal(noSources.evidence.sentinel.status, "unavailable");
  assert.equal(noSources.evidence.soil.status, "not-provided");
});

test("ignores cached responses from a different scope or weather time zone", () => {
  const differentPoint = [52.04, 23.08];
  for (const scope of [{ coordinates: differentPoint }, { radiusMeters: 1000 }, { stats: { ...stats, window: { ...stats.window, to: "2024-03-04T00:00:00Z" } } }]) {
    const result = synthesizeReport(input({ satellite: { coordinates, radiusMeters: 500, stats, ...scope } }));
    assert.equal(result.evidence.sentinel.status, "unavailable");
  }
  const primary = weather([weatherDay("2024-02-29", 999, 99)], { point: { latitude: differentPoint[0], longitude: differentPoint[1] } });
  const supplemental = weather([weatherDay("2024-02-29", 999, 99)], { timezone: "Europe/Warsaw" });
  const result = synthesizeReport(input({ weather: { primary, supplemental }, soil: { coordinates: differentPoint, reading: soil } }));
  assert.equal(result.evidence.weather.status, "no-data");
  assert.equal(result.evidence.soil.status, "not-provided");
});

test("emits only evidence-linked, non-diagnostic rules; locale never changes data", (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("synthesis must not fetch"); });
  const payload = input({ weather: { primary: weather([weatherDay("2024-02-29", 3, 4)]) } });
  const pl = synthesizeReport(payload);
  const en = synthesizeReport(payload, "en");
  assert.deepEqual(pl.evidence, en.evidence);
  assert.deepEqual(ruleIds(pl), ["sentinelObservation", "sentinelComparison", "sentinelLimits", "rainSeven", "rainThirty",
    "temperatureSeven", "weatherPartial", "weatherLimits", "soilCell", "soilLimits", "fieldVerification", "soilSamples"]);
  assert.notEqual(pl.findings[0].message, en.findings[0].message);
  for (const { evidence, message } of pl.findings) {
    assert.notEqual(evidence.split(".").reduce((object, key) => object?.[key], pl.evidence), undefined);
    assert.ok(!/\b(?:zdiagnozowano|spowodowały|nawieź|wapnuj)\b/u.test(message));
  }
  assert.match(en.findings.find(row => row.rule === "weatherLimits").message, /does not establish/);
  assert.equal(fetch.mock.callCount(), 0);
});
