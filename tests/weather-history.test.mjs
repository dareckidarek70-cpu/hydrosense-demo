import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWeatherHistoryQuery } from "../lib/weather/history-request.ts";
import { createWeatherHistoryHandler } from "../lib/weather/history-service.ts";
import { maxProviderBytes, parseArchiveSeries } from "../lib/weather/open-meteo.ts";

const now = () => new Date("2025-04-01T01:30:00+02:00");
const endpoint = "https://hydrosense.example/api/weather/history";
const request = (query = "from=2024-08-16&to=2024-08-18", lat = "52.0423") =>
  new Request(`${endpoint}?lat=${lat}&lng=23.0804&${query}`);
const range = { from: "2024-08-16", to: "2024-08-18" };
const dates = ["2024-08-16", "2024-08-17", "2024-08-18"];

function payload(model, time = dates) {
  const temperature = model === "era5_land";
  return {
    latitude: 52, longitude: temperature ? 23.1 : 23, timezone: "GMT", utc_offset_seconds: 0,
    daily_units: {
      time: "iso8601",
      ...(temperature ? { temperature_2m_min: "°C", temperature_2m_max: "°C", temperature_2m_mean: "°C" }
        : { precipitation_sum: "mm" }),
    },
    daily: {
      time: [...time],
      ...(temperature ? {
        temperature_2m_min: time.map(() => 12),
        temperature_2m_max: time.map(() => 24),
        temperature_2m_mean: time.map(() => 17.1),
      } : { precipitation_sum: time.map((_, index) => index === 0 ? 0 : 1.2) }),
    },
  };
}

function stub(calls, alter = (data) => data) {
  return async (url, options) => {
    assert.equal(url.origin, "https://archive-api.open-meteo.com");
    assert.equal(url.pathname, "/v1/archive");
    assert.equal(url.searchParams.get("timezone"), "GMT");
    assert.equal(url.searchParams.get("cell_selection"), "nearest");
    assert.equal(url.searchParams.get("elevation"), "nan");
    assert.equal(url.searchParams.has("apikey"), false);
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    calls.push(url);
    const model = url.searchParams.get("models");
    assert.ok(["era5_land", "era5"].includes(model));
    const from = Date.parse(url.searchParams.get("start_date"));
    const to = Date.parse(url.searchParams.get("end_date"));
    const time = Array.from({ length: (to - from) / 86400000 + 1 }, (_, i) => new Date(from + i * 86400000).toISOString().slice(0, 10));
    return Response.json(alter(payload(model, time), model));
  };
}

test("weather query uses complete UTC days and preserves 30, 90 and 365-day presets", () => {
  for (const days of [30, 90, 365]) {
    const input = parseWeatherHistoryQuery(new URL(request(`days=${days}`).url), now());
    assert.equal(input.requested.days, days);
    assert.equal(input.requested.to, "2025-03-30"); // The current UTC date is March 31, not April 1.
    assert.equal(input.queried.to, "2025-03-26");
  }
  const beforeMidnight = parseWeatherHistoryQuery(new URL(request("days=30").url), new Date("2025-03-30T23:59:59Z"));
  const afterMidnight = parseWeatherHistoryQuery(new URL(request("days=30").url), new Date("2025-03-31T00:00:00Z"));
  assert.equal(beforeMidnight.requested.to, "2025-03-29");
  assert.equal(afterMidnight.requested.to, "2025-03-30");
  const leapYear = parseWeatherHistoryQuery(new URL(request("from=2024-01-01&to=2024-12-31").url), now());
  assert.equal(leapYear.requested.days, 366);
  assert.equal(parseWeatherHistoryQuery(new URL(request("from=2024-02-29&to=2024-02-29").url), now()).requested.days, 1);
});

