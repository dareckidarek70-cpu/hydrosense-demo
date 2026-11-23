import assert from "node:assert/strict";
import { test } from "node:test";
import { createUpstreamBudget, satelliteRasterWeight, satelliteStatsWeight, UpstreamBudgetError } from "../lib/upstream-budget.ts";
import { classifyFailure } from "../lib/copernicus/errors.ts";
import { createWeatherHistoryHandler } from "../lib/weather/history-service.ts";
import { releaseFeatures } from "../lib/release-features.ts";

const env = { VERCEL_ENV: "preview", UPSTASH_REDIS_REST_URL: "https://audit-test.upstash.io", UPSTASH_REDIS_REST_TOKEN: "mock" };
const reject = (kind, retryAfter) => error => error instanceof UpstreamBudgetError && error.kind === kind && error.retryAfter === retryAfter;

test("hosted environments fail closed, local development can remain offline", async () => {
  const noCall = async () => assert.fail("Unexpected fetch");
  for (const input of [{ VERCEL_ENV: "production" }, { VERCEL: "1" }, { VERCEL_URL: "example.vercel.app" }, { UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL }]) {
    await assert.rejects(createUpstreamBudget(input, noCall)("copernicus-token"), reject("unavailable", 30));
  }
  await createUpstreamBudget({}, noCall)("copernicus-token");
  await assert.rejects(createUpstreamBudget({ ...env, UPSTASH_REDIS_REST_URL: "https://other.example" }, noCall)("weather"), reject("unavailable", 30));
});

test("all runtime instances debit the same satellite buckets and isolate other providers", async () => {
  const calls = [];
  const reserve = async (url, options) => {
    assert.equal(url.hostname, "audit-test.upstash.io");
    assert.equal(options.redirect, "error");
    const [cmd, script, number, ...args] = JSON.parse(options.body);
    assert.equal(cmd, "EVAL");
    assert.ok(script.indexOf("if retry > 0") < script.indexOf("INCRBY"));
    calls.push([args.slice(0, +number), args.slice(+number).map(Number)]);
    return Response.json({ result: [1, 0] });
  };
  await createUpstreamBudget(env, reserve)("copernicus-token");
  await createUpstreamBudget({ ...env, VERCEL_ENV: "production" }, reserve)("copernicus-stats", 108);
  await createUpstreamBudget(env, reserve)("copernicus-layer", 4);
  await createUpstreamBudget(env, reserve)("weather", 4);
  await createUpstreamBudget(env, reserve)("openai");
  assert.deepEqual(calls[0][0].slice(0, 3), calls[1][0].slice(0, 3));
  assert.deepEqual(calls[1][0].slice(0, 3), calls[2][0].slice(0, 3));
  assert.deepEqual([calls[0][1][5], calls[1][1][5], calls[2][1][5]], [1, 108, 4]);
  assert.ok(calls[3][0].every(key => key.includes(":weather:")));
  assert.ok(calls[4][0].every(key => key.includes(":openai:")));
  assert.equal(satelliteStatsWeight(366, 314), 108);
  assert.equal(satelliteRasterWeight(1, 720, 324), 4);
});

test("exhaustion reports Retry-After; store failures never fall through", async () => {
  const limited = createUpstreamBudget(env, async () => Response.json({ result: [0, 62_001] }));
  await assert.rejects(limited("copernicus-layer"), error => {
    assert.deepEqual(classifyFailure(error), { code: "rateLimit", status: 429, retryAfter: "63" });
    return true;
  });
  for (const response of [new Response("private response", { status: 503 }), Response.json({ result: [-1, 0] }), Response.json({ result: [1, "0"] })]) {
    await assert.rejects(createUpstreamBudget(env, async () => response)("weather"), reject("unavailable", 30));
  }
});

test("weather denies work before contacting either external model", async () => {
  for (const [kind, status] of [["limited", 429], ["unavailable", 503]]) {
    const read = createWeatherHistoryHandler({
      enabled: () => true,
      now: () => new Date("2026-11-20T13:00:00Z"),
      reserve: async () => { throw new UpstreamBudgetError(kind, 40); },
      fetcher: async () => assert.fail("Unexpected provider call"),
    });
    const response = await read(new Request("http://example.test/api/weather/history?lat=52&lng=23&days=30"));
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Retry-After"), "40");
  }
});

test("production release flags are independent and require explicit opt-in", () => {
  assert.deepEqual(releaseFeatures({ VERCEL_ENV: "preview" }), { weather: true, soil: true });
  assert.deepEqual(releaseFeatures({ VERCEL_ENV: "production" }), { weather: false, soil: false });
  assert.deepEqual(releaseFeatures({ VERCEL_ENV: "production", HYDROSENSE_PRODUCTION_WEATHER: "true" }), { weather: true, soil: false });
  assert.deepEqual(releaseFeatures({ VERCEL_ENV: "production", HYDROSENSE_PRODUCTION_SOIL: "true" }), { weather: false, soil: true });
});
