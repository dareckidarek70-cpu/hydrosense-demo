"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  ImageOverlay,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
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
};

type LayerMode = "BASEMAP" | "TRUE_COLOR" | "NDVI" | "NDWI";

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
      onPickPoint([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

function SatelliteOverlay({
  selectedLayer,
}: {
  selectedLayer: Exclude<LayerMode, "BASEMAP">;
}) {
  const map = useMap();
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [overlayBounds, setOverlayBounds] = useState<
    [[number, number], [number, number]] | null
  >(null);

  const refreshOverlay = () => {
    const bounds = map.getBounds();
    const size = map.getSize();

    const minLng = bounds.getWest();
    const minLat = bounds.getSouth();
    const maxLng = bounds.getEast();
    const maxLat = bounds.getNorth();

    const width = Math.max(512, Math.min(1400, Math.round(size.x)));
    const height = Math.max(512, Math.min(1400, Math.round(size.y)));

    const from = "2026-04-01T00:00:00Z";
    const to = "2026-04-30T23:59:59Z";

    const url =
      `/api/copernicus/layer?minLng=${minLng}&minLat=${minLat}&maxLng=${maxLng}&maxLat=${maxLat}` +
      `&width=${width}&height=${height}&layer=${selectedLayer}&from=${encodeURIComponent(
        from
      )}&to=${encodeURIComponent(to)}`;

    setOverlayUrl(url);
    setOverlayBounds([
      [minLat, minLng],
      [maxLat, maxLng],
    ]);
  };

  useEffect(() => {
    refreshOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayer]);

  useMapEvents({
    moveend() {
      refreshOverlay();
    },
    zoomend() {
      refreshOverlay();
    },
    resize() {
      refreshOverlay();
    },
  });

  if (!overlayUrl || !overlayBounds) return null;

  return (
    <ImageOverlay
      url={overlayUrl}
      bounds={overlayBounds}
      opacity={0.72}
      zIndex={1}
      interactive={false}
    />
  );
}

function LayerControl({
  selectedLayer,
  onChange,
}: {
  selectedLayer: LayerMode;
  onChange: (layer: LayerMode) => void;
}) {
  const buttonStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(17,49,34,0.12)",
    background: active ? "#164b35" : "rgba(255,255,255,0.92)",
    color: active ? "#ffffff" : "#173728",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    boxShadow: active ? "0 8px 18px rgba(22,75,53,0.18)" : "none",
    pointerEvents: "auto",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 18,
        left: 18,
        zIndex: 500,
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        maxWidth: "calc(100% - 36px)",
        pointerEvents: "none",
      }}
    >
      <button type="button" onClick={() => onChange("BASEMAP")} style={buttonStyle(selectedLayer === "BASEMAP")}>
        Base map
      </button>
      <button type="button" onClick={() => onChange("TRUE_COLOR")} style={buttonStyle(selectedLayer === "TRUE_COLOR")}>
        True Color
      </button>
      <button type="button" onClick={() => onChange("NDVI")} style={buttonStyle(selectedLayer === "NDVI")}>
        NDVI
      </button>
      <button type="button" onClick={() => onChange("NDWI")} style={buttonStyle(selectedLayer === "NDWI")}>
        NDWI
      </button>
    </div>
  );
}

function MapSourceNote({ selectedLayer }: { selectedLayer: LayerMode }) {
  const text =
    selectedLayer === "BASEMAP"
      ? "Base map view"
      : `Satellite layer: ${selectedLayer.replace("_", " ")}`;

  return (
    <div
      style={{
        position: "absolute",
        left: 18,
        bottom: 18,
        zIndex: 500,
        padding: "8px 12px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(17,49,34,0.1)",
        fontSize: "0.9rem",
        color: "#173728",
        boxShadow: "0 8px 18px rgba(22,75,53,0.08)",
        pointerEvents: "none",
      }}
    >
      {text}
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
}: LiveParcelMapProps) {
  const [selectedLayer, setSelectedLayer] = useState<LayerMode>("BASEMAP");

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

  const selectedOverlayLayer = useMemo(() => {
    if (selectedLayer === "BASEMAP") return null;
    return selectedLayer;
  }, [selectedLayer]);

  const isSatelliteLayer = selectedLayer !== "BASEMAP";

  return (
    <div
      style={{
        position: "relative",
        zIndex: 0,
        minHeight: "560px",
        borderRadius: "28px",
        overflow: "hidden",
        border: "1px solid rgba(17,49,34,0.12)",
        boxShadow: "0 22px 64px rgba(19, 44, 30, 0.1)",
        background: "#f6faf4",
      }}
    >
      <LayerControl selectedLayer={selectedLayer} onChange={setSelectedLayer} />
      <MapSourceNote selectedLayer={selectedLayer} />

      <MapContainer
        center={mapCenter}
        zoom={10}
        scrollWheelZoom={false}
        style={{ height: "560px", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          zIndex={0}
        />

        {selectedOverlayLayer ? (
          <SatelliteOverlay selectedLayer={selectedOverlayLayer} />
        ) : null}

        <MapClickHandler onPickPoint={onPickPoint} />

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
              positions={parcel.polygon as [number, number][]}
              pathOptions={{
                color: isSatelliteLayer
                  ? isSelected
                    ? "#ffffff"
                    : "#dff5e4"
                  : isSelected
                  ? "#164b35"
                  : "#6a8f75",
                weight: isSatelliteLayer
                  ? isSelected
                    ? 4
                    : 3
                  : isSelected
                  ? 3
                  : 2,
                fillColor: isSatelliteLayer
                  ? isSelected
                    ? "#2f9e62"
                    : "#87c38f"
                  : isSelected
                  ? "#87c38f"
                  : "#b8d6ba",
                fillOpacity: isSatelliteLayer
                  ? isSelected
                    ? 0.2
                    : 0.08
                  : selectionMode === "custom"
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
                {parcel.areaHectares ?? "—"} hectares
              </Popup>
            </Polygon>
          );
        })}

        {selectionMode === "custom" && pickedPoint ? (
          <>
            <Marker position={pickedPoint} icon={markerIcon} zIndexOffset={500}>
              <Popup>
                Selected point
                <br />
                {pickedPoint[0].toFixed(5)}, {pickedPoint[1].toFixed(5)}
              </Popup>
            </Marker>

            <Circle
              center={pickedPoint}
              radius={analysisRadius}
              pathOptions={{
                color: isSatelliteLayer ? "#ffffff" : "#164b35",
                fillColor: "#2f9e62",
                fillOpacity: 0.18,
                weight: isSatelliteLayer ? 4 : 2,
              }}
            />
          </>
        ) : selectedParcel ? (
          <Marker position={selectedParcel.center} icon={markerIcon} zIndexOffset={500}>
            <Popup>{selectedParcel.label}</Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}

export default LiveParcelMap;