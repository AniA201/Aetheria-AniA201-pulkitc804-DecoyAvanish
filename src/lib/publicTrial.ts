// A real ClinicalTrials.gov study: registry record, protocol and SAP text (extracted from the
// posted PDFs by scripts/fetch-public-trial.mjs), and comparable completed trials.
// Every function here is pure so the same checks run in the browser and in tests.
import { runChecklist, sectionsFromText, type ChecklistResult, type Finding, type ProtocolMeta, type ProtocolSection } from "./protocolCheck";

export const publicNct = "NCT03238781";

export type TrialPage = { number: number; text: string };
export type TrialDoc = { retrieved: string; source: string; label: string; documentDate: string; pages: TrialPage[] };

export type Peer = {
  nctId: string;
  title: string;
  sponsor: string | null;
  phase: string[];
  enrollment: number | null;
  arms: number | null;
  minimumAge: string | null;
  maximumAge: string | null;
  inclusionCount: number;
  exclusionCount: number;
  primaryOutcomes: { measure: string; timeFrame: string }[];
  secondaryCount: number;
  hasResults: boolean;
};

type Measurement = { groupId: string; value: string; spread?: string; lowerLimit?: string; upperLimit?: string };
type Analysis = { groupIds: string[]; pValue?: string; statisticalMethod?: string; paramType?: string; paramValue?: string; ciPctValue?: string; ciLowerLimit?: string; ciUpperLimit?: string };
export type OutcomeMeasure = {
  type: string;
  title: string;
  description?: string;
  timeFrame?: string;
  paramType?: string;
  unitOfMeasure?: string;
  groups: { id: string; title: string }[];
  denoms?: { counts: { groupId: string; value: string }[] }[];
  classes?: { title?: string; categories: { title?: string; measurements: Measurement[] }[] }[];
  analyses?: Analysis[];
};
type EventStat = { groupId: string; numAffected?: number; numAtRisk?: number };
export type RegistryStudy = {
  protocolSection: {
    identificationModule: { nctId: string; briefTitle: string; officialTitle?: string; orgStudyIdInfo?: { id: string } };
    statusModule: { overallStatus: string; startDateStruct?: { date: string }; primaryCompletionDateStruct?: { date: string }; completionDateStruct?: { date: string }; lastUpdatePostDateStruct?: { date: string } };
    sponsorCollaboratorsModule: { leadSponsor: { name: string } };
    descriptionModule?: { briefSummary?: string };
    conditionsModule: { conditions: string[] };
    designModule: {
      phases?: string[];
      enrollmentInfo?: { count: number; type: string };
      designInfo?: { allocation?: string; primaryPurpose?: string; maskingInfo?: { masking?: string; whoMasked?: string[] } };
    };
    armsInterventionsModule: {
      armGroups: { label: string; type?: string; description?: string; interventionNames?: string[] }[];
      interventions?: { type: string; name: string; description?: string }[];
    };
    outcomesModule: { primaryOutcomes: { measure: string; description?: string; timeFrame: string }[]; secondaryOutcomes?: { measure: string; timeFrame: string }[] };
    eligibilityModule: { eligibilityCriteria: string; minimumAge?: string; maximumAge?: string; sex?: string };
    contactsLocationsModule?: { locations?: { country?: string }[] };
  };
  resultsSection?: {
    participantFlowModule: {
      groups: { id: string; title: string; description?: string }[];
      periods: {
        title: string;
        milestones: { type: string; achievements: { groupId: string; numSubjects: string }[] }[];
        dropWithdraws?: { type: string; reasons: { groupId: string; numSubjects: string }[] }[];
      }[];
    };
    baselineCharacteristicsModule: {
      groups: { id: string; title: string }[];
      denoms: { counts: { groupId: string; value: string }[] }[];
      measures: { title: string; paramType?: string; dispersionType?: string; unitOfMeasure?: string; classes: { categories: { title?: string; measurements: Measurement[] }[] }[] }[];
    };
    outcomeMeasuresModule: { outcomeMeasures: OutcomeMeasure[] };
    adverseEventsModule: {
      frequencyThreshold?: string;
      timeFrame?: string;
      eventGroups: { id: string; title: string; deathsNumAffected?: number; deathsNumAtRisk?: number; seriousNumAffected?: number; seriousNumAtRisk?: number; otherNumAffected?: number; otherNumAtRisk?: number }[];
      seriousEvents?: { term: string; organSystem?: string; stats: EventStat[] }[];
      otherEvents?: { term: string; organSystem?: string; stats: EventStat[] }[];
    };
  };
};

export type TrialData = {
  nctId: string;
  retrieved: string;
  registrySource: string;
  study: RegistryStudy;
  protocol: TrialDoc;
  sap: TrialDoc;
  peers: Peer[];
  peerSource: string;
};

/* ---------- Loading ---------- */

const cache = new Map<string, Promise<TrialData>>();

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json() as Promise<T>;
}

export function assembleTrial(
  nctId: string,
  registry: { retrieved: string; source: string; study: RegistryStudy },
  protocol: TrialDoc,
  sap: TrialDoc,
  peers: { source: string; peers: Peer[] },
): TrialData {
  return { nctId, retrieved: registry.retrieved, registrySource: registry.source, study: registry.study, protocol, sap, peers: peers.peers, peerSource: peers.source };
}

/** Loads the snapshot saved under public/trials/<NCT>/. Run `npm run fetch-trial` to refresh it. */
export function loadTrial(nctId = publicNct): Promise<TrialData> {
  const hit = cache.get(nctId);
  if (hit) return hit;
  const base = `/trials/${nctId}`;
  const promise = Promise.all([
    getJson<{ retrieved: string; source: string; study: RegistryStudy }>(`${base}/registry.json`),
    getJson<TrialDoc>(`${base}/protocol.json`),
    getJson<TrialDoc>(`${base}/sap.json`),
    getJson<{ source: string; peers: Peer[] }>(`${base}/peers.json`),
  ]).then(([registry, protocol, sap, peers]) => assembleTrial(nctId, registry, protocol, sap, peers));
  promise.catch(() => cache.delete(nctId));
  cache.set(nctId, promise);
  return promise;
}

/* ---------- Page text ---------- */

const runningHeader = /^(Product: .*|Protocol Number: .*|Date: .*Page \d+ of \d+.*|CONFIDENTIAL.*|Page \d+ of \d+|Footnotes defined on last page of table|NCT Number: \d+|This NCT number has been applied.*|for purposes of posting on clinicaltrials\.gov)$/;
const tocLine = /\.{6,}\s*\d+\s*$/;

/** Drops running headers and table-of-contents lines so they are not read as content. */
export function cleanPages(pages: TrialPage[]): TrialPage[] {
  return pages.map((page) => ({
    number: page.number,
    text: page.text
      .split("\n")
      .filter((line) => !runningHeader.test(line.trim()) && !tocLine.test(line))
      .join("\n"),
  }));
}