test("invalid coordinates, ambiguous parameters and invalid or oversized dates never call the provider", async () => {
  const calls = [];
  const get = createWeatherHistoryHandler({ now, fetcher: stub(calls) });
  const bad = [
    "lat=84.001&lng=23", "lat=52&lng=-180.001", "lat=&lng=23", "lat=5e1&lng=23",
    "lat=NaN&lng=23", "lat=52&lng=23&lat=53", "lat=52&lng=23&timezone=Europe/Warsaw",
    "lat=52&lng=23&days=31", "lat=52&lng=23&from=2024-08-16",
    "lat=52&lng=23&from=2024-08-16&to=2024-08-18&days=30",
    "lat=52&lng=23&from=2024-02-30&to=2024-03-03",
    "lat=52&lng=23&from=2024-08-18&to=2024-08-16",
    "lat=52&lng=23&from=2024-01-01&to=2025-01-01",
    "lat=52&lng=23&from=2016-12-31&to=2017-01-01",
    "lat=52&lng=23&from=2025-03-30&to=2025-03-31",
    "lat=52&lng=23&from=2024-08-16T00:00:00Z&to=2024-08-18",
  ];
  for (const query of [...bad, "lat=52&lng=23&" + "x".repeat(1100)]) {
    const response = await get(new Request(endpoint + "?" + query));
    assert.equal(response.status, 400, query);
    assert.deepEqual(await response.json(), { error: "weather_invalid_query" });
  }
  assert.equal(calls.length, 0);
  const valid = parseWeatherHistoryQuery(new URL(endpoint + "?lat=-84&lng=180"), now());
  assert.deepEqual(valid.point, { latitude: -84, longitude: 180 });
});

