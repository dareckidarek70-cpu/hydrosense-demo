import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveObjectURL } from "node:buffer";
import { MapRasterCache } from "../lib/map-raster-cache.ts";
import { getCachedObservation, rememberObservation } from "../lib/observation-cache.ts";

const stats = { window: { from: "2026-06-03T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z" }, days: [], observedDays: 0 };

function tab() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("session observations can be reopened only for the same query and within the TTL", () => {
  const storage = tab();
  rememberObservation(storage, "500 m, 90 days", stats, 5000);
  assert.deepEqual(getCachedObservation(storage, "500 m, 90 days", 5001), stats);
  assert.equal(getCachedObservation(storage, "1 km, 90 days", 5001), undefined);
  assert.equal(getCachedObservation(storage, "500 m, 30 days", 5001), undefined);
  assert.equal(getCachedObservation(storage, "500 m, 90 days", 305000), undefined);
});

test("unavailable storage has no effect on a successful analysis", () => {
  const storage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(getCachedObservation(storage, "key"), undefined);
  assert.doesNotThrow(() => rememberObservation(storage, "key", stats));
});

test("raster caching reuses only exact keys and releases expired or evicted blob URLs", () => {
  const cache = new MapRasterCache();
  const blob = new Blob(["raster"]);
  const key = "bounds=A&layer=NDVI&from=2026-08-26";
  const first = cache.store(key, blob, 0);
  assert.equal(cache.get(key, 1), first);
  assert.equal(cache.get(key.replace("bounds=A", "bounds=B"), 1), undefined);
  assert.equal(cache.get(key.replace("NDVI", "NDWI"), 1), undefined);
  assert.equal(cache.get(key.replace("2026-08-26", "2026-08-27"), 1), undefined);
  for (let i = 0; i < 8; i++) cache.store(String(i), blob, 0);
  assert.equal(resolveObjectURL(first), undefined);
  const last = cache.get("7", 10);
  assert.ok(last);
  assert.equal(cache.get("7", 300000), undefined);
  assert.equal(resolveObjectURL(last), undefined);
  const another = cache.get("6", 10);
  cache.clear();
  assert.equal(resolveObjectURL(another), undefined);
});
