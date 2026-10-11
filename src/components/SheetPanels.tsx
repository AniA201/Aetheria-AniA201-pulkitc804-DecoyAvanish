import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseDocument } from "../data/documents";
import { personaFixtures, teachPrompts } from "../data/study";
import { blocks, blocksIn, extractValues, proposeChange, registryFields, render, sourceText, uses, type BlockId } from "../lib/blocks";
import { draftFromBrief, usdmShape, type Brief } from "../lib/brief";
import { consentElements } from "../lib/elements";
import { loadHandoffs, type StoredHandoff } from "../lib/handoff";
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
import { assessTeachback } from "../lib/teachback";
import { readingSource, versionNote } from "../lib/workbook";
import { publicNct } from "../lib/publicTrial";
import { TrialLaySummary, TrialPreFlight, TrialPrecedent, TrialWriteOnce, useTrialSummary } from "./TrialPanels";
import { useSession, type CommentTarget, type ReviewerComment } from "../state/Session";

export function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function VersionStanding({ version, language = "en" }: { version: string; language?: "en" | "es" }) {
  const { approvedVersions } = useSession();
  return <p className="fine">{versionNote(version, approvedVersions, language)}</p>;
}

export function VersionGate({ version, title, language = "en" }: { version: string; title: string; language?: "en" | "es" }) {
  if (language === "es") {
    return (
      <div className="page">
        <p className="kicker">{title}</p>
        <h1>Este formulario no está en la lista aprobada.</h1>
        <p className="lede dark">
          El equipo de investigación ingresó una lista de versiones aprobadas, y {version} no está en ella. Leer, preguntar y comprobar están en pausa para este archivo, para no usar un formulario desactualizado.
        </p>
        <p className="fine">Pida el formulario actual al coordinador del estudio. Esta aplicación no decide qué versión está aprobada; una persona ingresó la lista.</p>
      </div>
    );
  }
  return (
    <div className="page">
      <p className="kicker">{title}</p>
      <h1>This form is not on the approved list.</h1>
      <p className="lede dark">
        The research team entered a list of approved versions, and {version} is not on it. Reading, asking, and checking are paused for this file so an outdated form is not used.
      </p>
      <p className="fine">Ask the study coordinator for the current form. This app does not decide which version is approved; a person entered the list.</p>
    </div>
  );
}

/* ---------- Overview ---------- */

