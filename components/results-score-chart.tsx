"use client";

import { useLocale } from "@/components/locale";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

type ResultsScoreChartProps = {
  investment: number;
  irrigation: number;
  cropFit: number;
  sustainability: number;
};

export function ResultsScoreChart({
  investment,
  irrigation,
  cropFit,
  sustainability,
}: ResultsScoreChartProps) {
  const { t, percent } = useLocale();
  const data = [
    { name: t("investment"), value: investment, color: "#2563eb" },
    { name: t("irrigation"), value: irrigation, color: "#0891b2" },
    { name: t("cropFit"), value: cropFit, color: "#4d72b5" },
    { name: t("sustainability"), value: sustainability, color: "#317fa9" },
  ];

  return (
    <section className="glass-card report-chart-card">
      <div className="report-chart-header">
        <p className="eyebrow report-chart-eyebrow">{t("visualComparison")}</p>
        <h3 className="report-chart-title">{t("demoChart")}</h3>
      </div>

      {/* EKRAN */}
      <div className="report-chart-screen">
        <div className="report-chart-wrap">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 280 }}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 15, left: 2, bottom: 8 }}
              barCategoryGap="33%"
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#d6dfed" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: "#516179", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#516179", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width="auto"
              />
              <Tooltip
                formatter={(value) => [percent(Number(value ?? 0) / 100), t("scoreDemo")]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#0f172a",
                }}
                cursor={{ fill: "#f2f5fa" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DRUK / PDF */}
      <div className="report-chart-print">
        <div className="print-chart-inner">
          

          <div className="print-bars-vertical">
            {data.map((item) => (
              <div key={item.name} className="print-bar-vertical-item">
                <div className="print-bar-vertical-value">{percent(item.value / 100)}</div>

                <div className="print-bar-vertical-track">
                  <div
                    className="print-bar-vertical-fill"
                    style={{
                      height: `${Math.max(0, Math.min(100, item.value))}%`,
                      background: item.color,
                    }}
                  />
                </div>

                <div className="print-bar-vertical-label">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="report-chart-note">{t("demoChartNote")}</p>
    </section>
  );
}

export default ResultsScoreChart;
