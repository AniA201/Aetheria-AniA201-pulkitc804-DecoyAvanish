import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AetheriaMark, useTitle } from "../components/Chrome";
import { consentDoc, facts, sections } from "../data/study";
import { MedicalField } from "../scene/MedicalField";
import { useSession } from "../state/Session";

const index = [
  { id: "read", number: "01", label: "Read" },
  { id: "ask", number: "02", label: "Ask" },
  { id: "teach", number: "03", label: "Feedback" },
  { id: "review", number: "04", label: "Review" },
];

export function Landing() {
  useTitle("Aetheria");
  const { reducedMotion, textOnly } = useSession();
  const progressRef = useRef(0);
  const selectedPaperRef = useRef(-1);
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
      const fade = Math.min(1, Math.max(0, (progress - 0.12) / 0.26));
      root.style.setProperty("--stage-opacity", String(1 - 0.04 * fade * fade * (3 - 2 * fade)));
      const position = window.scrollY + window.innerHeight * 0.42;
      const next = index.reduce((active, item, itemIndex) => {
        const section = document.getElementById(item.id);
        return section && section.offsetTop <= position ? itemIndex : active;
      }, -1);
      selectedPaperRef.current = next;
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
    const root = rootRef.current;
    if (!root || quiet) return;
    const sectionsToReveal = root.querySelectorAll<HTMLElement>(".folio-split, .folio-chapters, .folio-review");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -12% 0px" });
    root.classList.add("has-motion-reveal");
    sectionsToReveal.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      root.classList.remove("has-motion-reveal");
    };
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
          <AetheriaMark />
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
          <AetheriaMark />
          <span>
            <strong>Aetheria</strong>
            <em>Informed consent</em>
          </span>
        </Link>
        <nav aria-label="Sections">
          {index.map((item) => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="folio-nav-end">
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

      {!textOnly && (
        <div className="story-stage" aria-hidden="true">
          <MedicalField reducedMotion={reducedMotion} progressRef={progressRef} selectedPaperRef={selectedPaperRef} />
        </div>
      )}

      <main id="content">
        <section className="folio-hero">
          <p className="folio-word" aria-hidden="true">Aetheria</p>
          <p className="folio-kicker">Know what you are agreeing to</p>
          <h1>Know before you sign.</h1>
          <p className="folio-lede">
            Upload a consent form to read its original wording beside clear explanations. Ask about anything uncertain.
          </p>
          <p className="folio-vertical">ICF-AETHER-01</p>
          <div className="folio-hero-actions">
            <Link className="folio-preview" to="/login?as=participant">
              <span className="folio-preview-sheet" aria-hidden="true">
                <span className="folio-preview-eyebrow">AETHER-01 / CONSENT</span>
                <strong>Informed consent</strong>
                <i />
                <i />
                <i />
                <span className="folio-preview-signature">Your copy · 05 sections</span>
              </span>
              <span>
                Submit a form
                <em>Start reading →</em>
              </span>
            </Link>
            <a className="folio-try" href="#read">Explore the sample <span aria-hidden="true">↗</span></a>
          </div>
          <nav className="folio-index" aria-label="Explore Aetheria">
            {index.map((item, itemIndex) => (
              <a key={item.id} href={`#${item.id}`} aria-current={chapter === itemIndex ? "true" : undefined}>
                <b>{item.number}</b>
                {item.label}
              </a>
            ))}
          </nav>
        </section>

        <section className="folio-split" id="read">
          <p className="folio-section-label">01 / Read</p>
          <h2>Read.</h2>
          <p className="folio-motto">“Keep the original close.”</p>
          <p className="sr-only">The sample consent form says six clinic visits. The study plan says eight. Compare the original wording before relying on either number.</p>
        </section>

        <section className="folio-chapters" id="ask">
          <div className="folio-chapter-head">
            <p className="folio-section-label">02 / Ask</p>
            <h2>Ask.</h2>
          </div>
          <p className="folio-motto">“Ask before you sign.”</p>
          <p className="sr-only">{sections.map((section) => `${section.ask} ${section.plain} Source: ${section.citation}, ${section.page}.`).join(" ")}</p>
        </section>

        <section className="folio-split folio-teach" id="teach">
          <p className="folio-section-label">03 / Feedback</p>
          <h2>Feedback.</h2>
          <p className="folio-motto">“Say it in your words.”</p>
          <p className="sr-only">You cannot choose your study group. The sample form says chance assigns Aetherol or placebo. Neither you nor the study doctor knows your group during the study. Source: {sections[0].citation}, {sections[0].page}.</p>
        </section>

        <section className="folio-review" id="review">
          <p className="folio-section-label">04 / Review</p>
          <h2>Review.</h2>
          <p className="folio-motto">“Check the differences.”</p>
          <p className="sr-only">{facts.filter((fact) => fact.kind === "confirmed-textual-difference").map((fact) => `${fact.label}: consent says ${fact.consentValue}; study plan says ${fact.protocolValue}.`).join(" ")}</p>
        </section>

        <section className="folio-close">
          <Link className="folio-pill" to="/login?as=participant">
            Begin the reading
          </Link>
          <p>
            The included sample uses fictional names. This is not medical advice, and it is not a signed
            consent.
          </p>
        </section>
      </main>
    </div>
  );
}
