import { dateObservationWindow, inclusiveEnd, pointFromQuery, type ObservationWindow } from "./copernicus/request.ts";

export const demoReportHref = "/results?parcel=parcel-b";
export const reportTop = "report-top";

export function reportHref(query: URLSearchParams): string | null {
  const mode = query.get("mode");
  if (mode === "custom" || mode === "water") {
    if (!pointFromQuery(query.get("lat"), query.get("lng"), query.get("radius") ?? undefined)) return null;
    const hasDates = query.has("from") || query.has("to");
    if (hasDates && !dateObservationWindow(query.get("from"), query.get("to"))) return null;
    return `/results?${query}`;
  }
  const parcel = query.get("parcel");
  return parcel && /^parcel-[a-d]$/.test(parcel) ? `/results?parcel=${parcel}` : demoReportHref;
}

export function withReportPeriod(query: URLSearchParams, period: ObservationWindow) {
  const next = new URLSearchParams(query);
  next.set("from", period.from.slice(0, 10));
  next.set("to", inclusiveEnd(period));
  return next;
}
