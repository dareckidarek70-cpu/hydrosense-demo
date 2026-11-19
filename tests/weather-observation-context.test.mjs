import assert from "node:assert/strict";
import { test } from "node:test";
import {
  asWeatherWindow, planPrecedingWeather, precedingWeatherWindows, summarizePrecedingWeather,
} from "../lib/weather/observation-context.ts";
import { createWeatherPanelClient } from "../lib/weather/panel-client.ts";
import { weatherRequestKey } from "../lib/weather/panel-data.ts";

const biala = [52.0423, 23.0804];
const month = { from: "2026-08-01", to: "2026-08-31" };
const day = (date, precipitationMm, temperatureMeanC) => ({
  date, precipitationMm, temperatureMeanC,
  temperatureMinC: temperatureMeanC === null ? null : temperatureMeanC - 5,
  temperatureMaxC: temperatureMeanC === null ? null : temperatureMeanC + 5,
  status: "partial",
});

test("date arithmetic uses UTC days and excludes the Sentinel-2 day, including leap years and DST", () => {
  assert.deepEqual(precedingWeatherWindows("2024-03-01"), {
    seven: { from: "2024-02-23", to: "2024-02-29" },
    thirty: { from: "2024-01-31", to: "2024-02-29" },
  });
  assert.deepEqual(precedingWeatherWindows("2025-03-31").seven, { from: "2025-03-24", to: "2025-03-30" });
  assert.deepEqual(precedingWeatherWindows("2026-01-01").thirty, { from: "2025-12-02", to: "2025-12-31" });
  for (const invalid of ["2025-02-29", "2024-06-31", "2024-01-01T01:00:00+01:00", "arbitrary"]) {
    assert.equal(precedingWeatherWindows(invalid), null);
  }
  assert.deepEqual(asWeatherWindow(precedingWeatherWindows("2024-03-01").seven), {
    from: "2024-02-23T00:00:00.000Z", to: "2024-03-01T00:00:00.000Z",
  });
});

test("rain and temperature each report their own missing count; zero is a real value", () => {
  const windows = precedingWeatherWindows("2026-08-16");
  const chart = [day("2026-08-09", 0, 17), day("2026-08-10", null, 19), day("2026-08-15", 2, null),
    day("2026-08-16", 30, 31), day("2026-08-17", 60, 32)];
  const extra = [day("2026-07-16", 300, 11), day("2026-07-17", 4, 11), day("2026-08-09", 4, 15)];
  const summary = summarizePrecedingWeather(windows, chart, extra);
  assert.deepEqual(summary.rainSeven, { range: windows.seven, total: 7, available: 2, missing: 5, value: 2 });
  assert.deepEqual(summary.rainThirty, { range: windows.thirty, total: 30, available: 3, missing: 27, value: 6 });
  assert.deepEqual(summary.temperatureSeven, { range: windows.seven, total: 7, available: 2, missing: 5, value: 18 });
  assert.equal(summarizePrecedingWeather(windows, [chart[0]]).rainSeven.value, 0);
  const empty = summarizePrecedingWeather(windows, [day("2026-08-12", null, null), chart[3]]);
  assert.equal(empty.rainSeven.value, null);
  assert.equal(empty.rainThirty.missing, 30);
  assert.equal(empty.temperatureSeven.value, null);
});

test("switching the observation changes metrics while a single fixed prefix covers each earlier day", () => {
  const outcomes = ["2026-08-26", "2026-08-16", "2026-08-01"].map(precedingWeatherWindows);
  const plans = outcomes.map(({ thirty }) => planPrecedingWeather(thirty, month, month.from));
  assert.deepEqual(plans, [
    { from: "2026-07-02", to: "2026-07-31" }, { from: "2026-07-02", to: "2026-07-31" }, { from: "2026-07-02", to: "2026-07-31" },
  ]);
  const loaded = [day("2026-08-15", 10, 19), day("2026-08-16", 12, 20), day("2026-08-25", 7, 17)];
  assert.equal(summarizePrecedingWeather(outcomes[0], loaded).rainSeven.value, 7);
  assert.equal(summarizePrecedingWeather(outcomes[1], loaded).rainSeven.value, 10);
  assert.equal(planPrecedingWeather(precedingWeatherWindows("2026-08-31").thirty, month, month.from), null);
});

test("an independent weather range only supplements uncovered dates and never requests pre-archive dates", () => {
  const target = precedingWeatherWindows("2026-08-16").thirty;
  assert.deepEqual(planPrecedingWeather(target, { from: "2026-07-17", to: "2026-08-10" }, month.from),
    { from: "2026-08-11", to: "2026-08-15" });
  assert.deepEqual(planPrecedingWeather(target, { from: "2026-08-01", to: "2026-08-10" }, month.from), target);
  assert.deepEqual(planPrecedingWeather(target, { from: "2026-09-01", to: "2026-09-08" }, month.from), target);
  const oldest = planPrecedingWeather(precedingWeatherWindows("2017-01-05").thirty, null, "2017-01-01");
  assert.deepEqual(oldest, { from: "2017-01-01", to: "2017-01-04" });
  assert.equal(planPrecedingWeather(precedingWeatherWindows("2017-01-01").thirty, null, "2017-01-01"), null);
});

test("the fixed prefix is served from the same weather client cache for successive observations", async () => {
  let calls = 0;
  const load = createWeatherPanelClient({
    fetcher: async (url) => {
      calls++;
      const params = new URLSearchParams(url.split("?")[1]);
      const from = params.get("from"), to = params.get("to");
      const days = Array.from({ length: 30 }, (_, i) => day(new Date(Date.parse(from) + i * 86_400_000).toISOString().slice(0, 10), 0, 15));
      return Response.json({ timezone: "UTC", point: { latitude: biala[0], longitude: biala[1] },
        requested: { from, to, days: 30 }, availability: {}, archive: {}, days });
    },
  });
  for (const date of ["2026-08-26", "2026-08-16", "2026-08-01"]) {
    const range = planPrecedingWeather(precedingWeatherWindows(date).thirty, month, month.from);
    const result = await load(weatherRequestKey(biala, asWeatherWindow(range)), new AbortController().signal);
    assert.ok(result.data);
  }
  assert.equal(calls, 1);
});

test("denied archive access cannot become a zero precipitation reading", async () => {
  const load = createWeatherPanelClient({
    fetcher: async () => Response.json({ error: "weather_preview_only" }, { status: 404 }),
  });
  const windows = precedingWeatherWindows("2026-08-16");
  const result = await load(weatherRequestKey(biala, asWeatherWindow(windows.thirty)), new AbortController().signal);
  assert.deepEqual(result, { error: "weatherAccess" });
  const context = summarizePrecedingWeather(windows);
  assert.equal(context.rainSeven.value, null);
  assert.equal(context.rainThirty.missing, 30);
  assert.equal(context.temperatureSeven.missing, 7);
});
