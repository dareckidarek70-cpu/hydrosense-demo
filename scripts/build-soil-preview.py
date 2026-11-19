"""Generate the local HydroSense soil extract from the archived IX A GeoTIFF/VRT files."""

import argparse
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from io import BytesIO
import json
import math
from pathlib import Path
from tempfile import TemporaryDirectory
import xml.etree.ElementTree as ET

from rasterio import open as open_raster
from rasterio.crs import CRS
from rasterio.io import MemoryFile
from rasterio.transform import Affine, rowcol
from rasterio.warp import transform


SPEC = spec_from_file_location("soil_audit", Path(__file__).with_name("audit-soilgrids.py"))
AUDIT = module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)
FIELDS = ("phh2o", "sand", "silt", "clay", "soc", "bdod")
DEPTH = "0-5cm"


def require(rule, message):
    if not rule:
        raise ValueError(message)


def generate(capture):
    audit = json.loads((capture / "soilgrids.json").read_bytes())
    hashes = {}

    def read(ref):
        name = ref["file"]
        require(Path(name).name == name, "Expected a local capture filename")
        content = (capture / name).read_bytes()
        digest = sha256(content).hexdigest()
        require(digest == ref["sha256"], f"Capture checksum mismatch: {name}")
        hashes[name] = digest
        return content

    vrt = ET.parse(BytesIO(read(audit["vrt"]))).getroot()
    crs = CRS.from_wkt(vrt.findtext("SRS"))
    grid = Affine.from_gdal(*map(float, vrt.findtext("GeoTransform").split(",")))
    require(grid.a == 250 and grid.e == -250 and grid.b == grid.d == 0, "Expected native 250 m grid")
    points = AUDIT.POINTS
    require(audit["points"].keys() == points.keys(), "Expected the full IX A capture")
    cells = {}
    with TemporaryDirectory() as scratch:
        for name, (lon, lat) in points.items():
            observed = audit["points"][name]
            require(observed["lonLat"] == [lon, lat], f"Unexpected coordinates: {name}")
            ([x], [y]) = transform("EPSG:4326", crs, [lon], [lat])
            row, col = map(int, rowcol(grid, x, y))
            require(observed["cellRowCol"] == [row, col], f"Wrong native cell: {name}")
            center = grid * (col + .5, row + .5)
            tile_path, source = AUDIT.vrt_cell(vrt, col, row)
            tile = observed["webdav"]["http"]
            require(tile["url"] == AUDIT.DAV + tile_path, f"Wrong source mask: {name}")
            path = Path(scratch) / tile["file"]
            path.write_bytes(read(tile))
            vrt_path = Path(scratch) / f"{name}.vrt"
            ET.ElementTree(AUDIT.localized_vrt(vrt, source, path.name)).write(vrt_path, encoding="utf-8")
            with open_raster(vrt_path) as image:
                mask = AUDIT.sample_pixel(image, x, y, center)
            require(mask["nodata"] == -32768 and mask["status"] in ("ok", "nodata"), f"Invalid mask: {name}")

            def raw(prop, quantile):
                layer = f"{prop}_{DEPTH}_{quantile}"
                record = observed["wcs"][layer]["http"]
                require(record["file"] == f"{name}-{layer}.tif", f"Unexpected layer: {name}/{layer}")
                with MemoryFile(read(record)) as memory, memory.open() as image:
                    require(image.shape == (1, 1), f"Not a one-cell extract: {name}/{layer}")
                    ([px], [py]) = transform("EPSG:4326", image.crs, [lon], [lat])
                    require(math.hypot(px - x, py - y) < .001, f"CRS mismatch: {name}/{layer}")
                    sample = AUDIT.sample_pixel(image, x, y, center)
                if mask["status"] == "nodata":
                    require(sample["status"] in ("nodata", "untagged-zero"), f"Conflicting coverage: {name}/{layer}")
                    return None
                require(sample["status"] == "ok", f"Unverified value: {name}/{layer}")
                return sample["raw"]

            values = {prop: raw(prop, "Q0.5") for prop in FIELDS}
            low, high = raw("phh2o", "Q0.05"), raw("phh2o", "Q0.95")
            require(values["phh2o"] == mask["raw"], f"WCS and VRT disagree on pH: {name}")
            if values["phh2o"] is not None:
                require(0 < low <= values["phh2o"] <= high <= 140, f"Invalid pH interval: {name}")
                require(all(0 <= values[k] <= 1000 for k in ("sand", "silt", "clay")), f"Invalid texture: {name}")
                require(values["soc"] >= 0 and values["bdod"] > 0, f"Invalid carbon/density: {name}")
            cells[f"{row}:{col}"] = None if mask["status"] == "nodata" else {
                "rawMedian": values, "rawPhInterval": [low, high],
            }

    return {
        "dataset": "ISRIC SoilGrids",
        "license": "CC-BY-4.0",
        "captureDate": audit["checkedAtUtc"][:10],
        "grid": {"west": grid.c, "north": grid.f, "meters": 250, "projection": "igh"},
        "depthCm": [0, 5],
        "cells": cells,
        "inputSha256": hashes,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture", required=True, type=Path, help="Unpacked isric directory from the IX A audit")
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    args.out.write_text(json.dumps(generate(args.capture), indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
