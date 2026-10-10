import { afterEach, describe, expect, it, vi } from "vitest";
import { runAgent, type AgentEnv } from "./agent";
import { loadDemoConsent } from "./consent";
import { resetEngines } from "./llm";

const consent = loadDemoConsent();
const procedures = consent.passages.find((passage) => passage.sectionId === "procedures")!;

function env(overrides: Partial<AgentEnv> = {}): AgentEnv {
  return { role: "participant", consent, reviews: {}, navigate: vi.fn(), saveQuestion: vi.fn(), ...overrides };
}

function call(name: string, args: Record<string, unknown>) {
  return { candidates: [{ content: { role: "model", parts: [{ functionCall: { name, args } }] } }] };
}

function scriptGemini(...replies: unknown[]) {
  const queue = [...replies];
  const fetchMock = vi.fn(async () => {
    const next = queue.shift();
    if (next instanceof Response) return next;
    return new Response(JSON.stringify(next), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetEngines();
});

describe("Aetheria Guide agent", () => {
  it("searches, opens the chapter, and answers with the stored quotation", async () => {
    const navigate = vi.fn();
    scriptGemini(
      call("search_consent", { query: "clinic visits" }),
      call("open_section", { section_id: "procedures" }),
      call("final_answer", { answer: "You visit the clinic 6 times over about 16 weeks.", supported: true, passage_ids: [procedures.id] }),
    );
    const reply = await runAgent("How many visits are there?", env({ navigate, model: "gemini-test" }));
    expect(reply.engine).toBe("gemini");
    expect(reply.quotes[0].text).toBe(procedures.text);
    expect(navigate).toHaveBeenCalledWith("/participant/explore-consent/procedures");
    expect(reply.steps.map((step) => step.tool)).toEqual(["search_consent", "open_section"]);
  });

  it("rejects a citation Gemini was never given and falls back to local rules", async () => {
    scriptGemini(
      new Response(JSON.stringify(call("final_answer", { answer: "You visit 6 times.", supported: true, passage_ids: [procedures.id] })), { status: 200 }),
      new Response("{}", { status: 503 }), // Ollama probe inside the local fallback
    );
    const reply = await runAgent("How many visits are there?", env());
    expect(reply.engine).toBe("local");
    expect(reply.note).toMatch(/outside the form/);
  });

  it("falls back when no key is configured", async () => {
    scriptGemini(new Response("{}", { status: 503 }), new Response("{}", { status: 503 }));
    const reply = await runAgent("Can I leave the study?", env());
    expect(reply.engine).toBe("local");
    expect(reply.note).toMatch(/not set up/);
    expect(reply.supported).toBe(true);
  });

  it("refuses a dose question without calling Gemini", async () => {
    const fetchMock = scriptGemini();
    const reply = await runAgent("What dose will I get?", env());
    expect(reply.engine).toBe("rules");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only saves for the coordinator through the tool", async () => {
    const saveQuestion = vi.fn();
    scriptGemini(
      call("save_for_coordinator", { question: "Can my cousin join too?" }),
      call("final_answer", { answer: "The form does not say. I saved your question for the coordinator.", supported: false, passage_ids: [] }),
    );
    const reply = await runAgent("Can my cousin join too? Please save it.", env({ saveQuestion }));
    expect(saveQuestion).toHaveBeenCalledOnce();
    expect(reply.supported).toBe(false);
    expect(reply.engine).toBe("gemini");
  });
});
