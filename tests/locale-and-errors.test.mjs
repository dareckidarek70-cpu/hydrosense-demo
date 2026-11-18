import assert from "node:assert/strict";
import { test } from "node:test";
import { localization, resolveLocale } from "../lib/i18n/index.ts";
import { messages } from "../lib/i18n/messages.ts";
import { classifyFailure, CopernicusHttpError, responseFailure } from "../lib/copernicus/errors.ts";
import { interpretIndex } from "../lib/copernicus/interpretation.ts";
import { RequestLimitError } from "../lib/request-budget.ts";

test("Polish is the default and locale preferences are allowlisted", () => {
  for (const value of [undefined, "de", "PL", "pl-PL", "<script>"]) assert.equal(resolveLocale(value), "pl");
  assert.equal(resolveLocale("en"), "en");
});

test("both translations use the same named parameters", () => {
  const fields = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [key, item] of Object.entries(messages)) {
    assert.ok(item.pl.trim() && item.en.trim(), key);
    assert.deepEqual(fields(item.pl), fields(item.en), key);
  }
});

test("localizes decimal separators, dates, percent and index descriptions", () => {
  const pl = localization("pl");
  const en = localization("en");
  assert.equal(pl.num(0.548, 2), "0,55");
  assert.equal(en.num(0.548, 2), "0.55");
  assert.equal(pl.percent(0.8).replace(/\s/g, ""), "80%");
  assert.equal(pl.num(-0.001, 2, true), "0,00");
  assert.equal(pl.coordinates([52.031, 23.111]), "52,03100 / 23,11100");
  assert.notEqual(pl.date("2026-11-05"), en.date("2026-11-05"));
  assert.match(pl.t("radiusArea", { area: "78,5" }), /78,5 ha/);
  assert.equal(interpretIndex("ndvi", 0.2, "pl"), "Umiarkowana zieleń");
  assert.equal(interpretIndex("ndmi", null, "pl"), null);
});

test("separates quota, timeout and provider errors without raw details", async () => {
  assert.deepEqual(classifyFailure(new RequestLimitError("private details")), { code: "rateLimit", status: 429, retryAfter: "60" });
  assert.deepEqual(classifyFailure(new CopernicusHttpError(429, "15")), { code: "providerRate", status: 429, retryAfter: "15" });
  assert.equal(classifyFailure(new CopernicusHttpError(429, "600")).retryAfter, "300");
  assert.equal(classifyFailure(new DOMException("provider timeout", "TimeoutError")).status, 504);
  assert.equal(classifyFailure(new CopernicusHttpError(504)).status, 504);
  assert.deepEqual(classifyFailure(new Error("must not be echoed")), { code: "providerError", status: 503, retryAfter: null });
  assert.equal(await responseFailure(Response.json({ code: "rateLimit" }, { status: 429 })), "rateLimit");
  assert.equal(await responseFailure(new Response("unexpected gateway HTML", { status: 504 })), "timeout");
});
