export const STATS_EVALSCRIPTS = {
  NDVI: `//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B08", "B04", "dataMask"]
    }],
    output: [
      { id: "ndvi", bands: 1 },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(sample) {
  const denom = sample.B08 + sample.B04;
  const ndvi = denom === 0 ? 0 : (sample.B08 - sample.B04) / denom;

  return {
    ndvi: [ndvi],
    dataMask: [sample.dataMask]
  };
}`,

  NDWI: `//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B03", "B08", "dataMask"]
    }],
    output: [
      { id: "ndwi", bands: 1 },
      { id: "dataMask", bands: 1 }
    ]
  };
}

function evaluatePixel(sample) {
  const denom = sample.B03 + sample.B08;
  const ndwi = denom === 0 ? 0 : (sample.B03 - sample.B08) / denom;

  return {
    ndwi: [ndwi],
    dataMask: [sample.dataMask]
  };
}`
} as const;