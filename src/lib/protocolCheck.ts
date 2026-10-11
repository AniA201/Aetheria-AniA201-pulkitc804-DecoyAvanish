import { listPassages } from "../data/documents";
import { blocks, type BlockId } from "./blocks";

export type ProtocolSection = { id: string; heading: string; page: string; citation: string; text: string };
export type ProtocolMeta = { documentId?: string; version?: string; date?: string };
export type Mark = "present" | "thin" | "missing";

type Item = { id: string; list: "SPIRIT 2025" | "ICH M11"; ref: string; item: string; terms: RegExp[] };

export type ChecklistResult = {
  id: string;
  list: Item["list"];
  ref: string;
  item: string;
  mark: Mark;
  where: string;
  evidence: string;
  why: string;
};

/** SPIRIT 2025 Table 1 (Chan et al., BMJ/JAMA/Lancet 2025; PMC12035670). Sub-items are grouped under their number. */
const spirit: Item[] = [
  ["1", "Title and structured summary", [/\btitle\b/, /synopsis/, /structured summary/]],
  ["2", "Protocol version: version date and identifier", []],
  ["3", "Roles and responsibilities, including sponsor contact and committees", [/\bsponsor\b/, /steering committee/, /contributors?/, /coordinating (site|centre|center)/]],
  ["4", "Trial registration: registry, number, and date", [/registry/, /registration/, /clinicaltrials\.gov/, /\bnct\d+/]],
  ["5", "Where the protocol and statistical analysis plan can be accessed", [/statistical analysis plan/, /\bsap\b/]],
  ["6", "Data sharing: de-identified participant data and code", [/data sharing/, /de-identified/, /share[sd]? (the )?data/]],
  ["7", "Funding and conflicts of interest", [/funding|funded by/, /conflicts? of interest/]],
  ["8", "Dissemination policy for results", [/dissemina/, /plain language summary/, /results will be (shared|published|reported)/]],
  ["9", "Background, rationale, and choice of comparator", [/background/, /rationale/]],
  ["10", "Objectives related to benefits and harms", [/objective/]],
  ["11", "Patient and public involvement", [/patient and public/, /public involvement/, /patient involvement/]],
  ["12", "Trial design: type, allocation ratio, and framework", [/trial design|study design/, /parallel/, /crossover/, /allocation ratio/, /superiority|non-inferiority|equivalence/]],
  ["13", "Trial setting and locations", [/\bsites?\b/, /countr(y|ies)/, /hospital/, /\bsetting\b/]],
  ["14", "Eligibility criteria for participants and sites", [/eligib/, /inclusion/, /exclusion/]],
  ["15", "Intervention and comparator, discontinuation, adherence, concomitant care", [/placebo/, /comparator/, /\bdos(e|ing)\b/, /administ/, /concomitant/]],
  ["16", "Primary and secondary outcomes with measure, metric, and time point", [/outcome/, /endpoint/]],
  ["17", "Harms: definition and assessment", [/adverse event/, /\bharms?\b/, /side effect/]],
  ["18", "Participant timeline: enrolment, interventions, assessments, visits", [/schedule/, /timeline/, /\bvisits?\b/, /\bweek \d+/]],
  ["19", "Sample size and its assumptions", [/sample size/, /\benrol/, /\bpower\b/]],
  ["20", "Recruitment strategies", [/recruit/]],
  ["21", "Randomisation: sequence generation and type", [/randomi[sz]/, /allocation sequence/]],
  ["22", "Allocation concealment mechanism", [/conceal/]],
  ["23", "Implementation: who enrols and who assigns", [/assign(s|ed)? participants/, /access to the (random )?allocation/]],
  ["24", "Blinding: who, how, and when unblinding is allowed", [/blind/, /mask(ed|ing)/, /unblind/]],
  ["25", "Data collection methods and retention of participants", [/data collection/, /questionnaire/, /diary/, /laborator/, /instrument/]],
  ["26", "Data management: entry, coding, security, storage", [/data management/, /data entry/, /retain|retention/, /stor(ed|age)/]],
  ["27", "Statistical methods, analysis population, and missing data", [/statistic/, /analys[ie]s/, /missing data/]],
  ["28", "Data monitoring committee and interim analyses", [/data monitoring committee/, /\bdmc\b/, /interim analys/, /stopping (rule|guideline)/]],
  ["29", "Trial monitoring", [/monitor(ing|s)?\b/]],
  ["30", "Research ethics approval", [/ethics/, /\birb\b/, /institutional review/]],
  ["31", "Communicating protocol amendments", [/amendment/]],
  ["32", "Who obtains consent or assent, and how", [/consent/, /assent/]],
  ["33", "Confidentiality of personal information", [/confidential/, /privacy/, /\bcoded\b/, /personal information/]],
  ["34", "Ancillary and post-trial care, and compensation for harm", [/post-trial/, /ancillary care/, /injur/, /compensation for harm/]],
].map(([ref, item, terms]) => ({ id: `spirit-${ref}`, list: "SPIRIT 2025" as const, ref: ref as string, item: item as string, terms: terms as RegExp[] }));

