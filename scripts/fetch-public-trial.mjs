// Downloads one ClinicalTrials.gov study and its attached protocol / SAP PDFs, extracts the
// PDF text page by page, and fetches comparable completed trials. Output goes to public/trials/<NCT>/.
// Usage: node scripts/fetch-public-trial.mjs NCT03238781
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const nct = (process.argv[2] ?? "").toUpperCase();
if (!/^NCT\d{8}$/.test(nct)) {
  console.error("Give an id like NCT03238781");
  process.exit(1);
}
const out = resolve("public/trials", nct);
const api = "https://clinicaltrials.gov/api/v2/studies";

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} → ${response.status}`);
  return response.json();
}

// Some sponsor PDFs embed fonts whose character map is offset by 29 code points
// ("3URWRFRO" is "Protocol", space arrives as \x03). Fonts are decoded only when their text
// contains those control characters, so ordinary fonts on the same page stay untouched.
const SHIFT = 29;
function shiftedFonts(items) {
  const stats = new Map();
  for (const item of items) {
    if (!item.str) continue;
    const entry = stats.get(item.fontName) ?? { control: 0, total: 0 };
    for (const char of item.str) {
      entry.total += 1;
      if (char.charCodeAt(0) < 0x20) entry.control += 1;
    }
    stats.set(item.fontName, entry);
  }
  return new Set([...stats].filter(([, s]) => s.total > 0 && s.control / s.total > 0.05).map(([font]) => font));
}
// pdf.js turns the shifted codes for ( ) ' * = into plain spaces, so those positions are
// marked and restored afterwards: paired marks around a short run become parentheses,
// a mark between a word and "s" becomes an apostrophe, anything else becomes a space.
const MARK = "\u0001";
function unshift(text) {
  let out = "";
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (char === " ") out += MARK;
    else if (char === "¶") out += "'";
    else if (char === "̻") out += "-";
    else if (code + SHIFT <= 0x7e) out += String.fromCharCode(code + SHIFT);
    else out += char;
  }
  return out;
}
function restoreMarks(line) {
  return line
    .replace(new RegExp(`([A-Za-z])${MARK}([a-z]{1,2})${MARK}`, "g"), "$1($2)")
    .replace(new RegExp(`${MARK}([A-Za-z0-9][^${MARK}\\n]{1,59}?)${MARK}`, "g"), (_, inner) => `(${inner.trim()})`)
    .replace(new RegExp(`([A-Za-z])${MARK}(s\\b)`, "g"), "$1'$2")
    .replaceAll(MARK, " ");
}

function linesFrom(rawItems, shifted) {
  const items = rawItems.map((item) => (shifted.has(item.fontName) && item.str ? { ...item, str: unshift(item.str) } : item));
  const glyphs = items.filter((item) => item.str && item.transform?.length >= 6);
  glyphs.sort((a, b) => (Math.abs(b.transform[5] - a.transform[5]) > 2 ? b.transform[5] - a.transform[5] : a.transform[4] - b.transform[4]));
  const lines = [];
  let y = null;
  let line = "";
  for (const item of glyphs) {
    if (y === null || Math.abs(item.transform[5] - y) > 3) {
      if (line.trim()) lines.push(line.trim());
      line = item.str;
      y = item.transform[5];
    } else {
      line += line.endsWith(" ") || item.str.startsWith(" ") ? item.str : ` ${item.str}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.map(restoreMarks).join("\n");
}

