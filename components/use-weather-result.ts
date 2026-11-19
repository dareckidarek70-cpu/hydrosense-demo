"use client";

import { useEffect, useState } from "react";
import { createWeatherPanelClient, type WeatherPanelResult } from "@/lib/weather/panel-client";

// Both the chart and the observation context share this cache and Retry-After window.
const loadWeather = createWeatherPanelClient();

export function useWeatherResult(key: string | null, attempt: number) {
  const [outcome, setOutcome] = useState<{ key: string; attempt: number; value: WeatherPanelResult }>();

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const value = await loadWeather(key, controller.signal);
      if (value && !controller.signal.aborted) setOutcome({ key, attempt, value });
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, attempt]);

  return outcome?.key === key && outcome.attempt === attempt ? outcome.value : undefined;
}
