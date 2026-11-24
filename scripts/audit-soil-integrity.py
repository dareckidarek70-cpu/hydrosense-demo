"""Independent offline check of regional SoilGrids data against the original VRTs."""

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import random
import subprocess

import numpy as np
from rasterio import open as open_raster
from rasterio.windows import Window
from rasterio.warp import transform


ROOT = Path(__file__).resolve().parent.parent
LAYERS = {
    "phh2o": ("phh2o", "Q0.5"), "phLow": ("phh2o", "Q0.05"), "phHigh": ("phh2o", "Q0.95"),
    **{name: (name, "Q0.5") for name in ("sand", "silt", "clay", "soc", "bdod")},
}
WINDOWS = {"biala": (2825500, 5751000, 16, 16), "veneto": (1905500, 5064250, 69, 47)}
CELL = 250
TOLERANCE = .001  # metres in the projected CRS


def audit(capture, regenerated):
    manifest = json.loads((capture / "sources.json").read_bytes())
    for name, expected in manifest.items():
        data = (capture / name).read_bytes()
        assert {"sha256": sha256(data).hexdigest(), "bytes": len(data)} == expected, name
    pack = json.loads(regenerated.read_bytes())
    assert manifest == pack["sources"]
    assert pack["depthCm"] == [0, 5] and pack["license"] == "CC-BY-4.0" and pack["schema"] == 2
    rng = random.Random(20261120)
    old_rng = random.Random(250)
    selection = {}
    points = []
    totals = {"sources": len(manifest), "sourceValues": 0, "newRandomValues": 0, "regions": {}}
    for region in pack["regions"]:
        name = region["id"]
        west, north, rows, cols = WINDOWS[name]
        count = rows * cols
        old_sample = set(old_rng.sample(range(count), 16))
        selection[name] = rng.sample([i for i in range(count) if i not in old_sample], 64)
        east, south = west + cols * CELL, north - rows * CELL
        for rank, index in enumerate(selection[name]):
            row, col = divmod(index, cols)
            dx, dy = rng.uniform(1, CELL - 1), rng.uniform(1, CELL - 1)
            if rank < 32:
                dx = .025 if rank % 2 else CELL - .025
                dy = .025 if rank % 4 < 2 else CELL - .025
            points.append(("random", west + col * CELL + dx, north - row * CELL - dy))
        for x, y, dx, dy in [
            (west, (north + south) / 2, 1, 0), (east, (north + south) / 2, -1, 0),
            ((west + east) / 2, north, 0, -1), ((west + east) / 2, south, 0, 1),
        ]:
            # Offset along the edge to avoid testing two exact boundaries simultaneously.
            x += 17 if dx == 0 else 0
            y += 17 if dy == 0 else 0
            points.extend((("edge", x + .025 * dx, y + .025 * dy),
                           ("edge", x - .025 * dx, y - .025 * dy), ("exact-edge", x, y)))
        region_audit = {"cells": count, "bands": {}}
        masks = []
        for key, (prop, quantile) in LAYERS.items():
            with open_raster(capture / prop / f"{prop}_0-5cm_{quantile}.vrt") as vrt:
                assert vrt.res == (CELL, CELL) and vrt.nodata == -32768
                row, col = vrt.index(west + CELL / 2, north - CELL / 2)
                expected_offset = [row - region["row"], col - region["col"]]
                assert pack["sourceOffsets"][key] == expected_offset
                data = vrt.read(1, window=Window(col, row, cols, rows), masked=True)
                assert data.shape == (rows, cols)
                mask = np.ma.getmaskarray(data).ravel()
                masks.append(mask)
                values = region["bands"][key]
                expected = [None if empty else int(value) for value, empty in zip(data.data.flat, mask)]
                assert expected == values, (name, key)
                totals["sourceValues"] += count
                sample_points = [vrt.xy(row + i // cols, col + i % cols) for i in selection[name]]
                for i, sample in zip(selection[name], vrt.sample(sample_points, masked=True)):
                    actual = None if np.ma.is_masked(sample[0]) else int(sample[0])
                    assert actual == values[i], (name, key, i)
                    totals["newRandomValues"] += 1
                region_audit["bands"][key] = {"masked": int(mask.sum()), "validZeros": expected.count(0),
                                              "rowColOffset": expected_offset}
        assert all(np.array_equal(masks[0], mask) for mask in masks[1:])
        region_audit.update({"available": count - int(masks[0].sum()), "partial": 0, "noData": int(masks[0].sum())})
        totals["regions"][name] = region_audit

    ph_path = capture / "phh2o" / "phh2o_0-5cm_Q0.5.vrt"
    with open_raster(ph_path) as vrt:
        lons, lats = transform(vrt.crs, "EPSG:4326", [p[1] for p in points], [p[2] for p in points])
        x_ref, y_ref = transform("EPSG:4326", vrt.crs, lons, lats)
        js = subprocess.run(["node", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e",
            """import {readFileSync} from 'node:fs'; import {projectSoilPreviewPoint,soilCellKey,soilPreviewAt}
            from './lib/soil-preview.ts'; const p=JSON.parse(readFileSync(0,'utf8'));
            console.log(JSON.stringify(p.map(point=>{const xy=projectSoilPreviewPoint(point);
            return {xy,key:soilCellKey(xy),status:soilPreviewAt(point).status}})));"""],
            input=json.dumps(list(zip(lats, lons))), text=True, capture_output=True, check=True, cwd=ROOT)
        max_error = 0
        bounding = {"random": 0, "edge": 0, "exact-edge": 0, "ambiguousExactIndex": 0}
        for (kind, _, _), x, y, actual in zip(points, x_ref, y_ref, json.loads(js.stdout), strict=True):
            err = math.dist(actual["xy"], (x, y))
            max_error = max(max_error, err)
            assert err < TOLERANCE
            row, col = vrt.index(x, y)
            bounding[kind] += 1
            if actual["key"] != f"{row}:{col}":
                assert kind == "exact-edge" and any(distance(x - vrt.transform.c, y - vrt.transform.f))
                r, c = map(int, actual["key"].split(":"))
                assert abs(r - row) + abs(c - col) == 1
                bounding["ambiguousExactIndex"] += 1
            if kind != "exact-edge":
                expected = "outside"
                for region in pack["regions"]:
                    r, c = row - region["row"], col - region["col"]
                    if 0 <= r < region["rows"] and 0 <= c < region["cols"]:
                        expected = "no-data" if region["bands"]["phh2o"][r * region["cols"] + c] is None else "available"
                assert actual["status"] == expected
        totals["projection"] = {**bounding, "maxErrorMeters": max_error, "toleranceMeters": TOLERANCE}
    return totals


def distance(*offsets):
    return [abs(value - round(value / CELL) * CELL) <= TOLERANCE for value in offsets]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture", type=Path, required=True)
    parser.add_argument("--regenerated", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(audit(args.capture, args.regenerated), indent=2))
