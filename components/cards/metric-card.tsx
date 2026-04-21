type MetricCardProps = {
  label: string;
  title: string;
  value: string;
};

export function MetricCard({ label, title, value }: MetricCardProps) {
  return (
    <article className="metric-card">
      <p className="supporting-label">{label}</p>
      <h3>{title}</h3>
      <p>{value}</p>
    </article>
  );
}
