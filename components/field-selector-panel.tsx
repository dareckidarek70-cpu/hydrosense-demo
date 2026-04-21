"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ParcelId = "parcel-a" | "parcel-b" | "parcel-c";

type ParcelOption = {
  id: ParcelId;
  mapId: string;
  label: string;
  center: [number, number];
  polygon: [number, number][];
  areaHectares: number;
  terrainType: string;
  cropModel: string;
  dataSources: string[];
  scores: {
    investment: number;
    irrigation: number;
    cropFit: number;
    risk: "Low" | "Medium" | "High";
  };
};

type LiveStatsResponse = {
  stats: {
    medianNdvi: number | null;
    medianNdwi: number | null;
    ndviStdDev: number | null;
    ndwiStdDev: number | null;
    sampleCount: number;
    intervals: {
      ndvi: Array<{
        mean: number | null;
        stDev: number | null;
        sampleCount: number;
      }>;
      ndwi: Array<{
        mean: number | null;
        stDev: number | null;
        sampleCount: number;
      }>;
    };
  };
  scores: {
    investment: number;
    irrigation: number;
    cropFit: number;
    risk: "Low" | "Medium" | "High";
  };
  meta?: {
    source: "copernicus-live" | "fallback";
    note: string;
  };
};

const LiveParcelMap = dynamic(() => import("@/components/live-parcel-map"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "560px",
        borderRadius: "28px",
        border: "1px solid rgba(17,49,34,0.12)",
        boxShadow: "0 22px 64px rgba(19, 44, 30, 0.1)",
        background: "rgba(255,255,255,0.55)",
      }}
    />
  ),
});

const parcelOptions: ParcelOption[] = [
  {
    id: "parcel-a",
    mapId: "PARCEL-A",
    label: "Parcel A — Veneto North",
    center: [45.52, 12.18],
    polygon: [
      [45.528, 12.145],
      [45.533, 12.205],
      [45.505, 12.215],
      [45.498, 12.16],
    ],
    areaHectares: 184,
    terrainType: "Mixed agricultural plot",
    cropModel: "Cereals and rotation crops",
    dataSources: ["Copernicus", "GIS overlays", "Terrain model"],
    scores: {
      investment: 72,
      irrigation: 68,
      cropFit: 75,
      risk: "Medium",
    },
  },
  {
    id: "parcel-b",
    mapId: "PARCEL-B",
    label: "Parcel B — Mestre Plain",
    center: [45.49, 12.24],
    polygon: [
      [45.502, 12.215],
      [45.507, 12.278],
      [45.474, 12.286],
      [45.468, 12.225],
    ],
    areaHectares: 212,
    terrainType: "Flat irrigable plain",
    cropModel: "Vegetable and maize rotation",
    dataSources: ["Copernicus", "GIS overlays", "Terrain model"],
    scores: {
      investment: 84,
      irrigation: 81,
      cropFit: 86,
      risk: "Low",
    },
  },
  {
    id: "parcel-c",
    mapId: "PARCEL-C",
    label: "Parcel C — Coastal Belt",
    center: [45.44, 12.32],
    polygon: [
      [45.452, 12.292],
      [45.458, 12.35],
      [45.427, 12.362],
      [45.418, 12.305],
    ],
    areaHectares: 196,
    terrainType: "Coastal parcel with mixed constraints",
    cropModel: "Specialty crops and adaptive rotation",
    dataSources: ["Copernicus", "GIS overlays", "Terrain model"],
    scores: {
      investment: 67,
      irrigation: 73,
      cropFit: 70,
      risk: "Medium",
    },
  },
];

