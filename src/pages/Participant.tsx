import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { promptsFor } from "../lib/consent";
import { type Answer } from "../lib/answers";
import { runAgent, type AgentReply } from "../lib/agent";
import { assessTeachbackWithGemini, localBriefing, writeBriefingWithGemini, type Briefing } from "../lib/coach";
import type { SubmittedConsent } from "../lib/consent";
import { cachedGeminiStatus, type GeminiContent } from "../lib/gemini";
import { type TeachResult } from "../lib/teachback";
import { useSession } from "../state/Session";
import { ListenButton, useTitle } from "../components/Chrome";
import { ConsentFile } from "../components/ConsentFile";
import { ConsentSheet } from "../scene/ConsentSheet";

function NeedFile({ title }: { title: string }) {
  return (
    <div className="page">
      <h1>{title}</h1>
      <p className="lede dark">Add the consent form on Start.</p>
      <Link className="btn solid dark" to="/participant/home">
        Go to Start
      </Link>
    </div>
  );
}

function PassageText({ text }: { text: string }) {
  const parts = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="passage-body">
      {parts.map((part, index) => (
        <p key={index}>{part}</p>
      ))}
    </div>
  );
}

export function ParticipantHome() {
  useTitle("Home");
  const { reviewed, saved, teach, displayName, consent, clearConsent } = useSession();
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">Start</p>
        <h1>{displayName ? `${displayName}, add the consent form.` : "Add the consent form."}</h1>
        <p className="lede dark">Upload a PDF. Then read it, ask a question, or check a section.</p>
        <ConsentFile />
      </div>
    );
  }
  const next = consent.sections.find((section) => !reviewed.includes(section.id)) ?? consent.sections[0];

  return (
    <div className="page">
      <p className="kicker">{consent.sample ? "Practice form" : consent.filename}</p>
      <h1>{consent.studyName}</h1>
      <p className="lede dark">{consent.sections.length} sections.</p>
      <div className="stat-row">
        <article>
          <strong>
            {reviewed.length}/{consent.sections.length}
          </strong>
          <span>Sections opened</span>
        </article>
        <article>
          <strong>{saved.length}</strong>
          <span>Saved questions</span>
        </article>
        <article>
          <strong>{teach.length}</strong>
          <span>Teach-back replies</span>
        </article>
      </div>
      <div className="action-row">
        <Link className="btn solid dark" to={`/participant/explore-consent/${next.id}`}>
          Read the form
        </Link>
        <Link className="btn on-paper" to="/participant/ask">
          Ask a question
        </Link>
        <button className="btn on-paper" type="button" onClick={clearConsent}>
          Check another form
        </button>
      </div>
    </div>
  );
}

