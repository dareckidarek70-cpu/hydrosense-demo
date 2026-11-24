import { EVALSCRIPTS, LayerType } from "./evalscripts";
import { CopernicusHttpError } from "./errors";
import { DAY } from "./request";
import { satelliteRasterWeight, takeUpstreamBudget } from "../upstream-budget";
import { withCopernicusStage } from "./diagnostics";

type BBox = [number, number, number, number];

export async function fetchLayerImage(params: {
  bbox: BBox;
  width: number;
  height: number;
  timeFrom: string;
  timeTo: string;
  layer: LayerType;
  accessToken: string;
}) {
  const { bbox, width, height, timeFrom, timeTo, layer, accessToken } = params;
  const [west, south, east, north] = bbox;
  const meters = 6378137;
  const x = (lng: number) => meters * lng * Math.PI / 180;
  const y = (lat: number) => meters * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));

  const body = {
    input: {
      bounds: {
        bbox: [x(west), y(south), x(east), y(north)],
        properties: {
          crs: "http://www.opengis.net/def/crs/EPSG/0/3857"
        }
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            mosaickingOrder: "mostRecent",
            timeRange: {
              from: timeFrom,
              to: timeTo
            }
          }
        }
      ]
    },
    output: {
      width,
      height,
      responses: [
        {
          identifier: "default",
          format: {
            type: "image/png"
          }
        }
      ]
    },
    evalscript: EVALSCRIPTS[layer]
  };

  await withCopernicusStage("budget:raster", () => takeUpstreamBudget("copernicus-layer", satelliteRasterWeight(
    (Date.parse(timeTo) - Date.parse(timeFrom)) / DAY, width, height,
  )));
  return withCopernicusStage("raster", async () => {
    const response = await fetch("https://sh.dataspace.copernicus.eu/api/v1/process", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store"
    });

    if (!response.ok) {
      throw new CopernicusHttpError(response.status, response.headers.get("Retry-After"));
    }

    return response.arrayBuffer();
  });
}
