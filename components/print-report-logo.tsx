export function PrintReportLogo() {
  return (
    <div className="print-report-logo">
      <div className="print-report-main-brand">
        <img
          src="/hydrosense-logo.png"
          alt="HydroSense logo"
          className="print-report-hydrosense-mark"
        />

        <div className="print-report-brand-text">
          <strong>HydroSense</strong>
          <span>PARCEL INTELLIGENCE</span>
        </div>
      </div>

      <div className="print-report-partner-logos">
        <img
          src="/Projekt_Logo.png"
          alt="LEOO project logo"
          className="print-report-partner-logo"
        />

        <img
          src="/sketch_Logo.jpg"
          alt="Astro Youth Camp logo"
          className="print-report-partner-logo"
        />
      </div>
    </div>
  );
}