/** ICH M11 template headings (FDA copy, May 2026, adopted 19 November 2025). A subset of level-2 headings. */
const m11: Item[] = [
  ["1.1", "Protocol Synopsis", [/synopsis/, /protocol summary/]],
  ["1.3", "Schedule of Activities", [/schedule of (activities|assessments)/, /\bschedule\b/]],
  ["2.1", "Purpose of Trial", [/purpose/, /rationale/]],
  ["2.2", "Assessment of Risks and Benefits", [/risks? and benefits?/, /benefit-risk/]],
  ["3.1", "Primary Objective(s) and Associated Estimand(s)", [/primary objective/, /estimand/, /primary endpoint/]],
  ["3.2", "Secondary Objective(s) and Associated Estimand(s)", [/secondary objective/, /secondary endpoint/]],
  ["4.1", "Description of Trial Design", [/trial design|study design/, /treatment period/]],
  ["4.4", "Start of Trial and End of Trial", [/end of (the )?(trial|study)/, /last (clinic )?visit/, /study completion/]],
  ["5.2", "Inclusion Criteria", [/inclusion/]],
  ["5.3", "Exclusion Criteria", [/exclusion/]],
  ["6.1", "Description of Investigational Trial Intervention", [/investigational/, /study drug/, /placebo/]],
  ["6.7", "Investigational Trial Intervention Assignment, Randomisation and Blinding", [/randomi[sz]/, /blind/, /allocation/]],
  ["6.10", "Concomitant Therapy", [/concomitant/, /prohibited medication/]],
  ["7.2", "Participant Discontinuation or Withdrawal from the Trial", [/withdraw/, /discontinu/]],
  ["8.4", "Safety Assessments and Procedures", [/safety/, /vital signs/, /laborator/]],
  ["9.1", "Adverse event definitions", [/adverse event/]],
  ["10.4", "Analyses Associated with the Primary Objective(s)", [/primary analysis/, /statistic/]],
  ["10.11", "Sample Size Determination", [/sample size/]],
  ["11.3", "Informed Consent Process", [/informed consent/, /consent process/]],
  ["11.8", "Data Protection", [/data protection/, /confidential/, /privacy/]],
  ["11.9", "Source Records", [/source (records|documents)/, /essential documents/, /retain/]],
  ["11.12", "Data Dissemination", [/dissemina/, /publication/]],
  ["12.1", "Clinical Laboratory Tests", [/laborator/]],
  ["12.3", "Prior Protocol Amendment(s)", [/amendment/]],
].map(([ref, item, terms]) => ({ id: `m11-${ref}`, list: "ICH M11" as const, ref: ref as string, item: item as string, terms: terms as RegExp[] }));

export const checklistItems: Item[] = [...m11, ...spirit];

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

function firstSentenceWith(text: string, terms: RegExp[]): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.find((sentence) => terms.some((term) => term.test(sentence.toLowerCase()))) ?? sentences[0] ?? "";
}

