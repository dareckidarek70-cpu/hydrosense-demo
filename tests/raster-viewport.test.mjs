import assert from "node:assert/strict";
import { test } from "node:test";
import { rasterZoom, visibleRasterFraction } from "../lib/raster-viewport.ts";

test("fits a desktop raster request within the one-degree limit without changing views that already fit", () => {
  assert.equal(rasterZoom(10, 18, 1.115, 0.51), 11);
  assert.equal(rasterZoom(11, 18, 0.558, 0.27), 11);
  assert.equal(rasterZoom(8, 18, 4.01, 3.11), 11);
  assert.equal(rasterZoom(10, 18, 0.93, 1), 10);
  assert.equal(rasterZoom(17, 18, 4.01, 0.4), 18);
});

test("distinguishes a fully masked raster from visible black or partially transparent pixels", () => {
  assert.equal(visibleRasterFraction(new Uint8ClampedArray([140, 80, 30, 0, 0, 0, 0, 0])), 0);
  assert.equal(visibleRasterFraction(new Uint8ClampedArray([0, 0, 0, 255])), 1);
  assert.equal(visibleRasterFraction(new Uint8ClampedArray([1, 2, 3, 0, 4, 5, 6, 1])), 0.5);
});
