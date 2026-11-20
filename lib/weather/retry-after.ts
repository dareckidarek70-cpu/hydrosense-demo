export function retryAfterSeconds(header: string | null, now: number) {
  const value = header?.trim();
  if (!value) return 60;
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - now) / 1000);
  if (Number.isNaN(seconds)) return 60;
  return Math.max(1, Math.min(seconds, Math.floor((Number.MAX_SAFE_INTEGER - now) / 1000)));
}
