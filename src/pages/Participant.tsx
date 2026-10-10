import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { promptsFor } from "../lib/consent";
import { type Answer } from "../lib/answers";
import { answerQuestionGrounded } from "../lib/grounded";
import { assessTeachback, type TeachResult } from "../lib/teachback";
import { useSession } from "../state/Session";
import { ListenButton, useTitle } from "../components/Chrome";
import { ConsentFile } from "../components/ConsentFile";
import { ConsentSheet } from "../scene/ConsentSheet";

export function ParticipantHome() {
  useTitle("Home");
  const { reviewed, saved, teach, displayName, consent } = useSession();
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">Consent</p>
        <h1>{displayName ? `${displayName}, submit the consent form.` : "Submit the consent form."}</h1>
        <p className="lede dark">
          Choose the file to read. After you submit it, the sections, questions, and teach-back use that
          form. Aetheria does not sign it or decide that anyone consented.
        </p>
        <ConsentFile />
      </div>
    );
  }
  const next = consent.sections.find((section) => !reviewed.includes(section.id)) ?? consent.sections[0];

  return (
    <div className="page">
      <p className="kicker">{consent.sample ? "Included sample" : consent.documentId}</p>
      <h1>{displayName ? `${displayName}, the form is ready.` : "The form is ready."}</h1>
      <p className="lede dark">
        {consent.purpose} You are reading {consent.documentId} {consent.version}, marked {consent.status.toLowerCase()}.
      </p>
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
          Continue learning
        </Link>
        <Link className="btn on-paper" to="/participant/my-study">
          My Study
        </Link>
      </div>
    </div>
  );
}

