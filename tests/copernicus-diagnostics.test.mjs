import assert from "node:assert/strict";
import { test } from "node:test";
import { withCopernicusStage } from "../lib/copernicus/diagnostics.ts";
import { CopernicusHttpError } from "../lib/copernicus/errors.ts";
import { UpstreamBudgetError } from "../lib/upstream-budget.ts";

test("Preview diagnostics distinguish stages and never log provider or request payloads", async (t) => {
  const info = t.mock.method(console, "info", () => {});
  const warn = t.mock.method(console, "warn", () => {});
  const opaque = { value: "unlogged-result" };
  assert.equal(await withCopernicusStage("oauth", async () => opaque, true), opaque);
  assert.deepEqual(info.mock.calls[0].arguments.slice(0, 3), ["[HydroSense Copernicus]", "oauth", "ok"]);
  assert.equal(info.mock.calls[0].arguments.length, 4);

  for (const [stage, failure, code, status] of [
    ["oauth", new CopernicusHttpError(401, "unlogged-header"), "providerError", 401],
    ["statistics", new DOMException("unlogged-message", "TimeoutError"), "timeout", null],
    ["budget:raster", new UpstreamBudgetError("limited", 17), "limited", null],
  ]) {
    await assert.rejects(withCopernicusStage(stage, async () => { throw failure; }, true), (error) => error === failure);
    const args = warn.mock.calls.at(-1).arguments;
    assert.deepEqual(args.slice(0, 3), ["[HydroSense Copernicus]", stage, code]);
    assert.equal(typeof args[3], "number");
    assert.deepEqual(args.slice(4), [status]);
  }

  assert.equal(await withCopernicusStage("statistics", async () => 42, false), 42);
  assert.equal(info.mock.callCount(), 1);
  assert.equal(warn.mock.callCount(), 3);
});
