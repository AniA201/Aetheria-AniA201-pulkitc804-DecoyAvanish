import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title === "Aetheria" ? title : `${title} · Aetheria`;
  }, [title]);
}

export function ListenButton({ text }: { text: string }) {
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
    utterance.rate = 0.96;
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
  { to: "/participant", label: "Home", end: true },
  { to: "/participant/study", label: "My Study" },
  { to: "/participant/explore", label: "Explore Consent" },
  { to: "/participant/ask", label: "Ask Aetheria" },
  { to: "/participant/teach", label: "Teach-Back" },
  { to: "/participant/summary", label: "My Summary" },
  { to: "/participant/access", label: "Accessibility" },
];

const teamNav = [
  { to: "/team", label: "Overview", end: true },
  { to: "/team/integrity", label: "Document Integrity" },
  { to: "/team/insights", label: "Participant Insights" },
  { to: "/team/studio", label: "Plain Language" },
  { to: "/team/lab", label: "Test Lab" },
  { to: "/team/documents", label: "Documents" },
  { to: "/team/settings", label: "Settings" },
];

export function Shell({ mode }: { mode: "participant" | "team" }) {
  const links = mode === "participant" ? participantNav : teamNav;
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
        <NavLink to="/" className="wordmark">
          Aetheria
        </NavLink>
        <button
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="app-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>
      <aside className={`rail ${open ? "open" : ""}`} id="app-nav">
        <NavLink to="/" className="wordmark rail-mark">
          Aetheria
        </NavLink>
        <p className="rail-kicker">{mode === "participant" ? "Participant" : "Research team"}</p>
        <nav aria-label={mode === "participant" ? "Participant" : "Research team"}>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="rail-link">
              {link.label}
            </NavLink>
          ))}
        </nav>
        <NavLink
          className="mode-switch"
          to={mode === "participant" ? "/team" : "/participant"}
        >
          {mode === "participant" ? "Research team view" : "Participant view"}
        </NavLink>
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
