import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { runAgent, type AgentEnv, type AgentReply } from "../lib/agent";
import { cachedGeminiStatus, type GeminiContent, type GeminiStatus } from "../lib/gemini";
import { languageInfo, type OtherLanguage } from "../lib/languages";
import { askIn } from "../lib/multilingual";
import { useSession, type Role } from "../state/Session";

type Turn = { id: string; question: string; reply: AgentReply | null; localized?: { text: string; how: string } };

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

type GuideCopy = {
  starters: string[];
  launch: string;
  title: string;
  checking: string;
  onComputer: string;
  close: string;
  closeLabel: string;
  notice: string;
  working: string;
  original: string;
  open: string;
  placeholder: string;
  send: string;
  engines: Record<AgentReply["engine"], string>;
};

const guide: Record<OtherLanguage, GuideCopy> = {
  es: {
    starters: ["Escuché que hay 8 visitas. ¿Es cierto?", "¿Puedo salir del estudio más adelante?", "¿Qué significa placebo para mí?"],
    launch: "Preguntar a la Guía",
    title: "Guía de Aetheria",
    checking: "Buscando Gemini…",
    onComputer: "Respondiendo en esta computadora",
    close: "Cerrar",
    closeLabel: "Cerrar la Guía",
    notice:
      "Sus preguntas y las partes del formulario que coinciden se envían a Gemini de Google, si está configurado. Google puede usar los datos del nivel gratuito. No escriba detalles de salud. Las respuestas en español son automáticas; el formulario en inglés es el oficial.",
    working: "Buscando…",
    original: "Respuesta original en inglés",
    open: "Abrir",
    placeholder: "Pregunte sobre su formulario",
    send: "Preguntar",
    engines: { gemini: "Gemini", local: "Esta computadora", rules: "Regla de seguridad" },
  },
  fr: {
    starters: ["J'ai entendu dire qu'il y a 8 visites. C'est vrai ?", "Est-ce que je peux quitter l'étude plus tard ?", "Que veut dire placebo pour moi ?"],
    launch: "Demander au Guide",
    title: "Guide Aetheria",
    checking: "Recherche de Gemini…",
    onComputer: "Réponse sur cet ordinateur",
    close: "Fermer",
    closeLabel: "Fermer le Guide",
    notice:
      "Vos questions et les parties du formulaire qui correspondent sont envoyées à Gemini de Google, s'il est configuré. Google peut utiliser les données du niveau gratuit. N'écrivez pas de détails sur votre santé. Les réponses en français sont automatiques ; le formulaire en anglais est le texte officiel.",
    working: "Recherche…",
    original: "Réponse originale en anglais",
    open: "Ouvrir",
    placeholder: "Posez une question sur votre formulaire",
    send: "Demander",
    engines: { gemini: "Gemini", local: "Cet ordinateur", rules: "Règle de sécurité" },
  },
  zh: {
    starters: ["我听说有 8 次就诊，对吗？", "我以后可以退出吗？", "安慰剂对我来说是什么意思？"],
    launch: "问问向导",
    title: "Aetheria 向导",
    checking: "正在查找 Gemini…",
    onComputer: "在这台电脑上回答",
    close: "关闭",
    closeLabel: "关闭向导",
    notice: "如果已配置，您的问题和表格中相关的部分会发送给 Google 的 Gemini。Google 可能会使用免费层级的数据。请不要输入健康细节。中文回答是自动生成的；英文表格是正式文本。",
    working: "正在查找…",
    original: "英文原始回答",
    open: "打开",
    placeholder: "就您的表格提问",
    send: "提问",
    engines: { gemini: "Gemini", local: "这台电脑", rules: "安全规则" },
  },
};

export function AgentPanel({ role }: { role: Role }) {
  const session = useSession();
  const other: OtherLanguage | null = role === "participant" && session.language !== "en" ? session.language : null;
  const words = other ? guide[other] : null;
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
    const localized = other && session.consent ? await askIn(other, question, session.consent, env, history.current) : null;
    const reply = localized ? localized.reply : await runAgent(question, env, history.current);
    history.current = [
      ...history.current,
      { role: "user", parts: [{ text: localized?.englishQuestion ?? question }] },
      { role: "model", parts: [{ text: reply.answer }] },
    ];
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? { ...turn, reply, localized: localized ? { text: localized.answer, how: localized.how } : undefined } : turn)),
    );
    setBusy(false);
  };

  if (!open) {
    return (
      <button type="button" className="guide-launch" onClick={() => setOpen(true)}>
        {words ? words.launch : "Ask the Guide"}
      </button>
    );
  }

  return (
    <aside className="guide-panel" aria-label={words ? words.title : "Aetheria Guide"} lang={other ? languageInfo[other].html : "en"}>
      <header className="guide-head">
        <div>
          <strong>{words ? words.title : "Aetheria Guide"}</strong>
          <small>
            {status === null
              ? (words?.checking ?? "Checking for Gemini…")
              : status.configured
                ? `Gemini · ${status.model}`
                : (words?.onComputer ?? "Answering on this computer")}
          </small>
        </div>
        <button type="button" className="guide-close" onClick={() => setOpen(false)} aria-label={words ? words.closeLabel : "Close the Guide"}>
          {words ? words.close : "Close"}
        </button>
      </header>

      <p className="guide-notice">
        {words
          ? words.notice
          : role === "participant"
            ? "Questions and the matching parts of your form go to Google’s Gemini. Free-tier data may be used by Google. Do not type health details."
            : "Questions and matching passages go to Google’s Gemini. Free-tier data may be used by Google. The Guide cannot change a review."}
      </p>

      <div className="guide-log" aria-live="polite">
        {turns.length === 0 ? (
          <div className="guide-starters">
            {(words ? words.starters : starters[role]).map((text) => (
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
              <p className="guide-thinking">{words ? words.working : "Working…"}</p>
            ) : (
              <div className="guide-reply">
                {turn.reply.steps.length > 0 && !turn.localized ? (
                  <ol className="guide-steps">
                    {turn.reply.steps.map((step, index) => (
                      <li key={index}>{step.summary}</li>
                    ))}
                  </ol>
                ) : null}
                {turn.localized ? (
                  <>
                    <p>{turn.localized.text}</p>
                    <details>
                      <summary>{words?.original ?? "Original English answer"}</summary>
                      <p lang="en">{turn.reply.answer}</p>
                      {turn.reply.steps.length > 0 ? <small lang="en">{turn.reply.steps.map((step) => step.summary).join(" · ")}</small> : null}
                    </details>
                    <small className="guide-engine">{turn.localized.how}</small>
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
                          <Link to={`/participant/explore-consent/${quote.sectionId}`}>{turn.localized && words ? words.open : "Open"}</Link>
                        </>
                      ) : null}
                    </cite>
                  </blockquote>
                ))}
                <small className="guide-engine">
                  {turn.localized && words ? words.engines[turn.reply.engine] : (turn.reply.note ?? engineLabel[turn.reply.engine])}
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
          {words ? words.launch : "Ask the Guide"}
        </label>
        <input
          id="guide-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={words ? words.placeholder : role === "participant" ? "Ask about your form" : "Ask about the documents"}
          disabled={busy}
        />
        <button type="submit" className="btn" disabled={busy || !draft.trim()}>
          {words ? words.send : "Ask"}
        </button>
      </form>
    </aside>
  );
}
