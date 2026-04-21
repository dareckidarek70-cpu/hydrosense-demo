type ScoreCardProps = {
  title: string;
  score?: number;
  value?: number;
  label?: string;
  subtitle?: string;
  description?: string;
  body?: string;
  className?: string;
};

export function ScoreCard({
  title,
  score,
  value,
  label,
  subtitle,
  description,
  body,
  className,
}: ScoreCardProps) {
  const resolvedScore =
    typeof score === "number"
      ? score
      : typeof value === "number"
      ? value
      : 0;

  const resolvedLabel = label ?? subtitle ?? "";
  const resolvedDescription = description ?? body ?? "";

  return (
    <article className={`glass-card score-card${className ? ` ${className}` : ""}`}>
      <p className="score-value">{resolvedScore}</p>

      <div>
        <h3>{title}</h3>
        {resolvedLabel ? <p className="supporting-label">{resolvedLabel}</p> : null}
      </div>

      <div className="progress" aria-hidden="true">
        <span style={{ width: `${resolvedScore}%` }} />
      </div>

      {resolvedDescription ? <p>{resolvedDescription}</p> : null}
    </article>
  );
}