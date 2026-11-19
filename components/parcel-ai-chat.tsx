"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "./locale";
import type { ChatReference, ChatSource } from "@/lib/parcel-chat-contract";
import { CHAT_CLIENT_TIMEOUT_MS, CHAT_QUESTION_LIMIT } from "@/lib/parcel-chat-limits";

const quickQuestions = ["q1", "q2", "q3", "q4", "q5"] as const;
type Reply = { content: string; source?: ChatSource; references?: { label: string; url: string }[] };
type PanelProps = { reference: ChatReference; subject: string };

export function ParcelAiChat(props: PanelProps) {
  const { locale } = useLocale();
  return <ContextualChat key={JSON.stringify([locale, props.reference])} {...props} />;
}

function ContextualChat({ reference, subject }: PanelProps) {
  const { t, locale } = useLocale();
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState("");
  const [reply, setReply] = useState<Reply>();
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);

  useEffect(() => () => {
    const current = active.current;
    active.current = null;
    current?.abort();
  }, []);

  async function ask(value: string) {
    const question = value.trim();
    if (active.current || !question || question.length > CHAT_QUESTION_LIMIT) return;
    const controller = new AbortController();
    active.current = controller;
    const deadline = setTimeout(() => controller.abort(), CHAT_CLIENT_TIMEOUT_MS);
    setLoading(true);
    setAsked(question);
    setReply(undefined);
    try {
      const response = await fetch("/api/ai/parcel-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reference, question, locale }),
        signal: controller.signal,
      });
      const data: { answer?: string; source?: ChatSource; error?: string; references?: Reply["references"] } = await response.json();
      if (active.current !== controller) return;
      if (response.ok && typeof data.answer === "string" && (data.source === "rules" || data.source === "model")) {
        setReply({ content: data.answer, source: data.source, references: data.references });
      } else {
        setReply({ content: data.error ?? t("guidanceError") });
      }
    } catch {
      if (active.current === controller) setReply({ content: t("guidanceError") });
    } finally {
      clearTimeout(deadline);
      if (active.current === controller) {
        active.current = null;
        setLoading(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <section className="ai-panel print-hidden" aria-labelledby="parcel-chat-title">
      <header className="ai-header">
        <div>
          <p className="ai-label">{t("diligence")}</p>
          <h2 id="parcel-chat-title">{t("guidance")}</h2>
          <p>{subject}</p>
        </div>
      </header>
      {reference.mode === "demo" ? <p className="report-quiet-note">{t("chatDemoWarning")}</p> : null}
      <div className="ai-questions">
        {quickQuestions.map((key) => (
          <button key={key} type="button" disabled={loading} onClick={() => void ask(t(key))}>{t(key)}</button>
        ))}
      </div>
      {asked ? <div className="ai-current-question"><strong>{t("question")}</strong><p>{asked}</p></div> : null}
      <div className="ai-answer" aria-live="polite" aria-busy={loading}>
        <h3>{t("response")}</h3>
        {reply?.source ? <p className="ai-label">{t(reply.source === "rules" ? "chatRules" : "chatModel")}</p> : null}
        <p>{loading ? t("thinking") : reply?.content ?? t("guidanceInitial")}</p>
        {reply?.references?.map(({ label, url }) => (
          <p key={url}><a href={url} target="_blank" rel="noreferrer">{label}</a></p>
        ))}
      </div>
      <form className="ai-input" onSubmit={submit}>
        <textarea
          placeholder={t("askField")}
          aria-label={t("followUp")}
          maxLength={CHAT_QUESTION_LIMIT}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={loading || !draft.trim()}>{t("ask")}</button>
      </form>
    </section>
  );
}