async function pdfPages(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} → ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  const doc = await getDocument({
    data,
    useSystemFonts: true,
    standardFontDataUrl: new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).href,
  }).promise;
  const contents = [];
  for (let number = 1; number <= doc.numPages; number += 1) {
    const page = await doc.getPage(number);
    contents.push((await page.getTextContent()).items);
  }
  const shifted = shiftedFonts(contents.flat());
  const pages = contents.map((items, index) => ({
    number: index + 1,
    // The sponsor's symbol font stores ≥ and ≤ at 0x95 and 0x94, and bullets in the private-use area.
    text: linesFrom(items, shifted)
      .replace(/\u0095/g, "≥")
      .replace(/\u0094/g, "≤")
      .replace(/[\uf0b7\uf0a7]/g, "•")
      .replace(/\u2011/g, "-")
      .replace(/[ \t]+/g, " ")
      .replace(/ \n/g, "\n"),
  }));
  return { bytes: data.length, decodedFonts: shifted.size, pages };
}

const retrieved = new Date().toISOString();
await mkdir(out, { recursive: true });

const study = await json(`${api}/${nct}`);
await writeFile(resolve(out, "registry.json"), JSON.stringify({ retrieved, source: `${api}/${nct}`, study }, null, 1));
console.log(`registry.json: ${study.protocolSection.identificationModule.briefTitle}`);

const docs = study.documentSection?.largeDocumentModule?.largeDocs ?? [];
for (const doc of docs) {
  const kind = doc.hasProtocol ? "protocol" : doc.hasSap ? "sap" : doc.hasIcf ? "icf" : null;
  if (!kind) continue;
  const url = `https://cdn.clinicaltrials.gov/large-docs/${nct.slice(-2)}/${nct}/${doc.filename}`;
  const { bytes, decodedFonts, pages } = await pdfPages(url);
  await writeFile(
    resolve(out, `${kind}.json`),
    JSON.stringify({ retrieved, source: url, label: doc.label, documentDate: doc.date, bytes, decodedFonts, pages }),
  );
  console.log(`${kind}.json: ${pages.length} pages from ${doc.filename}`);
}

const conditions = study.protocolSection.conditionsModule.conditions.join(" ");
const phase = study.protocolSection.designModule.phases?.[0] ?? "PHASE2";
const purpose = study.protocolSection.designModule.designInfo?.primaryPurpose ?? "PREVENTION";
const peerQuery = new URLSearchParams({
  "query.cond": /migraine/i.test(conditions) ? "migraine" : conditions,
  "filter.advanced": `AREA[Phase]${phase} AND AREA[OverallStatus]COMPLETED AND AREA[DesignPrimaryPurpose]${purpose} AND AREA[StudyType]INTERVENTIONAL`,
  pageSize: "25",
});
const peerData = await json(`${api}?${peerQuery}`);
const peers = peerData.studies
  .filter((item) => item.protocolSection.identificationModule.nctId !== nct)
  .map((item) => {
    const p = item.protocolSection;
    const criteria = p.eligibilityModule?.eligibilityCriteria ?? "";
    const [inclusion = "", exclusion = ""] = criteria.split(/exclusion criteria:?/i);
    const count = (text) => text.split("\n").filter((line) => /^\s*(\*|-|\d+\.)\s+\S/.test(line)).length;
    return {
      nctId: p.identificationModule.nctId,
      title: p.identificationModule.briefTitle,
      sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name ?? null,
      phase: p.designModule?.phases ?? [],
      enrollment: p.designModule?.enrollmentInfo?.count ?? null,
      arms: p.armsInterventionsModule?.armGroups?.length ?? null,
      minimumAge: p.eligibilityModule?.minimumAge ?? null,
      maximumAge: p.eligibilityModule?.maximumAge ?? null,
      inclusionCount: count(inclusion),
      exclusionCount: count(exclusion),
      primaryOutcomes: (p.outcomesModule?.primaryOutcomes ?? []).map((o) => ({ measure: o.measure, timeFrame: o.timeFrame })),
      secondaryCount: p.outcomesModule?.secondaryOutcomes?.length ?? 0,
      hasResults: item.hasResults ?? false,
    };
  });
await writeFile(
  resolve(out, "peers.json"),
  JSON.stringify({ retrieved, source: `${api}?${peerQuery}`, peers }, null, 1),
);
console.log(`peers.json: ${peers.length} comparable completed trials`);
