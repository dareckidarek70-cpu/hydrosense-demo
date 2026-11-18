"use client";

import { useState } from "react";
import { dateObservationWindow, inclusiveEnd, observationWindow, type ObservationWindow } from "@/lib/copernicus/request";

export function ObservationPeriod({ period, onApply }: {
  period: ObservationWindow;
  onApply: (period: ObservationWindow) => void;
}) {
  const [preset, setPreset] = useState("current");
  const [first, setFirst] = useState(period.from.slice(0, 10));
  const [last, setLast] = useState(inclusiveEnd(period));
  const [error, setError] = useState("");
  const maxDay = inclusiveEnd(observationWindow());

  return (
    <form className="observation-period print-hidden" onSubmit={(event) => {
      event.preventDefault();
      const next = preset === "current" ? period : preset === "custom"
        ? dateObservationWindow(first, last) : observationWindow(new Date(), Number(preset));
      if (!next) {
        setError("Choose complete UTC dates in order, within 366 days and ending no later than yesterday.");
        return;
      }
      setError("");
      onApply(next);
    }}>
      <label>
        <span>Observation period</span>
        <select value={preset} onChange={(event) => setPreset(event.target.value)}>
          <option value="current">Current range</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last 12 months (365 days)</option>
          <option value="custom">Custom dates</option>
        </select>
      </label>
      {preset === "custom" ? (
        <>
          <label><span>Start date (UTC)</span><input type="date" value={first} max={maxDay} required onChange={(event) => setFirst(event.target.value)} /></label>
          <label><span>End date (UTC)</span><input type="date" value={last} max={maxDay} required onChange={(event) => setLast(event.target.value)} /></label>
        </>
      ) : null}
      <button className="button-secondary" type="submit">Apply period</button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
