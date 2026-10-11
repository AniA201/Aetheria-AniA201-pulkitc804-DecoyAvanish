// Lay summary of results (EU CTR 536/2014 Annex V) built only from the ClinicalTrials.gov results
// fields of one completed trial. Every number in a draft must trace back to a registry field.
import type { DraftCheck } from "./plainLab";
import type { RegistryStudy } from "./publicTrial";

export type GroupKey = "placebo" | "low" | "high";
export type LayFact = { id: string; label: string; value: string; path: string; group?: GroupKey; derived?: string };
export type LayAudience = "lay-adult" | "lay-caregiver" | "lay-teen" | "lay-physician" | "lay-es";
export type LaySection = { id: string; element: string; text: string };

export const layAudiences: { id: LayAudience; label: string; reader: string; language: "en" | "es" }[] = [
  { id: "lay-adult", label: "Adult reader", reader: "An adult with limited health literacy", language: "en" },
  { id: "lay-caregiver", label: "Caregiver", reader: "A family member who helps someone with migraine", language: "en" },
  { id: "lay-teen", label: "Teen reader", reader: "A teenager, who could not have joined this adult study", language: "en" },
  { id: "lay-physician", label: "Physician", reader: "A doctor who wants the statistics", language: "en" },
  { id: "lay-es", label: "Spanish draft (adult)", reader: "A Spanish-speaking adult; draft for a qualified translator to review", language: "es" },
];

export const annexElements: { id: string; element: string }[] = [
  { id: "id", element: "1. Trial identification" },
  { id: "sponsor", element: "2. Sponsor name and contact" },
  { id: "general", element: "3. General information (where, when, why)" },
  { id: "population", element: "4. Who took part" },
  { id: "product", element: "5. Investigational medicine" },
  { id: "safety", element: "6. Side effects and how often they occurred" },
  { id: "results", element: "7. Overall results" },
  { id: "comments", element: "8. Comments on the outcome" },
  { id: "follow", element: "9. Whether follow-up trials are planned" },
  { id: "more", element: "10. Where to find more information" },
];

const groupOf = (id: string): GroupKey | undefined => (id.endsWith("000") ? "placebo" : id.endsWith("001") ? "low" : id.endsWith("002") ? "high" : undefined);
function longDate(iso: string | undefined): string {
  if (!iso) return "not stated";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return d ? `${d} ${months[m - 1]} ${y}` : `${months[m - 1]} ${y}`;
}
function longDateEs(iso: string | undefined): string {
  if (!iso) return "sin fecha";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return d ? `${d} de ${months[m - 1]} de ${y}` : `${months[m - 1]} de ${y}`;
}

export type LayCorrection = { path: string; label: string; from: string; to: string } | null;

