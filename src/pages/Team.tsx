import { useState } from "react";
import { Link } from "react-router-dom";
import {
  consentDoc,
  factFlagged,
  facts,
  plainDraft,
  protocolDoc,
  study,
  teachFixtures,
  teachPrompts,
  versions,
} from "../data/study";
import { auditPlainDraft, runChecks, type Check } from "../lib/checks";
import { assessTeachback } from "../lib/teachback";
import { useSession, type ReviewState } from "../state/Session";
import { useTitle } from "../components/Chrome";

export function Overview() {
  useTitle("Overview");
  const { reviews, saved, teach, draft } = useSession();
  const openFlags = facts.filter((fact) => factFlagged(fact) && (reviews[fact.id] ?? "open") === "open");

  return (
    <div className="page">
      <p className="kicker">Research team · {study.label}</p>
      <h1>{study.id} needs a human look.</h1>
      <p className="lede dark">
        Counts on this page come from the synthetic documents and from actions in this browser session.
        They are not enrollment or outcome results.
      </p>
      <div className="stat-row">
        <article>
          <strong>{openFlags.length}</strong>
          <span>Open document flags</span>
        </article>
        <article>
          <strong>{saved.length}</strong>
          <span>Questions saved here</span>
        </article>
        <article>
          <strong>{teach.filter((item) => item.label !== "Understands the key concept").length}</strong>
          <span>Teach-back follow-ups</span>
        </article>
        <article>
          <strong>{draft}</strong>
          <span>Plain-language draft</span>
        </article>
      </div>
      <div className="action-row">
        <Link className="btn solid dark" to="/team/integrity">
          Open document integrity
        </Link>
        <Link className="btn on-paper" to="/team/lab">
          Run the test lab
        </Link>
      </div>
      <p className="fine">
        Reader document: {consentDoc.id} {consentDoc.version}, status {consentDoc.status}. Protocol:{" "}
        {protocolDoc.id} {protocolDoc.version}, status {protocolDoc.status}.
      </p>
    </div>
  );
}