export function runChecklist(sections: ProtocolSection[], meta: ProtocolMeta = {}): ChecklistResult[] {
  return checklistItems.map((item) => {
    if (item.id === "spirit-2") {
      const ok = Boolean(meta.version && meta.date);
      return {
        id: item.id,
        list: item.list,
        ref: item.ref,
        item: item.item,
        mark: ok ? "present" : "missing",
        where: ok ? "Document header" : "Not found",
        evidence: ok ? `${meta.documentId ?? "Protocol"} ${meta.version}, ${meta.date}` : "",
        why: ok ? "A version identifier and date are stated." : "No version identifier and date were found.",
      };
    }
    let best: { section: ProtocolSection; hits: number; heading: boolean } | null = null;
    for (const section of sections) {
      const heading = section.heading.toLowerCase();
      const body = `${heading} ${section.text.toLowerCase()}`;
      const hits = item.terms.filter((term) => term.test(body)).length;
      const headingHit = item.terms.some((term) => term.test(heading));
      if (hits > 0 && (!best || hits > best.hits || (hits === best.hits && headingHit && !best.heading))) {
        best = { section, hits, heading: headingHit };
      }
    }
    if (!best) {
      return {
        id: item.id,
        list: item.list,
        ref: item.ref,
        item: item.item,
        mark: "missing",
        where: "Not found",
        evidence: "",
        why: `Nothing in this protocol addresses it. The item asks for: ${item.item.toLowerCase()}.`,
      };
    }
    const length = words(best.section.text);
    const present = (best.heading && length >= 25) || best.hits >= 3;
    const where = `${best.section.citation}, ${best.section.page}`;
    return {
      id: item.id,
      list: item.list,
      ref: item.ref,
      item: item.item,
      mark: present ? "present" : "thin",
      where,
      evidence: firstSentenceWith(best.section.text, item.terms),
      why: present
        ? `Addressed in ${where}.`
        : `Only touched on in ${where} (${length} words). The item asks for: ${item.item.toLowerCase()}.`,
    };
  });
}

export type Score = { value: number; present: number; thin: number; missing: number; total: number };

/** Coverage count, not a quality grade: present = 1, thin = 0.5, missing = 0. */
export function coverageScore(rows: ChecklistResult[]): Score {
  const present = rows.filter((row) => row.mark === "present").length;
  const thin = rows.filter((row) => row.mark === "thin").length;
  const total = rows.length;
  return { value: total === 0 ? 0 : Math.round(((present + thin * 0.5) / total) * 100), present, thin, missing: total - present - thin, total };
}

export type Finding = {
  id: string;
  kind: "internal" | "cross";
  status: "flag" | "ok" | "cannot-check";
  title: string;
  where: string;
  why: string;
  fix: string;
};

