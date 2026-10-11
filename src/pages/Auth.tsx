import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AetheriaMark, useTitle } from "../components/Chrome";
import { useSession, type Role } from "../state/Session";
import { AuthFolio3D } from "../scene/AuthFolio3D";

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
  return <header className="auth-header"><Link to="/" className="folio-brand"><AetheriaMark /><span><strong>Aetheria</strong><em>Study documents</em></span></Link><p>{label}</p></header>;
}

function AuthFooter() {
  return <footer className="auth-footer"><span>© Aetheria</span><span>Private and secure</span><span>Medical research workspace</span></footer>;
}

const accountCopy = {
  client: {
    eyebrow: "Study documents for participants",
    title: <>The long form.<br />In plain words.</>,
    description: "Read a shorter explanation beside each part of the original form. Check the source, ask what a passage means, and save questions for the study team.",
    trust: "For study participants",
    trustDetail: "Reading here does not sign the form.",
    signInNote: "Sign in to read a study form in shorter sections.",
    registerTitle: <>Make sense of<br />the study form.</>,
    registerNote: "Create an account to add a text-based form or try the sample. The original text stays beside each shorter reading.",
  },
  researcher: {
    eyebrow: "For teams reviewing study documents",
    title: <>Check the words.<br />Check the facts.</>,
    description: "Review shorter readings against the original study form. Compare the form with the protocol and resolve differences before participants rely on it.",
    trust: "For research teams",
    trustDetail: "A reviewer decides which figures are correct.",
    signInNote: "Sign in to compare source documents and review questions.",
    registerTitle: <>Review the<br />study documents.</>,
    registerNote: "Use the key from your study lead to create a research account.",
  },
};

function RoleSwitch({ value, onChange }: { value: AccountType; onChange: (role: AccountType) => void }) {
  return <div className="auth-role-switch" role="radiogroup" aria-label="Account type">
    <button type="button" role="radio" aria-checked={value === "client"} className={value === "client" ? "on" : ""} onClick={() => onChange("client")}><span>01</span><strong>Participant</strong><small>Read my study form</small></button>
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
  const { setRole, reducedMotion } = useSession();
  const navigate = useNavigate();
  const copy = accountCopy[accountType];

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
      <aside className="auth-showcase auth-showcase-minimal">
        <Link to="/" className="auth-showcase-brand"><AetheriaMark /><strong>Aetheria</strong></Link>
        <AuthFolio3D reducedMotion={reducedMotion} />
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
