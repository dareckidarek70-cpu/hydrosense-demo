"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { Crosshair, LoaderCircle } from "lucide-react";
import type { Observation } from "@/lib/copernicus/observations";
import { inclusiveEnd, observationWindow, type ObservationWindow } from "@/lib/copernicus/request";
import { SatelliteLegend } from "./satellite-legend";
import { useLocale } from "./locale";
import { responseFailure } from "@/lib/copernicus/errors";
import type { MessageKey } from "@/lib/i18n";
import { MapRasterCache } from "@/lib/map-raster-cache";
import { rasterZoom, visibleRasterFraction } from "@/lib/raster-viewport";
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Parcel = {
  id: string;
  label: string;
  center: [number, number];
  polygon: [number, number][];
  areaHectares: number;
};

type LiveParcelMapProps = {
  parcels: Parcel[];
  selectedParcelId: string;
  onSelect: (id: string) => void;
  pickedPoint?: [number, number] | null;
  onPickPoint: (point: [number, number]) => void;
  analysisRadius?: 500 | 1000;
  observation?: Observation | null;
  observationPending?: boolean;
  referenceWindow?: ObservationWindow;
};

type LayerMode = "BASEMAP" | "TRUE_COLOR" | "NDVI" | "NDWI" | "MOISTURE_INDEX";

const markerIcon = new L.Icon({
  iconUrl: "/leaflet-marker-1.9.4.png",
  shadowUrl: "/leaflet-marker-shadow-1.9.4.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function normalizedPoint(latLng: L.LatLng): [number, number] {
  const point = latLng.wrap();
  return [Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6))];
}

function MapClickHandler({
  onPickPoint,
}: {
  onPickPoint: (point: [number, number]) => void;
}) {
  useMapEvents({
    click(event) {
      onPickPoint(normalizedPoint(event.latlng));
    },
  });

  return null;
}

function PickMapCenter({ onPickPoint }: { onPickPoint: (point: [number, number]) => void }) {
  const map = useMap();
  const { t } = useLocale();
  return (
    <div className="map-center-control" ref={(control) => { if (control) L.DomEvent.disableClickPropagation(control); }}>
      <button type="button" className="button-secondary" onClick={() => onPickPoint(normalizedPoint(map.getCenter()))}>
        <Crosshair size={16} aria-hidden="true" /> {t("useMapCenter")}
      </button>
    </div>
  );
}

function SyncMapSize() {
  const map = useMap();
  useEffect(() => {
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    });
    observer.observe(map.getContainer());
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map]);
  return null;
}

function SelectionFocus({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.panTo([lat, lng], { animate: false }); }, [lat, lng, map]);
  return null;
}