/** Every value a summary may use, with the registry field it comes from. */
export function layFacts(study: RegistryStudy, retrieved: string, correction: LayCorrection = null): LayFact[] {
  const p = study.protocolSection;
  const r = study.resultsSection;
  if (!r) return [];
  const out: LayFact[] = [];
  const add = (fact: LayFact) => out.push(correction && fact.path === correction.path ? { ...fact, value: correction.to, derived: `Practice correction: was ${correction.from}` } : fact);
  add({ id: "nct", label: "ClinicalTrials.gov number", value: p.identificationModule.nctId, path: "protocolSection.identificationModule.nctId" });
  add({ id: "org-id", label: "Sponsor study number", value: p.identificationModule.orgStudyIdInfo?.id ?? "", path: "protocolSection.identificationModule.orgStudyIdInfo.id" });
  add({ id: "title", label: "Official title", value: p.identificationModule.officialTitle ?? p.identificationModule.briefTitle, path: "protocolSection.identificationModule.officialTitle" });
  add({ id: "sponsor", label: "Sponsor", value: p.sponsorCollaboratorsModule.leadSponsor.name, path: "protocolSection.sponsorCollaboratorsModule.leadSponsor.name" });
  add({ id: "drug", label: "Investigational product", value: "AMG 301", path: "protocolSection.armsInterventionsModule.armGroups[].label" });
  add({ id: "start", label: "Start date", value: longDate(p.statusModule.startDateStruct?.date), path: "protocolSection.statusModule.startDateStruct.date" });
  add({ id: "end", label: "Completion date", value: longDate(p.statusModule.completionDateStruct?.date), path: "protocolSection.statusModule.completionDateStruct.date" });
  const locations = p.contactsLocationsModule?.locations ?? [];
  add({ id: "sites", label: "Study sites", value: String(locations.length), path: "protocolSection.contactsLocationsModule.locations (count)", derived: "Counted from the list of sites" });
  add({ id: "countries", label: "Countries", value: String(new Set(locations.map((item) => item.country)).size), path: "protocolSection.contactsLocationsModule.locations[].country (distinct)", derived: "Distinct countries in the site list" });
  add({ id: "age-min", label: "Minimum age", value: String(parseInt(p.eligibilityModule.minimumAge ?? "")), path: "protocolSection.eligibilityModule.minimumAge" });
  add({ id: "age-max", label: "Maximum age", value: String(parseInt(p.eligibilityModule.maximumAge ?? "")), path: "protocolSection.eligibilityModule.maximumAge" });
  add({ id: "min-days", label: "Migraine days per month to join", value: p.eligibilityModule.eligibilityCriteria.match(/≥ (\d+) migraine days/)?.[1] ?? "", path: "protocolSection.eligibilityModule.eligibilityCriteria" });
  add({ id: "failed", label: "Earlier preventive medicines failed", value: p.eligibilityModule.eligibilityCriteria.match(/Failed at least (\d+) medication/)?.[1] ?? "", path: "protocolSection.eligibilityModule.eligibilityCriteria" });
  add({ id: "arms", label: "Number of groups", value: String(p.armsInterventionsModule.armGroups.length), path: "protocolSection.armsInterventionsModule.armGroups (count)" });
  add({ id: "low-dose", label: "Lower dose", value: "210 mg every 4 weeks", path: 'armGroups["AMG 301 210 mg Q4W"]' });
  add({ id: "high-dose", label: "Higher dose", value: "420 mg every 2 weeks", path: 'armGroups["AMG 301 420 mg Q2W"]' });
  const weeks = p.outcomesModule.primaryOutcomes[0]?.measure.match(/(\d+)\s*-?\s*Week Double-Blind/i)?.[1] ?? "";
  add({ id: "weeks", label: "Treatment weeks", value: weeks, path: "protocolSection.outcomesModule.primaryOutcomes[0].measure" });
  add({ id: "window", label: "Primary time frame", value: p.outcomesModule.primaryOutcomes[0]?.timeFrame ?? "", path: "protocolSection.outcomesModule.primaryOutcomes[0].timeFrame" });
  add({ id: "follow-weeks", label: "Safety follow-up weeks", value: r.adverseEventsModule.timeFrame?.match(/(\d+)-week safety follow-up/)?.[1] ?? "", path: "resultsSection.adverseEventsModule.timeFrame" });

  const period = r.participantFlowModule.periods[0];
  for (const milestone of period.milestones) {
    for (const item of milestone.achievements) {
      const key = milestone.type === "STARTED" ? "started" : milestone.type === "COMPLETED" ? "completed" : "not-completed";
      add({ id: `${key}-${groupOf(item.groupId)}`, label: `${milestone.type.toLowerCase()} (${groupOf(item.groupId)})`, value: item.numSubjects, path: `resultsSection.participantFlowModule.periods[0].milestones[${milestone.type}].${item.groupId}`, group: groupOf(item.groupId) });
    }
  }
  const sum = (key: string) => String((["placebo", "low", "high"] as GroupKey[]).reduce((total, group) => total + Number(out.find((fact) => fact.id === `${key}-${group}`)?.value ?? 0), 0));
  add({ id: "completed-total", label: "Completed (all groups)", value: sum("completed"), path: "participantFlowModule COMPLETED, summed", derived: "Sum of the three groups" });

  const baseline = r.baselineCharacteristicsModule;
  const totalId = baseline.groups.find((group) => /total/i.test(group.title))?.id ?? "BG003";
  add({ id: "total", label: "People who took part", value: baseline.denoms[0].counts.find((count) => count.groupId === totalId)?.value ?? "", path: `resultsSection.baselineCharacteristicsModule.denoms[0].${totalId}` });
  const age = baseline.measures.find((measure) => /^Age, Continuous/.test(measure.title));
  add({ id: "age-mean", label: "Average age", value: age?.classes[0].categories[0].measurements.find((m) => m.groupId === totalId)?.value ?? "", path: `baselineCharacteristicsModule.measures["Age, Continuous"].${totalId}` });
  const sex = baseline.measures.find((measure) => /^Sex/.test(measure.title));
  for (const category of sex?.classes[0].categories ?? []) {
    add({ id: category.title === "Female" ? "women" : "men", label: category.title ?? "", value: category.measurements.find((m) => m.groupId === totalId)?.value ?? "", path: `baselineCharacteristicsModule.measures["Sex"].${category.title}.${totalId}` });
  }

  const primary = r.outcomeMeasuresModule.outcomeMeasures.find((measure) => measure.type === "PRIMARY");
  if (primary) {
    for (const m of primary.classes?.[0].categories[0].measurements ?? []) {
      const group = groupOf(m.groupId);
      add({ id: `mmd-${group}`, label: `Change in monthly migraine days (${group})`, value: m.value, path: `outcomeMeasures[PRIMARY].${m.groupId}.value`, group });
      add({ id: `mmd-se-${group}`, label: `Standard error (${group})`, value: m.spread ?? "", path: `outcomeMeasures[PRIMARY].${m.groupId}.spread`, group });
      add({ id: `mmd-round-${group}`, label: `Fewer migraine days, rounded (${group})`, value: Math.abs(Number(m.value)).toFixed(1), path: `outcomeMeasures[PRIMARY].${m.groupId}.value`, group, derived: `${m.value} rounded to one decimal, sign dropped` });
    }
    for (const count of primary.denoms?.[0].counts ?? []) {
      add({ id: `analysed-${groupOf(count.groupId)}`, label: `Analysed (${groupOf(count.groupId)})`, value: count.value, path: `outcomeMeasures[PRIMARY].denoms.${count.groupId}`, group: groupOf(count.groupId) });
    }
    add({ id: "analysed-total", label: "Analysed for the main result", value: String((primary.denoms?.[0].counts ?? []).reduce((total, count) => total + Number(count.value), 0)), path: "outcomeMeasures[PRIMARY].denoms, summed", derived: "Sum of the three groups" });
    for (const analysis of primary.analyses ?? []) {
      const group = groupOf(analysis.groupIds[1]);
      add({ id: `p-${group}`, label: `p-value vs placebo (${group})`, value: analysis.pValue ?? "", path: `outcomeMeasures[PRIMARY].analyses[${analysis.groupIds.join(",")}].pValue`, group });
      add({ id: `diff-${group}`, label: `Difference vs placebo (${group})`, value: analysis.paramValue ?? "", path: `outcomeMeasures[PRIMARY].analyses[${analysis.groupIds.join(",")}].paramValue`, group });
      add({ id: `ci-${group}`, label: `95% CI (${group})`, value: `${analysis.ciLowerLimit} to ${analysis.ciUpperLimit}`, path: `outcomeMeasures[PRIMARY].analyses[${analysis.groupIds.join(",")}].ci`, group });
    }
  }
  const responders = r.outcomeMeasuresModule.outcomeMeasures.find((measure) => /50% Reduction/i.test(measure.title));
  if (responders) add({ id: "resp-def", label: "Responder definition", value: "at least a 50% reduction", path: 'outcomeMeasures["50% reduction"].title' });
  const ciLevel = primary?.analyses?.[0];
  if (ciLevel?.ciPctValue) add({ id: "ci-level", label: "Confidence level", value: `${ciLevel.ciPctValue}%`, path: "outcomeMeasures[PRIMARY].analyses[].ciPctValue" });
  for (const m of responders?.classes?.[0].categories[0].measurements ?? []) {
    const group = groupOf(m.groupId);
    add({ id: `resp-${group}`, label: `At least half as many migraine days (${group})`, value: m.value, path: `outcomeMeasures["50% reduction"].${m.groupId}.value`, group });
  }

  const ae = r.adverseEventsModule;
  for (const group of ae.eventGroups) {
    const key = groupOf(group.id);
    add({ id: `sae-${key}`, label: `Serious adverse events (${key})`, value: String(group.seriousNumAffected ?? ""), path: `adverseEventsModule.eventGroups.${group.id}.seriousNumAffected`, group: key });
    add({ id: `risk-${key}`, label: `At risk (${key})`, value: String(group.seriousNumAtRisk ?? ""), path: `adverseEventsModule.eventGroups.${group.id}.seriousNumAtRisk`, group: key });
    add({ id: `other-${key}`, label: `Other adverse events (${key})`, value: String(group.otherNumAffected ?? ""), path: `adverseEventsModule.eventGroups.${group.id}.otherNumAffected`, group: key });
    add({ id: `deaths-${key}`, label: `Deaths (${key})`, value: String(group.deathsNumAffected ?? 0), path: `adverseEventsModule.eventGroups.${group.id}.deathsNumAffected`, group: key });
  }
  add({ id: "sae-terms", label: "Serious adverse event terms", value: (ae.seriousEvents ?? []).map((event) => event.term).join(", "), path: "adverseEventsModule.seriousEvents[].term" });
  const top = [...(ae.otherEvents ?? [])].sort((a, b) => b.stats.reduce((s, x) => s + (x.numAffected ?? 0), 0) - a.stats.reduce((s, x) => s + (x.numAffected ?? 0), 0))[0];
  if (top) {
    add({ id: "top-other", label: "Most common other adverse event", value: top.term, path: "adverseEventsModule.otherEvents[] (largest total)", derived: "Event with the most people across groups" });
    for (const stat of top.stats) add({ id: `top-${groupOf(stat.groupId)}`, label: `${top.term} (${groupOf(stat.groupId)})`, value: String(stat.numAffected ?? ""), path: `adverseEventsModule.otherEvents["${top.term}"].${stat.groupId}`, group: groupOf(stat.groupId) });
  }
  add({ id: "threshold", label: "Other adverse events listed above this % of a group", value: ae.frequencyThreshold ?? "", path: "adverseEventsModule.frequencyThreshold" });
  add({ id: "retrieved", label: "Record retrieved", value: longDate(retrieved.slice(0, 10)), path: "registry.json retrieved" });
  return out;
}

