type FeatureCardProps = {
  title: string;
  description: string;
  detail: string;
};

export function FeatureCard({ title, description, detail }: FeatureCardProps) {
  return (
    <article className="glass-card">
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="signal">{detail}</span>
    </article>
  );
}
