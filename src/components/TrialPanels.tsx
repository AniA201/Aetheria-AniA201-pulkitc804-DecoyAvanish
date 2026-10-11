// Starter-sheet work on one real public trial, NCT03238781 (Amgen AMG 301, migraine prevention).
// Everything here is computed from the files saved under public/trials/NCT03238781/.
import { useEffect, useMemo, useState } from "react";
import { languageInfo, type Language } from "../lib/languages";
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
import { useR } from "../lib/researchI18n";
import { useSession } from "../state/Session";
import { blockerFor, ChecklistTable, Comments, download, FindingList, PlantedCases } from "./SheetPanels";

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

function useDay() {
  const r = useR();
  return (iso: string) => new Date(iso).toLocaleDateString(r.locale, { year: "numeric", month: "long", day: "numeric" });
}

function Provenance({ trial }: { trial: TrialData }) {
  const r = useR();
  const day = useDay();
  return (
    <p className="fine">
      {r.trial.retrieved(day(trial.retrieved), trial.protocol.pages.length, trial.sap.pages.length)}{" "}
      <a href={`https://clinicaltrials.gov/study/${trial.nctId}`} target="_blank" rel="noreferrer">
        ClinicalTrials.gov
      </a>
    </p>
  );
}

function Loading({ state }: { state: TrialState }) {
  const r = useR();
  return state.error ? <p className="notice">{r.trial.error(state.error)}</p> : <p className="fine">{r.trial.loading}</p>;
}

/* ---------- Protocol Pre-Flight on the real protocol ---------- */

