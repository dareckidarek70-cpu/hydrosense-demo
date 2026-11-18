"use client";

import { useState } from "react";

type Props = {
  initialAnswer: string;
};

const normalQuestions = [
  "Is this parcel suitable for irrigation investment?",
  "What type of irrigation would be the most optimal?",
  "Which crops look most profitable for this parcel?",
  "What are the most common risks for plants in this environment?",
  "What should be verified before investment?",
];

export function ParcelAiChat({ initialAnswer }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(initialAnswer);
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
      setAnswer(res.ok ? data.answer : data.error ?? "Guidance unavailable.");
    } catch {
      setAnswer("Guidance unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-panel animate-ai">
      {/* HEADER */}
      <div className="ai-header">
        <div>
          <p className="ai-label">
            DUE DILIGENCE
          </p>
          <h2>Review guidance</h2>
        </div>

        <div className="ai-badges"><span>General guidance</span></div>
      </div>

      {/* QUICK QUESTIONS */}
      <div className="ai-questions">
        {normalQuestions.map((q) => (
          <button key={q} type="button" disabled={loading} onClick={() => askAI(q)}>
            {q}
          </button>
        ))}
      </div>

      {/* CURRENT QUESTION */}
      {question && (
        <div className="ai-current-question">
          <span>CURRENT QUESTION</span>
          <div>{question}</div>
        </div>
      )}

      {/* ANSWER */}
      <div className="ai-answer">
        <h3>Response</h3>
        <p>{loading ? "Thinking..." : answer}</p>
      </div>

      {/* INPUT */}
      <div className="ai-input">
        <textarea
          placeholder="Ask about field verification…"
          aria-label="Follow-up question"
          maxLength={600}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button type="button" disabled={loading} onClick={() => askAI(question)}>
          Ask
        </button>
      </div>
    </div>
  );
}