/** The protocol body ends where the amendment summaries begin ("Page 1 of N" after page 1). */
export function protocolBody(doc: TrialDoc): TrialPage[] {
  const start = doc.pages.findIndex((page, index) => index > 0 && /Page 1 of \d+/.test(page.text) && /Amendment \d/.test(page.text));
  return start > 0 ? doc.pages.slice(0, start) : doc.pages;
}

export function amendmentPages(doc: TrialDoc): TrialPage[] {
  const body = protocolBody(doc);
  return doc.pages.slice(body.length);
}

const flat = (text: string) => text.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ");

export type Located = { value: string; page: number; quote: string };

/** Every match of `pattern` across the pages, with the page number and the sentence around it. */
export function locate(pages: TrialPage[], pattern: RegExp, pick: (match: RegExpMatchArray) => string): Located[] {
  const out: Located[] = [];
  const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const page of pages) {
    const text = flat(page.text);
    for (const match of text.matchAll(global)) {
      const at = match.index ?? 0;
      const start = Math.max(0, text.lastIndexOf(". ", at) + 2);
      const endDot = text.indexOf(". ", at + match[0].length);
      const end = endDot < 0 ? Math.min(text.length, at + 220) : Math.min(endDot + 1, at + 260);
      out.push({ value: pick(match), page: page.number, quote: text.slice(start, end).trim() });
    }
  }
  return out;
}

const pagesOf = (hits: Located[]) => [...new Set(hits.map((hit) => hit.page))].map((page) => `p. ${page}`).join(", ");

/* ---------- Pre-Flight on the real protocol ---------- */

export function protocolMeta(doc: TrialDoc): ProtocolMeta {
  const first = flat(doc.pages[0]?.text ?? "");
  const number = first.match(/Protocol Number:\s*(\d+)/)?.[1];
  const amendments = [...first.matchAll(/Amendment (\d+)\s+(\d{1,2} \w+ \d{4})/g)];
  const last = amendments.at(-1);
  const original = first.match(/Original\s+(\d{1,2} \w+ \d{4})/)?.[1];
  return {
    documentId: number ? `Amgen protocol ${number}` : "Protocol",
    version: last ? `Amendment ${last[1]}` : original ? "Original" : undefined,
    date: last?.[2] ?? original,
  };
}

export function protocolSections(trial: TrialData): ProtocolSection[] {
  return sectionsFromText(cleanPages(protocolBody(trial.protocol)), `${trial.nctId} protocol`);
}

export function trialChecklist(trial: TrialData): ChecklistResult[] {
  return runChecklist(protocolSections(trial), protocolMeta(trial.protocol));
}

export type ScheduleVisit = { label: string; week: number | null };

/** Visit columns read from the Schedule of Activities header row (Table 2-1). */
export function scheduleVisits(pages: TrialPage[]): { visits: ScheduleVisit[]; page: number | null; header: string } {
  for (const page of pages) {
    if (!/Schedule of Activities/i.test(page.text)) continue;
    const lines = page.text.split("\n");
    const index = lines.findIndex((line) => /Procedure/.test(line) && /EOS/.test(line) && /Wk/.test(line));
    if (index < 0) continue;
    const header = lines[index];
    const above = lines[index - 1] ?? "";
    const after = header.slice(header.search(/Wk/));
    const weeks = [...after.replace(/EOS.*$/, "").matchAll(/\d+/g)].map((match) => Number(match[0]));
    const eos = Number(above.match(/(\d+)\/ET\/?\s*$/)?.[1] ?? NaN);
    const visits: ScheduleVisit[] = [
      { label: "Screening", week: null },
      { label: "Baseline period start (week −4)", week: -4 },
      { label: "Day 1 (randomization and first dose)", week: 0 },
      ...[...new Set(weeks)].map((week) => ({ label: `Week ${week}`, week })),
    ];
    if (Number.isFinite(eos) && !weeks.includes(eos)) visits.push({ label: `Week ${eos} (end of study)`, week: eos });
    return { visits, page: page.number, header: `${above} / ${header}` };
  }
  return { visits: [], page: null, header: "" };
}

const uniq = (hits: Located[]) => [...new Set(hits.map((hit) => hit.value))];

function finding(id: string, title: string, hits: Located[], expectOne: { okWhy: string; flagWhy: string; fix: string }, name: string): Finding {
  const values = uniq(hits);
  if (values.length === 0) {
    return { id, kind: "internal", status: "cannot-check", title, where: "Not found", why: `${name} does not state this in a form the checker can read.`, fix: "State it once in a clear sentence." };
  }
  const where = `${name}, ${pagesOf(hits)}`;
  return values.length === 1
    ? { id, kind: "internal", status: "ok", title, where, why: expectOne.okWhy.replace("{v}", values[0]), fix: "Nothing to change." }
    : { id, kind: "internal", status: "flag", title, where, why: expectOne.flagWhy.replace("{v}", values.join(" and ")), fix: expectOne.fix };
}

export const patterns = {
  sampleSize: /approximately (\d+) subjects will be randomi[sz]ed/i,
  age: /adults\s+(?:≥\s*)?(\d+)\s+to\s+(?:≤\s*)?(\d+)\s+years/i,
  period: /(\d+)\s*-?\s*week double\s*-?\s*blind treatment period/i,
  endpointWeek: /last 4 weeks of the (\d+)\s*-?\s*week double/i,
  followUp: /(\d+) weeks after the last dose/i,
  lastDose: /at the week (\d+) visit, subjects will take the last dose/i,
  arms: /(\d+)-arm parallel/i,
};

