// Starter-sheet work on one real public trial, NCT03238781 (Amgen AMG 301, migraine prevention).
// Everything here is computed from the files saved under public/trials/NCT03238781/.
import { useEffect, useMemo, useState } from "react";
import { coverageScore } from "../lib/protocolCheck";
import { readability } from "../lib/plainLab";
import {
  annexElements,
  checkLay,
  layAudiences,
  layFacts,
  laySummary,
  layText,
  runLayPlants,
  traceNumbers,
  type LayAudience,
  type LayFact,
} from "../lib/laySummary";
import {
  amendmentHistory,
  assemble,
  briefFromRegistry,
  burdenAssumptions,
  changeFor,
  changeImpact,
  cleanPages,
  consistencyRows,
  loadTrial,
  peerComparison,
  precedent,
  protocolBody,
  protocolMeta,
  publicNct,
  runTrialPlants,
  runWritePlants,
  trialBlocks,
  trialBurden,
  trialChanges,
  trialChecklist,
  trialChecks,
  trialHotspots,
  valuesOf,
  type TrialBlockId,
  type TrialData,
} from "../lib/publicTrial";
import { useSession, type CommentTarget, type ReviewerComment } from "../state/Session";
import { ChecklistTable, Comments, download, FindingList } from "./SheetPanels";

type TrialState = { trial: TrialData | null; error: string };

