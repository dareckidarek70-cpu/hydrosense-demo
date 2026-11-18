import { CopernicusHttpError } from "./errors";

let cachedToken: { value: string; expires: number } | undefined;
let tokenRequest: Promise<string> | undefined;

async function fetchToken(clientId: string, clientSecret: string) {
  const response = await fetch(
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new CopernicusHttpError(response.status, response.headers.get("Retry-After"));
  const data = await response.json();
  if (typeof data.access_token !== "string" || !Number.isFinite(data.expires_in)) {
    throw new Error("Invalid Copernicus token response");
  }
  cachedToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

export async function getCopernicusAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expires - 60_000) return cachedToken.value;
  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Copernicus credentials unavailable");
  tokenRequest ??= fetchToken(clientId, clientSecret).finally(() => { tokenRequest = undefined; });
  return tokenRequest;
}
