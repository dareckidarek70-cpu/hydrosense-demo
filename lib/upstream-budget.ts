// Redis keys span the managed HydroSense 2.0 deployments, not Classic.
const budgetPrefix = "hydrosense:upstream:v1";
const minute = 60_000;
const day = 24 * 60 * minute;
type Operation = "copernicus-token" | "copernicus-stats" | "copernicus-layer" | "weather" | "openai";
type Rule = [key: string, maximum: number, ttl: number, cost: number];
type Env = Record<string, string | undefined>;

export class UpstreamBudgetError extends Error {
  readonly kind: "limited" | "unavailable";
  readonly retryAfter: number;

  constructor(kind: "limited" | "unavailable", retryAfter: number) {
    super(kind === "limited" ? "Upstream budget exhausted" : "Upstream budget unavailable");
    this.kind = kind;
    this.retryAfter = retryAfter;
  }
}

export const reserveBudgetScript = `
local retry = 0
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
  end
end
if retry > 0 then return {0, retry} end
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
    if (!restUrl || !token || !Number.isSafeInteger(weight) || weight < 1) {
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
      if (decision[0] === 0 && Number.isSafeInteger(ttl) && ttl > 0 && ttl <= 30 * day) {
        throw new UpstreamBudgetError("limited", Math.ceil(ttl / 1000));
      }
    }
    throw new UpstreamBudgetError("unavailable", 30);
  };
}

export const takeUpstreamBudget = createUpstreamBudget(process.env);