/** Internal and registry checks on the real protocol. Edited pages flow through, so planted errors are tested the same way. */
export function trialChecks(protocolPages: TrialPage[], sapPages: TrialPage[], study: RegistryStudy): Finding[] {
  const body = cleanPages(protocolPages);
  const name = "Protocol";
  const out: Finding[] = [];
  const sizes = locate(body, patterns.sampleSize, (m) => m[1]);
  out.push(
    finding("sample-size", "Planned sample size", sizes, {
      okWhy: "Every statement of the planned sample size says approximately {v} randomized.",
      flagWhy: "The planned sample size is stated as {v} in different places.",
      fix: "Keep the number in one block (the synopsis) and reuse it in §5.2 and §10.",
    }, name),
  );
  const ages = locate(body, patterns.age, (m) => `${m[1]}–${m[2]}`);
  out.push(
    finding("age", "Age range: summary against eligibility", ages, {
      okWhy: "The synopsis summary and inclusion criterion 102 both give ages {v}.",
      flagWhy: "The age range differs between the synopsis summary and the eligibility section: {v}.",
      fix: "Make the synopsis quote inclusion criterion 102 rather than restate it.",
    }, name),
  );
  const periods = locate(body, patterns.period, (m) => m[1]);
  out.push(
    finding("period", "Treatment period length", periods, {
      okWhy: "Every mention gives a {v}-week double-blind treatment period.",
      flagWhy: "The double-blind treatment period is given as {v} weeks in different places.",
      fix: "Pick one length and reuse the same block everywhere.",
    }, name),
  );

  const schedule = scheduleVisits(body);
  const endpoint = locate(body, patterns.endpointWeek, (m) => m[1])[0];
  if (!endpoint || schedule.visits.length === 0) {
    out.push({ id: "endpoint-visit", kind: "internal", status: "cannot-check", title: "Primary endpoint against the schedule", where: "Not found", why: "The endpoint time point or the schedule header could not be read.", fix: "Write the endpoint with its week and keep the schedule as a table." });
  } else {
    const week = Number(endpoint.value);
    const has = schedule.visits.some((visit) => visit.week === week);
    out.push({
      id: "endpoint-visit",
      kind: "internal",
      status: has ? "ok" : "flag",
      title: "Primary endpoint against the schedule",
      where: `${name}, p. ${endpoint.page} (endpoint) and p. ${schedule.page} (Table 2-1)`,
      why: has
        ? `The primary endpoint ends at week ${week}, and Table 2-1 has a week-${week} visit.`
        : `The primary endpoint ends at week ${week}, but Table 2-1 has no week-${week} visit.`,
      fix: has ? "Nothing to change." : `Add the week-${week} visit back to the schedule, or move the endpoint.`,
    });
  }

  const follow = locate(body, patterns.followUp, (m) => m[1])[0];
  const lastDose = locate(cleanPages(sapPages), patterns.lastDose, (m) => m[1])[0];
  const eos = schedule.visits.at(-1)?.week ?? null;
  if (!follow || !lastDose || eos === null) {
    out.push({ id: "follow-up", kind: "internal", status: "cannot-check", title: "Safety follow-up against end of study", where: "Not found", why: "The follow-up length, last dose week, or end-of-study visit could not be read.", fix: "State all three once." });
  } else {
    const sum = Number(lastDose.value) + Number(follow.value);
    out.push({
      id: "follow-up",
      kind: "internal",
      status: sum === eos ? "ok" : "flag",
      title: "Safety follow-up against end of study",
      where: `Protocol p. ${follow.page}; SAP p. ${lastDose.page}; Table 2-1 p. ${schedule.page}`,
      why: `Last dose at week ${lastDose.value} (SAP) plus ${follow.value} weeks of follow-up (protocol) is week ${sum}; Table 2-1 ends at week ${eos}.`,
      fix: sum === eos ? "Nothing to change." : "Correct the follow-up length or the end-of-study visit so they meet.",
    });
  }

  const p = study.protocolSection;
  const regAge = `${parseInt(p.eligibilityModule.minimumAge ?? "")}–${parseInt(p.eligibilityModule.maximumAge ?? "")}`;
  const eligibilityAge = ages.find((hit) => /signing the informed consent/i.test(hit.quote)) ?? ages.at(-1);
  if (eligibilityAge) {
    out.push({
      id: "registry-age",
      kind: "cross",
      status: eligibilityAge.value === regAge ? "ok" : "flag",
      title: "Registry age range against the protocol",
      where: `Registry eligibilityModule · Protocol p. ${eligibilityAge.page}`,
      why: eligibilityAge.value === regAge ? `Both give ${regAge} years.` : `The registry says ${regAge}; the protocol says ${eligibilityAge.value}.`,
      fix: eligibilityAge.value === regAge ? "Nothing to change." : "Update the registry or the protocol so they agree.",
    });
  }
  const arms = locate(body, patterns.arms, (m) => m[1])[0];
  if (arms) {
    const count = p.armsInterventionsModule.armGroups.length;
    out.push({
      id: "registry-arms",
      kind: "cross",
      status: Number(arms.value) === count ? "ok" : "flag",
      title: "Registry arms against the protocol",
      where: `Registry armsInterventionsModule · Protocol p. ${arms.page}`,
      why: Number(arms.value) === count ? `Both describe ${count} arms.` : `The registry lists ${count} arms; the protocol says ${arms.value}.`,
      fix: Number(arms.value) === count ? "Nothing to change." : "Make the arm lists match.",
    });
  }
  const planned = sizes[0];
  const actual = p.designModule.enrollmentInfo;
  if (planned && actual) {
    out.push({
      id: "registry-enrollment",
      kind: "cross",
      status: "ok",
      title: "Registry enrollment against the planned sample size",
      where: `Registry designModule.enrollmentInfo · Protocol p. ${planned.page}`,
      why: `The protocol plans about ${planned.value}; the registry reports ${actual.count} (${actual.type.toLowerCase()}). A planned figure and an actual count are allowed to differ, so this is not flagged.`,
      fix: "Nothing to change.",
    });
  }
  return out;
}

export type TrialPlant = { id: string; label: string; expected: string[]; edit: (protocol: TrialPage[]) => TrialPage[] };

const editPage = (pages: TrialPage[], test: (page: TrialPage) => boolean, change: (text: string) => string) =>
  pages.map((page) => (test(page) ? { ...page, text: change(page.text) } : page));

/** Errors injected into a copy of the real protocol text, with the finding each should raise. */
export const trialPlants: TrialPlant[] = [
  { id: "control", label: "Real protocol as posted (control)", expected: [], edit: (pages) => pages },
  {
    id: "drop-week-12",
    label: "Week-12 visit deleted from Table 2-1, endpoint left at week 12",
    expected: ["endpoint-visit"],
    edit: (pages) => editPage(pages, (page) => /Schedule of Activities/.test(page.text), (text) => text.replace(/ 12\/ET/g, "")),
  },
  {
    id: "age-summary",
    label: "Synopsis age range changed to 18 to 65",
    expected: ["age"],
    edit: (pages) => editPage(pages, (page) => /Summary of Subject Eligibility/.test(page.text), (text) => text.replace(/18 to\s+(≤\s*)?60/, "18 to 65")),
  },
  {
    id: "sample-size",
    label: "§5.2 sample size changed to 300",
    expected: ["sample-size"],
    edit: (pages) => editPage(pages, (page) => /5\.2 Number of Subjects/.test(page.text), (text) => text.replace(/Approximately 335/, "Approximately 300")),
  },
  {
    id: "period",
    label: "Synopsis treatment period changed to 16 weeks",
    expected: ["period"],
    edit: (pages) => editPage(pages, (page) => /randomized into the 12-week double-blind/.test(flat(page.text)), (text) => text.replace(/12-week double-blind/, "16-week double-blind")),
  },
  {
    id: "follow-up",
    label: "Follow-up changed to 20 weeks after the last dose",
    expected: ["follow-up"],
    edit: (pages) => editPage(pages, (page) => /occurs 18 weeks/.test(flat(page.text)), (text) => text.replace(/18 weeks after the last dose/, "20 weeks after the last dose").replace(/occurs 18 weeks/, "occurs 20 weeks").replace(/occurs 18\s*\nweeks/, "occurs 20\nweeks")),
  },
];

