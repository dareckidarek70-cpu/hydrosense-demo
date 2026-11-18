"use client";

import { useLocale } from "@/components/locale";

import { useState } from "react";

const normalQuestions = ["q1", "q2", "q3", "q4", "q5"] as const;

export function ParcelAiChat() {
  const { t, locale } = useLocale();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ content: string; locale: string }>();
  const [loading, setLoading] = useState(false);

  async function askAI(q: string) {
    if (loading || !q.trim()) return;

    setLoading(true);
    setQuestion(q);

    try {
      const res = await fetch("/api/ai/parcel-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();
      setAnswer({ locale, content: res.ok ? data.answer : data.error ?? t("guidanceError") });
    } catch {
      setAnswer({ locale, content: t("guidanceError") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-panel animate-ai">
      {/* HEADER */}
      <div className="ai-header">
        <div>
          <p className="ai-label">{t("diligence")}</p>
          <h2>{t("guidance")}</h2>
        </div>

        <div className="ai-badges"><span>{t("generalGuidance")}</span></div>
      </div>

      {/* QUICK QUESTIONS */}
      <div className="ai-questions">
        {normalQuestions.map((q) => (
          <button key={q} type="button" disabled={loading} onClick={() => askAI(t(q))}>
            {t(q)}
          </button>
        ))}
      </div>

      {/* CURRENT QUESTION */}
      {question && (
        <div className="ai-current-question">
          <span>{t("question")}</span>
          <div>{question}</div>
        </div>
      )}

      {/* ANSWER */}
      <div className="ai-answer">
        <h3>{t("response")}</h3>
        <p>{loading ? t("thinking") : answer?.locale === locale ? answer.content : t("guidanceInitial")}</p>
      </div>

      {/* INPUT */}
      <div className="ai-input">
        <textarea
          placeholder={t("askField")}
          aria-label={t("followUp")}
          maxLength={600}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button type="button" disabled={loading} onClick={() => askAI(question)}>{t("ask")}</button>
      </div>
    </div>
  );
}
