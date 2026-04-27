"use client";

import { useState } from "react";

type Props = {
  initialAnswer: string;
  isWaterArea?: boolean;
};

const normalQuestions = [
  "Is this parcel suitable for irrigation investment?",
  "What type of irrigation would be the most optimal?",
  "Which crops look most profitable for this parcel?",
  "What are the most common risks for plants in this environment?",
  "What should be verified before investment?",
];

const waterQuestions = [
  "Why are agricultural indicators not calculated here?",
  "What should I select instead?",
  "Can HydroSense analyse land near this water area?",
  "What should be checked before choosing a nearby parcel?",
];

export function ParcelAiChat({ initialAnswer, isWaterArea = false }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(initialAnswer);
  const [loading, setLoading] = useState(false);

  async function askAI(q: string) {
    if (!q.trim()) return;

    setLoading(true);
    setQuestion(q);

    try {
      const res = await fetch("/api/ai/parcel-chat", {
        method: "POST",
        body: JSON.stringify({
          question: q,
          context: isWaterArea ? "water-area" : "agricultural-parcel",
        }),
      });

      const data = await res.json();
      setAnswer(data.answer ?? initialAnswer);
    } catch (e) {
      console.error(e);
      setAnswer(
        isWaterArea
          ? "This point appears to be located on a water surface. HydroSense does not calculate agricultural indicators for open water areas. Please select a land parcel or agricultural area nearby."
          : "The AI answer could not be generated right now. Please try again or verify the parcel manually."
      );
    }

    setLoading(false);
  }

  const questions = isWaterArea ? waterQuestions : normalQuestions;

  return (
    <div className="ai-panel animate-ai">
      {/* HEADER */}
      <div className="ai-header">
        <div>
          <p className="ai-label">
            {isWaterArea ? "LOCATION CHECK" : "AI-POWERED ANALYSIS"}
          </p>
          <h2>{isWaterArea ? "Selection Guidance" : "AI Expert Insight"}</h2>
        </div>

        <div className="ai-badges">
          <span>{isWaterArea ? "Outside crop scope" : "Follow-up ready"}</span>
          <span>
            {isWaterArea ? "Select land parcel" : "Based on parcel context"}
          </span>
        </div>
      </div>

      {/* QUICK QUESTIONS */}
      <div className="ai-questions">
        {questions.map((q) => (
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
        {isWaterArea ? (
          <>
            <div>
              <p>AI verdict</p>
              <strong>Outside agricultural scope</strong>
            </div>
            <div>
              <p>Main issue</p>
              <strong>Water surface detected</strong>
            </div>
            <div>
              <p>Next step</p>
              <strong>Select nearby land</strong>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* ANSWER */}
      <div className="ai-answer">
        <h3>{isWaterArea ? "Selection note" : "AI insight"}</h3>
        <p>{loading ? "Thinking..." : answer}</p>
      </div>

      {/* INPUT */}
      <div className="ai-input">
        <textarea
          placeholder={
            isWaterArea
              ? "Ask what to select instead..."
              : "Ask a follow-up question..."
          }
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button onClick={() => askAI(question)}>
          {isWaterArea ? "Ask guidance" : "Ask AI"}
        </button>
      </div>
    </div>
  );
}