test("GET merges actual provider shapes by date using distinct model IDs and grid metadata", async () => {
  const calls = [];
  const get = createWeatherHistoryHandler({ now, fetcher: stub(calls) });
  const response = await get(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const weather = await response.json();
  assert.equal(weather.source.kind, "meteorological-reanalysis");
  assert.equal(weather.source.license, "CC BY 4.0");
  assert.equal(weather.timezone, "UTC");
  assert.deepEqual(weather.point, { latitude: 52.0423, longitude: 23.0804 });
  assert.deepEqual(weather.queried, range);
  assert.equal(weather.series.temperature.model, "ERA5-Land");
  assert.equal(weather.series.temperature.unit, "°C");
  assert.equal(weather.series.precipitation.model, "ERA5");
  assert.equal(weather.series.precipitation.gridDegrees, 0.25);
  assert.deepEqual(weather.series.precipitation.gridPoint, { latitude: 52, longitude: 23 });
  assert.deepEqual(weather.days[0], {
    date: dates[0], precipitationMm: 0, temperatureMinC: 12, temperatureMaxC: 24, temperatureMeanC: 17.1, status: "complete",
  });
  assert.deepEqual(weather.availability, {
    status: "complete", firstDay: dates[0], lastDay: dates[2], daysWithData: 3, completeDays: 3,
  });
  assert.equal(calls.length, 2);
  for (const url of calls) {
    assert.equal(url.searchParams.get("latitude"), "52.0423");
    assert.equal(url.searchParams.get("longitude"), "23.0804");
    assert.equal(url.searchParams.get("daily"), url.searchParams.get("models") === "era5"
      ? "precipitation_sum" : "temperature_2m_min,temperature_2m_max,temperature_2m_mean");
  }
});

test("missing dates, nulls and absent optional mean remain gaps rather than zeroes or estimates", async () => {
  const get = createWeatherHistoryHandler({ now, fetcher: stub([], (data, model) => {
    if (model === "era5_land") {
      data.daily = { time: [dates[0], dates[2]], temperature_2m_min: [10, 12], temperature_2m_max: [17, null] };
    } else {
      data.daily = { time: [dates[0], dates[2]], precipitation_sum: [null, 0] };
    }
    return data;
  }) });
  const weather = await (await get(request())).json();
  assert.equal(weather.availability.status, "partial");
  assert.equal(weather.availability.completeDays, 0);
  assert.deepEqual(weather.days.map(({ status, precipitationMm, temperatureMeanC }) => [status, precipitationMm, temperatureMeanC]),
    [["partial", null, null], ["missing", null, null], ["partial", 0, null]]);
});

test("a provider mean without daily extremes, or outside them, is not reported as a daily mean", async () => {
  const get = createWeatherHistoryHandler({ now, fetcher: stub([], (data, model) => {
    if (model === "era5_land") {
      data.daily.temperature_2m_min = [null, 12, 12];
      data.daily.temperature_2m_mean = [13.2, 26.5, 17.1];
    }
    return data;
  }) });
  const weather = await (await get(request())).json();
  assert.deepEqual(weather.days.map(({ temperatureMeanC, status }) => [temperatureMeanC, status]),
    [[null, "partial"], [null, "partial"], [17.1, "complete"]]);
});

test("non-empty requested range can have no provider data or no queryable dates", async () => {
  const calls = [];
  const get = createWeatherHistoryHandler({ now, fetcher: stub(calls, (_, model) => payload(model, [])) });
  const missing = await (await get(request())).json();
  assert.equal(missing.availability.status, "no-data");
  assert.equal(missing.availability.firstDay, null);
  assert.equal(missing.days[0].status, "missing");
  const recent = await (await get(request("from=2025-03-27&to=2025-03-30"))).json();
  assert.equal(recent.queried, null);
  assert.equal(recent.availability.lastDay, null);
  assert.ok(recent.days.every(({ status }) => status === "not-queried-recent"));
  assert.equal(calls.length, 2);
});

test("archive gap and fixed GMT alignment are explicit, even across the European DST transition", async () => {
  const calls = [];
  const get = createWeatherHistoryHandler({ now, fetcher: stub(calls) });
  const weather = await (await get(request("from=2025-03-25&to=2025-03-30"))).json();
  assert.deepEqual(weather.queried, { from: "2025-03-25", to: "2025-03-26" });
  assert.equal(weather.availability.lastDay, "2025-03-26");
  assert.equal(weather.availability.completeDays, 2);
  assert.equal(weather.days.length, 6);
  assert.equal(weather.days.at(-1).date, "2025-03-30");
  assert.equal(weather.days.at(-1).status, "not-queried-recent");
  assert.ok(calls.every((url) => url.searchParams.get("end_date") === "2025-03-26"));
});

test("the parser rejects wrong units, non-UTC offsets, malformed dates, shifted arrays and oversized data", async () => {
  for (const change of [
    (data) => { data.daily_units.precipitation_sum = "inch"; },
    (data) => { data.utc_offset_seconds = 3600; },
    (data) => { data.daily.time[0] = "2024-08-15"; },
    (data) => { data.daily.time[0] = data.daily.time[1]; },
    (data) => { data.daily.precipitation_sum.pop(); },
    (data) => { data.daily.precipitation_sum[0] = -1; },
  ]) {
    const data = payload("era5");
    change(data);
    assert.throws(() => parseArchiveSeries(data, "precipitation", range), /weather_invalid_provider_response/);
  }
  for (const fetcher of [
    async () => new Response(" ".repeat(maxProviderBytes + 1), { headers: { "Content-Type": "application/json" } }),
    async () => new Response("{}", { headers: { "Content-Length": String(maxProviderBytes + 1) } }),
    async () => new Response("not-json"),
  ]) {
    const response = await createWeatherHistoryHandler({ now, fetcher })(request());
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "weather_invalid_provider_response" });
  }
});

test("HTTP errors, provider limits and shared deadline have distinct safe behavior", async () => {
  const unavailable = await createWeatherHistoryHandler({ now, fetcher: async () => new Response("private diagnostics", { status: 502 }) })(request());
  assert.equal(unavailable.status, 502);
  assert.deepEqual(await unavailable.json(), { error: "weather_provider_unavailable" });

  let attempts = 0;
  const limited = createWeatherHistoryHandler({ now, fetcher: async () => {
    attempts++;
    return new Response(null, { status: 429, headers: { "Retry-After": "37" } });
  } });
  for (const i of [0, 1]) {
    const rate = await limited(request(undefined, String(52 + i)));
    assert.equal(rate.status, 503);
    assert.equal(rate.headers.get("Retry-After"), "37");
    assert.deepEqual(await rate.json(), { error: "weather_provider_limited" });
  }
  assert.equal(attempts, 2);

  const stalled = createWeatherHistoryHandler({ now, timeoutMs: 8, fetcher: async (_, { signal }) =>
    new Promise((resolve, reject) => {
      const watchdog = setTimeout(() => resolve(Response.json({})), 1000);
      signal.addEventListener("abort", () => { clearTimeout(watchdog); reject(signal.reason); }, { once: true });
    }) });
  const timeout = await stalled(request());
  assert.equal(timeout.status, 504);
  assert.deepEqual(await timeout.json(), { error: "weather_provider_timeout" });
});

