"""Prepare the two HydroSense regions from SoilGrids WebDAV/VRT, outside the app."""

import argparse
from copy import deepcopy
from datetime import date
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from io import BytesIO
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory
import xml.etree.ElementTree as ET

import numpy as np
from rasterio import open as open_raster
from rasterio.crs import CRS
from rasterio.io import MemoryFile
from rasterio.transform import Affine
from rasterio.windows import Window


SPEC = spec_from_file_location("soil_audit", Path(__file__).with_name("audit-soilgrids.py"))
AUDIT = module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)
DAV = "https://files.isric.org/soilgrids/latest/data/"
DEPTH = "0-5cm"
NODATA = -32768
WEST, NORTH, RESOLUTION = -19949750, 8361000, 250
FIELDS = {
    "phh2o": (10, "pH", 1, 140), "sand": (10, "% mass", 0, 1000),
    "silt": (10, "% mass", 0, 1000), "clay": (10, "% mass", 0, 1000),
    "soc": (10, "g/kg", 0, 10000), "bdod": (100, "kg/dm3", 1, 400),
}
# (north row, west column, rows, columns) in the source VRT, not WGS84 rectangles.
REGIONS = {"biala": (10440, 91101, 16, 16), "veneto": (13187, 87421, 69, 47)}
BANDS = {key: (key, "Q0.5") for key in FIELDS} | {"phLow": ("phh2o", "Q0.05"), "phHigh": ("phh2o", "Q0.95")}


def require(rule, message):
    if not rule:
        raise ValueError(message)


class Archive:
    def __init__(self, folder, download):
        self.folder, self.download = folder, download
        self.manifest = folder / "sources.json"
        self.expected = json.loads(self.manifest.read_bytes()) if self.manifest.exists() else None
        require(download or self.expected is not None, "Offline reconstruction requires sources.json")
        self.records = {}

    def read(self, relative, limit):
        path = self.folder / relative
        if not path.exists() and self.download and self.expected is None:
            path.parent.mkdir(parents=True, exist_ok=True)
            # Only official metadata and the intersecting source rasters are fetched.
            scratch = path.with_suffix(path.suffix + ".part")
            metadata, body = AUDIT.read(DAV + relative, scratch, limit)
            require(body is not None, f"Could not fetch {relative}: {metadata}")
            scratch.replace(path)
        with path.open("rb") as file:
            content = file.read(limit + 1)
        require(len(content) <= limit, f"Oversized source: {relative}")
        record = {"sha256": sha256(content).hexdigest(), "bytes": len(content)}
        if self.expected is not None:
            require(record == self.expected.get(relative), f"Archive checksum mismatch: {relative}")
        self.records[relative] = record
        return content


def overlaps(source, target):
    rect = source.find("DstRect")
    if rect is None:
        return False
    c, r, w, h = (float(rect.get(k)) for k in ("xOff", "yOff", "xSize", "ySize"))
    row, col, rows, cols = target
    return c < col + cols and c + w > col and r < row + rows and r + h > row


def raster_values(data, limits, label):
    minimum, maximum = limits
    valid = data.compressed()
    require(not len(valid) or (int(valid.min()) >= minimum and int(valid.max()) <= maximum),
            f"Source domain or units invalid: {label}")
    return [None if masked else int(value) for value, masked in zip(data.data.flat, np.ma.getmaskarray(data).flat)]


