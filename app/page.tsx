import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ChartNoAxesCombined, FileText, Layers3, ScanLine } from "lucide-react";
import { getLocalization } from "@/lib/i18n/server";
import sentinelScene from "@/public/sentinel-biala-20260816.webp";

const capabilities = [
  { icon: ScanLine, title: "toolArea", copy: "toolAreaText" },
  { icon: Layers3, title: "toolSignals", copy: "toolSignalsText" },
  { icon: ChartNoAxesCombined, title: "toolHistory", copy: "toolHistoryText" },
  { icon: FileText, title: "toolReport", copy: "toolReportText" },
] as const;

const sample = {
  coordinates: [52.0423, 23.0804] as [number, number],
  date: "2026-08-16",
  href: "/results?mode=custom&lat=52.0423&lng=23.0804&radius=500&from=2026-08-16&to=2026-08-16",
};

export default async function HomePage() {
  const { t, date, coordinates } = await getLocalization();
  return (
    <div className="home-page">
      <section className="container home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow home-hero-kicker"><span aria-hidden="true" />{t("heroIntro")}</p>
          <h1 className="display-title">{t("heroTitle")}</h1>
          <p className="lead">{t("heroLead")}</p>
          <div className="button-row home-actions">
            <Link className="button" href="/select-area">{t("selectArea")} <ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="button-secondary" href="/results?parcel=parcel-b" prefetch={false}>{t("demoBrief")}</Link>
          </div>
          <ul className="hero-sensors" aria-label={t("index")}>
            <li>NDVI</li><li>NDWI</li><li>NDMI</li>
          </ul>
        </div>

        <figure className="scene-card">
          <div className="scene-head">
            <span><ScanLine size={17} aria-hidden="true" /> Sentinel-2 L2A</span>
            <span className="scene-tag">{t("sampleScene")}</span>
          </div>
          <Link className="scene-preview" href={sample.href} aria-label={t("openScene")} prefetch={false}>
            <Image src={sentinelScene} fill unoptimized preload alt={t("sampleImage")} />
            <svg viewBox="0 0 768 460" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <path d="M26 65V26h39m638 0h39v39m0 330v39h-39m-638 0H26v-39" fill="none" stroke="#c2f6fc" strokeWidth="1.5" opacity=".8" />
              <circle cx="384" cy="230" r="121" fill="#1baee7" fillOpacity=".08" stroke="#a5f3fc" strokeWidth="2.5" />
              <circle cx="384" cy="230" r="132" fill="none" stroke="#e0faff" strokeWidth="1" strokeDasharray="3 7" opacity=".85" />
              <path d="M384 213v34m-17-17h34" stroke="#e0faff" strokeWidth="1.5" />
              <circle cx="384" cy="230" r="4" fill="#e0faff" />
            </svg>
            <span className="scene-coordinates">{coordinates(sample.coordinates)}</span>
            <span className="scene-layer">TRUE COLOR</span>
          </Link>
          <figcaption>
            <div className="scene-caption">
              <div>
                <h2>{t("sampleLocation")}</h2>
                <p>{date(sample.date)} UTC · 500 m</p>
              </div>
              <Link className="scene-link" href={sample.href} aria-label={t("openScene")} prefetch={false}><ArrowDownRight size={20} aria-hidden="true" /></Link>
            </div>
            <p className="scene-credit">Contains modified Copernicus Sentinel data [2026], processed by Sentinel Hub</p>
          </figcaption>
        </figure>
      </section>

      <section className="home-toolkit" aria-labelledby="toolkit-heading">
        <div className="container">
          <p className="eyebrow">{t("toolset")}</p>
          <h2 className="section-title" id="toolkit-heading">{t("toolsetTitle")}</h2>
          <div className="toolkit-grid">
            {capabilities.map(({ icon: Icon, title, copy }, i) => (
              <article className="tool-card" key={title}>
                <div className="tool-card-top">
                  <span className="tool-icon"><Icon size={20} aria-hidden="true" /></span>
                  <span className="tool-number" aria-hidden="true">0{i + 1}</span>
                </div>
                <h3>{t(title)}</h3>
                <p>{t(copy)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
