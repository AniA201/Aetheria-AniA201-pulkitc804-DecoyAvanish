import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Fold } from "./Disclosure";
import { parseDocument } from "../data/documents";
import { personaFixtures, teachPrompts } from "../data/study";
import { blocks, blocksIn, extractValues, proposeChange, registryFields, render, sourceText, uses, type BlockId } from "../lib/blocks";
import { draftFromBrief, usdmShape, type Brief } from "../lib/brief";
import { consentElements } from "../lib/elements";
import { loadHandoffs, sendHandoffMessage, type StoredHandoff } from "../lib/handoff";
import { isLanguage, type Language } from "../lib/languages";
import { layAudiences } from "../lib/laySummary";
import { extractPdfText } from "../lib/pdf";
import { checkDraft, readability, runPlantedDrafts, traceFigures } from "../lib/plainLab";
import {
  burden,
  coverageScore,
  crossChecks,
  hotspots,
  internalChecks,
  practiceProtocol,
  runChecklist,
  runPlantedCases,
  sectionsFromText,
  type ChecklistResult,
  type Finding,
  type ProtocolMeta,
  type ProtocolSection,
} from "../lib/protocolCheck";
import { useR, type ResearchStrings } from "../lib/researchI18n";
import { assessTeachback } from "../lib/teachback";
import { readingSource, versionNote } from "../lib/workbook";
import { FillBrief, TrialPrecedent, useTrialSummary } from "./TrialPanels";
import { useSession, type CommentTarget, type ReviewerComment } from "../state/Session";

export function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function VersionStanding({ version, language = "en" }: { version: string; language?: Language }) {
  const { approvedVersions } = useSession();
  return <p className="fine">{versionNote(version, approvedVersions, language)}</p>;
}

const gateText: Record<Language, { heading: string; lede: (version: string) => string; fine: string }> = {
  en: {
    heading: "This form is not on the approved list.",
    lede: (version) =>
      `The research team entered a list of approved versions, and ${version} is not on it. Reading, asking, and checking are paused for this file so an outdated form is not used.`,
    fine: "Ask the study coordinator for the current form. This app does not decide which version is approved; a person entered the list.",
  },
  es: {
    heading: "Este formulario no está en la lista aprobada.",
    lede: (version) =>
      `El equipo de investigación ingresó una lista de versiones aprobadas, y ${version} no está en ella. Leer, preguntar y comprobar están en pausa para este archivo, para no usar un formulario desactualizado.`,
    fine: "Pida el formulario actual al coordinador del estudio. Esta aplicación no decide qué versión está aprobada; una persona ingresó la lista.",
  },
  fr: {
    heading: "Ce formulaire ne figure pas sur la liste approuvée.",
    lede: (version) =>
      `L'équipe de recherche a saisi une liste de versions approuvées, et ${version} n'y figure pas. Lire, demander et vérifier sont suspendus pour ce fichier, afin de ne pas utiliser un formulaire périmé.`,
    fine: "Demandez le formulaire actuel au coordinateur de l'étude. Cette application ne décide pas quelle version est approuvée ; une personne a saisi la liste.",
  },
  zh: {
    heading: "这份表格不在已批准的清单上。",
    lede: (version) => `研究团队输入了已批准版本的清单，${version} 不在其中。为避免使用过时的表格，这个文件的阅读、提问和检查功能已暂停。`,
    fine: "请向研究协调员索取当前的表格。本应用不决定哪个版本已获批准；清单是由工作人员输入的。",
  },
};

export function VersionGate({ version, title, language = "en" }: { version: string; title: string; language?: Language }) {
  const words = gateText[language];
  return (
    <div className="page">
      <p className="kicker">{title}</p>
      <h1>{words.heading}</h1>
      <p className="lede dark">{words.lede(version)}</p>
      <p className="fine">{words.fine}</p>
    </div>
  );
}

/** Names reviewers in the reader's language, joined with "and". */
export function blockerFor(r: ResearchStrings, comments: ReviewerComment[], holds: boolean) {
  const approves = comments.filter((comment) => comment.stance === "approve");
  const changes = comments.filter((comment) => comment.stance === "change");
  const names = (list: ReviewerComment[]) => [...new Set(list.map((item) => r.comments.people[item.reviewer] ?? item.reviewer))].join(r.blockers.and);
  if (!holds) return r.blockers.fails;
  if (approves.length > 0 && changes.length > 0) return r.blockers.disagree(names(approves), names(changes));
  if (changes.length > 0) return r.blockers.asks(names(changes));
  return "";
}

/* ---------- Overview ---------- */

