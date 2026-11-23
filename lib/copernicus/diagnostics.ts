import { UpstreamBudgetError } from "../upstream-budget.ts";
import { classifyFailure, CopernicusHttpError } from "./errors.ts";

type Stage = "oauth" | "statistics" | "raster" | "budget:oauth" | "budget:statistics" | "budget:raster";

export async function withCopernicusStage<T>(stage: Stage, run: () => Promise<T>,
  preview = process.env.VERCEL_ENV === "preview"): Promise<T> {
  if (!preview) return run();
  const start = performance.now();
  const elapsed = () => Math.round(performance.now() - start);
  try {
    const result = await run();
    console.info("[HydroSense Copernicus]", stage, "ok", elapsed());
    return result;
  } catch (error) {
    const code = error instanceof UpstreamBudgetError ? error.kind : classifyFailure(error).code;
    const status = error instanceof CopernicusHttpError ? error.status : null;
    console.warn("[HydroSense Copernicus]", stage, code, elapsed(), status);
    throw error;
  }
}
