import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// Redis keys span the managed HydroSense 2.0 deployments, not Classic.
const budgetPrefix = "hydrosense:upstream:v1";
const minute = 60_000;
const day = 24 * 60 * minute;
type Operation = "copernicus-token" | "copernicus-stats" | "copernicus-layer" | "weather" | "openai";
type Rule = [key: string, maximum: number, ttl: number, cost: number];
type Env = Record<string, string | undefined>;
const clientContext = new AsyncLocalStorage<string | undefined>();

function clientNetwork(headers: Headers) {
  const address = headers.get("x-vercel-forwarded-for")?.trim() ?? "";
  const version = isIP(address);
  if (version === 4) return address;
  if (version !== 6 || address.includes("%")) return;

  const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/.exec(canonical);
  if (mapped) {
    const [high, low] = mapped.slice(1).map((part) => parseInt(part, 16));
    return [high >> 8, high & 255, low >> 8, low & 255].join(".");
  }
  // Group IPv6 privacy addresses by network, not by the rotating host identifier.
  const [left, right] = canonical.split("::");
  const first = left ? left.split(":") : [];
  if (right !== undefined) {
    const last = right ? right.split(":") : [];
    first.push(...Array<string>(8 - first.length - last.length).fill("0"), ...last);
  }
  return first.slice(0, 4).join(":") + "/64";
}

export function withUpstreamClient<T>(headers: Headers, operation: () => T): T {
  return clientContext.run(clientNetwork(headers), operation);
}

export class UpstreamBudgetError extends Error {
  readonly kind: "limited" | "unavailable";
  readonly retryAfter: number;
  readonly scope: "global" | "client";

  constructor(kind: "limited" | "unavailable", retryAfter: number, scope: "global" | "client" = "global") {
    super(kind === "limited" ? "Upstream budget exhausted" : "Upstream budget unavailable");
    this.kind = kind;
    this.retryAfter = retryAfter;
    this.scope = scope;
  }
}

export const reserveBudgetScript = `
local retry = 0
local denial = 2
for i, key in ipairs(KEYS) do
  local offset = (i-1)*3
  local limit = tonumber(ARGV[offset+1])
  local window = tonumber(ARGV[offset+2])
  local cost = tonumber(ARGV[offset+3])
  local raw = redis.call('GET', key)
  local used = tonumber(raw or '0')
  if not used or used < 0 or used % 1 ~= 0 or (raw and redis.call('PTTL', key) < 0) then
    return {-1, 0}
  end
  if used + cost > limit then
    local remaining = redis.call('PTTL', key)
    retry = math.max(retry, remaining > 0 and remaining or window)
    if not string.find(key, ':client:', 1, true) then denial = 0 end
  end
end
if retry > 0 then return {denial, retry} end
for i, key in ipairs(KEYS) do
  local offset = (i-1)*3
  local exists = redis.call('EXISTS', key)
  redis.call('INCRBY', key, ARGV[offset+3])
  if exists == 0 then redis.call('PEXPIRE', key, ARGV[offset+2]) end
end
return {1, 0}
`;

function rulesFor(operation: Operation, weight: number): Rule[] {
  const allCopernicus: Rule[] = [
    ["copernicus:minute", 32, minute, 1],
    ["copernicus:day", 500, day, weight],
    ["copernicus:30days", 6000, 30 * day, weight],
  ];
  switch (operation) {
    case "copernicus-token": return [...allCopernicus, ["copernicus:token:minute", 6, minute, 1]];
    case "copernicus-stats": return [...allCopernicus, ["copernicus:stats:minute", 10, minute, 1]];
    case "copernicus-layer": return [...allCopernicus, ["copernicus:layer:minute", 20, minute, 1]];
    case "weather": return [["weather:minute", 4, minute, 1], ["weather:day", 1600, day, weight]];
    case "openai": return [["openai:minute", 3, minute, 1], ["openai:day", 30, day, 1]];
  }
}

function clientRules(operation: Operation, weight: number, bucket: string): Rule[] {
  const prefix = `client:${bucket}:`;
  const rule = (key: string, maximum: number, ttl: number, cost = 1): Rule =>
    [prefix + key, maximum, ttl, cost];
  if (operation === "weather") return [
    rule("weather:minute", 2, minute), rule("weather:day", 800, day, weight),
  ];
  if (operation === "openai") return [
    rule("openai:minute", 2, minute), rule("openai:day", 15, day),
  ];
  const minuteCap = { "copernicus-token": 4, "copernicus-stats": 6, "copernicus-layer": 12 };
  return [
    rule(operation + ":minute", minuteCap[operation], minute),
    rule("copernicus:day", 360, day, weight),
    rule("copernicus:30days", 4500, 30 * day, weight),
  ];
}

export function satelliteStatsWeight(days: number, areaHectares: number) {
  return Math.max(1, Math.ceil(days / 14)) * Math.max(1, Math.ceil(areaHectares / 80));
}

export function satelliteRasterWeight(days: number, width: number, height: number) {
  return Math.max(1, Math.ceil(days / 7)) * Math.max(1, Math.ceil(width * height / 65_536));
}

export function createUpstreamBudget(env: Env, fetcher: typeof fetch = fetch) {
  return async (operation: Operation, weight = 1) => {
    const restUrl = env.UPSTASH_REDIS_REST_URL?.trim();
    const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
    const hosted = env.VERCEL === "1" || Boolean(env.VERCEL_URL)
      || env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "production";
    if (!hosted && !restUrl && !token) return;
    const network = hosted ? clientContext.getStore() : undefined;
    if (!restUrl || !token || (hosted && !network) || !Number.isSafeInteger(weight) || weight < 1) {
      throw new UpstreamBudgetError("unavailable", 30);
    }

    let decision: unknown;
    try {
      const url = new URL(restUrl);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".upstash.io") || url.port
        || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
        throw new Error("Invalid budget endpoint");
      }
      const rules = rulesFor(operation, weight);
      if (network) {
        const bucket = createHmac("sha256", token).update("hydrosense:client:v1:" + network).digest("hex");
        rules.push(...clientRules(operation, weight, bucket));
      }
      const args = rules.flatMap(([, max, window, cost]) => [String(max), String(window), String(cost)]);
      const response = await fetcher(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          "EVAL", reserveBudgetScript, String(rules.length),
          ...rules.map(([key]) => `${budgetPrefix}:${key}`), ...args,
        ]),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) throw new Error("Budget request failed");
      decision = (await response.json()).result;
    } catch {
      // Never expose the request, backend headers, or error body; no automatic retry.
      throw new UpstreamBudgetError("unavailable", 30);
    }

    if (Array.isArray(decision) && decision.length === 2) {
      if (decision[0] === 1 && decision[1] === 0) return;
      const ttl = decision[1];
      if ((decision[0] === 0 || decision[0] === 2) && Number.isSafeInteger(ttl) && ttl > 0 && ttl <= 30 * day) {
        throw new UpstreamBudgetError("limited", Math.ceil(ttl / 1000), decision[0] === 2 ? "client" : "global");
      }
    }
    throw new UpstreamBudgetError("unavailable", 30);
  };
}

export const takeUpstreamBudget = createUpstreamBudget(process.env);
