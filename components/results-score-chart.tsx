import { localization, type Locale } from "@/lib/i18n";

type Scores = Record<"investment" | "irrigation" | "cropFit" | "sustainability", number>;

const series = {
  investment: "#2563eb",
  irrigation: "#0891b2",
  cropFit: "#4d72b5",
  sustainability: "#317fa9",
} as const;
const scoreKeys = Object.keys(series) as (keyof Scores)[];

export function ResultsScoreChart({ scores, locale }: { scores: Scores; locale: Locale }) {
  const { t, percent } = localization(locale);
  const data = scoreKeys.map((key) => ({
    label: t(key),
    score: scores[key],
    value: percent(scores[key] / 100),
    color: series[key],
  }));

  return (
    <section className="report-chart-card" aria-labelledby="demo-chart-title">
      <p className="eyebrow report-chart-eyebrow">{t("visualComparison")}</p>
      <h3 id="demo-chart-title" className="report-chart-title">{t("demoChart")}</h3>

      <div className="report-chart-screen report-chart-wrap">
        <ul className="demo-chart-list">
          {data.map(({ label, score, value, color }) => (
            <li className="demo-chart-row" key={label}>
              <span>{label}</span>
              <span className="demo-chart-track" role="meter" tabIndex={0}
                aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-valuetext={value}>
                <span className="demo-chart-fill" style={{ width: `${score}%`, background: color }} />
                <span className="demo-chart-tooltip" aria-hidden="true">{t("scoreDemo")}: {value}</span>
              </span>
              <strong aria-hidden="true">{value}</strong>
            </li>
          ))}
        </ul>
        <div className="demo-chart-axis" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((tick) => <span key={tick}>{tick}</span>)}
        </div>
      </div>

      <div className="report-chart-print print-bars-vertical">
        {data.map(({ label, score, value, color }) => (
          <div key={label} className="print-bar-vertical-item">
            <div className="print-bar-vertical-value">{value}</div>
            <div className="print-bar-vertical-track">
              <div className="print-bar-vertical-fill" style={{ height: `${Math.max(0, Math.min(100, score))}%`, background: color }} />
            </div>
            <div className="print-bar-vertical-label">{label}</div>
          </div>
        ))}
      </div>

      <p className="report-chart-note">{t("demoChartNote")}</p>
    </section>
  );
}
