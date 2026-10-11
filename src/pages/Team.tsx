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
import { isOpenReview } from "../lib/preflight";
import { useR } from "../lib/researchI18n";
import { assessTeachback } from "../lib/teachback";
import {
  ApprovedList,
  CompareWorkbook,
  ConsentElements,
  DesignBrief,
  PersonaResults,
  PlainWorkbook,
  PreFlight,
  RealTrialWork,
  RegistryCard,
  StarterSheets,
  StoredHandoffs,
  VersionStanding,
} from "../components/SheetPanels";
import { useSession, type ReviewState } from "../state/Session";
import { useTitle } from "../components/Chrome";
import { TrialLaySummary } from "../components/TrialPanels";

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function Overview() {
  const r = useR();
  useTitle(r.nav[0]);
  const { reviews, saved, teach, draft, consent } = useSession();
  const openFlags = consent?.hasProtocol
    ? facts.filter((fact) => factFlagged(fact) && isOpenReview(reviews[fact.id] ?? "open"))
    : [];

  return (
    <div className="page">
      <p className="kicker">{r.overview.kicker}</p>
      <h1>{r.overview.title}</h1>
      <div className="stat-row">
        <article>
          <strong>{openFlags.length}</strong>
          <span>{r.overview.flags}</span>
        </article>
        <article>
          <strong>{saved.length}</strong>
          <span>{r.overview.saved}</span>
        </article>
        <article>
          <strong>{teach.filter((item) => item.label !== "Understands the key concept").length}</strong>
          <span>{r.overview.followUps}</span>
        </article>
        <article>
          <strong>{r.states[draft]}</strong>
          <span>{r.overview.draft}</span>
        </article>
      </div>
      <div className="action-row">
        <Link className="btn solid dark" to="/researcher/document-integrity">
          {r.overview.compare}
        </Link>
        <Link className="btn on-paper" to="/researcher/plain-language">
          {r.overview.plain}
        </Link>
      </div>
      <StarterSheets />
    </div>
  );
}