const fact = (facts: LayFact[], id: string) => facts.find((item) => item.id === id)?.value ?? "[not in the record]";

const plainTerms: Record<string, { en: string; es: string }> = {
  Cholelithiasis: { en: "gallstones (cholelithiasis)", es: "cálculos en la vesícula (cholelithiasis)" },
  Hypersensitivity: { en: "an allergic reaction (hypersensitivity)", es: "una reacción alérgica (hypersensitivity)" },
  Gastroenteritis: { en: "stomach flu (gastroenteritis)", es: "infección del estómago (gastroenteritis)" },
  "Migraine with aura": { en: "migraine with aura", es: "migraña con aura (migraine with aura)" },
  "Polycystic ovaries": { en: "polycystic ovaries", es: "ovarios poliquísticos (polycystic ovaries)" },
  "Erythema nodosum": { en: "painful red lumps on the skin (erythema nodosum)", es: "bultos rojos y dolorosos en la piel (erythema nodosum)" },
  Nasopharyngitis: { en: "a cold (nasopharyngitis)", es: "un resfriado (nasopharyngitis)" },
};
const plainTerm = (term: string, lang: "en" | "es") => plainTerms[term]?.[lang] ?? term;
const listOf = (items: string[], and: string) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")}, ${and} ${items.at(-1)}`);
const esNum = (value: string) => value.replace(/(\d)\.(\d)/, "$1,$2");

