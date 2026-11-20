import assert from "node:assert/strict";
import test from "node:test";
import { reportComparisonDay, reportMapLayers, reportMapUrl } from "../lib/copernicus/report-map.ts";

const area = { coordinates: [52.0423, 23.0804], radiusMeters: 500 };
const observation = (day, overrides) => ({
  from: `2026-08-${day}T00:00:00.000Z`, to: `2026-08-${Number(day) + 1}T00:00:00.000Z`,
  clearCoverage: 0.8, clearPixels: 80, ndvi: 0.4, ndwi: -0.5, ndmi: 0, ...overrides,
});
const current = observation("26");
const reference = observation("25");
const parse = url => new URL(url, "http://test").searchParams;
const frame = params => ["minLng", "minLat", "maxLng", "maxLat", "width", "height"].map(name => params.get(name));

test("each comparison pair shares the exact frame, physical scale, resolution and layer", () => {
  const urls = new Set();
  for (const layer of reportMapLayers) {
    const left = reportMapUrl(area, current, layer);
    const right = reportMapUrl(area, reference, layer);
    assert.deepEqual(frame(parse(left)), frame(parse(right)));
    assert.deepEqual(frame(parse(left)), frame(parse(reportMapUrl(area, current))));
    assert.equal(parse(left).get("from"), current.from);
    assert.equal(parse(right).get("from"), reference.from);
    assert.equal(parse(left).get("layer"), layer);
    assert.equal(parse(right).get("layer"), layer);
    assert.equal(parse(right).get("format"), "webp");
    urls.add(left).add(right);
  }
  assert.equal(urls.size, 8);
});

test("keys change with point and radius, and print keeps the same True Color frame", () => {
  const base = parse(reportMapUrl(area, current));
  const printable = parse(reportMapUrl(area, current, "TRUE_COLOR", "png"));
  assert.deepEqual(frame(printable), frame(base));
  assert.equal(printable.get("format"), null);
  const [west, , east] = frame(base).map(Number);
  const [widerWest, , widerEast] = frame(parse(reportMapUrl({ ...area, radiusMeters: 1000 }, current))).map(Number);
  assert.ok(Math.abs((widerEast - widerWest) / (east - west) - 2) < 0.0001);
  assert.notDeepEqual(frame(parse(reportMapUrl({ ...area, coordinates: [45.523244962, 12.221163987] }, current))), frame(base));
});

test("rejected, unavailable, repeated and out-of-range dates do not produce a comparison", () => {
  const rejected = observation("23", { clearCoverage: 0.49 });
  const noIndices = observation("22", { ndvi: null, ndwi: null, ndmi: null });
  const days = [current, reference, rejected, noIndices];
  assert.equal(reportComparisonDay(days, current, "2026-08-25"), reference);
  for (const date of ["2026-08-26", "2026-08-23", "2026-08-22", "2026-08-21", ""]) {
    assert.equal(reportComparisonDay(days, current, date), null);
  }
  for (const day of [null, rejected, noIndices]) assert.equal(reportMapUrl(area, day), null);
  assert.equal(reportMapUrl({ ...area, coordinates: [84, 23] }, current), null);
});