export function StarterSheets() {
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
  const wait = `Loading ${publicNct}…`;
  const cards = [
    {
      name: "Teach It Back",
      lines: [
        `${teachPrompts.length} check questions, one per sample section, in English and Spanish`,
        `${personas} of ${personaFixtures.length} starter-sheet personas get the expected result (the Spanish one is checked against the Spanish answer key)`,
        "Voice session: reads each section, asks, listens, checks, and hands off; “person” stops it and flags the coordinator",
        `${publicNct} posts no consent form, so Teach It Back uses the practice form or an uploaded one`,
      ],
      links: [
        { to: "/researcher/insights#handoffs", label: "Handoffs from participants" },
        { to: "/researcher/insights#personas", label: "Persona results" },
      ],
    },
    {
      name: "Say It Plainly",
      lines: [
        real
          ? `${publicNct} lay summary from ${real.facts} registry facts: 5 versions (adult, caregiver, teen, physician, Spanish), Annex V headings`
          : wait,
        real ? `Planted-error test on the real results: ${real.lay.caught} of ${real.lay.planted} caught, ${real.lay.falseAlarms} false alarms` : wait,
        `Practice consent readings: planted-error test ${lab.caught} of ${lab.planted} caught, ${lab.falseAlarms} false alarms`,
        "Reviewer comments; a disagreement blocks Accept; regenerate keeps a version history",
      ],
      links: [
        { to: "/researcher/plain-language#lay-summary", label: `${publicNct} lay summaries` },
        { to: "/researcher/plain-language#say-it-plainly", label: "Practice consent readings" },
      ],
    },
    {
      name: "Write Once",
      lines: [
        real ? `${publicNct}: ${real.rows} facts compared across protocol, SAP, and registry; ${real.differs} real wording difference${real.differs === 1 ? "" : "s"} found` : wait,
        real ? `Planted-error test: ${real.writePlants.caught} of ${real.writePlants.planted} caught, ${real.writePlants.falseAlarms} false alarms` : wait,
        "Change one block (for example, add a week-36 visit) and every affected sentence and page is listed with its owner",
        `Practice pair: ${blocks.length} blocks, ${matching} of ${bound.length} source sentences rebuilt exactly`,
      ],
      links: [
        { to: "/researcher/document-integrity#nct-write-once", label: `${publicNct} Write Once` },
        { to: "/researcher/document-integrity#write-once", label: "Practice blocks" },
      ],
    },
    {
      name: "Protocol Pre-Flight",
      lines: [
        real ? `${publicNct} protocol (${real.pages} PDF pages): checklist count ${real.score.value} of 100 (M11 + SPIRIT 2025, ${real.score.total} items)` : wait,
        real ? `Planted-error test on the real protocol: ${real.plants.caught} of ${real.plants.planted} caught, ${real.plants.falseAlarms} false alarms` : wait,
        real ? `${real.amendments.length} real amendments read from the PDF; compared with ${real.peers} similar completed trials` : wait,
        `Practice protocol: ${score.value} of 100; planted-error test ${planted.caught} of ${planted.planted}`,
      ],
      links: [
        { to: "/researcher/document-integrity#nct-pre-flight", label: `${publicNct} pre-flight` },
        { to: "/researcher/document-integrity#design-brief", label: "Design brief" },
      ],
    },
  ];

  return (
    <section className="sheet-cards" aria-label="Starter sheets">
      <h2>Starter sheets</h2>
      <p className="fine">
        Computed now from the stored files. {publicNct} numbers come from its public ClinicalTrials.gov record and posted PDFs{real ? `, retrieved ${new Date(real.retrieved).toLocaleDateString()}` : ""}. The practice
        study is synthetic. Nothing here is an approval.
      </p>
      <div className="sheet-card-grid">
        {cards.map((card) => (
          <article key={card.name} className="fact">
            <h3>{card.name}</h3>
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
  const values = extractValues();
  return (
    <section id="write-once">
      <h2>Shared blocks</h2>
      <p className="fine">
        Each value is read from the stored files, not typed in. Every sentence below is rebuilt from its template and compared with the stored sentence, so a mismatch shows up here.
      </p>
      {blocks.map((block) => {
        const value = values[block.id];
        const agrees = value.protocol === value.consent;
        return (
          <article key={block.id} className={agrees ? "fact" : "fact flagged"}>
            <header>
              <h3>{block.label}</h3>
              <p className="flag">
                {block.owner} · block practice-1 · {agrees ? "same in both files" : "files disagree"}
              </p>
            </header>
            <p>
              Protocol: {value.protocol} {block.unit}. Consent: {value.consent} {block.unit}.
            </p>
            <ul className="stack">
              {uses
                .filter((use) => blocksIn(use.template).includes(block.id))
                .map((use) => {
                  const text = render(use.template, use.side, values);
                  const stored = sourceText(use);
                  return (
                    <li key={use.id}>
                      <strong>{use.place}</strong>
                      <p>{text}</p>
                      <small>
                        {stored === null
                          ? `Generated reading, owned by ${use.owner}.`
                          : stored.includes(text)
                            ? `Matches the stored sentence. Owner: ${use.owner}.`
                            : `Does not match the stored sentence. Owner: ${use.owner}.`}
                      </small>
                    </li>
                  );
                })}
            </ul>
          </article>
        );
      })}
    </section>
  );
}

function ProposeChange() {
  const { proposals, addProposal, decideLine } = useSession();
  const values = extractValues();
  const [blockId, setBlockId] = useState<BlockId>("visits");
  const [next, setNext] = useState("7");
  const block = blocks.find((item) => item.id === blockId)!;
  const current = values[blockId];
  const clean = next.trim();
  const problem = !/^\d{1,4}$/.test(clean)
    ? "Enter a whole number."
    : clean === current.protocol && clean === current.consent
      ? "Both files already say this."
      : "";

  return (
    <section>
      <h2>Propose a change</h2>
      <p className="fine">
        Pick any block and type a new value. Every sentence that uses the block is listed with its owner. Accepting a line records a decision; it does not edit the protocol or the consent.
      </p>
      <div className="sheet-form">
        <label htmlFor="block-pick">Block</label>
        <select id="block-pick" value={blockId} onChange={(event) => setBlockId(event.target.value as BlockId)}>
          {blocks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} (protocol {values[item.id].protocol}, consent {values[item.id].consent})
            </option>
          ))}
        </select>
        <label htmlFor="block-value">New value ({block.unit})</label>
        <input id="block-value" inputMode="numeric" value={next} onChange={(event) => setNext(event.target.value)} />
        <button
          type="button"
          className="btn solid dark"
          disabled={Boolean(problem)}
          onClick={() => addProposal(blockId, `protocol ${current.protocol} · consent ${current.consent}`, clean)}
        >
          Propose
        </button>
        {problem ? <p className="fine">{problem}</p> : null}
      </div>

      <h3>Version history</h3>
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
                  {proposal.id}: {label} {proposal.from} → {proposal.to} · {decided}/{lines.length} lines decided
                </summary>
                {lines.map((line) => (
                  <article key={line.id} className={line.warnings.length > 0 ? "fact flagged" : "fact"}>
                    <h3>{line.place}</h3>
                    <p className="fine">Routed to: {line.owner}</p>
                    <div className="split">
                      <div>
                        <h3>Current</h3>
                        <blockquote>{line.before}</blockquote>
                      </div>
                      <div>
                        <h3>Proposed</h3>
                        <blockquote>{line.after}</blockquote>
                      </div>
                    </div>
                    {line.warnings.map((warning) => (
                      <p key={warning} className="notice">
                        {warning}
                      </p>
                    ))}
                    <div className="action-row">
                      <button type="button" className="btn on-paper" onClick={() => decideLine(proposal.id, line.id, "accepted")}>
                        {proposal.decisions[line.id] === "accepted" ? "Accepted" : "Accept this line"}
                      </button>
                      <button type="button" className="btn on-paper" onClick={() => decideLine(proposal.id, line.id, "rejected")}>
                        {proposal.decisions[line.id] === "rejected" ? "Rejected" : "Reject this line"}
                      </button>
                    </div>
                  </article>
                ))}
                <button type="button" className="btn on-paper" onClick={() => download(`${proposal.id}-redline.txt`, redline)}>
                  Download redline (.txt)
                </button>
              </details>
            </li>
          );
        })}
        <li>
          <strong>practice-1</strong>
          <p>Values as read from PROT-AETHER-01 v3.0 and ICF-AETHER-01 v2.1. Later entries are proposals; the files stay as they are.</p>
        </li>
      </ol>
    </section>
  );
}

