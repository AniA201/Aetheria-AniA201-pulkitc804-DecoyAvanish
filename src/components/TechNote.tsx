import { useLocation } from "react-router-dom";

// "How this works" notes shown at the foot of each screen: the technology behind it and the
// protection or governance rule it follows. Wording matches the demo script.
type Note = { title: string; tech: string; guard: string; guardLabel?: "Protection" | "Governance" };

export const techNotes: Record<string, Note> = {
  landing: {
    title: "What Aetheria is",
    tech: "React + TypeScript + Vite frontend; Three.js for the interactive visuals.",
    guard: "A tool that assists — it never replaces the human consent conversation.",
    guardLabel: "Governance",
  },
  auth: {
    title: "Sign up and log in",
    tech: "Python FastAPI backend (SQLite locally, Neon Postgres when deployed); passwords hashed with bcrypt; login issues a JWT token (8-hour expiry).",
    guard: "Role-based access enforced on every request; researcher sign-up gated by a secret key; generic login errors so accounts can't be enumerated; all inputs validated server-side.",
  },
  home: {
    title: "Upload the form",
    tech: "Mozilla PDF.js running in a browser Web Worker; reconstructs lines and words from each glyph's position, and strips repeating headers and footers.",
    guard: "100% client-side — the form never leaves the device. No OCR, so it honestly refuses scanned image-only PDFs instead of guessing.",
  },
  read: {
    title: "READ",
    tech: "Plain English is extractive (lead-based summarization) or human-reviewed — not AI-paraphrased. Translation uses Gemini with a number-preserving guard. Read-aloud uses the browser's Web Speech API.",
    guard: "We deliberately don't let AI reword the English, so a risk or dose can't accidentally change meaning. Translations are forced to keep every number exactly.",
  },
  ask: {
    title: "ASK",
    tech: "Google Gemini as a tool-calling agent over a RAG search (keyword retrieval) of the form, with a validation gate that rejects any answer citing something outside the form or any number not in the source.",
    guard: "Can't hallucinate — every answer must cite a real passage. Prompt-injection defense (the form is treated as untrusted data). Never gives medical advice or says \"you should join.\" Falls back to a local model or the built-in rules if the cloud is down.",
  },
  feedback: {
    title: "FEEDBACK (teach-back)",
    tech: "Gemini-assisted comprehension scoring with concept-matching and misconception detection; deterministic local scoring as a fallback.",
    guard: "No pass/fail, no pressure — it can't say \"you consented.\" Unclear points are flagged for a real conversation.",
    guardLabel: "Governance",
  },
  review: {
    title: "REVIEW (My Summary)",
    tech: "Gemini-generated briefing grounded in my own session; messaging handoff through the FastAPI backend.",
    guard: "A human is always in the loop — the study's approval status stays \"Unverified,\" and the real consent conversation happens with a person.",
    guardLabel: "Governance",
  },
  overview: {
    title: "Overview",
    tech: "Counts drawn from this session, the stored handoffs, and the document checks.",
    guard: "The AI flags; only a person resolves a flag.",
    guardLabel: "Governance",
  },
  integrity: {
    title: "Document Integrity",
    tech: "Rule-based checks — a SPIRIT/ICH-M11 checklist matcher, and regex-bound fact extraction that compares the same value across the protocol, SAP, and registry. No AI — fully deterministic. Trial Lookup pulls any study live from the ClinicalTrials.gov v2 REST API by its NCT ID (no key needed).",
    guard: "Catch-rates measured against a known answer key, so it's verifiable, not \"trust me.\"",
    guardLabel: "Governance",
  },
  insights: {
    title: "Insights",
    tech: "Teach-back handoffs and saved questions, read from the FastAPI backend.",
    guard: "Only signed-in researchers can open it, and it shows only what participants chose to send to the team.",
  },
  studio: {
    title: "Plain-Language Studio",
    tech: "Flesch readability formulas, a hype-word blocklist, and regex number-tracing against source passages.",
    guard: "Rewrites are human-driven and checked — facts can't drift, and promotional language is blocked by rule.",
    guardLabel: "Governance",
  },
  lab: {
    title: "Test Lab",
    tech: "Answer-key evaluation harness over the planted drafts (precision/recall).",
    guard: "Transparent, reproducible accuracy — the same input always gives the same result.",
    guardLabel: "Governance",
  },
  documents: {
    title: "Documents (Write-Once)",
    tech: "Data-bound content blocks with change-propagation: the protocol, consent form, and registry entry are built from one source.",
    guard: "Every propagated change needs a human to approve it, with ownership tracked per block.",
    guardLabel: "Governance",
  },
};

const routes: Array<[RegExp, keyof typeof techNotes]> = [
  [/^\/participant\/home/, "home"],
  [/^\/participant\/(my-study|explore-consent)/, "read"],
  [/^\/participant\/ask/, "ask"],
  [/^\/participant\/teach-back/, "feedback"],
  [/^\/participant\/summary/, "review"],
  [/^\/researcher\/overview/, "overview"],
  [/^\/researcher\/document-integrity/, "integrity"],
  [/^\/researcher\/insights/, "insights"],
  [/^\/researcher\/plain-language/, "studio"],
  [/^\/researcher\/test-lab/, "lab"],
  [/^\/researcher\/documents/, "documents"],
];

export function TechNote({ note }: { note: keyof typeof techNotes }) {
  const { title, tech, guard, guardLabel = "Protection" } = techNotes[note];
  return (
    <details className="tech-note" open>
      <summary>
        How this works <span>· {title}</span>
      </summary>
      <p>
        <strong>Tech</strong> {tech}
      </p>
      <p>
        <strong>{guardLabel}</strong> {guard}
      </p>
    </details>
  );
}

/** The note for the current workspace route, if the demo script covers it. */
export function RouteTechNote() {
  const { pathname } = useLocation();
  const match = routes.find(([pattern]) => pattern.test(pathname));
  return match ? <TechNote note={match[1]} /> : null;
}
