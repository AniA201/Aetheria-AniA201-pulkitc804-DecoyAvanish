import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AetheriaMark, useTitle } from "../components/Chrome";
import { consentDoc, facts, sections } from "../data/study";
import { MedicalField } from "../scene/MedicalField";
import { LandingWordShatter } from "../scene/LandingWordShatter";
import { useSession } from "../state/Session";

const wordFlights = [
  [-0.43, -0.34, -0.54], [-0.31, 0.31, 0.37], [-0.19, -0.42, -0.32],
  [-0.06, 0.43, 0.47], [0.15, -0.39, -0.43], [0.28, 0.29, 0.39],
  [0.41, -0.31, -0.35], [0.52, 0.36, 0.42],
] as const;

const index = [
  { id: "read", number: "01", label: "Read" },
  { id: "ask", number: "02", label: "Ask" },
  { id: "teach", number: "03", label: "Feedback" },
  { id: "review", number: "04", label: "Review" },
];

const backgroundQuotes = {
  read: ["Original words stay visible", "6 clinic visits", "About 16 weeks", "Two hours each", "What does this mean?", "Check the page"],
  ask: ["Can I leave later?", "Who pays for travel?", "Who sees my records?", "What about side effects?", "Is any benefit promised?", "Where does it say that?"],
  feedback: ["Assigned by chance", "Aetherol or placebo?", "No promised benefit", "Say it your way", "What is still unclear?", "Ask the study team"],
  review: ["6 visits / 8 visits", "16 weeks / 24 weeks", "$50 / $80 per visit", "Which count is right?", "Check the original", "Resolve before using"],
};

const sectionHighlights = {
  read: ["See the original text.", "Read a short explanation.", "Check the page number."],
  ask: ["Ask about visits.", "Ask about risks.", "Save the answer."],
  feedback: ["Explain it in your words.", "Find what needs clarity.", "Ask a person for help."],
  review: ["Compare key details.", "Spot a mismatch.", "Resolve it before using."],
};

function BackgroundQuotes({ quotes }: { quotes: readonly string[] }) {
  return (
    <div className="folio-background-quotes" aria-label="Study form prompts">
      {quotes.map((quote) => (
        <button className="folio-background-quote" key={quote} type="button" aria-label={`Highlight: ${quote}`}>
          “{quote}”
        </button>
      ))}
    </div>
  );
}