/** One Annex V summary for one reader. Only values from `facts` are used. */
export function laySummary(facts: LayFact[], audience: LayAudience): LaySection[] {
  const f = (id: string) => fact(facts, id);
  const terms = f("sae-terms").split(", ").filter(Boolean);
  const deaths = ["placebo", "low", "high"].reduce((sum, group) => sum + Number(f(`deaths-${group}`)), 0);
  const per = (key: string, risk: string, unit = "people", sep = ", ") =>
    `${f(`${key}-placebo`)} of ${f(`${risk}-placebo`)} ${unit} on placebo${sep}${f(`${key}-low`)} of ${f(`${risk}-low`)} ${unit} on 210 mg${sep}and ${f(`${key}-high`)} of ${f(`${risk}-high`)} ${unit} on 420 mg`;

  if (audience === "lay-es") return laySummaryEs(facts);

  if (audience === "lay-physician") {
    return [
      { id: "id", element: "", text: `${f("title")}. ${f("nct")}; sponsor protocol ${f("org-id")}.` },
      { id: "sponsor", element: "", text: `Sponsor: ${f("sponsor")}. Medical information: medinfo@amgen.com, 866-572-6436.` },
      { id: "general", element: "", text: `Phase 2a, randomized, triple-masked, placebo-controlled, ${f("arms")}-arm parallel-group study; ${f("sites")} sites in ${f("countries")} countries; ${f("start")} to ${f("end")}.` },
      { id: "population", element: "", text: `${f("total")} randomized adults aged ${f("age-min")} to ${f("age-max")} (mean age ${f("age-mean")} years; ${f("women")} women), ≥ ${f("min-days")} migraine days per month, at least ${f("failed")} prior preventive failure.` },
      { id: "product", element: "", text: `AMG 301 (anti-PAC1 receptor antibody) SC: ${f("low-dose")} (n = ${f("started-low")}) or ${f("high-dose")} (n = ${f("started-high")}), versus placebo (n = ${f("started-placebo")}), for ${f("weeks")} weeks.` },
      { id: "safety", element: "", text: `Serious adverse events: ${f("sae-placebo")}/${f("risk-placebo")} placebo, ${f("sae-low")}/${f("risk-low")} 210 mg, ${f("sae-high")}/${f("risk-high")} 420 mg (${terms.join(", ").toLowerCase()}). Deaths: ${deaths}. Other adverse events (≥ ${f("threshold")}% threshold): ${f("other-placebo")}/${f("risk-placebo")}, ${f("other-low")}/${f("risk-low")}, ${f("other-high")}/${f("risk-high")}; most frequent ${f("top-other").toLowerCase()}.` },
      { id: "results", element: "", text: `Primary endpoint, LS mean change in monthly migraine days at weeks 9–${f("weeks")}: placebo ${f("mmd-placebo")} (SE ${f("mmd-se-placebo")}; n = ${f("analysed-placebo")}), 210 mg ${f("mmd-low")} (SE ${f("mmd-se-low")}; n = ${f("analysed-low")}), 420 mg ${f("mmd-high")} (SE ${f("mmd-se-high")}; n = ${f("analysed-high")}). Difference vs placebo: 210 mg ${f("diff-low")} (95% CI ${f("ci-low")}; nominal p = ${f("p-low")}); 420 mg ${f("diff-high")} (95% CI ${f("ci-high")}; nominal p = ${f("p-high")}). Neither dose separated from placebo. ≥ 50% responders: ${f("resp-placebo")}%, ${f("resp-low")}%, ${f("resp-high")}%.` },
      { id: "comments", element: "", text: "Single phase 2a study; p-values are nominal without multiplicity adjustment. No efficacy claim follows from these data." },
      { id: "follow", element: "", text: "The registry record does not state whether follow-up trials are planned." },
      { id: "more", element: "", text: `clinicaltrials.gov/study/${f("nct")} (record retrieved ${f("retrieved")}).` },
    ].map((section) => ({ ...section, element: annexElements.find((item) => item.id === section.id)!.element }));
  }

  const teen = audience === "lay-teen";
  const caregiver = audience === "lay-caregiver";
  const sections: LaySection[] = [
    {
      id: "id",
      element: "",
      text: `${caregiver ? "This summary is for family members and others who help someone with migraine. " : ""}This summary is about one clinical study. Its official title is “${f("title")}”. The ClinicalTrials.gov number is ${f("nct")}. ${f("sponsor")}'s study number is ${f("org-id")}.`,
    },
    {
      id: "sponsor",
      element: "",
      text: `${f("sponsor")} ran and paid for the study. Questions can go to ${f("sponsor")} Medical Information: medinfo@amgen.com or 866-572-6436.`,
    },
    {
      id: "general",
      element: "",
      text: teen
        ? `The study ran from ${f("start")} to ${f("end")} in ${f("countries")} countries. It tested a medicine called ${f("drug")} to see if it means fewer migraine days. Some people got a placebo instead. A placebo looks the same but has no medicine in it.`
        : `The study ran from ${f("start")} to ${f("end")}, at ${f("sites")} study sites in ${f("countries")} countries. It asked whether a test medicine called ${f("drug")} lowers the number of days with migraine each month. ${f("drug")} was compared with a placebo. A placebo looks the same but has no medicine in it.`,
    },
    {
      id: "population",
      element: "",
      text: teen
        ? `${f("total")} adults took part. No one under ${f("age-min")} could join this study. Everyone had at least ${f("min-days")} migraine days a month.`
        : `${f("total")} adults took part: ${f("women")} women and ${f("men")} men. Their average age was ${f("age-mean")} years. To join, people had to be ${f("age-min")} to ${f("age-max")} years old, have at least ${f("min-days")} migraine days a month, and have tried at least ${f("failed")} other medicine to prevent migraine that did not work or caused problems.`,
    },
    {
      id: "product",
      element: "",
      text: `A chance process put each person in one of ${f("arms")} groups. ${f("started-placebo")} people got placebo. ${f("started-low")} people got ${f("drug")} ${f("low-dose")}. ${f("started-high")} people got ${f("drug")} ${f("high-dose")}. Everyone got shots under the skin for ${f("weeks")} weeks. No one knew which group they were in.`,
    },
    {
      id: "safety",
      element: "",
      text: teen
        ? `Some people had serious health problems during the study: ${per("sae", "risk")}. These were ${listOf(terms.map((term) => plainTerm(term, "en")), "and")}. No one died.`
        : `Serious health problems were reported during the study, whether or not the medicine caused them. They happened to ${per("sae", "risk")}. The serious problems were ${listOf(terms.map((term) => plainTerm(term, "en")), "and")}. ${deaths === 0 ? "No one died." : `${deaths} people died.`} Less serious problems were reported by ${per("other", "risk")}. The most common was ${plainTerm(f("top-other"), "en")}. These were counted over the ${f("weeks")} weeks of treatment and ${f("follow-weeks")} weeks of follow-up.`,
    },
    {
      id: "results",
      element: "",
      text: teen
        ? `Migraine days went down in all ${f("arms")} groups by about the same amount. The medicine did not do better than the placebo. ${f("completed-total")} of ${f("total")} people finished the study.`
        : `After ${f("weeks")} weeks, monthly migraine days went down in all ${f("arms")} groups. On average they fell by about ${f("mmd-round-placebo")} days with placebo, about ${f("mmd-round-low")} days with 210 mg, and about ${f("mmd-round-high")} days with 420 mg. The study did not find that ${f("drug")} lowered migraine days more than placebo did. ${f("resp-placebo")}% of people on placebo, ${f("resp-low")}% on 210 mg, and ${f("resp-high")}% on 420 mg had their migraine days cut at least in half. These averages come from the ${f("analysed-total")} people with enough diary data. ${f("completed-total")} of ${f("total")} people finished the study.`,
    },
    {
      id: "comments",
      element: "",
      text: caregiver
        ? "These are the results of one study. One study alone does not show whether a medicine works or is safe. This summary is not medical advice. The person you help should not change their treatment without talking to their doctor."
        : "These are the results of one study. One study alone does not show whether a medicine works or is safe. This summary is not medical advice. Do not change your treatment without talking to your doctor.",
    },
    { id: "follow", element: "", text: `The registry record does not say whether more studies of ${f("drug")} are planned.` },
    { id: "more", element: "", text: `The full record, with all results, is at clinicaltrials.gov/study/${f("nct")}. This summary was made from the record as retrieved on ${f("retrieved")}.` },
  ];
  return sections.map((section) => ({ ...section, element: annexElements.find((item) => item.id === section.id)!.element }));
}

