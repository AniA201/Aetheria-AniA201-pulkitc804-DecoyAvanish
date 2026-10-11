import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  consentDoc,
  factFlagged,
  facts,
  plainDraft,
  study,
  teachFixtures,
  teachPrompts,
  sectionById,
  versions,
} from "../data/study";
import { runChecks, type Check } from "../lib/checks";
import { inspectText, rejectUpload } from "../lib/ingest";
import { geminiStatus, type GeminiStatus } from "../lib/gemini";
import { probeOllama, type OllamaProbe } from "../lib/ollama";
import { auditNumbers, auditPlainText, longSentenceCount } from "../lib/plain";
import { isOpenReview, reviewLabel } from "../lib/preflight";
import { assessTeachback } from "../lib/teachback";
import {
  ApprovedList,
  CompareWorkbook,
  ConsentElements,
  DesignBrief,
  PersonaResults,
  PlainWorkbook,
  PreFlight,
  RegistryCard,
  StoredHandoffs,
  VersionStanding,
} from "../components/SheetPanels";
import { useSession, type ReviewState } from "../state/Session";
import { useTitle } from "../components/Chrome";

function pace(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  const count = Math.max(sentences.length, 1);
  return `${words.length} words, about ${Math.round(words.length / count)} words in a sentence.`;
}

export function Overview() {
  useTitle("Overview");
  const { reviews, saved, teach, draft, consent } = useSession();
  const openFlags = consent?.hasProtocol
    ? facts.filter((fact) => factFlagged(fact) && isOpenReview(reviews[fact.id] ?? "open"))
    : [];

  return (
    <div className="page">
      <p className="kicker">Research</p>
      <h1>What needs a person.</h1>
      <p className="lede dark">These counts are from this browser. They are not study results.</p>
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
        <Link className="btn solid dark" to="/researcher/document-integrity">
          Compare documents
        </Link>
        <Link className="btn on-paper" to="/researcher/plain-language">
          Plain language
        </Link>
      </div>
    </div>
  );
}