export function RegistryCard() {
  const fields = registryFields(extractValues());
  return (
    <section id="registry">
      <h2>Registry card</h2>
      <p className="fine">Built from the same blocks as the protocol and the consent. Where the files disagree, both values are shown.</p>
      <ul className="stack">
        {fields.map((field) => (
          <li key={field.id}>
            <strong>{field.label}</strong>
            <p>{field.value}</p>
            <small>{field.agrees ? "Same in both files" : "Files disagree. A person has to pick one."}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Pre-Flight ---------- */

type ProtocolSource = { name: string; sections: ProtocolSection[]; meta: ProtocolMeta; practice: boolean };

async function readProtocol(file: File): Promise<ProtocolSource | string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || file.type === "application/pdf") {
    const extract = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
    if (!extract.ok) return extract.error;
    const sections = sectionsFromText(extract.pages, file.name);
    return sections.length === 0 ? "No text sections were found in that PDF." : { name: file.name, sections, meta: {}, practice: false };
  }
  if (!["txt", "md"].includes(ext)) return "Use a PDF, .txt, or .md protocol.";
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
  return sections.length === 0 ? "No text was found in that file." : { name: file.name, sections, meta: {}, practice: false };
}

export function FindingList({ findings }: { findings: Finding[] }) {
  return (
    <ul className="stack">
      {findings.map((finding) => (
        <li key={finding.id} className={finding.status === "flag" ? "fail" : finding.status === "ok" ? "pass" : ""}>
          <strong>
            {finding.status === "flag" ? "Flag" : finding.status === "ok" ? "Consistent" : "Cannot check"} · {finding.title}
          </strong>
          <p>{finding.why}</p>
          <small>
            Where: {finding.where}. Fix: {finding.fix}
          </small>
        </li>
      ))}
    </ul>
  );
}

export function ChecklistTable({ rows }: { rows: ChecklistResult[] }) {
  return (
    <>
      {(["ICH M11", "SPIRIT 2025"] as const).map((list) => {
        const part = rows.filter((row) => row.list === list);
        const missing = part.filter((row) => row.mark === "missing").length;
        return (
          <details key={list}>
            <summary>
              {list}: {part.length} items · {part.filter((row) => row.mark === "present").length} present ·{" "}
              {part.filter((row) => row.mark === "thin").length} thin · {missing} missing
            </summary>
            <ul className="stack">
              {part.map((row) => (
                <li key={row.id} className={row.mark === "missing" ? "fail" : row.mark === "present" ? "pass" : ""}>
                  <strong>
                    {row.ref} {row.item} · {row.mark}
                  </strong>
                  <p>{row.why}</p>
                  <small>
                    {row.where}
                    {row.evidence ? ` · “${row.evidence}”` : ""}
                  </small>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </>
  );
}

export function PreFlight() {
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
      <h2>Pre-flight protocol check</h2>
      <p className="fine">
        Checking {source.name}: {source.sections.length} sections. Headings come from ICH M11 (FDA copy, adopted 19 Nov 2025) and SPIRIT 2025 Table 1. Every mark is computed from the text on screen.
      </p>
      <label htmlFor="protocol-file">Check another protocol (PDF, .txt, or .md)</label>
      <input
        id="protocol-file"
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setNote(`Reading ${file.name}…`);
          const result = await readProtocol(file);
          if (typeof result === "string") {
            setNote(result);
            return;
          }
          setSource(result);
          setNote(`${file.name}: ${result.sections.length} sections found. Cross-document checks need the practice pair, so they are skipped for this file.`);
        }}
      />
      {!source.practice ? (
        <button type="button" className="btn on-paper" onClick={() => { setSource(practice); setNote(""); }}>
          Back to the practice protocol
        </button>
      ) : null}
      {note ? <p className="fine">{note}</p> : null}

      <article className="fact">
        <h3>Checklist coverage: {score.value} of 100</h3>
        <p>
          ({score.present} present + 0.5 × {score.thin} thin) ÷ {score.total} items × 100 = {score.value}
        </p>
        <p className="fine">
          Present = 1, thin = 0.5, missing = 0. This counts whether each heading’s content appears in the text. It is a checklist count, not an approval, a quality grade, or a prediction of amendments.
        </p>
      </article>
      <ChecklistTable rows={rows} />

      <h3>Inside the protocol</h3>
      <FindingList findings={internal} />
      {source.practice ? (
        <>
          <h3>Protocol against consent</h3>
          <FindingList findings={cross} />
        </>
      ) : null}

      <h3>Amendment-risk areas</h3>
      <p className="fine">
        Based on the gaps and flags above. The categories follow the starter sheet’s summary of Tufts CSDD amendment research; no amendment rate is predicted for this study.
      </p>
      <ul className="stack">
        {spots.length === 0 ? <li>No risk areas from these checks.</li> : null}
        {spots.map((spot) => (
          <li key={spot.id}>
            <strong>{spot.category}</strong>
            <p>{spot.why}</p>
            <small>
              Where: {spot.where}. Fix: {spot.fix}
            </small>
          </li>
        ))}
      </ul>

      <h3>Planted-error test</h3>
      <p>
        Caught {planted.caught} of {planted.planted} known errors, with {planted.falseAlarms} false alarm{planted.falseAlarms === 1 ? "" : "s"}.
      </p>
      <p className="fine">
        Each case changes the practice protocol in one known way and runs the same checks. The three real disagreements in the practice pair count as known errors in every case. This measures these checks on these cases only.
      </p>
      <ul className="stack">
        {planted.cases.map((item) => (
          <li key={item.id} className={item.missed.length === 0 && item.falseAlarms.length === 0 ? "pass" : "fail"}>
            <strong>{item.label}</strong>
            <p>
              Found: {item.found.join(", ") || "nothing"}. {item.missed.length ? `Missed: ${item.missed.join(", ")}. ` : ""}
              {item.falseAlarms.length ? `False alarms: ${item.falseAlarms.join(", ")}.` : ""}
            </p>
          </li>
        ))}
      </ul>

      {source.practice ? (
        <>
          <h3>Participant time</h3>
          <p>{hours.assumption}</p>
          {hours.protocol !== null && hours.consent !== null ? (
            <p>
              About {hours.protocol} clinic hours by the protocol’s visit count and {hours.consent} by the consent’s. Travel and waiting time are not counted.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/* ---------- Design brief ---------- */

const briefFields: { key: keyof Brief; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "condition", label: "Condition" },
  { key: "phase", label: "Phase" },
  { key: "intervention", label: "Intervention" },
  { key: "comparator", label: "Comparator" },
  { key: "population", label: "Population (who can join)" },
  { key: "primaryEndpoint", label: "Primary endpoint" },
  { key: "endpointWeek", label: "Endpoint week" },
  { key: "visits", label: "Number of clinic visits" },
  { key: "weeks", label: "Treatment weeks" },
];

export function DesignBrief() {
  const { brief, setBrief, briefDecisions, decideBrief } = useSession();
  const sections = draftFromBrief(brief);
  const accepted = new Set(Object.entries(briefDecisions).filter(([, value]) => value === "accepted").map(([key]) => key));

  return (
    <section id="design-brief">
      <h2>Design brief to draft</h2>
      <p className="fine">
        Type a short brief. Each M11 section is drafted only from what the brief says; anything missing is left for the author. Accepting a section records a decision. It does not approve a protocol.
      </p>
      <div className="brief-grid">
        {briefFields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input value={brief[field.key]} onChange={(event) => setBrief({ ...brief, [field.key]: event.target.value })} />
          </label>
        ))}
      </div>
      {sections.map((section) => (
        <article key={section.id} className={section.missing ? "fact flagged" : "fact"}>
          <h3>
            M11 {section.ref} {section.heading}
          </h3>
          <p>{section.text}</p>
          <small>{section.source}</small>
          {!section.missing ? (
            <div className="action-row">
              <button type="button" className="btn on-paper" onClick={() => decideBrief(section.id, "accepted")}>
                {briefDecisions[section.id] === "accepted" ? "Accepted" : "Accept section"}
              </button>
              <button type="button" className="btn on-paper" onClick={() => decideBrief(section.id, "rejected")}>
                {briefDecisions[section.id] === "rejected" ? "Rejected" : "Reject section"}
              </button>
            </div>
          ) : null}
        </article>
      ))}
      <button
        type="button"
        className="btn on-paper"
        onClick={() => download("design-brief-usdm-shaped.json", JSON.stringify(usdmShape(brief, accepted), null, 2), "application/json")}
      >
        Download USDM-shaped JSON
      </button>
      <p className="fine">Loosely follows CDISC USDM names. It has not been validated against the USDM schema.</p>
      <TrialPrecedent />
    </section>
  );
}

/** Pre-Flight and Write Once on the real public trial, then the same tools on the practice pair. */
export function RealTrialWork() {
  return (
    <div className="sheet-work">
      <p className="pack-line">
        Real trial first: {publicNct} (Amgen, Phase 2a migraine prevention, completed). Its protocol, SAP, and registry record are public. Below it, the same tools run on the synthetic practice pair.
      </p>
      <TrialPreFlight />
      <TrialWriteOnce />
    </div>
  );
}

export function CompareWorkbook() {
  return (
    <>
      <RealTrialWork />
      <div className="sheet-work">
        <BlockLibrary />
        <ProposeChange />
        <PreFlight />
        <DesignBrief />
      </div>
    </>
  );
}

/* ---------- Say It Plainly ---------- */

const reviewers: ReviewerComment["reviewer"][] = ["Medical", "Legal", "Patient advocate"];

export function Comments({ audience }: { audience: CommentTarget }) {
  const { comments, addComment, removeComment } = useSession();
  const [reviewer, setReviewer] = useState<ReviewerComment["reviewer"]>("Legal");
  const [stance, setStance] = useState<ReviewerComment["stance"]>("change");
  const [text, setText] = useState("");
  const mine = comments.filter((comment) => comment.audience === audience);

  return (
    <div>
      <h4>Reviewer comments</h4>
      <ul className="stack">
        {mine.length === 0 ? <li>No comments yet.</li> : null}
        {mine.map((comment) => (
          <li key={comment.id}>
            <strong>
              {comment.reviewer} · {comment.stance === "approve" ? "approves" : "asks for a change"}
            </strong>
            <p>{comment.text}</p>
            <button type="button" className="text-button" onClick={() => removeComment(comment.id)}>
              Resolve and remove
            </button>
          </li>
        ))}
      </ul>
      <div className="sheet-form">
        <select aria-label="Reviewer" value={reviewer} onChange={(event) => setReviewer(event.target.value as ReviewerComment["reviewer"])}>
          {reviewers.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select aria-label="Stance" value={stance} onChange={(event) => setStance(event.target.value as ReviewerComment["stance"])}>
          <option value="approve">Approves</option>
          <option value="change">Asks for a change</option>
        </select>
        <input aria-label="Comment" value={text} onChange={(event) => setText(event.target.value)} placeholder="Comment" />
        <button
          type="button"
          className="btn on-paper"
          disabled={!text.trim()}
          onClick={() => {
            addComment({ audience, reviewer, stance, text: text.trim() });
            setText("");
          }}
        >
          Add comment
        </button>
      </div>
    </div>
  );
}

export function PlainWorkbook() {
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

  return (
    <div className="sheet-work">
      <section id="say-it-plainly">
        <h2>Two readers, one source</h2>
        <p className="fine">
          Source: {source.title}. Both readings must keep {source.mustKeep.join(", ") || "the source figures"}
          {source.mustNotAdd.length ? ` and must not use the protocol’s ${source.mustNotAdd.join(", ")}` : ""}. Submitting a new consent regenerates both and moves the old ones to the history.
        </p>
        <p className="fine">
          Flesch Reading Ease = 206.835 − 1.015 × (words ÷ sentences) − 84.6 × (syllables ÷ words). Syllables are estimated with a vowel-group rule. Higher is easier. It is a formula, not a test with readers. Source text: {sourceEase.readingEase} (grade {sourceEase.grade}).
        </p>
        <button type="button" className="btn on-paper" onClick={() => regenerateReadings("Regenerated by a person from the current source")}>
          Regenerate both readings
        </button>
        {(["adult", "caregiver"] as const).map((audience) => {
          const text = audienceText[audience];
          const ease = readability(text);
          const checks = checkDraft(text, source);
          const holds = checks.every((check) => check.passed);
          const mine = comments.filter((comment) => comment.audience === audience);
          const approves = mine.filter((comment) => comment.stance === "approve");
          const changes = mine.filter((comment) => comment.stance === "change");
          const conflict = approves.length > 0 && changes.length > 0;
          const names = (list: ReviewerComment[]) => [...new Set(list.map((item) => item.reviewer))].join(" and ");
          const blocker = !holds
            ? "A check below fails."
            : conflict
              ? `Reviewers disagree. Approves: ${names(approves)}. Asks for a change: ${names(changes)}. Resolve it before accepting.`
              : changes.length > 0
                ? `Asks for a change: ${names(changes)}. Resolve it before accepting.`
                : "";
          const trace = traceFigures(text, source.passages);
          return (
            <article key={audience} className="fact">
              <header>
                <h3>{audience === "adult" ? "Adult reader" : "Caregiver"}</h3>
                <p className="flag">{audienceState[audience]}</p>
              </header>
              <textarea
                rows={4}
                aria-label={audience === "adult" ? "Adult reader draft" : "Caregiver draft"}
                value={text}
                onChange={(event) => setAudienceText(audience, event.target.value)}
              />
              <p className="fine">
                Reading Ease {ease.readingEase}, grade {ease.grade} ({ease.words} words, {ease.sentences} sentences).
              </p>
              <ul className="plain-list">
                {checks.map((check) => (
                  <li key={check.id}>
                    {check.label}: {check.note}
                    <span>{check.passed ? "Holds" : "Check"}</span>
                  </li>
                ))}
              </ul>
              <h4>Where each figure comes from</h4>
              <ul className="stack">
                {trace.map((item) => (
                  <li key={item.figure}>
                    <strong>{item.figure}</strong>
                    <p>{item.citation ? `${item.citation}: “${item.quote}”` : "Not found in the consent. Remove it or cite it."}</p>
                  </li>
                ))}
              </ul>
              <Comments audience={audience} />
              {blocker ? <p className="notice">{blocker}</p> : null}
              <div className="action-row">
                <button type="button" className="btn on-paper" disabled={!holds} onClick={() => setAudienceState(audience, "in-review")}>
                  Send to review
                </button>
                <button type="button" className="btn solid dark" disabled={Boolean(blocker)} onClick={() => setAudienceState(audience, "accepted")}>
                  Accept reading
                </button>
                <button type="button" className="btn on-paper" onClick={() => setAudienceState(audience, "rejected")}>
                  Reject reading
                </button>
              </div>
            </article>
          );
        })}
        <details>
          <summary>Version history ({audienceHistory.length})</summary>
          <ul className="stack">
            {audienceHistory.length === 0 ? <li>No earlier readings yet.</li> : null}
            {audienceHistory.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.audience} · was {item.state} · {new Date(item.at).toLocaleString()}
                </strong>
                <p>{item.text}</p>
                <small>{item.reason}</small>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section>
        <h2>Planted-error test</h2>
        <p>
          Caught {lab.caught} of {lab.planted} planted errors, with {lab.falseAlarms} false alarm{lab.falseAlarms === 1 ? "" : "s"} on the faithful control.
        </p>
        <ul className="stack">
          {lab.results.map((item) => (
            <li key={item.id} className={item.caught ? "pass" : "fail"}>
              <strong>
                {item.label} · {item.caught ? (item.expect ? "caught" : "passed clean") : item.expect ? "missed" : "false alarm"}
              </strong>
              <p>“{item.text}”</p>
              <small>{item.failed.map((check) => check.note).join(" ") || "No check failed."}</small>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Translation</h2>
        <p>
          English is the only reviewed language. Participants can switch the screens to machine-written Spanish (labelled as not reviewed, with the English form as the official text). This handoff asks a qualified translator to review a language.
        </p>
        {translationHandoff ? (
          <>
            <p>
              Marked ready for a {translationHandoff.language} translation reviewer on {new Date(translationHandoff.at).toLocaleString()}.
              {translationHandoff.note ? ` Note: ${translationHandoff.note}` : ""}
            </p>
            <button type="button" className="btn on-paper" onClick={() => setTranslationHandoff(null)}>
              Withdraw handoff
            </button>
          </>
        ) : (
          <div className="sheet-form">
            <select aria-label="Language" value={language} onChange={(event) => setLanguage(event.target.value)}>
              {["Spanish", "Chinese", "Vietnamese", "Arabic", "Haitian Creole"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <input aria-label="Handoff note" value={handoffNote} onChange={(event) => setHandoffNote(event.target.value)} placeholder="Note for the reviewer" />
            <button
              type="button"
              className="btn on-paper"
              onClick={() => setTranslationHandoff({ language, at: new Date().toISOString(), note: handoffNote.trim() })}
            >
              Mark ready for a translation reviewer
            </button>
          </div>
        )}
      </section>

      <TrialLaySummary />
    </div>
  );
}

/* ---------- Files and Settings ---------- */

export function ConsentElements() {
  const { consent } = useSession();
  if (!consent) return null;
  const rows = consentElements(consent.passages);
  return (
    <section id="elements">
      <h2>Required consent elements</h2>
      <p className="fine">
        21 CFR 50.25(a)(1)–(8) and (c), checked against {consent.documentId} {consent.version}. Found by key phrases in the text; a person still reads the form. This is not a regulatory review.
      </p>
      <ul className="stack">
        {rows.map((row) => (
          <li key={row.id} className={row.mark === "missing" ? "fail" : row.mark === "present" ? "pass" : ""}>
            <strong>
              {row.ref} {row.element} · {row.mark}
            </strong>
            <p>{row.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ApprovedList() {
  const { approvedVersions, setApprovedVersions } = useSession();
  const [text, setText] = useState(approvedVersions.join("\n"));

  return (
    <section>
      <h2>Approved versions</h2>
      <p className="fine">
        Enter one version per line, such as v2.1. An empty list means every version stays Unverified. Once a list is saved, participants cannot read, ask about, or check a version that is not on it. Saving this list is not an IRB approval.
      </p>
      <textarea rows={3} aria-label="Approved versions" value={text} onChange={(event) => setText(event.target.value)} />
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
        Save version list
      </button>
    </section>
  );
}

/* ---------- Questions ---------- */

export function PersonaResults() {
  const results = personaFixtures.map((fixture) => ({
    ...fixture,
    result: assessTeachback(fixture.promptId, fixture.response, teachPrompts, fixture.speaker),
    topic: teachPrompts.find((prompt) => prompt.id === fixture.promptId)?.topic ?? fixture.promptId,
  }));
  const matched = results.filter((item) => item.result.label === item.expect).length;
  return (
    <section id="personas">
      <h2>Starter-sheet personas</h2>
      <p className="fine">
        Five practice replies, one per persona the starter sheet names, run through the same check participants use. {matched} of {results.length} get the expected result.
      </p>
      <ul className="stack">
        {results.map((item) => (
          <li key={item.id} className={item.result.label === item.expect ? "pass" : "fail"}>
            <strong>
              {item.persona} · {item.topic} · {item.result.label}
            </strong>
            <p>“{item.response}”</p>
            <small>
              Expected: {item.expect}.{item.result.misconception ? ` Misunderstanding found: ${item.result.misconception}.` : ""}
              {item.speaker === "caregiver" ? " Answered as a caregiver." : ""}
              {item.result.language === "es" ? " Checked against the Spanish answer key; the handoff offers an interpreter." : ""}
            </small>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StoredHandoffs() {
  const [state, setState] = useState<"loading" | "ok" | "signed-out" | "forbidden" | "offline">("loading");
  const [items, setItems] = useState<StoredHandoff[]>([]);
  useEffect(() => {
    let live = true;
    loadHandoffs().then((result) => {
      if (!live) return;
      setState(result.state);
      setItems(result.handoffs);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section id="handoffs">
      <h2>Teach-back handoffs from participants</h2>
      {state === "loading" ? <p className="fine">Loading from the research-team service…</p> : null}
      {state === "signed-out" ? <p className="fine">Sign in with a research-team account to read handoffs.</p> : null}
      {state === "forbidden" ? <p className="fine">This account is not a research-team account.</p> : null}
      {state === "offline" ? <p className="fine">The research-team service is not reachable. Start it with npm run dev:all.</p> : null}
      {state === "ok" && items.length === 0 ? <p className="empty">No participant has sent a teach-back yet.</p> : null}
      {state === "ok" && items.length > 0 ? (
        <ul className="stack">
          {items.map((item) => (
            <li key={item.id} className={item.label === "Understands the key concept" ? "pass" : "fail"}>
              <strong>
                {item.participant} · {item.topic} · {item.label}
              </strong>
              <p>“{item.response}”</p>
              <small>
                {item.document_id} {item.version} · {new Date(`${item.created_at}Z`).toLocaleString()}
                {item.speaker === "caregiver" ? " · answered by a caregiver" : ""}
                {item.language === "es" ? " · in Spanish, needs an interpreter" : ""}
                {item.misconception ? ` · misunderstanding: ${item.misconception}` : ""}
              </small>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