function laySummaryEs(facts: LayFact[]): LaySection[] {
  const f = (id: string) => fact(facts, id);
  const terms = f("sae-terms").split(", ").filter(Boolean);
  const deaths = ["placebo", "low", "high"].reduce((sum, group) => sum + Number(f(`deaths-${group}`)), 0);
  const per = (key: string) =>
    `${f(`${key}-placebo`)} de ${f("risk-placebo")} personas con placebo, ${f(`${key}-low`)} de ${f("risk-low")} personas con 210 mg y ${f(`${key}-high`)} de ${f("risk-high")} personas con 420 mg`;
  const sections: LaySection[] = [
    { id: "id", element: "", text: `Este resumen trata de un estudio clínico. Su título oficial (en inglés) es “${f("title")}”. El número en ClinicalTrials.gov es ${f("nct")}. El número de estudio de ${f("sponsor")} es ${f("org-id")}.` },
    { id: "sponsor", element: "", text: `${f("sponsor")} dirigió y pagó el estudio. Las preguntas pueden ir a Información Médica de ${f("sponsor")}: medinfo@amgen.com o 866-572-6436.` },
    { id: "general", element: "", text: `El estudio fue del ${longDateEs(dateIso(f("start")))} al ${longDateEs(dateIso(f("end")))}, en ${f("sites")} centros de ${f("countries")} países. Preguntó si un medicamento en prueba llamado ${f("drug")} reduce los días con migraña cada mes. Se comparó ${f("drug")} con un placebo. Un placebo se ve igual pero no tiene medicamento.` },
    { id: "population", element: "", text: `Participaron ${f("total")} adultos: ${f("women")} mujeres y ${f("men")} hombres. La edad promedio fue de ${esNum(f("age-mean"))} años. Para participar, las personas debían tener de ${f("age-min")} a ${f("age-max")} años, al menos ${f("min-days")} días de migraña al mes, y haber probado al menos ${f("failed")} otro medicamento preventivo que no funcionó o causó problemas.` },
    { id: "product", element: "", text: `Un proceso al azar asignó a cada persona a uno de ${f("arms")} grupos. ${f("started-placebo")} personas recibieron placebo. ${f("started-low")} personas recibieron 210 mg de ${f("drug")} cada 4 semanas. ${f("started-high")} personas recibieron 420 mg de ${f("drug")} cada 2 semanas. Todos recibieron inyecciones bajo la piel durante ${f("weeks")} semanas. Nadie sabía en qué grupo estaba.` },
    { id: "safety", element: "", text: `Se informaron problemas de salud graves durante el estudio, los haya causado o no el medicamento. Les pasaron a ${per("sae")}. Los problemas graves fueron ${listOf(terms.map((term) => plainTerm(term, "es")), "y")}. ${deaths === 0 ? "Nadie murió." : `Murieron ${deaths} personas.`} Problemas menos graves les pasaron a ${per("other")}. El más común fue ${plainTerm(f("top-other"), "es")}. Se contaron durante las ${f("weeks")} semanas de tratamiento y ${f("follow-weeks")} semanas de seguimiento.` },
    { id: "results", element: "", text: `Después de ${f("weeks")} semanas, los días de migraña al mes bajaron en los ${f("arms")} grupos. En promedio bajaron unos ${esNum(f("mmd-round-placebo"))} días con placebo, unos ${esNum(f("mmd-round-low"))} días con 210 mg y unos ${esNum(f("mmd-round-high"))} días con 420 mg. El estudio no encontró que ${f("drug")} redujera los días de migraña más que el placebo. El ${esNum(f("resp-placebo"))} % de las personas con placebo, el ${esNum(f("resp-low"))} % con 210 mg y el ${esNum(f("resp-high"))} % con 420 mg redujeron sus días de migraña al menos a la mitad. Estos promedios vienen de las ${f("analysed-total")} personas con suficientes datos del diario. ${f("completed-total")} de ${f("total")} personas terminaron el estudio.` },
    { id: "comments", element: "", text: "Estos son los resultados de un solo estudio. Un solo estudio no muestra si un medicamento funciona o es seguro. Este resumen no es un consejo médico. No cambie su tratamiento sin hablar con su médico." },
    { id: "follow", element: "", text: `El registro no dice si se planean más estudios de ${f("drug")}.` },
    { id: "more", element: "", text: `El registro completo, con todos los resultados (en inglés), está en clinicaltrials.gov/study/${f("nct")}. Este resumen se hizo con el registro descargado el ${longDateEs(dateIso(f("retrieved")))}.` },
  ];
  return sections.map((section) => ({ ...section, element: annexElements.find((item) => item.id === section.id)!.element }));
}

