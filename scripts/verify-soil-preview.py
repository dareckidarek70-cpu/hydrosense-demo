"""Cross-check regional output directly against the original VRT and archived WCS captures."""

import argparse
from hashlib import sha256
import json
from pathlib import Path
import random

from rasterio import open as open_raster
from rasterio.warp import transform


BANDS = {
    **{key: (key, "Q0.5") for key in ("phh2o", "sand", "silt", "clay", "soc", "bdod")},
    "phLow": ("phh2o", "Q0.05"), "phHigh": ("phh2o", "Q0.95"),
}


def read_int(raster, xy):
    sample = next(raster.sample([xy], masked=True))[0]
    return None if bool(getattr(sample, "mask", False)) else int(sample)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture", required=True, type=Path)
    parser.add_argument("--pack", required=True, type=Path)
    parser.add_argument("--ix-a", required=True, type=Path, help="Directory with the historic WCS captures")
    args = parser.parse_args()
    data = json.loads(args.pack.read_bytes())
    prior = json.loads((args.ix_a / "soilgrids.json").read_bytes())
    rng = random.Random(250)
    grid = data["grid"]
    def xy_at(row, col):
        return grid["west"] + col * grid["meters"], grid["north"] - row * grid["meters"]

    selectors = {r["id"]: rng.sample(range(r["rows"] * r["cols"]), 16) for r in data["regions"]}
    comparison = []
    results = {"bands": {}, "checkedRandomValues": 0, "newPoints": {}}
    for key, (prop, quantile) in BANDS.items():
        layer = f"{prop}_0-5cm_{quantile}"
        with open_raster(args.capture / prop / (layer + ".vrt")) as vrt:
            results["bands"][key] = {}
            for region in data["regions"]:
                name = region["id"]
                values = region["bands"][key]
                for index in selectors[name]:
                    row, col = divmod(index, region["cols"])
                    xy = xy_at(row + region["row"] + .5, col + region["col"] + .5)
                    assert read_int(vrt, xy) == values[index], (name, key, index)
                    results["checkedRandomValues"] += 1
                results["bands"][key][name] = {"nodata": values.count(None), "validZero": values.count(0)}
            for name, point in prior["points"].items():
                capture = point["wcs"][layer]["http"]
                path = args.ix_a / capture["file"]
                assert sha256(path.read_bytes()).hexdigest() == capture["sha256"]
                with open_raster(path) as wcs:
                    xy = point["nativeCellCenter"]
                    item = {"point": name, "band": key, "wcs": read_int(wcs, xy),
                            "wcsNoDataTag": wcs.nodata, "vrt": read_int(vrt, xy)}
                    comparison.append(item)

    for region in data["regions"]:
        name, rows, cols = region["id"], region["rows"], region["cols"]
        counts = {"available": 0, "partial": 0, "no-data": 0}
        examples = {}
        with open_raster(args.capture / "phh2o" / "phh2o_0-5cm_Q0.5.vrt") as vrt:
            for index in range(rows * cols):
                raw = {key: values[index] for key, values in region["bands"].items()}
                present = sum(raw[key] is not None for key in BANDS if key not in ("phLow", "phHigh"))
                state = "no-data" if not present else "available" if present == 6 and None not in raw.values() else "partial"
                counts[state] += 1
                if state not in examples and (state != "available" or index in selectors[name]):
                    row, col = divmod(index, cols)
                    x, y = xy_at(row + region["row"] + .5, col + region["col"] + .5)
                    ([lon], [lat]) = transform(vrt.crs, "EPSG:4326", [x], [y])
                    examples[state] = {"lat": lat, "lon": lon, "raw": raw}
            def corner(r, c):
                x, y = xy_at(r, c)
                ([lon], [lat]) = transform(vrt.crs, "EPSG:4326", [x], [y])
                return [lat, lon]
            r, c = region["row"], region["col"]
            bounds = [corner(r, c), corner(r, c + cols), corner(r + rows, c + cols), corner(r + rows, c)]
        results["newPoints"][name] = {"counts": counts, "examples": examples, "cornersNWNESESW": bounds}
    results["wcsComparisons"] = comparison
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