export function MyStudy() {
  useTitle("My Study");
  const { consent } = useSession();
  if (!consent) return <NeedFile title="No form yet." />;
  return (
    <div className="page">
      <p className="kicker">Your form</p>
      <h1>{consent.studyName}</h1>
      <p className="lede dark">
        {consent.filename}
        {consent.sample ? " · practice form" : ""}
      </p>
      <ol className="topic-index">
        {consent.sections.map((section) => (
          <li key={section.id}>
            <Link to={`/participant/explore-consent/${section.id}`}>
              <span>{section.index}</span>
              <strong>{section.title}</strong>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Explore() {
  useTitle("Explore Consent");
  const params = useParams();
  const { consent, textOnly, markReviewed, reviewed, reducedMotion } = useSession();
  const [showOriginal, setShowOriginal] = useState(false);
  if (!consent) return <NeedFile title="Read" />;
  const sections = consent.sections;
  const known = !params.sectionId || sections.some((section) => section.id === params.sectionId);
  const requested = (known ? params.sectionId : undefined) ?? sections[0].id;
  const section = sections.find((item) => item.id === requested) ?? sections[0];
  if (!known) {
    return <Navigate to={`/participant/explore-consent/${sections[0].id}`} replace />;
  }
  const index = sections.findIndex((item) => item.id === section.id);
  const previous = sections[index - 1];
  const next = sections[index + 1];

  return (
    <div className={`reader ${textOnly || !consent.sample ? "text-only" : ""}`}>
      <aside className="chapter-nav" aria-label="Consent sections">
        {sections.map((item) => (
          <Link
            key={item.id}
            to={`/participant/explore-consent/${item.id}`}
            className={item.id === section.id ? "current" : ""}
            aria-current={item.id === section.id ? "page" : undefined}
          >
            <span>{item.index}</span>
            {item.title}
            {reviewed.includes(item.id) ? <em>Done</em> : null}
          </Link>
        ))}
      </aside>
      {!textOnly && (
        <div className="consent-stage">
          <ConsentSheet chapter={index} reducedMotion={reducedMotion} />
          <p className="stage-caption">
            Practice form. The text is the section.
          </p>
        </div>
      )}
      <article className="reading">
        <p className="kicker">
          {section.index} / {sections.length} · {consent.version}
        </p>
        <h1>{section.title}</h1>
        <p className="fine">{section.citation}</p>
        <div className="reading-tools">
          <button
            type="button"
            className="btn on-paper"
            aria-pressed={!showOriginal}
            onClick={() => setShowOriginal(false)}
          >
            Short
          </button>
          <button
            type="button"
            className="btn on-paper"
            aria-pressed={showOriginal}
            onClick={() => setShowOriginal(true)}
          >
            Full text
          </button>
          <ListenButton text={section.plain} />
        </div>
        <div className="passage" id="source">
          <p className="passage-label">{showOriginal ? "From the form" : "Short reading"}</p>
          <PassageText text={showOriginal ? section.original : section.plain} />
        </div>
        <dl className="terms">
          {section.terms.map((term) => (
            <div key={term.word}>
              <dt>{term.word}</dt>
              <dd>{term.meaning}</dd>
            </div>
          ))}
        </dl>
        {consent.sample ? (
          <figure className="citation">
            <figcaption>
              {section.citation} · {section.page}
            </figcaption>
            <blockquote>{section.original}</blockquote>
          </figure>
        ) : null}
        <div className="action-row">
          <button type="button" className="btn solid dark" onClick={() => markReviewed(section.id)}>
            {reviewed.includes(section.id) ? "Marked as read" : "Mark this section as read"}
          </button>
          <Link className="btn on-paper" to={`/participant/ask?q=${encodeURIComponent(section.ask)}`}>
            Ask about this section
          </Link>
        </div>
        <div className="pager">
          {previous ? (
            <Link to={`/participant/explore-consent/${previous.id}`}>Previous · {previous.title}</Link>
          ) : (
            <span />
          )}
          {next ? <Link to={`/participant/explore-consent/${next.id}`}>Next · {next.title}</Link> : <span />}
        </div>
      </article>
    </div>
  );
}

type ChatMessage = {
  id: string;
  role: "person" | "aetheria";
  text: string;
  question?: string;
  answer?: Answer;
  steps?: string[];
  note?: string;
  links?: { to: string; label: string }[];
};

function useGeminiModel(): string | undefined {
  const [model, setModel] = useState<string>();
  useEffect(() => {
    cachedGeminiStatus().then((status) => setModel(status.configured ? status.model : undefined));
  }, []);
  return model;
}

function toAnswer(reply: AgentReply, consent: SubmittedConsent, model?: string): Answer {
  if (reply.fallbackAnswer) return reply.fallbackAnswer;
  const quote = reply.quotes[0];
  return {
    supported: reply.supported && Boolean(quote),
    answer: reply.answer,
    sectionId: quote?.sectionId,
    citation: quote?.citation,
    quote: quote?.text,
    page: quote?.page,
    documentId: consent.documentId,
    version: consent.version,
    passageId: quote?.passageId,
    engine: reply.engine === "gemini" ? "gemini" : "local-rules",
    model,
  };
}

function engineNote(answer: Answer, note?: string): string {
  if (answer.engine === "gemini") return "Answered by Gemini from the form.";
  if (note) return note;
  return answer.engine === "ollama" ? "Answered on this computer." : "Answered from the form.";
}

type SpeechResult = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognizer = {
  lang: string;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

export function Ask() {
  useTitle("Ask Aetheria");
  const { consent, saveQuestion } = useSession();
  const [params] = useSearchParams();
  const starter = params.get("q") ?? "";
  const [draft, setDraft] = useState(starter);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dictateNote, setDictateNote] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const request = useRef(0);
  const history = useRef<GeminiContent[]>([]);
  const model = useGeminiModel();
  if (!consent) return <NeedFile title="Ask" />;

  const ask = async (question: string) => {
    const clean = question.trim();
    if (!clean) return;
    const ticket = request.current + 1;
    request.current = ticket;
    const botId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "person", text: clean },
      { id: botId, role: "aetheria", text: "Looking in the selected consent form.", question: clean },
    ]);
    setDraft("");
    setSavedId(null);
    const links: { to: string; label: string }[] = [];
    const reply = await runAgent(
      clean,
      {
        role: "participant",
        consent,
        reviews: {},
        model,
        // On this page the agent suggests a chapter instead of leaving the conversation.
        navigate: (to) =>
          links.push({ to, label: to.endsWith("teach-back") ? "Practice this in Check" : "Open this part" }),
        saveQuestion: (saved, answer) =>
          saveQuestion({ question: saved, answer, supported: false, documentId: consent.documentId, version: consent.version, followUp: true }),
      },
      history.current,
    );
    if (request.current !== ticket) return;
    history.current = [
      ...history.current,
      { role: "user", parts: [{ text: clean }] },
      { role: "model", parts: [{ text: reply.answer }] },
    ];
    const answer = toAnswer(reply, consent, model);
    const extra = links.filter((link) => !link.to.endsWith(`/${answer.sectionId}`));
    setMessages((current) =>
      current.map((item) =>
        item.id === botId
          ? { ...item, text: answer.answer, answer, question: clean, steps: reply.steps.map((step) => step.summary), note: reply.note, links: extra }
          : item,
      ),
    );
  };

  const dictate = () => {
    const host = window as Window & {
      SpeechRecognition?: new () => SpeechRecognizer;
      webkitSpeechRecognition?: new () => SpeechRecognizer;
    };
    const Recognizer = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!Recognizer) {
      setDictateNote("Dictation is unavailable in this browser. Type the question instead.");
      return;
    }
    const recognition = new Recognizer();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) setDraft(transcript);
      setDictateNote("The transcript is in the box. It is not sent until you press Ask.");
    };
    recognition.onerror = () => setDictateNote("Dictation stopped. Type the question instead.");
    recognition.start();
  };

  return (
    <div className="page ask-page">
      <header className="panel-head">
        <p className="kicker">Ask</p>
        <h1>Ask about this form.</h1>
        <p className="lede dark">Answers come only from the file you added.</p>
        <div className="suggestions">
          {consent.sections.slice(0, 4).map((item) => (
            <button key={item.id} type="button" className="chip" onClick={() => ask(item.ask)}>
              {item.title}
            </button>
          ))}
        </div>
      </header>
      <div className="thread" aria-live="polite">
        {messages.length === 0 && <p className="empty">Choose a suggested question, or write your own.</p>}
        {messages.map((message) => (
          <article key={message.id} className={`bubble ${message.role}`}>
            {message.steps && message.steps.length > 0 ? <small>{message.steps.join(" · ")}</small> : null}
            <p>{message.text}</p>
            {message.answer?.supported && message.answer.sectionId && (
              <div className="cite-card">
                <strong>
                  {message.answer.citation} · {message.answer.page}
                </strong>
                <blockquote>{message.answer.quote}</blockquote>
                <Link to={`/participant/explore-consent/${message.answer.sectionId}#source`}>Open this passage</Link>
              </div>
            )}
            {message.answer && (
              <>
                {message.links?.map((link) => (
                  <Link key={link.to} to={link.to}>
                    {link.label}
                  </Link>
                ))}
                <small>
                  {engineNote(message.answer, message.note)} {message.answer.citation}
                </small>
                <ListenButton text={message.text} />
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    saveQuestion({
                      question: message.question ?? message.text,
                      answer: message.answer!.answer,
                      supported: message.answer!.supported,
                      citation: message.answer!.citation,
                      documentId: message.answer!.documentId,
                      version: message.answer!.version,
                      followUp: true,
                    });
                    setSavedId(message.id);
                  }}
                >
                  {savedId === message.id ? "Saved for the coordinator" : "Save for the coordinator"}
                </button>
              </>
            )}
          </article>
        ))}
      </div>
      <form
        className="ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
      >
        <label htmlFor="question">Your question</label>
        <textarea
          id="question"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="Ask about visits, risks, leaving, payment, or privacy."
        />
        <button className="btn solid dark" type="submit">
          Ask
        </button>
        <button className="btn on-paper" type="button" onClick={dictate}>
          Dictate
        </button>
        {dictateNote ? <p className="fine">{dictateNote}</p> : null}
      </form>
    </div>
  );
}

