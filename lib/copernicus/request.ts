import { z } from "zod";

export const DAY = 86_400_000;
export const MAX_HISTORY_DAYS = 366;
export const FIRST_HISTORY_DAY = "2017-01-01";
export type ObservationWindow = { from: string; to: string };
const latitude = z.number().min(-84).max(84);
const longitude = z.number().min(-180).max(180);

export const pointBufferSchema = z.object({
  type: z.literal("PointBuffer"),
  coordinates: z.tuple([latitude, longitude]),
  radiusMeters: z.union([z.literal(500), z.literal(1000)]),
});

export const geometrySchema = z.discriminatedUnion("type", [
  pointBufferSchema,
  z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.tuple([longitude, latitude])).min(3).max(100),
  }),
]);

export type AreaGeometry = z.infer<typeof geometrySchema>;

export function observationWindow(now = new Date(), days = 30): ObservationWindow {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { from: new Date(end - days * DAY).toISOString(), to: new Date(end).toISOString() };
}

export function isValidWindow(from: string, to: string, maxDays = 31) {
  const start = Date.parse(from);
  const end = Date.parse(to);
  return Number.isFinite(start) && Number.isFinite(end)
    && start >= Date.parse(FIRST_HISTORY_DAY) && end <= Date.now()
    && end - start >= 1000 && end - start <= maxDays * DAY;
}

export function isValidHistoryWindow({ from, to }: ObservationWindow) {
  return isValidWindow(from, to, MAX_HISTORY_DAYS)
    && Date.parse(from) % DAY === 0 && Date.parse(to) % DAY === 0;
}

export function inclusiveEnd({ to }: ObservationWindow) {
  return new Date(Date.parse(to) - DAY).toISOString().slice(0, 10);
}

function parseDay(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const timestamp = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp : NaN;
}

export function dateObservationWindow(first: unknown, last: unknown): ObservationWindow | null {
  const start = parseDay(first);
  const end = parseDay(last);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const window = { from: new Date(start).toISOString(), to: new Date(end + DAY).toISOString() };
  return isValidHistoryWindow(window) ? window : null;
}

export function pointFromQuery(lat: unknown, lng: unknown, value: unknown) {
  if (typeof lat !== "string" || !lat.trim() || typeof lng !== "string" || !lng.trim()) return null;
  const parsed = geometrySchema.safeParse({
    type: "PointBuffer",
    coordinates: [Number(lat), Number(lng)],
    radiusMeters: Number(value ?? 500),
  });
  return parsed.success && parsed.data.type === "PointBuffer" ? parsed.data : null;
}

export function radiusAreaHectares(radiusMeters: number) {
  return Math.PI * radiusMeters ** 2 / 10_000;
}
