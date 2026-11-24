type Env = Record<string, string | undefined>;

export function releaseFeatures(env: Env = process.env) {
  const production = env.VERCEL_ENV === "production";
  return {
    weather: !production || env.HYDROSENSE_PRODUCTION_WEATHER === "true",
    soil: !production || env.HYDROSENSE_PRODUCTION_SOIL === "true",
  };
}
