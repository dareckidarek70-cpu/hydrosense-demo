"use client";

import { useLocale } from "@/components/locale";

import { useState } from "react";
import { dateObservationWindow, inclusiveEnd, observationWindow, type ObservationWindow } from "@/lib/copernicus/request";

export function ObservationPeriod({ period, onApply }: {
  period: ObservationWindow;
  onApply: (period: ObservationWindow) => void;
}) {
  const { t } = useLocale();
  const [preset, setPreset] = useState("current");
  const [first, setFirst] = useState(period.from.slice(0, 10));
  const [last, setLast] = useState(inclusiveEnd(period));
  const [error, setError] = useState(false);
  const maxDay = inclusiveEnd(observationWindow());

  return (
    <form className="observation-period print-hidden" onSubmit={(event) => {
      event.preventDefault();
      const next = preset === "current" ? period : preset === "custom"
        ? dateObservationWindow(first, last) : observationWindow(new Date(), Number(preset));
      if (!next) {
        setError(true);
        return;
      }
      setError(false);
      onApply(next);
    }}>
      <label>
        <span>{t("period")}</span>
        <select value={preset} onChange={(event) => setPreset(event.target.value)}>
          <option value="current">{t("periodCurrent")}</option>
          <option value="30">{t("period30")}</option>
          <option value="90">{t("period90")}</option>
          <option value="365">{t("period365")}</option>
          <option value="custom">{t("customDates")}</option>
        </select>
      </label>
      {preset === "custom" ? (
        <>
          <label><span>{t("startUtc")}</span><input type="date" value={first} max={maxDay} required onChange={(event) => setFirst(event.target.value)} /></label>
          <label><span>{t("endUtc")}</span><input type="date" value={last} max={maxDay} required onChange={(event) => setLast(event.target.value)} /></label>
        </>
      ) : null}
      <button className="button-secondary" type="submit">{t("applyPeriod")}</button>
      {error ? <p role="alert">{t("dateError")}</p> : null}
    </form>
  );
}
