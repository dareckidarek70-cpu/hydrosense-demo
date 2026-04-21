let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

type TokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export async function getCopernicusAccessToken(): Promise<string> {
  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET in .env.local");
  }

  const now = Date.now();

  if (cachedToken && now < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Copernicus auth error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as TokenResponse;

  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + data.expires_in * 1000;

  return cachedToken;
}