export type TrialCaseResult = { id: string; label: string; expected: string[]; found: string[]; missed: string[]; falseAlarms: string[] };

export function runTrialPlants(trial: TrialData) {
  const body = protocolBody(trial.protocol);
  const cases: TrialCaseResult[] = trialPlants.map((plant) => {
    const found = trialChecks(plant.edit(body), trial.sap.pages, trial.study)
      .filter((item) => item.status === "flag")
      .map((item) => item.id);
    return {
      id: plant.id,
      label: plant.label,
      expected: plant.expected,
      found,
      missed: plant.expected.filter((id) => !found.includes(id)),
      falseAlarms: found.filter((id) => !plant.expected.includes(id)),
    };
  });
  const planted = trialPlants.reduce((sum, plant) => sum + plant.expected.length, 0);
  const caught = cases.reduce((sum, item) => sum + item.expected.length - item.missed.length, 0);
  return { cases, planted, caught, falseAlarms: cases.reduce((sum, item) => sum + item.falseAlarms.length, 0) };
}

/* ---------- Amendment history (real, from the posted PDF) ---------- */

export type AmendmentChange = { amendment: string; date: string; section: string; category: string; page: number };
export type Amendment = { name: string; date: string; rationale: string[]; changes: AmendmentChange[]; page: number; pagesPosted: number; pagesTotal: number };

function categorize(section: string): string {
  const s = section.toLowerCase();
  if (/inclusion|exclusion|eligib/.test(s)) return "Eligibility";
  if (/schedule of activities|table 2/.test(s)) return "Visit schedule";
  if (/adverse|safety|serious|hepatotox|pregnan|contracept/.test(s)) return "Safety assessment";
  if (/statistic|analysis|sample size/.test(s)) return "Statistics";
  if (/title page|global|synopsis|abbreviation/.test(s)) return "Administrative or editorial";
  return "Procedures";
}

export function amendmentHistory(doc: TrialDoc): Amendment[] {
  const pages = amendmentPages(doc);
  const out: Amendment[] = [];
  let current: Amendment | null = null;
  for (const page of pages) {
    const text = page.text;
    const head = text.match(/^Amendment (\d+)$/m);
    if (head && /Page 1 of/.test(text)) {
      const date = flat(text).match(/Amendment Date:\s*(\d{1,2} \w+ \d{4})/)?.[1] ?? "";
      const rationaleBlock = flat(text).split(/Rationale:/)[1]?.split(/Description of Changes:/)[0] ?? "";
      const rationale = rationaleBlock
        .split(/•/)
        .map((part) => part.replace(/This protocol is being amended for the following reasons:/, "").replace(/CONFIDENTIAL.*/, "").trim())
        .filter((part) => part.length > 20);
      const total = Number(text.match(/Page 1 of (\d+)/)?.[1] ?? 1);
      current = { name: `Amendment ${head[1]}`, date, rationale, changes: [], page: page.number, pagesPosted: 0, pagesTotal: total };
      out.push(current);
    }
    if (!current) continue;
    current.pagesPosted += 1;
    const lines = text.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(/^Section:\s*(.+)$/);
      if (!match) continue;
      let section = match[1].trim();
      const next = lines[index + 1]?.trim() ?? "";
      if (next && !/^(Replace|With|Add|Delete|Change):?/.test(next) && !/^Section:/.test(next)) section = `${section} ${next}`;
      section = section.replace(/\s+/g, " ").replace(/,$/, "");
      current.changes.push({ amendment: current.name, date: current.date, section, category: categorize(section), page: page.number });
    }
  }
  return out;
}

/* ---------- Burden and comparison with similar trials ---------- */

export const burdenAssumptions = [
  { id: "screening", label: "Screening visit", minutes: 180 },
  { id: "dosing", label: "Dosing visit (injection, vital signs, observation after the dose)", minutes: 150 },
  { id: "check", label: "Visit without dosing", minutes: 90 },
  { id: "diary", label: "Daily eDiary entry", minutes: 5 },
];

export function trialBurden(trial: TrialData) {
  const body = cleanPages(protocolBody(trial.protocol));
  const schedule = scheduleVisits(body);
  const dosingWeeks = new Set([0, 2, 4, 6, 8, 10]);
  const minutes = (id: string) => burdenAssumptions.find((item) => item.id === id)!.minutes;
  const visitMinutes = schedule.visits.reduce((sum, visit) => {
    if (visit.week === null) return sum + minutes("screening");
    return sum + (dosingWeeks.has(visit.week) ? minutes("dosing") : minutes("check"));
  }, 0);
  const firstWeek = schedule.visits.find((visit) => visit.week !== null)?.week ?? 0;
  const lastWeek = schedule.visits.at(-1)?.week ?? 0;
  const diaryDays = (lastWeek - firstWeek) * 7;
  const diaryMinutes = diaryDays * minutes("diary");
  return {
    visits: schedule.visits,
    page: schedule.page,
    dosingVisits: schedule.visits.filter((visit) => visit.week !== null && dosingWeeks.has(visit.week)).length,
    weeks: lastWeek - firstWeek,
    visitHours: Math.round(visitMinutes / 6) / 10,
    diaryHours: Math.round(diaryMinutes / 6) / 10,
    diaryDays,
    note: "Dosing weeks (day 1 and every 2 weeks to week 10) come from the 420 mg Q2W arm, the heaviest schedule. Minutes per visit are assumptions, labelled as such; the protocol does not state visit length. Travel and waiting time are not counted.",
  };
}

const ageYears = (value: string | null | undefined) => (value ? parseInt(value, 10) : NaN);

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function criteriaCounts(criteria: string) {
  const [inclusion = "", exclusion = ""] = criteria.split(/exclusion criteria:?/i);
  const count = (text: string) => text.split("\n").filter((line) => /^\s*(\*|-|\d+\.)\s+\S/.test(line)).length;
  return { inclusion: count(inclusion), exclusion: count(exclusion) };
}

export type PeerRow = { id: string; label: string; ours: string; peers: string; note: string; flag: boolean };