export function TrialPreFlight() {
  const r = useR();
  const t = r.trial;
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
      <h2>{t.preflight}</h2>
      {!trial || !computed ? (
        <Loading state={state} />
      ) : (
        <>
          <p lang="en">{trial.study.protocolSection.identificationModule.officialTitle}</p>
          <p className="fine">{t.dated(computed.meta.documentId ?? "", computed.meta.version ?? "", computed.meta.date ?? "")}</p>
          <Provenance trial={trial} />

          <article className="fact">
            <h3>{r.preflight.coverage(computed.score.value)}</h3>
            <p>{r.preflight.formula(computed.score.present, computed.score.thin, computed.score.total, computed.score.value)}</p>
            <p className="fine">{r.preflight.notApproval}</p>
          </article>
          <ChecklistTable rows={computed.rows} />

          <h3>{t.against}</h3>
          <FindingList findings={computed.findings} />

          <h3>{r.plantedTitle}</h3>
          <p>{r.planted(computed.plants.caught, computed.plants.planted, computed.plants.falseAlarms)}</p>
          <PlantedCases cases={computed.plants.cases} withExpected />

          <h3>{t.amended}</h3>
          {computed.amendments.map((amendment) => {
            const counts = amendment.changes.reduce<Record<string, number>>((map, change) => ({ ...map, [change.category]: (map[change.category] ?? 0) + 1 }), {});
            return (
              <details key={amendment.name}>
                <summary>
                  {amendment.name} · {amendment.date} ·{" "}
                  {amendment.changes.length > 0
                    ? t.changed(
                        amendment.changes.length,
                        Object.entries(counts)
                          .map(([category, count]) => `${category} ${count}`)
                          .join(", "),
                      )
                    : t.notPosted(amendment.pagesPosted, amendment.pagesTotal)}
                </summary>
                <h4>{t.why(amendment.page)}</h4>
                <ul lang="en">
                  {amendment.rationale.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <h4>{t.sections}</h4>
                <ul className="stack">
                  {amendment.changes.map((change, index) => (
                    <li key={`${change.section}-${index}`}>
                      <strong lang="en">{change.category}</strong>
                      <p>
                        <span lang="en">{change.section}</span> · {t.page(change.page)}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}

          <h3>{t.peers(computed.peers.count)}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.measure}</th>
                <th>{publicNct}</th>
                <th>{t.similar}</th>
                <th>{t.matters}</th>
              </tr>
            </thead>
            <tbody lang="en">
              {computed.peers.rows.map((row) => (
                <tr key={row.id} className={row.flag ? "flag-row" : ""}>
                  <td>
                    {row.label}
                    {row.flag ? ` · ${t.flagged}` : ""}
                  </td>
                  <td>{row.ours}</td>
                  <td>{row.peers}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>{t.burden}</h3>
          <p>
            {t.burdenLine(
              computed.burden.visits.length,
              computed.burden.page,
              computed.burden.weeks,
              computed.burden.dosingVisits,
              computed.burden.visitHours,
              computed.burden.diaryHours,
              computed.burden.diaryDays,
            )}
          </p>
          <ul className="fine">
            {burdenAssumptions.map((item) => (
              <li key={item.id}>{t.assumption(item.label, item.minutes)}</li>
            ))}
          </ul>

          <h3>{r.preflight.risks}</h3>
          <ul className="stack">
            {computed.spots.map((spot) => (
              <li key={spot.id}>
                <strong lang="en">{spot.category}</strong>
                <p lang="en">{spot.why}</p>
                <small>
                  {r.where}{r.colon}<span lang="en">{spot.where}</span>. {r.fix}{r.colon}<span lang="en">{spot.fix}</span> {r.evidence}{r.colon}<span lang="en">{spot.evidence}</span>.
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

export function TrialWriteOnce() {
  const r = useR();
  const t = r.trial;
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
      <h2>{t.writeOnce}</h2>
      {!trial || !computed ? (
        <Loading state={state} />
      ) : (
        <>
          <Provenance trial={trial} />
          <h3>{t.oneFact}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.fact}</th>
                <th>{t.protocol}</th>
                <th>{t.sap}</th>
                <th>{t.registry}</th>
                <th>{t.result}</th>
              </tr>
            </thead>
            <tbody>
              {computed.rows.map((row) => (
                <tr key={row.id} className={row.status === "differs" ? "flag-row" : ""}>
                  <td lang="en">{row.label}</td>
                  {(["Protocol", "SAP", "Registry"] as const).map((doc) => {
                    const cell = row.values.find((item) => item.doc === doc);
                    return (
                      <td key={doc} title={cell?.quote} lang="en">
                        {cell?.value ?? t.notStated}
                        <br />
                        <small>{cell?.where}</small>
                      </td>
                    );
                  })}
                  <td>
                    <strong>{t.status[row.status]}</strong>
                    <br />
                    <small lang="en">{row.note}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <details>
            <summary>{t.quotes}</summary>
            <ul className="stack" lang="en">
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

          <h3>{r.plantedTitle}</h3>
          <p>
            {r.planted(computed.plants.caught, computed.plants.planted, computed.plants.falseAlarms)} {t.qm}
          </p>
          <PlantedCases cases={computed.plants.cases} withExpected />

          <h3>{t.library}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.block}</th>
                <th>{t.value}</th>
                <th>{t.owner}</th>
                <th>{t.version}</th>
                <th>{t.readFrom}</th>
              </tr>
            </thead>
            <tbody lang="en">
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

          <h3>{t.assembled}</h3>
          <ul className="stack">
            {computed.assembled.map((item) => {
              const matches = item.compareTo ? item.compareTo.text.replace(/\s+/g, " ").includes(item.text.replace(/\s+/g, " ")) : null;
              return (
                <li key={item.id}>
                  <strong>
                    <span lang="en">
                      {item.document} · {item.place} · {item.owner}
                    </span>
                    {item.adapted ? ` · ${t.adapted}` : ""}
                  </strong>
                  <p lang="en">{item.text}</p>
                  {item.compareTo ? (
                    <small>
                      {matches ? t.matches(item.compareTo.where) : t.compare(item.compareTo.where)}{r.colon}<span lang="en">“{item.compareTo.text}”</span>
                    </small>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <h3>{t.change}</h3>
          <p className="fine">{t.changeNote}</p>
          <div className="action-row">
            {trialChanges.map((change) => (
              <button
                key={change.id}
                type="button"
                className="btn on-paper"
                lang="en"
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
            <select aria-label={t.blockToChange} value={block} onChange={(event) => setBlock(event.target.value as TrialBlockId)}>
              {computed.blocks.map((item) => (
                <option key={item.id} value={item.id}>
                  {t.now(item.label, item.value)}
                </option>
              ))}
            </select>
            <input aria-label={t.newValue} value={value} onChange={(event) => setValue(event.target.value)} />
            <button
              type="button"
              className="btn on-paper"
              disabled={!value.trim() || value.trim() === computed.blocks.find((item) => item.id === block)?.value}
              onClick={() => {
                const from = computed.blocks.find((item) => item.id === block)!.value;
                addTrialProposal({ block, from, to: value.trim(), label: changeFor(trial, block, value.trim()).label });
              }}
            >
              {t.proposeThis}
            </button>
          </div>
          {trialProposals.length === 0 ? <p className="empty">{t.none}</p> : null}
          {trialProposals.map((proposal, index) => {
            const lines = changeImpact(trial, changeFor(trial, proposal.block, proposal.to));
            const decided = lines.filter((line) => proposal.decisions[line.id]).length;
            return (
              <details key={proposal.id} open={index === 0}>
                <summary>
                  {proposal.id} · <span lang="en">{proposal.label}</span> · {t.places(lines.length, decided)} · {new Date(proposal.createdAt).toLocaleString(r.locale)}
                </summary>
                <ul className="stack">
                  {lines.map((line) => {
                    const decision = proposal.decisions[line.id];
                    return (
                      <li key={line.id} className={decision === "accepted" ? "pass" : decision === "rejected" ? "fail" : ""}>
                        <strong>
                          <span lang="en">
                            {line.document} · {line.place}
                          </span>{" "}
                          · {t.ownerIs(line.owner)}
                          {decision ? ` · ${r.states[decision]}` : ""}
                        </strong>
                        <p>
                          {t.before}{r.colon}<span lang="en">“{line.before}”</span>
                        </p>
                        <p>
                          {line.kind === "assembled" ? (
                            <>
                              {t.after}{r.colon}<span lang="en">“{line.after}”</span>
                            </>
                          ) : (
                            <span lang="en">{line.after}</span>
                          )}
                        </p>
                        <div className="action-row">
                          <button type="button" className="btn on-paper" onClick={() => decideTrialLine(proposal.id, line.id, "accepted")}>
                            {r.writeOnce.acceptLine}
                          </button>
                          <button type="button" className="btn on-paper" onClick={() => decideTrialLine(proposal.id, line.id, "rejected")}>
                            {r.writeOnce.rejectLine}
                          </button>
                        </div>
                      </li>
                    );
                  })}
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
  const r = useR();
  const t = r.trial;
  const state = useTrial();
  const trial = state.trial;
  const { setBrief } = useSession();
  const rows = useMemo(() => (trial ? precedent(trial) : []), [trial]);
  if (!trial) return <Loading state={state} />;
  return (
    <div id="nct-precedent">
      <h3>{t.precedent}</h3>
      <Provenance trial={trial} />
      <button type="button" className="btn on-paper" onClick={() => setBrief(briefFromRegistry(trial))}>
        {t.fill}
      </button>
      <h4>{t.similarTrials}</h4>
      <ul className="stack">
        {rows.map((row) => (
          <li key={row.nctId}>
            <strong>
              <a href={`https://clinicaltrials.gov/study/${row.nctId}`} target="_blank" rel="noreferrer">
                {row.nctId}
              </a>{" "}
              · {row.sponsor}
            </strong>
            <p lang="en">{row.title}</p>
            <small>{t.ages(row.ages, row.primary)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Say It Plainly: lay summary of results ---------- */

const draftNotice: Record<Exclude<Language, "en">, string> = {
  es: "Traducción automática, no revisada. Un traductor médico calificado debe revisarla.",
  fr: "Traduction automatique, non révisée. Un traducteur médical qualifié doit la relire.",
  zh: "机器翻译，未经审核。须由合格的医学译员审核。",
};

const draftLanguageName: Record<Exclude<Language, "en">, string> = { es: "Spanish", fr: "French", zh: "Mandarin Chinese" };

function FactTrace({ text, facts }: { text: string; facts: LayFact[] }) {
  const r = useR();
  const trace = traceNumbers(text, facts);
  return (
    <details>
      <summary>{r.lay.trace(trace.length)}</summary>
      <ul className="stack">
        {trace.map((item) => (
          <li key={item.value} className={item.facts.length ? "" : "fail"}>
            <strong>{item.value}</strong>
            <p lang={item.facts.length ? "en" : undefined}>
              {item.facts.length
                ? item.facts.map((fact) => `${fact.label} = ${fact.value}${fact.derived ? ` (${fact.derived})` : ""} · ${fact.path}`).join(" | ")
                : r.lay.notInRecord}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function TrialLaySummary() {
  const r = useR();
  const l = r.lay;
  const state = useTrial();
  const trial = state.trial;
  const { layEdits, layState, layHistory, layCorrection, layHandoff, comments, setLayEdit, setLayState, setLayCorrection, setLayHandoff } = useSession();
  const [handoffNote, setHandoffNote] = useState("");
  const [handoffDraft, setHandoffDraft] = useState<Exclude<Language, "en">>("es");
  const facts = useMemo(() => (trial ? layFacts(trial.study, trial.retrieved, layCorrection) : []), [trial, layCorrection]);
  const generated = useMemo(
    () => Object.fromEntries(layAudiences.map((audience) => [audience.id, laySummary(facts, audience.id)])) as Record<LayAudience, ReturnType<typeof laySummary>>,
    [facts],
  );
  const lab = useMemo(() => (facts.length ? runLayPlants(facts) : null), [facts]);
  if (!trial || !lab) {
    return (
      <section id="lay-summary">
        <h2>{l.title}</h2>
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
  const stepText = [l.stepFacts(facts.length), l.stepDrafts(results.length), l.stepReviewed(reviewed, layAudiences.length), l.stepShared(accepted.length)];
  const placebo = facts.find((fact) => fact.id === "sae-placebo");
  const when = (iso: string) => new Date(iso).toLocaleString(r.locale);

  return (
    <section id="lay-summary">
      <h2>{l.title}</h2>
      <Provenance trial={trial} />
      <p className="fine">{l.note(facts.length)}</p>
      <ol className="glsp-steps" aria-label="Good Lay Summary Practice">
        {l.steps.map((step, index) => (
          <li key={step} className={stepDone[index] ? "done" : ""}>
            <strong>
              {index + 1}. {step}
            </strong>
            <span>{stepText[index]}</span>
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
            {layCorrection ? l.remove : l.apply}
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
                  const language = item.audience.language;
                  const heading = `# ${item.audience.label} (${language === "en" ? "English" : `machine-written ${draftLanguageName[language]}, not reviewed by a qualified translator`})\n\nSource: ClinicalTrials.gov ${publicNct}, retrieved ${trial.retrieved.slice(0, 10)}. Headings: EU CTR 536/2014 Annex V.`;
                  const body = layEdits[item.audience.id] ?? generated[item.audience.id].map((section) => `## ${section.element}\n\n${section.text}`).join("\n\n");
                  return `${heading}\n\n${body}`;
                })
                .join("\n\n---\n\n"),
              "text/markdown",
            )
          }
        >
          {l.export(accepted.length)}
        </button>
      </div>
      {layCorrection ? <p className="notice">{l.correction(layCorrection.label, layCorrection.from, layCorrection.to)}</p> : null}

      <div className="lay-grid">
        {results.map(({ audience, text, checks, holds, ease }) => {
          const blocker = blockerFor(r, comments.filter((comment) => comment.audience === audience.id), holds);
          const status = layState[audience.id] ?? "draft";
          const language = audience.language;
          return (
            <article key={audience.id} className="fact lay-card" lang={languageInfo[language].html}>
              <header>
                <h3 lang={r.locale}>{l.audiences[audience.id]}</h3>
                <p className="flag" lang={r.locale}>
                  {r.states[status]}
                </p>
              </header>
              <p className="fine" lang={r.locale}>
                {[l.readers[audience.id], l.annex(new Set(generated[audience.id].map((section) => section.id)).size, annexElements.length), language === "en" ? l.ease(ease.readingEase, ease.grade) : l.easeOther].join(r.stop)}
                {r.stop.trim()}
              </p>
              {language !== "en" ? <p className="notice">{draftNotice[language]}</p> : null}
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
              <details lang={r.locale}>
                <summary>{layEdits[audience.id] === undefined ? l.edit : l.edited}</summary>
                <textarea
                  rows={10}
                  aria-label={l.audiences[audience.id]}
                  lang={languageInfo[language].html}
                  value={text}
                  onChange={(event) => setLayEdit(audience.id, event.target.value)}
                />
                {layEdits[audience.id] !== undefined ? (
                  <button type="button" className="text-button" onClick={() => setLayEdit(audience.id, null)}>
                    {l.discard}
                  </button>
                ) : null}
              </details>
              <ul className="plain-list" lang={r.locale}>
                {checks.map((check) => (
                  <li key={check.id}>
                    <span lang="en">
                      {check.label}: {check.note}
                    </span>
                    <span>{check.passed ? r.holds : r.check}</span>
                  </li>
                ))}
              </ul>
              <div lang={r.locale}>
                <FactTrace text={text} facts={facts} />
                <Comments audience={audience.id} />
                {blocker ? <p className="notice">{blocker}</p> : null}
                <div className="action-row">
                  <button type="button" className="btn on-paper" disabled={!holds} onClick={() => setLayState(audience.id, "in-review")}>
                    {r.sendReview}
                  </button>
                  <button type="button" className="btn solid dark" disabled={Boolean(blocker)} onClick={() => setLayState(audience.id, "accepted")}>
                    {r.accept}
                  </button>
                  <button type="button" className="btn on-paper" onClick={() => setLayState(audience.id, "rejected")}>
                    {r.reject}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <details>
        <summary>{r.history(layHistory.length)}</summary>
        <ul className="stack">
          {layHistory.length === 0 ? <li>{r.noHistory}</li> : null}
          {layHistory.map((item) => (
            <li key={item.id}>
              <strong>
                {l.audiences[item.audience] ?? item.audience} · {r.was(r.states[item.state], when(item.at))}
              </strong>
              <small lang="en">{item.reason}</small>
              <details>
                <summary>{l.showText}</summary>
                <p>{item.text}</p>
              </details>
            </li>
          ))}
        </ul>
      </details>

      <h3>{l.handoff}</h3>
      {layHandoff ? (
        <>
          <p>
            {l.sentFor(r.handoffLanguages[layHandoff.language] ?? layHandoff.language, when(layHandoff.at))}
            {layHandoff.note ? r.note(layHandoff.note) : ""}
          </p>
          <button type="button" className="btn on-paper" onClick={() => setLayHandoff(null)}>
            {r.withdraw}
          </button>
        </>
      ) : (
        <div className="sheet-form">
          <select aria-label={l.draft} value={handoffDraft} onChange={(event) => setHandoffDraft(event.target.value as Exclude<Language, "en">)}>
            {(["es", "fr", "zh"] as const).map((code) => (
              <option key={code} value={code}>
                {l.audiences[`lay-${code}`]}
              </option>
            ))}
          </select>
          <input aria-label={r.notePlaceholder} value={handoffNote} onChange={(event) => setHandoffNote(event.target.value)} placeholder={r.notePlaceholder} />
          <button
            type="button"
            className="btn on-paper"
            onClick={() => setLayHandoff({ language: draftLanguageName[handoffDraft], at: new Date().toISOString(), note: handoffNote.trim() })}
          >
            {l.send}
          </button>
        </div>
      )}

      <h3>{r.plantedTitle}</h3>
      <p>
        {r.planted(lab.caught, lab.planted, lab.falseAlarms)} {l.plantedNote}
      </p>
      <ul className="stack">
        {lab.results.map((item) => (
          <li key={item.id} className={item.caught ? "pass" : "fail"}>
            <strong>
              <span lang="en">{item.label}</span> ·{" "}
              {item.caught ? (item.expect ? r.plantStatus.caught : r.plantStatus.clean) : item.expect ? r.plantStatus.missed : r.plantStatus.falseAlarm}
            </strong>
            <small lang="en">{item.failed.map((check) => check.note).join(" ") || r.noCheckFailed}</small>
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