test("requests share an in-flight series and fresh weather requests stop at the local quota", async () => {
  const calls = [];
  const get = createWeatherHistoryHandler({ now, fetcher: stub(calls) });
  const [first, same] = await Promise.all([get(request()), get(request(undefined, "52.04230"))]);
  assert.equal(calls.length, 2);
  assert.deepEqual(await first.json(), await same.json());
  for (const lat of ["51", "53", "54"]) assert.equal((await get(request(undefined, lat))).status, 200);
  const limited = await get(request(undefined, "55"));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "60");
  assert.equal((await get(request())).status, 200);
  assert.equal(calls.length, 8);
});

test("retain validated rain-only and temperature-only results when the other model fails", async () => {
  for (const [failed, status, failedSeries] of [["era5_land", 502, "temperature"], ["era5", 504, "precipitation"]]) {
    let at = now().getTime(), calls = 0;
    const get = createWeatherHistoryHandler({ now: () => new Date(at), fetcher: async (url) => {
      const model = url.searchParams.get("models");
      calls++;
      return model === failed && at === now().getTime() ? new Response(null, { status }) : Response.json(payload(model));
    } });
    const response = await get(request());
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.failedSeries, failedSeries);
    assert.equal(data.availability.status, "partial");
    assert.equal(data.availability.daysWithData, 3);
    assert.equal(data.availability.completeDays, 0);
    assert.equal(data.series[failedSeries].gridPoint, null);
    assert.equal(data.days[0].precipitationMm, failedSeries === "precipitation" ? null : 0);
    assert.equal(data.days[0].temperatureMeanC, failedSeries === "temperature" ? null : 17.1);
    assert.deepEqual(await (await get(request())).json(), data);
    assert.equal(calls, 2);
    at += 60_001;
    assert.equal((await (await get(request())).json()).availability.status, "complete");
    assert.equal(calls, 4);
  }
});

test("upstream 503 Retry-After applies even when a partner series succeeded", async () => {
  const start = now().getTime();
  let at = start, calls = 0;
  const get = createWeatherHistoryHandler({ now: () => new Date(at), fetcher: async (url) => {
    calls++;
    const model = url.searchParams.get("models");
    return model === "era5_land" && at < start + 5400_000
      ? new Response(null, { status: 503, headers: { "Retry-After": new Date(start + 5400_000).toUTCString() } })
      : Response.json(payload(model));
  } });
  const partial = await get(request());
  assert.equal(partial.status, 200);
  assert.equal(partial.headers.get("Retry-After"), "5400");
  assert.equal((await partial.json()).days[0].precipitationMm, 0);
  at += 3700_000;
  assert.equal((await get(request())).headers.get("Retry-After"), "1700");
  const other = await get(request(undefined, "51"));
  assert.equal(other.status, 503);
  assert.equal(other.headers.get("Retry-After"), "1700");
  assert.equal(calls, 2);
  at = start + 5400_000;
  assert.equal((await (await get(request())).json()).availability.status, "complete");
  assert.equal(calls, 4);
});

test("a successful but empty model cannot turn a failed pair into data", async () => {
  for (const [status, expected] of [[503, 502], [504, 504]]) {
    const get = createWeatherHistoryHandler({ now, fetcher: async (url) => url.searchParams.get("models") === "era5"
      ? Response.json(payload("era5", [])) : new Response(null, { status }) });
    assert.equal((await get(request())).status, expected);
  }
});

test("a production-disabled preview endpoint does not contact Open-Meteo", async () => {
  const calls = [];
  const response = await createWeatherHistoryHandler({ now, enabled: () => false, fetcher: stub(calls) })(request());
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "weather_preview_only" });
  assert.equal(calls.length, 0);
});