export function Integrity() {
  const r = useR();
  useTitle(r.nav[1]);
  const { reviews, setReview, reviewNotes, setReviewNote, consent } = useSession();
  if (!consent || !consent.hasProtocol) {
    return (
      <div className="page">
        <p className="kicker">{r.integrity.kicker}</p>
        <h1>{r.integrity.title}</h1>
        <p className="lede dark">{consent ? r.integrity.noProtocol : r.integrity.noConsent}</p>
        <RealTrialWork />
        <div className="sheet-work">
          <PreFlight />
          <DesignBrief />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="kicker">{r.integrity.kicker}</p>
      <h1>{r.integrity.title}</h1>
      <div className="fact-list">
        {facts.map((fact) => {
          const flagged = factFlagged(fact);
          const state: ReviewState = reviews[fact.id] ?? "open";
          return (
            <article key={fact.id} className={flagged ? "fact flagged" : "fact"}>
              <header>
                <h2 lang="en">{fact.label}</h2>
                <p className="flag">{flagged ? r.integrity.difference(r.review[state]) : r.integrity.consistent}</p>
              </header>
              <div className="split" lang="en">
                <div>
                  <h3>
                    {r.integrity.protocol} · {fact.protocolValue}
                  </h3>
                  <blockquote>{fact.protocolQuote}</blockquote>
                  <small>{fact.protocolSource}</small>
                </div>
                <div>
                  <h3>
                    {r.integrity.consent} · {fact.consentValue}
                  </h3>
                  <blockquote>{fact.consentQuote}</blockquote>
                  <small>{fact.consentSource}</small>
                </div>
              </div>
              <p lang="en">{fact.why}</p>
              {flagged && (
                <>
                  <label htmlFor={`note-${fact.id}`}>{r.integrity.note}</label>
                  <textarea
                    id={`note-${fact.id}`}
                    rows={2}
                    value={reviewNotes[fact.id] ?? ""}
                    onChange={(event) => setReviewNote(fact.id, event.target.value)}
                  />
                  <div className="action-row">
                    <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "under-review")}>
                      {r.integrity.markUnder}
                    </button>
                    <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "resolved")}>
                      {r.integrity.markReviewed}
                    </button>
                    <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "dismissed")}>
                      {r.integrity.dismiss}
                    </button>
                    <button type="button" className="btn on-paper" onClick={() => setReview(fact.id, "open")}>
                      {r.integrity.reopen}
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
  const r = useR();
  useTitle(r.nav[2]);
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
      <p className="kicker">{r.insights.kicker}</p>
      <h1>{r.insights.title}</h1>
      <p className="fine">{r.insights.note}</p>
      <div className="stat-row">
        {Object.entries(counts).map(([label, count]) => (
          <article key={label}>
            <strong>{count}</strong>
            <span>{r.understanding[label] ?? label}</span>
          </article>
        ))}
      </div>
      <ul className="stack">
        {fixtureResults.map((item, index) => (
          <li key={`${item.promptId}-${index}`}>
            <strong>
              <span lang="en">{item.topic}</span> · {r.understanding[item.result.label] ?? item.result.label}
            </strong>
            <p lang="en">“{item.response}”</p>
          </li>
        ))}
      </ul>
      <div className="sheet-work">
        <StoredHandoffs />
        <PersonaResults />
      </div>
      <h2>{r.insights.savedTitle}</h2>
      <p className="fine">{saved.length === 0 ? r.insights.savedNone : r.insights.savedCount(saved.length)}</p>
      {saved.length > 0 && (
        <details className="stack">
          <summary>{r.insights.showSaved}</summary>
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
  const r = useR();
  useTitle(r.nav[3]);
  const { draft, setDraft, draftText, setDraftText, consent } = useSession();
  if (!consent) {
    return (
      <div className="page">
        <p className="kicker">{r.studio.kicker}</p>
        <h1>{r.studio.title}</h1>
        <p className="lede dark">{r.studio.noConsent}</p>
        <div className="sheet-work">
          <TrialLaySummary />
        </div>
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
      <p className="kicker">{r.studio.kicker}</p>
      <h1 lang="en">{title}</h1>
      <p className="fine">{r.studio.words(wordCount(original), wordCount(reading), longSentenceCount(original), longSentenceCount(reading))}</p>
      <div className="split studio">
        <article>
          <h2>{r.studio.original}</h2>
          <p lang="en">{original}</p>
          <dl className="terms" lang="en">
            {costs.map((term) => (
              <div key={term.word}>
                <dt>{term.word}</dt>
                <dd>{term.meaning}</dd>
              </div>
            ))}
          </dl>
        </article>
        <article>
          <h2>{r.studio.proposed(r.states[draft])}</h2>
          <label htmlFor="plain-draft">{r.studio.edit}</label>
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
            <span lang="en">{note}</span>
            <span>{audit.passed ? r.holds : r.check}</span>
          </li>
        ))}
      </ul>
      <div className="action-row">
        <button type="button" className="btn solid dark" onClick={() => setDraft("accepted")}>
          {r.studio.accept}
        </button>
        <button type="button" className="btn on-paper" onClick={() => setDraft("rejected")}>
          {r.studio.reject}
        </button>
        <button type="button" className="btn on-paper" onClick={() => setDraft("draft")}>
          {r.studio.back}
        </button>
      </div>
      <PlainWorkbook />
    </div>
  );
}

export function Lab() {
  const r = useR();
  useTitle(r.nav[4]);
  const [results, setResults] = useState<Check[] | null>(null);
  const passed = results?.filter((item) => item.passed).length ?? 0;

  return (
    <div className="page">
      <p className="kicker">{r.lab.kicker}</p>
      <h1>{r.lab.title}</h1>
      <button type="button" className="btn solid dark" onClick={() => setResults(runChecks())}>
        {r.lab.run}
      </button>
      {results && (
        <div aria-live="polite">
          <p className="score">{r.lab.count(passed, results.length)}</p>
          <ul className="stack">
            {results.map((item) => (
              <li key={item.id} className={item.passed ? "pass" : "fail"}>
                <strong>
                  {item.passed ? r.lab.passed : r.lab.failed} · <span lang="en">{item.name}</span>
                </strong>
                <p lang="en">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Documents() {
  const r = useR();
  useTitle(r.nav[5]);
  const { imports, addImport, consent, language } = useSession();
  const [note, setNote] = useState("");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf" || file.type === "application/pdf") {
      setNote(r.files.pdf);
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
    setNote(first.usable ? r.files.indexed(parsed.passages.length, file.name) : r.files.storedOnly(file.name));
  };

  return (
    <div className="page">
      <p className="kicker">{r.files.kicker}</p>
      <h1>{r.files.title}</h1>
      <p className="fine">{consent ? r.files.using(`${consent.documentId} ${consent.version}`, consent.sample) : r.files.none}</p>
      <ul className="stack">
        {consent && (
          <li>
            <strong>
              {r.files.submitted} · {consent.documentId} {consent.version}
            </strong>
            <p>
              {consent.filename} · {consent.status}
            </p>
            <small>{r.files.behind}</small>
          </li>
        )}
        {(!consent || consent.hasProtocol) &&
          versions.map((item) => (
            <li key={`${item.id}-${item.version}`} lang="en">
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
              {r.files.imported} · {item.documentId} {item.version}
            </strong>
            <p>
              {item.filename} · {item.usable ? r.files.stored : r.files.notUsed}
            </p>
            <small>{r.files.sections(item.passageCount, item.studyId)}</small>
          </li>
        ))}
      </ul>
      <label htmlFor="import-doc">{r.files.importLabel(study.id)}</label>
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
      <h2>{r.files.facts}</h2>
      <ul className="stack">
        {facts.map((fact) => (
          <li key={fact.id}>
            <strong lang="en">{fact.label}</strong>
            <p>{r.files.factLine(fact.protocolValue, fact.consentValue)}</p>
            <small>
              {fact.protocolSource} · {fact.consentSource}
            </small>
          </li>
        ))}
      </ul>
      <VersionStanding version={consent?.version ?? consentDoc.version} language={language} />
      <ConsentElements />
      <RegistryCard />
    </div>
  );
}

export function Settings() {
  const r = useR();
  useTitle(r.nav[6]);
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

  const rows: [string, string][] = [
    [r.settings.answers, r.settings.answersText],
    [r.settings.voice, r.settings.voiceText],
    [r.settings.model, ollama?.detail ?? r.settings.checkingOllama],
    [r.settings.guide, gemini === null ? r.settings.checkingGemini : gemini.configured ? r.settings.geminiOn(gemini.model ?? "") : r.settings.geminiOff],
    [r.settings.storage, r.settings.storageText],
    [r.settings.roles, r.settings.rolesText],
  ];

  return (
    <div className="page">
      <p className="kicker">{r.settings.kicker}</p>
      <h1>{r.settings.title}</h1>
      <ul className="stack">
        {rows.map(([name, text]) => (
          <li key={name}>
            <strong>{name}</strong>
            <p>{text}</p>
          </li>
        ))}
      </ul>
      <ApprovedList />
      <h2>{r.settings.actions}</h2>
      {audit.length === 0 ? (
        <p className="empty">{r.settings.noActions}</p>
      ) : (
        <ul className="stack">
          {audit.map((event) => (
            <li key={event.id} lang="en">
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
        {r.settings.reset}
      </button>
      {cleared && <p className="fine">{r.settings.resetDone}</p>}
    </div>
  );
}