export function peerComparison(trial: TrialData): { rows: PeerRow[]; count: number } {
  const p = trial.study.protocolSection;
  const peers = trial.peers;
  const own = criteriaCounts(p.eligibilityModule.eligibilityCriteria);
  const maxAge = ageYears(p.eligibilityModule.maximumAge);
  const peerMax = peers.map((peer) => (peer.maximumAge ? ageYears(peer.maximumAge) : Infinity));
  const wider = peerMax.filter((value) => value > maxAge).length;
  const enrollments = peers.map((peer) => peer.enrollment).filter((value): value is number => typeof value === "number");
  const secondary = peers.map((peer) => peer.secondaryCount);
  const exclusions = peers.map((peer) => peer.exclusionCount).filter((value) => value > 0);
  const ownSecondary = p.outcomesModule.secondaryOutcomes?.length ?? 0;
  const rows: PeerRow[] = [
    {
      id: "max-age",
      label: "Upper age limit",
      ours: `${maxAge} years`,
      peers: `${wider} of ${peers.length} allow older participants (median upper limit ${median(peerMax.filter(Number.isFinite))} years)`,
      note: "A lower upper age than most comparable trials narrows who can join.",
      flag: wider > peers.length / 2,
    },
    {
      id: "exclusion",
      label: "Exclusion criteria listed in the registry",
      ours: String(own.exclusion),
      peers: `median ${median(exclusions)} across ${exclusions.length} trials that list them`,
      note: "Registry lists are summaries; the protocol has many more. Counts are compared like for like (registry to registry).",
      flag: own.exclusion > median(exclusions) * 1.5,
    },
    {
      id: "secondary",
      label: "Secondary outcomes",
      ours: String(ownSecondary),
      peers: `median ${median(secondary)}`,
      note: "Each secondary outcome adds assessments to the schedule.",
      flag: ownSecondary > median(secondary) * 1.5,
    },
    {
      id: "enrollment",
      label: "Enrollment",
      ours: String(p.designModule.enrollmentInfo?.count ?? "not stated"),
      peers: `median ${median(enrollments)}`,
      note: "Shown for context; enrollment is not a burden measure.",
      flag: false,
    },
  ];
  return { rows, count: peers.length };
}

export type TrialHotspot = { id: string; category: string; where: string; why: string; fix: string; evidence: string };

/** Amendment-risk flags, each tied to its evidence. The real amendment history is shown beside them, not used to tune them. */
export function trialHotspots(trial: TrialData, findings: Finding[], rows: ChecklistResult[]): TrialHotspot[] {
  const out: TrialHotspot[] = [];
  const comparison = peerComparison(trial);
  const age = comparison.rows.find((row) => row.id === "max-age")!;
  if (age.flag) {
    out.push({
      id: "eligibility-age",
      category: "Eligibility",
      where: "Protocol inclusion criterion 102 · registry eligibilityModule",
      why: `The upper age limit is ${age.ours}; ${age.peers}. Eligibility is one of the most common amendment categories in the Tufts CSDD work.`,
      fix: "Check the reason for the upper limit before finalizing, or widen it.",
      evidence: "peers.json from ClinicalTrials.gov",
    });
  }
  const body = cleanPages(protocolBody(trial.protocol));
  const lab = locate(body, /HbA1c\)?\s*≥?\s*([\d.]+)\s*%/i, (m) => m[1]);
  if (lab.length > 0) {
    out.push({
      id: "eligibility-lab",
      category: "Eligibility",
      where: `Protocol exclusion criterion 211, p. ${lab[0].page}`,
      why: `A lab cut-off (HbA1c ${lab.map((hit) => hit.value).join(" / ")}%) excludes people at screening. Numeric lab thresholds are easy to set too tight and are a common reason to amend eligibility.`,
      fix: "Tie the threshold to a cited guideline in the protocol text.",
      evidence: "Protocol text",
    });
  }
  const flagged = findings.filter((item) => item.status === "flag");
  if (flagged.some((item) => ["endpoint-visit", "follow-up"].includes(item.id))) {
    out.push({ id: "schedule", category: "Visit schedule", where: "Table 2-1", why: "The schedule does not meet the endpoint or follow-up text.", fix: "Fix the schedule before the protocol is finalized.", evidence: "Findings above" });
  }
  const burden = trialBurden(trial);
  out.push({
    id: "schedule-load",
    category: "Visit schedule",
    where: `Table 2-1, p. ${burden.page}`,
    why: `${burden.visits.length} visit columns over ${burden.weeks} weeks, with ${burden.dosingVisits} dosing visits and a daily diary. ClinicalTrials.gov does not publish visit schedules, so this cannot be compared with the similar trials; it is shown so a person can judge it.`,
    fix: "Ask whether every visit serves an objective; fewer visits mean fewer chances for schedule amendments.",
    evidence: "Protocol Table 2-1",
  });
  const sampleRow = rows.find((row) => row.id === "m11-10.11");
  const redacted = locate(body, /Sample Size Determination CCI/i, () => "CCI")[0];
  if (redacted || sampleRow?.mark !== "present") {
    out.push({
      id: "sample-size",
      category: "Statistics",
      where: redacted ? `Protocol §10.1, p. ${redacted.page}` : "Protocol §10.1",
      why: redacted
        ? "The sample size justification is redacted in the public copy (marked CCI, commercially confidential information). The checker cannot see the assumptions."
        : "The sample size section is thin.",
      fix: "Reviewers with the full protocol should confirm the power assumptions.",
      evidence: "Protocol text",
    });
  }
  return out;
}

/* ---------- Write Once: protocol, SAP, and registry for the same trial ---------- */

export type DocValue = { doc: "Protocol" | "SAP" | "Registry"; value: string | null; where: string; quote: string };
export type ConsistencyRow = { id: string; label: string; values: DocValue[]; status: "same" | "differs" | "explained" | "partial"; note: string };

function first(pages: TrialPage[], pattern: RegExp, pick: (m: RegExpMatchArray) => string, doc: DocValue["doc"]): DocValue {
  const hit = locate(cleanPages(pages), pattern, pick)[0];
  return hit ? { doc, value: hit.value, where: `${doc} p. ${hit.page}`, quote: hit.quote } : { doc, value: null, where: `${doc}: not stated`, quote: "" };
}

/** "every 4 weeks" and Q4W are the same regimen; QM (monthly) is not written the same way and is kept apart. */
const normalizeDose = (value: string) => {
  const clean = value.replace(/\s+/g, " ").trim().toUpperCase();
  const every = clean.match(/^EVERY (\d+) WEEKS$/);
  return every ? `Q${every[1]}W` : clean;
};

