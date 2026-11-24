import sharp from "sharp";

export async function rasterForTransport(png: ArrayBuffer, format: "png" | "webp") {
  if (format === "webp") {
    try {
      const webp = await sharp(new Uint8Array(png)).webp({ lossless: true, effort: 1 }).toBuffer();
      if (webp.byteLength < png.byteLength) {
        return { data: new Uint8Array(webp).buffer, contentType: "image/webp" };
      }
    } catch {
      // Keep the original image available if conversion fails.
    }
  }
  return { data: png, contentType: "image/png" };
}
