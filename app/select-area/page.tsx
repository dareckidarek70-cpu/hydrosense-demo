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
        <FieldSelectorPanel />
      </section>
    </div>
  );
}