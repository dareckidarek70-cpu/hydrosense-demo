import assert from "node:assert/strict";
import { test } from "node:test";
import { dateObservationWindow } from "../lib/copernicus/request.ts";
import { demoReportHref, reportHref, withReportPeriod } from "../lib/report-navigation.ts";

test("keeps the exact coordinates, radius and both observed report modes in navigation", () => {
  for (const mode of ["custom", "water"]) {
    const search = `mode=${mode}&lat=52.0423&lng=23.0804&radius=1000&from=2026-08-02&to=2026-08-31`;
    assert.equal(reportHref(new URLSearchParams(search)), `/results?${search}`);
  }
});

test("uses an explicit demo URL, keeps A-D distinct and does not remember invalid observed reports", () => {
  assert.equal(reportHref(new URLSearchParams()), demoReportHref);
  for (const parcel of ["parcel-a", "parcel-b", "parcel-c", "parcel-d"]) {
    const query = `parcel=${parcel}`;
    assert.equal(reportHref(new URLSearchParams(query)), `/results?${query}`);
  }
  assert.equal(reportHref(new URLSearchParams("mode=custom&lat=86&lng=23.0804")), null);
  assert.equal(reportHref(new URLSearchParams("mode=water&lat=52.0423&lng=23.0804&from=2026-08-02")), null);
});

test("applies a new inclusive UTC period without altering other URL parameters", () => {
  const previous = new URLSearchParams("mode=water&lat=45.523244962&lng=12.221163987&radius=500&from=2026-08-02&to=2026-08-31");
  const period = dateObservationWindow("2025-12-20", "2026-01-08");
  const updated = withReportPeriod(previous, period);
  assert.equal(updated.toString(), "mode=water&lat=45.523244962&lng=12.221163987&radius=500&from=2025-12-20&to=2026-01-08");
  assert.deepEqual(dateObservationWindow(updated.get("from"), updated.get("to")), period);
  assert.equal(previous.get("to"), "2026-08-31");
});