export function internalChecks(sections: ProtocolSection[]): Finding[] {
  const all = sections.map((section) => section.text).join(" ");
  const cite = (pattern: RegExp) => {
    const hit = sections.find((section) => pattern.test(section.text));
    return hit ? `${hit.citation}, ${hit.page}` : "Not found";
  };
  const periods = new Set(
    [...all.matchAll(/treatment period is (\d+) weeks|(\d+)-week treatment period/g)].map((match) => match[1] ?? match[2]),
  );
  const last = all.match(/last (?:clinic )?visit (?:is )?at week (\d+)/);
  const findings: Finding[] = [];

  if (periods.size === 0) {
    findings.push({
      id: "period",
      kind: "internal",
      status: "cannot-check",
      title: "Treatment period",
      where: "Not found",
      why: "No treatment period is stated, so the schedule cannot be checked against it.",
      fix: "State the treatment period once, in the trial design section.",
    });
  } else if (periods.size > 1) {
    findings.push({
      id: "period",
      kind: "internal",
      status: "flag",
      title: "Treatment period disagrees with itself",
      where: cite(/treatment period/),
      why: `The protocol gives more than one treatment period: ${[...periods].join(" and ")} weeks.`,
      fix: "Pick one period and reuse the same block everywhere it appears.",
    });
  } else {
    const period = [...periods][0];
    if (!last) {
      findings.push({
        id: "last-visit",
        kind: "internal",
        status: "flag",
        title: "No visit at the end of treatment",
        where: cite(/treatment period/),
        why: `The treatment period is ${period} weeks, but no last visit is scheduled, so end-of-treatment measurements have nowhere to happen.`,
        fix: `Add the week-${period} visit to the schedule, or say how the end of treatment is assessed.`,
      });
    } else if (last[1] !== period) {
      findings.push({
        id: "last-visit",
        kind: "internal",
        status: "flag",
        title: "Last visit and treatment period disagree",
        where: cite(/last (clinic )?visit/),
        why: `The treatment period is ${period} weeks, but the last visit is at week ${last[1]}.`,
        fix: "Move the last visit or correct the period so both say the same week.",
      });
    } else {
      findings.push({
        id: "last-visit",
        kind: "internal",
        status: "ok",
        title: "Last visit matches the treatment period",
        where: cite(/last (clinic )?visit/),
        why: `The treatment period is ${period} weeks and the last visit is at week ${period}.`,
        fix: "Nothing to change.",
      });
    }
  }

  const endpoints = [...all.matchAll(/(primary|secondary) (?:endpoint|outcome)[^.]*?\bweek (\d+)/gi)];
  if (endpoints.length === 0) {
    findings.push({
      id: "endpoint-visit",
      kind: "internal",
      status: "cannot-check",
      title: "Endpoints against the schedule",
      where: "Not found",
      why: "No endpoint with a time point is written, so no endpoint can be matched to a visit.",
      fix: "Write each endpoint with its measurement and time point.",
    });
  } else {
    const visitWeeks = new Set([...all.matchAll(/visit (?:is )?at week (\d+)|week (\d+) visit/g)].map((match) => match[1] ?? match[2]));
    for (const [, which, week] of endpoints) {
      const covered = visitWeeks.has(week);
      findings.push({
        id: `endpoint-${which.toLowerCase()}-${week}`,
        kind: "internal",
        status: covered ? "ok" : "flag",
        title: covered ? `The ${which.toLowerCase()} endpoint has a visit` : `The ${which.toLowerCase()} endpoint has no visit`,
        where: cite(new RegExp(`${which} (endpoint|outcome)`, "i")),
        why: covered
          ? `The ${which.toLowerCase()} endpoint is measured at week ${week}, and the schedule has a week-${week} visit.`
          : `The ${which.toLowerCase()} endpoint is measured at week ${week}, but no visit is scheduled at week ${week}.`,
        fix: covered ? "Nothing to change." : `Add a week-${week} visit, or move the endpoint to a week that has a visit.`,
      });
    }
  }
  return findings;
}

type Lookup = (ref: { documentId: string; version: string; sectionId: string }) => string | undefined;

const storedLookup: Lookup = (ref) =>
  listPassages().find(
    (passage) => passage.documentId === ref.documentId && passage.version === ref.version && passage.sectionId === ref.sectionId,
  )?.text;

export function crossChecks(lookup: Lookup = storedLookup): Finding[] {
  return blocks.map((block) => {
    const read = (side: "protocol" | "consent") => {
      const pattern = block.pattern[side];
      return lookup(pattern)?.match(pattern.regex)?.[1];
    };
    const protocol = read("protocol");
    const consent = read("consent");
    const cite = (ref: { documentId: string; version: string; sectionId: string }) => {
      const passage = listPassages().find(
        (item) => item.documentId === ref.documentId && item.version === ref.version && item.sectionId === ref.sectionId,
      );
      return passage ? `${passage.citation}, ${passage.page}` : `${ref.documentId} ${ref.sectionId}`;
    };
    const where = `${cite(block.pattern.protocol)} · ${cite(block.pattern.consent)}`;
    if (!protocol || !consent) {
      return {
        id: `cross-${block.id}`,
        kind: "cross" as const,
        status: "cannot-check" as const,
        title: block.label,
        where,
        why: `${!protocol ? "The protocol" : "The consent"} does not state ${block.label.toLowerCase()}.`,
        fix: "State the value in both documents.",
      };
    }
    const same = protocol === consent;
    return {
      id: `cross-${block.id}`,
      kind: "cross" as const,
      status: same ? ("ok" as const) : ("flag" as const),
      title: block.label,
      where,
      why: same ? `Both documents say ${protocol} ${block.unit}.` : `The protocol says ${protocol}, the consent says ${consent} (${block.unit}).`,
      fix: same ? "Nothing to change." : "A person picks one value. Propose a change to see every sentence that would move.",
    };
  });
}

export function practiceProtocol(): { sections: ProtocolSection[]; meta: ProtocolMeta } {
  const passages = listPassages().filter((passage) => passage.documentId === "PROT-AETHER-01" && passage.version === "v3.0");
  return {
    sections: passages.map((passage) => ({
      id: passage.sectionId,
      heading: passage.heading,
      page: passage.page,
      citation: passage.citation,
      text: passage.text,
    })),
    meta: { documentId: "PROT-AETHER-01", version: passages[0]?.version, date: passages[0]?.date },
  };
}

