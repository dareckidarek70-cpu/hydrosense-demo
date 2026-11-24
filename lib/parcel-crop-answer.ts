import { cropGuides, cropReference, type Crop } from "./crop-guides.ts";
import { localization, type Locale } from "./i18n/index.ts";
import type { AnswerContext } from "./parcel-chat-context.ts";
import type { CropIntent } from "./parcel-chat-intent.ts";

const copy = {
  pl: {
    opening: (crop: string): Record<CropIntent, string> => ({
      fit: `Nie da się jeszcze ocenić, czy to pole nadaje się pod ${crop}.`,
      profit: `Nie da się jeszcze ustalić, czy na tym polu opłaca się uprawiać ${crop}.`,
      water: `Nie da się ustalić dawki ani potrzeby nawadniania dla pola przeznaczonego pod ${crop} na podstawie tego raportu.`,
      timing: `Raport nie wystarcza, by wskazać konkretny termin założenia uprawy „${crop}” na tym polu.`,
      yield: `Nie da się wiarygodnie oszacować plonu z pola przeznaczonego pod ${crop} na podstawie tego raportu.`,
      requirements: `Mogę podać wymagania uprawy „${crop}”, ale raport nie potwierdza, że to pole je spełnia.`,
      risk: `Mogę wskazać ryzyka, które warto sprawdzić. Raport nie określa ich skali dla pola przeznaczonego pod ${crop}.`,
      identify: `Raport nie pozwala potwierdzić gatunku na polu, w tym uprawy „${crop}”.`,
      compare: `Nie da się rzetelnie wybrać lepszej uprawy dla tego pola. Można porównać wymagania roślin.`,
    }),
    unknown: "Nie rozpoznałem uprawy, o którą pytasz, albo nie mam jej w bazie. Podaj pełną nazwę gatunku. Bez sprawdzonych wymagań i danych terenowych nie mogę ocenić tej uprawy dla działki.",
    general: "Ogólne wymagania",
    site: "Dane dla obszaru",
    verify: "Co sprawdzić",
    demo: "Scenariusz demo",
    demoIncluded: (name: string) => `Uprawa „${name}” jest uwzględniona w tym scenariuszu.`,
    demoAbsent: (name: string) => `Uprawa „${name}” nie jest uwzględniona w tym scenariuszu. To nie znaczy, że się nie nadaje.`,
    noDemoObservations: "Scenariusz nie jest pomiarem gleby ani oceną plonu.",
    signal: (index: string, value: string, day: string) =>
      `Sentinel-2 z ${day} UTC: ${index} ${value}. To sygnał spektralny, nie pomiar gleby ani potwierdzenie gatunku.`,
    noIndex: (day: string) => `Jest użyteczna obserwacja Sentinel-2 z ${day} UTC, ale brakuje odczytu wskaźnika istotnego dla pytania.`,
    waterClass: (share: string, day: string) =>
      `W obserwacji Sentinel-2 z ${day} UTC klasa wody stanowiła ${share} użytecznych pikseli. Najpierw sprawdź, czy zaznaczenie obejmuje pole, a nie wodę.`,
    waterCheck: "Do oceny nawadniania potrzebne są pomiary wilgotności w strefie korzeni, opady, faza rozwoju i dostępność wody do poboru.",
    profitCheck: "Do kalkulacji porównaj realistyczny plon handlowy i cenę zbytu z kosztami materiału siewnego lub sadzeniaków, zabiegów, zbioru i przechowania.",
    yieldCheck: "Do oszacowania plonu potrzebne są wyniki z poprzednich lat lub próba polowa, odmiana i warunki w bieżącym sezonie.",
    identifyCheck: "Potwierdź gatunek w ewidencji upraw lub podczas wizyty w terenie.",
  },
  en: {
    opening: (crop: string): Record<CropIntent, string> => ({
      fit: `There is not enough evidence yet to tell whether this field is suitable for ${crop}.`,
      profit: `The report cannot tell whether growing ${crop} here would pay off.`,
      water: `The report cannot tell whether ${crop} would need irrigation here or how much to apply.`,
      timing: `There is not enough information to set a specific date for ${crop} on this field.`,
      yield: `The report cannot reliably estimate a ${crop} yield for this field.`,
      requirements: `I can describe the requirements for ${crop}, but the report does not confirm that this field meets them.`,
      risk: `I can point out what to check for ${crop}, but the report cannot quantify the field's risk.`,
      identify: `The report cannot confirm that ${crop} is growing on this field.`,
      compare: `There is not enough evidence to pick the better crop for this field. We can compare their requirements.`,
    }),
    unknown: "I could not identify the crop or do not have it in the guide. Please provide the full species name. I cannot assess it without reliable growing requirements and field data.",
    general: "General growing requirements",
    site: "Area evidence",
    verify: "What to check",
    demo: "Demo scenario",
    demoIncluded: (name: string) => `This scenario lists ${name} as an option.`,
    demoAbsent: (name: string) => `This scenario does not list ${name}. That does not mean the crop is unsuitable.`,
    noDemoObservations: "The scenario is not a soil measurement or a yield estimate.",
    signal: (index: string, value: string, day: string) =>
      `Sentinel-2 on ${day} UTC: ${index} ${value}. This is a spectral signal, not a soil measurement or a crop identification.`,
    noIndex: (day: string) => `There is a usable Sentinel-2 observation on ${day} UTC, but the relevant index is unavailable.`,
    waterClass: (share: string, day: string) =>
      `On ${day} UTC, Sentinel-2 classified ${share} of usable pixels as water. First check whether the selection covers a field rather than water.`,
    waterCheck: "To assess irrigation, check measured root-zone moisture, rainfall, growth stage and the water available for abstraction.",
    profitCheck: "Compare realistic marketable yield and selling price with seed, field operations, harvest and storage costs.",
    yieldCheck: "A yield estimate needs past harvest records or a field trial, variety information and current-season conditions.",
    identifyCheck: "Confirm the crop in field records or during a site visit.",
  },
} as const;

