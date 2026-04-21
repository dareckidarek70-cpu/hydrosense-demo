"use client";

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
};

export function ResultsScoreChart({
  investment,
  irrigation,
  cropFit,
}: ResultsScoreChartProps) {
  const data = [
    { name: "Investment", value: investment, color: "#73b17d" },
    { name: "Irrigation", value: irrigation, color: "#79c1b2" },
    { name: "Crop Fit", value: cropFit, color: "#9aca84" },
  ];

  return (
    <section className="glass-card report-chart-card">
      <div className="report-chart-header">
        <p className="eyebrow report-chart-eyebrow">Visual comparison</p>
        <h3 className="report-chart-title">Core indicator chart</h3>
      </div>

      {/* ekran */}
      <div className="report-chart-screen">
        <div className="report-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 18, right: 18, left: 6, bottom: 12 }}
              barCategoryGap="36%"
            >
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(17,49,34,0.12)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#587160", fontSize: 13 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#587160", fontSize: 13 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                formatter={(value) => [`Score: ${value ?? 0}`, ""]}
                  contentStyle={{
                  borderRadius: 16,
                  border: "1px solid rgba(17,49,34,0.08)",
                  background: "rgba(255,255,255,0.96)",
                  color: "#113122",
                }}
                cursor={{ fill: "rgba(17,49,34,0.05)" }}
              />
              <Bar dataKey="value" radius={[14, 14, 0, 0]} maxBarSize={114}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* druk */}
      <div className="report-chart-print">
        <div className="print-bars-vertical">
          {data.map((item) => (
            <div key={item.name} className="print-bar-vertical-item">
              <div className="print-bar-vertical-value">{item.value}</div>

              <div className="print-bar-vertical-track">
                <div
                  className="print-bar-vertical-fill"
                  style={{
                    height: `${item.value}%`,
                    background: item.color,
                  }}
                />
              </div>

              <div className="print-bar-vertical-label">{item.name}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="report-chart-note">
        This score is generated from satellite-derived indicators such as vegetation,
        moisture, and terrain.
      </p>
    </section>
  );
}

export default ResultsScoreChart;