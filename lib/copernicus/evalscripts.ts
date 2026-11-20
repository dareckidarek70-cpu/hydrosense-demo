import { PIXEL_RULES } from "./stats-evalscripts.ts";
import { palettes } from "./palettes.ts";

function render(bands: string[], pixels: string) {
  return `//VERSION=3
${PIXEL_RULES}
function setup() {
  return {
    input: [${[...bands, "SCL", "dataMask"].map((band) => JSON.stringify(band)).join(", ")}],
    output: { bands: 4 }
  };
}
function evaluatePixel(sample) {
  if (!hydroClear(sample)) return [0, 0, 0, 0];
  ${pixels}
}
`;
}

export const EVALSCRIPTS = {
  TRUE_COLOR: render(["B04", "B03", "B02"], `
    return [sample.B04 * 2.5, sample.B03 * 2.5, sample.B02 * 2.5, 1];
  `),
  NDVI: renderIndex("NDVI", "B08", "B04", true),
  NDWI: renderIndex("NDWI", "B03", "B08", false),
  MOISTURE_INDEX: renderIndex("MOISTURE_INDEX", "B8A", "B11", true),
} as const;

export type LayerType = keyof typeof EVALSCRIPTS;

function renderIndex(layer: keyof typeof palettes, a: string, b: string, landOnly: boolean) {
  const colors = palettes[layer].map(({ below, rgb }, i, steps) => {
    const condition = i < steps.length - 1 ? `if (value < ${below}) ` : "";
    return `${condition}return [${rgb.map((channel) => channel / 255).join(", ")}, 1];`;
  });
  return render([a, b], `
    if (${landOnly ? "sample.SCL === 6 || " : ""}sample.${a} + sample.${b} <= 0) return [0, 0, 0, 0];
    const value = hydroNormalizedDifference(sample.${a}, sample.${b});
    ${colors.join("\n    ")}
  `);
}