function buildFallbackCustomAnalysis(point: [number, number], radius: 500 | 1000) {
  const [lat, lng] = point;

  const latSeed = Math.abs(Math.round(lat * 1000)) % 11;
  const lngSeed = Math.abs(Math.round(lng * 1000)) % 13;
  const mix = latSeed + lngSeed;

  return {
    label: "Selected area on the map",
    id: "CUSTOM-ZONE",
    area: radius === 500 ? "500 m radius" : "1 km radius",
    terrainType: "Selected location",
    cropModel: "Live satellite-based suitability check",
    dataSources: ["Copernicus", "Terrain model", "Map selection"],
    scores: {
      investment: Math.min(92, 68 + (mix % 9) + (radius === 1000 ? 4 : 0)),
      irrigation: Math.min(91, 64 + (mix % 10) + (radius === 1000 ? 5 : 0)),
      cropFit: Math.min(90, 66 + (mix % 8) + (radius === 1000 ? 3 : 0)),
      risk: mix % 3 === 0 ? "Low" : mix % 3 === 1 ? "Medium" : "High",
    } as const,
    point,
  };
}

function buildResultsUrl(params: {
  mode: "demo" | "custom";
  parcel?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  investment?: number;
  irrigation?: number;
  cropFit?: number;
  risk?: string;
  source?: string;
}) {
  const search = new URLSearchParams();

  search.set("mode", params.mode);

  if (params.mode === "demo" && params.parcel) {
    search.set("parcel", params.parcel);
  }

  if (params.mode === "custom") {
  if (typeof params.lat === "number") search.set("lat", String(params.lat));
  if (typeof params.lng === "number") search.set("lng", String(params.lng));
  if (typeof params.radius === "number") search.set("radius", String(params.radius));
  if (typeof params.investment === "number") search.set("investment", String(params.investment));
  if (typeof params.irrigation === "number") search.set("irrigation", String(params.irrigation));
  if (typeof params.cropFit === "number") search.set("cropFit", String(params.cropFit));
  if (typeof params.risk === "string") search.set("risk", params.risk);
  if (typeof params.source === "string") search.set("source", params.source);
}

  return `/results?${search.toString()}`;
}

function getSourceBadge(meta?: LiveStatsResponse["meta"]) {
  if (meta?.source === "copernicus-live") {
    return {
      text: "LIVE",
      bg: "rgba(36,107,68,0.12)",
      color: "#1f5e3c",
      border: "1px solid rgba(36,107,68,0.18)",
    };
  }

  if (meta?.source === "fallback") {
    return {
      text: "ESTIMATED",
      bg: "rgba(124,110,84,0.12)",
      color: "#6f5a38",
      border: "1px solid rgba(124,110,84,0.18)",
    };
  }

  return null;
}

