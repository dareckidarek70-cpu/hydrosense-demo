"use client";

import { useState } from "react";

type Props = {
  initialAnswer: string;
};

export function ParcelAiChat({ initialAnswer }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(initialAnswer);
  const [loading, setLoading] = useState(false);

  async function askAI(q: string) {
    if (!q) return;

    setLoading(true);
    setQuestion(q);

    try {
      const res = await fetch("/api/ai/parcel-chat", {
        method: "POST",
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();
      setAnswer(data.answer);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  return (
    <div className="ai-panel animate-ai">
      {/* HEADER */}
      <div className="ai-header">
        <div>
          <p className="ai-label">AI-POWERED ANALYSIS</p>
          <h2>AI Expert Insight</h2>
        </div>

        <div className="ai-badges">
          <span>Follow-up ready</span>
          <span>Based on parcel context</span>
        </div>
      </div>

      {/* QUICK QUESTIONS */}
      <div className="ai-questions">
        {[
          "Is this parcel suitable for irrigation investment?",
           "What type of irrigation would be the most optimal?",
           "Which crops look most profitable for this parcel?",
           "What are the most common risks for plants in this environment?",
           "What should be verified before investment?",
          ].map((q) => (
          <button key={q} onClick={() => askAI(q)}>
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

      {/* DECISION CARD */}
      <div className="ai-decision">
        <div>
          <p>AI verdict</p>
          <strong>Moderate potential</strong>
        </div>
        <div>
          <p>Main risk</p>
          <strong>Water variability</strong>
        </div>
        <div>
          <p>Next step</p>
          <strong>Field verification</strong>
        </div>
      </div>

      {/* ANSWER */}
      <div className="ai-answer">
        <h3>AI insight</h3>
        <p>{loading ? "Thinking..." : answer}</p>
      </div>

      {/* INPUT */}
      <div className="ai-input">
        <textarea
          placeholder="Ask a follow-up question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button onClick={() => askAI(question)}>
          Ask AI
        </button>
      </div>
    </div>
  );
}