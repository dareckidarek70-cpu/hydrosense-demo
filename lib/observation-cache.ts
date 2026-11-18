import type { AreaStats } from "./copernicus/observations";

type Entry = { key: string; data: AreaStats; expires: number };
type ObservationStorage = Pick<Storage, "getItem" | "setItem">;
const namespace = "hydrosense.observations.v1";
const maxLength = 512 * 1024;

function read(storage: ObservationStorage, now: number): Entry[] {
  try {
    const raw = storage.getItem(namespace);
    if (!raw || raw.length > maxLength) return [];
    const entries: unknown = JSON.parse(raw);
    return Array.isArray(entries) ? entries.filter((entry): entry is Entry =>
      typeof entry?.key === "string" && entry.expires > now &&
      Array.isArray(entry.data?.days) && Number.isInteger(entry.data?.observedDays) &&
      typeof entry.data?.window?.from === "string" && typeof entry.data?.window?.to === "string",
    ) : [];
  } catch {
    return [];
  }
}

export function getCachedObservation(storage: ObservationStorage, key: string, now = Date.now()) {
  return read(storage, now).find((entry) => entry.key === key)?.data;
}

export function rememberObservation(storage: ObservationStorage, key: string, data: AreaStats, now = Date.now()) {
  const fresh = { key, data, expires: now + 5 * 60_000 };
  const entries = [fresh, ...read(storage, now).filter((entry) => entry.key !== key)].slice(0, 8);
  try {
    while (entries.length > 0) {
      const serialized = JSON.stringify(entries);
      if (serialized.length <= maxLength) {
        storage.setItem(namespace, serialized);
        return;
      }
      entries.pop();
    }
  } catch {
    // Storage may be unavailable in a restricted browser.
  }
}