export type PlantedCase = {
  id: string;
  label: string;
  planted: string[];
  edit: (sections: Record<string, string>) => Record<string, string>;
};

const answerKey = ["cross-visits", "cross-duration", "cross-pay"];

export const plantedCases: PlantedCase[] = [
  { id: "baseline", label: "Practice pair as written", planted: [], edit: (s) => s },
  {
    id: "blood",
    label: "Protocol blood sample changed to about 4 teaspoons",
    planted: ["cross-blood"],
    edit: (s) => ({ ...s, blood: s.blood.replace("about 2 teaspoons", "about 4 teaspoons").replace("10 mL", "20 mL") }),
  },
  {
    id: "retention",
    label: "Protocol record retention changed to 10 years",
    planted: ["cross-retention"],
    edit: (s) => ({ ...s, retention: s.retention.replace("15 years", "10 years") }),
  },
  {
    id: "last-week",
    label: "Last clinic visit moved to week 20",
    planted: ["last-visit"],
    edit: (s) => ({ ...s, duration: s.duration.replace("last clinic visit at week 24", "last clinic visit at week 20") }),
  },
  {
    id: "no-last",
    label: "Week-24 visit deleted",
    planted: ["last-visit"],
    edit: (s) => ({ ...s, duration: "The treatment period is 24 weeks." }),
  },
  {
    id: "endpoint-28",
    label: "Primary endpoint added at week 28, with no week-28 visit",
    planted: ["endpoint-primary-28"],
    edit: (s) => ({ ...s, endpoint: "The primary endpoint is the change in monthly migraine days at week 28." }),
  },
  {
    id: "endpoint-24",
    label: "Control: primary endpoint at week 24, which has a visit",
    planted: [],
    edit: (s) => ({ ...s, endpoint: "The primary endpoint is the change in monthly migraine days at week 24." }),
  },
];

export type CaseResult = { id: string; label: string; expected: string[]; found: string[]; missed: string[]; falseAlarms: string[] };

export function runPlantedCases(): { cases: CaseResult[]; planted: number; caught: number; falseAlarms: number } {
  const base = practiceProtocol();
  const original = Object.fromEntries(base.sections.map((section) => [section.id, section.text]));
  const cases = plantedCases.map((plant) => {
    const edited = plant.edit({ ...original });
    const sections: ProtocolSection[] = Object.entries(edited).map(([id, text]) => {
      const from = base.sections.find((section) => section.id === id);
      return { id, heading: from?.heading ?? "Endpoints", page: from?.page ?? "p. 12", citation: from?.citation ?? "Protocol §3.1 Endpoints", text };
    });
    const lookup: Lookup = (ref) =>
      ref.documentId === "PROT-AETHER-01" ? edited[ref.sectionId] : storedLookup(ref);
    const found = [...internalChecks(sections), ...crossChecks(lookup)]
      .filter((finding) => finding.status === "flag")
      .map((finding) => finding.id);
    const expected = [...answerKey, ...plant.planted];
    return {
      id: plant.id,
      label: plant.label,
      expected,
      found,
      missed: expected.filter((id) => !found.includes(id)),
      falseAlarms: found.filter((id) => !expected.includes(id)),
    };
  });
  const planted = plantedCases.reduce((sum, plant) => sum + plant.planted.length, 0) + answerKey.length;
  const caught =
    plantedCases.reduce((sum, plant, index) => sum + plant.planted.filter((id) => cases[index].found.includes(id)).length, 0) +
    answerKey.filter((id) => cases[0].found.includes(id)).length;
  return { cases, planted, caught, falseAlarms: cases.reduce((sum, item) => sum + item.falseAlarms.length, 0) };
}

export type Hotspot = { id: string; category: string; where: string; why: string; fix: string };

