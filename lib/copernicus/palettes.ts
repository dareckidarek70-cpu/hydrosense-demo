export const palettes = {
  NDVI: [
    { below: 0, rgb: [191, 191, 191] },
    { below: 0.2, rgb: [230, 204, 51] },
    { below: 0.4, rgb: [153, 204, 51] },
    { below: 0.6, rgb: [77, 179, 51] },
    { below: 1, rgb: [0, 128, 0] },
  ],
  NDWI: [
    { below: -0.2, rgb: [204, 191, 140] },
    { below: 0, rgb: [140, 191, 115] },
    { below: 0.2, rgb: [89, 179, 179] },
    { below: 1, rgb: [26, 89, 230] },
  ],
  MOISTURE_INDEX: [
    { below: -0.2, rgb: [199, 158, 107] },
    { below: 0, rgb: [219, 199, 122] },
    { below: 0.2, rgb: [140, 184, 122] },
    { below: 0.4, rgb: [71, 158, 173] },
    { below: 1, rgb: [20, 82, 224] },
  ],
} as const;
