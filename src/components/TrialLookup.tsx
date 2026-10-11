import { useState } from "react";
import { useR } from "../lib/researchI18n";
import { useSession } from "../state/Session";

type RegistryStudy = {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string; officialTitle?: string };
    statusModule?: { overallStatus?: string; lastUpdatePostDateStruct?: { date?: string } };
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
    conditionsModule?: { conditions?: string[] };
    designModule?: { phases?: string[]; enrollmentInfo?: { count?: number } };
  };
};

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; study: RegistryStudy };

export function TrialLookup() {
  const r = useR();
  const l = r.ui.lookup;
  const { publicStudyId, setPublicStudyId } = useSession();
  const [value, setValue] = useState(publicStudyId || "NCT03238781");
  const [state, setState] = useState<LookupState>({ kind: "idle" });

  const findTrial = async () => {
    const nctId = value.trim().toUpperCase();
    if (!/^NCT\d{8}$/.test(nctId)) {
      setState({ kind: "error", message: l.invalid });
      return;
    }
    setState({ kind: "loading" });
    try {
      const response = await fetch(`https://clinicaltrials.gov/api/v2/studies/${nctId}`);
      if (response.status === 404) {
        setState({ kind: "error", message: l.notFound });
        return;
      }
      if (!response.ok) throw new Error("The public registry is unavailable.");
      const study = (await response.json()) as RegistryStudy;
      setPublicStudyId(nctId);
      setValue(nctId);
      setState({ kind: "ready", study });
    } catch {
      setState({ kind: "error", message: l.offline });
    }
  };

  const details = state.kind === "ready" ? state.study.protocolSection : undefined;
  return (
    <section className="trial-lookup" aria-label={l.label}>
      <div className="trial-lookup-form">
        <label htmlFor="nct-id">{l.label}</label>
        <input
          id="nct-id"
          value={value}
          inputMode="text"
          autoCapitalize="characters"
          placeholder="NCT03238781"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void findTrial();
          }}
        />
        <button type="button" className="btn solid dark" onClick={() => void findTrial()} disabled={state.kind === "loading"}>
          {state.kind === "loading" ? l.finding : l.find}
        </button>
      </div>
      {state.kind === "error" ? <p className="notice">{state.message}</p> : null}
      {details ? (
        <article className="trial-card">
          <div lang="en">
            <p className="kicker">{details.identificationModule?.nctId}</p>
            <h3>{details.identificationModule?.briefTitle ?? details.identificationModule?.nctId}</h3>
            <p>
              {details.sponsorCollaboratorsModule?.leadSponsor?.name ?? l.notListed} · {details.statusModule?.overallStatus ?? l.notListed}
            </p>
          </div>
          <dl>
            <div>
              <dt>{l.condition}</dt>
              <dd lang="en">{details.conditionsModule?.conditions?.join(", ") || l.notListed}</dd>
            </div>
            <div>
              <dt>{l.phase}</dt>
              <dd lang="en">{details.designModule?.phases?.join(", ") || l.notListed}</dd>
            </div>
            <div>
              <dt>{l.enrollment}</dt>
              <dd>{details.designModule?.enrollmentInfo?.count ?? l.notListed}</dd>
            </div>
          </dl>
          <a href={`https://clinicaltrials.gov/study/${details.identificationModule?.nctId}`} target="_blank" rel="noreferrer">
            {l.open}
          </a>
          {details.identificationModule?.nctId !== "NCT03238781" ? <p className="fine">{l.stored}</p> : null}
        </article>
      ) : null}
    </section>
  );
}
