import assert from "node:assert/strict";
import test from "node:test";
import { answerCurrentReport } from "../lib/report-chat-answer.ts";
import { reportChatKey, synthesizeCurrentReport } from "../lib/report-chat.ts";
import { soilPreviewAt } from "../lib/soil-preview.ts";

const biala = [52.0423, 23.0804];
const geometry = { type: "PointBuffer", coordinates: biala, radiusMeters: 500 };
const period = { from: "2026-08-01T00:00:00Z", to: "2026-09-01T00:00:00Z" };
const reference = { geometry, period, day: "2026-08-26" };
const targets = result => result.evidenceLinks.map(({ target }) => target);
const sentinelTarget = "report-sentinel-2026-08-26";
const weatherTarget = key => `report-weather-2026-08-26-${key}`;
const soilTarget = "report-soil-cell";
const day = (date, to, indices) => ({ from: `${date}T00:00:00Z`, to: `${to}T00:00:00Z`,
  cloudFraction: 0.1, clearCoverage: 0.9, clearPixels: 2025, waterFraction: 0.02, vegetationFraction: 0.82, ...indices });
const selected = day("2026-08-26", "2026-08-27", { ndvi: 0.5621, ndwi: -0.423, ndmi: 0.127 });
const historic = day("2026-08-19", "2026-08-20", { ndvi: 0.4821, ndwi: null, ndmi: 0.06 });
const newer = day("2026-08-29", "2026-08-30", { ndvi: 0.823, ndwi: 0, ndmi: 0.239 });
const stats = { days: [newer, selected, historic], observation: newer, latestObserved: newer, resolutionMeters: 20, window: period };

const weatherHistory = (coordinates, days) => ({ timezone: "UTC", point: { latitude: coordinates[0], longitude: coordinates[1] }, days });
const weatherDay = (date, precipitationMm, temperatureMeanC) => ({ date, precipitationMm, temperatureMeanC });
const weatherFor = (scope = reference) => ({ day: scope.day, primary: weatherHistory(scope.geometry.coordinates,
  Array.from({ length: 30 }, (_, i) => weatherDay(new Date(Date.UTC(2026, 6, 27 + i)).toISOString().slice(0, 10), 1, 17))) });
function snapshot(scope = reference, overrides = {}) {
  return { reference: scope, weather: weatherFor(scope), soil: soilPreviewAt(scope.geometry.coordinates),
    satellite: { ...stats, window: scope.period }, ...overrides };
}

test("uses the selected report reading, not latest or any static example; labels genuine sources", async () => {
  const satellite = await answerCurrentReport("Co pokazuje ostatnia obserwacja satelitarna?", reference, snapshot(), "pl");
  assert.match(satellite.answer, /26\.08\.2026 UTC.*NDVI 0,56 · NDWI -0,42 · NDMI 0,13/);
  assert.doesNotMatch(satellite.answer, /0,82|ERA5|SoilGrids/);
  assert.deepEqual(satellite.evidenceLinks, [{ target: sentinelTarget, label: "Sentinel-2 L2A · 26.08.2026 UTC" }]);
  const delta = await answerCurrentReport("How has NDVI changed?", reference, snapshot(), "en");
  assert.match(delta.answer, /0\.48 \(19\/08\/2026\) → 0\.56 \(26\/08\/2026 UTC\); Δ \+0\.08/);
  assert.match(delta.answer, /not a trend/);
  assert.deepEqual(targets(delta), [sentinelTarget, "report-ndvi-history"]);
});

