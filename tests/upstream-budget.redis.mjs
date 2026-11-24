// Optional integration: node --test tests/upstream-budget.redis.mjs
// Uses an isolated Redis instance on a temporary Unix socket, never a cloud database.
import assert from "node:assert/strict";
import { execFile, execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { createUpstreamBudget, reserveBudgetScript, UpstreamBudgetError, withUpstreamClient } from "../lib/upstream-budget.ts";

const bin = process.env.HYDROSENSE_REDIS_BIN_DIR;
const executable = name => bin ? join(bin, name) : name;
const run = promisify(execFile);

test("atomic Redis reservations are shared by independent clients, with no partial debit", async () => {
  execFileSync(executable("redis-server"), ["--version"]);
  const tmp = mkdtempSync(join(tmpdir(), "hs-redis-"));
  const socket = join(tmp, "db.sock");
  const server = spawn(executable("redis-server"), [
    "--port", "0", "--unixsocket", socket, "--unixsocketperm", "700",
    "--save", "", "--appendonly", "no", "--dir", tmp,
  ], { stdio: "ignore" });
  const exited = once(server, "exit");
  const command = async (...args) => JSON.parse((await run(
    executable("redis-cli"), ["-s", socket, "--json", ...args],
  )).stdout);
  try {
    let ready = false;
    for (let i = 0; i < 50 && !ready; i++) {
      try { ready = await command("PING") === "PONG"; }
      catch { await new Promise(resolve => setTimeout(resolve, 20)); }
    }
    assert.ok(ready, "isolated Redis did not start");
    const fetcher = async (_, options) => Response.json({ result: await command(...JSON.parse(options.body)) });
    const common = { UPSTASH_REDIS_REST_URL: "https://stub.upstash.io", UPSTASH_REDIS_REST_TOKEN: "mock" };
    const preview = createUpstreamBudget({ ...common, VERCEL_ENV: "preview" }, fetcher);
    const production = createUpstreamBudget({ ...common, VERCEL_ENV: "production" }, fetcher);
    const from = (ip, budget, operation, weight) => withUpstreamClient(
      new Headers({ "x-vercel-forwarded-for": ip }), () => budget(operation, weight),
    );
    const operations = ["copernicus-token", "copernicus-stats", "copernicus-layer"];
    const attempts = operations.flatMap(operation => Array.from({ length: 22 }, (_, i) =>
      from(`192.0.2.${i + 1}`, i % 2 ? preview : production, operation)));
    const outcomes = await Promise.allSettled(attempts);
    assert.equal(outcomes.filter(x => x.status === "fulfilled").length, 32);
    assert.ok(outcomes.filter(x => x.status === "rejected")
      .every(x => x.reason instanceof UpstreamBudgetError && x.reason.kind === "limited"));
    assert.equal(await command("GET", "hydrosense:upstream:v1:copernicus:minute"), "32");
    assert.ok(await command("PTTL", "hydrosense:upstream:v1:copernicus:minute") > 0);
    for (const [suffix, max] of [["token", 6], ["stats", 10], ["layer", 20]]) {
      assert.ok(Number(await command("GET", `hydrosense:upstream:v1:copernicus:${suffix}:minute`)) <= max);
    }
    assert.deepEqual(await command("EVAL", reserveBudgetScript, "2", "test:a", "test:b",
      "1", "60000", "1", "1", "60000", "1"), [1, 0]);
    assert.equal((await command("EVAL", reserveBudgetScript, "2", "test:c", "test:b",
      "1", "60000", "1", "1", "60000", "1"))[0], 0);
    assert.equal(await command("GET", "test:c"), null);
    const school = "198.51.100.4";
    const sameNetwork = await Promise.allSettled([
      from(school, production, "weather", 2), from(school, preview, "weather", 2), from(school, production, "weather", 2),
    ]);
    assert.equal(sameNetwork.filter(x => x.status === "fulfilled").length, 2);
    assert.equal(sameNetwork.find(x => x.status === "rejected").reason.scope, "client");
    assert.equal(await command("GET", "hydrosense:upstream:v1:weather:minute"), "2");
    await from("198.51.100.5", preview, "weather", 2);
    await from("198.51.100.6", production, "weather", 2);
    await assert.rejects(from("198.51.100.7", preview, "weather", 2), error =>
      error.kind === "limited" && error.scope === "global" && error.retryAfter > 0);
    assert.equal(await command("GET", "hydrosense:upstream:v1:weather:day"), "8");
    await from(school, production, "openai");
  } finally {
    server.kill("SIGTERM");
    await exited;
    rmSync(tmp, { recursive: true, force: true });
  }
});
