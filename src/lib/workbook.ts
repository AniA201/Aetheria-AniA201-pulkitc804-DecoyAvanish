import type { Passage } from "../data/documents";
import { adultSeed, extractValues } from "./blocks";
import type { SubmittedConsent } from "./consent";
import { toCaregiver, type CheckSource } from "./plainLab";

export type AnnexRow = {
  id: string;
  element: string;
  state: string;
};

export const annexV: AnnexRow[] = [
  ["id", "Trial identification"],
  ["sponsor", "Sponsor contact"],
  ["general", "General information about the trial"],
  ["population", "Who took part"],
  ["product", "Investigational product"],
  ["safety", "Adverse reactions and how often they occurred"],
  ["results", "Overall results"],
  ["comments", "Comments on the outcome"],
  ["follow", "Whether follow-up trials are planned"],
  ["more", "Where to find more information"],
].map(([id, element]) => ({
  id,
  element,
  state: "No results. AETHER-01 is a practice consent and protocol, not a completed trial, so this heading stays empty.",
}));

export type VersionStanding = "unverified" | "listed" | "not-listed";

export function versionStanding(version: string, approved: string[]): VersionStanding {
  const list = approved.map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return "unverified";
  return list.some((item) => item.toLowerCase() === version.trim().toLowerCase()) ? "listed" : "not-listed";
}

export function versionNote(version: string, approved: string[], language: "en" | "es" = "en"): string {
  const standing = versionStanding(version, approved);
  if (language === "es") {
    if (standing === "unverified") return `${version} no está verificada. Nadie ha ingresado una lista de versiones aprobadas.`;
    if (standing === "listed") return `${version} está en la lista que una persona ingresó en Configuración.`;
    return `${version} no está en la lista que una persona ingresó. No se trata como el formulario aprobado actual.`;
  }
  if (standing === "unverified") {
    return `${version} is Unverified. No one has entered an approved-version list.`;
  }
  if (standing === "listed") return `${version} is on the list a person entered in Settings.`;
  return `${version} is not on the list a person entered. It is not treated as the current approved form.`;
}

export type ReadingSource = CheckSource & { title: string; passages: Passage[]; adult: string; caregiver: string };

const figurePattern = /\$\d+|\b\d+\s*(?:times|visits|weeks|years|teaspoons|hours)\b/gi;

/** What the two plain readings are written from, and the figures they must keep. */
export function readingSource(consent: SubmittedConsent | null): ReadingSource {
  if (!consent || consent.source === "demo") {
    const values = extractValues();
    const adult = adultSeed(values);
    const pick = (ids: string[]) => consent?.passages.filter((passage) => ids.includes(passage.sectionId)) ?? [];
    const passages = pick(["procedures", "costs"]);
    const differs = (id: "visits" | "duration" | "pay") => values[id].protocol !== values[id].consent;
    return {
      title: "Procedures and costs",
      original: passages.map((passage) => passage.text).join(" ") || adult,
      mustKeep: [`${values.visits.consent} times`, `${values.duration.consent} weeks`, `$${values.pay.consent}`],
      mustNotAdd: [
        differs("visits") ? `${values.visits.protocol} visits` : "",
        differs("duration") ? `${values.duration.protocol} weeks` : "",
        differs("pay") ? `$${values.pay.protocol}` : "",
      ].filter(Boolean),
      passages,
      adult,
      caregiver: toCaregiver(adult),
    };
  }
  const first = consent.sections[0];
  const original = first?.original ?? "";
  const adult = first?.plain ?? "";
  return {
    title: first?.title ?? "First section",
    original,
    mustKeep: [...new Set(original.match(figurePattern) ?? [])],
    mustNotAdd: [],
    passages: consent.passages.slice(0, 1),
    adult,
    caregiver: toCaregiver(adult),
  };
}
