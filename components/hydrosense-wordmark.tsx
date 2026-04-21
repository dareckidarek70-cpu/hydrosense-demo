import Link from "next/link";

type HydroSenseWordmarkProps = {
  href?: string;
  tone?: "dark" | "light";
  subline?: string;
  compact?: boolean;
};

export function HydroSenseWordmark({
  href,
  tone = "dark",
  subline,
  compact = false
}: HydroSenseWordmarkProps) {
  const className = `hydrosense-lockup hydrosense-lockup--${tone}${compact ? " hydrosense-lockup--compact" : ""}`;

  const content = (
    <>
      <span className="hydrosense-mark" aria-hidden="true">
        H
      </span>
      <span className="hydrosense-copy">
        <strong className="hydrosense-word">HydroSense</strong>
        {subline ? <span className="hydrosense-subline">{subline}</span> : null}
      </span>
    </>
  );

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link className={className} href={href}>
      {content}
    </Link>
  );
}
