"use client";

import { useLocale } from "./locale";

const palettes = [
  ["nature", "A · Clean Nature"],
  ["satellite", "B · Satellite Blue"],
  ["neutral", "C · GeoTech Neutral"],
] as const;

export function PreviewPalette() {
  const { locale } = useLocale();
  const polish = locale === "pl";
  return (
    <div className="palette-preview print-hidden">
      <div className="container palette-preview-inner">
        <span className="palette-preview-badge">Preview</span>
        <label>
          <span>{polish ? "Paleta podglądu" : "Preview palette"}</span>
          <select defaultValue="current" onChange={({ currentTarget }) => {
            const palette = currentTarget.value;
            if (palettes.some(([id]) => id === palette)) document.body.dataset.previewPalette = palette;
            else delete document.body.dataset.previewPalette;
          }}>
            <option value="current">{polish ? "Obecny" : "Current"}</option>
            {palettes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