export function Teach() {
  useTitle("Teach-Back");
  const { consent, recordTeach } = useSession();
  const prompts = consent ? promptsFor(consent) : [];
  const [promptId, setPromptId] = useState(prompts[0]?.id ?? "");
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<TeachResult | null>(null);
  const [checking, setChecking] = useState(false);
  if (!consent || prompts.length === 0) return <NeedFile title="Check" />;
  const prompt = prompts.find((item) => item.id === promptId) ?? prompts[0];

  const submit = async () => {
    if (checking) return;
    setChecking(true);
    const next = await assessTeachbackWithGemini(prompt, response, consent);
    setChecking(false);
    setResult(next);
    recordTeach(next);
  };

  return (
    <div className="page check-page">
      <header className="panel-head">
        <p className="kicker">Check</p>
        <h1>Say it in your own words.</h1>
        <p className="lede dark">This is not a test and not a signature.</p>
      </header>
      <div className="check-layout">
      <form
        className="teach-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor="prompt">Topic</label>
        <select
          id="prompt"
          value={prompt.id}
          onChange={(event) => {
            setPromptId(event.target.value);
            setResult(null);
            setResponse("");
          }}
        >
          {prompts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.topic}
            </option>
          ))}
        </select>
        <p className="prompt-text">{prompt.question}</p>
        <label htmlFor="reply">Your explanation</label>
        <textarea
          id="reply"
          rows={5}
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          placeholder="Write what you understood. A short yes is not enough."
        />
        <button className="btn solid dark" type="submit" disabled={checking}>
          {checking ? "Checking…" : "Check this explanation"}
        </button>
      </form>
      {result && (
        <article className="result" aria-live="polite">
          <p className="kicker">{result.label}</p>
          <p>{result.feedback}</p>
          {result.matched.length > 0 && (
            <ul>
              {result.matched.map((item) => (
                <li key={item}>Covered: {item}</li>
              ))}
            </ul>
          )}
          {result.missing.length > 0 && (
            <ul>
              {result.missing.map((item) => (
                <li key={item}>Still to clarify: {item}</li>
              ))}
            </ul>
          )}
          <p>You can change the words above and check again. This is not a pass or fail score.</p>
          <p className="fine">
            {result.engine === "gemini"
              ? "Checked by Gemini. It reads for meaning, not exact words."
              : result.engine === "ollama"
                ? "Checked on this computer. It reads for meaning, not exact words."
                : (result.note ?? "Checked against the form’s key ideas.")}
          </p>
          <Link to={`/participant/explore-consent/${prompt.sectionId}`}>Reread {prompt.topic.toLowerCase()}</Link>
        </article>
      )}
      </div>
    </div>
  );
}

