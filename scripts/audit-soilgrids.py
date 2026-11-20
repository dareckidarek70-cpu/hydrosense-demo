"""Read public test pixels from SoilGrids without involving the HydroSense app."""

import argparse
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
import json
import math
from pathlib import Path
import re
import ssl
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener
import xml.etree.ElementTree as ET

import certifi
from rasterio import open as open_raster
from rasterio.crs import CRS
from rasterio.errors import RasterioIOError
from rasterio.io import MemoryFile
from rasterio.transform import Affine, rowcol
from rasterio.warp import transform


POINTS = {"biala": (23.0804, 52.0423), "venice": (12.30, 45.41), "veneto-land": (12.15, 45.55)}
DAV = "https://files.isric.org/soilgrids/latest/data/phh2o/"
WCS = "https://maps.isric.org/mapserv"
NATIVE = "http://www.opengis.net/def/crs/EPSG/0/152160"
VRT = "phh2o_0-5cm_Q0.5.vrt"
PROPERTIES = {
    "phh2o": (10, "pH (H2O)"), "sand": (10, "% mass"), "silt": (10, "% mass"),
    "clay": (10, "% mass"), "soc": (10, "g/kg"), "bdod": (100, "kg/dm3"),
    "cec": (10, "cmol(c)/kg"), "nitrogen": (100, "g/kg"),
}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        return None


def read(url, target, limit):
    opener = build_opener(NoRedirect(), HTTPSHandler(context=ssl.create_default_context(cafile=certifi.where())))
    start = time.monotonic()
    try:
        with opener.open(Request(url, headers={"Accept-Encoding": "identity"}), timeout=12) as response:
            status, mime = response.status, response.headers.get_content_type()
            content = response.read(limit + 1)
    except HTTPError as error:
        status, mime = error.code, error.headers.get_content_type()
        content = error.read(min(limit, 16384))
    except (TimeoutError, URLError) as error:
        return {"url": url, "error": str(error), "ms": round((time.monotonic() - start) * 1000)}, None
    meta = {"url": url, "status": status, "type": mime, "bytes": len(content), "ms": round((time.monotonic() - start) * 1000)}
    if len(content) > limit:
        return {**meta, "error": "body-too-large"}, None
    target.write_bytes(content)
    return {**meta, "sha256": sha256(content).hexdigest(), "file": target.name}, content if status == 200 else None


def sample_pixel(image, x, y, expected_center):
    i, j = image.index(x, y)
    if (image.count != 1 or image.dtypes[0] != "int16" or image.res != (250, 250)
            or not (0 <= i < image.height and 0 <= j < image.width)
            or not all(math.isclose(a, b, abs_tol=0.01) for a, b in zip(image.xy(i, j), expected_center))):
        return {"status": "grid-mismatch", "raw": None}
    sample = next(image.sample([(x, y)], masked=True))[0]
    raw = int(sample) if not bool(getattr(sample, "mask", False)) else None
    raw = None if raw == -32768 else raw
    # WCS can export a masked cell as zero without writing a NoData tag.
    status = "nodata" if raw is None else "untagged-zero" if raw == 0 and image.nodata is None else "ok"
    return {"status": status, "raw": raw,
            "size": [image.width, image.height], "resolutionMeters": list(image.res), "nodata": image.nodata}


def geotiff_pixel(content, x, y, expected_center):
    if content is None:
        return {"status": "unavailable", "raw": None}
    if content[:4] not in (b"II*\0", b"MM\0*"):
        return {"status": "not-geotiff", "raw": None, "excerpt": content[:360].decode(errors="replace")}
    try:
        with MemoryFile(content) as memory, memory.open() as image:
            return sample_pixel(image, x, y, expected_center)
    except RasterioIOError:
        return {"status": "invalid-geotiff", "raw": None}


def vrt_cell(document, column, row):
    for source in reversed(document.findall("./VRTRasterBand/*")):
        dst, filename = source.find("DstRect"), source.find("SourceFilename")
        if dst is None or filename is None or filename.get("relativeToVRT") != "1":
            continue
        x, y, w, h = (float(dst.attrib[key]) for key in ("xOff", "yOff", "xSize", "ySize"))
        if x <= column + 0.5 < x + w and y <= row + 0.5 < y + h:
            name = filename.text or ""
            if re.fullmatch(r"\./phh2o_0-5cm_Q0\.5/tileSG-\d+-\d+/tileSG-\d+-\d+_\d-\d\.tif", name):
                return name[2:], source
    return None


