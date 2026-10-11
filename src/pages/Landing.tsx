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
  { id: "evaluation", number: "03", label: "Evaluation" },
  { id: "review", number: "04", label: "Review" },
];

const backgroundQuotes = {
  read: ["Original words stay visible", "6 clinic visits", "About 16 weeks", "Two hours each", "What does this mean?", "Check the page"],
  ask: ["Can I leave later?", "Who pays for travel?", "Who sees my records?", "What about side effects?", "Is any benefit promised?", "Where does it say that?"],
  evaluation: ["Assigned by chance", "Aetherol or placebo?", "No promised benefit", "Say it your way", "What is still unclear?", "Ask the study team"],
  review: ["6 visits / 8 visits", "16 weeks / 24 weeks", "$50 / $80 per visit", "Which count is right?", "Check the original", "Resolve before using"],
};

const sectionHighlights = {
  read: ["See the original text.", "Read a short explanation.", "Check the page number."],
  ask: ["Ask about visits.", "Ask about risks.", "Save the answer."],
  evaluation: ["Explain it in your words.", "Find what needs clarity.", "Ask a person for help."],
  review: ["Compare key details.", "Spot a mismatch.", "Resolve it before using."],
};

type TransferKey = "read" | "ask" | "evaluation" | "review";
type LetterPath = { x0: number; y0: number; x1: number; y1: number; size0: number; size1: number };