export function useTrial(): TrialState {
  const [state, setState] = useState<TrialState>({ trial: null, error: "" });
  useEffect(() => {
    let live = true;
    loadTrial()
      .then((trial) => live && setState({ trial, error: "" }))
      .catch((error: unknown) => live && setState({ trial: null, error: error instanceof Error ? error.message : String(error) }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

function Provenance({ trial }: { trial: TrialData }) {
  return (
    <p className="fine">
      Real public data for {trial.nctId}, retrieved {day(trial.retrieved)} from{" "}
      <a href={`https://clinicaltrials.gov/study/${trial.nctId}`} target="_blank" rel="noreferrer">
        ClinicalTrials.gov
      </a>{" "}
      (registry record, the posted protocol PDF with {trial.protocol.pages.length} pages, and the posted SAP with {trial.sap.pages.length} pages). Refresh with{" "}
      <code>npm run fetch-trial</code>.
    </p>
  );
}

function Loading({ state }: { state: TrialState }) {
  return state.error ? (
    <p className="notice">The {publicNct} files could not be loaded ({state.error}). Run npm run fetch-trial and reload.</p>
  ) : (
    <p className="fine">Loading the {publicNct} files…</p>
  );
}

/* ---------- Protocol Pre-Flight on the real protocol ---------- */

export function TrialPreFlight() {
  const state = useTrial();
  const trial = state.trial;
  const computed = useMemo(() => {
    if (!trial) return null;
    const body = protocolBody(trial.protocol);
    const rows = trialChecklist(trial);
    const findings = trialChecks(body, trial.sap.pages, trial.study);
    return {
      meta: protocolMeta(trial.protocol),
      rows,
      score: coverageScore(rows),
      findings,
      plants: runTrialPlants(trial),
      amendments: amendmentHistory(trial.protocol),
      peers: peerComparison(trial),
      burden: trialBurden(trial),
      spots: trialHotspots(trial, findings, rows),
    };
  }, [trial]);

  return (
    <section id="nct-pre-flight">
      <h2>Pre-flight on a real protocol: {publicNct}</h2>
      {!trial || !computed ? (
        <Loading state={state} />
      ) : (
        <>
          <p>
            {trial.study.protocolSection.identificationModule.officialTitle}. {computed.meta.documentId}, {computed.meta.version}, dated {computed.meta.date}.
          </p>
          <Provenance trial={trial} />
          <p className="notice">This checks a protocol’s text. It does not approve a protocol, and its marks are not a regulatory review.</p>

          <article className="fact">
            <h3>Checklist coverage: {computed.score.value} of 100</h3>
            <p>
              ({computed.score.present} present + 0.5 × {computed.score.thin} thin) ÷ {computed.score.total} items × 100 = {computed.score.value}
            </p>
            <p className="fine">ICH M11 and SPIRIT 2025 headings, read from the protocol body (pages 1–{protocolBody(trial.protocol).length}). Each mark shows the page it came from.</p>
          </article>
          <ChecklistTable rows={computed.rows} />

          <h3>Inside the protocol, and against the SAP and registry</h3>
          <FindingList findings={computed.findings} />

          <h3>Planted-error test on the real protocol</h3>
          <p>
            Caught {computed.plants.caught} of {computed.plants.planted} planted errors, with {computed.plants.falseAlarms} false alarm{computed.plants.falseAlarms === 1 ? "" : "s"} on the unedited control.
          </p>
          <ul className="stack">
            {computed.plants.cases.map((item) => (
              <li key={item.id} className={item.missed.length === 0 && item.falseAlarms.length === 0 ? "pass" : "fail"}>
                <strong>{item.label}</strong>
                <p>
                  Expected: {item.expected.join(", ") || "no flags"}. Found: {item.found.join(", ") || "nothing"}.
                  {item.missed.length ? ` Missed: ${item.missed.join(", ")}.` : ""}
                  {item.falseAlarms.length ? ` False alarms: ${item.falseAlarms.join(", ")}.` : ""}
                </p>
              </li>
            ))}
          </ul>

          <h3>What the sponsor actually amended</h3>
          <p className="fine">Read from the amendment summaries at the end of the posted protocol PDF. Shown beside the risk flags; the flags were not tuned to match them.</p>
          {computed.amendments.map((amendment) => {
            const counts = amendment.changes.reduce<Record<string, number>>((map, change) => ({ ...map, [change.category]: (map[change.category] ?? 0) + 1 }), {});
            return (
              <details key={amendment.name}>
                <summary>
                  {amendment.name} · {amendment.date} ·{" "}
                  {amendment.changes.length > 0
                    ? `${amendment.changes.length} changed sections · ${Object.entries(counts)
                        .map(([category, count]) => `${category} ${count}`)
                        .join(", ")}`
                    : `section list not posted (page ${amendment.pagesPosted} of ${amendment.pagesTotal} of this summary is in the PDF); rationale shown`}
                </summary>
                <h4>Why (PDF p. {amendment.page})</h4>
                <ul>
                  {amendment.rationale.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <h4>Sections changed</h4>
                <ul className="stack">
                  {amendment.changes.map((change, index) => (
                    <li key={`${change.section}-${index}`}>
                      <strong>{change.category}</strong>
                      <p>
                        {change.section} · PDF p. {change.page}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}

          <h3>Against {computed.peers.count} similar completed trials</h3>
          <p className="fine">{trial.peerSource}</p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Measure</th>
                <th>{publicNct}</th>
                <th>Similar trials</th>
                <th>Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {computed.peers.rows.map((row) => (
                <tr key={row.id} className={row.flag ? "flag-row" : ""}>
                  <td>
                    {row.label}
                    {row.flag ? " · flagged" : ""}
                  </td>
                  <td>{row.ours}</td>
                  <td>{row.peers}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Participant burden</h3>
          <p>
            {computed.burden.visits.length} visits in the Schedule of Activities (Table 2-1, p. {computed.burden.page}) over {computed.burden.weeks} weeks, {computed.burden.dosingVisits} with a dose. About{" "}
            {computed.burden.visitHours} hours in clinic and {computed.burden.diaryHours} hours of daily diary ({computed.burden.diaryDays} days).
          </p>
          <ul className="fine">
            {burdenAssumptions.map((item) => (
              <li key={item.id}>
                Assumption: {item.label}, {item.minutes} minutes
              </li>
            ))}
          </ul>
          <p className="fine">{computed.burden.note}</p>

          <h3>Amendment-risk areas</h3>
          <p className="fine">Each flag names its evidence. Categories follow the starter sheet’s summary of Tufts CSDD amendment research; no amendment rate is predicted.</p>
          <ul className="stack">
            {computed.spots.map((spot) => (
              <li key={spot.id}>
                <strong>{spot.category}</strong>
                <p>{spot.why}</p>
                <small>
                  Where: {spot.where}. Fix: {spot.fix} Evidence: {spot.evidence}.
                </small>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- Write Once across protocol, SAP, and registry ---------- */

const statusLabel = { same: "Same", differs: "Differs", explained: "Differs, explained", partial: "Partly stated" } as const;

export function TrialWriteOnce() {
  const state = useTrial();
  const trial = state.trial;
  const { trialProposals, addTrialProposal, decideTrialLine } = useSession();
  const [block, setBlock] = useState<TrialBlockId>("followup_weeks");
  const [value, setValue] = useState("24");
  const computed = useMemo(() => {
    if (!trial) return null;
    const blocks = trialBlocks(trial);
    return {
      rows: consistencyRows(protocolBody(trial.protocol), trial.sap.pages, trial.study),
      plants: runWritePlants(trial),
      blocks,
      assembled: assemble(valuesOf(blocks), trial),
    };
  }, [trial]);

  return (
    <section id="nct-write-once">
      <h2>Write Once on a real trial: {publicNct}</h2>
      {!trial || !computed ? (
        <Loading state={state} />
      ) : (
        <>
          <Provenance trial={trial} />
          <h3>The same fact in three documents</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fact</th>
                <th>Protocol</th>
                <th>SAP</th>
                <th>Registry</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {computed.rows.map((row) => (
                <tr key={row.id} className={row.status === "differs" ? "flag-row" : ""}>
                  <td>{row.label}</td>
                  {(["Protocol", "SAP", "Registry"] as const).map((doc) => {
                    const cell = row.values.find((item) => item.doc === doc);
                    return (
                      <td key={doc} title={cell?.quote}>
                        {cell?.value ?? "not stated"}
                        <br />
                        <small>{cell?.where}</small>
                      </td>
                    );
                  })}
                  <td>
                    <strong>{statusLabel[row.status]}</strong>
                    <br />
                    <small>{row.note}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <details>
            <summary>Show the quoted sentences</summary>
            <ul className="stack">
              {computed.rows.flatMap((row) =>
                row.values
                  .filter((cell) => cell.quote)
                  .map((cell) => (
                    <li key={`${row.id}-${cell.doc}`}>
                      <strong>
                        {row.label} · {cell.where}
                      </strong>
                      <p>“{cell.quote}”</p>
                    </li>
                  )),
              )}
            </ul>
          </details>

          <h3>Planted-error test</h3>
          <p>
            Caught {computed.plants.caught} of {computed.plants.planted} known differences, with {computed.plants.falseAlarms} false alarm{computed.plants.falseAlarms === 1 ? "" : "s"}. The real QM / Q4W wording difference counts as known in every case.
          </p>
          <ul className="stack">
            {computed.plants.cases.map((item) => (
              <li key={item.id} className={item.missed.length === 0 && item.falseAlarms.length === 0 ? "pass" : "fail"}>
                <strong>{item.label}</strong>
                <p>
                  Expected: {item.expected.join(", ")}. Found: {item.found.join(", ") || "nothing"}.
                  {item.missed.length ? ` Missed: ${item.missed.join(", ")}.` : ""}
                  {item.falseAlarms.length ? ` False alarms: ${item.falseAlarms.join(", ")}.` : ""}
                </p>
              </li>
            ))}
          </ul>

          <h3>Block library</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Block</th>
                <th>Value</th>
                <th>Owner</th>
                <th>Version</th>
                <th>Read from</th>
              </tr>
            </thead>
            <tbody>
              {computed.blocks.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.label}
                    <br />
                    <code>{item.id}</code>
                  </td>
                  <td>{item.value}</td>
                  <td>{item.owner}</td>
                  <td>{item.version}</td>
                  <td>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Documents assembled from the blocks</h3>
          <ul className="stack">
            {computed.assembled.map((item) => {
              const matches = item.compareTo ? item.compareTo.text.replace(/\s+/g, " ").includes(item.text.replace(/\s+/g, " ")) : null;
              return (
                <li key={item.id}>
                  <strong>
                    {item.document} · {item.place} · {item.owner}
                    {item.adapted ? " · adapted wording" : ""}
                  </strong>
                  <p>{item.text}</p>
                  {item.compareTo ? (
                    <small>
                      {matches ? "Matches" : "Compare with"} {item.compareTo.where}: “{item.compareTo.text}”
                    </small>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <h3>Change request</h3>
          <p className="fine">Change one block. Every assembled sentence that changes, and every protocol or SAP page that states the old value, is listed with its owner. The posted documents are never edited.</p>
          <div className="action-row">
            {trialChanges.map((change) => (
              <button
                key={change.id}
                type="button"
                className="btn on-paper"
                onClick={() => {
                  const from = computed.blocks.find((item) => item.id === change.block)!.value;
                  addTrialProposal({ block: change.block, from, to: change.to, label: change.label });
                }}
              >
                {change.label}
              </button>
            ))}
          </div>
          <div className="sheet-form">
            <select aria-label="Block to change" value={block} onChange={(event) => setBlock(event.target.value as TrialBlockId)}>
              {computed.blocks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} (now {item.value})
                </option>
              ))}
            </select>
            <input aria-label="New value" value={value} onChange={(event) => setValue(event.target.value)} />
            <button
              type="button"
              className="btn on-paper"
              disabled={!value.trim() || value.trim() === computed.blocks.find((item) => item.id === block)?.value}
              onClick={() => {
                const from = computed.blocks.find((item) => item.id === block)!.value;
                addTrialProposal({ block, from, to: value.trim(), label: changeFor(trial, block, value.trim()).label });
              }}
            >
              Propose this change
            </button>
          </div>
          {trialProposals.length === 0 ? <p className="empty">No change requests yet.</p> : null}
          {trialProposals.map((proposal, index) => {
            const lines = changeImpact(trial, changeFor(trial, proposal.block, proposal.to));
            const decided = lines.filter((line) => proposal.decisions[line.id]).length;
            return (
              <details key={proposal.id} open={index === 0}>
                <summary>
                  {proposal.id} · {proposal.label} · {lines.length} places · {decided} decided · {new Date(proposal.createdAt).toLocaleString()}
                </summary>
                <ul className="stack">
                  {lines.map((line) => (
                    <li key={line.id} className={proposal.decisions[line.id] === "accepted" ? "pass" : proposal.decisions[line.id] === "rejected" ? "fail" : ""}>
                      <strong>
                        {line.document} · {line.place} · owner: {line.owner}
                        {proposal.decisions[line.id] ? ` · ${proposal.decisions[line.id]}` : ""}
                      </strong>
                      <p>Before: “{line.before}”</p>
                      <p>{line.kind === "assembled" ? `After: “${line.after}”` : line.after}</p>
                      <div className="action-row">
                        <button type="button" className="btn on-paper" onClick={() => decideTrialLine(proposal.id, line.id, "accepted")}>
                          Accept line
                        </button>
                        <button type="button" className="btn on-paper" onClick={() => decideTrialLine(proposal.id, line.id, "rejected")}>
                          Reject line
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </>
      )}
    </section>
  );
}

/* ---------- Design brief: fill from the registry, and precedent ---------- */

export function TrialPrecedent() {
  const state = useTrial();
  const trial = state.trial;
  const { setBrief } = useSession();
  const rows = useMemo(() => (trial ? precedent(trial) : []), [trial]);
  if (!trial) return <Loading state={state} />;
  return (
    <div id="nct-precedent">
      <h3>Precedent from ClinicalTrials.gov</h3>
      <Provenance trial={trial} />
      <button type="button" className="btn on-paper" onClick={() => setBrief(briefFromRegistry(trial))}>
        Fill the brief from {publicNct}
      </button>
      <p className="fine">Fills each field from the registry record. Every M11 section above is then drafted only from those fields.</p>
      <h4>Similar completed migraine-prevention trials with posted results</h4>
      <ul className="stack">
        {rows.map((row) => (
          <li key={row.nctId}>
            <strong>
              <a href={`https://clinicaltrials.gov/study/${row.nctId}`} target="_blank" rel="noreferrer">
                {row.nctId}
              </a>{" "}
              · {row.sponsor}
            </strong>
            <p>{row.title}</p>
            <small>
              Ages {row.ages}. Primary outcome: {row.primary}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Say It Plainly: lay summary of results ---------- */

const glspSteps = ["Plan", "Write", "Review", "Share"] as const;

function blockerFor(audience: CommentTarget, comments: ReviewerComment[], holds: boolean) {
  const mine = comments.filter((comment) => comment.audience === audience);
  const approves = mine.filter((comment) => comment.stance === "approve");
  const changes = mine.filter((comment) => comment.stance === "change");
  const names = (list: ReviewerComment[]) => [...new Set(list.map((item) => item.reviewer))].join(" and ");
  if (!holds) return "A check below fails.";
  if (approves.length > 0 && changes.length > 0) return `Reviewers disagree. Approves: ${names(approves)}. Asks for a change: ${names(changes)}. Resolve it before accepting.`;
  if (changes.length > 0) return `Asks for a change: ${names(changes)}. Resolve it before accepting.`;
  return "";
}

function FactTrace({ text, facts }: { text: string; facts: LayFact[] }) {
  const trace = traceNumbers(text, facts);
  return (
    <details>
      <summary>Where each number comes from ({trace.length})</summary>
      <ul className="stack">
        {trace.map((item) => (
          <li key={item.value} className={item.facts.length ? "" : "fail"}>
            <strong>{item.value}</strong>
            <p>
              {item.facts.length
                ? item.facts.map((fact) => `${fact.label} = ${fact.value}${fact.derived ? ` (${fact.derived})` : ""} · ${fact.path}`).join(" | ")
                : "Not in the registry record. Remove it or cite it."}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function TrialLaySummary() {
  const state = useTrial();
  const trial = state.trial;
  const { layEdits, layState, layHistory, layCorrection, layHandoff, comments, setLayEdit, setLayState, setLayCorrection, setLayHandoff } = useSession();
  const [handoffNote, setHandoffNote] = useState("");
  const facts = useMemo(() => (trial ? layFacts(trial.study, trial.retrieved, layCorrection) : []), [trial, layCorrection]);
  const generated = useMemo(
    () => Object.fromEntries(layAudiences.map((audience) => [audience.id, laySummary(facts, audience.id)])) as Record<LayAudience, ReturnType<typeof laySummary>>,
    [facts],
  );
  const lab = useMemo(() => (facts.length ? runLayPlants(facts) : null), [facts]);
  if (!trial || !lab) {
    return (
      <section id="lay-summary">
        <h2>Lay summary of results: {publicNct}</h2>
        <Loading state={state} />
      </section>
    );
  }
  const textOf = (audience: LayAudience) => layEdits[audience] ?? layText(generated[audience]);
  const results = layAudiences.map((audience) => {
    const text = textOf(audience.id);
    const checks = checkLay(text, facts);
    return { audience, text, checks, holds: checks.every((check) => check.passed), ease: readability(text) };
  });
  const accepted = results.filter((item) => layState[item.audience.id] === "accepted" && item.holds);
  const reviewed = layAudiences.filter((audience) => comments.some((comment) => comment.audience === audience.id) || layState[audience.id]).length;
  const stepDone = [facts.length > 0, results.every((item) => item.text.trim()), reviewed === layAudiences.length, accepted.length > 0];
  const placebo = facts.find((fact) => fact.id === "sae-placebo");

  return (
    <section id="lay-summary">
      <h2>Lay summary of results: {publicNct}</h2>
      <Provenance trial={trial} />
      <p className="fine">
        Built only from the registry’s posted results ({facts.length} facts, each with its JSON path). The ten headings follow EU CTR 536/2014 Annex V. These are results of {publicNct}, a completed Amgen trial, not of the practice study.
      </p>
      <ol className="glsp-steps" aria-label="Good Lay Summary Practice steps">
        {glspSteps.map((step, index) => (
          <li key={step} className={stepDone[index] ? "done" : ""}>
            <strong>
              {index + 1}. {step}
            </strong>
            <span>
              {index === 0
                ? `${facts.length} facts from the record`
                : index === 1
                  ? `${results.length} drafts`
                  : index === 2
                    ? `${reviewed} of ${layAudiences.length} drafts have reviewer input`
                    : `${accepted.length} accepted and ready to share`}
            </span>
          </li>
        ))}
      </ol>

      <div className="action-row">
        {placebo ? (
          <button
            type="button"
            className="btn on-paper"
            onClick={() =>
              setLayCorrection(
                layCorrection ? null : { path: placebo.path, label: placebo.label, from: placebo.value, to: String(Number(placebo.value) + 1) },
                layCorrection ? "Practice correction removed; back to the record as posted" : `Practice correction: ${placebo.label} ${placebo.value} → ${Number(placebo.value) + 1}`,
                Object.fromEntries(layAudiences.map((audience) => [audience.id, textOf(audience.id)])),
              )
            }
          >
            {layCorrection ? "Remove the practice correction" : "Apply a practice registry correction and regenerate"}
          </button>
        ) : null}
        <button
          type="button"
          className="btn on-paper"
          disabled={accepted.length === 0}
          onClick={() =>
            download(
              `${publicNct}-lay-summaries.md`,
              accepted
                .map((item) => {
                  const heading = `# ${item.audience.label} (${item.audience.language === "es" ? "machine-written Spanish, not reviewed by a qualified translator" : "English"})\n\nSource: ClinicalTrials.gov ${publicNct}, retrieved ${day(trial.retrieved)}. Headings: EU CTR 536/2014 Annex V.`;
                  const body = layEdits[item.audience.id] ?? generated[item.audience.id].map((section) => `## ${section.element}\n\n${section.text}`).join("\n\n");
                  return `${heading}\n\n${body}`;
                })
                .join("\n\n---\n\n"),
              "text/markdown",
            )
          }
        >
          Export accepted summaries ({accepted.length})
        </button>
      </div>
      {layCorrection ? <p className="notice">Practice correction applied: {layCorrection.label} {layCorrection.from} → {layCorrection.to}. This is not the posted record. Accepted drafts were marked stale.</p> : null}

      <div className="lay-grid">
        {results.map(({ audience, text, checks, holds, ease }) => {
          const blocker = blockerFor(audience.id, comments, holds);
          const status = layState[audience.id] ?? "draft";
          return (
            <article key={audience.id} className="fact lay-card" lang={audience.language}>
              <header>
                <h3>{audience.label}</h3>
                <p className="flag">{status}</p>
              </header>
              <p className="fine" lang="en">
                {audience.reader}. Annex V headings covered: {new Set(generated[audience.id].map((section) => section.id)).size} of {annexElements.length}. Reading Ease {ease.readingEase}
                {audience.language === "es" ? " (English formula; a Spanish formula such as Fernández-Huerta would differ)" : `, grade ${ease.grade}`}.
              </p>
              {audience.language === "es" ? <p className="notice">Traducción automática, no revisada. Un traductor médico calificado debe revisarla.</p> : null}
              {layEdits[audience.id] === undefined ? (
                <div className="lay-sections">
                  {generated[audience.id].map((section) => (
                    <div key={section.id}>
                      <h4>{section.element}</h4>
                      <p>{section.text}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              <details lang="en">
                <summary>{layEdits[audience.id] === undefined ? "Edit this draft" : "Edited draft"}</summary>
                <textarea rows={10} aria-label={`${audience.label} draft`} value={text} onChange={(event) => setLayEdit(audience.id, event.target.value)} />
                {layEdits[audience.id] !== undefined ? (
                  <button type="button" className="text-button" onClick={() => setLayEdit(audience.id, null)}>
                    Discard edits
                  </button>
                ) : null}
              </details>
              <ul className="plain-list" lang="en">
                {checks.map((check) => (
                  <li key={check.id}>
                    {check.label}: {check.note}
                    <span>{check.passed ? "Holds" : "Check"}</span>
                  </li>
                ))}
              </ul>
              <div lang="en">
                <FactTrace text={text} facts={facts} />
                <Comments audience={audience.id} />
                {blocker ? <p className="notice">{blocker}</p> : null}
                <div className="action-row">
                  <button type="button" className="btn on-paper" disabled={!holds} onClick={() => setLayState(audience.id, "in-review")}>
                    Send to review
                  </button>
                  <button type="button" className="btn solid dark" disabled={Boolean(blocker)} onClick={() => setLayState(audience.id, "accepted")}>
                    Accept
                  </button>
                  <button type="button" className="btn on-paper" onClick={() => setLayState(audience.id, "rejected")}>
                    Reject
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <details>
        <summary>Version history ({layHistory.length})</summary>
        <ul className="stack">
          {layHistory.length === 0 ? <li>No earlier drafts yet.</li> : null}
          {layHistory.map((item) => (
            <li key={item.id}>
              <strong>
                {item.audience} · was {item.state} · {new Date(item.at).toLocaleString()}
              </strong>
              <small>{item.reason}</small>
              <details>
                <summary>Show text</summary>
                <p>{item.text}</p>
              </details>
            </li>
          ))}
        </ul>
      </details>

      <h3>Spanish translation handoff</h3>
      {layHandoff ? (
        <>
          <p>
            Spanish draft marked ready for a {layHandoff.language} translation reviewer on {new Date(layHandoff.at).toLocaleString()}.
            {layHandoff.note ? ` Note: ${layHandoff.note}` : ""}
          </p>
          <button type="button" className="btn on-paper" onClick={() => setLayHandoff(null)}>
            Withdraw handoff
          </button>
        </>
      ) : (
        <div className="sheet-form">
          <input aria-label="Note for the translation reviewer" value={handoffNote} onChange={(event) => setHandoffNote(event.target.value)} placeholder="Note for the reviewer" />
          <button type="button" className="btn on-paper" onClick={() => setLayHandoff({ language: "Spanish", at: new Date().toISOString(), note: handoffNote.trim() })}>
            Send the Spanish draft to a translation reviewer
          </button>
        </div>
      )}

      <h3>Planted-error test</h3>
      <p>
        Caught {lab.caught} of {lab.planted} planted errors in the adult summary, with {lab.falseAlarms} false alarm{lab.falseAlarms === 1 ? "" : "s"} on the unedited control.
      </p>
      <ul className="stack">
        {lab.results.map((item) => (
          <li key={item.id} className={item.caught ? "pass" : "fail"}>
            <strong>
              {item.label} · {item.caught ? (item.expect ? "caught" : "passed clean") : item.expect ? "missed" : "false alarm"}
            </strong>
            <small>{item.failed.map((check) => check.note).join(" ") || "No check failed."}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Numbers for the Overview cards, computed from the same files. */
export function useTrialSummary() {
  const { trial } = useTrial();
  return useMemo(() => {
    if (!trial) return null;
    const rows = trialChecklist(trial);
    const facts = layFacts(trial.study, trial.retrieved);
    const consistency = consistencyRows(protocolBody(trial.protocol), trial.sap.pages, trial.study);
    return {
      pages: trial.protocol.pages.length,
      bodyPages: cleanPages(protocolBody(trial.protocol)).length,
      score: coverageScore(rows),
      plants: runTrialPlants(trial),
      amendments: amendmentHistory(trial.protocol),
      writePlants: runWritePlants(trial),
      differs: consistency.filter((row) => row.status === "differs").length,
      rows: consistency.length,
      lay: runLayPlants(facts),
      facts: facts.length,
      peers: trial.peers.length,
      retrieved: trial.retrieved,
    };
  }, [trial]);
}
