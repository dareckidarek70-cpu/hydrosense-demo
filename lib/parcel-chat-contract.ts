import { z } from "zod";
import { dateObservationWindow, isValidHistoryWindow, pointBufferSchema } from "./copernicus/request.ts";
import { locales } from "./i18n/index.ts";
import { CHAT_QUESTION_LIMIT } from "./parcel-chat-limits.ts";

const shared = { question: z.string().trim().min(1).max(CHAT_QUESTION_LIMIT), locale: z.enum(locales) };
const parcel = z.enum(["parcel-a", "parcel-b", "parcel-c", "parcel-d"]);
const observationReference = z.strictObject({
  geometry: pointBufferSchema.strict(),
  period: z.strictObject({ from: z.iso.datetime(), to: z.iso.datetime() }),
  day: z.iso.date().nullable(),
}).refine(({ period, day }) => {
  if (!isValidHistoryWindow(period)) return false;
  if (!day) return true;
  const interval = dateObservationWindow(day, day);
  return interval && Date.parse(interval.from) >= Date.parse(period.from) && Date.parse(interval.to) <= Date.parse(period.to);
});

export const parcelChatSchema = z.discriminatedUnion("mode", [
  z.strictObject({ ...shared, mode: z.literal("demo"), parcelId: parcel }),
  z.strictObject({ ...shared, mode: z.literal("observation"), observation: observationReference }),
]);

export type ParcelChatInput = z.infer<typeof parcelChatSchema>;
export type ChatReference = Omit<Extract<ParcelChatInput, { mode: "demo" }>, keyof typeof shared>
  | Omit<Extract<ParcelChatInput, { mode: "observation" }>, keyof typeof shared>;
export type ChatSource = "rules" | "model";
