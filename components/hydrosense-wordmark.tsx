import Image from "next/image";
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
  compact = false,
}: HydroSenseWordmarkProps) {
  const className = `hydrosense-lockup hydrosense-lockup--${tone}${
    compact ? " hydrosense-lockup--compact" : ""
  }`;

  const content = (
    <>
      <span className="hydrosense-mark hydrosense-mark--image" aria-hidden="true">
        <Image src="/hydrosense-logo.png" alt="" width={40} height={40} priority />
      </span>

      <span className="hydrosense-copy">
        <strong className="hydrosense-word">HydroSense</strong>
        {subline ? <span className="hydrosense-subline">{subline}</span> : null}
      </span>

      {!compact ? (
        <span className="partner-logos" aria-label="Project partner logos">
          <Image src="/Projekt_Logo.png" alt="LEOO" width={40} height={40} />
          <Image src="/sketch_Logo.jpg" alt="Astro Youth" width={40} height={40} />
        </span>
      ) : null}
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