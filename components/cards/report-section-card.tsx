import { ReactNode } from "react";

type ReportSectionCardProps = {
  title: string;
  body?: string;
  bullets?: string[];
  score?: {
    label: string;
    value: string;
  };
  children?: ReactNode;
};

export function ReportSectionCard({
  title,
  body,
  bullets = [],
  score,
  children,
}: ReportSectionCardProps) {
  return (
    <article className="report-card">
      <div className="summary-row">
        <h3>{title}</h3>
        {score ? (
          <span className="signal">
            {score.label}: {score.value}
          </span>
        ) : null}
      </div>

      {children ? children : body ? <p>{body}</p> : null}

      {bullets.length > 0 ? (
        <ul>
          {bullets.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}