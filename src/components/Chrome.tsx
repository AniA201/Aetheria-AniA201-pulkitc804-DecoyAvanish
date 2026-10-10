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
      <p>
        {state === "unavailable"
          ? "Voice is unavailable in this browser. The written explanation stays on the page."
          : "Preview voice uses this browser’s speech engine. ElevenLabs is not connected, and the writing stays visible."}
      </p>
    </div>
  );
}

const participantNav = [
  { to: "/participant/home", label: "Home", end: true },
  { to: "/participant/my-study", label: "My Study" },
  { to: "/participant/explore-consent", label: "Explore Consent" },
  { to: "/participant/ask", label: "Ask Aetheria" },
  { to: "/participant/teach-back", label: "Teach-Back" },
  { to: "/participant/summary", label: "My Summary" },
  { to: "/participant/accessibility", label: "Accessibility" },
];

const researcherNav = [
  { to: "/researcher/overview", label: "Overview", end: true },
  { to: "/researcher/document-integrity", label: "Document Integrity" },
  { to: "/researcher/insights", label: "Participant Insights" },
  { to: "/researcher/plain-language", label: "Plain Language Studio" },
  { to: "/researcher/test-lab", label: "Test Lab" },
  { to: "/researcher/documents", label: "Documents & Versions" },
  { to: "/researcher/settings", label: "Settings & Audit" },
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
        <p className="demo-banner">
          Synthetic demo. Not medical advice, not a consent decision, and not a signed form.
        </p>
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
      <h1>That page is not part of the demo.</h1>
      <NavLink to="/" className="btn solid">
        Back to the start
      </NavLink>
    </main>
  );
}