function SatelliteOverlay({ selectedLayer, from, to, onStatus, cache }: {
  selectedLayer: Exclude<LayerMode, "BASEMAP">;
  from: string;
  to: string;
  onStatus: (status: MessageKey, coverage?: number) => void;
  cache: MapRasterCache;
}) {
  const map = useMap();

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    let requested: string | undefined;
    let overlay: L.ImageOverlay | undefined;

    async function show(key: string, bounds: L.LatLngBounds) {
      const request = new AbortController();
      controller = request;
      const { signal } = request;
      let pendingUrl: string | undefined;
      let layer: L.ImageOverlay | undefined;
      const cached = cache.get(key);
      const deadline = setTimeout(() => {
        if (signal.aborted) return;
        request.abort();
        layer?.remove();
        requested = undefined;
        onStatus("timeout");
      }, 24_000);

      try {
        let blob: Blob | undefined;
        if (!cached) {
          const response = await fetch(`/api/copernicus/layer?${key}`, { signal });
          if (!response.ok) {
            const code = await responseFailure(response);
            if (!signal.aborted) {
              requested = undefined;
              onStatus(code);
            }
            return;
          }
          if (!response.headers.get("Content-Type")?.startsWith("image/png")) {
            if (!signal.aborted) {
              requested = undefined;
              onStatus("mapInvalidImage");
            }
            return;
          }
          blob = await response.blob();
          if (signal.aborted) return;
          pendingUrl = URL.createObjectURL(blob);
        }

        const url = cached ?? pendingUrl;
        if (!url) return;
        layer = L.imageOverlay(url, bounds, { opacity: 0, zIndex: 20 }).addTo(map);
        overlay = layer;
        const image = layer.getElement();
        const decodeStart = performance.now();
        try {
          if (!image) throw new Error("Missing overlay image");
          await image.decode();
        } catch {
          if (!signal.aborted) {
            if (cached) cache.delete(key);
            layer.remove();
            requested = undefined;
            onStatus("mapInvalidImage");
          }
          return;
        }
        if (signal.aborted) return;
        const decodeMs = Math.round(performance.now() - decodeStart);

        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Missing raster canvas");
        ctx.drawImage(image, 0, 0);
        const coverage = visibleRasterFraction(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
        if (coverage === 0) {
          layer.remove();
          requested = undefined;
          onStatus("mapNoPixels");
          return;
        }
        if (blob) {
          cache.store(key, blob, Date.now(), url);
          pendingUrl = undefined;
        }

        layer.setOpacity(0.9);
        image.dataset.rasterState = "ready";
        image.dataset.rasterDecodeMs = String(decodeMs);
        onStatus("mapReady", coverage);
      } catch {
        if (!signal.aborted) {
          layer?.remove();
          requested = undefined;
          onStatus("mapFallback");
        }
      } finally {
        clearTimeout(deadline);
        if (pendingUrl) URL.revokeObjectURL(pendingUrl);
      }
    }

    function refresh(fit: boolean) {
      if (disposed) return;
      const bounds = map.getBounds();
      const { x, y } = map.getSize();
      const west = bounds.getWest(), south = bounds.getSouth(), east = bounds.getEast(), north = bounds.getNorth();
      const longitudeSpan = east - west, latitudeSpan = north - south;
      if (fit && x > 0 && y > 0) {
        const zoom = map.getZoom();
        const target = rasterZoom(zoom, Math.min(18, map.getMaxZoom()), longitudeSpan, latitudeSpan);
        if (target > zoom) {
          map.setZoom(target, { animate: false });
          return;
        }
      }
      const withinLimits = longitudeSpan <= 1 && latitudeSpan <= 1 && west >= -180 && east <= 180
        && south >= -84 && north <= 84 && x > 0 && y > 0;
      const scale = Math.min(1, 768 / Math.max(x, y));
      const key = withinLimits ? new URLSearchParams({
        minLng: west.toFixed(6), minLat: south.toFixed(6),
        maxLng: east.toFixed(6), maxLat: north.toFixed(6),
        width: String(Math.max(64, Math.round(x * scale))),
        height: String(Math.max(64, Math.round(y * scale))),
        layer: selectedLayer, from, to,
      }).toString() : "";

      if (key === requested) return;
      requested = key;
      controller?.abort();
      overlay?.remove();
      if (key) {
        onStatus("mapRequest");
        void show(key, bounds);
      } else {
        onStatus("zoomMap");
      }
    }

    const onMove = () => refresh(false);
    const onResize = () => refresh(true);
    map.on("moveend", onMove).on("resize", onResize);
    queueMicrotask(onResize);
    return () => {
      disposed = true;
      map.off("moveend", onMove).off("resize", onResize);
      controller?.abort();
      overlay?.remove();
    };
  }, [map, selectedLayer, from, to, onStatus, cache]);

  return null;
}

function LayerControl({
  selectedLayer,
  onChange,
}: {
  selectedLayer: LayerMode;
  onChange: (layer: LayerMode) => void;
}) {
  const { t } = useLocale();
  const layers = [
    ["BASEMAP", t("baseMap")], ["TRUE_COLOR", t("trueColor")],
    ["NDVI", "NDVI"], ["NDWI", "NDWI"], ["MOISTURE_INDEX", "NDMI"],
  ] as const;

  return (
    <div className="satellite-layer-toolbar" role="group" aria-label={t("mapLayer")}>
      {layers.map(([id, name]) => (
        <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={selectedLayer === id}>
          {name}
        </button>
      ))}
    </div>
  );
}