test("full PL and EN syntheses use actual windows and clearly separate interpretation", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("chat may not fetch report data or call a model"); });
  for (const [question, locale, heading, rains] of [
    ["Podsumuj raport", "pl", /Obserwacja satelitarna.*Kontekst pogodowy.*Kontekst glebowy.*Co z tego wynika\?/s, /7,00 mm.*7\/7.*30,00 mm.*30\/30.*17,0 °C.*7\/7/s],
    ["Summarize this report", "en", /Satellite observation.*Weather context.*Soil context.*What does this mean\?/s, /7\.00 mm.*7\/7.*30\.00 mm.*30\/30.*17\.0 °C.*7\/7/s],
  ]) {
    const result = await answerCurrentReport(question, reference, snapshot(), locale);
    assert.match(result.answer, heading);
    assert.match(result.answer, rains);
    assert.match(result.answer, /0–5 cm, 250 m/);
    assert.equal(result.source, "rules");
    assert.deepEqual(targets(result), [sentinelTarget, "report-ndvi-history", weatherTarget("rainSeven"), weatherTarget("rainThirty"), weatherTarget("temperatureSeven"), soilTarget]);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("old snapshots and old component identity cannot follow point, radius, report dates or observation", async () => {
  const old = snapshot();
  const changes = [{ geometry: { ...geometry, coordinates: [45.523244962, 12.221163987] } },
    { geometry: { ...geometry, radiusMeters: 1000 } }, { period: { ...period, from: "2026-08-02T00:00:00Z" } }, { day: "2026-08-19" }];
  const previousKey = reportChatKey(reference, "weather-old", 0, false);
  for (const change of changes) {
    const scope = { ...reference, ...change };
    assert.notEqual(reportChatKey(scope, "weather-old", 0, false), previousKey);
    const stale = await answerCurrentReport("Summarize this report", scope, old, "en");
    assert.deepEqual(targets(stale), []);
    assert.doesNotMatch(stale.answer, /NDVI 0\.56|7\.00 mm|5\.4/);
    const ready = synthesizeCurrentReport(scope, snapshot(scope), "en");
    assert.equal(ready.evidence.sentinel.selected.day, scope.day);
    assert.equal(ready.evidence.weather.observationDay, scope.day);
  }
  assert.notEqual(reportChatKey(reference, "weather-old", 0, true), previousKey);
  assert.notEqual(reportChatKey(reference, "weather-old", 1, false), previousKey);
  assert.notEqual(reportChatKey(reference, "weather-new", 0, false), previousKey);
  const staleWeather = synthesizeCurrentReport(reference, snapshot(reference, { weather: { ...weatherFor(), day: "2026-08-29" } }), "en");
  assert.equal(staleWeather.evidence.weather.status, "no-data");
  assert.equal(staleWeather.evidence.sentinel.selected.day, reference.day);
});

test("takes the newly selected observation and re-anchors both weather metrics and history", async () => {
  const later = { ...reference, day: "2026-08-29" };
  const prior = weatherFor().primary;
  prior.days.push(weatherDay("2026-08-26", 10, 18), weatherDay("2026-08-27", 2, 19),
    weatherDay("2026-08-28", 1, 20), weatherDay("2026-08-29", 500, 40));
  const report = snapshot(later, { weather: { day: later.day, primary: prior } });
  const result = await answerCurrentReport("Summarize this report", later, report, "en");
  assert.match(result.answer, /29\/08\/2026 UTC.*NDVI 0\.82 · NDWI 0\.00 · NDMI 0\.24/);
  assert.match(result.answer, /17\.00 mm.*7\/7.*40\.00 mm.*30\/30/s);
  assert.doesNotMatch(result.answer, /500\.00/);
});

test("keeps useful satellite and weather results across all soil states and arbitrary areas", async () => {
  for (const [coordinates, expected, match] of [
    [[45.523244962, 12.221163987], "available", /7\.7/],
    [[45.560246929, 12.182664397], "no-data", /No SoilGrids data for this cell/],
    [[52.2668, 21.3112], "outside", /outside the prepared SoilGrids coverage/],
    [biala, "unavailable", /data package is unavailable/],
  ]) {
    const scope = { ...reference, geometry: { ...geometry, coordinates } };
    const context = snapshot(scope, expected === "unavailable" ? { soil: soilPreviewAt(coordinates, () => null) } : {});
    assert.equal(context.soil.status, expected);
    const result = await answerCurrentReport("Summarize this report", scope, context, "en");
    assert.match(result.answer, match);
    assert.match(result.answer, /NDVI 0\.56.*7\.00 mm/s);
    assert.equal(targets(result).includes(soilTarget), expected === "available");
  }
});

test("keeps zero and missing separate with weather failure or no usable satellite day", async () => {
  const missing = await answerCurrentReport("Jakie były opady przed obserwacją?", reference, snapshot(reference, { weather: null }), "pl");
  assert.match(missing.answer, /0\/7.*Brak: 7.*0\/30.*Brak: 30/s);
  assert.doesNotMatch(missing.answer, /0,00 mm/);
  const primary = weatherHistory(biala, [weatherDay("2026-08-25", 0, null)]);
  const partial = await answerCurrentReport("Jakie były opady przed obserwacją?", reference, snapshot(reference, { weather: { day: reference.day, primary } }), "pl");
  assert.match(partial.answer, /0,00 mm.*1\/7.*Brak: 6.*1\/30.*Brak: 29/s);
  const noDay = { ...reference, day: null };
  const unavailable = await answerCurrentReport("Podsumuj raport", noDay, snapshot(noDay, { satellite: undefined }), "pl");
  assert.match(unavailable.answer, /Brak użytecznej.*Bez użytecznej.*5,4/s);
  assert.deepEqual(targets(unavailable), [soilTarget]);
});

test("links only requested and available weather metrics, including genuine zero", async () => {
  const tempOnly = snapshot(reference, { weather: { day: reference.day,
    primary: weatherHistory(biala, [weatherDay("2026-08-25", null, 18)]) } });
  assert.deepEqual(targets(await answerCurrentReport("How much rain fell beforehand?", reference, tempOnly, "en")), []);
  assert.deepEqual(targets(await answerCurrentReport("What was the temperature?", reference, tempOnly, "en")), [weatherTarget("temperatureSeven")]);
  const rainOnly = snapshot(reference, { weather: { day: reference.day,
    primary: weatherHistory(biala, [weatherDay("2026-08-25", 0, null)]) } });
  assert.deepEqual(targets(await answerCurrentReport("Jakie były opady przed obserwacją?", reference, rainOnly, "pl")), [weatherTarget("rainSeven"), weatherTarget("rainThirty")]);
});

test("does not link missing NDVI/NDMI or invent a comparison from a rejected day", async () => {
  const partial = { ...selected, ndvi: null, ndmi: null };
  const rejected = { ...historic, clearCoverage: 0.1 };
  const report = snapshot(reference, { satellite: { ...stats, days: [newer, partial, rejected] } });
  const summary = await answerCurrentReport("Podsumuj raport", reference, report, "pl");
  assert.match(summary.answer, /NDVI Brak danych · NDWI -0,42 · NDMI Brak danych/);
  assert.ok(targets(summary).includes(sentinelTarget));
  assert.ok(!targets(summary).includes("report-ndvi-history"));
  assert.deepEqual(targets(await answerCurrentReport("Jak zmienił się NDVI?", reference, report, "pl")), []);
  assert.deepEqual(targets(await answerCurrentReport("What does NDMI indicate?", reference, report, "en")), []);
});

test("safe answers audit moisture, drought, disease, fertiliser, liming, suitability and yield", async () => {
  for (const [question, locale, match] of [
    ["Czy NDMI mierzy wilgotność gleby?", "pl", /nie mierzy wilgotności gleby/],
    ["Czy to susza glebowa?", "pl", /nie rozstrzyga, czy występuje susza glebowa/],
    ["Czy rośliny są chore?", "pl", /nie potwierdzają problemu z roślinnością/],
    ["Ile nawozu zastosować?", "pl", /nie określa potrzeby ani dawki nawozu/],
    ["Should I lime the soil?", "en", /cannot establish whether fertiliser or lime is needed/],
    ["Jakiego plonu mogę się spodziewać?", "pl", /nie da się wiarygodnie przewidzieć plonu/],
    ["Can I grow maize here?", "en", /maize/i],
    ["Czy to pole nadaje się pod uprawy?", "pl", /nie wystarczą do oceny przydatności/],
  ]) {
    const result = await answerCurrentReport(question, reference, snapshot(), locale);
    assert.match(result.answer, match, question);
    assert.doesNotMatch(result.answer, /\d\s*(?:t|kg)\s*\/\s*ha/i);
  }
});

test("preserves named crop, conservative unknown crop, and field verification answers without fetching", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("live report fallback must not fetch"); });
  for (const [question, match] of [
    ["jaka szansa na obsianie żytem", /żyto/i], ["czy urośnie tu kukurydza", /kukurydz/i],
    ["czy opłaca się sadzić ziemniaki", /ziemniak/i], ["czy da się tu uprawiać teff", /nie rozpoznaję|nie mam/i],
    ["Czy widać problem z roślinnością?", /nie potwierdzają problemu/],
    ["Jakie informacje warto jeszcze sprawdzić?", /warunki w terenie/],
  ]) {
    const reply = await answerCurrentReport(question, reference, snapshot(), "pl");
    assert.match(reply.answer, match);
    assert.equal(reply.source, "rules");
  }
  assert.equal(fetch.mock.callCount(), 0);
});
