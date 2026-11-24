import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { summarizeObservations } from "../lib/copernicus/observations.ts";
import { STATS_EVALSCRIPT } from "../lib/copernicus/stats-evalscripts.ts";
import { EVALSCRIPTS } from "../lib/copernicus/evalscripts.ts";
import { geometrySchema, observationWindow, pointFromQuery, radiusAreaHectares } from "../lib/copernicus/request.ts";
import { allowRequest, cachedRequest, readJson } from "../lib/request-budget.ts";

const pixel = { B03: 0.1, B04: 0.2, B08: 0.6, B8A: 0.6, B11: 0.2, SCL: 4, dataMask: 1 };
const evaluate = runInNewContext("const index = () => {};\n" + STATS_EVALSCRIPT + "\nevaluatePixel");
const processPixel = runInNewContext("const index = () => {};\n" + EVALSCRIPTS.NDVI + "\nevaluatePixel");

test("NDVI, green-NIR NDWI and NDMI use the specified reflectance bands", () => {
  const result = evaluate(pixel);
  assert.ok(Math.abs(result.ndvi[0] - 0.5) < 1e-12);
  assert.ok(Math.abs(result.ndwi[0] - (-5 / 7)) < 1e-12);
  assert.ok(Math.abs(result.ndmi[0] - 0.5) < 1e-12);
  assert.deepEqual(Array.from(result.dataMask), [1, 1, 1, 1, 1]);
});

test("clouds, shadows, invalid data and zero denominators do not become index measurements", () => {
  for (const SCL of [0, 1, 2, 3, 7, 8, 9, 10, 11]) {
    assert.deepEqual(Array.from(evaluate({ ...pixel, SCL }).dataMask.slice(0, 3)), [0, 0, 0]);
    assert.equal(processPixel({ ...pixel, SCL })[3], 0);
  }
  assert.deepEqual(Array.from(evaluate({ ...pixel, dataMask: 0 }).dataMask), [0, 0, 0, 0, 0]);
  assert.equal(evaluate({ ...pixel, B04: 0, B08: 0 }).dataMask[0], 0);
});

test("water remains available to NDWI while land indices are masked", () => {
  const result = evaluate({ ...pixel, SCL: 6 });
  assert.deepEqual(Array.from(result.dataMask), [0, 1, 0, 1, 1]);
  assert.equal(result.surface[0], 1);
  assert.equal(processPixel({ ...pixel, SCL: 6 })[3], 0);
});

function band(mean, valid = 80) {
  return { stats: { mean, sampleCount: 100, noDataCount: 100 - valid } };
}

function day(date, valid, water = 0) {
  return {
    interval: { from: `2026-06-${date}T00:00:00Z`, to: `2026-06-${Number(date) + 1}T00:00:00Z` },
    outputs: {
      ndvi: { bands: { B0: band(0.48, water ? 0 : valid) } },
      ndwi: { bands: { B0: band(0.15, valid) } },
      quality: { bands: { cloud: band(1 - valid / 100, 100) } },
      surface: { bands: { water: band(water, valid), vegetation: band(1 - water, valid) } },
    },
  };
}

test("selects the latest adequately covered day and counts only unmasked samples", () => {
  const result = summarizeObservations([day("10", 30), day("12", 0), day("11", 80)], 100);
  assert.equal(result.observation.from, "2026-06-11T00:00:00Z");
  assert.equal(result.observation.ndvi, 0.48);
  assert.equal(result.observation.ndmi, null);
  assert.equal(result.observation.clearCoverage, 0.8);
  assert.equal(result.latestObserved.clearPixels, 0);
  assert.equal(summarizeObservations([day("10", 49)], 100).observation, null);
  assert.equal(summarizeObservations([], 100).observation, null);
  const water = summarizeObservations([day("10", 90, 1)], 100).observation;
  assert.equal(water.waterFraction, 1);
  assert.equal(water.ndvi, null);
  assert.equal(water.ndwi, 0.15);
});

test("validates map positions and limits radius; a 1 km buffer quadruples area", () => {
  assert.equal(pointFromQuery("0", "0", "1000").radiusMeters, 1000);
  assert.equal(pointFromQuery("", "0", "500"), null);
  assert.equal(pointFromQuery("95", "0", "500"), null);
  assert.equal(pointFromQuery("45", "12", "5000"), null);
  assert.equal(radiusAreaHectares(1000), radiusAreaHectares(500) * 4);
  assert.equal(geometrySchema.safeParse({ type: "Polygon", coordinates: [] }).success, false);
  assert.equal(observationWindow(new Date("2026-07-01T15:00:00Z")).from, "2026-06-01T00:00:00.000Z");
});

test("deduplicates concurrent requests, rejects excess bodies and limits provider calls", async () => {
  let executions = 0;
  const load = async () => ++executions;
  assert.deepEqual(await Promise.all([
    cachedRequest("tests", "same", 1, load),
    cachedRequest("tests", "same", 1, load),
  ]), [1, 1]);
  await assert.rejects(cachedRequest("tests", "new", 1, load));
  assert.equal(allowRequest("test-window", 1, 0), true);
  assert.equal(allowRequest("test-window", 1, 59_999), false);
  assert.equal(allowRequest("test-window", 1, 60_000), true);
  await assert.rejects(readJson(new Request("https://example.com", { method: "POST", body: '{"a":1}' }), 4));
});
