import Link from "next/link";
import { FeatureCard } from "@/components/cards/feature-card";
import { HydroSenseWordmark } from "@/components/hydrosense-wordmark";
import { MetricCard } from "@/components/cards/metric-card";
import { SectionHeader } from "@/components/section-header";
import { demoHighlights, investorReasons, workflowSteps } from "@/lib/mock-content";

export default function HomePage() {
  return (
    <div className="container">
      <section className="page-section hero-grid hero-grid--home">
        <div className="hero-panel hero-panel--home">
          <div className="section-heading">
          
            <span className="eyebrow">AI-assisted parcel review</span>

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
              HydroSense transforms parcel’s satellite data into a concise executive brief covering water access, soil profile, crop fit, irrigation potential, and decision risk.
            </p>
          </div>

          <div className="hero-actions hero-actions--home">
            <Link className="button" href="/select-area">
              Start Demo
            </Link>
            <Link className="button-secondary" href="/results?parcel=parcel-b">
              View Brief
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
    <span className="signal hero-preview-microtext">
      AI-assisted parcel intelligence
    </span>
    <span className="pill hero-preview-microtext hero-preview-pill">
      Veneto demo parcel set
    </span>
  </div>

  <div>
    <p className="supporting-label hero-preview-kicker">
      Featured parcel for live review
    </p>

    <h2
      className="section-title hero-feature-title"
      style={{
        color: "#f2fff5",
        fontSize: "clamp(1.8rem, 3.2vw, 3.2rem)",
        lineHeight: 0.95,
        letterSpacing: "-0.035em",
        maxWidth: "9.5ch",
        marginBottom: "1.75rem",
      }}
    
              >
                Parcel B — Mestre Plain
              </h2>
            </div>

            <div
              className="stats-grid hero-stats-grid"
              style={{
                position: "relative",
                zIndex: 2,
              }}
            >
              <div className="metric-card hero-stat-card">
                <p
                  className="metric-value"
                  style={{
                    color: "#f2fff5",
                    fontSize: "4.2rem",
                    lineHeight: 1,
                    marginBottom: "1rem",
                  }}
                >
                  84%
                </p>
                <p className="metric-label">Investment suitability</p>
              </div>

              <div className="metric-card hero-stat-card">
                <p
                  className="metric-value"
                  style={{
                    color: "#f2fff5",
                    fontSize: "4.2rem",
                    lineHeight: 1,
                    marginBottom: "1rem",
                  }}
                >
                  81%
                </p>
                <p className="metric-label">Irrigation readiness</p>
              </div>

              <div className="metric-card hero-stat-card">
                <p
                  className="metric-value"
                  style={{
                    color: "#f2fff5",
                    fontSize: "4.2rem",
                    lineHeight: 1,
                    marginBottom: "1rem",
                  }}
                >
                  86%
                </p>
                <p className="metric-label">Crop fit score</p>
              </div>

              <div className="metric-card hero-stat-card">
                <p
                  className="metric-value"
                  style={{
                    color: "#f2fff5",
                    fontSize: "4.2rem",
                    lineHeight: 1,
                    marginBottom: "1rem",
                  }}
                >
                  82%
                </p>
                <p className="metric-label">Agricultural productivity</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <SectionHeader
          eyebrow="What HydroSense does"
          title="A premium parcel-intelligence demo built for live explanation."
          description="The prototype is designed to present groundwater potential, crop fit, irrigation opportunities and risks in a concise agriculture industry context."
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
          description="HydroSense guides the user from parcel selection to satellite-based scoring and a concise executive brief ready for presentation."
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