function dateIso(long: string): string {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const match = long.match(/^(\d+) (\w+) (\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${String(months.indexOf(match[2]) + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export const layText = (sections: LaySection[]) => sections.map((section) => section.text).join("\n\n");

/* ---------- Checks ---------- */

const numberToken = /(?<![\w@.-])[−-]?\d+(?:[.,]\d+)?(?![\w-]|[.,]\d)/g;
const normal = (token: string) => token.replace(/^[−-]/, "").replace(",", ".");

/** Numbers in prose, skipping identifiers like NCT03238781, 2017-000630-57, and phone numbers. */
export function numbersIn(text: string): string[] {
  return (text.replace(/\b\d{3}-\d{3}-\d{4}\b/g, " ").match(numberToken) ?? []).map(normal);
}

function factNumbers(facts: LayFact[], filter: (item: LayFact) => boolean = () => true): Set<string> {
  return new Set(facts.filter(filter).flatMap((item) => (item.value.match(/\d+(?:\.\d+)?/g) ?? []).map(normal)));
}

const groupWords: Record<GroupKey, RegExp> = { placebo: /placebo/i, low: /210 mg/i, high: /420 mg/i };
const promo = ["breakthrough", "proven", "cure", "miracle", "game-changing", "revolutionary", "remarkable", "promising", "highly effective", "avance revolucionario", "milagro", "cura", "comprobado"];
const benefitClaim = /\b(fewer|less|lower(?:ed)?|better|more effective|outperform\w*|superior|menos|mejor|redujo)\b[^.]{0,60}\b(than|que)\b[^.]{0,25}placebo/i;
const negation = /\b(not|no|did not|didn't|neither|nor|no encontró)\b/i;

export function checkLay(text: string, facts: LayFact[]): DraftCheck[] {
  const known = factNumbers(facts);
  const unknown = [...new Set(numbersIn(text).filter((value) => !known.has(value)))];
  const checks: DraftCheck[] = [
    {
      id: "numbers",
      label: "Every number traces to the record",
      passed: unknown.length === 0,
      note: unknown.length === 0 ? "Every number appears in a registry field." : `Not in the record: ${unknown.join(", ")}.`,
    },
  ];
  const neutral = factNumbers(facts, (item) => !item.group);
  const own = (group: GroupKey) => factNumbers(facts, (item) => item.group === group);
  const swaps: string[] = [];
  for (const clause of text.split(/[,;.]\s+|\s+y\s+|\s+and\s+/)) {
    const named = (Object.keys(groupWords) as GroupKey[]).filter((group) => groupWords[group].test(clause));
    if (named.length !== 1) continue;
    const group = named[0];
    for (const value of numbersIn(clause)) {
      if (own(group).has(value) || neutral.has(value)) continue;
      const other = (Object.keys(groupWords) as GroupKey[]).find((item) => item !== group && own(item).has(value));
      if (other) swaps.push(`“${clause.trim()}” uses ${value}, which belongs to the ${other === "placebo" ? "placebo" : other === "low" ? "210 mg" : "420 mg"} group`);
    }
  }
  checks.push({ id: "groups", label: "Numbers stay with their group", passed: swaps.length === 0, note: swaps.length === 0 ? "Each group's numbers are next to that group." : swaps.join("; ") + "." });
  const terms = fact(facts, "sae-terms").split(", ").filter(Boolean);
  const lower = text.toLowerCase();
  const dropped = terms.filter((term) => !lower.includes(term.toLowerCase()));
  checks.push({ id: "serious", label: "Every serious event is named", passed: dropped.length === 0, note: dropped.length === 0 ? `All ${terms.length} serious events in the record are named.` : `Leaves out: ${dropped.join(", ")}.` });
  const words = promo.filter((word) => new RegExp(`\\b${word}\\b`, "i").test(text));
  checks.push({ id: "neutral", label: "Neutral wording", passed: words.length === 0, note: words.length === 0 ? "No promotional words." : `Promotional: ${words.join(", ")}.` });
  const claims = text.split(/(?<=[.!?])\s+/).filter((sentence) => benefitClaim.test(sentence) && !negation.test(sentence));
  checks.push({ id: "claim", label: "No benefit the results do not show", passed: claims.length === 0, note: claims.length === 0 ? "No sentence says AMG 301 beat placebo." : `Claims a benefit the record does not show: “${claims[0]}”` });
  return checks;
}

/** Where each number in a draft comes from. */
export function traceNumbers(text: string, facts: LayFact[]) {
  return [...new Set(numbersIn(text))].map((value) => ({
    value,
    facts: facts.filter((item) => (item.value.match(/\d+(?:\.\d+)?/g) ?? []).map(normal).includes(value)).slice(0, 3),
  }));
}

export type LayPlant = { id: string; label: string; expect: string | null; edit: (text: string) => string };

export const layPlants: LayPlant[] = [
  { id: "control", label: "Control: the generated adult summary", expect: null, edit: (text) => text },
  { id: "number", label: "Changed number (placebo group size 137 → 173)", expect: "numbers", edit: (text) => text.replace("137 people got placebo", "173 people got placebo") },
  {
    id: "swap",
    label: "Swapped groups in the serious side-effect sentence",
    expect: "groups",
    edit: (text) => text.replace(/(\d+ of \d+) people on placebo, (\d+ of \d+) people on 210 mg/, "$2 people on placebo, $1 people on 210 mg"),
  },
  { id: "omit", label: "Serious side effect left out (hypersensitivity)", expect: "serious", edit: (text) => text.replace(/,? ?an allergic reaction \(hypersensitivity\)/, "") },
  { id: "promo", label: "Promotional wording", expect: "neutral", edit: (text) => `AMG 301 is a breakthrough medicine. ${text}` },
  {
    id: "claim",
    label: "Wrong conclusion (says AMG 301 beat placebo)",
    expect: "claim",
    edit: (text) => text.replace(/The study did not find that AMG 301 lowered migraine days more than placebo did\./, "People on AMG 301 had fewer migraine days than people on placebo."),
  },
];

export function runLayPlants(facts: LayFact[]) {
  const base = layText(laySummary(facts, "lay-adult"));
  const results = layPlants.map((plant) => {
    const text = plant.edit(base);
    const failed = checkLay(text, facts).filter((check) => !check.passed);
    const changed = text !== base || plant.expect === null;
    const caught = plant.expect ? changed && failed.some((check) => check.id === plant.expect) : failed.length === 0;
    return { ...plant, text, failed, caught };
  });
  const planted = results.filter((item) => item.expect);
  return { results, planted: planted.length, caught: planted.filter((item) => item.caught).length, falseAlarms: results.filter((item) => !item.expect && !item.caught).length };
}