export function Integrity() {
  useTitle("Document Integrity");
  const { reviews, setReview } = useSession();

  return (
    <div className="page">
      <p className="kicker">Evidence</p>
      <h1>Protocol against consent.</h1>
      <p className="lede dark">
        These differences were planted in the synthetic pair. Aetheria shows both sentences. It does
        not decide which document is the right one.
      </p>
      <div className="fact-list">
        {facts.map((fact) => {
          const flagged = factFlagged(fact);
          const state: ReviewState = reviews[fact.id] ?? "open";
          return (
            <article key={fact.id} className={flagged ? "fact flagged" : "fact"}>
              <header>
                <h2>{fact.label}</h2>
                <p className="flag">{flagged ? `Seeded mismatch · ${state}` : "Consistent in this pair"}</p>
              </header>
              <div className="split">
                <div>
                  <h3>Protocol · {fact.protocolValue}</h3>
                  <blockquote>{fact.protocolQuote}</blockquote>
                  <small>{fact.protocolSource}</small>
                </div>
                <div>
                  <h3>Consent · {fact.consentValue}</h3>
                  <blockquote>{fact.consentQuote}</blockquote>
                  <small>{fact.consentSource}</small>
                </div>
              </div>
              <p>{fact.why}</p>
              {flagged && (
                <div className="action-row">
                  <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "resolved")}>
                    Mark reviewed
                  </button>
                  <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "dismissed")}>
                    Dismiss for this demo
                  </button>
                  <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "open")}>
                    Reopen
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function Insights() {
  useTitle("Participant Insights");
  const { saved } = useSession();
  const fixtureResults = teachFixtures.map((fixture) => ({
    ...fixture,
    result: assessTeachback(fixture.promptId, fixture.response),
    topic: teachPrompts.find((prompt) => prompt.id === fixture.promptId)?.topic ?? fixture.promptId,
  }));
  const counts = fixtureResults.reduce<Record<string, number>>((map, item) => {
    map[item.result.label] = (map[item.result.label] ?? 0) + 1;
    return map;
  }, {});

  return (
    <div className="page">
      <p className="kicker">Synthetic cases</p>
      <h1>Where the fixed examples get stuck.</h1>
      <p className="lede dark">
        These four replies are written into the demo. They are not real participants. The labels come
        from the same rubric the teach-back screen uses.
      </p>
      <div className="stat-row">
        {Object.entries(counts).map(([label, count]) => (
          <article key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <ul className="stack">
        {fixtureResults.map((item, index) => (
          <li key={`${item.promptId}-${index}`}>
            <strong>
              {item.topic} · {item.result.label}
            </strong>
            <p>“{item.response}”</p>
            <small>{item.note}</small>
          </li>
        ))}
      </ul>
      <h2>Questions saved in this session</h2>
      {saved.length === 0 ? (
        <p className="empty">None yet. Saved questions from the participant view appear here.</p>
      ) : (
        <ul className="stack">
          {saved.map((item) => (
            <li key={item.id}>
              <strong>{item.question}</strong>
              <p>{item.answer}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Studio() {
  useTitle("Plain Language");
  const { draft, setDraft } = useSession();
  const audit = auditPlainDraft();

  return (
    <div className="page">
      <p className="kicker">Plain language studio</p>
      <h1>{plainDraft.title}</h1>
      <p className="lede dark">
        The rewrite keeps the consent form’s own numbers. It does not silently replace them with the
        protocol. Accepting a draft does not change the source document.
      </p>
      <div className="split studio">
        <article>
          <h2>Original clause</h2>
          <p>{plainDraft.original}</p>
        </article>
        <article>
          <h2>Proposed reading · {draft}</h2>
          <p>{plainDraft.draft}</p>
        </article>
      </div>
      <ul className="plain-list">
        {audit.notes.map((note) => (
          <li key={note}>
            {note}
            <span>{audit.passed ? "Holds" : "Check"}</span>
          </li>
        ))}
      </ul>
      <div className="action-row">
        <button type="button" className="btn solid dark" onClick={() => setDraft("accepted")}>
          Accept draft
        </button>
        <button type="button" className="btn on-paper" onClick={() => setDraft("rejected")}>
          Reject draft
        </button>
        <button type="button" className="btn on-paper" onClick={() => setDraft("draft")}>
          Return to draft
        </button>
      </div>
    </div>
  );
}

export function Lab() {
  useTitle("Test Lab");
  const [results, setResults] = useState<Check[] | null>(null);
  const passed = results?.filter((item) => item.passed).length ?? 0;

  return (
    <div className="page">
      <p className="kicker">Reproducible checks</p>
      <h1>Run the demo checks.</h1>
      <p className="lede dark">
        This button executes the citation, fallback, teach-back, mismatch, and wording checks in the
        browser. The result is counted from that run.
      </p>
      <button type="button" className="btn solid dark" onClick={() => setResults(runChecks())}>
        Run checks
      </button>
      {results && (
        <div aria-live="polite">
          <p className="score">
            {passed} of {results.length} checks passed.
          </p>
          <ul className="stack">
            {results.map((item) => (
              <li key={item.id} className={item.passed ? "pass" : "fail"}>
                <strong>
                  {item.passed ? "Passed" : "Failed"} · {item.name}
                </strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Documents() {
  useTitle("Documents");
  return (
    <div className="page">
      <p className="kicker">Versions</p>
      <h1>What this preview is reading.</h1>
      <ul className="stack">
        {versions.map((item) => (
          <li key={`${item.id}-${item.version}`}>
            <strong>
              {item.kind} · {item.id} {item.version}
            </strong>
            <p>
              {item.date} · {item.status}
            </p>
            <small>{item.note}</small>
          </li>
        ))}
      </ul>
      <p className="fine">{consentDoc.statusNote}</p>
    </div>
  );
}

export function Settings() {
  useTitle("Settings");
  const { reset } = useSession();
  const [cleared, setCleared] = useState(false);

  return (
    <div className="page">
      <p className="kicker">Audit</p>
      <h1>What is connected.</h1>
      <ul className="stack">
        <li>
          <strong>Demo answers</strong>
          <p>On. Questions use the local consent rules, not an outside model.</p>
        </li>
        <li>
          <strong>ElevenLabs</strong>
          <p>Not connected. Listen uses the browser speech engine when it is available.</p>
        </li>
        <li>
          <strong>Language model key</strong>
          <p>Not configured. No study text is sent off this page.</p>
        </li>
        <li>
          <strong>Retention</strong>
          <p>Review marks, saved questions, and teach-back replies stay in this browser session only.</p>
        </li>
        <li>
          <strong>Role</strong>
          <p>The participant and research-team switch is a demo control. It is not authentication.</p>
        </li>
      </ul>
      <button
        type="button"
        className="btn on-paper"
        onClick={() => {
          reset();
          setCleared(true);
        }}
      >
        Reset this browser session
      </button>
      {cleared && <p className="fine">Session reset.</p>}
    </div>
  );
}
