import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession, type Role } from "../state/Session";

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title === "Aetheria" ? title : `${title} · Aetheria`;
  }, [title]);
}

export function ListenButton({ text }: { text: string }) {
  const { narrationRate } = useSession();
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
    const utterance = new SpeechSynthesisUtterance(text);
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
  { to: "/participant/accessibility", label: "Text size" },
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

export function Shell({ mode }: { mode: Role }) {
  const { setRole } = useSession();
  const links = mode === "participant" ? participantNav : researcherNav;
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className={`shell ${mode}`}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="folio-brand">
          <span className="folio-seal" aria-hidden="true" />
          <span>
            <strong>Aetheria</strong>
            <em>{mode === "participant" ? "Participant" : "Research"}</em>
          </span>
        </NavLink>
        <button
          type="button"
          className="folio-menu"
          aria-expanded={open}
          aria-controls="app-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>
      <aside className={`rail ${open ? "open" : ""}`} id="app-nav">
        <NavLink to="/" className="folio-brand rail-mark">
          <span className="folio-seal" aria-hidden="true" />
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
        <button type="button" className="mode-switch sign-out" onClick={() => setRole(null)}>
          Sign out
        </button>
      </aside>
      <div className="workspace">
        <main id="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
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
