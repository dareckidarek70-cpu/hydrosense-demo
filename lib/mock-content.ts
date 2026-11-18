import type { Locale } from "./i18n";

export const demoHighlights = [
  {
    title: "Land opportunity screened before capital is committed",
    description:
      "HydroSense helps investors and operators assess whether a parcel can support cultivation, irrigation investment, sustainable land use, and agricultural productivity before formal diligence begins.",
    detail: "Decision clarity before diligence",
  },
  {
    title: "Satellite signals translated into executive language",
    description:
      "Instead of surfacing raw technical layers, the concept translates mocked satellite, terrain, moisture, and GIS overlay signals into a coherent executive recommendation.",
    detail: "Copernicus/GIS signals, productized",
  },
  {
    title: "Competition-ready brief presentation",
    description:
      "The prototype presents investment potential, irrigation readiness, crop fit, sustainability, and agricultural productivity in concise business English.",
    detail: "Premium demo delivery",
  },
];

export const workflowSteps = [
  {
    title: "Select parcel",
    summary:
      "Choose a Veneto demo parcel or mark your own area on the map.",
  },
  {
    title: "Analyze satellite signals",
    summary:
      "Review dated vegetation, water and canopy-moisture indices where Sentinel-2 coverage permits.",
  },
  {
    title: "Present the brief",
    summary:
      "Review and export an executive brief covering investment, irrigation, crop fit, sustainability, and agricultural productivity.",
  },
];

export const investorReasons = [
  {
    title: "Shorter screening cycles",
    description:
      "Move from parcel selection to investment narrative in minutes instead of waiting for a full technical package.",
  },
  {
    title: "Clearer irrigation thesis",
    description:
      "See where water infrastructure is a value lever and where it becomes a defensive cost.",
  },
  {
    title: "Better crop strategy framing",
    description:
      "Assess which cultivation models align to the parcel before committing capital or operating plans.",
  },
  {
    title: "Stronger sustainability story",
    description:
      "Package sustainability, land resilience, and agricultural productivity cues into a form investors and judges can immediately understand.",
  },
];


const polishHome = {
  demoHighlights: [
    { title: "Wstępna ocena przed inwestycją", description: "Obserwacje pomagają wskazać kwestie, które warto sprawdzić przed analizą działki i planowaniem upraw.", detail: "Przygotowanie do weryfikacji" },
    { title: "Wskaźniki z objaśnieniami", description: "Raport wyjaśnia odczyty optyczne, datę obserwacji oraz obszar, którego dotyczą dane.", detail: "Dane Copernicus" },
    { title: "Przykładowy raport inwestycyjny", description: "Cztery przykłady pokazują, jak przedstawić ocenę inwestycji, nawadniania, upraw i zrównoważenia.", detail: "Scenariusze demonstracyjne" },
  ],
  workflowSteps: [
    { title: "Wybierz obszar", summary: "Wybierz działkę demo z Veneto lub wskaż własny punkt na mapie." },
    { title: "Sprawdź sygnały satelitarne", summary: "Jeśli dane Sentinel-2 są dostępne, przejrzyj wskaźniki roślinności, wody powierzchniowej i uwodnienia roślin." },
    { title: "Otwórz raport", summary: "Przejrzyj mapę, obserwacje i zalecenia dotyczące dalszej weryfikacji, a następnie wyeksportuj raport." },
  ],
  investorReasons: [
    { title: "Szybsza ocena wstępna", description: "Określ, które dane warto potwierdzić przed zleceniem pełnej analizy terenowej." },
    { title: "Plan weryfikacji nawadniania", description: "Ustal, jakie informacje o dostępie do wody i kosztach są potrzebne do decyzji." },
    { title: "Podstawa do planowania upraw", description: "Połącz obserwacje z badaniami gleby i wymaganiami planowanych upraw." },
    { title: "Punkt wyjścia do oceny wpływu", description: "Zidentyfikuj dane o wodzie, siedliskach i gospodarowaniu gruntem potrzebne do oceny wpływu." },
  ],
};

export function getHomeCopy(locale: Locale) {
  return locale === "pl" ? polishHome : { demoHighlights, workflowSteps, investorReasons };
}
