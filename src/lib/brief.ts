export type Brief = {
  title: string;
  condition: string;
  phase: string;
  intervention: string;
  comparator: string;
  population: string;
  primaryEndpoint: string;
  endpointWeek: string;
  visits: string;
  weeks: string;
};

export type DraftSection = { id: string; ref: string; heading: string; text: string; source: string; missing: boolean };

export const practiceBrief: Brief = {
  title: "AETHER-01: Aetherol for episodic migraine prevention",
  condition: "Episodic migraine",
  phase: "Phase 2",
  intervention: "Aetherol",
  comparator: "Placebo",
  population: "",
  primaryEndpoint: "",
  endpointWeek: "",
  visits: "8",
  weeks: "24",
};

const gap = (what: string) => `Not written. The brief does not give ${what}, so this section is left for the author.`;

export function draftFromBrief(brief: Brief): DraftSection[] {
  const has = (value: string) => value.trim().length > 0;
  const section = (ref: string, heading: string, text: string | null, source: string, what: string): DraftSection => ({
    id: `m11-${ref}`,
    ref,
    heading,
    text: text ?? gap(what),
    source: text ? source : "Brief field is empty",
    missing: text === null,
  });
  const schedule =
    has(brief.visits) && has(brief.weeks)
      ? `${brief.visits} clinic visits over a ${brief.weeks}-week treatment period, with the last visit at week ${brief.weeks}.`
      : null;
  const endpointVisit =
    has(brief.endpointWeek) && has(brief.weeks) && Number(brief.endpointWeek) > Number(brief.weeks)
      ? ` Check: the endpoint is at week ${brief.endpointWeek}, after the last visit at week ${brief.weeks}.`
      : "";
  return [
    section("1.1", "Protocol Synopsis", has(brief.title) ? `${brief.title}. ${brief.phase} trial in ${brief.condition.toLowerCase()} comparing ${brief.intervention} with ${brief.comparator.toLowerCase()}.` : null, "Brief: title, phase, condition, intervention, comparator", "a title"),
    section("1.3", "Schedule of Activities", schedule, "Brief: visits and weeks", "a visit count and treatment length"),
    section("3.1", "Primary Objective(s) and Associated Estimand(s)", has(brief.primaryEndpoint) ? `${brief.primaryEndpoint}${has(brief.endpointWeek) ? ` at week ${brief.endpointWeek}` : ""}.${endpointVisit}` : null, "Brief: primary endpoint", "a primary endpoint"),
    section("4.1", "Description of Trial Design", has(brief.comparator) && has(brief.weeks) ? `Randomised, ${brief.comparator.toLowerCase()}-controlled, ${brief.weeks}-week treatment period.` : null, "Brief: comparator and weeks", "a comparator and treatment length"),
    section("5.2", "Inclusion Criteria", has(brief.population) ? brief.population : null, "Brief: population", "the population"),
    section("6.1", "Description of Investigational Trial Intervention", has(brief.intervention) ? `${brief.intervention}, compared with ${brief.comparator.toLowerCase()}. Dose and route are not in the brief.` : null, "Brief: intervention", "an intervention"),
    section("10.11", "Sample Size Determination", null, "", "a sample size"),
  ];
}

/** Loosely follows CDISC USDM naming (Study, StudyVersion, StudyDesign, Encounter, Objective). Not validated against the USDM schema. */
export function usdmShape(brief: Brief, accepted: Set<string>) {
  const sections = draftFromBrief(brief);
  const visits = Number(brief.visits);
  const weeks = Number(brief.weeks);
  return {
    note: "USDM-shaped practice export. Not validated against the CDISC USDM schema. Not an approved protocol.",
    study: {
      name: brief.title,
      versions: [
        {
          versionIdentifier: "draft",
          titles: [{ text: brief.title, type: "Official Study Title" }],
          studyPhase: brief.phase,
          studyDesigns: [
            {
              name: "Main design",
              arms: [
                { name: brief.intervention, type: "Investigational Arm" },
                { name: brief.comparator, type: "Placebo Comparator Arm" },
              ],
              encounters:
                Number.isFinite(visits) && visits > 0 && Number.isFinite(weeks)
                  ? Array.from({ length: visits }, (_, index) => ({
                      name: `Visit ${index + 1}`,
                      timing: index === visits - 1 ? `Week ${weeks}` : "Not set in the brief",
                    }))
                  : [],
              objectives: brief.primaryEndpoint
                ? [{ level: "Primary", endpoint: brief.primaryEndpoint, timing: brief.endpointWeek ? `Week ${brief.endpointWeek}` : "Not set" }]
                : [],
              population: brief.population || null,
            },
          ],
          narrativeContent: sections.map((section) => ({
            sectionNumber: section.ref,
            sectionTitle: section.heading,
            text: section.text,
            decision: accepted.has(section.id) ? "accepted" : "not accepted",
          })),
        },
      ],
    },
  };
}
