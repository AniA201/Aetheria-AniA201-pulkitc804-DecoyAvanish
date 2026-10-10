import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CornerMark, useTitle } from "../components/Chrome";
import { useSession, type Role } from "../state/Session";

const demoPhrase = "NORTHWIND-DEMO";

function destination(role: Role, next: string | null) {
  const fallback = role === "participant" ? "/participant/home" : "/researcher/overview";
  if (!next?.startsWith("/")) return fallback;
  if (role === "participant" && next.startsWith("/participant")) return next;
  if (role === "researcher" && next.startsWith("/researcher")) return next;
  return fallback;
}

export function Login() {
  useTitle("Login");
  const [params] = useSearchParams();
  const requested = params.get("as");
  const initial = requested === "researcher" || requested === "participant" ? requested : null;
  const [choice, setChoice] = useState<Role | null>(initial);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState<Role | null>(null);
  const { setRole, role } = useSession();
  const navigate = useNavigate();
  const next = params.get("next");

  useEffect(() => {
    if (leaving && role === leaving) navigate(destination(leaving, next));
  }, [leaving, role, navigate, next]);

  const enter = (nextRole: Role) => {
    if (nextRole === "researcher" && phrase.trim().toUpperCase() !== demoPhrase) {
      setError("That phrase is not the approved access phrase. Research access stays closed.");
      return;
    }
    setRole(nextRole);
    setLeaving(nextRole);
  };

  return (
    <main className="gate gate-simple" id="content">
      <CornerMark />
      <Link to="/" className="folio-brand">
        <span className="folio-seal" aria-hidden="true" />
        <span>
          <strong>Aetheria</strong>
          <em>Informed consent</em>
        </span>
      </Link>
      <p className="kicker">Enter</p>
      <h1>Sign in</h1>
      <p className="lede">
        Choose Participant or Researcher.
      </p>
      <div className="role-switch" role="group" aria-label="Account type">
        <button
          type="button"
          className={choice === "participant" ? "on" : ""}
          onClick={() => {
            setChoice("participant");
            setError("");
          }}
        >
          Participant
        </button>
        <button
          type="button"
          className={choice === "researcher" ? "on" : ""}
          onClick={() => {
            setChoice("researcher");
            setError("");
          }}
        >
          Researcher
        </button>
      </div>

      {choice === "participant" && (
        <form
          className="gate-form"
          onSubmit={(event) => {
            event.preventDefault();
            enter("participant");
          }}
        >
          <p className="role-copy">
            Read the form, ask a question, or check a section. This stays in this browser.
          </p>
          <button type="submit" className="btn solid">
            Continue
          </button>
        </form>
      )}

      {choice === "researcher" && (
        <form
          className="gate-form"
          onSubmit={(event) => {
            event.preventDefault();
            enter("researcher");
          }}
        >
          <p className="role-copy">
            Research access is not self-assigned. The access phrase is {demoPhrase}.
          </p>
          <label>
            Access phrase
            <input
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              autoComplete="off"
              placeholder={demoPhrase}
            />
          </label>
          {error && <p className="notice">Use {demoPhrase}.</p>}
          <button type="submit" className="btn solid">
            Continue
          </button>
        </form>
      )}
    </main>
  );
}

export function Register() {
  useTitle("Registration");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const { setRole, requestResearchAccess, accessRequest, role } = useSession();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (leaving && role === "participant") navigate("/participant/home");
  }, [leaving, role, navigate]);

  return (
    <main className="gate" id="content">
      <CornerMark />
      <p className="kicker">Access setup</p>
      <h1>Start as a participant, or ask for research access.</h1>
      <p className="lede">
        Participant entry is for this browser session only. Research access is not something you can
        assign to yourself.
      </p>
      <div className="role-grid">
        <form
          className="role-card static"
          onSubmit={(event) => {
            event.preventDefault();
            setRole("participant", name.trim());
            setLeaving(true);
          }}
        >
          <span>Participant</span>
          <strong>Create a session</strong>
          <label>
            Preferred name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" />
          </label>
          <button type="submit" className="btn solid">
            Continue to my study
          </button>
        </form>
        <form
          className="role-card static"
          onSubmit={(event) => {
            event.preventDefault();
            requestResearchAccess(note.trim());
          }}
        >
          <span>Researcher</span>
          <strong>Request access</strong>
          <label>
            Team or name
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
          </label>
          <button type="submit" className="btn solid">
            Submit a request
          </button>
          {accessRequest === "pending" && (
            <p>
              Request recorded in this browser. It does not open the research workspace. An approved
              phrase is still required on the login page.
            </p>
          )}
        </form>
      </div>
      <p className="fine">
        Already have the access phrase? <Link to="/login?as=researcher">Researcher login</Link>
      </p>
      <p className="fine">
        <Link to="/">Back to the landing page</Link>
      </p>
    </main>
  );
}
