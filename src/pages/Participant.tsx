import { useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import {
  consentDoc,
  sectionById,
  sections,
  study,
  teachPrompts,
  type SectionId,
} from "../data/study";
import { answerQuestion, suggestedQuestions, type Answer } from "../lib/answers";
import { assessTeachback, type TeachResult } from "../lib/teachback";
import { useSession } from "../state/Session";
import { ListenButton, useTitle } from "../components/Chrome";

export function ParticipantHome() {
  useTitle("Home");
  const { reviewed, saved, teach } = useSession();
  const next = sections.find((section) => !reviewed.includes(section.id)) ?? sections[0];

  return (
    <div className="page">
      <p className="kicker">{study.label}</p>
      <h1>Welcome to {study.id}.</h1>
      <p className="lede dark">
        {study.purpose} You are reading consent {consentDoc.version}, marked {consentDoc.status.toLowerCase()}.
      </p>
      <div className="stat-row">
        <article>
          <strong>
            {reviewed.length}/{sections.length}
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
        <Link className="btn solid dark" to={`/participant/explore/${next.id}`}>
          {reviewed.length === 0 ? "Start reading" : "Resume reading"}
        </Link>
        <Link className="btn on-paper" to="/participant/study">
          Study details
        </Link>
      </div>
    </div>
  );
}

export function MyStudy() {
  useTitle("My Study");
  return (
    <div className="page">
      <p className="kicker">{study.id}</p>
      <h1>{study.name}</h1>
      <dl className="meta-list">
        <div>
          <dt>Investigational product</dt>
          <dd>{study.product}, a fictional name</dd>
        </div>
        <div>
          <dt>Design</dt>
          <dd>{study.phase}, described in the synthetic consent</dd>
        </div>
        <div>
          <dt>Sponsor</dt>
          <dd>{study.sponsor}, fictional</dd>
        </div>
        <div>
          <dt>Consent</dt>
          <dd>
            {consentDoc.id} {consentDoc.version} · {consentDoc.date}
          </dd>
        </div>
        <div>
          <dt>Approval status</dt>
          <dd>
            {consentDoc.status}. {consentDoc.statusNote}
          </dd>
        </div>
      </dl>
      <ol className="topic-index">
        {sections.map((section) => (
          <li key={section.id}>
            <Link to={`/participant/explore/${section.id}`}>
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
  const known = !params.sectionId || sections.some((section) => section.id === params.sectionId);
  const requested = (known ? (params.sectionId as SectionId | undefined) : undefined) ?? sections[0].id;
  const section = sectionById(requested);
  const { textOnly, markReviewed, reviewed } = useSession();
  const [showOriginal, setShowOriginal] = useState(false);
  if (!known) {
    return <Navigate to="/participant/explore/procedures" replace />;
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
            to={`/participant/explore/${item.id}`}
            className={item.id === section.id ? "current" : ""}
            aria-current={item.id === section.id ? "page" : undefined}
          >
            <span>{item.index}</span>
            {item.title}
            {reviewed.includes(item.id) ? <em>Read</em> : null}
          </Link>
        ))}
      </aside>
      <article className="reading">
        <p className="kicker">
          {section.index} / {sections.length} · {consentDoc.version}
        </p>
        <h1>{section.title}</h1>
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
            <Link to={`/participant/explore/${previous.id}`}>Previous · {previous.title}</Link>
          ) : (
            <span />
          )}
          {next ? <Link to={`/participant/explore/${next.id}`}>Next · {next.title}</Link> : <span />}
        </div>
      </article>
    </div>
  );
}

type ChatMessage = {
  id: string;
  role: "person" | "aetheria";
  text: string;
  answer?: Answer;
};

export function Ask() {
  useTitle("Ask Aetheria");
  const [params] = useSearchParams();
  const starter = params.get("q") ?? "";
  const [draft, setDraft] = useState(starter);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { saveQuestion } = useSession();
  const [savedId, setSavedId] = useState<string | null>(null);

  const ask = (question: string) => {
    const clean = question.trim();
    if (!clean) return;
    const answer = answerQuestion(clean);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "person", text: clean },
      { id: crypto.randomUUID(), role: "aetheria", text: answer.answer, answer },
    ]);
    setDraft("");
    setSavedId(null);
  };

  return (
    <div className="page ask-page">
      <p className="kicker">Source-grounded</p>
      <h1>Ask from the consent form.</h1>
      <p className="lede dark">
        Answers use the selected synthetic consent, {consentDoc.id} {consentDoc.version}. If the form
        does not say, the reply stops there.
      </p>
      <div className="suggestions">
        {suggestedQuestions.map((item) => (
          <button key={item.id} type="button" className="chip" onClick={() => ask(item.text)}>
            {item.text}
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
                <Link to={`/participant/explore/${message.answer.sectionId}#source`}>Open this passage</Link>
              </div>
            )}
            {message.answer && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  saveQuestion({
                    question: messages[messages.indexOf(message) - 1]?.text ?? message.text,
                    answer: message.answer!.answer,
                    supported: message.answer!.supported,
                    citation: message.answer!.citation,
                  });
                  setSavedId(message.id);
                }}
              >
                {savedId === message.id ? "Saved for the coordinator" : "Save for the coordinator"}
              </button>
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
      </form>
    </div>
  );
}

export function Teach() {
  useTitle("Teach-Back");
  const [promptId, setPromptId] = useState(teachPrompts[0].id);
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<TeachResult | null>(null);
  const { recordTeach } = useSession();
  const prompt = teachPrompts.find((item) => item.id === promptId) ?? teachPrompts[0];

  const submit = () => {
    const next = assessTeachback(prompt.id, response);
    setResult(next);
    recordTeach(next);
  };

  return (
    <div className="page">
      <p className="kicker">Check my understanding</p>
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
          {teachPrompts.map((item) => (
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
          {result.missing.length > 0 && (
            <ul>
              {result.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <Link to={`/participant/explore/${prompt.sectionId}`}>Reread {prompt.topic.toLowerCase()}</Link>
        </article>
      )}
    </div>
  );
}

export function Summary() {
  useTitle("My Summary");
  const { reviewed, saved, teach } = useSession();
  const openTopics = useMemo(
    () => teach.filter((item) => item.label !== "Understands the key concept"),
    [teach],
  );

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
          {sections.map((section) => (
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
                <small>{item.supported ? item.citation : "Not answered from the form"}</small>
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
        Document used: {consentDoc.id} {consentDoc.version}, {consentDoc.date}. Status: {consentDoc.status}.
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
      <h1>Make the demo easier to use.</h1>
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
        English is the only reviewed language in this preview. Keyboard focus is visible, and every
        consent passage is in the page text.
      </p>
    </div>
  );
}
