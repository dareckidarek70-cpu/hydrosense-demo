import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { chartRuns, chartScale, summarizeWeather, weatherRequestKey } from "../lib/weather/panel-data.ts";
import { createWeatherPanelClient } from "../lib/weather/panel-client.ts";

const period = { from: "2024-08-16T00:00:00.000Z", to: "2024-08-17T00:00:00.000Z" };
const key = weatherRequestKey([52.0423, 23.0804], period);
const entry = (date, precipitationMm, temperatures = [null, null, null]) => ({
  date, precipitationMm, temperatureMinC: temperatures[0], temperatureMaxC: temperatures[1],
  temperatureMeanC: temperatures[2], status: "partial",
});

function responseFor(url) {
  const params = new URLSearchParams(url.split("?")[1]);
  const from = params.get("from"), to = params.get("to");
  return Response.json({
    timezone: "UTC",
    point: { latitude: Number(params.get("lat")), longitude: Number(params.get("lng")) },
    requested: { from, to, days: 1 },
    archive: { typicalDelayDays: 5, queryCutoff: to },
    availability: { daysWithData: 1, firstDay: from, lastDay: to, completeDays: 1, status: "complete" },
    days: [entry(from, 0.3, [18.2, 31.6, 25])],
  });
}

test("weather follows the report's inclusive UTC date range, not its radius, language or theme", () => {
  assert.equal(key, "/api/weather/history?lat=52.0423&lng=23.0804&from=2024-08-16&to=2024-08-16");
  assert.equal(weatherRequestKey([52.0423, 23.0804], { ...period }), key);
  assert.notEqual(weatherRequestKey([45.41, 12.3], period), key);
  assert.equal(weatherRequestKey([52.04, 23.08], { ...period, from: "2024-08-16T01:00:00Z" }), null);
  assert.equal(weatherRequestKey([89, 23.08], period), null);
  assert.equal(weatherRequestKey([52.04, 23.08], { from: "2022-01-01T00:00:00Z", to: "2024-01-01T00:00:00Z" }), null);
});

test("weather cards count each measurement independently and missing dates break a low-rain spell", () => {
  const days = [
    entry("2024-01-01", 0, [-4, 3, 0]),
    entry("2024-01-02", .6, [null, 4, null]),
    entry("2024-01-03", null, [-1, null, null]),
    entry("2024-01-04", .9, [-3, 5, 2]),
    entry("2024-01-06", .2),
    entry("2024-01-07", 1),
    entry("2024-01-08", .7),
  ];
  const s = summarizeWeather(days);
  assert.ok(Math.abs(s.precipitation - 3.4) < 1e-8);
  assert.deepEqual({ ...s, precipitation: 3.4 }, {
    precipitation: 3.4, mean: 1, min: -4, max: 5, longest: 2,
    rainDays: 6, meanDays: 2, minDays: 3, maxDays: 3,
  });
  assert.equal(summarizeWeather([entry("2024-01-01", 1)]).longest, 0);
  const zero = summarizeWeather([entry("2024-01-01", 0)]);
  assert.equal(zero.precipitation, 0);
  assert.equal(zero.longest, 1);
  const missing = summarizeWeather([entry("2024-01-01", null)]);
  assert.equal(missing.longest, null);
  assert.equal(missing.precipitation, null);
  assert.equal(missing.mean, null);
});

test("temperature line segments do not bridge null values or skipped dates, at either end of the scale", () => {
  const days = [
    entry("2024-01-01", 0, [-5, 3, -2]),
    entry("2024-01-02", null, [-4, 4, null]),
    entry("2024-01-03", 1, [-1, 6, 2]),
    entry("2024-01-04", 20, [0, 12, 6]),
    entry("2024-01-06", null, [1, 13, 7]),
  ];
  assert.deepEqual(chartRuns(days, "temperatureMeanC").map((run) => run.map(({ index }) => index)), [[0], [2, 3], [4]]);
  assert.deepEqual(chartRuns(days, "temperatureMinC").map((run) => run.length), [4, 1]);
  const temp = chartScale(days, ["temperatureMinC", "temperatureMaxC"]);
  assert.ok(temp.bottom <= -5 && temp.top >= 13);
  assert.ok(temp.ticks.includes(0));
  const rain = chartScale(days, ["precipitationMm"], true);
  assert.equal(rain.bottom, 0);
  assert.ok(rain.top >= 20);
  assert.equal(chartScale([entry("2024-01-01", null)], ["precipitationMm"], true), null);
});

test("client caches only exact successful queries and rejects a mismatched weather payload", async () => {
  let calls = 0, at = 0;
  const load = createWeatherPanelClient({ now: () => at, fetcher: async (path) => { calls++; return responseFor(path); } });
  const signal = new AbortController().signal;
  assert.equal((await load(key, signal)).data.days[0].precipitationMm, 0.3);
  assert.ok((await load(key, signal)).data);
  assert.equal(calls, 1);
  assert.ok((await load(weatherRequestKey([45, 12], period), signal)).data);
  assert.equal(calls, 2);
  at += 5 * 60_000 + 1;
  assert.ok((await load(key, signal)).data);
  assert.equal(calls, 3);
  const mismatch = createWeatherPanelClient({ fetcher: async () => responseFor(weatherRequestKey([45, 12], period)) });
  assert.deepEqual(await mismatch(key, signal), { error: "weatherProvider" });
});

