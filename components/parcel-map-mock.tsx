"use client";

import { DemoParcel } from "@/lib/types";

type ParcelMapMockProps = {
  parcels: DemoParcel[];
  selectedParcelId: DemoParcel["id"];
  onSelect: (parcelId: DemoParcel["id"]) => void;
};

const parcelClassMap: Record<DemoParcel["id"], string> = {
  "parcel-a": "parcel-shape parcel-shape--a",
  "parcel-b": "parcel-shape parcel-shape--b",
  "parcel-c": "parcel-shape parcel-shape--c"
};

export function ParcelMapMock({ parcels, selectedParcelId, onSelect }: ParcelMapMockProps) {
  return (
    <div className="map-card map-art parcel-map-shell">
      <div className="map-overlay">
        <div className="label-row">
          <span className="signal">Satellite parcel review</span>
          <span className="pill">Three Veneto demo parcels</span>
        </div>
        <div>
          <p className="supporting-label" style={{ color: "rgba(232, 247, 236, 0.68)" }}>
            Copernicus/GIS concept layer
          </p>
          <h3 className="section-title" style={{ color: "#f2fff5" }}>
            Select the parcel to frame the live investment narrative
          </h3>
          <p className="map-guidance">The active parcel updates the summary card and the executive brief flow.</p>
        </div>
      </div>

      <div className="parcel-map-canvas">
        {parcels.map((parcel) => (
          <button
            key={parcel.id}
            className={`${parcelClassMap[parcel.id]} ${
              parcel.id === selectedParcelId ? "parcel-shape--active" : ""
            }`}
            onClick={() => onSelect(parcel.id)}
            aria-pressed={parcel.id === selectedParcelId}
            type="button"
          >
            <span>{parcel.label}</span>
          </button>
        ))}
      </div>

      <div className="parcel-list">
        {parcels.map((parcel) => (
          <button
            key={parcel.id}
            className={`parcel-list-item ${parcel.id === selectedParcelId ? "parcel-list-item--active" : ""}`}
            onClick={() => onSelect(parcel.id)}
            aria-pressed={parcel.id === selectedParcelId}
            type="button"
          >
            <span className="supporting-label">{parcel.id.toUpperCase()}</span>
            <strong>{parcel.label}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