export function hotspots(rows: ChecklistResult[], findings: Finding[]): Hotspot[] {
  const missing = (id: string) => rows.find((row) => row.id === id)?.mark === "missing";
  const flagged = (id: string) => findings.find((finding) => finding.id === id)?.status === "flag";
  const out: Hotspot[] = [];
  const schedule = (["visits", "duration"] as BlockId[]).filter((id) => flagged(`cross-${id}`));
  if (schedule.length > 0) {
    out.push({
      id: "schedule",
      category: "Visit schedule",
      where: "Protocol §6.1, §6.2 · Consent §4.1",
      why: `The protocol and consent disagree on ${schedule.map((id) => blocks.find((block) => block.id === id)?.label.toLowerCase()).join(" and ")}. If the consent is corrected after approval, sites re-approve and participants may be re-consented.`,
      fix: "Settle the schedule before either document is finalized.",
    });
  }
  if (flagged("cross-pay")) {
    out.push({
      id: "pay",
      category: "Participant payment",
      where: "Protocol §11.4 · Consent §7.1",
      why: "The payment differs between the documents. A change to what participants are told usually means re-consent.",
      fix: "Agree the amount and reuse one block in both documents.",
    });
  }
  if (missing("spirit-14")) {
    out.push({
      id: "eligibility",
      category: "Eligibility",
      where: "Not in this protocol",
      why: "No eligibility criteria are written. The starter sheet names eligibility as one of the most common amendment categories in the Tufts CSDD work.",
      fix: "Write inclusion and exclusion criteria before finalizing.",
    });
  }
  if (missing("spirit-17") && missing("m11-9.1")) {
    out.push({
      id: "safety",
      category: "Safety assessments",
      where: "Not in this protocol",
      why: "No harms definition or safety assessment section is written, another common amendment category named in the starter sheet.",
      fix: "Define adverse events and how and when they are assessed.",
    });
  }
  if (missing("spirit-16")) {
    out.push({
      id: "endpoints",
      category: "Endpoints",
      where: "Not in this protocol",
      why: "Without endpoints, the schedule cannot be checked for the visits it needs.",
      fix: "Write primary and secondary endpoints with time points.",
    });
  }
  return out;
}

export function burden(): { hoursPerVisit: number | null; protocol: number | null; consent: number | null; assumption: string } {
  const text = (documentId: string, sectionId: string) =>
    listPassages().find((passage) => passage.documentId === documentId && passage.sectionId === sectionId)?.text ?? "";
  const hours = Number(text("ICF-AETHER-01", "procedures").match(/Each visit lasts about (\d+) hours?/)?.[1] ?? NaN);
  const protocolVisits = Number(text("PROT-AETHER-01", "visits").match(/(\d+) clinic visits/)?.[1] ?? NaN);
  const consentVisits = Number(text("ICF-AETHER-01", "procedures").match(/clinic (\d+) times/)?.[1] ?? NaN);
  const ok = Number.isFinite(hours);
  return {
    hoursPerVisit: ok ? hours : null,
    protocol: ok && Number.isFinite(protocolVisits) ? protocolVisits * hours : null,
    consent: ok && Number.isFinite(consentVisits) ? consentVisits * hours : null,
    assumption: ok
      ? `The consent says each visit lasts about ${hours} hours. The protocol gives no visit length, so the same ${hours} hours is assumed for its visits.`
      : "No visit length is stated, so patient hours cannot be estimated.",
  };
}

/** Splits extracted PDF or plain text into sections at numbered or all-capital headings. */
export function sectionsFromText(pages: { number: number; text: string }[], name: string): ProtocolSection[] {
  const out: ProtocolSection[] = [];
  let current: ProtocolSection | null = null;
  for (const page of pages) {
    for (const raw of page.text.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const numbered = /^\d{1,2}(\.\d{1,2}){0,3}\.?\s+[A-Z][^.]{2,90}$/.test(line);
      const capitals = line.length >= 4 && line.length <= 80 && line === line.toUpperCase() && /[A-Z]{3}/.test(line);
      if (numbered || capitals) {
        current = { id: `s${out.length + 1}`, heading: line, page: `p. ${page.number}`, citation: `${name}: ${line}`, text: "" };
        out.push(current);
      } else {
        if (!current) {
          current = { id: "s0", heading: "", page: `p. ${page.number}`, citation: name, text: "" };
          out.push(current);
        }
        current.text = `${current.text} ${line}`.trim();
      }
    }
  }
  return out.filter((section) => section.text || section.heading);
}
