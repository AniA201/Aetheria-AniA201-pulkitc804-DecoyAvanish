import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { consentDoc, factFlagged, facts, study } from "../data/study";
import { MedicalField } from "../scene/MedicalField";
import { useSession } from "../state/Session";
import { useTitle } from "../components/Chrome";

type PanelId = "participants" | "teams" | "method" | "about" | "documents" | "privacy";

const panels: { id: PanelId; label: string }[] = [
  { id: "participants", label: "For participants" },
  { id: "teams", label: "For research teams" },
  { id: "method", label: "How it works" },
  { id: "about", label: "About" },
];

function StrikeLine({ text }: { text: string }) {
  return <span className="problem-title">{text}</span>;
}

export function Landing() {
  useTitle("Aetheria");
  const { reducedMotion, textOnly } = useSession();
  const [panel, setPanel] = useState<PanelId | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const mismatch = facts.find(factFlagged);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = cursorRef.current;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!node || !fine || reducedMotion) return;
    document.body.classList.add("has-cursor");
    const move = (event: MouseEvent) => {
      node.style.left = `${event.clientX}px`;
      node.style.top = `${event.clientY}px`;
      const target = event.target as HTMLElement | null;
      node.classList.toggle("big", Boolean(target?.closest("a, button")));
    };
    window.addEventListener("mousemove", move);
    return () => {
      document.body.classList.remove("has-cursor");
      window.removeEventListener("mousemove", move);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!panel) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  return (
    <div className="cfm">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div ref={cursorRef} id="cur" aria-hidden="true" />

      <nav aria-label="Primary">
        <div className="nav-menu">
          {panels.map((item) => (
            <button
              key={item.id}
              type="button"
              className={panel === item.id ? "active" : ""}
              onClick={() => setPanel(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div id="hero">
        {!textOnly && <MedicalField reducedMotion={reducedMotion} />}
        <div className="hero-vignette" />
        <div className="hero-text" id="content">
          <p className="hero-logo">Aetheria</p>
          <p className="hero-slogan">Understand the consent before you decide.</p>
        </div>
      </div>

      <footer>
        <ul className="ft-links">
          <li>
            <Link to="/participant">Enter the study</Link>
          </li>
          <li>
            <Link to="/team">Research view</Link>
          </li>
          <li>
            <button type="button" onClick={() => setPanel("documents")}>
              Documents
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setPanel("privacy")}>
              Privacy
            </button>
          </li>
        </ul>
      </footer>

      <div id="overlay" className={panel ? "open" : ""}>
        <button
          type="button"
          id="overlay-backdrop"
          aria-label="Close panel"
          onClick={() => setPanel(null)}
        />
        <div
          id="overlay-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="overlay-label"
          hidden={!panel}
        >
          <div id="overlay-header">
            <span id="overlay-label">
              {panel === "documents"
                ? "Documents"
                : panel === "privacy"
                  ? "Privacy"
                  : panels.find((item) => item.id === panel)?.label}
            </span>
            <button ref={closeRef} id="overlay-close" type="button" onClick={() => setPanel(null)}>
              Close
            </button>
          </div>
          <div id="overlay-body">
            {panel === "participants" && (
              <div className="modal-content">
                <p className="mc-section-label">Does this sound familiar?</p>
                <div className="problem-stack">
                  <div className="problem">
                    <StrikeLine text="The consent is long." />
                    <span className="problem-text">The important parts are hard to find.</span>
                  </div>
                  <div className="problem">
                    <StrikeLine text="The language is technical." />
                    <span className="problem-text">A shorter reading should not change the facts.</span>
                  </div>
                  <div className="problem">
                    <StrikeLine text="A yes is not understanding." />
                    <span className="problem-text">People need room to ask, and to try again.</span>
                  </div>
                </div>
                <div className="bridge">
                  <p>
                    You are not expected to decode a protocol alone. Aetheria reads the selected
                    consent with you, keeps the original paragraph in view, and leaves the decision
                    with you and the research team.
                  </p>
                </div>
                <div className="benefit-list">
                  <article>
                    <span>01</span>
                    <div>
                      <em>Plain language</em>
                      <strong>Five sections of the form</strong>
                      <p>Procedures, risks, rights, costs, and privacy, each beside its source.</p>
                    </div>
                  </article>
                  <article>
                    <span>02</span>
                    <div>
                      <em>Questions</em>
                      <strong>Answers from the page</strong>
                      <p>If the form does not say, Aetheria says so and points you to a person.</p>
                    </div>
                  </article>
                  <article>
                    <span>03</span>
                    <div>
                      <em>Teach-back</em>
                      <strong>What still needs a conversation</strong>
                      <p>Not a score. Not a signature. A list of ideas to revisit.</p>
                    </div>
                  </article>
                </div>
                <Link className="btn-a" to="/participant">
                  Enter the demo study
                </Link>
              </div>
            )}

            {panel === "teams" && (
              <div className="modal-content">
                <p className="opening">A difference should show both sentences.</p>
                <p className="body-copy">
                  {study.sponsor} and {study.product} are fictional. In this pair, the protocol and
                  the consent do not agree on clinic visits. The review screen shows both passages
                  and waits for a person. It does not decide which document is correct.
                </p>
                {mismatch && (
                  <div className="evidence-row">
                    <div>
                      <em>Protocol · {mismatch.protocolValue}</em>
                      <p>{mismatch.protocolQuote}</p>
                      <small>{mismatch.protocolSource}</small>
                    </div>
                    <div>
                      <em>Consent · {mismatch.consentValue}</em>
                      <p>{mismatch.consentQuote}</p>
                      <small>{mismatch.consentSource}</small>
                    </div>
                  </div>
                )}
                <div className="benefit-list">
                  <article>
                    <span>01</span>
                    <div>
                      <em>Document integrity</em>
                      <strong>Seeded mismatches, labeled as such</strong>
                      <p>Visit count, duration, and payment differ. Blood volume and retention do not.</p>
                    </div>
                  </article>
                  <article>
                    <span>02</span>
                    <div>
                      <em>Plain language</em>
                      <strong>A draft that keeps the consent’s numbers</strong>
                      <p>Accepting a rewrite does not change the source document.</p>
                    </div>
                  </article>
                  <article>
                    <span>03</span>
                    <div>
                      <em>Test lab</em>
                      <strong>Checks you can run</strong>
                      <p>Citations, refusals, teach-back, and the planted mismatch are counted from the run.</p>
                    </div>
                  </article>
                </div>
                <Link className="btn-a" to="/team">
                  Open the research view
                </Link>
              </div>
            )}

            {panel === "method" && (
              <div className="modal-content">
                <p className="mc-section-label">How it works</p>
                <ol className="steps">
                  <li>
                    <span>01</span>
                    <div>
                      <h3>Read the selected form</h3>
                      <p>
                        {consentDoc.id} {consentDoc.version} is the document in the reader. Its
                        approval status stays {consentDoc.status.toLowerCase()} until a real version
                        list is supplied.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <h3>Ask from that page</h3>
                      <p>
                        A question is matched to a section of the consent. The answer shows the
                        original clause. A dose, an approval, or a cure is not invented.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <h3>Hand the rest to a person</h3>
                      <p>
                        Teach-back names what is still missing. The research view keeps the protocol
                        and the consent side by side.
                      </p>
                    </div>
                  </li>
                </ol>
                <Link className="btn-a" to="/participant/explore/procedures">
                  Start at the first section
                </Link>
              </div>
            )}

            {panel === "about" && (
              <div className="modal-content">
                <h2 className="about-heading">A reading room for one consent form.</h2>
                <p className="body-copy">
                  Aetheria is a synthetic demo of study {study.id}, a fictional {study.phase.toLowerCase()}{" "}
                  look at {study.product} for {study.name.toLowerCase()}. It is not a trial you can
                  join, and it is not medical advice.
                </p>
                <p className="body-copy">
                  The illustrated field is the way in. The consent text stays in the page, in a
                  normal reading layout, with a text-only mode and a larger type size. Nothing in
                  this preview is sent to an outside model or voice service.
                </p>
                <p className="body-copy">
                  Teach-back does not certify that someone understood or consented. A coordinator
                  still has the conversation.
                </p>
              </div>
            )}

            {panel === "documents" && (
              <div className="modal-content">
                <p className="mc-section-label">Selected for this demo</p>
                <ul className="doc-list">
                  <li>
                    <strong>
                      {consentDoc.id} {consentDoc.version}
                    </strong>
                    <span>
                      Consent form · {consentDoc.date} · {consentDoc.status}
                    </span>
                  </li>
                  <li>
                    <strong>PROT-AETHER-01 v3.0</strong>
                    <span>Protocol · 2 March 2026 · Unverified</span>
                  </li>
                  <li>
                    <strong>ICF-AETHER-01 v2.0</strong>
                    <span>Earlier consent draft · Outdated</span>
                  </li>
                </ul>
                <p className="body-copy">{consentDoc.statusNote}</p>
                <Link className="btn-a" to="/team/documents">
                  Open the version list
                </Link>
              </div>
            )}

            {panel === "privacy" && (
              <div className="modal-content">
                <p className="opening">This preview keeps the session in the browser.</p>
                <p className="body-copy">
                  Saved questions, teach-back replies, and review marks stay in this browser session.
                  They are not uploaded. The listen control, when the browser allows it, uses the
                  device speech engine. ElevenLabs is not connected.
                </p>
                <p className="body-copy">
                  Do not enter a real name, a real medical history, or a real consent form. The study
                  on screen is synthetic.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
