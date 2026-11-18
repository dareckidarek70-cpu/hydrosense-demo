import Link from "next/link";
import { FeatureCard } from "@/components/cards/feature-card";
import { MetricCard } from "@/components/cards/metric-card";
import { SectionHeader } from "@/components/section-header";
import { getLocalization } from "@/lib/i18n/server";
import { demoPresentation } from "@/lib/i18n/demo";
import { getHomeCopy } from "@/lib/mock-content";

export default async function HomePage() {
  const { locale, t, percent } = await getLocalization();
  const { demoHighlights, investorReasons, workflowSteps } = getHomeCopy(locale);
  const { copy, scores } = demoPresentation("parcel-b", locale);
  const featuredScores = [
    [t("investment"), scores.investment],
    [t("irrigation"), scores.irrigation],
    [t("cropFit"), scores.cropFit],
    [t("sustainability"), scores.sustainability],
  ] as const;
  return (
    <div className="container">
      <section className="page-section hero-grid hero-grid--home">
        <div className="hero-panel hero-panel--home">
          <div className="section-heading">
          
            <span className="eyebrow">{t("heroIntro")}</span>

            <h1
              className="display-title"
              style={{
                fontSize: "clamp(2.1rem, 4vw, 3.6rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
                maxWidth: "14ch",
              }}
            >{t("heroTitle")}</h1>

            <p
              className="lead"
              style={{
                maxWidth: "32rem",
                fontSize: "1.05rem",
                lineHeight: 1.7,
                marginTop: "1.5rem",
              }}
            >{t("heroLead")}</p>
          </div>

          <div className="hero-actions hero-actions--home">
            <Link className="button" href="/select-area">{t("selectArea")}</Link>
            <Link className="button-secondary" href="/results?parcel=parcel-b">{t("demoBrief")}</Link>
          </div>
        </div>

        <div
          className="hero-card map-art hero-feature-panel"
          style={{
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div className="map-overlay">
            <div className="label-row">
              <span className="pill hero-preview-microtext hero-preview-pill">{t("demoTag")}</span>
            </div>
            <div>
              <p className="supporting-label hero-preview-kicker">{t("featured")}</p>
              <h2 className="section-title hero-feature-title" style={{ color: "#f2fff5" }}>{copy.label}</h2>
            </div>
            <div className="stats-grid hero-stats-grid">
              {featuredScores.map(([label, score]) => (
                <div className="metric-card hero-stat-card" key={label}>
                  <p className="metric-value">{percent(score / 100)}</p>
                  <p className="metric-label">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <SectionHeader
          eyebrow={t("homeWhat")}
          title={t("homeWhatTitle")}
          description={t("homeWhatText")}
        />
        <div className="card-grid">
          {demoHighlights.map((item) => (
            <FeatureCard
              key={item.title}
              title={item.title}
              description={item.description}
              detail={item.detail}
            />
          ))}
        </div>
      </section>

      <section className="page-section two-column-grid">
        <div className="glass-card">
          <SectionHeader
          eyebrow={t("steps")}
          title={t("stepsTitle")}
          description={t("stepsText")}
        />
          <div className="metric-stack workflow-stack">
  {workflowSteps.map((step, index) => (
    <div className="workflow-step-wrap" key={step.title}>
      <MetricCard
        label={`0${index + 1}`}
        title={step.title}
        value={step.summary}
      />

      {index < workflowSteps.length - 1 ? (
        <div className="workflow-arrow-down" aria-hidden="true">
          ↓
        </div>
      ) : null}
    </div>
  ))}
</div>
        </div>

        <div className="timeline-card">
          <SectionHeader
            eyebrow={t("investors")}
            title={t("investorsTitle")}
            description={t("investorsText")}
          />
          <div className="insight-grid">
            {investorReasons.map((reason) => (
              <article key={reason.title} className="field-chip-card">
                <h3>{reason.title}</h3>
                <p>{reason.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
