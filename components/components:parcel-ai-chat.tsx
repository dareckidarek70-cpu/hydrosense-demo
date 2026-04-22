"use client";

import { useMemo, useState } from "react";

type ParcelContext = {
  title?: string;
  locationLabel?: string;
  coordinates?: string;
  investmentScore?: number | null;
  irrigationScore?: number | null;
  cropFitScore?: number | null;
  riskLevel?: string | null;
  ndvi?: number | null;
  ndwi?: number | null;
  summary?: string | null;
  waterOutlook?: string | null;
  cropPathway?: string | null;
  nextStep?: string | null;
};

type ChatResponse = {
  answer: string;
  shortTitle: string;
  suggestedFollowUps: string[];
  confidence: "low" | "medium" | "high";
  warning: string | null;
};

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; data: ChatResponse };

export function ParcelAiChat({ parcel }: { parcel: ParcelContext }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const quickQuestions = useMemo(
    () => [
      "Is this parcel suitable for irrigation investment?",
      "Which crops look most realistic for this parcel?",
      "How risky is this parcel for a first pilot?",
      "What should be verified before investment?",
    ],
    []
  );

  async function sendQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/parcel-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
          parcel,
        }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = (await res.json()) as ChatResponse;

      setMessages((prev) => [...prev, { role: "assistant", data }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          data: {
            shortTitle: "Temporary error",
            answer:
              "The AI assistant could not answer right now. Please try again in a moment.",
            suggestedFollowUps: [],
            confidence: "low",
            warning: "Request failed",
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="parcel-ai-chat">
      <div className="parcel-ai-chat__header">
        <div>
          <p className="parcel-ai-chat__eyebrow">AI assistant</p>
          <h3 className="parcel-ai-chat__title">Ask about this parcel</h3>
        </div>
        <span className="parcel-ai-chat__badge">Context-aware</span>
      </div>

      <p className="parcel-ai-chat__intro">
        Ask follow-up questions about irrigation, crop suitability, risk, or
        next steps. The assistant will answer using the current parcel context.
      </p>

      <div className="parcel-ai-chat__quick">
        {quickQuestions.map((item) => (
          <button
            key={item}
            type="button"
            className="parcel-ai-chat__quick-btn"
            onClick={() => sendQuestion(item)}
            disabled={loading}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="parcel-ai-chat__messages">
        {messages.length === 0 ? (
          <div className="parcel-ai-chat__empty">
            No questions yet. Try one of the suggested prompts above.
          </div>
        ) : (
          messages.map((message, index) =>
            message.role === "user" ? (
              <div key={index} className="parcel-ai-chat__msg parcel-ai-chat__msg--user">
                <div className="parcel-ai-chat__label">You</div>
                <div className="parcel-ai-chat__bubble">{message.text}</div>
              </div>
            ) : (
              <div key={index} className="parcel-ai-chat__msg parcel-ai-chat__msg--assistant">
                <div className="parcel-ai-chat__label">
                  HydroSense AI · {message.data.confidence}
                </div>
                <div className="parcel-ai-chat__bubble">
                  <strong>{message.data.shortTitle}</strong>
                  <p>{message.data.answer}</p>

                  {message.data.warning ? (
                    <p className="parcel-ai-chat__warning">
                      Note: {message.data.warning}
                    </p>
                  ) : null}

                  {message.data.suggestedFollowUps.length > 0 ? (
                    <div className="parcel-ai-chat__followups">
                      {message.data.suggestedFollowUps.map((q) => (
                        <button
                          key={q}
                          type="button"
                          className="parcel-ai-chat__followup-btn"
                          onClick={() => sendQuestion(q)}
                          disabled={loading}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          )
        )}
      </div>

      <div className="parcel-ai-chat__composer">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this parcel..."
          className="parcel-ai-chat__textarea"
          rows={3}
        />
        <button
          type="button"
          className="parcel-ai-chat__send"
          onClick={() => sendQuestion(question)}
          disabled={loading || !question.trim()}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>
    </section>
  );
}