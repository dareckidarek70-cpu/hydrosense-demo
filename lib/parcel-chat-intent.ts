import { cropGuides, type Crop } from "./crop-guides.ts";

export function normalizeQuestion(question: string) {
  return question.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ł", "l");
}

const cropAliases = Object.entries(cropGuides).flatMap(([crop, guide]) =>
  guide.aliases.split(" ").map((alias) => ({ alias, crop: crop as Crop })));
const byAlias = new Map(cropAliases.map(({ alias, crop }) => [alias, crop]));
const cropCue = /\b(?:upraw\w*|siac|siej\w*|siew\w*|posia[cnt]\w*|obsi[a-z]*|wysia[cnt]\w*|sadz\w*|posadz\w*|urosn\w*|wyrosn\w*|rosnie|plon\w*|plant\w*|sow\w*|grow\w*|cultivat\w*|crop\w*)\b/;
const specificRequest = /\b(?:siac|siej\w*|posia[cnt]\w*|obsi[a-z]*|wysia[cnt]\w*|sadzic|sadzenie|posadz\w*|urosn\w*|wyrosn\w*)\b|\b(?:uprawa|uprawe|uprawiac)\s+\w+|\b(?:grow|sow|plant|cultivate)\s+\w+|\b(?:czy|can|will)\b.*\b(?:rosnie|grow)\b/;
const genericCropRequest = /\b(?:co (?:tu |tutaj )?(?:siac|posiac|sadzic|posadzic|uprawiac)|co (?:mozna|warto) (?:tu |tutaj )?(?:siac|sadzic|uprawiac)|jakie (?:\w+ )?(?:uprawy|rosliny|zboza)|what (?:crops|plants|should i|can i)|which (?:crops|plants))\b/;

function oneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length > b.length) return oneEdit(b, a);
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length < b.length) return a.slice(i) === b.slice(i + 1);
  return a.slice(i + 1) === b.slice(i + 1)
    || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
}

function fuzzyCrop(word: string) {
  // Short crop names are too easily confused with ordinary words.
  if (word.length < 5) return undefined;
  const matches = new Set(cropAliases.filter(({ alias }) => alias.length >= 5
    && word[0] === alias[0] && oneEdit(word, alias)).map(({ crop }) => crop));
  return matches.size === 1 ? matches.values().next().value : undefined;
}

export function mentionedCrops(text: string): Crop[] {
  const normalized = normalizeQuestion(text);
  const words = normalized.match(/[a-z]+/g) ?? [];
  const allowTypo = words.length === 1 || cropCue.test(normalized);
  return [...new Set(words.flatMap((word) => {
    const crop = byAlias.get(word) ?? (allowTypo ? fuzzyCrop(word) : undefined);
    return crop ? [crop] : [];
  }))];
}

export type CropIntent = "fit" | "profit" | "water" | "timing" | "yield" | "requirements" | "risk" | "identify" | "compare";

export type CropQuestion = { kind: "crop"; intent: CropIntent; crops: Crop[] }
  | { kind: "unknown-crop" } | { kind: "general" };

export function cropQuestion(question: string): CropQuestion {
  const text = normalizeQuestion(question);
  const crops = mentionedCrops(question);
  if (crops.length === 0) {
    return specificRequest.test(text) && !genericCropRequest.test(text) ? { kind: "unknown-crop" } : { kind: "general" };
  }
  const comparison = /\b(?:porown\w*|versus|vs|compare|better|lepsz\w*|czy lepiej|zamiast|instead)\b/.test(text);
  if (comparison && crops.length === 1 && /\b(?:versus|vs|zamiast|instead of|czy lepiej)\b|\b(?:porownaj|compare)\b.*\b(?:z|and|to|with)\b/.test(text)) {
    return { kind: "unknown-crop" };
  }
  const intent: CropIntent =
    /\b(?:oplac\w*|rentown\w*|zarob\w*|zysk\w*|profit\w*|worth\s+it|margin|koszt\w*|cost\w*)\b/.test(text) ? "profit"
    : /\b(?:rozpozn\w*|zidentyfik\w*|identify|recognize|rosnie|grows)\b/.test(text) && /ndvi|satelit|satellite|zdjec|imagery/.test(text) ? "identify"
    : /\b(?:plon\w*|yield\w*|ile zbior\w*|ile zbior[eu]|ton\w*|t\/ha)\b/.test(text) ? "yield"
    : /\b(?:kiedy|termin\w*|when|planting date|sowing window)\b/.test(text) ? "timing"
    : /\b(?:ile wody|how much water|nawad\w*|podlew\w*|irrigat\w*|water needs)\b/.test(text) ? "water"
    : /\b(?:ryzyk\w*|zagroze\w*|risk\w*|chorob\w*|disease\w*|przymro\w*|susza|drought)\b/.test(text) ? "risk"
    : /\b(?:wymaga\w*|requirements?|ph|gleb\w*|soil)\b/.test(text) ? "requirements"
    : comparison || crops.length > 1 ? "compare" : "fit";
  return { kind: "crop", intent, crops };
}
