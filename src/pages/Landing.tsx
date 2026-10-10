import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AetheriaMark, useTitle } from "../components/Chrome";
import { consentDoc, sections } from "../data/study";
import { MedicalField } from "../scene/MedicalField";
import { useSession } from "../state/Session";

const index = [
  { id: "read", number: "01", label: "Read" },
  { id: "ask", number: "02", label: "Ask" },
  { id: "teach", number: "03", label: "Teach-back" },
  { id: "review", number: "04", label: "Review" },
];

export function Landing() {
  useTitle("Aetheria");
  const { reducedMotion, textOnly } = useSession();
  const progressRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const quiet = reducedMotion || textOnly;
  const [menu, setMenu] = useState(false);
  const [veil, setVeil] = useState(!quiet);
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onScroll = () => {
      const distance = Math.max(root.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, (window.scrollY - root.offsetTop) / distance));
      progressRef.current = progress;
      const next = progress < 0.22 ? 0 : progress < 0.48 ? 1 : progress < 0.72 ? 2 : 3;
      setChapter((current) => (current === next ? current : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (quiet) return;
    const timer = window.setTimeout(() => setVeil(false), 1200);
    return () => window.clearTimeout(timer);
  }, [quiet]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <div className={quiet ? "story is-quiet" : "story"} ref={rootRef}>
      <a className="skip" href="#content">
        Skip to content
      </a>

      {veil && (
        <div className="veil" aria-hidden="true">
          <span className="folio-seal" />
          <p>Informed consent</p>
          <div className="veil-rule">
            <span />
          </div>
          <p className="veil-meta">
            <span>Opening the form</span>
            <span>{consentDoc.id}</span>
          </p>
        </div>
      )}

      <header className="folio-nav">
        <Link to="/" className="folio-brand">
          <span className="folio-seal" aria-hidden="true" />
          <span>
            <strong>Aetheria</strong>
            <em>Informed consent</em>
          </span>
        </Link>
        <nav aria-label="Enter">
          {index.map((item) => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="folio-nav-end">
          <Link to="/" className="corner-mark" aria-label="Aetheria">
            <AetheriaMark />
          </Link>
          <button
            type="button"
            className="folio-menu"
            aria-expanded={menu}
            aria-controls="folio-overlay"
            onClick={() => setMenu((open) => !open)}
          >
            {menu ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      {menu && (
        <div className="folio-overlay" id="folio-overlay" role="dialog" aria-label="Menu">
          <nav>
            {index.map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={() => setMenu(false)}>
                <span>{item.number}</span>
                {item.label}
              </a>
            ))}
            <Link to="/login?as=participant" onClick={() => setMenu(false)}>
              Start reading
            </Link>
            <Link to="/login?as=researcher" onClick={() => setMenu(false)}>
              Researcher login
            </Link>
            <Link to="/register" onClick={() => setMenu(false)}>
              Get started
            </Link>
          </nav>
        </div>
      )}

      <p className="folio-word" aria-hidden="true">
        Aetheria
      </p>
      {!textOnly && (
        <div className="story-stage" aria-hidden="true">
          <MedicalField reducedMotion={reducedMotion} progressRef={progressRef} />
        </div>
      )}

      <main id="content">
        <section className="folio-hero">
          <p className="folio-kicker">Chapter 00 — The form</p>
          <h1>Understand the consent before you decide.</h1>
          <p className="folio-lede">
            Submit a consent form and read it with the original wording still in view. Aetheria explains,
            answers, and checks understanding. It does not sign.
          </p>
          <p className="folio-vertical">ICF-AETHER-01</p>
          <Link className="folio-preview" to="/login?as=participant">
            <span className="folio-preview-sheet" aria-hidden="true" />
            <span>
              Start
              <em>Submit a form</em>
            </span>
          </Link>
          <nav className="folio-index" aria-label="Chapters">
            {index.map((item, itemIndex) => (
              <a key={item.id} href={`#${item.id}`} aria-current={chapter === itemIndex ? "true" : undefined}>
                <b>{item.number}</b>
                {item.label}
              </a>
            ))}
          </nav>
        </section>

        <section className="folio-split" id="read">
          <h2>A yes is not understanding.</h2>
          <div>
            <p>
              Consent forms are long, and “Do you understand?” often gets a yes when the important
              parts were missed. The same facts are also rewritten by hand across the protocol and
              the consent.
            </p>
            <p>Aetheria keeps both sentences visible. A shorter reading cannot change a number.</p>
            <Link className="folio-link" to="/login?as=participant">
              Open the form
            </Link>
          </div>
        </section>

        <section className="folio-facts" aria-label="Document facts">
          <article>
            <b>05</b>
            <span>Chapters</span>
          </article>
          <article>
            <b>{consentDoc.version}</b>
            <span>Consent in the reader</span>
          </article>
          <article>
            <b>12 Mar</b>
            <span>2026</span>
          </article>
          <article>
            <b>{consentDoc.status}</b>
            <span>Unverified without an approval list</span>
          </article>
        </section>

        <section className="folio-chapters" id="ask">
          <div className="folio-chapter-head">
            <h2>Five chapters. One source.</h2>
            <p>
              Each chapter keeps the original clause beside a shorter reading. The citation stays
              attached. Answers come only from this form.
            </p>
          </div>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <span>{section.index}</span>
                <h3>{section.title}</h3>
                <p>{section.short}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="folio-split folio-teach" id="teach">
          <h2>Explain it in your own words.</h2>
          <div>
            <p>
              Teach-back asks about randomization, withdrawal, and risks. “I consent” is not
              understanding. “I don’t know” is a reason for a person to follow up.
            </p>
            <ul>
              <li>Understands the key concept</li>
              <li>Partially understands</li>
              <li>Needs clarification</li>
              <li>Requires human follow-up</li>
            </ul>
            <p className="folio-aside">The summary is a handoff. It is not a consent certificate.</p>
          </div>
        </section>

        <section className="folio-review" id="review">
          <h2>Both sentences, side by side.</h2>
          <p>
            When the included sample is loaded, its protocol and consent disagree on visits, duration,
            and payment. Aetheria shows both passages and does not decide which one is right. A consent
            submitted without a protocol is not given invented flags.
          </p>
          <dl>
            <div>
              <dt>Visits</dt>
              <dd>Protocol 8 · Consent 6</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>Protocol 24 weeks · Consent about 16 weeks</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>Protocol $80 · Consent $50</dd>
            </div>
          </dl>
          <p className="folio-aside">
            Blood volume and how long records are kept match. Accepting a plain-language draft does
            not change the source.
          </p>
        </section>

        <section className="folio-close">
          <Link className="folio-pill" to="/login?as=participant">
            Begin the reading
          </Link>
          <p>
            The included sample uses fictional names. This is not medical advice, and it is not a signed
            consent.
          </p>
          <footer>
            <div>
              <h3>Chapters</h3>
              <ul>
                {sections.map((section) => (
                  <li key={section.id}>{section.title}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Practice</h3>
              <ul>
                <li>Read with the original clause</li>
                <li>Ask only from the form</li>
                <li>Teach it back</li>
                <li>Compare both documents</li>
              </ul>
            </div>
            <div>
              <h3>Enter</h3>
              <ul>
                <li>
                  <Link to="/login?as=participant">Start reading</Link>
                </li>
                <li>
                  <Link to="/login?as=researcher">Researcher login</Link>
                </li>
                <li>
                  <Link to="/register">Get started</Link>
                </li>
              </ul>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
