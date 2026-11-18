import { RequestLimitError } from "../request-budget.ts";

export const failureCodes = ["badRequest", "badLayer", "rateLimit", "providerRate", "timeout", "providerError", "networkError"] as const;
export type FailureCode = typeof failureCodes[number];

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

export async function responseFailure(response: Response): Promise<FailureCode> {
  const body = await response.json().catch(() => null);
  if (failureCodes.includes(body?.code)) return body.code;
  if (response.status === 429) return "providerRate";
  if (response.status === 504) return "timeout";
  return "providerError";
}
