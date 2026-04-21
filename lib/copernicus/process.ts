import { EVALSCRIPTS, LayerType } from "./evalscripts";

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

  const body = {
    input: {
      bounds: {
        bbox,
        properties: {
          crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
        }
      },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
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

  const response = await fetch("https://sh.dataspace.copernicus.eu/api/v1/process", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Copernicus Process API error: ${response.status} ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
