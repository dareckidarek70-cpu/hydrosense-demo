import { indices, indexKeys, type IndexKey } from "@/lib/copernicus/interpretation";
import { palettes } from "@/lib/copernicus/palettes";
import type { LayerType } from "@/lib/copernicus/evalscripts";

export function IndexScale({ index }: { index: IndexKey }) {
  const definition = indices[index];
  return (
    <ul className="layer-swatch-list" aria-label={`${definition.label} map display intervals`}>
      {palettes[definition.layer].map(({ below, rgb }, i, bins) => (
        <li key={below}>
          <span aria-hidden="true" style={{ background: `rgb(${rgb.join(",")})` }} />
          {bins[i - 1]?.below ?? -1} to {i === bins.length - 1 ? "1" : `< ${below}`}
        </li>
      ))}
    </ul>
  );
}

export function SatelliteLegend({ layer }: { layer: LayerType }) {
  const index = indexKeys.find((key) => indices[key].layer === layer);
  return (
    <details className="map-layer-legends satellite-legend" open>
      <summary>{index ? `${indices[index].label} · ${indices[index].title}` : "True Color · Natural-colour image"}</summary>
      {index ? (
        <>
          <IndexScale index={index} />
          <p><strong>{indices[index].formula}</strong></p>
          <p>{indices[index].limitation} The colour breaks group the display range; they are not validated land or water classifications.</p>
        </>
      ) : (
        <>
          <div className="rgb-scale" aria-hidden="true" />
          <div className="rgb-labels"><span>0 · dark</span><span>255 · bright</span></div>
          <p>Red B04, green B03 and blue B02 are each brightened by 2.5×, then clipped to 0–255 for display. These colours have no index thresholds.</p>
          <p>Clouds, shadows and invalid pixels are transparent. Bright surfaces can saturate, and appearance alone does not identify land use.</p>
        </>
      )}
    </details>
  );
}