export function MyStudy() {
  useTitle("My Study");
  const { consent } = useSession();
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">My Study</p>
        <h1>No consent form yet.</h1>
        <p className="lede dark">Submit a consent file to open the study reading.</p>
        <ConsentFile />
      </div>
    );
  }
  return (
    <div className="page">
      <p className="kicker">{consent.studyId}</p>
      <h1>{consent.studyName}</h1>
      <dl className="meta-list">
        <div>
          <dt>Investigational product</dt>
          <dd>{consent.product}</dd>
        </div>
        <div>
          <dt>Design</dt>
          <dd>{consent.phase}</dd>
        </div>
        <div>
          <dt>Sponsor</dt>
          <dd>{consent.sponsor}</dd>
        </div>
        <div>
          <dt>Consent</dt>
          <dd>
            {consent.documentId} {consent.version} · {consent.date}
          </dd>
        </div>
        <div>
          <dt>Approval status</dt>
          <dd>
            {consent.status}. {consent.statusNote}
          </dd>
        </div>
        <div>
          <dt>File</dt>
          <dd>{consent.sample ? `${consent.filename} · included sample` : consent.filename}</dd>
        </div>
      </dl>
      <ConsentFile />
      <ol className="topic-index">
        {consent.sections.map((section) => (
          <li key={section.id}>
            <Link to={`/participant/explore-consent/${section.id}`}>
              <span>{section.index}</span>
              <strong>{section.title}</strong>
              <em>{section.short}</em>
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
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">Explore Consent</p>
        <h1>Submit a consent form first.</h1>
        <ConsentFile />
      </div>
    );
  }
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
    <div className={`reader ${textOnly ? "text-only" : ""}`}>
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
            {reviewed.includes(item.id) ? <em>Read</em> : null}
          </Link>
        ))}
      </aside>
      {!textOnly && (
        <div className="consent-stage">
          <ConsentSheet chapter={index} reducedMotion={reducedMotion} />
          <p className="stage-caption">
            Chapter {section.index} of {sections.length}. The words below are the document.
          </p>
        </div>
      )}
      <article className="reading">
        <p className="kicker">
          {section.index} / {sections.length} · {consent.version}
        </p>
        <h1>{section.title}</h1>
        <p className="pack-line">
          Teach It Back reads this chapter from {consent.documentId} {consent.version}. Say It Plainly
          keeps the original clause next to the shorter reading.
        </p>
        <div className="reading-tools">
          <button
            type="button"
            className="btn on-paper"
            aria-pressed={!showOriginal}
            onClick={() => setShowOriginal(false)}
          >
            Plain language
          </button>
          <button
            type="button"
            className="btn on-paper"
            aria-pressed={showOriginal}
            onClick={() => setShowOriginal(true)}
          >
            Original clause
          </button>
          <ListenButton text={section.plain} />
        </div>
        <div className="passage" id="source">
          <p className="passage-label">{showOriginal ? "Original wording" : "Plain-language reading"}</p>
          <p className="passage-body">{showOriginal ? section.original : section.plain}</p>
        </div>
        <dl className="terms">
          {section.terms.map((term) => (
            <div key={term.word}>
              <dt>{term.word}</dt>
              <dd>{term.meaning}</dd>
            </div>
          ))}
        </dl>
        <figure className="citation">
          <figcaption>
            {section.citation} · {section.page}
          </figcaption>
          <blockquote>{section.original}</blockquote>
        </figure>
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
};

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
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">Ask Aetheria</p>
        <h1>Submit a consent form first.</h1>
        <ConsentFile />
      </div>
    );
  }

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
    const answer = await answerQuestionGrounded(clean, {
      passages: consent.passages,
      demoRules: consent.source === "demo",
      documentId: consent.documentId,
      version: consent.version,
    });
    if (request.current !== ticket) return;
    setMessages((current) =>
      current.map((item) => (item.id === botId ? { ...item, text: answer.answer, answer, question: clean } : item)),
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
      <p className="kicker">Source-grounded</p>
      <h1>Ask from the consent form.</h1>
      <p className="lede dark">
        Answers use {consent.documentId} {consent.version}, the form you submitted. If that form does
        not say, the reply stops there.
      </p>
      <div className="suggestions">
        {consent.sections.map((item) => (
          <button key={item.id} type="button" className="chip" onClick={() => ask(item.ask)}>
            {item.ask}
          </button>
        ))}
      </div>
      <div className="thread" aria-live="polite">
        {messages.length === 0 && <p className="empty">Choose a suggested question, or write your own.</p>}
        {messages.map((message) => (
          <article key={message.id} className={`bubble ${message.role}`}>
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
                <small>
                  {message.answer.engine === "ollama"
                    ? `Local model ${message.answer.model}. The quotation is the retrieved passage, not a model-written quote.`
                    : "Local rules answered this. Ollama did not produce this reply."}{" "}
                  {message.answer.documentId} {message.answer.version}
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
  if (!consent || prompts.length === 0) {
    return (
      <div className="page">
        <p className="kicker">Teach-Back</p>
        <h1>Submit a consent form first.</h1>
        <ConsentFile />
      </div>
    );
  }
  const prompt = prompts.find((item) => item.id === promptId) ?? prompts[0];

  const submit = () => {
    const next = assessTeachback(prompt.id, response, prompts);
    setResult(next);
    recordTeach(next);
  };

  return (
    <div className="page">
      <p className="kicker">Teach It Back</p>
      <h1>Say it in your own words.</h1>
      <p className="lede dark">
        This is not a test you pass or fail, and it is not a record that you consented. It shows which
        ideas may still need a person.
      </p>
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
        <button className="btn solid dark" type="submit">
          Check this explanation
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
          <Link to={`/participant/explore-consent/${prompt.sectionId}`}>Reread {prompt.topic.toLowerCase()}</Link>
        </article>
      )}
    </div>
  );
}

export function Summary() {
  useTitle("My Summary");
  const { reviewed, saved, teach, consent } = useSession();
  const openTopics = useMemo(
    () => teach.filter((item) => item.label !== "Understands the key concept"),
    [teach],
  );
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">My Summary</p>
        <h1>Submit a consent form first.</h1>
        <ConsentFile />
      </div>
    );
  }

  return (
    <div className="page">
      <p className="kicker">Handoff</p>
      <h1>What you have explored.</h1>
      <p className="notice">
        This summary is not a consent certificate, a signature, or proof that you understood the study.
      </p>
      <section>
        <h2>Sections marked as read</h2>
        <ul className="plain-list">
          {consent.sections.map((section) => (
            <li key={section.id}>
              {section.title}
              <span>{reviewed.includes(section.id) ? "Read" : "Not marked"}</span>
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
      <p className="fine">
        Document used: {consent.documentId} {consent.version}, {consent.date}. Status: {consent.status}. This summary is a handoff, not a signature.
      </p>
    </div>
  );
}

export function Access() {
  useTitle("Accessibility");
  const session = useSession();

  return (
    <div className="page">
      <p className="kicker">Reading preferences</p>
      <h1>Make the reading easier to use.</h1>
      <form className="prefs">
        <fieldset>
          <legend>Text size</legend>
          {(["md", "lg", "xl"] as const).map((size) => (
            <label key={size} className="choice">
              <input
                type="radio"
                name="font"
                checked={session.fontScale === size}
                onChange={() => session.setFontScale(size)}
              />
              {size === "md" ? "Default" : size === "lg" ? "Large" : "Larger"}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Contrast</legend>
          <label className="choice">
            <input
              type="radio"
              name="contrast"
              checked={session.contrast === "paper"}
              onChange={() => session.setContrast("paper")}
            />
            Warm paper
          </label>
          <label className="choice">
            <input
              type="radio"
              name="contrast"
              checked={session.contrast === "high"}
              onChange={() => session.setContrast("high")}
            />
            Higher contrast
          </label>
        </fieldset>
        <fieldset>
          <legend>Narration speed</legend>
          {(
            [
              [0.85, "Slower"],
              [1, "Default"],
              [1.15, "Faster"],
            ] as const
          ).map(([rate, label]) => (
            <label key={rate} className="choice">
              <input
                type="radio"
                name="rate"
                checked={session.narrationRate === rate}
                onChange={() => session.setNarrationRate(rate)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Language</legend>
          <label className="choice">
            <input type="radio" name="language" checked readOnly />
            English
          </label>
          <p className="fine">Other languages stay off until a reviewed translation exists.</p>
        </fieldset>
        <fieldset>
          <legend>Voice</legend>
          <p className="fine">
            Listen uses this browser’s speech engine. ElevenLabs is not connected, so there is no
            separate voice to choose.
          </p>
        </fieldset>
        <label className="choice">
          <input
            type="checkbox"
            checked={session.reducedMotion}
            onChange={(event) => session.setReducedMotion(event.target.checked)}
          />
          Reduce motion
        </label>
        <label className="choice">
          <input
            type="checkbox"
            checked={session.textOnly}
            onChange={(event) => session.setTextOnly(event.target.checked)}
          />
          Text-only mode, without the illustrated document
        </label>
      </form>
      <p className="fine">
        English is the only language available. Keyboard focus is visible, and every consent passage is
        in the page text.
      </p>
    </div>
  );
}
