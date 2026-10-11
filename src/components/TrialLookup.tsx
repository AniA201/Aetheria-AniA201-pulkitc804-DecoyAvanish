import { useState } from "react";
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
  const { publicStudyId, setPublicStudyId } = useSession();
  const [value, setValue] = useState(publicStudyId || "NCT03238781");
  const [state, setState] = useState<LookupState>({ kind: "idle" });

  const findTrial = async () => {
    const nctId = value.trim().toUpperCase();
    if (!/^NCT\d{8}$/.test(nctId)) {
      setState({ kind: "error", message: "Use NCT followed by eight digits, for example NCT03238781." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const response = await fetch(`https://clinicaltrials.gov/api/v2/studies/${nctId}`);
      if (response.status === 404) {
        setState({ kind: "error", message: "No public study was found for that NCT ID." });
        return;
      }
      if (!response.ok) throw new Error("The public registry is unavailable.");
      const study = (await response.json()) as RegistryStudy;
      setPublicStudyId(nctId);
      setValue(nctId);
      setState({ kind: "ready", study });
    } catch {
      setState({ kind: "error", message: "We could not reach ClinicalTrials.gov. Please try again shortly." });
    }
  };

  const details = state.kind === "ready" ? state.study.protocolSection : undefined;
  return (
    <section className="trial-lookup" aria-labelledby="trial-lookup-title">
      <div>
        <p className="kicker">Choose a study</p>
        <h2 id="trial-lookup-title">Start with an NCT ID.</h2>
        <p className="fine">Search any public ClinicalTrials.gov record. The detailed pre-flight demo below still uses the included public study files.</p>
      </div>
      <div className="trial-lookup-form">
        <label htmlFor="nct-id">NCT ID</label>
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
          {state.kind === "loading" ? "Finding study…" : "Find study"}
        </button>
      </div>
      {state.kind === "error" ? <p className="notice">{state.message}</p> : null}
      {details ? (
        <article className="trial-card">
          <div>
            <p className="kicker">{details.identificationModule?.nctId}</p>
            <h3>{details.identificationModule?.briefTitle ?? "Public clinical study"}</h3>
            <p>{details.sponsorCollaboratorsModule?.leadSponsor?.name ?? "Sponsor not listed"} · {details.statusModule?.overallStatus ?? "Status not listed"}</p>
          </div>
          <dl>
            <div><dt>Condition</dt><dd>{details.conditionsModule?.conditions?.join(", ") || "Not listed"}</dd></div>
            <div><dt>Phase</dt><dd>{details.designModule?.phases?.join(", ") || "Not listed"}</dd></div>
            <div><dt>Enrollment</dt><dd>{details.designModule?.enrollmentInfo?.count ?? "Not listed"}</dd></div>
          </dl>
          <a href={`https://clinicaltrials.gov/study/${details.identificationModule?.nctId}`} target="_blank" rel="noreferrer">
            Open public record
          </a>
        </article>
      ) : null}
    </section>
  );
}
