"use client";

import { useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import type { Observation } from "@/lib/copernicus/observations";
import { inclusiveEnd, observationWindow, type ObservationWindow } from "@/lib/copernicus/request";
import { SatelliteLegend } from "./satellite-legend";
import { useLocale } from "./locale";
import { responseFailure } from "@/lib/copernicus/errors";
import type { MessageKey } from "@/lib/i18n";
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
  polygon?: [number, number][];
  areaHectares?: number;
};

type LiveParcelMapProps = {
  parcels?: Parcel[];
  selectedParcelId: string;
  onSelect: (id: string) => void;
  selectionMode?: "demo" | "custom";
  pickedPoint?: [number, number] | null;
  onPickPoint?: (point: [number, number]) => void;
  analysisRadius?: 500 | 1000;
  observation?: Observation | null;
  observationPending?: boolean;
  referenceWindow?: ObservationWindow;
};

type LayerMode = "BASEMAP" | "TRUE_COLOR" | "NDVI" | "NDWI" | "MOISTURE_INDEX";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({
  onPickPoint,
}: {
  onPickPoint?: (point: [number, number]) => void;
}) {
  useMapEvents({
    click(event) {
      if (!onPickPoint) return;
      const point = event.latlng.wrap();
      onPickPoint([Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6))]);
    },
  });

  return null;
}

function PickMapCenter({ onPickPoint }: { onPickPoint: (point: [number, number]) => void }) {
  const map = useMap();
  const { t } = useLocale();
  return (
    <div className="map-center-control" ref={(control) => { if (control) L.DomEvent.disableClickPropagation(control); }}>
      <button type="button" className="button-secondary" onClick={() => {
        const point = map.getCenter().wrap();
        onPickPoint([Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6))]);
      }}>
        <Crosshair size={16} aria-hidden="true" /> {t("useMapCenter")}
      </button>
    </div>
  );
}

function DemoFocus({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.panTo([lat, lng], { animate: false }); }, [lat, lng, map]);
  return null;
}

function SatelliteOverlay({ selectedLayer, from, to, onStatus }: {
  selectedLayer: Exclude<LayerMode, "BASEMAP">;
  from: string;
  to: string;
  onStatus: (status: MessageKey) => void;
}) {
  const map = useMap();
  const [image, setImage] = useState<{ url: string; bounds: L.LatLngBounds } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let imageUrl: string | undefined;
    function refresh() {
      clearTimeout(timer);
      clearTimeout(deadline);
      controller?.abort();
      timer = setTimeout(async () => {
        setImage(null);
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        imageUrl = undefined;
        const bounds = map.getBounds();
        const size = map.getSize();
        const [west, south, east, north] = [
          bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
        ];
        if (east - west > 1 || north - south > 1 || west < -180 || east > 180
          || south < -84 || north > 84) {
          onStatus("zoomMap");
          return;
        }
        const scale = Math.min(1, 768 / Math.max(size.x, size.y));
        const search = new URLSearchParams({
          minLng: west.toFixed(6), minLat: south.toFixed(6),
          maxLng: east.toFixed(6), maxLat: north.toFixed(6),
          width: String(Math.max(64, Math.round(size.x * scale))),
          height: String(Math.max(64, Math.round(size.y * scale))),
          layer: selectedLayer, from, to,
        });
        controller = new AbortController();
        const { signal } = controller;
        onStatus("mapRequest");
        deadline = setTimeout(() => {
          controller?.abort();
          onStatus("timeout");
        }, 24_000);
        try {
          const response = await fetch(`/api/copernicus/layer?${search}`, { signal });
          if (!response.ok) {
            const code = await responseFailure(response);
            if (!signal.aborted) onStatus(code);
            return;
          }
          const blob = await response.blob();
          if (signal.aborted) return;
          imageUrl = URL.createObjectURL(blob);
          setImage({ url: imageUrl, bounds });
          onStatus("mapReady");
        } catch {
          if (!signal.aborted) onStatus("mapFallback");
        } finally {
          if (!signal.aborted) clearTimeout(deadline);
        }
      }, 250);
    }
    refresh();
    map.on("moveend resize", refresh);
    return () => {
      map.off("moveend resize", refresh);
      clearTimeout(timer);
      clearTimeout(deadline);
      controller?.abort();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [map, selectedLayer, from, to, onStatus]);

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

export function LiveParcelMap({
  parcels = [],
  selectedParcelId,
  onSelect,
  selectionMode = "demo",
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
  const window = observation ?? referenceWindow ?? observationWindow();

  const safeParcels = Array.isArray(parcels)
    ? parcels.filter(
        (parcel) =>
          parcel &&
          typeof parcel.id === "string" &&
          Array.isArray(parcel.center) &&
          parcel.center.length === 2 &&
          typeof parcel.center[0] === "number" &&
          typeof parcel.center[1] === "number"
      )
    : [];

  const selectedParcel =
    safeParcels.find((parcel) => parcel.id === selectedParcelId) ??
    safeParcels[0] ??
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
        className="map-canvas"
 >
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
          />
        ) : null}

        <MapClickHandler onPickPoint={onPickPoint} />
        {onPickPoint ? <PickMapCenter onPickPoint={onPickPoint} /> : null}
        {selectionMode === "demo" && selectedParcel ? (
          <DemoFocus lat={selectedParcel.center[0]} lng={selectedParcel.center[1]} />
        ) : null}

        {safeParcels.map((parcel) => {
          const hasPolygon =
            Array.isArray(parcel.polygon) &&
            parcel.polygon.length >= 3 &&
            parcel.polygon.every(
              (point) =>
                Array.isArray(point) &&
                point.length === 2 &&
                typeof point[0] === "number" &&
                typeof point[1] === "number"
            );

          if (!hasPolygon) return null;

          const isSelected = parcel.id === selectedParcelId;

          return (
            <Polygon
              key={parcel.id}
              bubblingMouseEvents={false}
              positions={parcel.polygon as [number, number][]}
              pathOptions={{
                color: isSelected ? "#1d4ed8" : "#64748b",
                weight: isSelected ? 3 : 2,
                fillColor: isSelected ? "#60a5fa" : "#94a3b8",
                fillOpacity:
                  selectionMode === "custom"
                    ? isSelected
                      ? 0.16
                      : 0.08
                    : isSelected
                    ? 0.28
                    : 0.12,
              }}
              eventHandlers={{
                click: () => onSelect(parcel.id),
              }}
            >
              <Popup>
                <strong>{parcel.label}</strong>
                <br />
                {parcel.areaHectares === undefined ? "—" : num(parcel.areaHectares)} ha
              </Popup>
            </Polygon>
          );
        })}

        {selectionMode === "custom" && pickedPoint ? (
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
            {observationPending ? t("findingDate") : (
              <>Sentinel-2 L2A · {observation ? t("overlayDay", { date: date(window.from) }) :
                t("referenceMosaic", { from: date(window.from), to: date(inclusiveEnd(window)) })}
              {overlayStatus ? ` · ${t(overlayStatus)}` : ""}</>
            )}
          </p>
          <SatelliteLegend key={selectedOverlayLayer} layer={selectedOverlayLayer} />
        </>
      ) : null}
    </div>
  );
}

export default LiveParcelMap;
