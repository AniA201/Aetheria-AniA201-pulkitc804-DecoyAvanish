import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession, type Role } from "../state/Session";
import { AgentPanel } from "./AgentPanel";

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title === "Aetheria" ? title : `${title} · Aetheria`;
  }, [title]);
}

export function ListenButton({ text }: { text: string }) {
  const { narrationRate, setLastSpoken } = useSession();
  const [state, setState] = useState<"idle" | "playing" | "unavailable">("idle");

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = () => {
    if (!window.speechSynthesis) {
      setState("unavailable");
      return;
    }
    window.speechSynthesis.cancel();
    setLastSpoken(text);
    const utterance = new SpeechSynthesisUtterance(
      `This voice is automated. A person still holds the consent conversation. ${text}`,
    );
    utterance.rate = narrationRate;
    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("unavailable");
    setState("playing");
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    setState("idle");
  };

  return (
    <div className="listen">
      {state === "playing" ? (
        <button type="button" className="btn on-paper" onClick={stop}>
          Stop voice
        </button>
      ) : (
        <button type="button" className="btn on-paper" onClick={speak}>
          Listen
        </button>
      )}
      {state === "unavailable" ? <p>Voice is off. The text stays on the page.</p> : null}
      <p className="fine">Listen is an automated voice. It does not replace a person.</p>
    </div>
  );
}

const participantNav = [
  { to: "/participant/home", label: "Start", end: true },
  { to: "/participant/my-study", label: "Your form" },
  { to: "/participant/explore-consent", label: "Read" },
  { to: "/participant/ask", label: "Ask" },
  { to: "/participant/teach-back", label: "Check" },
  { to: "/participant/summary", label: "Summary" },
];

const researcherNav = [
  { to: "/researcher/overview", label: "Start", end: true },
  { to: "/researcher/document-integrity", label: "Compare" },
  { to: "/researcher/insights", label: "Questions" },
  { to: "/researcher/plain-language", label: "Plain language" },
  { to: "/researcher/test-lab", label: "Checks" },
  { to: "/researcher/documents", label: "Files" },
  { to: "/researcher/settings", label: "Settings" },
];

export function RequireRole({ role }: { role: Role }) {
  const { role: current } = useSession();
  const location = useLocation();
  if (current !== role) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?as=${role}&next=${next}`} replace />;
  }
  return <Shell mode={role} />;
}

export function AetheriaMark() {
  return <img className="aetheria-mark" src="/aetheria-mark.svg" alt="" aria-hidden="true" />;
}

export function CornerMark() {
  return (
    <Link to="/" className="shell-mark" aria-label="Aetheria">
      <AetheriaMark />
    </Link>
  );
}

function TypeDock() {
  const { fontScale, setFontScale, contrast, setContrast, narrationRate, setNarrationRate, lastSpoken } = useSession();
  const sizes = [
    ["md", "Default", "0.92rem"],
    ["lg", "Large", "1.12rem"],
    ["xl", "Larger", "1.35rem"],
  ] as const;

  return (
    <div className="type-dock">
      <div role="radiogroup" aria-label="Text size">
        {sizes.map(([size, label, sample]) => (
          <button
            key={size}
            type="button"
            role="radio"
            aria-label={label}
            aria-checked={fontScale === size}
            style={{ fontSize: sample }}
            onClick={() => setFontScale(size)}
          >
            A
          </button>
        ))}
      </div>
      <button
        type="button"
        className="contrast-toggle"
        aria-pressed={contrast === "high"}
        aria-label={contrast === "high" ? "Standard contrast" : "Higher contrast"}
        onClick={() => setContrast(contrast === "high" ? "paper" : "high")}
      >
        <span aria-hidden="true" />
      </button>
      <div role="radiogroup" aria-label="Reading speed">
        {(
          [
            [0.85, "Slower"],
            [1, "Steady"],
            [1.15, "Faster"],
          ] as const
        ).map(([rate, label]) => (
          <button
            key={rate}
            type="button"
            role="radio"
            aria-label={label}
            aria-checked={narrationRate === rate}
            onClick={() => setNarrationRate(rate)}
          >
            {rate === 0.85 ? "S" : rate === 1 ? "M" : "F"}
          </button>
        ))}
      </div>
      <button type="button" disabled aria-label="English only. A reviewed translation is not loaded.">
        EN
      </button>
      <button
        type="button"
        aria-label="Repeat the last reading"
        disabled={!lastSpoken}
        onClick={() => {
          if (!lastSpoken || !window.speechSynthesis) return;
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            `This voice is automated. A person still holds the consent conversation. ${lastSpoken}`,
          );
          utterance.rate = narrationRate;
          window.speechSynthesis.speak(utterance);
        }}
      >
        ↺
      </button>
    </div>
  );
}

export function Shell({ mode }: { mode: Role }) {
  const { setRole } = useSession();
  const links = mode === "participant" ? participantNav : researcherNav;
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const signOut = async () => {
    sessionStorage.removeItem("aetheria_token");
    setRole(null);
  };

  return (
    <div className={`shell ${mode}`}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="folio-brand">
          <AetheriaMark />
          <span>
            <strong>Aetheria</strong>
            <em>{mode === "participant" ? "Participant" : "Research"}</em>
          </span>
        </NavLink>
        <span className="topbar-end">
          <button
            type="button"
            className="folio-menu"
            aria-expanded={open}
            aria-controls="app-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </span>
      </header>
      <aside className={`rail ${open ? "open" : ""}`} id="app-nav">
        <NavLink to="/" className="folio-brand rail-mark">
          <AetheriaMark />
          <span>
            <strong>Aetheria</strong>
            <em>{mode === "participant" ? "Participant" : "Research"}</em>
          </span>
        </NavLink>
        <nav aria-label={mode === "participant" ? "Participant" : "Research team"}>
          {links.map((link, index) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="rail-link">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <NavLink className="mode-switch" to="/login">
          Switch role
        </NavLink>
        <button type="button" className="mode-switch sign-out" onClick={signOut}>
          Sign out
        </button>
      </aside>
      <div className="workspace">
        <main id="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <AgentPanel role={mode} />
      <CornerMark />
      <TypeDock />
    </div>
  );
}

export function Missing() {
  useTitle("Page not found");
  return (
    <main className="missing" id="content">
      <p className="kicker">Aetheria</p>
      <h1>That page is not in Aetheria.</h1>
      <NavLink to="/" className="btn solid">
        Back to the start
      </NavLink>
    </main>
  );
}
