import assert from "node:assert/strict";
import { test } from "node:test";
import { parcelChatSchema } from "../lib/parcel-chat-contract.ts";
import { contextualAnswer, questionTopic, selectAnswer } from "../lib/parcel-chat-answers.ts";
import { demoChatContext, resolveObservationEvidence, withinDeadline } from "../lib/parcel-chat-context.ts";

const ids = ["parcel-a", "parcel-b", "parcel-c", "parcel-d"];
const question = "Co raport mówi o nawadnianiu?";
const day = {
  from: "2026-08-16T00:00:00.000Z", to: "2026-08-17T00:00:00.000Z",
  ndvi: 0.57, ndwi: -0.56, ndmi: 0.1, cloudFraction: 0.02, clearCoverage: 0.91,
  vegetationFraction: 0.79, waterFraction: 0, clearPixels: 456,
};
const reference = {
  geometry: { type: "PointBuffer", coordinates: [52.0423, 23.0804], radiusMeters: 500 },
  period: { from: "2026-08-01T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z" },
  day: "2026-08-16",
};
const stats = (days) => ({
  days, observation: days[0] ?? null, latestObserved: days[0] ?? null, observedDays: days.length,
  window: reference.period, areaHectares: 78.5, resolutionMeters: 20,
});
const input = { mode: "observation", observation: reference, question, locale: "pl" };
const neverFetch = () => assert.fail("No upstream request expected");

test("closed request schema rejects client-supplied scores, indices, invalid dates and oversize questions", () => {
  assert.equal(parcelChatSchema.safeParse(input).success, true);
  assert.equal(parcelChatSchema.safeParse({ ...input, question: "x".repeat(601) }).success, false);
  assert.equal(parcelChatSchema.safeParse({ ...input, question: "   " }).success, false);
  assert.equal(parcelChatSchema.safeParse({ ...input, locale: "fr" }).success, false);
  assert.equal(parcelChatSchema.safeParse({ ...input, observation: { ...reference, ndvi: 0.999 } }).success, false);
  assert.equal(parcelChatSchema.safeParse({ ...input, observation: { ...reference, day: "2026-07-31" } }).success, false);
  assert.equal(parcelChatSchema.safeParse({ ...input, observation: { ...reference, geometry: { ...reference.geometry, radiusMeters: 700 } } }).success, false);
  for (const parcelId of ids) assert.equal(parcelChatSchema.safeParse({ mode: "demo", parcelId, question, locale: "en" }).success, true);
  assert.equal(parcelChatSchema.safeParse({ mode: "demo", parcelId: "parcel-z", question, locale: "pl" }).success, false);
  assert.equal(parcelChatSchema.safeParse({ mode: "demo", parcelId: "parcel-b", scores: { irrigation: 100 }, question, locale: "pl" }).success, false);
});

test("the same irrigation question uses different server demo scores and keeps simulation warnings", async () => {
  const replies = await Promise.all(ids.map((id) => selectAnswer(question, "pl", demoChatContext(id, "pl"))));
  assert.equal(new Set(replies.map((r) => r.answer)).size, 4);
  for (const [i, expected] of [68, 81, 73, 76].entries()) {
    assert.match(replies[i].answer, new RegExp(`${expected}%`));
    assert.match(replies[i].answer, /Symulacja konkursowa/);
    assert.equal(replies[i].source, "rules");
  }
  assert.match(contextualAnswer(demoChatContext("parcel-b", "en"), "crops", "en"), /Processing tomato, Maize, Radicchio/);
  assert.match(contextualAnswer(demoChatContext("parcel-d", "pl"), "crops", "pl"), /kukurydza, pszenica, soja/);
});

test("covers the seven PL/EN topics without confusing risk for crops or water with profitability", () => {
  for (const [text, topic] of [
    [question, "water"], ["Co obserwacja mówi o roślinności?", "vegetation"],
    ["Which crops can I grow?", "crops"], ["Jakie zagrożenia dla upraw?", "risk"],
    ["Is the investment profitable?", "investment"], ["Jakie są ograniczenia danych?", "limitations"],
    ["Co zweryfikować przed inwestycją?", "fieldwork"],
  ]) assert.equal(questionTopic(text), topic);
});

test("context reuses only server readings and on a cache miss requests exactly one day for the selected area", async () => {
  const cached = await resolveObservationEvidence(reference, () => stats([day]), neverFetch);
  assert.ok(cached.kind === "verified" && cached.day.ndvi === 0.57);
  const otherDay = { ...day, from: "2026-08-15T00:00:00.000Z", to: day.from, ndvi: 0.19 };
  const changedRef = { ...reference, day: "2026-08-15", geometry: { ...reference.geometry, radiusMeters: 1000 } };
  const verified = await resolveObservationEvidence(changedRef, () => undefined, async (period) => {
    assert.deepEqual(period, { from: otherDay.from, to: otherDay.to });
    return stats([otherDay]);
  });
  assert.ok(verified.kind === "verified" && verified.day.ndvi === 0.19);
  const answer = contextualAnswer({ mode: "observation", reference: changedRef, evidence: verified }, "investment", "pl");
  assert.match(answer, /promień 1000 m/);
  assert.match(answer, /NDVI 0,19/);
  assert.match(answer, /nie pozwalają ustalić opłacalności/);
  assert.doesNotMatch(answer, /scenariuszu demo/);
});

test("missing, noisy and water-dominated observations cannot become inferred land measurements", async () => {
  const noDay = { ...reference, day: null };
  const unavailable = await resolveObservationEvidence(noDay, () => undefined, neverFetch);
  assert.deepEqual(unavailable, { kind: "unavailable", reason: "unselected" });
  assert.deepEqual(await resolveObservationEvidence(noDay, () => stats([]), neverFetch), { kind: "unavailable", reason: "missing" });
  const rejected = await resolveObservationEvidence(reference, () => stats([{ ...day, clearCoverage: 0.4 }]), neverFetch);
  const noData = contextualAnswer({ mode: "observation", reference, evidence: rejected }, "water", "pl");
  assert.match(noData, /użyteczne pokrycie 40%/);
  assert.doesNotMatch(noData, /NDVI 0,57/);
  const water = await resolveObservationEvidence(reference, () => stats([{ ...day, ndvi: null, ndmi: null, ndwi: 0.81, waterFraction: 1, vegetationFraction: 0 }]), neverFetch);
  const answer = contextualAnswer({ mode: "observation", reference, evidence: water }, "water", "en");
  assert.match(answer, /NDVI Unavailable; NDWI 0.81/);
  assert.match(answer, /Water class among clear pixels: 100%/);
  assert.match(answer, /cannot|do not establish/);
});

test("model can only choose vetted text; invalid output, quota errors and timeouts fall back to rules", async () => {
  const context = demoChatContext("parcel-b", "en");
  const chosen = await selectAnswer(question, "en", context, async () => ({ topic: "crops" }));
  assert.equal(chosen.source, "model");
  assert.match(chosen.answer, /Processing tomato/);
  for (const model of [
    async () => ({ topic: "water", answer: "fabricated" }),
    async () => { throw new Error("429"); },
    () => withinDeadline(new Promise(() => {}), 10),
  ]) {
    const reply = await selectAnswer(question, "en", context, model);
    assert.equal(reply.source, "rules");
    assert.match(reply.answer, /81%/);
    assert.doesNotMatch(reply.answer, /fabricated/);
  }
  await assert.rejects(withinDeadline(new Promise(() => {}), 10), { name: "TimeoutError" });
});
