export const EVALSCRIPTS = {
  TRUE_COLOR: `//VERSION=3
function setup() {
  return {
    input: ["B04", "B03", "B02", "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  return [sample.B04 * 2.5, sample.B03 * 2.5, sample.B02 * 2.5, sample.dataMask];
}`,

  NDVI: `//VERSION=3
function setup() {
  return {
    input: ["B08", "B04", "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  if (ndvi < 0) return [0.75, 0.75, 0.75, sample.dataMask];
  if (ndvi < 0.2) return [0.9, 0.8, 0.2, sample.dataMask];
  if (ndvi < 0.4) return [0.6, 0.8, 0.2, sample.dataMask];
  if (ndvi < 0.6) return [0.3, 0.7, 0.2, sample.dataMask];
  return [0.0, 0.5, 0.0, sample.dataMask];
}`,

  NDWI: `//VERSION=3
function setup() {
  return {
    input: ["B03", "B08", "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
  if (ndwi < -0.2) return [0.8, 0.75, 0.55, sample.dataMask];
  if (ndwi < 0.0) return [0.55, 0.75, 0.45, sample.dataMask];
  if (ndwi < 0.2) return [0.35, 0.7, 0.7, sample.dataMask];
  return [0.1, 0.35, 0.9, sample.dataMask];
}`
} as const;

export type LayerType = keyof typeof EVALSCRIPTS;
