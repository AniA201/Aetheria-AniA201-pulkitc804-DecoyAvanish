import { useRef, useState, type FormEvent, type PointerEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AetheriaMark, useTitle } from "../components/Chrome";
import { useSession, type Role } from "../state/Session";
import { consentDoc, sections, study } from "../data/study";

type AccountType = "client" | "researcher";
type ApiUser = { name: string; role: AccountType };

function destination(role: Role, next: string | null) {
  const fallback = role === "participant" ? "/participant/home" : "/researcher/overview";
  if (!next?.startsWith("/")) return fallback;
  if (role === "participant" && next.startsWith("/participant")) return next;
  if (role === "researcher" && next.startsWith("/researcher")) return next;
  return fallback;
}

async function apiRequest(path: string, body: Record<string, string>): Promise<{ access_token: string; user: ApiUser }> {
  let response: Response;
  try {
    response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("We could not reach the account service. Start the FastAPI backend and try again.");
  }
  const raw = await response.text();
  let result: { detail?: string | { msg?: string }[]; error?: string } = {};
  try { result = JSON.parse(raw); } catch { /* A proxy error may be HTML rather than JSON. */ }
  if (!response.ok) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error("The local FastAPI account service is not running. Start it with npm run api, then try again.");
    }
    const detail = Array.isArray(result.detail) ? result.detail.map((item) => item.msg).filter(Boolean).join(" ") : result.detail;
    throw new Error(detail || result.error || "The account service could not complete that request.");
  }
  return result as { access_token: string; user: ApiUser };
}

function AuthHeader({ label }: { label: string }) {
  return <header className="auth-header"><Link to="/" className="folio-brand"><AetheriaMark /><span><strong>Aetheria</strong><em>Informed consent</em></span></Link><p>{label}</p></header>;
}

function AuthFooter() {
  return <footer className="auth-footer"><span>© Aetheria</span><span>Private and secure</span><span>Medical research workspace</span></footer>;
}

const accountCopy = {
  client: {
    eyebrow: "For people considering a study",
    title: <>Read the form.<br />Then decide.</>,
    description: "Check the visits, risks, costs, and privacy terms in the consent form. Save what you want to ask the study team.",
    trust: "For study participants",
    trustDetail: "Reading here does not sign the form.",
    signInNote: "Sign in to read a form and save your questions.",
    registerTitle: <>Read your<br />consent form.</>,
    registerNote: "Create an account, then upload a form or open the sample.",
  },
  researcher: {
    eyebrow: "For teams reviewing consent forms",
    title: <>Check the form.<br />Check the plan.</>,
    description: "Compare what participants are told with the study protocol. Review differences in visits, study length, and payment.",
    trust: "For research teams",
    trustDetail: "A reviewer decides which figures are correct.",
    signInNote: "Sign in to compare documents and review participant questions.",
    registerTitle: <>Review the<br />study documents.</>,
    registerNote: "Use the key from your study lead to create a research account.",
  },
};

function RoleSwitch({ value, onChange }: { value: AccountType; onChange: (role: AccountType) => void }) {
  return <div className="auth-role-switch" role="radiogroup" aria-label="Account type">
    <button type="button" role="radio" aria-checked={value === "client"} className={value === "client" ? "on" : ""} onClick={() => onChange("client")}><span>01</span><strong>Participant</strong><small>Read my consent form</small></button>
    <button type="button" role="radio" aria-checked={value === "researcher"} className={value === "researcher" ? "on" : ""} onClick={() => onChange("researcher")}><span>02</span><strong>Researcher</strong><small>Review study documents</small></button>
  </div>;
}

