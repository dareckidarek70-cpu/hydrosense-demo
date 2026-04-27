import { FieldSelectorPanel } from "@/components/field-selector-panel";
import { SectionHeader } from "@/components/section-header";

export default function SelectAreaPage() {
  return (
    <div className="container">
      <section className="page-section">
        <SectionHeader
          eyebrow="Select area"
          title="Choose an area to analyze"
          description="Select one of the sample parcels or click anywhere on the map to analyze your own location. We’ll generate a clear, presentation-ready summary."
        />

        <div className="flow-arrows">
          <div className="flow-step active">Select area</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">Analysis</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">Brief</div>
        </div>

        <FieldSelectorPanel />
      </section>
    </div>
  );
}