import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { strings, useT } from "../lib/i18n";
import { useR } from "../lib/researchI18n";
import { languageInfo, languages } from "../lib/languages";
import { canSpeak, speak, stopSpeaking, type VoiceLang } from "../lib/voice";
import { versionStanding } from "../lib/workbook";
import { useSession, type Role } from "../state/Session";
import { AgentPanel } from "./AgentPanel";

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title === "Aetheria" ? title : `${title} · Aetheria`;
  }, [title]);
}

/** Reads `text` aloud in `lang` (defaults to the screen language) after the automated-voice notice. */
export function ListenButton({ text, lang }: { text: string; lang?: VoiceLang }) {
  const { narrationRate, setLastSpoken, language } = useSession();
  const t = useT();
  const [state, setState] = useState<"idle" | "playing" | "unavailable">("idle");
  const voiceLang = lang ?? language;

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const play = async () => {
    if (!canSpeak()) {
      setState("unavailable");
      return;
    }
    setLastSpoken(text);
    setState("playing");
    const ok = await speak(text, voiceLang, narrationRate);
    setState(ok ? "idle" : "unavailable");
  };

  const stop = () => {
    stopSpeaking();
    setState("idle");
  };

  return (
    <div className="listen">
      {state === "playing" ? (
        <button type="button" className="btn on-paper" onClick={stop}>
          {t.listen.stop}
        </button>
      ) : (
        <button type="button" className="btn on-paper" onClick={play}>
          {t.listen.play}
        </button>
      )}
      {state === "unavailable" ? <p>{t.listen.off}</p> : null}
      <p className="fine">{t.listen.note}</p>
    </div>
  );
}

const participantNav = [
  { to: "/participant/home", key: "start", end: true },
  { to: "/participant/my-study", key: "form" },
  { to: "/participant/explore-consent", key: "read" },
  { to: "/participant/ask", key: "ask" },
  { to: "/participant/teach-back", key: "check" },
  { to: "/participant/summary", key: "summary" },
] as const;

const researcherNav = [
  { to: "/researcher/overview", end: true },
  { to: "/researcher/document-integrity" },
  { to: "/researcher/insights" },
  { to: "/researcher/plain-language" },
  { to: "/researcher/test-lab" },
  { to: "/researcher/documents" },
  { to: "/researcher/settings" },
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
  const { fontScale, setFontScale, contrast, setContrast, narrationRate, lastSpoken, language, setLanguage } = useSession();
  const t = strings[language];
  const sizes = [
    ["md", t.dock.sizes[0], "0.92rem"],
    ["lg", t.dock.sizes[1], "1.12rem"],
    ["xl", t.dock.sizes[2], "1.35rem"],
  ] as const;

  return (
    <div className="type-dock">
      <div role="radiogroup" aria-label={t.dock.size}>
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
        aria-label={contrast === "high" ? t.dock.contrastOff : t.dock.contrastOn}
        onClick={() => setContrast(contrast === "high" ? "paper" : "high")}
      >
        <span aria-hidden="true" />
      </button>
      <div role="radiogroup" aria-label="Language / Idioma / Langue / 语言" className="language-switch">
        {languages.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            lang={languageInfo[code].html}
            aria-label={languageInfo[code].native}
            title={languageInfo[code].native}
            aria-checked={language === code}
            onClick={() => setLanguage(code)}
          >
            {languageInfo[code].dock}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label={t.dock.repeat}
        disabled={!lastSpoken}
        onClick={() => {
          if (lastSpoken) void speak(lastSpoken, language, narrationRate);
        }}
      >
        ↺
      </button>
    </div>
  );
}

export function Shell({ mode }: { mode: Role }) {
  const { setRole, consent, approvedVersions, language } = useSession();
  const t = useT();
  const r = useR();
  const participant = mode === "participant";
  const links = participant
    ? participantNav.map((link) => ({ to: link.to, end: "end" in link ? link.end : undefined, label: t.nav[link.key] }))
    : researcherNav.map((link, index) => ({ ...link, label: r.nav[index] }));
  const translated = language !== "en";
  const roleName = participant ? t.roleName : r.roleName;
  const blocked = mode === "participant" && consent !== null && versionStanding(consent.version, approvedVersions) === "not-listed";
  const [open, setOpen] = useState(false);
  const [railCompact, setRailCompact] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const target = document.getElementById(id);
      tries += 1;
      if (target || tries > 20) {
        window.clearInterval(timer);
        target?.scrollIntoView({ block: "start" });
        if (target) window.setTimeout(() => target.scrollIntoView({ block: "start" }), 400);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [location.pathname, location.hash]);

  const signOut = async () => {
    sessionStorage.removeItem("aetheria_token");
    setRole(null);
  };

  return (
    <div className={`shell ${mode} ${railCompact ? "rail-compact" : ""}`}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="folio-brand">
          <AetheriaMark />
          <span>
            <strong>Aetheria</strong>
            <em>{roleName}</em>
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
            {open ? r.close : r.menu}
          </button>
        </span>
      </header>
      <aside className={`rail ${open ? "open" : ""}`} id="app-nav">
        <NavLink to="/" className="folio-brand rail-mark">
          <AetheriaMark />
          <span>
            <strong>Aetheria</strong>
            <em>{roleName}</em>
          </span>
        </NavLink>
        <button className="rail-toggle" type="button" onClick={() => setRailCompact((value) => !value)} aria-label={railCompact ? "Expand navigation" : "Collapse navigation"} aria-pressed={railCompact}>
          <span aria-hidden="true">{railCompact ? "→" : "←"}</span>
        </button>
        <nav aria-label={roleName}>
          {links.map((link, index) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="rail-link">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <NavLink className="mode-switch" to="/login">
          {participant ? t.nav.switchRole : r.switchRole}
        </NavLink>
        <button type="button" className="mode-switch sign-out" onClick={signOut}>
          {participant ? t.nav.signOut : r.signOut}
        </button>
      </aside>
      <div className="workspace">
        <main id="content" tabIndex={-1} lang={translated ? languageInfo[language].html : "en"}>
          {translated ? (
            <p className="notice machine-notice" role="note">
              {participant ? t.machineNotice : r.notice}
            </p>
          ) : null}
          <Outlet />
        </main>
      </div>
      {blocked ? null : <AgentPanel role={mode} />}
      <CornerMark />
      <TypeDock />
    </div>
  );
}

export function Missing() {
  const t = useT();
  const { language } = useSession();
  useTitle(t.missing.title);
  return (
    <main className="missing" id="content" lang={languageInfo[language].html}>
      <p className="kicker">Aetheria</p>
      <h1>{t.missing.heading}</h1>
      <NavLink to="/" className="btn solid">
        {t.missing.back}
      </NavLink>
    </main>
  );
}