export function StarterSheets() {
  const r = useR();
  const t = r.sheets;
  const values = extractValues();
  const bound = uses.filter((use) => sourceText(use) !== null);
  const matching = bound.filter((use) => sourceText(use)!.includes(render(use.template, use.side, values))).length;
  const { sections, meta } = practiceProtocol();
  const score = coverageScore(runChecklist(sections, meta));
  const planted = runPlantedCases();
  const lab = runPlantedDrafts();
  const personas = personaFixtures.filter(
    (fixture) => assessTeachback(fixture.promptId, fixture.response, teachPrompts, fixture.speaker).label === fixture.expect,
  ).length;
  const real = useTrialSummary();
  const cards = [
    {
      name: "Check what participants understood",
      lines: [t.tbQuestions(teachPrompts.length), t.tbPersonas(personas, personaFixtures.length)],
      links: [{ to: "/researcher/insights#handoffs", label: t.handoffs }],
    },
    {
      name: "Rewrite the consent text",
      lines: [
        real ? t.spLay(real.facts, layAudiences.length) : t.loading,
        real ? `${t.real}${t.plantedShort(real.lay.caught, real.lay.planted, real.lay.falseAlarms)}` : t.loading,
        `${t.practice}${t.plantedShort(lab.caught, lab.planted, lab.falseAlarms)}`,
      ],
      links: [{ to: "/researcher/plain-language#lay", label: t.laySummaries }],
    },
    {
      name: "Compare shared figures",
      lines: [
        real ? t.woFacts(real.rows, real.differs) : t.loading,
        real ? `${t.real}${t.plantedShort(real.writePlants.caught, real.writePlants.planted, real.writePlants.falseAlarms)}` : t.loading,
        t.woPractice(blocks.length, matching, bound.length),
      ],
      links: [{ to: "/researcher/document-integrity#writeonce", label: t.woReal }],
    },
    {
      name: "Check the protocol",
      lines: [
        real ? t.pfScore(real.pages, real.score.value, real.score.total) : t.loading,
        real ? `${t.real}${t.plantedShort(real.plants.caught, real.plants.planted, real.plants.falseAlarms)}` : t.loading,
        t.pfPractice(score.value, planted.caught, planted.planted),
      ],
      links: [
        { to: "/researcher/document-integrity#preflight", label: t.pfReal },
        { to: "/researcher/document-integrity#brief", label: t.pfBrief },
      ],
    },
  ];

  return (
    <section className="sheet-cards" aria-label={t.title}>
      <h2>{t.title}</h2>
      <div className="sheet-card-grid">
        {cards.map((card) => (
          <article key={card.name} className="fact">
            <h3 lang="en">{card.name}</h3>
            <ul>
              {card.lines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
            <div className="action-row">
              {card.links.map((link) => (
                <Link key={link.to} className="btn on-paper" to={link.to}>
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Write Once ---------- */

function BlockLibrary() {
  const r = useR();
  const w = r.writeOnce;
  const values = extractValues();
  return (
    <section id="write-once">
      <h3>{w.blocks}</h3>
      {blocks.map((block) => {
        const value = values[block.id];
        const agrees = value.protocol === value.consent;
        return (
          <Fold key={block.id} title={<span lang="en">{block.label}</span>} meta={`${w.values(value.protocol, value.consent, block.unit)} · ${agrees ? w.same : w.differ}`}>
            <ul className="stack">
              {uses
                .filter((use) => blocksIn(use.template).includes(block.id))
                .map((use) => {
                  const text = render(use.template, use.side, values);
                  const stored = sourceText(use);
                  return (
                    <li key={use.id}>
                      <strong lang="en">{use.place}</strong>
                      <p lang="en">{text}</p>
                      <small>{stored === null ? w.generated(use.owner) : stored.includes(text) ? w.matches(use.owner) : w.mismatch(use.owner)}</small>
                    </li>
                  );
                })}
            </ul>
          </Fold>
        );
      })}
    </section>
  );
}

function ProposeChange() {
  const r = useR();
  const w = r.writeOnce;
  const { proposals, addProposal, decideLine } = useSession();
  const values = extractValues();
  const [blockId, setBlockId] = useState<BlockId>("visits");
  const [next, setNext] = useState("7");
  const block = blocks.find((item) => item.id === blockId)!;
  const current = values[blockId];
  const clean = next.trim();
  const problem = !/^\d{1,4}$/.test(clean) ? w.whole : clean === current.protocol && clean === current.consent ? w.already : "";

  return (
    <section>
      <h3>{w.propose}</h3>
      <div className="sheet-form">
        <label htmlFor="block-pick">{w.block}</label>
        <select id="block-pick" value={blockId} onChange={(event) => setBlockId(event.target.value as BlockId)}>
          {blocks.map((item) => (
            <option key={item.id} value={item.id}>
              {w.option(item.label, values[item.id].protocol, values[item.id].consent)}
            </option>
          ))}
        </select>
        <label htmlFor="block-value">{w.newValue(block.unit)}</label>
        <input id="block-value" inputMode="numeric" value={next} onChange={(event) => setNext(event.target.value)} />
        <button
          type="button"
          className="btn solid dark"
          disabled={Boolean(problem)}
          onClick={() => addProposal(blockId, `protocol ${current.protocol} · consent ${current.consent}`, clean)}
        >
          {w.submit}
        </button>
        {problem ? <p className="fine">{problem}</p> : null}
      </div>

      <h4>{w.history}</h4>
      <ol className="stack">
        {proposals.map((proposal) => {
          const label = blocks.find((item) => item.id === proposal.blockId)?.label ?? proposal.blockId;
          const lines = proposeChange(proposal.blockId, proposal.to, values);
          const decided = lines.filter((line) => proposal.decisions[line.id]).length;
          const redline = [
            `Proposed redline ${proposal.id}: ${label}, ${proposal.from} → ${proposal.to}`,
            "Practice proposal. The source files were not edited. Not an approval.",
            "",
            ...lines.flatMap((line) => [
              `${line.place} (routed to ${line.owner}) · ${proposal.decisions[line.id] ?? "undecided"}`,
              `- ${line.before}`,
              `+ ${line.after}`,
              ...line.warnings.map((warning) => `! ${warning}`),
              "",
            ]),
          ].join("\n");
          return (
            <li key={proposal.id}>
              <details open={proposal === proposals[0]}>
                <summary>
                  {proposal.id}: {label} {proposal.from} → {proposal.to} · {w.decided(decided, lines.length)}
                </summary>
                {lines.map((line) => (
                  <article key={line.id} className={line.warnings.length > 0 ? "fact flagged" : "fact"}>
                    <h3 lang="en">{line.place}</h3>
                    <p className="fine">{w.routed(line.owner)}</p>
                    <div className="split" lang="en">
                      <div>
                        <h3>{w.current}</h3>
                        <blockquote>{line.before}</blockquote>
                      </div>
                      <div>
                        <h3>{w.proposed}</h3>
                        <blockquote>{line.after}</blockquote>
                      </div>
                    </div>
                    {line.warnings.map((warning) => (
                      <p key={warning} className="notice" lang="en">
                        {warning}
                      </p>
                    ))}
                    <div className="action-row">
                      <button type="button" className="btn on-paper" onClick={() => decideLine(proposal.id, line.id, "accepted")}>
                        {proposal.decisions[line.id] === "accepted" ? r.states.accepted : w.acceptLine}
                      </button>
                      <button type="button" className="btn on-paper" onClick={() => decideLine(proposal.id, line.id, "rejected")}>
                        {proposal.decisions[line.id] === "rejected" ? r.states.rejected : w.rejectLine}
                      </button>
                    </div>
                  </article>
                ))}
                <button type="button" className="btn on-paper" onClick={() => download(`${proposal.id}-redline.txt`, redline)}>
                  {w.redline}
                </button>
              </details>
            </li>
          );
        })}
        <li>
          <strong>practice-1</strong>
          <p>{w.base}</p>
        </li>
      </ol>
    </section>
  );
}

export function RegistryCard() {
  const r = useR();
  const fields = registryFields(extractValues());
  return (
    <Fold id="registry" title={r.files.registry} meta={`${fields.filter((field) => field.agrees).length}/${fields.length} · ${r.files.same}`}>
      <ul className="stack">
        {fields.map((field) => (
          <li key={field.id}>
            <strong lang="en">{field.label}</strong>
            <p lang="en">{field.value}</p>
            <small>{field.agrees ? r.files.same : r.files.differ}</small>
          </li>
        ))}
      </ul>
    </Fold>
  );
}

/* ---------- Pre-Flight ---------- */

type ProtocolSource = { name: string; sections: ProtocolSection[]; meta: ProtocolMeta; practice: boolean };

async function readProtocol(file: File, r: ResearchStrings): Promise<ProtocolSource | string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || file.type === "application/pdf") {
    const extract = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
    if (!extract.ok) return extract.error;
    const sections = sectionsFromText(extract.pages, file.name);
    return sections.length === 0 ? r.preflight.noPdfText : { name: file.name, sections, meta: {}, practice: false };
  }
  if (!["txt", "md"].includes(ext)) return r.preflight.formats;
  const raw = await file.text();
  const parsed = parseDocument(raw, file.name, { anyStudy: true });
  if (parsed.ok) {
    const first = parsed.passages[0];
    return {
      name: file.name,
      sections: parsed.passages.map((passage) => ({
        id: passage.sectionId,
        heading: passage.heading,
        page: passage.page,
        citation: passage.citation,
        text: passage.text,
      })),
      meta: { documentId: first.documentId, version: first.version, date: first.date },
      practice: false,
    };
  }
  const sections = sectionsFromText([{ number: 1, text: raw }], file.name);
  return sections.length === 0 ? r.preflight.noText : { name: file.name, sections, meta: {}, practice: false };
}

export function FindingList({ findings }: { findings: Finding[] }) {
  const r = useR();
  return (
    <ul className="stack">
      {findings.map((finding) => (
        <li key={finding.id} className={finding.status === "flag" ? "fail" : finding.status === "ok" ? "pass" : ""}>
          <strong>
            {finding.status === "flag" ? r.preflight.flag : finding.status === "ok" ? r.preflight.ok : r.preflight.cannot} · <span lang="en">{finding.title}</span>
          </strong>
          <p lang="en">{finding.why}</p>
          <small>
            {r.where}{r.colon}<span lang="en">{finding.where}</span>. {r.fix}{r.colon}<span lang="en">{finding.fix}</span>
          </small>
        </li>
      ))}
    </ul>
  );
}

export function ChecklistTable({ rows }: { rows: ChecklistResult[] }) {
  const r = useR();
  return (
    <>
      {(["ICH M11", "SPIRIT 2025"] as const).map((list) => {
        const part = rows.filter((row) => row.list === list);
        const count = (mark: ChecklistResult["mark"]) => part.filter((row) => row.mark === mark).length;
        return (
          <Fold key={list} title={r.preflight.summary(list, part.length, count("present"), count("thin"), count("missing"))}>
            <ul className="stack">
              {part.map((row) => (
                <li key={row.id} className={row.mark === "missing" ? "fail" : row.mark === "present" ? "pass" : ""}>
                  <strong>
                    <span lang="en">
                      {row.ref} {row.item}
                    </span>{" "}
                    · {r.marks[row.mark]}
                  </strong>
                  <p lang="en">{row.why}</p>
                  <small lang="en">
                    {row.where}
                    {row.evidence ? ` · “${row.evidence}”` : ""}
                  </small>
                </li>
              ))}
            </ul>
          </Fold>
        );
      })}
    </>
  );
}

export function Score({ score }: { score: ReturnType<typeof coverageScore> }) {
  const r = useR();
  return (
    <p className="score-line">
      <strong>{r.preflight.coverage(score.value)}</strong>
      <small>
        {r.preflight.formula(score.present, score.thin, score.total, score.value)}. {r.preflight.notApproval}
      </small>
    </p>
  );
}

export function PlantedCases({ cases, withExpected = false }: { cases: { id: string; label: string; expected?: string[]; found: string[]; missed: string[]; falseAlarms: string[] }[]; withExpected?: boolean }) {
  const r = useR();
  return (
    <ul className="stack">
      {cases.map((item) => (
        <li key={item.id} className={item.missed.length === 0 && item.falseAlarms.length === 0 ? "pass" : "fail"}>
          <strong lang="en">{item.label}</strong>
          <p>{r.caseLine(withExpected ? (item.expected ?? []) : null, item.found, item.missed, item.falseAlarms)}</p>
        </li>
      ))}
    </ul>
  );
}

export function PreFlight() {
  const r = useR();
  const p = r.preflight;
  const practice = useMemo<ProtocolSource>(() => ({ ...practiceProtocol(), name: "PROT-AETHER-01 v3.0 (practice)", practice: true }), []);
  const [source, setSource] = useState<ProtocolSource>(practice);
  const [note, setNote] = useState("");
  const rows = runChecklist(source.sections, source.meta);
  const score = coverageScore(rows);
  const internal = internalChecks(source.sections);
  const cross = source.practice ? crossChecks() : [];
  const spots = hotspots(rows, [...internal, ...cross]);
  const planted = useMemo(() => runPlantedCases(), []);
  const hours = burden();

  return (
    <section id="pre-flight">
      <p className="fine">{p.checking(source.name, source.sections.length)}</p>
      <label htmlFor="protocol-file">{p.file}</label>
      <input
        id="protocol-file"
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setNote(p.reading(file.name));
          const result = await readProtocol(file, r);
          if (typeof result === "string") {
            setNote(result);
            return;
          }
          setSource(result);
          setNote(p.read(file.name, result.sections.length));
        }}
      />
      {!source.practice ? (
        <button
          type="button"
          className="btn on-paper"
          onClick={() => {
            setSource(practice);
            setNote("");
          }}
        >
          {p.back}
        </button>
      ) : null}
      {note ? <p className="fine">{note}</p> : null}

      <Score score={score} />
      <ChecklistTable rows={rows} />
      <Fold title={p.inside} meta={r.ui.flagged(internal.filter((finding) => finding.status === "flag").length)}>
        <FindingList findings={internal} />
      </Fold>
      {source.practice ? (
        <Fold title={p.againstConsent} meta={r.ui.flagged(cross.filter((finding) => finding.status === "flag").length)}>
          <FindingList findings={cross} />
        </Fold>
      ) : null}
      <Fold title={p.risks} meta={spots.length}>
      <ul className="stack">
        {spots.length === 0 ? <li>{p.noRisks}</li> : null}
        {spots.map((spot) => (
          <li key={spot.id}>
            <strong lang="en">{spot.category}</strong>
            <p lang="en">{spot.why}</p>
            <small>
              {r.where}{r.colon}<span lang="en">{spot.where}</span>. {r.fix}{r.colon}<span lang="en">{spot.fix}</span>
            </small>
          </li>
        ))}
      </ul>
      </Fold>
      <Fold title={r.plantedTitle} meta={r.planted(planted.caught, planted.planted, planted.falseAlarms)}>
        <PlantedCases cases={planted.cases} />
      </Fold>
      {source.practice && hours.protocol !== null && hours.consent !== null ? (
        <Fold title={p.time} meta={r.ui.hours(hours.protocol)}>
          <p>{p.hours(hours.protocol, hours.consent)}</p>
        </Fold>
      ) : null}
    </section>
  );
}

/* ---------- Design brief ---------- */

const briefKeys: (keyof Brief)[] = ["title", "condition", "phase", "intervention", "comparator", "population", "primaryEndpoint", "endpointWeek", "visits", "weeks"];

export function DesignBrief() {
  const r = useR();
  const b = r.brief;
  const { brief, setBrief, briefDecisions, decideBrief } = useSession();
  const sections = draftFromBrief(brief);
  const accepted = new Set(Object.entries(briefDecisions).filter(([, value]) => value === "accepted").map(([key]) => key));

  return (
    <section id="design-brief">
      <h2>{b.title}</h2>
      <FillBrief />
      <div className="brief-grid">
        {briefKeys.map((key) => (
          <label key={key}>
            {b.fields[key]}
            <input value={brief[key]} onChange={(event) => setBrief({ ...brief, [key]: event.target.value })} />
          </label>
        ))}
      </div>
      <Fold title={r.ui.m11} meta={r.ui.drafts(accepted.size, sections.length)}>
      {sections.map((section) => (
        <article key={section.id} className={section.missing ? "fact flagged" : "fact"}>
          <h3 lang="en">
            M11 {section.ref} {section.heading}
          </h3>
          <p lang="en">{section.text}</p>
          <small lang="en">{section.source}</small>
          {!section.missing ? (
            <div className="action-row">
              <button type="button" className="btn on-paper" onClick={() => decideBrief(section.id, "accepted")}>
                {briefDecisions[section.id] === "accepted" ? r.states.accepted : b.acceptSection}
              </button>
              <button type="button" className="btn on-paper" onClick={() => decideBrief(section.id, "rejected")}>
                {briefDecisions[section.id] === "rejected" ? r.states.rejected : b.rejectSection}
              </button>
            </div>
          ) : null}
        </article>
      ))}
      </Fold>
      <TrialPrecedent />
      <div className="action-row">
        <button
          type="button"
          className="btn on-paper"
          onClick={() => download("design-brief-usdm-shaped.json", JSON.stringify(usdmShape(brief, accepted), null, 2), "application/json")}
        >
          {b.usdm}
        </button>
      </div>
      <p className="fine">{b.usdmNote}</p>
    </section>
  );
}

/** Write Once on the practice protocol and consent: the shared blocks and change proposals. */
export function PracticeWriteOnce() {
  return (
    <>
      <BlockLibrary />
      <ProposeChange />
    </>
  );
}

/* ---------- Say It Plainly ---------- */

const reviewers: ReviewerComment["reviewer"][] = ["Medical", "Legal", "Patient advocate"];

export function Comments({ audience }: { audience: CommentTarget }) {
  const r = useR();
  const c = r.comments;
  const { comments, addComment, removeComment } = useSession();
  const [reviewer, setReviewer] = useState<ReviewerComment["reviewer"]>("Legal");
  const [stance, setStance] = useState<ReviewerComment["stance"]>("change");
  const [text, setText] = useState("");
  const mine = comments.filter((comment) => comment.audience === audience);

  return (
    <Fold title={c.title} meta={mine.length}>
      <ul className="stack">
        {mine.length === 0 ? <li>{c.none}</li> : null}
        {mine.map((comment) => (
          <li key={comment.id}>
            <strong>
              {c.people[comment.reviewer] ?? comment.reviewer} · {comment.stance === "approve" ? c.approves : c.asks}
            </strong>
            <p>{comment.text}</p>
            <button type="button" className="text-button" onClick={() => removeComment(comment.id)}>
              {c.resolve}
            </button>
          </li>
        ))}
      </ul>
      <div className="sheet-form">
        <select aria-label={c.reviewer} value={reviewer} onChange={(event) => setReviewer(event.target.value as ReviewerComment["reviewer"])}>
          {reviewers.map((item) => (
            <option key={item} value={item}>
              {c.people[item]}
            </option>
          ))}
        </select>
        <select aria-label={c.stance} value={stance} onChange={(event) => setStance(event.target.value as ReviewerComment["stance"])}>
          <option value="approve">{c.approve}</option>
          <option value="change">{c.change}</option>
        </select>
        <input aria-label={c.placeholder} value={text} onChange={(event) => setText(event.target.value)} placeholder={c.placeholder} />
        <button
          type="button"
          className="btn on-paper"
          disabled={!text.trim()}
          onClick={() => {
            addComment({ audience, reviewer, stance, text: text.trim() });
            setText("");
          }}
        >
          {c.add}
        </button>
      </div>
    </Fold>
  );
}

const handoffChoices = ["Spanish", "French", "Mandarin Chinese", "Vietnamese", "Arabic", "Haitian Creole"];

export function PlainWorkbook({ children }: { children?: ReactNode }) {
  const r = useR();
  const p = r.plain;
  const {
    consent,
    audienceText,
    audienceState,
    audienceHistory,
    comments,
    translationHandoff,
    setAudienceText,
    setAudienceState,
    regenerateReadings,
    setTranslationHandoff,
  } = useSession();
  const source = readingSource(consent);
  const sourceEase = readability(source.original);
  const lab = useMemo(() => runPlantedDrafts(), []);
  const [language, setLanguage] = useState("Spanish");
  const [handoffNote, setHandoffNote] = useState("");
  const when = (iso: string) => new Date(iso).toLocaleString(r.locale);

  return (
    <div className="sheet-work">
      <section id="say-it-plainly">
        <h2>{p.title}</h2>
        <p className="fine">
          {p.source(source.title, source.mustKeep.join(", ") || "—", source.mustNotAdd.join(", "))} {p.flesch(sourceEase.readingEase, sourceEase.grade)}
        </p>
        <div className="action-row">
          <button type="button" className="btn on-paper" onClick={() => regenerateReadings("Regenerated by a person from the current source")}>
            {p.regenerate}
          </button>
        </div>
        {(["adult", "caregiver"] as const).map((audience) => {
          const text = audienceText[audience];
          const ease = readability(text);
          const checks = checkDraft(text, source);
          const holds = checks.every((check) => check.passed);
          const blocker = blockerFor(r, comments.filter((comment) => comment.audience === audience), holds);
          const trace = traceFigures(text, source.passages);
          const name = audience === "adult" ? p.adult : p.caregiver;
          return (
            <article key={audience} className="fact">
              <header>
                <h3>{name}</h3>
                <p className="flag">{r.states[audienceState[audience]]}</p>
              </header>
              <textarea rows={4} aria-label={name} lang="en" value={text} onChange={(event) => setAudienceText(audience, event.target.value)} />
              <p className="fine">{p.ease(ease.readingEase, ease.grade, ease.words, ease.sentences)}</p>
              <Fold title={r.nav[4]} meta={r.ui.holdAll(checks.filter((check) => check.passed).length, checks.length)} open={!holds}>
                <ul className="plain-list">
                  {checks.map((check) => (
                    <li key={check.id}>
                      <span lang="en">
                        {check.label}: {check.note}
                      </span>
                      <span>{check.passed ? r.holds : r.check}</span>
                    </li>
                  ))}
                </ul>
              </Fold>
              <Fold title={p.figures} meta={trace.length} open={trace.some((item) => !item.citation)}>
                <ul className="stack">
                  {trace.map((item) => (
                    <li key={item.figure}>
                      <strong>{item.figure}</strong>
                      <p>{item.citation ? <span lang="en">{`${item.citation}: “${item.quote}”`}</span> : p.notFound}</p>
                    </li>
                  ))}
                </ul>
              </Fold>
              <Comments audience={audience} />
              {blocker ? <p className="notice">{blocker}</p> : null}
              <div className="action-row">
                <button type="button" className="btn on-paper" disabled={!holds} onClick={() => setAudienceState(audience, "in-review")}>
                  {r.sendReview}
                </button>
                <button type="button" className="btn solid dark" disabled={Boolean(blocker)} onClick={() => setAudienceState(audience, "accepted")}>
                  {p.acceptReading}
                </button>
                <button type="button" className="btn on-paper" onClick={() => setAudienceState(audience, "rejected")}>
                  {p.rejectReading}
                </button>
              </div>
            </article>
          );
        })}
        <Fold title={r.history(audienceHistory.length)}>
          <ul className="stack">
            {audienceHistory.length === 0 ? <li>{r.noHistory}</li> : null}
            {audienceHistory.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.audience === "adult" ? p.adult : p.caregiver} · {r.was(r.states[item.state], when(item.at))}
                </strong>
                <p lang="en">{item.text}</p>
                <small lang="en">{item.reason}</small>
              </li>
            ))}
          </ul>
        </Fold>
      </section>

      <div>
      <Fold title={r.plantedTitle} meta={r.planted(lab.caught, lab.planted, lab.falseAlarms)}>
        <ul className="stack">
          {lab.results.map((item) => (
            <li key={item.id} className={item.caught ? "pass" : "fail"}>
              <strong>
                <span lang="en">{item.label}</span> ·{" "}
                {item.caught ? (item.expect ? r.plantStatus.caught : r.plantStatus.clean) : item.expect ? r.plantStatus.missed : r.plantStatus.falseAlarm}
              </strong>
              <p lang="en">“{item.text}”</p>
              <small>{item.failed.map((check) => check.note).join(" ") || r.noCheckFailed}</small>
            </li>
          ))}
        </ul>
      </Fold>

      <Fold title={p.translation} meta={translationHandoff ? r.states["in-review"] : ""}>
        {translationHandoff ? (
          <>
            <p>
              {r.readyFor(r.handoffLanguages[translationHandoff.language] ?? translationHandoff.language, when(translationHandoff.at))}
              {translationHandoff.note ? r.note(translationHandoff.note) : ""}
            </p>
            <button type="button" className="btn on-paper" onClick={() => setTranslationHandoff(null)}>
              {r.withdraw}
            </button>
          </>
        ) : (
          <div className="sheet-form">
            <select aria-label={p.language} value={language} onChange={(event) => setLanguage(event.target.value)}>
              {handoffChoices.map((item) => (
                <option key={item} value={item}>
                  {r.handoffLanguages[item]}
                </option>
              ))}
            </select>
            <input aria-label={r.notePlaceholder} value={handoffNote} onChange={(event) => setHandoffNote(event.target.value)} placeholder={r.notePlaceholder} />
            <button
              type="button"
              className="btn on-paper"
              onClick={() => setTranslationHandoff({ language, at: new Date().toISOString(), note: handoffNote.trim() })}
            >
              {p.markReady}
            </button>
          </div>
        )}
      </Fold>
      {children}
      </div>
    </div>
  );
}

/* ---------- Files and Settings ---------- */

export function ConsentElements() {
  const r = useR();
  const { consent } = useSession();
  if (!consent) return null;
  const rows = consentElements(consent.passages);
  return (
    <Fold id="elements" title={r.files.elements} meta={`${rows.filter((row) => row.mark === "present").length}/${rows.length} ${r.marks.present}`}>
      <p className="fine">{r.files.elementsNote(`${consent.documentId} ${consent.version}`)}</p>
      <ul className="stack">
        {rows.map((row) => (
          <li key={row.id} className={row.mark === "missing" ? "fail" : row.mark === "present" ? "pass" : ""}>
            <strong>
              <span lang="en">
                {row.ref} {row.element}
              </span>{" "}
              · {r.marks[row.mark]}
            </strong>
            <p lang="en">{row.note}</p>
          </li>
        ))}
      </ul>
    </Fold>
  );
}

export function ApprovedList() {
  const r = useR();
  const { approvedVersions, setApprovedVersions } = useSession();
  const [text, setText] = useState(approvedVersions.join("\n"));

  return (
    <section>
      <h2>{r.settings.approved}</h2>
      <p className="fine">{r.settings.approvedNote}</p>
      <textarea rows={3} aria-label={r.settings.approved} value={text} onChange={(event) => setText(event.target.value)} />
      <button
        type="button"
        className="btn on-paper"
        onClick={() =>
          setApprovedVersions(
            text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
      >
        {r.settings.save}
      </button>
    </section>
  );
}

/* ---------- Questions ---------- */

export function PersonaResults() {
  const r = useR();
  const results = personaFixtures.map((fixture) => ({
    ...fixture,
    result: assessTeachback(fixture.promptId, fixture.response, teachPrompts, fixture.speaker),
    topic: teachPrompts.find((prompt) => prompt.id === fixture.promptId)?.topic ?? fixture.promptId,
  }));
  const matched = results.filter((item) => item.result.label === item.expect).length;
  const label = (value: string) => r.understanding[value] ?? value;
  return (
    <Fold id="personas" title={r.personas.title} meta={`${matched}/${results.length}`}>
      <ul className="stack">
        {results.map((item) => (
          <li key={item.id} className={item.result.label === item.expect ? "pass" : "fail"}>
            <strong>
              {r.personas.names[item.persona] ?? item.persona} · <span lang="en">{item.topic}</span> · {label(item.result.label)}
            </strong>
            <p>“{item.response}”</p>
            <small>
              {r.personas.expected(label(item.expect))}
              {item.result.misconception ? r.personas.misunderstanding(item.result.misconception) : ""}
              {item.speaker === "caregiver" ? r.personas.caregiver : ""}
              {item.result.language && item.result.language !== "en" ? r.personas.key(r.languageName[item.result.language]) : ""}
            </small>
          </li>
        ))}
      </ul>
    </Fold>
  );
}

export function StoredHandoffs() {
  const r = useR();
  const h = r.handoffs;
  const u = r.ui.inbox;
  const [state, setState] = useState<"loading" | "ok" | "signed-out" | "forbidden" | "offline">("loading");
  const [items, setItems] = useState<StoredHandoff[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState("");
  const [note, setNote] = useState("");
  const refresh = () =>
    loadHandoffs().then((result) => {
      setState(result.state);
      setItems(result.handoffs);
    });
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="handoffs">
      <div className="inbox-head">
        <h2>{h.title}</h2>
        <button type="button" className="btn on-paper" onClick={() => void refresh()}>
          {u.refresh}
        </button>
      </div>
      {state === "loading" ? <p className="fine">{h.loading}</p> : null}
      {state === "signed-out" ? <p className="fine">{h.signedOut}</p> : null}
      {state === "forbidden" ? <p className="fine">{h.forbidden}</p> : null}
      {state === "offline" ? <p className="fine">{h.offline}</p> : null}
      {state === "ok" && items.length === 0 ? <p className="empty">{h.none}</p> : null}
      {note ? <p className="fine" aria-live="polite">{note}</p> : null}
      {state === "ok" && items.length > 0 ? (
        <div className="message-list">
          {items.map((item) => (
            <article key={item.id} className="message-card">
              <header>
                <div>
                  <strong>{item.participant}</strong>
                  <p lang="en">{item.topic}</p>
                </div>
                <span className={item.label === "Understands the key concept" ? "message-status clear" : "message-status"}>{r.understanding[item.label] ?? item.label}</span>
              </header>
              <p className="message-response">“{item.response}”</p>
              {item.misconception ? <p className="notice">{h.misunderstanding(item.misconception)}</p> : null}
              <small>
                {item.document_id} {item.version} · {new Date(`${item.created_at}Z`).toLocaleString(r.locale)}
                {item.speaker === "caregiver" ? ` · ${h.caregiver}` : ""}
                {item.language !== "en" && isLanguage(item.language) ? ` · ${h.interpreter(r.languageName[item.language])}` : ""}
              </small>
              {item.messages.length > 0 ? (
                <div className="message-thread">
                  {item.messages.map((message) => (
                    <p key={message.id} className={message.author_role === "researcher" ? "from-researcher" : "from-participant"}>
                      <strong>{message.author_role === "researcher" ? u.you : item.participant}</strong> {message.message}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="reply-row">
                <label className="sr-only" htmlFor={`reply-${item.id}`}>
                  {u.replyTo(item.participant)}
                </label>
                <input
                  id={`reply-${item.id}`}
                  value={drafts[item.id] ?? ""}
                  placeholder={u.placeholder}
                  onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                />
                <button
                  type="button"
                  className="btn solid dark"
                  disabled={!drafts[item.id]?.trim() || sending === item.id}
                  onClick={async () => {
                    setSending(item.id);
                    const result = await sendHandoffMessage(item.id, drafts[item.id].trim());
                    setNote(result.ok ? u.sent : result.detail);
                    if (result.ok) {
                      setDrafts((current) => ({ ...current, [item.id]: "" }));
                      await refresh();
                    }
                    setSending("");
                  }}
                >
                  {sending === item.id ? u.sending : u.reply}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
