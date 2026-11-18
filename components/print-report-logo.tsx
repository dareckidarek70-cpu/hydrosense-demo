import Image from "next/image";

export function PrintReportLogo() {
  return (
    <div className="print-report-logo">
      <div className="print-report-main-brand">
        <Image
          src="/hydrosense-logo.png"
          alt="HydroSense logo"
          width={40}
          height={40}
          unoptimized
          className="print-report-hydrosense-mark"
        />

        <div className="print-report-brand-text">
          <strong>HydroSense</strong>
          <span>PARCEL INTELLIGENCE</span>
        </div>
      </div>

      <div className="print-report-partner-logos">
        <Image
          src="/Projekt_Logo.png"
          alt="LEOO project logo"
          width={40}
          height={40}
          unoptimized
          className="print-report-partner-logo"
        />

        <Image
          src="/sketch_Logo.jpg"
          alt="Astro Youth Camp logo"
          width={40}
          height={40}
          unoptimized
          className="print-report-partner-logo"
        />
      </div>
    </div>
  );
}
