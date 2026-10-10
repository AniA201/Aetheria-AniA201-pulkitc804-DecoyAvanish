import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTitle } from "../components/Chrome";
import { useSession, type Role } from "../state/Session";
import { supabase, supabasePublishableKey, supabaseUrl } from "../lib/supabase";

type AccountType = "client" | "researcher";
type ApiUser = { name: string; role: AccountType };

function destination(role: Role, next: string | null) {
  const fallback = role === "participant" ? "/participant/home" : "/researcher/overview";
  if (!next?.startsWith("/")) return fallback;
  if (role === "participant" && next.startsWith("/participant")) return next;
  if (role === "researcher" && next.startsWith("/researcher")) return next;
  return fallback;
}

async function workspaceRole(userId: string): Promise<Role> {
  if (!supabase) throw new Error("Supabase is not configured. Add its URL and publishable key to .env.");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (data) return data.role === "researcher" ? "researcher" : "participant";
    if (error && error.code !== "PGRST116") throw new Error("We could not open your workspace. Please try again.");
    await new Promise((resolve) => window.setTimeout(resolve, 350));
  }
  throw new Error("Your account was created. Please sign in again in a few seconds.");
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
  return <header className="auth-header"><Link to="/" className="folio-brand"><span className="folio-seal" aria-hidden="true" /><span><strong>Aetheria</strong><em>Informed consent</em></span></Link><p>{label}</p></header>;
}

function AuthFooter() {
  return <footer className="auth-footer"><span>© Aetheria</span><span>Private and secure</span><span>Medical research workspace</span></footer>;
}

const accountCopy = {
  client: {
    eyebrow: "Clinical research, clearly explained",
    title: <>Know your<br />care first.</>,
    description: "Read your study details, ask questions, and decide at your own pace.",
    trust: "Made for study clients",
    trustDetail: "Your information stays private.",
    signInNote: "Sign in to view your study and consent information.",
    registerTitle: <>Join your<br />study.</>,
    registerNote: "Create an account to keep your study details in one place.",
  },
  researcher: {
    eyebrow: "A simple space for your study team",
    title: <>Keep your<br />study clear.</>,
    description: "Review study information, support clients, and keep your research work organized.",
    trust: "Made for research teams",
    trustDetail: "Private access for approved team members.",
    signInNote: "Sign in to manage your research workspace.",
    registerTitle: <>Set up your<br />team space.</>,
    registerNote: "Use the private key from your study lead to create your account.",
  },
};