export function Integrity() {
  useTitle("Document Integrity");
  const { reviews, setReview, reviewNotes, setReviewNote, consent } = useSession();
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">Evidence</p>
        <h1>Protocol against consent.</h1>
        <p className="lede dark">No consent form has been submitted in this browser yet. The protocol checks below run on the practice protocol or a file you add.</p>
        <div className="sheet-work">
          <PreFlight />
          <DesignBrief />
        </div>
      </div>
    );
  }
  if (!consent.hasProtocol) {
    return (
      <div className="page">
        <p className="kicker">Evidence</p>
        <h1>Protocol against consent.</h1>
        <p className="lede dark">This file has no protocol next to it, so there is nothing to compare. The protocol checks below run on the practice protocol or a file you add.</p>
        <div className="sheet-work">
          <PreFlight />
          <DesignBrief />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="kicker">Compare</p>
      <h1>Protocol next to consent.</h1>
      <p className="lede dark">Differences stay here until a person reviews them.</p>
      <div className="fact-list">
        {facts.map((fact) => {
          const flagged = factFlagged(fact);
          const state: ReviewState = reviews[fact.id] ?? "open";
          return (
            <article key={fact.id} className={flagged ? "fact flagged" : "fact"}>
              <header>
                <h2>{fact.label}</h2>
                <p className="flag">
                  {flagged ? `Confirmed textual difference · ${reviewLabel(state)}` : "Consistent in this pair"}
                </p>
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
              <p>Next step: a person compares the two sentences. Neither document is edited from this screen.</p>
              {flagged && (
                <>
                  <label htmlFor={`note-${fact.id}`}>Review note</label>
                  <textarea
                    id={`note-${fact.id}`}
                    rows={2}
                    value={reviewNotes[fact.id] ?? ""}
                    onChange={(event) => setReviewNote(fact.id, event.target.value)}
                  />
                  <div className="action-row">
                    <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "under-review")}>
                      Mark under review
                    </button>
                    <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "resolved")}>
                      Mark reviewed
                    </button>
                    <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "dismissed")}>
                      Not a discrepancy
                    </button>
                    <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "open")}>
                      Reopen
                    </button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
      <CompareWorkbook />
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
      <p className="kicker">Questions</p>
      <h1>Example replies.</h1>
      <p className="lede dark">These are practice answers for the sample form. They are not people in this browser.</p>
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
      <div className="sheet-work">
        <StoredHandoffs />
        <PersonaResults />
      </div>
      <h2>Questions saved in this browser</h2>
      <p className="fine">
        {saved.length === 0
          ? "None yet. A saved question from the participant view can be opened here. It is not sent anywhere."
          : `${saved.length} saved in this browser. The wording stays closed until you ask to see it.`}
      </p>
      {saved.length > 0 && (
        <details className="stack">
          <summary>Show saved questions from this browser</summary>
          <ul className="stack">
            {saved.map((item) => (
              <li key={item.id}>
                <strong>{item.question}</strong>
                <p>{item.answer}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function Studio() {
  useTitle("Plain Language Studio");
  const { draft, setDraft, draftText, setDraftText, consent } = useSession();
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">Plain language studio</p>
        <h1>Submit a consent form first.</h1>
        <p className="lede dark">A shorter reading sits beside the original. Accepting it does not change the file.</p>
      </div>
    );
  }
  const uploaded = consent.source === "upload" ? consent.sections[0] : null;
  const original = uploaded?.original ?? plainDraft.original;
  const seeded = uploaded?.plain ?? plainDraft.draft;
  const title = uploaded?.title ?? plainDraft.title;
  const reading = draftText.trim() ? draftText : seeded;
  const audit = uploaded ? auditNumbers(original, reading) : auditPlainText(reading);
  const costs = uploaded ? uploaded.terms : sectionById("costs").terms;

  return (
    <div className="page">
      <p className="kicker">Plain language studio</p>
      <h1>{title}</h1>
      <p className="lede dark">
        {uploaded
          ? "The shorter reading sits beside the original. Accepting it does not change the file."
          : "The shorter reading keeps this form’s own numbers. Accepting it does not change the file."}
      </p>
      <p className="fine">
        {uploaded
          ? "Figures in the source clause have to remain in the suggestion."
          : plainDraft.reason}
      </p>
      <p className="fine">
        Original: {pace(original)} Draft: {pace(reading)} Sentences longer than 25 words:{" "}
        {longSentenceCount(original)} in the original, {longSentenceCount(reading)} in the draft. This
        is a word count, not a test with a reader.
      </p>
      <div className="split studio">
        <article>
          <h2>Original clause</h2>
          <p>{original}</p>
          <dl className="terms">
            {costs.map((term) => (
              <div key={term.word}>
                <dt>{term.word}</dt>
                <dd>{term.meaning}</dd>
              </div>
            ))}
          </dl>
        </article>
        <article>
          <h2>Proposed reading · {draft}</h2>
          <label htmlFor="plain-draft">Edit the suggestion</label>
          <textarea
            id="plain-draft"
            rows={6}
            value={reading}
            onChange={(event) => setDraftText(event.target.value)}
          />
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
      <PlainWorkbook />
    </div>
  );
}

export function Lab() {
  useTitle("Test Lab");
  const [results, setResults] = useState<Check[] | null>(null);
  const passed = results?.filter((item) => item.passed).length ?? 0;

  return (
    <div className="page">
      <p className="kicker">Checks</p>
      <h1>Run the checks.</h1>
      <p className="lede dark">One button. The count comes from that run.</p>
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
  useTitle("Documents & Versions");
  const { imports, addImport, consent } = useSession();
  const [note, setNote] = useState("");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf" || file.type === "application/pdf") {
      setNote("Submit a consent PDF from Home. This page stores the structured text documents.");
      return;
    }
    const rejected = rejectUpload({ name: file.name, type: file.type, size: file.size });
    if (rejected) {
      setNote(rejected);
      return;
    }
    const parsed = inspectText(file.name, await file.text());
    if (!parsed.ok) {
      setNote(parsed.error);
      return;
    }
    const first = parsed.passages[0];
    addImport({
      id: crypto.randomUUID(),
      filename: file.name,
      studyId: first.studyId,
      documentId: first.documentId,
      version: first.version,
      usable: first.usable,
      passageCount: parsed.passages.length,
      passages: parsed.passages,
    });
    setNote(
      first.usable
        ? `Indexed ${parsed.passages.length} sections from ${file.name}. Participant answers still use the submitted consent.`
        : `Stored ${file.name}, but it is not used for participant answers.`,
    );
  };

  return (
    <div className="page">
      <p className="kicker">Versions</p>
      <h1>What this workspace is reading.</h1>
      {consent ? (
        <p className="fine">
          Answers and citations use {consent.documentId} {consent.version}
          {consent.sample ? ", the included sample." : ", the file that was submitted."}
        </p>
      ) : (
        <p className="fine">No consent form has been submitted yet. The list below is the included sample set, not the active reading.</p>
      )}
      <ul className="stack">
        {consent && (
          <li>
            <strong>
              Submitted · {consent.documentId} {consent.version}
            </strong>
            <p>
              {consent.filename} · {consent.status}
            </p>
            <small>This is the version behind answers and citations.</small>
          </li>
        )}
        {(!consent || consent.hasProtocol) && versions.map((item) => (
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
        {imports.map((item) => (
          <li key={item.id}>
            <strong>
              Imported · {item.documentId} {item.version}
            </strong>
            <p>
              {item.filename} · {item.usable ? "Stored" : "Not used for answers"}
            </p>
            <small>
              {item.passageCount} sections · study {item.studyId}
            </small>
          </li>
        ))}
      </ul>
      <label htmlFor="import-doc">Import a .txt or .md document for {study.id}</label>
      <input
        id="import-doc"
        type="file"
        accept=".txt,.md,text/plain"
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {note ? <p className="fine">{note}</p> : null}
      <h2>Shared facts</h2>
      <ul className="stack">
        {facts.map((fact) => (
          <li key={fact.id}>
            <strong>{fact.label}</strong>
            <p>
              Protocol: {fact.protocolValue}. Consent: {fact.consentValue}.
            </p>
            <small>
              {fact.protocolSource} · {fact.consentSource}
            </small>
          </li>
        ))}
      </ul>
      <VersionStanding version={consent?.version ?? consentDoc.version} />
      <ConsentElements />
      <RegistryCard />
      <p className="pack-line">
        Write Once: v2.1 is the form in the reader. v2.0 is outdated and is not offered as the current
        consent. Shared facts that disagree stay on Document Integrity until a person reviews them.
      </p>
    </div>
  );
}

export function Settings() {
  useTitle("Settings & Audit");
  const { reset, audit } = useSession();
  const [cleared, setCleared] = useState(false);
  const [ollama, setOllama] = useState<OllamaProbe | null>(null);
  const [gemini, setGemini] = useState<GeminiStatus | null>(null);

  useEffect(() => {
    let cancel = false;
    probeOllama().then((status) => {
      if (!cancel) setOllama(status);
    });
    geminiStatus().then((status) => {
      if (!cancel) setGemini(status);
    });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="page">
      <p className="kicker">Audit</p>
      <h1>What is connected.</h1>
      <ul className="stack">
        <li>
          <strong>Demo answers</strong>
          <p>
            On. If Ollama is running, a question is answered from the retrieved consent passages. Otherwise the
            local consent rules answer, and the reply says so.
          </p>
        </li>
        <li>
          <strong>Voice</strong>
          <p>Listen uses the browser speech engine when it is available. Dictate fills the question box and does not send audio anywhere.</p>
        </li>
        <li>
          <strong>Language model</strong>
          <p>{ollama?.detail ?? "Checking for Ollama on this computer."}</p>
        </li>
        <li>
          <strong>Aetheria Guide</strong>
          <p>
            {gemini === null
              ? "Checking for Gemini."
              : gemini.configured
                ? `Connected to Google’s Gemini API (${gemini.model}, free tier). Guide questions and the matching passages are sent to Google, which may use free-tier data to improve its products. The key stays on this computer’s dev server.`
                : "Not set up. Add GEMINI_API_KEY to .env.local to turn it on. Until then the Guide answers from the local rules."}
          </p>
        </li>
        <li>
          <strong>Retention</strong>
          <p>
            Review marks and saved questions stay in this browser session only. A teach-back reply from a signed-in participant is also stored by the local FastAPI service (SQLite) so the research team can read it on Questions.
          </p>
        </li>
        <li>
          <strong>Roles</strong>
          <p>
            Participant entry and the approved access phrase are stored in this browser only. A
            participant cannot open this workspace, and a research request does not grant it.
          </p>
        </li>
      </ul>
      <ApprovedList />
      <h2>Session actions</h2>
      {audit.length === 0 ? (
        <p className="empty">No review actions yet in this browser session.</p>
      ) : (
        <ul className="stack">
          {audit.map((event) => (
            <li key={event.id}>
              <strong>
                {event.action} · {event.at}
              </strong>
              <p>{event.detail}</p>
            </li>
          ))}
        </ul>
      )}
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
