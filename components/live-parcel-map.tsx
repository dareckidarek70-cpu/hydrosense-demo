"use client";

import { memo, useEffect, useState } from "react";
import { Crosshair, LoaderCircle } from "lucide-react";
import type { Observation } from "@/lib/copernicus/observations";
import { inclusiveEnd, observationWindow, type ObservationWindow } from "@/lib/copernicus/request";
import { SatelliteLegend } from "./satellite-legend";
import { useLocale } from "./locale";
import { responseFailure } from "@/lib/copernicus/errors";
import type { MessageKey } from "@/lib/i18n";
import { MapRasterCache } from "@/lib/map-raster-cache";
import {
  Circle,
  ImageOverlay,
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

function DemoFocus({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.panTo([lat, lng], { animate: false }); }, [lat, lng, map]);
  return null;
}

function SatelliteOverlay({ selectedLayer, from, to, onStatus, cache }: {
  selectedLayer: Exclude<LayerMode, "BASEMAP">;
  from: string;
  to: string;
  onStatus: (status: MessageKey) => void;
  cache: MapRasterCache;
}) {
  const map = useMap();
  const [image, setImage] = useState<{ url: string; bounds: L.LatLngBounds } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let requested: string | undefined;

    function refresh(delay: number) {
      const bounds = map.getBounds();
      const { x, y } = map.getSize();
      const west = bounds.getWest(), south = bounds.getSouth(), east = bounds.getEast(), north = bounds.getNorth();
      const withinLimits = east - west <= 1 && north - south <= 1 && west >= -180 && east <= 180
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
      clearTimeout(timer);
      clearTimeout(deadline);
      controller?.abort();
      const cached = key ? cache.get(key) : undefined;
      timer = setTimeout(async () => {
        if (!key) {
          setImage(null);
          onStatus("zoomMap");
          return;
        }
        if (cached) {
          setImage({ url: cached, bounds });
          onStatus("mapReady");
          return;
        }
        setImage(null);
        controller = new AbortController();
        const { signal } = controller;
        onStatus("mapRequest");
        deadline = setTimeout(() => {
          controller?.abort();
          requested = undefined;
          onStatus("timeout");
        }, 24_000);
        try {
          const response = await fetch(`/api/copernicus/layer?${key}`, { signal });
          if (!response.ok) {
            const code = await responseFailure(response);
            if (!signal.aborted) {
              requested = undefined;
              onStatus(code);
            }
            return;
          }
          const blob = await response.blob();
          if (signal.aborted) return;
          setImage({ url: cache.store(key, blob), bounds });
          onStatus("mapReady");
        } catch {
          if (!signal.aborted) {
            requested = undefined;
            onStatus("mapFallback");
          }
        } finally {
          if (!signal.aborted) clearTimeout(deadline);
        }
      }, cached || !key ? 0 : delay);
    }
    const onViewportChange = () => refresh(160);
    refresh(0);
    map.on("moveend resize", onViewportChange);
    return () => {
      map.off("moveend resize", onViewportChange);
      clearTimeout(timer);
      clearTimeout(deadline);
      controller?.abort();
    };
  }, [map, selectedLayer, from, to, onStatus, cache]);

  return image ? <ImageOverlay url={image.url} bounds={image.bounds} opacity={0.9} zIndex={20} /> : null;
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
            key={`${selectedOverlayLayer}:${window.from}:${window.to}`}
            selectedLayer={selectedOverlayLayer}
            from={window.from}
            to={window.to}
            onStatus={setOverlayStatus}
            cache={cache}
          />
        ) : null}

        <MapClickHandler onPickPoint={onPickPoint} />
        <PickMapCenter onPickPoint={onPickPoint} />
        {!pickedPoint && selectedParcel ? (
          <DemoFocus lat={selectedParcel.center[0]} lng={selectedParcel.center[1]} />
        ) : null}

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
              {overlayStatus ? ` · ${t(overlayStatus)}` : ""}</>
            )}</span>
          </p>
          <SatelliteLegend key={selectedOverlayLayer} layer={selectedOverlayLayer} />
        </>
      ) : null}
    </div>
  );
});

export default LiveParcelMap;
