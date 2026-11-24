import type { Locale } from "./i18n/index.ts";

type GuideCopy = {
  name: string;
  object: string;
  requirements: string;
  check: string;
  water: string;
  timing: string;
};

type CropGuide = {
  aliases: string;
  source: string;
} & Record<Locale, GuideCopy>;

export const cropGuides = {
  rye: {
    aliases: "zyto zyta zytu zytem rye",
    source: "2e8b7ac3-8ac5-4791-bb8b-ae833668b254",
    pl: { name: "żyto", object: "żyto", requirements: "Żyto lepiej niż pszenica znosi gleby lekkie i bardziej kwaśne.", check: "Zbadaj pH i skład gleby w kilku miejscach oraz sprawdź, czy po deszczu nie stoi woda. Jeśli planujesz żyto ozime, dobierz odmianę i lokalny termin siewu.", water: "Żyto znosi lżejsze, przesychające gleby lepiej niż niektóre inne zboża, ale to nie wyklucza niedoborów wody w sezonie.", timing: "Żyto ozime sieje się jesienią; termin zależy od regionu, odmiany i warunków w polu." },
    en: { name: "rye", object: "rye", requirements: "Rye generally tolerates light, more acidic soils better than wheat.", check: "Test soil pH and texture in several parts of the field and check for standing water after rain. For winter rye, choose a variety and sowing window for the region.", water: "Rye tolerates light, drought-prone soils better than some other cereals, but it can still face water shortages during the season.", timing: "Winter rye is sown in autumn; timing depends on the region, variety and field conditions." },
  },
  wheat: {
    aliases: "pszenica pszenicy pszenice wheat",
    source: "1f795512-1153-42da-956c-d922e1de56a1",
    pl: { name: "pszenica", object: "pszenicę", requirements: "Pszenica zwykle potrzebuje żyźniejszego, niezbyt kwaśnego stanowiska niż żyto.", check: "Zbadaj pH i zasobność w składniki pokarmowe, sprawdź przedplon i wybierz odmianę jarą lub ozimą.", water: "Sprawdź zdolność gleby do zatrzymywania wody i dostępność opadów w okresie od strzelania w źdźbło do nalewania ziarna.", timing: "Pszenicę ozimą sieje się jesienią, a jarą wiosną. Dokładne okno zależy od regionu, odmiany i stanu gleby." },
    en: { name: "wheat", object: "wheat", requirements: "Wheat usually needs more fertile, less acidic ground than rye.", check: "Test soil pH and nutrients, check the previous crop, and choose a spring or winter variety.", water: "Check water retention and rainfall from stem extension through grain filling.", timing: "Winter wheat is sown in autumn and spring wheat in spring. The exact window depends on the region, variety and field conditions." },
  },
  maize: {
    aliases: "kukurydza kukurydzy kukurydze maize corn",
    source: "3765e1a5-d899-4a8d-9552-0ca353d27c7f",
    pl: { name: "kukurydza", object: "kukurydzę", requirements: "Kukurydza potrzebuje ciepłej gleby do wschodów i odmiany, która zdąży dojrzeć w lokalnym sezonie.", check: "Sprawdź temperaturę gleby przed siewem, lokalne ryzyko przymrozków oraz dostępność wody w okresie kwitnienia.", water: "Dla kukurydzy szczególnie ważna jest dostępność wody w okresie kwitnienia i zawiązywania ziarna.", timing: "Kukurydzę sieje się wiosną po ogrzaniu gleby; termin zależy od typu odmiany, lokalnych przymrozków i warunków w polu." },
    en: { name: "maize", object: "maize", requirements: "Maize needs warm soil for emergence and a variety that can mature within the local growing season.", check: "Check soil temperature before sowing, local frost risk and water availability around flowering.", water: "Water availability around flowering and kernel set is especially important for maize.", timing: "Sow maize in spring once the soil has warmed; timing depends on the variety, local frost risk and field conditions." },
  },
  potato: {
    aliases: "ziemniak ziemniaka ziemniaki ziemniakow ziemniakom ziemniakami ziemniakach kartofel kartofle kartofli potato potatoes",
    source: "07d4d440-6a1f-44e4-a68d-ea5b34005d4e",
    pl: { name: "ziemniak", object: "ziemniaki", requirements: "Ziemniaki najlepiej rosną w luźnej, dobrze odwadnianej glebie. Potrzebują odpowiedniego płodozmianu i wody podczas tworzenia bulw.", check: "Sprawdź pH, drenaż, zasobność gleby w potas i historię uprawy ziemniaka na tym polu.", water: "Niedobory wody podczas zawiązywania i wzrostu bulw mogą ograniczyć plon. Zastoiska są osobnym ryzykiem.", timing: "Ziemniaki sadzi się wiosną do ogrzanej gleby. Uwzględnij przymrozki, odmianę i przeznaczenie zbioru." },
    en: { name: "potato", object: "potatoes", requirements: "Potatoes do best in loose, well-drained soil. They need an appropriate rotation and enough water during tuber formation.", check: "Check soil pH, drainage, potassium levels and the field's potato rotation history.", water: "Water shortages during tuber initiation and growth can limit yield. Standing water is a separate risk.", timing: "Plant potatoes in spring once the soil has warmed. Account for frost risk, the variety and the intended market." },
  },
  barley: {
    aliases: "jeczmien jeczmienia jeczmieniem barley",
    source: "c46c391e-3883-4949-bfb0-0d340279f65b",
    pl: { name: "jęczmień", object: "jęczmień", requirements: "Jęczmień jest wrażliwy na kwaśną glebę; odmiany jare i ozime mają różne wymagania dotyczące siewu.", check: "Zbadaj pH i drenaż, sprawdź przedplon i ustal, czy zbiór ma być paszowy, czy browarny.", water: "Sprawdź retencję gleby i lokalne ryzyko suchej wiosny, zwłaszcza przy jęczmieniu jarym.", timing: "Jęczmień jary sieje się wiosną, a ozimy jesienią; ważne są lokalne warunki i zimotrwałość odmiany." },
    en: { name: "barley", object: "barley", requirements: "Barley is sensitive to acidic soil; spring and winter varieties have different sowing requirements.", check: "Test pH and drainage, check the previous crop and decide whether the harvest is for feed or malting.", water: "Check water retention and the local risk of a dry spring, especially for spring barley.", timing: "Spring barley is sown in spring and winter barley in autumn. Local conditions and varietal winter hardiness matter." },
  },
  rapeseed: {
    aliases: "rzepak rzepaku rzepakiem rapeseed canola",
    source: "bdcc4adf-6aca-4ba7-97f5-cf9947b54f7e",
    pl: { name: "rzepak", object: "rzepak", requirements: "Rzepak ozimy wymaga żyznego stanowiska i odpowiedniego odczynu; należy unikać długotrwałych zastoisk wody.", check: "Sprawdź pH, przepuszczalność, płodozmian roślin kapustowatych i miejscowe ryzyko przezimowania.", water: "Sprawdź wilgotność przy zakładaniu uprawy i retencję gleby, ale również drenaż w mokrych częściach pola.", timing: "Rzepak ozimy musi zdążyć rozwinąć się przed zimą. Termin zależy od rejonu i szybkości rozwoju odmiany." },
    en: { name: "rapeseed", object: "rapeseed", requirements: "Winter rapeseed needs fertile soil with suitable pH; avoid prolonged waterlogging.", check: "Check pH, drainage, the brassica rotation and local overwintering risk.", water: "Check soil moisture at establishment and water retention, as well as drainage in wet parts of the field.", timing: "Winter rapeseed needs enough time to establish before winter; timing depends on the region and the variety's development." },
  },
  sunflower: {
    aliases: "slonecznik slonecznika sloneczniki slonecznikiem sunflower sunflowers",
    source: "97b00fc2-5b86-4e94-a717-ded843a810b5",
    pl: { name: "słonecznik", object: "słonecznik", requirements: "Słonecznik potrzebuje dość ciepła do dojrzewania i nie jest dobrym wyborem na stale podmokłe stanowisko.", check: "Sprawdź drenaż, długość lokalnego sezonu oraz historię upraw podatnych na zgniliznę twardzikową.", water: "Tolerancja okresowej suszy nie usuwa potrzeby oceny dostępności wody w czasie kwitnienia i wypełniania nasion.", timing: "Słonecznik sieje się wiosną w ogrzaną glebę; dobierz wczesność odmiany do lokalnego sezonu." },
    en: { name: "sunflower", object: "sunflower", requirements: "Sunflower needs enough warmth to mature and is a poor fit for consistently waterlogged ground.", check: "Check drainage, local season length and the history of crops susceptible to Sclerotinia.", water: "Tolerance of some drought does not remove the need to check water availability around flowering and seed filling.", timing: "Sow sunflower in warm soil in spring and match variety maturity to the local season." },
  },
  soybean: {
    aliases: "soja soi soje soybean soybeans soya soy",
    source: "2e3da3e1-55b6-4373-b444-5631da97b6ee",
    pl: { name: "soja", object: "soję", requirements: "Soja potrzebuje dostatecznie ciepłego sezonu. Dobór wczesności odmiany ma znaczenie dla dojrzewania.", check: "Sprawdź odczyn gleby, lokalny sezon i historię uprawy soi. Ustal, czy potrzebne jest szczepienie nasion właściwymi bakteriami brodawkowymi.", water: "Sprawdź dostępność wody w okresie kwitnienia i wypełniania strąków oraz ryzyko zastoisk.", timing: "Soję sieje się wiosną do ogrzanej gleby. Dobierz wczesność odmiany do lokalnego sezonu." },
    en: { name: "soybean", object: "soybeans", requirements: "Soybeans need a warm enough growing season. Choosing a suitable maturity group matters for ripening.", check: "Check soil pH, the local season and the field's soybean history. Determine whether seed inoculation with the appropriate rhizobia is needed.", water: "Check water availability during flowering and pod filling, and assess waterlogging risk.", timing: "Sow soybeans into warm soil in spring and match maturity to the local season." },
  },
} satisfies Record<string, CropGuide>;

export type Crop = keyof typeof cropGuides;

export function cropReference(crop: Crop, locale: Locale) {
  const guide = cropGuides[crop];
  return {
    label: locale === "pl" ? `Metodyka PIORiN: ${guide.pl.name}` : `PIORiN growing guide (Polish): ${guide.en.name}`,
    url: `https://www.gov.pl/attachment/${guide.source}`,
  };
}