export function unknownCropAnswer(locale: Locale) {
  return copy[locale].unknown;
}

const unavailable = {
  unselected: "chatObservationUnselected", missing: "noData", rejected: "noUsable",
  timeout: "timeout", providerError: "providerError", providerRate: "providerRate", rateLimit: "rateLimit",
} as const;

function selectedObservation(context: Extract<AnswerContext, { mode: "observation" }>, intent: CropIntent, locale: Locale) {
  const { t, num, percent, date } = localization(locale);
  const { evidence } = context;
  if (evidence.kind === "unavailable") return t(unavailable[evidence.reason]);
  const { day } = evidence;
  const observed = date(day.from);
  if (day.waterFraction !== null && day.waterFraction >= 0.8) {
    return copy[locale].waterClass(percent(day.waterFraction), observed);
  }
  const index = intent === "water" ? "ndmi" : "ndvi";
  return day[index] === null
    ? copy[locale].noIndex(observed)
    : copy[locale].signal(index.toUpperCase(), num(day[index], 2), observed);
}

export function specificCropAnswer(
  context: AnswerContext, intent: CropIntent, crops: Crop[], demoCrops: Crop[], locale: Locale,
) {
  const { t } = localization(locale);
  const labels = copy[locale];
  const guides = crops.map((crop) => cropGuides[crop][locale]);
  const names = new Intl.ListFormat(locale).format(guides.map(({ object }) => object));
  const requirements = guides.map((guide) => {
    const detail = intent === "timing" ? guide.timing : intent === "water" ? guide.water : guide.requirements;
    return crops.length > 1 ? `${guide.name}: ${detail}` : detail;
  }).join(" ");
  const checks = guides.map(({ check }) => check).join(" ");
  const intentCheck = intent === "profit" ? labels.profitCheck : intent === "yield" ? labels.yieldCheck
    : intent === "water" ? labels.waterCheck : intent === "identify" ? labels.identifyCheck : "";
  const evidence = context.mode === "demo"
    ? `${labels.demo} (${context.label}): ${crops.map((crop) => {
      const name = cropGuides[crop][locale].name;
      return demoCrops.includes(crop) ? labels.demoIncluded(name) : labels.demoAbsent(name);
    }).join(" ")} ${crops.some((crop) => demoCrops.includes(crop)) ? `${context.copy.crops} ` : ""}${labels.noDemoObservations} ${t("chatDemoWarning")}`
    : `${labels.site}: ${selectedObservation(context, intent, locale)}`;
  const opening = labels.opening(names)[intent];

  return {
    answer: [
      opening,
      `${labels.general}: ${requirements}`,
      evidence,
      `${labels.verify}: ${[intentCheck, checks].filter(Boolean).join(" ")}`,
    ].join("\n\n"),
    references: crops.map((crop) => cropReference(crop, locale)),
  };
}