test("rapid changes cancel stale point/range responses even if fetch ignores the signal", async () => {
  const nextWindow = { from: "2024-08-17T00:00:00.000Z", to: "2024-08-18T00:00:00.000Z" };
  const next = weatherRequestKey([45, 12], nextWindow);
  let release;
  let cancelledSignal;
  const load = createWeatherPanelClient({ fetcher: async (path, { signal }) => {
    if (path === key) {
      cancelledSignal = signal;
      await new Promise((resolve) => { release = resolve; });
    }
    return responseFor(path);
  } });
  const old = new AbortController();
  const pending = load(key, old.signal);
  old.abort();
  assert.equal(cancelledSignal.aborted, true);
  const updated = await load(next, new AbortController().signal);
  assert.equal(updated.data.point.latitude, 45);
  assert.equal(updated.data.requested.from, "2024-08-17");
  release();
  assert.equal(await pending, null);
});

test("timeout, provider failure, invalid range and denied access each have their own UI state", async () => {
  const signal = new AbortController().signal;
  for (const [status, code, expected] of [
    [400, "weather_invalid_query", "weatherInvalid"],
    [404, "weather_preview_only", "weatherAccess"],
    [502, "weather_provider_unavailable", "weatherProvider"],
    [504, "weather_provider_timeout", "weatherTimeout"],
  ]) {
    const load = createWeatherPanelClient({ fetcher: async () => Response.json({ error: code }, { status }) });
    assert.deepEqual(await load(key, signal), { error: expected });
  }
  const stalled = createWeatherPanelClient({ timeoutMs: 8, fetcher: async (_, { signal }) =>
    new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })) });
  assert.deepEqual(await stalled(key, signal), { error: "weatherTimeout" });
});

test("Retry-After suppresses new requests across range and point changes without polling", async () => {
  let at = 0, calls = 0;
  const load = createWeatherPanelClient({ now: () => at, fetcher: async (path) => {
    if (++calls === 1) return Response.json({ error: "weather_provider_limited" }, { status: 503, headers: { "Retry-After": "37" } });
    return responseFor(path);
  } });
  const signal = new AbortController().signal;
  const limit = { error: "weatherProviderRate", retryAt: 37000 };
  assert.deepEqual(await load(key, signal), limit);
  const other = weatherRequestKey([45, 12], period);
  assert.deepEqual(await load(other, signal), limit);
  assert.equal(calls, 1);
  at = 37001;
  assert.ok((await load(other, signal)).data);
  assert.equal(calls, 2);
});

test("HTTP-date Retry-After on partial success preserves the series and blocks another range", async () => {
  let at = Date.parse("2025-04-01T00:00:00Z"), calls = 0;
  const retryAt = at + 5_400_000;
  const load = createWeatherPanelClient({ now: () => at, fetcher: async (path) => {
    const data = await responseFor(path).json();
    if (++calls !== 1) return Response.json(data);
    data.failedSeries = "temperature";
    data.availability.status = "partial";
    [data.days[0].temperatureMinC, data.days[0].temperatureMaxC, data.days[0].temperatureMeanC] = [null, null, null];
    return Response.json(data, { headers: { "Retry-After": new Date(retryAt).toUTCString() } });
  } });
  const signal = new AbortController().signal;
  const other = weatherRequestKey([45, 12], period);
  assert.equal((await load(key, signal)).data.days[0].precipitationMm, 0.3);
  at += 3600_000;
  assert.deepEqual(await load(other, signal), { error: "weatherProviderRate", retryAt });
  assert.equal((await load(key, signal)).data.failedSeries, "temperature");
  assert.equal(calls, 1);
  at = retryAt;
  assert.equal((await load(other, signal)).data.failedSeries, undefined);
  assert.equal(calls, 2);
});

test("local 429 observes a short cooldown and loss of connection has no automatic retries", async () => {
  let at = 1000, calls = 0;
  const load = createWeatherPanelClient({ now: () => at, fetcher: async (path) => {
    if (++calls === 1) return Response.json({ error: "weather_overloaded" }, { status: 429, headers: { "Retry-After": "3" } });
    if (calls === 2) throw new TypeError("Network unreachable");
    return responseFor(path);
  } });
  const signal = new AbortController().signal;
  assert.deepEqual(await load(key, signal), { error: "weatherRate", retryAt: 4000 });
  at = 3999;
  assert.equal((await load(key, signal)).error, "weatherRate");
  assert.equal(calls, 1);
  at = 4000;
  assert.deepEqual(await load(key, signal), { error: "weatherNetwork" });
  assert.equal(calls, 2);
  assert.ok((await load(key, signal)).data);
  assert.equal(calls, 3);
});

test("weather plot signals and legend color retain contrast in both approved themes", () => {
  const css = readFileSync(new URL("../app/weather.css", import.meta.url), "utf8");
  const themes = readFileSync(new URL("../app/themes.css", import.meta.url), "utf8");
  const luminance = (hex) => hex.slice(1).match(/../g).reduce((sum, value, i) => {
    const s = parseInt(value, 16) / 255;
    return sum + [0.2126, 0.7152, 0.0722][i] * (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
  }, 0);
  const get = (block, prop) => block.match(new RegExp(`--${prop}: (#[0-9a-f]{6});`))[1];
  for (const theme of [themes.match(/:root \{([^}]+)}/)[1], themes.match(/:root\[data-theme="graphite"\] \{([^}]+)}/)[1]]) {
    const background = luminance(get(theme, "surface"));
    for (const color of [...["primary", "primary-hover"].map((name) => get(theme, name)),
      ...["weather-min", "weather-max"].map((name) => get(css, name))]) {
      assert.ok((background + 0.05) / (luminance(color) + 0.05) >= 3, color);
    }
  }
  assert.match(css, /weather-series-min[^\n]+stroke-dasharray/);
  assert.match(css, /weather-series-mean[^\n]+stroke-dasharray/);
});
