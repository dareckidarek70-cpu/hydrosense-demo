"use client";

type MapLegendProps = {
  layer: "TRUE_COLOR" | "NDVI" | "NDWI";
};

export function MapLegend({ layer }: MapLegendProps) {
  if (layer === "TRUE_COLOR") return null;

  if (layer === "NDVI") {
    return (
      <div className="map-legend">
        <strong>Vegetation health (NDVI)</strong>

        <div className="legend-scale">
          <span style={{ background: "#8b0000" }} />
          <span style={{ background: "#d95f0e" }} />
          <span style={{ background: "#fdae61" }} />
          <span style={{ background: "#a6d96a" }} />
          <span style={{ background: "#1a9850" }} />
        </div>

        <div className="legend-labels">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    );
  }

  if (layer === "NDWI") {
    return (
      <div className="map-legend">
        <strong>Surface moisture (NDWI)</strong>

        <div className="legend-scale">
          <span style={{ background: "#8c510a" }} />
          <span style={{ background: "#d8b365" }} />
          <span style={{ background: "#f6e8c3" }} />
          <span style={{ background: "#5ab4ac" }} />
          <span style={{ background: "#01665e" }} />
        </div>

        <div className="legend-labels">
          <span>Dry</span>
          <span>Wet</span>
        </div>
      </div>
    );
  }

  return null;
}

export default MapLegend;