function RoleSwitch({ value, onChange }: { value: AccountType; onChange: (role: AccountType) => void }) {
  return <div className="auth-role-switch" role="radiogroup" aria-label="Account type">
    <button type="button" role="radio" aria-checked={value === "client"} className={value === "client" ? "on" : ""} onClick={() => onChange("client")}><span>01</span><strong>Client</strong><small>My study &amp; consent</small></button>
    <button type="button" role="radio" aria-checked={value === "researcher"} className={value === "researcher" ? "on" : ""} onClick={() => onChange("researcher")}><span>02</span><strong>Researcher</strong><small>Study workspace</small></button>
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
  const { setRole } = useSession();
  const navigate = useNavigate();
  const copy = accountCopy[accountType];

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (supabase) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError || !data.user || !data.session) throw new Error(authError?.message || "We could not sign you in.");
        const role = await workspaceRole(data.user.id);
        if ((accountType === "researcher") !== (role === "researcher")) throw new Error("This account belongs to the other workspace type.");
        setRole(role, data.user.user_metadata.full_name);
        navigate(destination(role, next));
        return;
      }
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

  return <main className="auth-gate auth-reference" id="content"><section className="auth-reference-layout" aria-label="Account sign in"><aside className="auth-showcase auth-showcase-minimal"><Link to="/" className="auth-showcase-brand"><span className="folio-seal" aria-hidden="true" /><strong>Aetheria</strong></Link><p className="auth-showcase-word" aria-hidden="true">Aetheria</p><div className="auth-showcase-copy"><p className="kicker">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.description}</p></div><div className="auth-showcase-trust"><span className="auth-trust-icon">+</span><p><strong>{copy.trust}</strong><small>{copy.trustDetail}</small></p></div></aside><section className="auth-login-shell"><div className="auth-login-card"><div className="auth-login-icon" aria-hidden="true">+</div><div className="auth-login-title"><h2>Welcome back</h2><p>{copy.signInNote}</p></div><form className="auth-form auth-form-reference" onSubmit={signIn}><RoleSwitch value={accountType} onChange={setAccountType} /><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label><label>Password<span className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></span></label><div className="auth-remember"><label><input type="checkbox" /> Remember me</label><Link to="/forgot-password">Forgot password?</Link></div>{error && <p className="auth-error" role="alert">{error}</p>}<button className="btn auth-submit" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button><p className="auth-signup-line">New to Aetheria? <Link to="/register">Create an account</Link></p></form></div><p className="auth-login-note">Secure access for study clients and research teams.</p></section></section></main>;
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
      if (supabase && supabaseUrl && supabasePublishableKey && accountType === "client") {
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/login` } });
        if (authError || !data.user) throw new Error(authError?.message || "We could not create your account.");
        if (!data.session) { setNotice("Check your email to confirm your account, then return here to sign in."); return; }
      } else if (supabase && supabaseUrl && supabasePublishableKey) {
        const response = await fetch(`${supabaseUrl}/functions/v1/register-researcher`, { method: "POST", headers: { "Content-Type": "application/json", apikey: supabasePublishableKey, Authorization: `Bearer ${supabasePublishableKey}` }, body: JSON.stringify({ name, email, password, researcherKey }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "We could not create your researcher account.");
      }
      if (supabase) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError || !data.user || !data.session) throw new Error(signInError?.message || "Account created. Confirm your email, then sign in.");
        const role = await workspaceRole(data.user.id);
        setRole(role, data.user.user_metadata.full_name);
        navigate(destination(role, null));
        return;
      }
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

  return <main className="auth-gate auth-reference" id="content"><section className="auth-reference-layout" aria-label="Create an account"><aside className="auth-showcase auth-showcase-minimal"><Link to="/" className="auth-showcase-brand"><span className="folio-seal" aria-hidden="true" /><strong>Aetheria</strong></Link><p className="auth-showcase-word" aria-hidden="true">Aetheria</p><div className="auth-showcase-copy"><p className="kicker">{copy.eyebrow}</p><h1>{copy.registerTitle}</h1><p>{copy.registerNote}</p></div><div className="auth-showcase-trust"><span className="auth-trust-icon">+</span><p><strong>{copy.trust}</strong><small>{copy.trustDetail}</small></p></div></aside><section className="auth-login-shell"><div className="auth-login-card"><div className="auth-login-icon" aria-hidden="true">+</div><div className="auth-login-title"><h2>Create account</h2><p>{accountType === "client" ? "Start with your study details." : "Create access for your research team."}</p></div><form className="auth-form auth-form-reference" onSubmit={createAccount}><RoleSwitch value={accountType} onChange={setAccountType} /><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your full name" required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label><label>Password <small>At least 8 characters</small><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Create a password" minLength={8} required /></label><label>Confirm password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Type your password again" minLength={8} required /></label>{accountType === "researcher" && <label>Private researcher key<input type="password" value={researcherKey} onChange={(event) => setResearcherKey(event.target.value)} autoComplete="off" placeholder="Enter the key from your study lead" required /></label>}{error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}<button className="btn auth-submit" type="submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button><p className="auth-signup-line">Already have an account? <Link to="/login">Sign in</Link></p></form></div><p className="auth-login-note">{accountType === "researcher" ? "Ask your study lead if you need the private key." : "Researcher? Select Researcher above."}</p></section></section></main>;
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
      if (!supabase) throw new Error("Supabase is not configured. Add the project URL and publishable key to .env.");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
      if (resetError) throw resetError;
      setNotice("If an account exists for that email, a password-reset link is on its way.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not send the password-reset email.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-gate" id="content"><AuthHeader label="Account recovery" /><section className="auth-layout" aria-label="Password reset"><div className="auth-intro"><p className="kicker">Account recovery</p><h1>Start fresh,<br />securely.</h1><p className="auth-lede">Enter the email connected to your Aetheria account. If it exists, Supabase will send a secure reset link.</p></div><form className="auth-form" onSubmit={requestReset}><div className="auth-form-heading"><p className="kicker">Reset password</p><h2>Check your inbox</h2></div><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label>{error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}<button className="btn auth-submit" type="submit" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button><div className="auth-meta"><span>Remembered it?</span><Link to="/login">Back to sign in</Link></div></form></section><AuthFooter /></main>;
}