export function Summary() {
  useTitle("My Summary");
  const { reviewed, saved, teach, consent } = useSession();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [writing, setWriting] = useState(false);
  const openTopics = useMemo(
    () => teach.filter((item) => item.label !== "Understands the key concept"),
    [teach],
  );
  if (!consent) return <NeedFile title="Summary" />;

  return (
    <div className="page summary-page">
      <header className="panel-head">
        <p className="kicker">Summary</p>
        <h1>What you have read.</h1>
        <p className="notice">This is not a signature.</p>
      </header>
      <div className="summary-grid">
      <section>
        <h2>For your coordinator</h2>
        {briefing ? (
          <>
            <p>{briefing.summary}</p>
            {briefing.questions.length === 0 ? (
              <p className="empty">Nothing is waiting. You can still ask for a conversation.</p>
            ) : (
              <ol className="stack">
                {briefing.questions.map((item) => (
                  <li key={item.text}>
                    <strong>{item.text}</strong>
                    <p>{item.reason}</p>
                  </li>
                ))}
              </ol>
            )}
            <p className="fine">
              {briefing.engine === "gemini"
                ? "Written by Gemini from this session. It adds no study facts."
                : briefing.engine === "ollama"
                  ? "Written on this computer from this session."
                  : (briefing.note ?? "Built from this session.")}
            </p>
            <ListenButton text={[briefing.summary, ...briefing.questions.map((item) => item.text)].join(" ")} />
          </>
        ) : (
          <p className="empty">Turn your saved questions and checks into a short list to bring.</p>
        )}
        <button
          type="button"
          className="btn on-paper"
          disabled={writing}
          onClick={async () => {
            setWriting(true);
            const input = { consent, reviewed, saved, teach };
            setBriefing(await writeBriefingWithGemini(input).catch(() => localBriefing(input)));
            setWriting(false);
          }}
        >
          {writing ? "Writing…" : briefing ? "Write again" : "Write my questions"}
        </button>
      </section>
      <section>
        <h2>Sections marked as read</h2>
        <ul className="plain-list">
          {consent.sections.map((section) => (
            <li key={section.id}>
              <span className="summary-title">{section.title}</span>
              <span className={reviewed.includes(section.id) ? "mark done" : "mark"}>
                {reviewed.includes(section.id) ? "Read" : "Not yet"}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Saved questions</h2>
        {saved.length === 0 ? (
          <p className="empty">No questions saved in this browser session.</p>
        ) : (
          <ul className="stack">
            {saved.map((item) => (
              <li key={item.id}>
                <strong>{item.question}</strong>
                <p>{item.answer}</p>
                <small>
                  {item.followUp ? "Marked for follow-up. " : ""}
                  {item.supported ? item.citation : "Not answered from the form"}
                  {item.version ? ` · ${item.version}` : ""}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2>Topics to discuss with the coordinator</h2>
        {openTopics.length === 0 ? (
          <p className="empty">No teach-back replies are waiting. You can still ask for a conversation.</p>
        ) : (
          <ul className="stack">
            {openTopics.map((item) => (
              <li key={item.promptId}>
                <strong>{item.label}</strong>
                <p>{item.feedback}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
      <p className="fine">
        Document used: {consent.documentId} {consent.version}, {consent.date}. Status: {consent.status}. This summary is a handoff, not a signature.
      </p>
    </div>
  );
}

export function Access() {
  useTitle("Text size");
  const session = useSession();
  const sizes = [
    ["md", "Default"],
    ["lg", "Large"],
    ["xl", "Larger"],
  ] as const;

  return (
    <div className="page">
      <p className="kicker">Text size</p>
      <h1>Choose a size.</h1>
      <div className="size-card">
        <div className="size-choices" role="radiogroup" aria-label="Text size">
          {sizes.map(([size, label]) => (
            <button
              key={size}
              type="button"
              className="size-choice"
              role="radio"
              aria-checked={session.fontScale === size}
              onClick={() => session.setFontScale(size)}
            >
              <span className={`size-sample size-${size}`}>Aa</span>
              {label}
            </button>
          ))}
        </div>
        <div className="size-extras">
          <button
            type="button"
            className="btn on-paper"
            aria-pressed={session.contrast === "high"}
            onClick={() => session.setContrast(session.contrast === "high" ? "paper" : "high")}
          >
            Higher contrast
          </button>
          <button
            type="button"
            className="btn on-paper"
            aria-pressed={session.reducedMotion}
            onClick={() => session.setReducedMotion(!session.reducedMotion)}
          >
            Less motion
          </button>
        </div>
      </div>
    </div>
  );
}
