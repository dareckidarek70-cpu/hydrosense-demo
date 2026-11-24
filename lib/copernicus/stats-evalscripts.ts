export const PIXEL_RULES = `
function hydroCloud(scl) {
  return scl === 8 || scl === 9 || scl === 10;
}
function hydroClear(sample) {
  return sample.dataMask === 1 && (sample.SCL === 4 || sample.SCL === 5 || sample.SCL === 6);
}
function hydroNormalizedDifference(a, b) {
  return a + b > 0 ? (a - b) / (a + b) : 0;
}
`;

export const STATS_EVALSCRIPT = `//VERSION=3
${PIXEL_RULES}
function setup() {
  return {
    input: [{ bands: ["B03", "B04", "B08", "B8A", "B11", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1 },
      { id: "ndwi", bands: 1 },
      { id: "ndmi", bands: 1 },
      { id: "quality", bands: ["cloud", "clear"] },
      { id: "surface", bands: ["water", "vegetation"] },
      { id: "dataMask", bands: ["ndvi", "ndwi", "ndmi", "quality", "surface"] }
    ]
  };
}
function evaluatePixel(sample) {
  const usable = hydroClear(sample);
  const land = usable && sample.SCL !== 6;
  return {
    ndvi: [hydroNormalizedDifference(sample.B08, sample.B04)],
    ndwi: [hydroNormalizedDifference(sample.B03, sample.B08)],
    ndmi: [hydroNormalizedDifference(sample.B8A, sample.B11)],
    quality: [Number(hydroCloud(sample.SCL)), Number(usable)],
    surface: [Number(sample.SCL === 6), Number(sample.SCL === 4)],
    dataMask: [
      Number(land && sample.B08 + sample.B04 > 0),
      Number(usable && sample.B03 + sample.B08 > 0),
      Number(land && sample.B8A + sample.B11 > 0),
      Number(sample.dataMask === 1 && sample.SCL !== 0 && sample.SCL !== 1),
      Number(usable)
    ]
  };
}
`;
