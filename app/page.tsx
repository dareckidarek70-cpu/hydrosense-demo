import Link from "next/link";
import { FeatureCard } from "@/components/cards/feature-card";
import { MetricCard } from "@/components/cards/metric-card";
import { SectionHeader } from "@/components/section-header";
import { getDemoAnalysis } from "@/lib/mock-analysis";
import { demoHighlights, investorReasons, workflowSteps } from "@/lib/mock-content";

export default function HomePage() {
  const { meta, executiveSummary, riskAndSustainability } = getDemoAnalysis("parcel-b");
  const featuredScores = [
    ["Investment", executiveSummary.investmentReadiness],
    ["Irrigation", executiveSummary.irrigationReadiness],
    ["Crop fit", executiveSummary.cropFitScore],
    ["Sustainability", riskAndSustainability.sustainabilityScore],
  ];
  return (
    <div className="container">
      <section className="page-section hero-grid hero-grid--home">
        <div className="hero-panel hero-panel--home">
          <div className="section-heading">
          
            <span className="eyebrow">Satellite parcel review</span>

            <h1
              className="display-title"
              style={{
                fontSize: "clamp(2.1rem, 4vw, 3.6rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
                maxWidth: "9ch",
              }}
            >
              Assess land before capital is committed.
            </h1>

            <p
              className="lead"
              style={{
                maxWidth: "32rem",
                fontSize: "1.05rem",
                lineHeight: 1.7,
                marginTop: "1.5rem",
              }}
            >
              Review Sentinel-2 observations for a selected area, or explore a sample brief to see how a parcel assessment could be presented.
            </p>
          </div>

          <div className="hero-actions hero-actions--home">
            <Link className="button" href="/select-area">
              Select Area
            </Link>
            <Link className="button-secondary" href="/results?parcel=parcel-b">
              View Demo Brief
            </Link>
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
              <span className="pill hero-preview-microtext hero-preview-pill">Illustrative demo</span>
            </div>
            <div>
              <p className="supporting-label hero-preview-kicker">Featured demo parcel</p>
              <h2 className="section-title hero-feature-title" style={{ color: "#f2fff5" }}>{meta.label}</h2>
            </div>
            <div className="stats-grid hero-stats-grid">
              {featuredScores.map(([label, score]) => (
                <div className="metric-card hero-stat-card" key={label}>
                  <p className="metric-value">{score}%</p>
                  <p className="metric-label">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <SectionHeader
          eyebrow="What HydroSense does"
          title="A premium parcel-intelligence demo built for live explanation."
          description="Screen real locations with optical satellite data. Use the demo briefs to explore how verified land and water evidence could support a broader review."
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
          eyebrow="3-step story"
          title="Select parcel → Analyze signals → Present the brief"
          description="Select an area, review available satellite observations, and open a brief with the evidence needed for the next decision."
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
            eyebrow="Why investors care"
            title="HydroSense frames land quality in decision-ready language."
            description="The concept helps explain why a parcel matters before deeper diligence, capex planning, or cultivation strategy work begins."
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
