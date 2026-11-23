export const failureCodes = ["badRequest", "badLayer", "rateLimit", "providerRate", "timeout", "providerError", "networkError"] as const;
export type FailureCode = typeof failureCodes[number];

export async function responseFailure(response: Response): Promise<FailureCode> {
  const body = await response.json().catch(() => null);
  if (failureCodes.includes(body?.code)) return body.code;
  if (response.status === 429) return "providerRate";
  if (response.status === 504) return "timeout";
  return "providerError";
}