export function consistencyRows(protocolPages: TrialPage[], sapPages: TrialPage[], study: RegistryStudy): ConsistencyRow[] {
  const p = study.protocolSection;
  const reg = (value: string | null, field: string): DocValue => ({ doc: "Registry", value, where: `Registry ${field}`, quote: value ?? "" });
  const lowArm = p.armsInterventionsModule.armGroups.find((arm) => /210/.test(arm.label));
  const highArm = p.armsInterventionsModule.armGroups.find((arm) => /420/.test(arm.label));
  const primary = p.outcomesModule.primaryOutcomes[0];
  const aeTime = study.resultsSection?.adverseEventsModule.timeFrame ?? "";
  const rows: ConsistencyRow[] = [];
  const compare = (id: string, label: string, values: DocValue[], explained?: (values: DocValue[]) => string | null): ConsistencyRow => {
    const stated = values.filter((item) => item.value !== null);
    const distinct = new Set(stated.map((item) => item.value));
    const reason = explained?.(values) ?? null;
    const status: ConsistencyRow["status"] = distinct.size <= 1 ? (stated.length === values.length ? "same" : "partial") : reason ? "explained" : "differs";
    const note =
      status === "same"
        ? "Every document says the same."
        : status === "partial"
          ? `Stated the same where it appears; not stated in ${values.filter((item) => item.value === null).map((item) => item.doc).join(" and ")}.`
          : status === "explained"
            ? reason!
            : `The documents disagree: ${stated.map((item) => `${item.doc} says ${item.value}`).join("; ")}.`;
    return { id, label, values, status, note };
  };

  rows.push(
    compare(
      "sample-size",
      "Planned sample size",
      [
        first(protocolPages, patterns.sampleSize, (m) => m[1], "Protocol"),
        first(sapPages, patterns.sampleSize, (m) => m[1], "SAP"),
        reg(p.designModule.enrollmentInfo ? String(p.designModule.enrollmentInfo.count) : null, `enrollmentInfo (${p.designModule.enrollmentInfo?.type.toLowerCase() ?? ""})`),
      ],
      (values) => (values[0].value === values[1].value ? `The protocol and SAP plan ${values[0].value}; the registry reports ${values[2].value} actually enrolled. Planned and actual are allowed to differ.` : null),
    ),
  );
  rows.push(
    compare("ratio", "Randomization ratio", [
      first(protocolPages, /randomi[sz]ed (?:in a )?(\d:\d:\d)/i, (m) => m[1], "Protocol"),
      first(sapPages, /randomi[sz]ed (?:in a )?(\d:\d:\d)/i, (m) => m[1], "SAP"),
      reg(null, "(no ratio field)"),
    ]),
  );
  rows.push(
    compare("low-dose", "Lower dose and frequency", [
      first(protocolPages, /AMG 301 210 mg (?:via )?(?:SC|subcutaneous)?\s*(?:\(SC\)\s*)?(?:injections?\s*)?(Q4W|QM|every 4 weeks)/i, (m) => normalizeDose(m[1]), "Protocol"),
      first(sapPages, /AMG 301 210 mg (?:via )?(?:SC|subcutaneous)?\s*(?:injections?\s*)?(Q4W|QM|every 4 weeks)/i, (m) => normalizeDose(m[1]), "SAP"),
      reg(lowArm ? normalizeDose(lowArm.label.match(/(Q\dW|QM)/i)?.[1] ?? "") || null : null, `armGroups "${lowArm?.label ?? ""}"`),
    ]),
  );
  rows.push(
    compare("high-dose", "Higher dose and frequency", [
      first(protocolPages, /AMG 301 420 mg (?:via )?(?:SC)?\s*(?:injections?\s*)?(Q2W)/i, (m) => normalizeDose(m[1]), "Protocol"),
      first(sapPages, /AMG 301 420 mg (?:via )?(?:SC)?\s*(?:injections?\s*)?(Q2W)/i, (m) => normalizeDose(m[1]), "SAP"),
      reg(highArm ? normalizeDose(highArm.label.match(/(Q\dW)/i)?.[1] ?? "") || null : null, `armGroups "${highArm?.label ?? ""}"`),
    ]),
  );
  rows.push(
    compare("period", "Double-blind treatment period (weeks)", [
      first(protocolPages, patterns.period, (m) => m[1], "Protocol"),
      first(sapPages, patterns.period, (m) => m[1], "SAP"),
      reg(primary.measure.match(/(\d+)\s*-?\s*Week Double-Blind/i)?.[1] ?? null, "primaryOutcomes[0].measure"),
    ]),
  );
  rows.push(
    compare(
      "follow-up",
      "Safety follow-up",
      [
        first(protocolPages, patterns.followUp, (m) => `${m[1]} weeks after last dose`, "Protocol"),
        first(sapPages, patterns.followUp, (m) => `${m[1]} weeks after last dose`, "SAP"),
        reg(aeTime.match(/(\d+)-week safety follow-up/i) ? `${aeTime.match(/(\d+)-week safety follow-up/i)![1]} weeks after treatment` : null, "adverseEventsModule.timeFrame"),
      ],
      (values) => {
        const sap = cleanPages(sapPages).map((page) => flat(page.text)).join(" ");
        const both = sap.match(/(\d+) weeks after the last dose of investigational product \((\d+) weeks after DBTP\)/i);
        return both && values[2].value?.startsWith(both[2]) && values[0].value?.startsWith(both[1])
          ? `Same end point, two ways of counting: the SAP says ${both[1]} weeks after the last dose is ${both[2]} weeks after the treatment period, which is what the registry uses.`
          : null;
      },
    ),
  );
  rows.push(
    compare("age", "Age range", [
      first(protocolPages, /adults\s+(?:≥\s*)?(\d+)\s+to\s+(?:≤\s*)?(\d+)\s+years of age at the time/i, (m) => `${m[1]}–${m[2]}`, "Protocol"),
      { doc: "SAP", value: null, where: "SAP: not stated", quote: "" },
      reg(`${parseInt(p.eligibilityModule.minimumAge ?? "")}–${parseInt(p.eligibilityModule.maximumAge ?? "")}`, "eligibilityModule"),
    ]),
  );
  rows.push(
    compare("endpoint", "Primary endpoint time window", [
      first(protocolPages, /(last 4 weeks of the \d+\s*-?\s*week double\s*-?\s*blind treatment period)/i, (m) => m[1].toLowerCase().replace(/\s*-\s*/g, "-"), "Protocol"),
      first(sapPages, /(last 4 weeks of the \d+\s*-?\s*week double\s*-?\s*blind treatment period)/i, (m) => m[1].toLowerCase().replace(/\s*-\s*/g, "-"), "SAP"),
      reg(primary.measure.match(/(last 4 weeks of the \d+ week double-blind treatment period)/i)?.[1].toLowerCase().replace("12 week", "12-week") ?? null, "primaryOutcomes[0].measure"),
    ]),
  );
  return rows;
}

export type WritePlant = { id: string; label: string; expected: string[]; edit: (docs: { protocol: TrialPage[]; sap: TrialPage[]; study: RegistryStudy }) => { protocol: TrialPage[]; sap: TrialPage[]; study: RegistryStudy } };

