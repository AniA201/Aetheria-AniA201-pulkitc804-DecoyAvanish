import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { runAgent, type AgentEnv, type AgentReply } from "../lib/agent";
import { cachedGeminiStatus, type GeminiContent, type GeminiStatus } from "../lib/gemini";
import { askInSpanish } from "../lib/spanish";
import { useSession, type Role } from "../state/Session";

type Turn = { id: string; question: string; reply: AgentReply | null; spanish?: { text: string; how: string } };

const startersEs = ["Escuché que hay 8 visitas. ¿Es cierto?", "¿Puedo salir del estudio más adelante?", "¿Qué significa placebo para mí?"];

const starters: Record<Role, string[]> = {
  participant: [
    "I heard there are 8 visits. Is that right?",
    "Can I leave later?",
    "What does placebo mean for me?",
  ],
  researcher: [
    "Which facts disagree?",
    "Check this rewrite: You get $50 per visit.",
    "What does old v2.0 say about visits?",
  ],
};

const engineLabel: Record<AgentReply["engine"], string> = {
  gemini: "Gemini",
  local: "This computer",
  rules: "Safety rule",
};

const engineLabelEs: Record<AgentReply["engine"], string> = {
  gemini: "Gemini",
  local: "Esta computadora",
  rules: "Regla de seguridad",
};

export function AgentPanel({ role }: { role: Role }) {
  const session = useSession();
  const spanish = role === "participant" && session.language === "es";
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<GeminiStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const history = useRef<GeminiContent[]>([]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !status) cachedGeminiStatus().then(setStatus);
  }, [open, status]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const id = crypto.randomUUID();
    setTurns((current) => [...current, { id, question, reply: null }]);
    setDraft("");
    setBusy(true);
    const env: AgentEnv = {
      role,
      consent: session.consent,
      reviews: session.reviews,
      model: status?.model,
      navigate,
      saveQuestion: (saved, answer) =>
        session.saveQuestion({
          question: saved,
          answer,
          supported: false,
          documentId: session.consent?.documentId,
          version: session.consent?.version,
        }),
    };
    const inSpanish = spanish && session.consent ? await askInSpanish(question, session.consent, env, history.current) : null;
    const reply = inSpanish ? inSpanish.reply : await runAgent(question, env, history.current);
    history.current = [
      ...history.current,
      { role: "user", parts: [{ text: inSpanish?.englishQuestion ?? question }] },
      { role: "model", parts: [{ text: reply.answer }] },
    ];
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? { ...turn, reply, spanish: inSpanish ? { text: inSpanish.answerEs, how: inSpanish.how } : undefined } : turn)),
    );
    setBusy(false);
  };

  if (!open) {
    return (
      <button type="button" className="guide-launch" onClick={() => setOpen(true)}>
        {spanish ? "Preguntar a la Guía" : "Ask the Guide"}
      </button>
    );
  }

  return (
    <aside className="guide-panel" aria-label="Aetheria Guide">
      <header className="guide-head">
        <div>
          <strong>{spanish ? "Guía de Aetheria" : "Aetheria Guide"}</strong>
          <small>
            {status === null
              ? spanish
                ? "Buscando Gemini…"
                : "Checking for Gemini…"
              : status.configured
                ? `Gemini · ${status.model}`
                : spanish
                  ? "Respondiendo en esta computadora"
                  : "Answering on this computer"}
          </small>
        </div>
        <button type="button" className="guide-close" onClick={() => setOpen(false)} aria-label={spanish ? "Cerrar la Guía" : "Close the Guide"}>
          {spanish ? "Cerrar" : "Close"}
        </button>
      </header>

      <p className="guide-notice">
        {spanish
          ? "Sus preguntas y las partes del formulario que coinciden se envían a Gemini de Google, si está configurado. Google puede usar los datos del nivel gratuito. No escriba detalles de salud. Las respuestas en español son automáticas; el formulario en inglés es el oficial."
          : role === "participant"
            ? "Questions and the matching parts of your form go to Google’s Gemini. Free-tier data may be used by Google. Do not type health details."
            : "Questions and matching passages go to Google’s Gemini. Free-tier data may be used by Google. The Guide cannot change a review."}
      </p>

      <div className="guide-log" aria-live="polite">
        {turns.length === 0 ? (
          <div className="guide-starters">
            {(spanish ? startersEs : starters[role]).map((text) => (
              <button key={text} type="button" className="chip" onClick={() => ask(text)}>
                {text}
              </button>
            ))}
          </div>
        ) : null}
        {turns.map((turn) => (
          <div key={turn.id} className="guide-turn">
            <p className="guide-question">{turn.question}</p>
            {turn.reply === null ? (
              <p className="guide-thinking">{spanish ? "Buscando…" : "Working…"}</p>
            ) : (
              <div className="guide-reply">
                {turn.reply.steps.length > 0 && !turn.spanish ? (
                  <ol className="guide-steps">
                    {turn.reply.steps.map((step, index) => (
                      <li key={index}>{step.summary}</li>
                    ))}
                  </ol>
                ) : null}
                {turn.spanish ? (
                  <>
                    <p>{turn.spanish.text}</p>
                    <details>
                      <summary>Respuesta original en inglés</summary>
                      <p lang="en">{turn.reply.answer}</p>
                      {turn.reply.steps.length > 0 ? <small lang="en">{turn.reply.steps.map((step) => step.summary).join(" · ")}</small> : null}
                    </details>
                    <small className="guide-engine">{turn.spanish.how}</small>
                  </>
                ) : (
                  <p>{turn.reply.answer}</p>
                )}
                {turn.reply.quotes.map((quote) => (
                  <blockquote key={quote.passageId} className="guide-quote" lang="en">
                    <p>“{quote.text}”</p>
                    <cite>
                      {quote.documentId} {quote.version} · {quote.citation} {quote.page}
                      {role === "participant" && quote.kind === "consent" ? (
                        <>
                          {" · "}
                          <Link to={`/participant/explore-consent/${quote.sectionId}`}>{turn.spanish ? "Abrir" : "Open"}</Link>
                        </>
                      ) : null}
                    </cite>
                  </blockquote>
                ))}
                <small className="guide-engine">
                  {turn.spanish ? engineLabelEs[turn.reply.engine] : (turn.reply.note ?? engineLabel[turn.reply.engine])}
                </small>
              </div>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>

      <form
        className="guide-form"
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
      >
        <label className="sr-only" htmlFor="guide-input">
          {spanish ? "Preguntar a la Guía" : "Ask the Guide"}
        </label>
        <input
          id="guide-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={spanish ? "Pregunte sobre su formulario" : role === "participant" ? "Ask about your form" : "Ask about the documents"}
          disabled={busy}
        />
        <button type="submit" className="btn" disabled={busy || !draft.trim()}>
          {spanish ? "Preguntar" : "Ask"}
        </button>
      </form>
    </aside>
  );
}
