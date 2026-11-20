import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { rasterForTransport } from "../lib/raster-transport.ts";

test("interactive raster compression preserves RGBA, while an ordinary request preserves the original PNG", async () => {
  const width = 64;
  const height = 64;
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < pixels.length / 2; i += 4) pixels.set([77, 179, 51, 255], i);
  const png = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const source = new Uint8Array(png).buffer;
  const optimized = await rasterForTransport(source, "webp");
  assert.equal(optimized.contentType, "image/webp");
  assert.ok(optimized.data.byteLength < png.byteLength);
  const decoded = await sharp(new Uint8Array(optimized.data)).ensureAlpha().raw().toBuffer();
  assert.deepEqual(decoded, pixels);
  assert.deepEqual(await rasterForTransport(source, "png"), { data: source, contentType: "image/png" });
  assert.deepEqual(await rasterForTransport(source.slice(0, 1), "webp"), {
    data: source.slice(0, 1), contentType: "image/png",
  });
});