export const writePlants: WritePlant[] = [
  { id: "control", label: "Documents as posted (control)", expected: ["low-dose"], edit: (docs) => docs },
  {
    id: "sap-size",
    label: "SAP sample size changed to 300",
    expected: ["low-dose", "sample-size"],
    edit: (docs) => ({ ...docs, sap: docs.sap.map((page) => ({ ...page, text: page.text.replace(/Approximately 335/g, "Approximately 300") })) }),
  },
  {
    id: "registry-age",
    label: "Registry upper age changed to 65",
    expected: ["low-dose", "age"],
    edit: (docs) => ({
      ...docs,
      study: { ...docs.study, protocolSection: { ...docs.study.protocolSection, eligibilityModule: { ...docs.study.protocolSection.eligibilityModule, maximumAge: "65 Years" } } },
    }),
  },
  {
    id: "sap-period",
    label: "SAP treatment period changed to 16 weeks",
    expected: ["low-dose", "period", "endpoint"],
    edit: (docs) => ({ ...docs, sap: docs.sap.map((page) => ({ ...page, text: page.text.replace(/12\s*-\s*week\s+double\s*-\s*blind/gi, "16-week double-blind") })) }),
  },
];

export function runWritePlants(trial: TrialData) {
  const body = protocolBody(trial.protocol);
  const cases = writePlants.map((plant) => {
    const docs = plant.edit({ protocol: body, sap: trial.sap.pages, study: trial.study });
    const found = consistencyRows(docs.protocol, docs.sap, docs.study)
      .filter((row) => row.status === "differs")
      .map((row) => row.id);
    return { id: plant.id, label: plant.label, expected: plant.expected, found, missed: plant.expected.filter((id) => !found.includes(id)), falseAlarms: found.filter((id) => !plant.expected.includes(id)) };
  });
  const planted = writePlants.reduce((sum, plant) => sum + plant.expected.length, 0);
  const caught = cases.reduce((sum, item) => sum + item.expected.length - item.missed.length, 0);
  return { cases, planted, caught, falseAlarms: cases.reduce((sum, item) => sum + item.falseAlarms.length, 0) };
}

/* ---------- Block library bound to the real values ---------- */

export type TrialBlockId = "sample_size" | "ratio" | "low_dose" | "high_dose" | "treatment_weeks" | "followup_weeks" | "age_min" | "age_max";
export type TrialBlock = { id: TrialBlockId; label: string; owner: string; version: string; value: string; source: string };
export type TrialValues = Record<TrialBlockId, string>;

export function trialBlocks(trial: TrialData): TrialBlock[] {
  const rows = consistencyRows(protocolBody(trial.protocol), trial.sap.pages, trial.study);
  const row = (id: string) => rows.find((item) => item.id === id)!;
  const proto = (id: string) => row(id).values[0];
  const ageRow = proto("age");
  const [ageMin, ageMax] = (ageRow.value ?? "–").split("–");
  const follow = trial.study.resultsSection?.adverseEventsModule.timeFrame?.match(/(\d+)-week safety follow-up/i)?.[1] ?? "";
  const v = "protocol Amendment 2 (17 October 2017)";
  return [
    { id: "sample_size", label: "Planned sample size", owner: "Biostatistics", version: v, value: proto("sample-size").value ?? "", source: proto("sample-size").where },
    { id: "ratio", label: "Randomization ratio", owner: "Biostatistics", version: v, value: proto("ratio").value ?? "", source: proto("ratio").where },
    { id: "low_dose", label: "Lower dose", owner: "Clinical science", version: v, value: "210 mg every 4 weeks (Q4W)", source: proto("low-dose").where },
    { id: "high_dose", label: "Higher dose", owner: "Clinical science", version: v, value: "420 mg every 2 weeks (Q2W)", source: proto("high-dose").where },
    { id: "treatment_weeks", label: "Treatment period (weeks)", owner: "Clinical science", version: v, value: proto("period").value ?? "", source: proto("period").where },
    { id: "followup_weeks", label: "Safety follow-up after treatment (weeks)", owner: "Clinical operations", version: v, value: follow, source: "Table 2-1 header and registry adverseEventsModule.timeFrame" },
    { id: "age_min", label: "Minimum age", owner: "Clinical science", version: v, value: ageMin, source: ageRow.where },
    { id: "age_max", label: "Maximum age", owner: "Clinical science", version: v, value: ageMax, source: ageRow.where },
  ];
}

export const valuesOf = (blocks: TrialBlock[]): TrialValues => Object.fromEntries(blocks.map((block) => [block.id, block.value])) as TrialValues;

export type Assembled = { id: string; document: string; place: string; owner: string; text: string; adapted: boolean; compareTo?: { where: string; text: string } };

export function assemble(values: TrialValues, trial: TrialData): Assembled[] {
  const end = Number(values.treatment_weeks) + Number(values.followup_weeks);
  const body = cleanPages(protocolBody(trial.protocol));
  const designQuote = locate(body, /Approximately \d+ subjects will be randomized in a/i, () => "")[0];
  const p = trial.study.protocolSection;
  return [
    {
      id: "protocol-design",
      document: "Protocol",
      place: "§5.2 Number of Subjects",
      owner: "Biostatistics",
      adapted: false,
      text: `Approximately ${values.sample_size} subjects will be randomized in a ${values.ratio} to the following treatment groups: placebo for AMG 301, AMG 301 ${values.low_dose.replace(/ every 4 weeks \((Q4W)\)/, " SC $1")}, or AMG 301 ${values.high_dose.replace(/ every 2 weeks \((Q2W)\)/, " SC $1")}.`,
      compareTo: designQuote ? { where: `Protocol p. ${designQuote.page}`, text: designQuote.quote } : undefined,
    },
    {
      id: "protocol-schedule",
      document: "Protocol",
      place: "§2.2 Table 2-1 header",
      owner: "Clinical operations",
      adapted: false,
      text: `Double-blind treatment period (${values.treatment_weeks} weeks); safety follow-up period (${values.followup_weeks} weeks); end-of-study visit at week ${end}.`,
    },
    {
      id: "registry-eligibility",
      document: "Registry entry",
      place: "Eligibility: ages",
      owner: "Disclosure",
      adapted: false,
      text: `Minimum age ${values.age_min} Years; maximum age ${values.age_max} Years.`,
      compareTo: { where: "Registry eligibilityModule", text: `Minimum age ${p.eligibilityModule.minimumAge}; maximum age ${p.eligibilityModule.maximumAge}.` },
    },
    {
      id: "registry-arms",
      document: "Registry entry",
      place: "Arms",
      owner: "Disclosure",
      adapted: false,
      text: `Placebo · AMG 301 ${values.low_dose.replace(/every 4 weeks \((Q4W)\)/, "$1")} · AMG 301 ${values.high_dose.replace(/every 2 weeks \((Q2W)\)/, "$1")}`,
      compareTo: { where: "Registry armGroups", text: p.armsInterventionsModule.armGroups.map((arm) => arm.label).join(" · ") },
    },
    {
      id: "registry-ae-window",
      document: "Registry entry",
      place: "Adverse events time frame",
      owner: "Disclosure",
      adapted: false,
      text: `Serious adverse events and other adverse events include the ${values.treatment_weeks}-week double-blind treatment and ${values.followup_weeks}-week safety follow-up.`,
      compareTo: { where: "Registry adverseEventsModule.timeFrame", text: trial.study.resultsSection?.adverseEventsModule.timeFrame ?? "" },
    },
    {
      id: "consent-plain",
      document: "Consent form (plain language)",
      place: "What happens in the study",
      owner: "Medical writing",
      adapted: true,
      text: `If you join, a chance process puts you in one of three groups. You get study shots for ${values.treatment_weeks} weeks. Then the team checks on you for ${values.followup_weeks} more weeks. Your last visit is at week ${end}. You must be ${values.age_min} to ${values.age_max} years old to join.`,
    },
    {
      id: "lay-summary",
      document: "Lay summary",
      place: "Who took part",
      owner: "Disclosure",
      adapted: true,
      text: `Adults aged ${values.age_min} to ${values.age_max} with migraine could take part. The plan was for about ${values.sample_size} people.`,
    },
  ];
}

