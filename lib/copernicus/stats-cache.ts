import { cachedRequest, readCachedRequest } from "../request-budget";
import type { AreaStats } from "./observations";
import { DAY, type AreaGeometry, type ObservationWindow } from "./request";
import { fetchAreaStats, type getAnalysisArea } from "./stats";

function lookup(geometry: AreaGeometry, period: ObservationWindow) {
  const window = {
    from: new Date(period.from).toISOString(), to: new Date(period.to).toISOString(),
  };
  const long = Date.parse(window.to) - Date.parse(window.from) > 90 * DAY;
  return { bucket: long ? "stats-history" : "stats", limit: long ? 3 : 10, key: JSON.stringify([geometry, window]), window };
}

export function readReportStats(geometry: AreaGeometry, period: ObservationWindow) {
  const { bucket, key } = lookup(geometry, period);
  return readCachedRequest<AreaStats>(bucket, key);
}

export function loadReportStats(geometry: AreaGeometry, area: NonNullable<ReturnType<typeof getAnalysisArea>>, period: ObservationWindow) {
  const { bucket, key, limit, window } = lookup(geometry, period);
  return cachedRequest(bucket, key, limit, () => fetchAreaStats(area, window));
}