const LiveParcelMap = memo(function LiveParcelMap({
  parcels,
  selectedParcelId,
  onSelect,
  pickedPoint = null,
  onPickPoint,
  analysisRadius = 500,
  observation = null,
  observationPending = false,
  referenceWindow,
}: LiveParcelMapProps) {
  const { t, locale, date, coordinates, num } = useLocale();
  const [selectedLayer, setSelectedLayer] = useState<LayerMode>("BASEMAP");
  const [overlayStatus, setOverlayStatus] = useState<MessageKey | null>(null);
  const [pixelCoverage, setPixelCoverage] = useState<number>();
  const showOverlayStatus = useCallback((status: MessageKey, coverage?: number) => {
    setOverlayStatus(status);
    setPixelCoverage(coverage);
  }, []);
  const [layerAttempt, setLayerAttempt] = useState(0);
  const [defaultWindow] = useState(() => observationWindow());
  const [cache] = useState(() => new MapRasterCache());
  useEffect(() => () => cache.clear(), [cache]);
  const window = observation ?? referenceWindow ?? defaultWindow;

  const selectedParcel =
    parcels.find((parcel) => parcel.id === selectedParcelId) ??
    parcels[0] ??
    null;

  const fallbackCenter: [number, number] = [45.4372, 12.3346];
  const mapCenter = pickedPoint ?? selectedParcel?.center ?? fallbackCenter;

  const selectedOverlayLayer = selectedLayer === "BASEMAP" ? null : selectedLayer;
  const canRetry = overlayStatus && !["mapRequest", "mapReady", "zoomMap", "mapNoPixels"].includes(overlayStatus);

  return (
    <div className="map-shell">
      <LayerControl selectedLayer={selectedLayer} onChange={(layer) => {
        if (layer !== selectedLayer) setOverlayStatus(null);
        setSelectedLayer(layer);
      }} />

      <MapContainer
        center={mapCenter}
        zoom={10}
        zoomControl={false}
        scrollWheelZoom={false}
        trackResize={false}
        className="map-canvas"
      >
        <SyncMapSize />
        <ZoomControl key={locale} zoomInTitle={t("zoomIn")} zoomOutTitle={t("zoomOut")} />
        <TileLayer
          attribution={locale === "pl" ? '© autorzy <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedOverlayLayer && !observationPending ? (
          <SatelliteOverlay
            key={`${selectedOverlayLayer}:${window.from}:${window.to}:${layerAttempt}`}
            selectedLayer={selectedOverlayLayer}
            from={window.from}
            to={window.to}
            onStatus={showOverlayStatus}
            cache={cache}
          />
        ) : null}

        <MapClickHandler onPickPoint={onPickPoint} />
        <PickMapCenter onPickPoint={onPickPoint} />
        <SelectionFocus lat={mapCenter[0]} lng={mapCenter[1]} />

        {parcels.map((parcel) => {
          const isSelected = parcel.id === selectedParcelId;

          return (
            <Polygon
              key={parcel.id}
              bubblingMouseEvents={false}
              positions={parcel.polygon}
              pathOptions={{
                color: isSelected ? "#1d4ed8" : "#64748b",
                weight: isSelected ? 3 : 2,
                fillColor: isSelected ? "#60a5fa" : "#94a3b8",
                fillOpacity: isSelected ? (pickedPoint ? 0.16 : 0.28) : (pickedPoint ? 0.08 : 0.12),
              }}
              eventHandlers={{
                click: () => onSelect(parcel.id),
              }}
            >
              <Popup>
                <strong>{parcel.label}</strong>
                <br />
                {num(parcel.areaHectares)} ha
              </Popup>
            </Polygon>
          );
        })}

        {pickedPoint ? (
          <>
            <Marker key={locale} position={pickedPoint} icon={markerIcon} alt={t("point")}>
              <Popup>
                {t("point")}
                <br />
                {coordinates(pickedPoint)}
              </Popup>
            </Marker>

            <Circle
              center={pickedPoint}
              radius={analysisRadius}
              pathOptions={{
                color: "#1d4ed8",
                fillColor: "#67e8f9",
                fillOpacity: 0.18,
                weight: 2,
              }}
            />
          </>
        ) : selectedParcel ? (
          <Marker key={`${locale}-${selectedParcel.id}`} position={selectedParcel.center} icon={markerIcon} alt={selectedParcel.label}>
            <Popup>{selectedParcel.label}</Popup>
          </Marker>
        ) : null}
      </MapContainer>

      {selectedOverlayLayer ? (
        <>
          <p className="satellite-layer-status" role="status">
            {observationPending || overlayStatus === "mapRequest" ? <LoaderCircle className="loading-icon" size={15} aria-hidden="true" /> : null}
            <span>{observationPending ? t("findingDate") : (
              <>Sentinel-2 L2A · {observation ? t("overlayDay", { date: date(window.from) }) :
                t("referenceMosaic", { from: date(window.from), to: date(inclusiveEnd(window)) })}
              {overlayStatus === "mapReady" && pixelCoverage !== undefined
                ? ` · ${t(pixelCoverage < 0.05 ? "mapSparsePixels" : "mapPixelCoverage", { coverage: num(pixelCoverage * 100, 2) })} ${t("mapReady")}`
                : overlayStatus ? ` · ${t(overlayStatus)}` : ""}</>
            )}</span>
          </p>
          {!observationPending && canRetry ? <button type="button" className="button-secondary satellite-layer-retry"
            onClick={() => { setOverlayStatus("mapRequest"); setLayerAttempt((attempt) => attempt + 1); }}>
            {t("mapRetry")}
          </button> : null}
          <SatelliteLegend key={selectedOverlayLayer} layer={selectedOverlayLayer} />
        </>
      ) : null}
    </div>
  );
});

export default LiveParcelMap;
