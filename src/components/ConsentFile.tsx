import { useState } from "react";
import { loadDemoConsent, readConsentPages, readConsentText } from "../lib/consent";
import { useT } from "../lib/i18n";
import { extractPdfText } from "../lib/pdf";
import { useSession } from "../state/Session";

export function ConsentFile() {
  const { submitConsent } = useSession();
  const t = useT();
  const [chosen, setChosen] = useState<File | null>(null);
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!chosen) {
      setNote(t.file.chooseFirst);
      return;
    }
    const ext = chosen.name.split(".").pop()?.toLowerCase() ?? "";
    const pdf = ext === "pdf" || chosen.type === "application/pdf";
    if (chosen.size > (pdf ? 12_000_000 : 1_500_000)) {
      setNote("This file is too large, so it was not submitted.");
      return;
    }
    if (pdf) {
      const extracted = await extractPdfText(new Uint8Array(await chosen.arrayBuffer()));
      if (!extracted.ok) {
        setNote(extracted.error);
        return;
      }
      const result = readConsentPages(chosen.name, extracted.pages);
      if (!result.ok) {
        setNote(result.error);
        return;
      }
      submitConsent(result.consent);
      setNote(`Submitted ${extracted.pages.length} pages from ${chosen.name}.`);
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
    setNote(t.file.submitted);
  };

  return (
    <form
      className="ask-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className="file-pick">
        <input
          id="consent-file"
          type="file"
          accept=".txt,.md,.pdf,application/pdf,text/plain"
          onChange={(event) => {
            setChosen(event.target.files?.[0] ?? null);
            setNote("");
          }}
        />
        <span>{chosen ? chosen.name : t.file.choose}</span>
      </label>
      <div className="action-row">
        <button className="btn solid dark" type="submit">
          {t.file.submit}
        </button>
        <button className="btn on-paper" type="button" onClick={() => submitConsent(loadDemoConsent())}>
          {t.file.sample}
        </button>
      </div>
      <p className="fine">{t.file.hint}</p>
      {note ? <p className="notice">{note}</p> : null}
    </form>
  );
}
