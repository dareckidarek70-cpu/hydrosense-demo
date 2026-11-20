import { getLocalization } from "../i18n/server";
import { classifyFailure, type FailureCode } from "./errors";

export async function apiFailure(code: FailureCode, status: number, retryAfter: string | null = null) {
  const { t, locale } = await getLocalization();
  const headers = new Headers({ "Cache-Control": "no-store", "Content-Language": locale });
  if (retryAfter) headers.set("Retry-After", retryAfter);
  return Response.json({ error: t(code), code }, { status, headers });
}

export async function providerFailure(stage: "statistics" | "layer", error: unknown) {
  const { code, status, retryAfter } = classifyFailure(error);
  if (status !== 429) console.warn("[Copernicus]", stage, code);
  return apiFailure(code, status, retryAfter);
}