export function FieldSelectorPanel() {
  const router = useRouter();

  const [selectedParcelId, setSelectedParcelId] = useState<ParcelId>("parcel-b");
  const [selectionMode, setSelectionMode] = useState<"demo" | "custom">("demo");
  const [pickedPoint, setPickedPoint] = useState<[number, number] | null>(null);
  const [analysisRadius, setAnalysisRadius] = useState<500 | 1000>(500);

  const [liveStats, setLiveStats] = useState<LiveStatsResponse | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const selectedParcel =
    parcelOptions.find((parcel) => parcel.id === selectedParcelId) ?? parcelOptions[1];

  const fallbackCustomAnalysis = useMemo(() => {
    if (!pickedPoint) return null;
    return buildFallbackCustomAnalysis(pickedPoint, analysisRadius);
  }, [pickedPoint, analysisRadius]);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      if (selectionMode !== "custom" || !pickedPoint) {
        setLiveStats(null);
        setIsLoadingStats(false);
        return;
      }

      setIsLoadingStats(true);

      try {
        const response = await fetch("/api/copernicus/stats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            geometry: {
              type: "PointBuffer",
              coordinates: [pickedPoint[0], pickedPoint[1]],
              radiusMeters: analysisRadius,
            },
            from: "2025-10-01T00:00:00Z",
            to: "2026-04-20T23:59:59Z",
          }),
        });

        const text = await response.text();

        if (!response.ok) {
          throw new Error(text || `HTTP ${response.status}`);
        }

        const parsed = JSON.parse(text) as LiveStatsResponse;

        if (cancelled) return;
        setLiveStats(parsed);
      } catch {
        if (cancelled) return;
        setLiveStats({
          stats: {
            medianNdvi: null,
            medianNdwi: null,
            ndviStdDev: null,
            ndwiStdDev: null,
            sampleCount: 0,
            intervals: {
              ndvi: [],
              ndwi: [],
            },
          },
          scores: fallbackCustomAnalysis?.scores ?? {
            investment: 70,
            irrigation: 66,
            cropFit: 69,
            risk: "Medium",
          },
          meta: {
            source: "fallback",
            note: "Live satellite data temporarily unavailable — showing estimated screening values.",
          },
        });
      } finally {
        if (!cancelled) {
          setIsLoadingStats(false);
        }
      }
    };

    const timer = window.setTimeout(loadStats, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectionMode, pickedPoint, analysisRadius, fallbackCustomAnalysis]);

  const activeTitle =
    selectionMode === "custom"
      ? "Selected area on the map"
      : selectedParcel.label;

  const activeSignal =
    selectionMode === "custom" ? "Custom point" : "Selected";

  const activeAreaId =
    selectionMode === "custom"
      ? "CUSTOM-ZONE"
      : selectedParcel.mapId;

  const activeAreaValue =
    selectionMode === "custom"
      ? analysisRadius === 500
        ? "500 m radius"
        : "1 km radius"
      : `${selectedParcel.areaHectares} hectares`;

  const activeTerrain =
    selectionMode === "custom"
      ? "Selected location"
      : selectedParcel.terrainType;

  const activeCrop =
    selectionMode === "custom"
      ? "Live satellite-based suitability check"
      : selectedParcel.cropModel;

  const activeDataSources =
    selectionMode === "custom"
      ? ["Copernicus", "Terrain model", "Map selection"]
      : selectedParcel.dataSources;

  const activeScores =
    selectionMode === "custom"
      ? liveStats?.scores ?? fallbackCustomAnalysis?.scores ?? {
          investment: 70,
          irrigation: 66,
          cropFit: 69,
          risk: "Medium" as const,
        }
      : selectedParcel.scores;

  const isFallbackSource =
    selectionMode === "custom" && liveStats?.meta?.source === "fallback";

  const sourceNote =
    selectionMode === "custom" ? liveStats?.meta?.note ?? null : null;

  const sourceBadge =
    selectionMode === "custom" ? getSourceBadge(liveStats?.meta) : null;

  const customResultsHref =
  selectionMode === "custom" && pickedPoint
    ? buildResultsUrl({
        mode: "custom",
        lat: pickedPoint[0],
        lng: pickedPoint[1],
        radius: analysisRadius,
        investment: activeScores.investment,
        irrigation: activeScores.irrigation,
        cropFit: activeScores.cropFit,
        risk: activeScores.risk,
        source: liveStats?.meta?.source === "copernicus-live" ? "live" : "estimated",
      })
    : null;

  const demoResultsHref = buildResultsUrl({
    mode: "demo",
    parcel: selectedParcel.id,
  });

  return (
    <div className="selection-layout">
      <LiveParcelMap
        parcels={parcelOptions.map((parcel) => ({
          id: parcel.mapId,
          label: parcel.label,
          center: parcel.center,
          polygon: parcel.polygon,
          areaHectares: parcel.areaHectares,
        }))}
        selectedParcelId={selectedParcel.mapId}
        onSelect={(mapId) => {
          const found = parcelOptions.find((parcel) => parcel.mapId === mapId);
          if (!found) return;

          setSelectionMode("demo");
          setSelectedParcelId(found.id);
          setPickedPoint(null);
          setLiveStats(null);
        }}
        selectionMode={selectionMode}
        pickedPoint={pickedPoint}
        onPickPoint={(point) => {
          setSelectionMode("custom");
          setPickedPoint(point);
        }}
        analysisRadius={analysisRadius}
      />

      <div className="metric-stack">
        <div className="glass-card summary-card summary-card--active">
          <div className="summary-row">
            <div>
              <p className="supporting-label">Selected area</p>
              <h3>{activeTitle}</h3>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {sourceBadge ? (
                <span
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    background: sourceBadge.bg,
                    color: sourceBadge.color,
                    border: sourceBadge.border,
                  }}
                >
                  {sourceBadge.text}
                </span>
              ) : null}

              <span className="signal">{activeSignal}</span>
            </div>
          </div>

          <p className="body-copy summary-copy">
            {selectionMode === "custom"
              ? isLoadingStats
                ? "Live Copernicus statistics are being calculated for the selected point."
                : "This selected point is ready to be turned into a full decision-ready brief."
              : "This parcel is ready for a quick analysis and works well for a live presentation."}
          </p>

          {selectionMode === "custom" && (
            <div style={{ display: "grid", gap: "10px", marginTop: "4px" }}>
              <p className="supporting-label" style={{ marginBottom: 0 }}>
                Analysis radius
              </p>

              <button
                type="button"
                className="button-secondary"
                onClick={() => setAnalysisRadius(500)}
                style={{
                  justifyContent: "center",
                  borderColor: analysisRadius === 500 ? "rgba(36,107,68,0.28)" : undefined,
                  background: analysisRadius === 500 ? "rgba(36,107,68,0.08)" : undefined,
                }}
              >
                500 m
              </button>

              <button
                type="button"
                className="button-secondary"
                onClick={() => setAnalysisRadius(1000)}
                style={{
                  justifyContent: "center",
                  borderColor: analysisRadius === 1000 ? "rgba(36,107,68,0.28)" : undefined,
                  background: analysisRadius === 1000 ? "rgba(36,107,68,0.08)" : undefined,
                }}
              >
                1 km
              </button>
            </div>
          )}

          <div className="summary-grid">
            <div>
              <p className="supporting-label">
                {selectionMode === "custom" ? "Area ID" : "Parcel ID"}
              </p>
              <strong>{activeAreaId}</strong>
            </div>
            <div>
              <p className="supporting-label">Area</p>
              <strong>{activeAreaValue}</strong>
            </div>
            <div>
              <p className="supporting-label">Terrain</p>
              <strong>{activeTerrain}</strong>
            </div>
            <div>
              <p className="supporting-label">Current crops</p>
              <strong>{activeCrop}</strong>
            </div>
          </div>

          <div className="summary-score-strip">
            <div className="summary-score-pill">
              <span>Investment</span>
              <strong>{activeScores.investment}</strong>
            </div>
            <div className="summary-score-pill">
              <span>Irrigation</span>
              <strong>{activeScores.irrigation}</strong>
            </div>
            <div className="summary-score-pill">
              <span>Crop fit</span>
              <strong>{activeScores.cropFit}</strong>
            </div>
          </div>

          <div>
            <p className="supporting-label">Data sources</p>
            <div className="badge-row">
              {activeDataSources.map((item) => (
                <span className="pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {selectionMode === "custom" && pickedPoint && (
            <div>
              <p className="supporting-label">Selected point</p>
              <strong>
                {pickedPoint[0].toFixed(5)}, {pickedPoint[1].toFixed(5)}
              </strong>
            </div>
          )}

          {sourceNote ? (
            <p
              style={{
                marginTop: 16,
                color: isFallbackSource ? "#6d756f" : "#5d6f62",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              {sourceNote}
            </p>
          ) : null}
        </div>

        <div className="glass-card">
          <div className="section-heading" style={{ marginBottom: 14 }}>
            <p className="eyebrow">Preview</p>
            <h3 style={{ margin: 0 }}>What you will see next</h3>
          </div>

          <p className="body-copy" style={{ marginBottom: 18 }}>
            {selectionMode === "custom"
              ? "Generate a full brief for the selected point and continue to the executive review page."
              : "Generate a summary for the selected parcel and continue to the results page."}
          </p>

          <div className="button-row button-row--stack">
            <button
              type="button"
              className="button"
              disabled={selectionMode === "custom" && !customResultsHref}
              onClick={() => {
                if (selectionMode === "custom" && customResultsHref) {
                  router.push(customResultsHref);
                  return;
                }

                router.push(demoResultsHref);
              }}
            >
              Generate summary
            </button>

            <Link href={buildResultsUrl({ mode: "demo", parcel: "parcel-b" })} className="button-secondary">
              Open sample brief
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FieldSelectorPanel;