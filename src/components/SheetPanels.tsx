import { useState } from "react";
import { useSession } from "../state/Session";
import {
  annexV,
  briefSections,
  burden,
  checklist,
  checklistCounts,
  contentBlocks,
  importsProtocolFigures,
  keepsConsentFigures,
  proposeVisitCount,
  readingEase,
  versionNote,
} from "../lib/workbook";

export function VersionStanding({ version }: { version: string }) {
  const { approvedVersions } = useSession();
  return <p className="fine">{versionNote(version, approvedVersions)}</p>;
}

export function CompareWorkbook() {
  const { lineDecisions, decideLine, briefDecisions, decideBrief, publicStudyId, setPublicStudyId } = useSession();
  const counts = checklistCounts();
  const lines = proposeVisitCount("7");

  return (
    <div className="sheet-work">
      <section>
        <h2>Shared blocks</h2>
        <p className="fine">
          Each fact is written once. The protocol sentence, the consent sentence, and the plain-language line point at the same block. Nothing here edits the source files.
        </p>
        {contentBlocks.map((block) => (
          <article key={block.id} className="fact">
            <header>
              <h3>{block.label}</h3>
              <p className="flag">
                {block.owner} · {block.version}
              </p>
            </header>
            <p>{block.value}</p>
            <ul className="stack">
              {block.uses.map((use) => (
                <li key={use.id}>
                  <strong>{use.place}</strong>
                  <p>{use.text}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section>
        <h2>Propose one change</h2>
        <p className="fine">
          Practice proposal: set the visit count to 7 everywhere it is reused. Accepting a line records a decision. It does not change the protocol or the consent file.
        </p>
        {lines.map((line) => (
          <article key={line.id} className="fact">
            <h3>{line.place}</h3>
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
            <div className="action-row">
              <button type="button" className="btn on-paper" onClick={() => decideLine(line.id, "accepted")}>
                {lineDecisions[line.id] === "accepted" ? "Accepted" : "Accept this line"}
              </button>
              <button type="button" className="btn on-paper" onClick={() => decideLine(line.id, "rejected")}>
                {lineDecisions[line.id] === "rejected" ? "Rejected" : "Reject this line"}
              </button>
            </div>
          </article>
        ))}
      </section>

      <section>
        <h2>Protocol checklist</h2>
        <p className="fine">
          {counts.present} present, {counts.thin} thin, {counts.missing} missing in the practice protocol. This is not a score and not an approval.
        </p>
        <ul className="stack">
          {checklist.map((row) => (
            <li key={row.id}>
              <strong>
                {row.list} · {row.item} · {row.mark}
              </strong>
              <p>{row.why}</p>
              <small>{row.where}</small>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Inside the protocol</h2>
        <ul className="stack">
          <li>
            <strong>Duration agrees with the last visit</strong>
            <p>The practice protocol says 24 weeks and a last clinic visit at week 24. Those two sentences match each other.</p>
          </li>
          <li>
            <strong>No endpoint to cross-check</strong>
            <p>The practice protocol has no endpoint, so a missing week-24 measurement is not invented.</p>
          </li>
          <li>
            <strong>Consent does not match the protocol</strong>
            <p>Visits, length, and payment still disagree with the consent. Those flags stay above. Blood volume and record retention match.</p>
          </li>
        </ul>
      </section>

      <section>
        <h2>Time on study</h2>
        <p>{burden.assumption}</p>
        <p>{burden.note}</p>
      </section>

      <section>
        <h2>Public trials</h2>
        <label htmlFor="public-study">ClinicalTrials.gov id, if you have one</label>
        <input
          id="public-study"
          value={publicStudyId}
          onChange={(event) => setPublicStudyId(event.target.value)}
          placeholder="Not loaded"
        />
        <p className="fine">
          {publicStudyId.trim()
            ? `${publicStudyId.trim()} is only a name you typed. This demo does not download that record. Bring the protocol file if you want it checked beside the practice pair.`
            : "No public study is loaded. The checklist above is only the practice protocol."}
        </p>
      </section>

      <section>
        <h2>Design brief</h2>
        <p className="fine">A short outline from the practice pair. Accepting a section does not approve a protocol.</p>
        {briefSections.map((section) => (
          <article key={section.id} className="fact">
            <h3>{section.heading}</h3>
            <p>{section.draft}</p>
            <small>{section.precedent}</small>
            <div className="action-row">
              <button type="button" className="btn on-paper" onClick={() => decideBrief(section.id, "accepted")}>
                {briefDecisions[section.id] === "accepted" ? "Accepted" : "Accept section"}
              </button>
              <button type="button" className="btn on-paper" onClick={() => decideBrief(section.id, "rejected")}>
                {briefDecisions[section.id] === "rejected" ? "Rejected" : "Reject section"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export function PlainWorkbook() {
  const { audienceText, audienceState, setAudienceText, setAudienceState } = useSession();
  const [handoff, setHandoff] = useState(false);

  return (
    <div className="sheet-work">
      <section>
        <h2>Two readers, one source</h2>
        <p className="fine">
          Both readings have to keep 6 times, about 16 weeks, and $50. Accepting one does not change the source or the other reading. Replacing the consent file marks them stale.
        </p>
        {(["adult", "caregiver"] as const).map((audience) => {
          const text = audienceText[audience];
          const ease = readingEase(text);
          const holds = keepsConsentFigures(text) && !importsProtocolFigures(text);
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
                About {ease.wordsPerSentence} words a sentence · {ease.label}. This is a sentence-length estimate, not a test with a reader.
              </p>
              <p className="fine">{holds ? "The consent figures are still in this reading." : "This reading drops a consent figure or adds a protocol figure."}</p>
              <ul className="stack">
                {["6 times", "16 weeks", "$50"].map((token) => (
                  <li key={token}>
                    <strong>{token}</strong>
                    <p>{text.includes(token) ? `Traced to the consent clause that says “${token}”.` : "Missing from this reading."}</p>
                  </li>
                ))}
              </ul>
              <div className="action-row">
                <button type="button" className="btn on-paper" disabled={!holds} onClick={() => setAudienceState(audience, "in-review")}>
                  Send to review
                </button>
                <button type="button" className="btn solid dark" disabled={!holds} onClick={() => setAudienceState(audience, "accepted")}>
                  Accept reading
                </button>
                <button type="button" className="btn on-paper" onClick={() => setAudienceState(audience, "rejected")}>
                  Reject reading
                </button>
              </div>
            </article>
          );
        })}
      </section>
      <section>
        <h2>Translation</h2>
        <p>English is the only reviewed language. A translation is not generated here.</p>
        <button type="button" className="btn on-paper" onClick={() => setHandoff(true)}>
          {handoff ? "Marked ready for a reviewer" : "Mark ready for a translation reviewer"}
        </button>
      </section>
      <section>
        <h2>Lay summary of results</h2>
        <p className="fine">These are the ten headings a results summary has to cover. This practice study has no results, so every heading stays empty.</p>
        <ul className="stack">
          {annexV.map((row) => (
            <li key={row.id}>
              <strong>{row.element}</strong>
              <p>{row.state}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function RegistryCard() {
  return (
    <section>
      <h2>Registry card</h2>
      <p className="fine">Assembled from the same blocks as the protocol and the consent. Where they disagree, both values stay.</p>
      <ul className="stack">
        {contentBlocks.map((block) => (
          <li key={block.id}>
            <strong>{block.label}</strong>
            <p>{block.value}</p>
            <small>
              {block.owner} · block {block.version}
            </small>
          </li>
        ))}
        <li>
          <strong>Blood volume</strong>
          <p>about 2 teaspoons in both documents</p>
        </li>
        <li>
          <strong>Records kept</strong>
          <p>15 years in both documents</p>
        </li>
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
        Enter one version per line, such as v2.1. An empty list means every version stays Unverified. Saving this list is not an IRB approval.
      </p>
      <textarea
        rows={3}
        aria-label="Approved versions"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
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
