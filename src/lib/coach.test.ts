import { afterEach, describe, expect, it, vi } from "vitest";
import { teachPrompts } from "../data/study";
import { assessTeachbackWithGemini, writeBriefingWithGemini } from "./coach";
import { loadDemoConsent } from "./consent";
import { resetEngines } from "./llm";

const consent = loadDemoConsent();
const assignment = teachPrompts.find((prompt) => prompt.id === "randomization")!;

function geminiReturns(value: unknown, status = 200) {
  const body = { candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(value) }] } }] };
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetEngines();
});

describe("Gemini teach-back", () => {
  it("credits a paraphrase the keyword rules would miss", async () => {
    const ids = assignment.concepts.map((concept) => concept.id);
    geminiReturns({ covered: ids, misunderstanding: null, feedback: "You explained that a computer picks your group and nobody is told which." });
    const result = await assessTeachbackWithGemini(assignment, "A computer flips a coin for my group and neither me nor the doc find out.", consent);
    expect(result.engine).toBe("gemini");
    expect(result.label).toBe("Understands the key concept");
  });

  it("flags a stated misunderstanding even when ideas are covered", async () => {
    geminiReturns({ covered: [assignment.concepts[0].id], misunderstanding: "You said the doctor picks the drug. The form says it is by chance.", feedback: "You mentioned chance." });
    const result = await assessTeachbackWithGemini(assignment, "The doctor picks the best one for me by chance.", consent);
    expect(result.label).toBe("Needs clarification");
    expect(result.feedback).toMatch(/Worth checking/);
  });

  it("never sends 'I consent' to Gemini", async () => {
    const fetchMock = geminiReturns({});
    const result = await assessTeachbackWithGemini(assignment, "I consent", consent);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.label).not.toBe("Understands the key concept");
  });

  it("rejects unknown concept ids and invented figures", async () => {
    geminiReturns({ covered: ["made-up"], misunderstanding: null, feedback: "Good." });
    expect((await assessTeachbackWithGemini(assignment, "It is random and blinded.", consent)).engine).toBe("local");
    geminiReturns({ covered: [], misunderstanding: null, feedback: "There are 8 visits." });
    expect((await assessTeachbackWithGemini(assignment, "It is random and blinded.", consent)).engine).toBe("local");
  });
});

describe("Gemini summary briefing", () => {
  const saved = [{ id: "1", question: "Can my cousin join too?", answer: "Not in the form.", supported: false }];

  it("uses Gemini's briefing when it passes the checks", async () => {
    geminiReturns({ summary: "You saved one question.", questions: [{ text: "Can my cousin join too?", reason: "You saved this." }] });
    const briefing = await writeBriefingWithGemini({ consent, reviewed: [], saved, teach: [] });
    expect(briefing.engine).toBe("gemini");
  });

  it("falls back locally when Gemini adds a figure or says the person consented", async () => {
    geminiReturns({ summary: "You will be paid $80 a visit.", questions: [] });
    expect((await writeBriefingWithGemini({ consent, reviewed: [], saved, teach: [] })).engine).toBe("local");
    geminiReturns({ summary: "You have consented to the study.", questions: [] });
    const local = await writeBriefingWithGemini({ consent, reviewed: [], saved, teach: [] });
    expect(local.engine).toBe("local");
    expect(local.questions[0].text).toBe("Can my cousin join too?");
  });
});