export function Login() {
  useTitle("Login");
  const [params] = useSearchParams();
  const next = params.get("next");
  const [accountType, setAccountType] = useState<AccountType>(params.get("as") === "researcher" ? "researcher" : "client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const folioRef = useRef<HTMLDivElement>(null);
  const { setRole } = useSession();
  const navigate = useNavigate();
  const copy = accountCopy[accountType];

  function moveFolio(event: PointerEvent<HTMLElement>) {
    const folio = folioRef.current;
    if (!folio || event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = folio.getBoundingClientRect();
    const reach = 80;
    if (event.clientX < bounds.left - reach || event.clientX > bounds.right + reach || event.clientY < bounds.top - reach || event.clientY > bounds.bottom + reach) {
      resetFolio();
      return;
    }
    const x = Math.max(-1, Math.min(1, (event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width * 0.75)));
    const y = Math.max(-1, Math.min(1, (event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height * 0.75)));
    folio.style.setProperty("--folio-tilt-x", `${(-y * 10).toFixed(2)}deg`);
    folio.style.setProperty("--folio-tilt-y", `${(x * 14).toFixed(2)}deg`);
    folio.style.setProperty("--folio-shadow-x", `${(16 - x * 12).toFixed(1)}px`);
    folio.style.setProperty("--folio-shadow-y", `${(20 - y * 9).toFixed(1)}px`);
  }

  function resetFolio() {
    const folio = folioRef.current;
    if (!folio) return;
    folio.style.removeProperty("--folio-tilt-x");
    folio.style.removeProperty("--folio-tilt-y");
    folio.style.removeProperty("--folio-shadow-x");
    folio.style.removeProperty("--folio-shadow-y");
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("/api/auth/login", { email, password, role: accountType });
      const role: Role = result.user.role === "researcher" ? "researcher" : "participant";
      sessionStorage.setItem("aetheria_token", result.access_token);
      setRole(role, result.user.name);
      navigate(destination(role, next));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not sign you in.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-gate auth-reference auth-entry" id="content">
    <section className="auth-reference-layout" aria-label="Account sign in">
      <aside className="auth-showcase auth-showcase-minimal" onPointerMove={moveFolio} onPointerLeave={resetFolio}>
        <Link to="/" className="auth-showcase-brand"><AetheriaMark /><strong>Aetheria</strong></Link>
        <div className="auth-folio-art" aria-hidden="true" ref={folioRef}>
          <div className="auth-folio-front">
            <span className="auth-folio-overline">{study.sponsor.toUpperCase()}</span>
            <strong>{study.name}</strong>
            <span className="auth-folio-document">{consentDoc.id} · SAMPLE CONSENT</span>
            <span className="auth-folio-rule" />
            <span className="auth-folio-section">03 / {sections[2].title}</span>
            <p>{sections[2].plain.split(". ")[0]}.</p>
            <span className="auth-folio-seal">A</span>
            <small>Consent §6.1 · demonstration only</small>
          </div>
        </div>
        <div className="auth-showcase-copy"><p className="kicker">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p></div>
        <div className="auth-showcase-trust"><span className="auth-trust-icon">+</span><p><strong>{copy.trust}</strong><small>{copy.trustDetail}</small></p></div>
      </aside>
      <section className="auth-login-shell">
        <div className="auth-login-card">
          <div className="auth-login-icon" aria-hidden="true">+</div>
          <div className="auth-login-title"><h2>Welcome back</h2><p>{copy.signInNote}</p></div>
          <form className="auth-form auth-form-reference" onSubmit={signIn}>
            <RoleSwitch value={accountType} onChange={setAccountType} />
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label>
            <label>Password<span className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></span></label>
            <div className="auth-remember"><label><input type="checkbox" /> Remember me</label><Link to="/forgot-password">Forgot password?</Link></div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="btn auth-submit" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
            <p className="auth-signup-line">New to Aetheria? <Link to="/register">Create an account</Link></p>
          </form>
        </div>
        <p className="auth-login-note">Choose the account type you registered with.</p>
      </section>
    </section>
  </main>;
}

export function Register() {
  useTitle("Registration");
  const [accountType, setAccountType] = useState<AccountType>("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [researcherKey, setResearcherKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const { setRole } = useSession();
  const navigate = useNavigate();
  const copy = accountCopy[accountType];

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (password !== confirmation) { setError("The passwords do not match."); return; }
    setLoading(true);
    try {
      const result = await apiRequest("/api/auth/register", { name, email, password, role: accountType, researcher_key: researcherKey });
      const role: Role = result.user.role === "researcher" ? "researcher" : "participant";
      sessionStorage.setItem("aetheria_token", result.access_token);
      setRole(role, result.user.name);
      navigate(destination(role, null));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-gate auth-reference" id="content"><section className="auth-reference-layout" aria-label="Create an account"><aside className="auth-showcase auth-showcase-minimal"><Link to="/" className="auth-showcase-brand"><AetheriaMark /><strong>Aetheria</strong></Link><p className="auth-showcase-word" aria-hidden="true">Aetheria</p><div className="auth-showcase-copy"><p className="kicker">{copy.eyebrow}</p><h1>{copy.registerTitle}</h1><p>{copy.registerNote}</p></div><div className="auth-showcase-trust"><span className="auth-trust-icon">+</span><p><strong>{copy.trust}</strong><small>{copy.trustDetail}</small></p></div></aside><section className="auth-login-shell"><div className="auth-login-card"><div className="auth-login-icon" aria-hidden="true">+</div><div className="auth-login-title"><h2>Create account</h2><p>{accountType === "client" ? "Upload a form after you create your account." : "You need the key from your study lead."}</p></div><form className="auth-form auth-form-reference" onSubmit={createAccount}><RoleSwitch value={accountType} onChange={setAccountType} /><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your full name" required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label><label>Password <small>At least 8 characters</small><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Create a password" minLength={8} required /></label><label>Confirm password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Type your password again" minLength={8} required /></label>{accountType === "researcher" && <label>Private researcher key<input type="password" value={researcherKey} onChange={(event) => setResearcherKey(event.target.value)} autoComplete="off" placeholder="Enter the key from your study lead" required /></label>}{error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}<button className="btn auth-submit" type="submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button><p className="auth-signup-line">Already have an account? <Link to="/login">Sign in</Link></p></form></div><p className="auth-login-note">{accountType === "researcher" ? "Ask your study lead if you need the private key." : "Researcher? Select Researcher above."}</p></section></section></main>;
}

export function ForgotPassword() {
  useTitle("Reset password");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      setNotice("Password reset is not set up for this local demo. Please contact your study team.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not send the password-reset email.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-gate" id="content"><AuthHeader label="Account recovery" /><section className="auth-layout" aria-label="Password reset"><div className="auth-intro"><p className="kicker">Account recovery</p><h1>Need help<br />signing in?</h1><p className="auth-lede">This local demo does not send password reset emails.</p></div><form className="auth-form" onSubmit={requestReset}><div className="auth-form-heading"><p className="kicker">Password help</p><h2>Contact your team</h2></div><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label>{error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}<button className="btn auth-submit" type="submit" disabled={loading}>{loading ? "Checking…" : "Get help"}</button><div className="auth-meta"><span>Remembered it?</span><Link to="/login">Back to sign in</Link></div></form></section><AuthFooter /></main>;
}
