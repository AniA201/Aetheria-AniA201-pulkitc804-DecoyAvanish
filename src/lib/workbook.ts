import type { Passage } from "../data/documents";
import { adultSeed, extractValues } from "./blocks";
import type { SubmittedConsent } from "./consent";
import type { Language } from "./languages";
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

const versionNotes: Record<Language, Record<VersionStanding, (version: string) => string>> = {
  en: {
    unverified: (version) => `${version} is Unverified. No one has entered an approved-version list.`,
    listed: (version) => `${version} is on the list a person entered in Settings.`,
    "not-listed": (version) => `${version} is not on the list a person entered. It is not treated as the current approved form.`,
  },
  es: {
    unverified: (version) => `${version} no está verificada. Nadie ha ingresado una lista de versiones aprobadas.`,
    listed: (version) => `${version} está en la lista que una persona ingresó en Configuración.`,
    "not-listed": (version) => `${version} no está en la lista que una persona ingresó. No se trata como el formulario aprobado actual.`,
  },
  fr: {
    unverified: (version) => `${version} n'est pas vérifiée. Personne n'a saisi de liste de versions approuvées.`,
    listed: (version) => `${version} figure sur la liste qu'une personne a saisie dans Paramètres.`,
    "not-listed": (version) => `${version} ne figure pas sur la liste qu'une personne a saisie. Elle n'est pas traitée comme le formulaire approuvé actuel.`,
  },
  zh: {
    unverified: (version) => `${version} 未核实。还没有人输入已批准版本的清单。`,
    listed: (version) => `${version} 在工作人员于“设置”中输入的清单上。`,
    "not-listed": (version) => `${version} 不在工作人员输入的清单上，不会被当作当前已批准的表格。`,
  },
};

export function versionNote(version: string, approved: string[], language: Language = "en"): string {
  return versionNotes[language][versionStanding(version, approved)](version);
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
