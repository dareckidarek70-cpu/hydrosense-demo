import { getLocalization } from "@/lib/i18n/server";
import { FieldSelectorPanel } from "@/components/field-selector-panel";
import { SectionHeader } from "@/components/section-header";

export default async function SelectAreaPage() {
  const { t } = await getLocalization();
  return (
    <div className="container">
      <section className="page-section">
        <SectionHeader
          eyebrow={t("selectArea")}
          title={t("selectTitle")}
          description={t("selectText")}
        />

        <div className="flow-arrows">
          <div className="flow-step active">{t("selectArea")}</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">{t("analysis")}</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">{t("brief")}</div>
        </div>

        <FieldSelectorPanel />
      </section>
    </div>
  );
}
