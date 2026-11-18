import { z } from "zod";

const DAY = 86_400_000;
const latitude = z.number().min(-84).max(84);
const longitude = z.number().min(-180).max(180);

export const geometrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PointBuffer"),
    coordinates: z.tuple([latitude, longitude]),
    radiusMeters: z.union([z.literal(500), z.literal(1000)]),
  }),
  z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.tuple([longitude, latitude])).min(3).max(100),
  }),
]);

export type AreaGeometry = z.infer<typeof geometrySchema>;

export function observationWindow(now = new Date()) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { from: new Date(end - 30 * DAY).toISOString(), to: new Date(end).toISOString() };
}

export function isValidWindow(from: string, to: string) {
  const start = Date.parse(from);
  const end = Date.parse(to);
  return Number.isFinite(start) && Number.isFinite(end)
    && start >= Date.UTC(2017, 0, 1) && end <= Date.now()
    && end - start >= 1000 && end - start <= 31 * DAY;
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
