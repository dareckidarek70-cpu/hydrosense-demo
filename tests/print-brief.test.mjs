import assert from "node:assert/strict";
import { test } from "node:test";
import { reportMapLayers, reportMapUrl } from "../lib/copernicus/report-map.ts";
import { waitForPrintLayers } from "../lib/print-brief.ts";

test("the four export layers keep the same observation interval and geometry", () => {
  const area = { coordinates: [52.0423, 23.0804], radiusMeters: 500 };
  const day = {
    from: "2026-08-26T00:00:00Z", to: "2026-08-27T00:00:00Z", clearCoverage: 1, clearPixels: 100,
    ndvi: 0.56, ndwi: -0.54, ndmi: 0.11,
  };
  const urls = reportMapLayers.map(layer => new URL(reportMapUrl(area, day, layer), "https://example.test"));
  assert.deepEqual(urls.map(url => url.searchParams.get("layer")), ["TRUE_COLOR", "NDVI", "NDWI", "MOISTURE_INDEX"]);
  for (const url of urls) {
    assert.equal(url.searchParams.get("from"), day.from);
    assert.equal(url.searchParams.get("to"), day.to);
    assert.equal(url.searchParams.get("format"), "webp");
    url.searchParams.delete("layer");
    assert.equal(url.search, urls[0].search);
  }
  assert.equal(reportMapUrl(area, null), null);
  assert.equal(reportMapUrl(area, { ...day, clearCoverage: 0 }), null);
});

test("printing waits until every layer settles or the deadline aborts", async () => {
  const originalObserver = globalThis.MutationObserver;
  let notify;
  let disconnected = 0;
  globalThis.MutationObserver = class {
    constructor(callback) { notify = callback; }
    observe() {}
    disconnect() { disconnected++; }
  };
  try {
    let pending = 3;
    const root = { querySelector: () => pending > 0 };
    let ready = false;
    const print = waitForPrintLayers(root, new AbortController().signal).then(() => { ready = true; });
    pending--;
    notify();
    await Promise.resolve();
    assert.equal(ready, false);
    pending = 0;
    notify();
    await print;
    assert.equal(ready, true);

    pending = 1;
    const abort = new AbortController();
    const partial = waitForPrintLayers(root, abort.signal);
    abort.abort();
    await partial;
    assert.equal(disconnected, 2);
  } finally {
    if (originalObserver) globalThis.MutationObserver = originalObserver;
    else delete globalThis.MutationObserver;
  }
});
