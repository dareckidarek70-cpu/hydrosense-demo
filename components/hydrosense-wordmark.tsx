import Image from "next/image";
import Link from "next/link";
import { brandAssets } from "@/lib/brand-assets";

type HydroSenseWordmarkProps = {
  href?: string;
  subline?: string;
  partnersLabel?: string;
};

export function HydroSenseWordmark({
  href,
  subline,
  partnersLabel,
}: HydroSenseWordmarkProps) {
  const content = (
    <>
      <span className="hydrosense-mark" aria-hidden="true">
        <Image src={brandAssets.hydroSense} alt="" width={40} height={40} unoptimized />
      </span>

      <span className="hydrosense-copy">
        <strong className="hydrosense-word">HydroSense</strong>
        {subline ? <span className="hydrosense-subline">{subline}</span> : null}
      </span>

      <span className="partner-logos" role="group" aria-label={partnersLabel}>
        <Image src={brandAssets.leo} alt="LEOO" width={40} height={40} unoptimized />
        <Image src={brandAssets.astroYouth} alt="Astro Youth" width={40} height={40} unoptimized />
      </span>
    </>
  );

  if (!href) {
    return <div className="hydrosense-lockup">{content}</div>;
  }

  return (
    <Link className="hydrosense-lockup" href={href}>
      {content}
    </Link>
  );
}