def read_band(archive, prop, quantile, scratch):
    layer = f"{prop}_{DEPTH}_{quantile}"
    root = ET.parse(BytesIO(archive.read(f"{prop}/{layer}.vrt", 16 * 1024 * 1024))).getroot()
    grid = Affine.from_gdal(*map(float, root.findtext("GeoTransform").split(",")))
    crs = CRS.from_wkt(root.findtext("SRS"))
    require(grid.a == RESOLUTION and grid.e == -RESOLUTION and grid.b == grid.d == 0, f"Invalid native grid: {layer}")
    require("+proj=igh" in crs.to_proj4(), f"Unexpected native projection: {layer}")
    # Some provider VRTs start whole cells away (e.g. SOC starts 750 m east).
    dr, dc = (grid.f - NORTH) / RESOLUTION, (WEST - grid.c) / RESOLUTION
    require(dr.is_integer() and dc.is_integer(), f"Unaligned native pixels: {layer}")
    windows = {key: (r + int(dr), c + int(dc), rows, cols) for key, (r, c, rows, cols) in REGIONS.items()}
    source_band = root.find("VRTRasterBand")
    require(source_band.get("dataType") == "Int16" and int(source_band.findtext("NoDataValue")) == NODATA,
            f"Missing explicit VRT NoData or Int16: {layer}")

    local = ET.Element(root.tag, root.attrib)
    for item in root:
        if item.tag in ("SRS", "GeoTransform"):
            local.append(deepcopy(item))
    band = ET.SubElement(local, "VRTRasterBand", source_band.attrib)
    ET.SubElement(band, "NoDataValue").text = str(NODATA)
    used = set()
    for source in source_band:
        if not any(overlaps(source, window) for window in windows.values()):
            continue
        filename = source.find("SourceFilename")
        require(filename is not None and filename.get("relativeToVRT") == "1", f"Non-local source: {layer}")
        path = re.fullmatch(rf"\./({re.escape(layer)}/tileSG-\d+-\d+/tileSG-\d+-\d+_\d-\d\.tif)", filename.text)
        require(path is not None, f"Unexpected source filename for {layer}")
        relative = f"{prop}/{path[1]}"
        used.add(relative)
        require(len(used) <= 6, f"Unexpected source extent: {layer}")
        data = archive.read(relative, 2 * 1024 * 1024)
        with MemoryFile(data) as memory, memory.open() as image:
            require(image.count == 1 and image.dtypes[0] == "int16" and image.nodata == NODATA
                    and image.res == (250, 250) and image.crs == crs and image.scales == (1.0,)
                    and image.offsets == (0.0,), f"Invalid source raster mask/grid/scale: {relative}")
        require(float(source.findtext("ScaleOffset", "0")) == 0 and float(source.findtext("ScaleRatio", "1")) == 1,
                f"Unexpected VRT scaling: {relative}")
        entry = deepcopy(source)
        entry.find("SourceFilename").text = str((archive.folder / relative).resolve())
        entry.find("SourceFilename").set("relativeToVRT", "0")
        band.append(entry)
    require(used, f"No intersecting source tiles: {layer}")
    vrt = Path(scratch) / f"{layer}.vrt"
    ET.ElementTree(local).write(vrt, encoding="utf-8")
    with open_raster(vrt) as image:
        require(image.nodata == NODATA, f"NoData lost in subset: {layer}")
        regions = {}
        for key, (row, col, rows, cols) in windows.items():
            require(0 <= col <= image.width - cols and 0 <= row <= image.height - rows, f"Window outside source: {key}")
            data = image.read(1, window=Window(col, row, cols, rows), masked=True)
            require(data.shape == (rows, cols), f"Invalid window size: {key}")
            regions[key] = raster_values(data, FIELDS[prop][2:], f"{layer}/{key}")
    return crs, [int(dr), int(dc)], regions


def generate(archive, prepared_on):
    regions = {key: {"id": key, "row": row, "col": col, "rows": rows, "cols": cols, "bands": {}}
               for key, (row, col, rows, cols) in REGIONS.items()}
    projection = None
    offsets = {}
    with TemporaryDirectory() as scratch:
        for key, (prop, quantile) in BANDS.items():
            crs, offsets[key], values = read_band(archive, prop, quantile, scratch)
            projection = projection or crs
            require(crs == projection, f"Inconsistent source CRS: {key}")
            for region, band in values.items():
                regions[region]["bands"][key] = band
    for region in regions.values():
        for lower, median, upper in zip(*(region["bands"][k] for k in ("phLow", "phh2o", "phHigh"))):
            require(None in (lower, median, upper) or lower <= median <= upper, f"Unordered pH quantiles: {region['id']}")
    grid = {"west": WEST, "north": NORTH, "meters": RESOLUTION, "projection": "igh"}
    inputs = {"sources": archive.records, "regions": REGIONS, "grid": grid, "bands": BANDS, "units": FIELDS}
    fingerprint = sha256(json.dumps(inputs, sort_keys=True).encode()).hexdigest()
    return {
        "dataset": "ISRIC SoilGrids", "license": "CC-BY-4.0", "schema": 2,
        "version": f"soilgrids-igh250-{fingerprint[:16]}", "preparedOn": prepared_on,
        "grid": grid, "sourceOffsets": offsets,
        "depthCm": [0, 5], "fields": {k: {"divisor": v[0], "unit": v[1]} for k, v in FIELDS.items()},
        "sources": archive.records, "regions": list(regions.values()),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture", required=True, type=Path)
    parser.add_argument("--download", action="store_true", help="Fetch missing official inputs for a new capture")
    parser.add_argument("--prepared-on", required=True, type=date.fromisoformat)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    archive = Archive(args.capture, args.download)
    output = generate(archive, args.prepared_on.isoformat())
    if archive.expected is None:
        archive.manifest.write_text(json.dumps(archive.records, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    args.out.write_text(json.dumps(output, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