def localized_vrt(document, source, tile_name):
    local = ET.Element(document.tag, document.attrib)
    for child in document:
        if child.tag != "VRTRasterBand":
            local.append(deepcopy(child))
    upstream = document.find("VRTRasterBand")
    band = ET.SubElement(local, upstream.tag, upstream.attrib)
    for child in upstream:
        if child.find("SourceFilename") is None:
            band.append(deepcopy(child))
    entry = deepcopy(source)
    entry.find("SourceFilename").text = tile_name
    band.append(entry)
    return local


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, type=Path, help="Local directory for raw responses and JSON manifest")
    parser.add_argument("--point", choices=tuple(POINTS), action="append", help="Repeat to test both; default: both")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    manifest = {"checkedAtUtc": datetime.now(timezone.utc).isoformat(), "points": {}}
    manifest["vrt"], metadata = read(DAV + VRT, args.out / VRT, 5 * 1024 * 1024)
    if not metadata:
        (args.out / "soilgrids.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(manifest, indent=2))
        return 1
    document = ET.parse(BytesIO(metadata)).getroot()
    native = CRS.from_wkt(document.findtext("SRS"))
    grid = Affine.from_gdal(*[float(a) for a in document.findtext("GeoTransform").split(",")])
    fields = [(p, "0-5cm", "Q0.5") for p in PROPERTIES]
    fields += [("phh2o", "0-5cm", q) for q in ("Q0.05", "Q0.95")]
    fields += [("phh2o", "5-15cm", "Q0.5")]
    for label in args.point or ("biala", "venice"):
        lon, lat = POINTS[label]
        ([x], [y]) = transform("EPSG:4326", native, [lon], [lat])
        row, col = map(int, rowcol(grid, x, y))
        cx, cy = grid * (col + 0.5, row + 0.5)
        point = {"lonLat": [lon, lat], "nativeXY": [x, y], "cellRowCol": [row, col],
                 "nativeCellCenter": [cx, cy], "wcs": {}}
        manifest["points"][label] = point
        for prop, depth, quantile in fields:
            identifier = f"{prop}_{depth}_{quantile}"
            params = [
                ("map", f"/map/{prop}.map"), ("SERVICE", "WCS"), ("VERSION", "2.0.1"),
                ("REQUEST", "GetCoverage"), ("COVERAGEID", identifier), ("FORMAT", "GEOTIFF_INT16"),
                ("SUBSETTINGCRS", NATIVE), ("OUTPUTCRS", NATIVE),
                ("SUBSET", f"X({cx - 125},{cx + 125})"), ("SUBSET", f"Y({cy - 125},{cy + 125})"),
            ]
            http, content = read(WCS + "?" + urlencode(params), args.out / f"{label}-{identifier}.tif", 64 * 1024)
            sample = geotiff_pixel(content, x, y, (cx, cy))
            factor, unit = PROPERTIES[prop]
            raw = sample["raw"]
            point["wcs"][identifier] = {"http": http, **sample, "divisor": factor,
                                       "unit": unit, "value": raw / factor if sample["status"] == "ok" else None}
            time.sleep(0.25)
        candidate = vrt_cell(document, col, row)
        if candidate:
            tile, source = candidate
            path = args.out / f"{label}-pH-webdav.tif"
            http, content = read(DAV + tile, path, 2 * 1024 * 1024)
            sample = {"status": "unavailable", "raw": None}
            if content and content[:4] in (b"II*\0", b"MM\0*"):
                local = args.out / f"{label}-pH-webdav.vrt"
                ET.ElementTree(localized_vrt(document, source, path.name)).write(local, encoding="utf-8")
                with open_raster(local) as image:
                    sample = sample_pixel(image, x, y, (cx, cy))
            point["webdav"] = {"http": http, **sample}
        else:
            point["webdav"] = {"status": "vrt-tile-missing", "raw": None}
    output = json.dumps(manifest, indent=2)
    (args.out / "soilgrids.json").write_text(output + "\n", encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
