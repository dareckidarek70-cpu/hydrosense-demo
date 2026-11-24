import type { Locale } from "./index";
import { getDemoAnalysis } from "../mock-analysis.ts";
import type { ParcelId } from "../types";

type DemoCopy = {
  label: string;
  region: string;
  terrain: string;
  crop: string;
  summary: string;
  headline: string;
  verdict: string;
  water: string;
  soil: string;
  crops: string;
  irrigation: string;
  risk: string;
  next: string[];
};

const polish: Record<ParcelId, DemoCopy> = {
  "parcel-a": {
    label: "Działka A – obszar rolniczy Veneto",
    region: "Obszar rolniczy Veneto",
    terrain: "Teren rolniczy",
    crop: "Mieszane uprawy polowe",
    summary: "Scenariusz zakłada jakość gleby i dostęp do wody umożliwiające stopniowy rozwój bez dużych inwestycji początkowych.",
    headline: "Działka A nadaje się w tym scenariuszu do stopniowego rozwoju",
    verdict: "Warto rozważyć dalszą analizę i pilotaż.",
    water: "Założono stabilne zatrzymywanie wilgoci i wystarczający dostęp do wody w typowym sezonie.",
    soil: "Założona rzeźba i odwodnienie sprzyjają mieszanym uprawom jednorocznym.",
    crops: "W scenariuszu pasują elastyczne uprawy korzystające ze stabilnej gleby i umiarkowanego nawadniania.",
    irrigation: "Stopniowe wdrażanie nawadniania może ograniczyć koszty i poprawić stabilność plonu.",
    risk: "Scenariusz zakłada umiarkowane ryzyko środowiskowe. Istotny jest dobór upraw do dostępności wody.",
    next: ["Sprawdź w terenie dostęp do wody i skład gleby.","Porównaj koszty etapowego nawadniania z planem upraw na trzy sezony.","Potwierdź granice, dostęp i odwodnienie działki."],
  },
  "parcel-b": {
    label: "Działka B – równina nawadniana w Veneto",
    region: "Równina nawadniana w Veneto",
    terrain: "Płaska równina z potencjałem nawadniania",
    crop: "Płodozmian warzyw i kukurydzy",
    summary: "Scenariusz zakłada dobre warunki uprawowe i dostęp do wody, które sprzyjają różnorodnej produkcji przy umiarkowanych nakładach na nawadnianie.",
    headline: "Działka B ma najwyższą ocenę w zestawie demo",
    verdict: "Nadaje się do rozważenia w planie pilotażu.",
    water: "Scenariusz zakłada korzystne warunki wodne oraz możliwość stopniowego zwiększania skali upraw po inwestycji w nawadnianie.",
    soil: "Płaski teren w scenariuszu ułatwia dojazd maszyn i planowanie kilku rodzajów upraw.",
    crops: "Założenia sprzyjają uprawom wymagającym stabilnej wilgotności, dobrej struktury gleby i nawadniania.",
    irrigation: "Etapowe nawadnianie może ustabilizować plon i umożliwić uprawy o wyższej wartości.",
    risk: "Scenariusz zakłada wydajne zużycie wody, dobrą produktywność i możliwe do opanowania ryzyko środowiskowe.",
    next: ["Zweryfikuj plan nawadniania i kolejność upraw w terenie.","Sprawdź glebę i potwierdź dostęp do wody.","Przygotuj pilotaż na pierwszy sezon wegetacyjny."],
  },
  "parcel-c": {
    label: "Działka C – pole w południowym Veneto",
    region: "Południowe Veneto",
    terrain: "Teren rolniczy z ograniczeniami",
    crop: "Elastyczny płodozmian",
    summary: "Scenariusz zakłada możliwość produkcji po starannym doborze upraw i kontroli gospodarki wodnej.",
    headline: "Działka C ma potencjał przy większych ograniczeniach",
    verdict: "Lepsza do selektywnego wykorzystania niż do szybkiej ekspansji.",
    water: "Założono zmienny dostęp do wody i potrzebę monitoringu oraz dopasowania terminów nawadniania.",
    soil: "Przykładowe warunki wymagają uważnego zarządzania agronomicznego i zawężenia doboru upraw.",
    crops: "W doborze upraw liczą się odporność, wartość i tolerancja na ograniczenia wodne.",
    irrigation: "Scenariusz zakłada punktowe nawadnianie w wybranych strefach w celu ograniczenia kosztów i ryzyka.",
    risk: "Odpowiedzialna uprawa wymaga silniejszej kontroli i selektywnej strategii.",
    next: ["Sprawdź jakość wody przed większą inwestycją w nawadnianie.","Oceń ekonomikę upraw w scenariuszu ostrożnym.","Sprawdź opłacalność wybranych upraw przed zwiększeniem skali."],
  },
  "parcel-d": {
    label: "Działka D – pole referencyjne w Veneto",
    region: "Pole referencyjne w Veneto",
    terrain: "Referencyjny teren rolniczy",
    crop: "Mieszany program upraw",
    summary: "Założona jakość gleby i dostępność wody pozwalają rozważyć zróżnicowaną produkcję.",
    headline: "Działka D ma zrównoważony potencjał rolniczy",
    verdict: "Przykład stabilnego wariantu dla zróżnicowanych upraw.",
    water: "Założona dostępność wody sprzyja planowaniu produkcji przy umiarkowanym nawadnianiu.",
    soil: "Scenariusz zakłada standardowe prace rolne i niewielkie utrudnienia terenowe.",
    crops: "Przykładowe warunki pozwalają rozważyć zróżnicowany płodozmian.",
    irrigation: "W scenariuszu nawadnianie może poprawić stabilność plonu, podobnie jak inne działania agrotechniczne.",
    risk: "Założono umiarkowaną zmienność sezonową oraz możliwość jej monitorowania.",
    next: ["Zweryfikuj warunki glebowe i wodne.","Przetestuj zaplanowany płodozmian.","Sprawdź wyniki z sezonu przed zwiększeniem inwestycji."],
  },
};

export function demoPresentation(parcel: string | undefined, locale: Locale) {
  const report = getDemoAnalysis(parcel);
  const { meta, executiveSummary } = report;
  const copy: DemoCopy = locale === "pl" ? polish[meta.id] : {
    label: meta.label, region: meta.region, terrain: meta.terrainType, crop: meta.cropModel,
    summary: executiveSummary.summary, headline: executiveSummary.headline, verdict: executiveSummary.verdict,
    water: report.groundwaterAndMoisture.narrative, soil: report.soilAndLandProfile.narrative,
    crops: report.cropRecommendations.narrative, irrigation: report.irrigationPlan.narrative,
    risk: report.riskAndSustainability.narrative, next: report.recommendedNextActions,
  };
  return { meta, copy, scores: {
    investment: executiveSummary.investmentReadiness,
    irrigation: executiveSummary.irrigationReadiness,
    cropFit: executiveSummary.cropFitScore,
    sustainability: report.riskAndSustainability.sustainabilityScore,
  } };
}
