import { RequestLimitError } from "../request-budget.ts";
import { UpstreamBudgetError } from "../upstream-budget.ts";

export { responseFailure, type FailureCode } from "./response-error.ts";

export class CopernicusHttpError extends Error {
  readonly status: number;
  readonly retryAfter: string | null;

  constructor(status: number, retryAfter: string | null = null) {
    super("Copernicus request failed");
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export function classifyFailure(error: unknown) {
  if (error instanceof RequestLimitError) return { code: "rateLimit", status: 429, retryAfter: "60" } as const;
  if (error instanceof UpstreamBudgetError) {
    return error.kind === "limited"
      ? { code: "rateLimit", status: 429, retryAfter: String(error.retryAfter) } as const
      : { code: "providerError", status: 503, retryAfter: String(error.retryAfter) } as const;
  }
  if (error instanceof CopernicusHttpError && error.status === 429) {
    const seconds = Number(error.retryAfter);
    return {
      code: "providerRate", status: 429,
      retryAfter: String(Number.isInteger(seconds) && seconds > 0 ? Math.min(300, seconds) : 60),
    } as const;
  }
  if ((error instanceof Error && error.name === "TimeoutError") ||
    (error instanceof CopernicusHttpError && [408, 504].includes(error.status))) {
    return { code: "timeout", status: 504, retryAfter: null } as const;
  }
  return { code: "providerError", status: 503, retryAfter: null } as const;
}
