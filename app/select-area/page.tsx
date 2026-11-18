import { getLocalization } from "@/lib/i18n/server";
import { FieldSelectorPanel } from "@/components/field-selector-panel";

export default async function SelectAreaPage() {
  const { t } = await getLocalization();
  return (
    <div className="container">
      <section className="page-section workspace">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">{t("analysis")}</p>
            <h1 className="section-title">{t("selectTitle")}</h1>
            <p className="lead">{t("selectText")}</p>
          </div>
          <ol className="workspace-steps">
            <li aria-current="step"><span>01</span>{t("selectArea")}</li>
            <li><span>02</span>{t("analysis")}</li>
            <li><span>03</span>{t("brief")}</li>
          </ol>
        </div>
        <FieldSelectorPanel />
      </section>
    </div>
  );
}