function SectionHighlights({ items }: { items: readonly string[] }) {
  return (
    <ul className="section-highlights" aria-label="What you can do">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export function Landing() {
  useTitle("Aetheria");
  const { reducedMotion, textOnly } = useSession();
  const progressRef = useRef(0);
  const selectedPaperRef = useRef(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const quiet = reducedMotion || textOnly;
  const [menu, setMenu] = useState(false);
  const [veil, setVeil] = useState(!quiet);
  const [chapter, setChapter] = useState(0);
  const [shatterProgress, setShatterProgress] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onScroll = () => {
      const distance = Math.max(root.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, (window.scrollY - root.offsetTop) / distance));
      progressRef.current = progress;
      root.style.setProperty("--stage-opacity", "1");
      const position = window.scrollY + window.innerHeight * 0.42;
      const next = index.reduce((active, item, itemIndex) => {
        const section = document.getElementById(item.id);
        return section && section.offsetTop <= position ? itemIndex : active;
      }, -1);
      selectedPaperRef.current = next;
      setChapter((current) => (current === next ? current : next));
      const wordTop = wordRef.current?.getBoundingClientRect().top ?? window.innerHeight;
      const start = window.innerHeight * 0.76;
      const travel = window.innerHeight * 1.15;
      const nextShatter = quiet ? 0 : Math.min(1, Math.max(0, (start - wordTop) / travel));
      setShatterProgress((current) => Math.abs(current - nextShatter) < 0.003 ? current : nextShatter);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [quiet]);

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
          <p>Study documents</p>
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
            <em>Clinical study documents</em>
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
              Sign in to read
            </Link>
            <Link to="/login?as=researcher" onClick={() => setMenu(false)}>
              Researcher login
            </Link>
            <Link to="/register" onClick={() => setMenu(false)}>
              Create account
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
          <p ref={wordRef} className="folio-word" aria-hidden="true">{"Aetheria".split("").map((letter, index) => {
            const [dx, dy, spin] = wordFlights[index];
            const flight = Math.max(0, Math.min(1, (shatterProgress - index * 0.025) / (1 - index * 0.025)));
            return <span key={`${letter}-${index}`} style={quiet ? undefined : {
              transform: `translate3d(${dx * flight * 100}vw, ${dy * flight * 100}vh, 0) rotate(${spin * flight}rad) scale(${1 - flight * 0.2})`,
              opacity: 1 - flight * 0.92,
              filter: `blur(${flight * 1.6}px)`,
            }}>{letter}</span>;
          })}</p>
          {!quiet && <LandingWordShatter progress={shatterProgress} wordRef={wordRef} />}
          <p className="folio-kicker">Clinical study documents</p>
          <h1>Long forms. Plain words.</h1>
          <p className="folio-lede">
            Long study forms are hard to read. Aetheria puts a shorter explanation beside the original text, with sources you can check. Ask about visits, risks, costs, or privacy before you decide.
          </p>
          <p className="folio-vertical">ICF-AETHER-01</p>
          <div className="folio-hero-actions">
            <Link className="folio-preview" to="/login?as=participant">
              <span className="folio-preview-sheet" aria-hidden="true">
                <span className="folio-preview-eyebrow">AETHER-01 / STUDY FORM</span>
                <strong>Study form</strong>
                <i />
                <i />
                <i />
                <span className="folio-preview-signature">Your copy · 05 sections</span>
              </span>
              <span>
                Your study form
                <em>Sign in to upload →</em>
              </span>
            </Link>
            <a className="folio-try" href="#read">See the sample <span aria-hidden="true">↗</span></a>
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
          <BackgroundQuotes quotes={backgroundQuotes.read} />
          <p className="folio-section-label">01 / Read</p>
          <h2>Read.</h2>
          <SectionHighlights items={sectionHighlights.read} />
          <p className="sr-only">Read each part of the consent form beside a shorter, plain-language explanation. The original words and page citation stay in view.</p>
        </section>

        <section className="folio-chapters" id="ask">
          <BackgroundQuotes quotes={backgroundQuotes.ask} />
          <div className="folio-chapter-head">
            <p className="folio-section-label">02 / Ask</p>
            <h2>Ask.</h2>
          </div>
          <SectionHighlights items={sectionHighlights.ask} />
          <p className="sr-only">{sections.map((section) => `${section.ask} ${section.plain} Source: ${section.citation}, ${section.page}.`).join(" ")}</p>
        </section>

        <section className="folio-split folio-teach" id="teach">
          <BackgroundQuotes quotes={backgroundQuotes.feedback} />
          <p className="folio-section-label">03 / Feedback</p>
          <h2>Feedback.</h2>
          <SectionHighlights items={sectionHighlights.feedback} />
          <p className="sr-only">You cannot choose your study group. The sample form says chance assigns Aetherol or placebo. Neither you nor the study doctor knows your group during the study. Source: {sections[0].citation}, {sections[0].page}.</p>
        </section>

        <section className="folio-review" id="review">
          <BackgroundQuotes quotes={backgroundQuotes.review} />
          <p className="folio-section-label">04 / Review</p>
          <h2>Review.</h2>
          <SectionHighlights items={sectionHighlights.review} />
          <p className="sr-only">{facts.filter((fact) => fact.kind === "confirmed-textual-difference").map((fact) => `${fact.label}: consent says ${fact.consentValue}; study plan says ${fact.protocolValue}.`).join(" ")}</p>
        </section>

        <section className="folio-close">
          <Link className="folio-pill" to="/login?as=participant">
            Sign in to read
          </Link>
          <p>
            The sample is fictional. Aetheria does not collect a signature or make a medical decision.
          </p>
        </section>
      </main>
    </div>
  );
}
