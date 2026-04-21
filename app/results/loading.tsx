export default function Loading() {
  return (
    <div className="container">
      <section className="page-section report-layout">
        <div className="glass-card report-hero loading-card">
          <div className="section-heading">
            <span className="eyebrow">Generating report</span>
            <h1 className="section-title">Compiling parcel intelligence from mocked Copernicus and GIS signals</h1>
            <p className="lead">
              Preparing the executive summary, scorecards, and parcel-level recommendations for presentation.
            </p>
          </div>
          <div className="report-summary-band">
            <div className="loading-block shimmer" />
            <div className="report-score-grid">
              <div className="loading-block shimmer loading-block--tall" />
              <div className="loading-block shimmer loading-block--tall" />
              <div className="loading-block shimmer loading-block--tall" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
