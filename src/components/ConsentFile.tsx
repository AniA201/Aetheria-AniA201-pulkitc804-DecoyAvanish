import { useState } from "react";
import { loadDemoConsent, readConsentText } from "../lib/consent";
import { useSession } from "../state/Session";

export function ConsentFile() {
  const { submitConsent } = useSession();
  const [chosen, setChosen] = useState<File | null>(null);
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!chosen) {
      setNote("Choose a consent file, then submit it.");
      return;
    }
    if (chosen.size > 1_500_000) {
      setNote("This file is over 1.5 MB, so it was not submitted.");
      return;
    }
    const ext = chosen.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf" || chosen.type === "application/pdf") {
      setNote(
        "This PDF was not read. Text extraction is not available, so nothing was indexed. Use a .txt or .md file, or the included sample.",
      );
      return;
    }
    if (ext === "docx" || chosen.type.includes("wordprocessingml")) {
      setNote(
        "This Word file was not read. Text extraction is not available, so nothing was indexed. Use a .txt or .md file, or the included sample.",
      );
      return;
    }
    if (ext !== "txt" && ext !== "md" && ext !== "text") {
      setNote("Use a .txt or .md consent form.");
      return;
    }
    const result = readConsentText(chosen.name, await chosen.text());
    if (!result.ok) {
      setNote(result.error);
      return;
    }
    submitConsent(result.consent);
    setNote("Submitted.");
  };

  return (
    <form
      className="ask-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label htmlFor="consent-file">Consent form</label>
      <div className="action-row">
        <input
          id="consent-file"
          type="file"
          accept=".txt,.md,.pdf,.docx,text/plain"
          onChange={(event) => {
            setChosen(event.target.files?.[0] ?? null);
            setNote("");
          }}
        />
        <button className="btn solid dark" type="submit">
          Submit consent
        </button>
        <button className="btn on-paper" type="button" onClick={() => submitConsent(loadDemoConsent())}>
          Use included sample
        </button>
      </div>
      <p className="fine">Use included sample loads the bundled file ICF-AETHER-01 v2.1.</p>
      {note ? <p className="notice">{note}</p> : null}
    </form>
  );
}