// The title has one visible R. Its second flight is a deliberate afterimage so
// the word can branch into both Read and Review as the page opens.
const letterTransfers: Array<{ key: TransferKey; sourceIndex: number; lower: string; upper: string; phase: number; sectionIndex: number }> = [
  { key: "read", sourceIndex: 5, lower: "r", upper: "R", phase: 0, sectionIndex: 0 },
  { key: "ask", sourceIndex: 0, lower: "a", upper: "A", phase: 1.6, sectionIndex: 1 },
  { key: "evaluation", sourceIndex: 4, lower: "e", upper: "E", phase: 3.1, sectionIndex: 2 },
  { key: "review", sourceIndex: 5, lower: "r", upper: "R", phase: 4.7, sectionIndex: 3 },
];

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
  const shatterProgressRef = useRef(0);
  const selectedPaperRef = useRef(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const transferTargets = useRef<Partial<Record<TransferKey, HTMLSpanElement>>>({});
  const quiet = reducedMotion || textOnly;
  const [menu, setMenu] = useState(false);
  const [veil, setVeil] = useState(!quiet);
  const [chapter, setChapter] = useState(0);
  const [shatterProgress, setShatterProgress] = useState(0);
  const [shatterTarget, setShatterTarget] = useState(0);
  const [letterPaths, setLetterPaths] = useState<Partial<Record<TransferKey, LetterPath>>>({});
  const [letterProgress, setLetterProgress] = useState<Partial<Record<TransferKey, number>>>({});

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
      // Keep each letter on screen long enough for its helix path to read as a
      // transition, rather than as a brief flash during a fast scroll.
      const travel = window.innerHeight * 2.15;
      const nextShatter = quiet ? 0 : Math.min(1, Math.max(0, (start - wordTop) / travel));
      setShatterTarget((current) => Math.abs(current - nextShatter) < 0.0005 ? current : nextShatter);
      const main = mainRef.current;
      const word = wordRef.current;
      if (word && main) {
        const wordStyle = getComputedStyle(word);
        const mainBounds = main.getBoundingClientRect();
        const spans = word.querySelectorAll("span");
        const nextPaths: Partial<Record<TransferKey, LetterPath>> = {};
        const nextProgress: Partial<Record<TransferKey, number>> = {};
        const flightStart = word.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.76;
        letterTransfers.forEach((spec) => {
          const source = spans[spec.sourceIndex];
          const target = transferTargets.current[spec.key];
          if (!source || !target) return;
          const start = source.getBoundingClientRect();
          const end = target.getBoundingClientRect();
          nextPaths[spec.key] = {
            x0: start.left - mainBounds.left,
            y0: start.top - mainBounds.top,
            x1: end.left - mainBounds.left,
            y1: end.top - mainBounds.top,
            size0: Number.parseFloat(wordStyle.fontSize),
            size1: Number.parseFloat(getComputedStyle(target).fontSize),
          };
          // Each glyph has its own finish line: it arrives just as its heading
          // reaches the reading area, rather than all four settling together.
          const settleAt = end.top + window.scrollY - window.innerHeight * 0.62;
          const duration = Math.max(window.innerHeight * 0.35, settleAt - flightStart);
          nextProgress[spec.key] = quiet ? 0 : Math.min(1, Math.max(0, (window.scrollY - flightStart) / duration));
        });
        setLetterPaths((current) => letterTransfers.every(({ key }) => {
          const previous = current[key];
          const next = nextPaths[key];
          return previous && next && Object.keys(next).every((field) => Math.abs(previous[field as keyof LetterPath] - next[field as keyof LetterPath]) < 0.75);
        }) ? current : nextPaths);
        setLetterProgress((current) => letterTransfers.every(({ key }) => Math.abs((current[key] ?? 0) - (nextProgress[key] ?? 0)) < 0.002) ? current : nextProgress);
      }
    };
    onScroll();
    document.fonts?.ready.then(onScroll).catch(() => undefined);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [quiet]);

  useEffect(() => {
    if (quiet) {
      shatterProgressRef.current = 0;
      setShatterProgress(0);
      return;
    }
    let frame = 0;
    const settle = () => {
      const current = shatterProgressRef.current;
      const next = current + (shatterTarget - current) * 0.065;
      if (Math.abs(shatterTarget - next) < 0.0006) {
        shatterProgressRef.current = shatterTarget;
        setShatterProgress(shatterTarget);
        return;
      }
      shatterProgressRef.current = next;
      setShatterProgress(next);
      frame = requestAnimationFrame(settle);
    };
    frame = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(frame);
  }, [quiet, shatterTarget]);

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

  const titleInitialOpacity = (key: TransferKey) => {
    const sectionIndex = letterTransfers.find((transfer) => transfer.key === key)?.sectionIndex ?? Number.MAX_SAFE_INTEGER;
    const progress = letterProgress[key] ?? 0;
    const fill = Math.min(1, Math.max(0, (progress - 0.78) / 0.18));
    return Math.max(0.24, fill, chapter >= sectionIndex ? 1 : 0);
  };

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

      <main id="content" ref={mainRef}>
        {!quiet && letterTransfers.map((spec) => {
          const path = letterPaths[spec.key];
          if (!path) return null;
          const progress = letterProgress[spec.key] ?? 0;
          const transfer = progress * progress * (3 - 2 * progress);
          const capital = Math.min(1, Math.max(0, (progress - 0.3) / 0.42));
          const settledFade = Math.min(1, Math.max(0, (progress - 0.93) / 0.07));
          const motionBlur = Math.sin(Math.PI * transfer) * (1 - settledFade);
          const arc = Math.sin(Math.PI * transfer) * Math.min(110, Math.abs(path.y1 - path.y0) * 0.22);
          const spiral = Math.sin(transfer * Math.PI * 4 + spec.phase) * Math.min(34, Math.abs(path.y1 - path.y0) * 0.035) * Math.sin(Math.PI * transfer);
          return <span
            key={spec.key}
            className={`folio-transfer-letter folio-transfer-${spec.key}${progress > 0.975 ? " is-settled" : ""}`}
            style={{
              left: path.x0 + (path.x1 - path.x0) * transfer + spiral,
              top: path.y0 + (path.y1 - path.y0) * transfer - arc,
              fontSize: path.size0 + (path.size1 - path.size0) * transfer,
              lineHeight: 0.76 + transfer * 0.28,
              // The moving glyph remains fully inked through its whole flight.
              // Only its blur trails dissipate at the title, avoiding a pale letter.
              opacity: Math.min(1, progress * 7),
              transform: `rotate(${(1 - transfer) * -8 + Math.cos(transfer * Math.PI * 4 + spec.phase) * 18 * (1 - transfer)}deg)`,
            }}
            aria-hidden="true"
          ><span className="folio-transfer-glyph"><span className="folio-transfer-lower" style={{ opacity: 1 - capital }}>{spec.lower}</span><span className="folio-transfer-upper" style={{ opacity: capital }}>{spec.upper}</span><span className="folio-transfer-trail" style={{ opacity: motionBlur * .54 }}>{spec.upper}</span><span className="folio-transfer-trail folio-transfer-trail-far" style={{ opacity: motionBlur * .24 }}>{spec.upper}</span></span></span>;
        })}
        <section className="folio-hero">
          {!quiet && (
            <div
              className="folio-folder-intro"
              aria-hidden="true"
              style={{
                opacity: Math.max(0, 1 - shatterProgress * 2.3),
                transform: `translate3d(${shatterProgress * 17}vw, ${shatterProgress * -5}vh, 0) rotate(${shatterProgress * 8}deg)`,
              }}
            >
              <span className="folio-folder-back" />
              <span className="folio-folder-paper folio-folder-paper-one" />
              <span className="folio-folder-paper folio-folder-paper-two" />
              <span className="folio-folder-front" />
            </div>
          )}
          <p ref={wordRef} className="folio-word" aria-hidden="true">{"Aetheria".split("").map((letter, index) => {
            const [dx, dy, spin] = wordFlights[index];
            const flight = Math.max(0, Math.min(1, (shatterProgress - index * 0.025) / (1 - index * 0.025)));
            return <span key={`${letter}-${index}`} style={quiet ? undefined : {
              transform: `translate3d(${dx * flight * 100}vw, ${dy * flight * 100}vh, 0) rotate(${spin * flight}rad) scale(${1 - flight * 0.2})`,
              opacity: [0, 4, 5].includes(index) ? 1 - Math.min(1, flight * 1.25) : 1 - flight * 0.74,
              filter: `blur(${flight * 1.6}px)`,
            }}>{letter}</span>;
          })}</p>
          {!quiet && <LandingWordShatter progress={shatterProgress} wordRef={wordRef} />}
          <p className="folio-kicker">Clinical study documents</p>
          <h1><span>Long forms.</span><span>Plain words.</span></h1>
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
          {quiet ? <h2>Read.</h2> : <h2 aria-label="Read."><span ref={(node) => { transferTargets.current.read = node ?? undefined; }} className={`folio-transfer-slot${shatterProgress > 0.975 ? " is-settled" : ""}`} style={{ width: "0.7em", opacity: titleInitialOpacity("read") }} aria-hidden="true">R</span><span aria-hidden="true">ead.</span></h2>}
          <SectionHighlights items={sectionHighlights.read} />
          <p className="sr-only">Read each part of the consent form beside a shorter, plain-language explanation. The original words and page citation stay in view.</p>
        </section>

        <section className="folio-chapters" id="ask">
          <BackgroundQuotes quotes={backgroundQuotes.ask} />
          <div className="folio-chapter-head">
            <p className="folio-section-label">02 / Ask</p>
            {quiet ? <h2>Ask.</h2> : <h2 aria-label="Ask."><span ref={(node) => { transferTargets.current.ask = node ?? undefined; }} className={`folio-transfer-slot${shatterProgress > 0.975 ? " is-settled" : ""}`} style={{ width: "0.7em", opacity: titleInitialOpacity("ask") }} aria-hidden="true">A</span><span aria-hidden="true">sk.</span></h2>}
          </div>
          <SectionHighlights items={sectionHighlights.ask} />
          <p className="sr-only">{sections.map((section) => `${section.ask} ${section.plain} Source: ${section.citation}, ${section.page}.`).join(" ")}</p>
        </section>

        <section className="folio-split folio-teach" id="evaluation">
          <BackgroundQuotes quotes={backgroundQuotes.evaluation} />
          <p className="folio-section-label">03 / Evaluation</p>
          {quiet ? <h2>Evaluation.</h2> : <h2 aria-label="Evaluation."><span ref={(node) => { transferTargets.current.evaluation = node ?? undefined; }} className={`folio-transfer-slot${shatterProgress > 0.975 ? " is-settled" : ""}`} style={{ width: "0.7em", opacity: titleInitialOpacity("evaluation") }} aria-hidden="true">E</span><span aria-hidden="true">valuation.</span></h2>}
          <SectionHighlights items={sectionHighlights.evaluation} />
          <p className="sr-only">You cannot choose your study group. The sample form says chance assigns Aetherol or placebo. Neither you nor the study doctor knows your group during the study. Source: {sections[0].citation}, {sections[0].page}.</p>
        </section>

        <section className="folio-review" id="review">
          <BackgroundQuotes quotes={backgroundQuotes.review} />
          <p className="folio-section-label">04 / Review</p>
          {quiet ? <h2>Review.</h2> : <h2 aria-label="Review."><span ref={(node) => { transferTargets.current.review = node ?? undefined; }} className={`folio-transfer-slot${shatterProgress > 0.975 ? " is-settled" : ""}`} style={{ width: "0.7em", opacity: titleInitialOpacity("review") }} aria-hidden="true">R</span><span aria-hidden="true">eview.</span></h2>}
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