export type TrialChange = { id: string; label: string; block: TrialBlockId; to: string; search: { pattern: RegExp; label: string }[] };

/** Change requests. The first is the starter sheet's own example amendment. */
export const trialChanges: TrialChange[] = [
  {
    id: "week-36",
    label: "Add a week-36 visit (safety follow-up extended to 24 weeks after treatment)",
    block: "followup_weeks",
    to: "24",
    search: [
      { pattern: /\bweek 28\b|28\/EOS|28\/ET/i, label: "week 28 / end of study" },
      { pattern: /16 weeks after DBTP|16-week safety follow-up|\(16 weeks\)/i, label: "16-week follow-up" },
      { pattern: /18 weeks after the last dose/i, label: "18 weeks after the last dose" },
    ],
  },
  {
    id: "age-65",
    label: "Raise the upper age limit to 65",
    block: "age_max",
    to: "65",
    search: [{ pattern: /18 to\s+(?:≤\s*)?60 years/i, label: "18 to 60 years" }],
  },
  {
    id: "size-400",
    label: "Increase the planned sample size to 400",
    block: "sample_size",
    to: "400",
    search: [{ pattern: /approximately 335 subjects/i, label: "approximately 335 subjects" }],
  },
];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A change to any block. Known blocks reuse the wording searches above; others search for the current value as written. */
export function changeFor(trial: TrialData, block: TrialBlockId, to: string): TrialChange {
  const known = trialChanges.find((change) => change.block === block);
  const current = trialBlocks(trial).find((item) => item.id === block)!;
  const search = known?.search ?? [{ pattern: new RegExp(`\\b${escapeRegExp(current.value)}\\b`, "i"), label: current.value }];
  return { id: `${block}-${to}`, label: `${current.label}: ${current.value} → ${to}`, block, to, search };
}

export type ImpactLine = { id: string; document: string; place: string; owner: string; before: string; after: string; kind: "assembled" | "source" };

export function changeImpact(trial: TrialData, change: TrialChange): ImpactLine[] {
  const blocks = trialBlocks(trial);
  const before = valuesOf(blocks);
  const after = { ...before, [change.block]: change.to };
  const assembledBefore = assemble(before, trial);
  const assembledAfter = assemble(after, trial);
  const lines: ImpactLine[] = assembledBefore
    .map((item, index) => ({ item, next: assembledAfter[index] }))
    .filter(({ item, next }) => item.text !== next.text)
    .map(({ item, next }) => ({ id: `assembled-${item.id}`, document: item.document, place: item.place, owner: item.owner, before: item.text, after: next.text, kind: "assembled" as const }));
  const sources: [string, TrialPage[], string][] = [
    ["Protocol", cleanPages(protocolBody(trial.protocol)), "Medical writing"],
    ["SAP", cleanPages(trial.sap.pages), "Biostatistics"],
  ];
  for (const [document, pages, owner] of sources) {
    for (const rule of change.search) {
      const hits = locate(pages, rule.pattern, (m) => m[0]);
      const seen = new Set<number>();
      for (const hit of hits) {
        if (seen.has(hit.page)) continue;
        seen.add(hit.page);
        lines.push({
          id: `${document}-${hit.page}-${rule.label}`,
          document,
          place: `p. ${hit.page} (“${rule.label}”)`,
          owner,
          before: hit.quote,
          after: "Needs a person to redraft this sentence. It is listed so the change is not missed.",
          kind: "source",
        });
      }
    }
  }
  return lines;
}

/* ---------- Design brief from the registry ---------- */

export function briefFromRegistry(trial: TrialData) {
  const p = trial.study.protocolSection;
  const burden = trialBurden(trial);
  const primary = p.outcomesModule.primaryOutcomes[0];
  const week = primary.measure.match(/(\d+)\s*-?\s*Week Double-Blind/i)?.[1] ?? "";
  return {
    title: p.identificationModule.officialTitle ?? p.identificationModule.briefTitle,
    condition: p.conditionsModule.conditions.join(", "),
    phase: (p.designModule.phases ?? []).map((phase) => phase.replace("PHASE", "Phase ")).join(", "),
    intervention: p.armsInterventionsModule.armGroups.filter((arm) => arm.type === "EXPERIMENTAL").map((arm) => arm.label).join(" or "),
    comparator: p.armsInterventionsModule.armGroups.find((arm) => /PLACEBO/.test(arm.type ?? ""))?.label ?? "",
    population: `Adults ${parseInt(p.eligibilityModule.minimumAge ?? "")} to ${parseInt(p.eligibilityModule.maximumAge ?? "")} years with migraine (≥ 4 migraine days per month) who failed at least 1 preventive medication.`,
    primaryEndpoint: primary.measure.replace(/ to the Last 4 Weeks.*$/, ""),
    endpointWeek: week,
    visits: String(burden.visits.length),
    weeks: week,
  };
}

export function precedent(trial: TrialData, limit = 6) {
  return trial.peers
    .filter((peer) => peer.hasResults)
    .slice(0, limit)
    .map((peer) => ({
      nctId: peer.nctId,
      title: peer.title,
      sponsor: peer.sponsor,
      ages: `${peer.minimumAge ?? "?"}–${peer.maximumAge ?? "no upper limit"}`,
      primary: peer.primaryOutcomes[0] ? `${peer.primaryOutcomes[0].measure} (${peer.primaryOutcomes[0].timeFrame})` : "Not listed",
    }));
}
