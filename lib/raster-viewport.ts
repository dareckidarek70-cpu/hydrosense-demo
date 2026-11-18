export function rasterZoom(zoom: number, maxZoom: number, longitudeSpan: number, latitudeSpan: number) {
  const span = Math.max(longitudeSpan, latitudeSpan);
  return Math.min(maxZoom, zoom + Math.max(0, Math.ceil(Math.log2(span))));
}

export function visibleRasterFraction(rgba: Uint8ClampedArray) {
  let visible = 0;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] !== 0) visible++;
  }
  return rgba.length ? visible / (rgba.length / 4) : 0;
}
