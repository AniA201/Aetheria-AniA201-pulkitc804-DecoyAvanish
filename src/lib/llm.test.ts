import { afterEach, describe, expect, it, vi } from "vitest";
import { teachPrompts } from "../data/study";
import { runAgent } from "./agent";
import { assessTeachbackWithGemini } from "./coach";
import { loadDemoConsent } from "./consent";
import { geminiAvailable, noteGeminiFailure, resetEngines } from "./llm";

const consent = loadDemoConsent();
const assignment = teachPrompts.find((prompt) => prompt.id === "randomization")!;

type Route = (url: string) => Response;

function routes(handler: Route) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => handler(String(input)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const geminiCalls = (fetchMock: ReturnType<typeof routes>) =>
  fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/gemini/")).length;

afterEach(() => {
  vi.unstubAllGlobals();
  resetEngines();
});

describe("engine fallback: Gemini → local RAG → rules", () => {
  it("retries after a missing key so a restarted dev server can recover", () => {
    noteGeminiFailure("no-key", 1000);
    expect(geminiAvailable(15_999)).toBe(false);
    expect(geminiAvailable(16_000)).toBe(true);
  });
  it("pauses Gemini after its free limit and goes straight to the local model", async () => {
    const ollamaJudge = { covered: assignment.concepts.map((concept) => concept.id), misunderstanding: null, feedback: "You named chance and blinding." };
    const fetchMock = routes((url) =>
      url.startsWith("/gemini/")
        ? new Response("{}", { status: 429 })
        : new Response(JSON.stringify({ message: { content: JSON.stringify(ollamaJudge) } }), { status: 200 }),
    );
    const first = await assessTeachbackWithGemini(assignment, "It is random and nobody is told which one.", consent);
    expect(first.engine).toBe("ollama");
    expect(geminiAvailable()).toBe(false);
    const second = await assessTeachbackWithGemini(assignment, "It is random and nobody is told which one.", consent);
    expect(second.engine).toBe("ollama");
    expect(geminiCalls(fetchMock)).toBe(1);
  });

  it("uses the rules when Gemini and the local model are both unavailable", async () => {
    routes(() => new Response("{}", { status: 503 }));
    const result = await assessTeachbackWithGemini(assignment, "It is random and I will not know which one.", consent);
    expect(result.engine).toBe("local");
    expect(result.note).toMatch(/not set up/);
  });

  it("answers Ask from local retrieval when Gemini is rate-limited", async () => {
    routes((url) => new Response("{}", { status: url.startsWith("/gemini/") ? 429 : 503 }));
    const reply = await runAgent("Can I leave the study later?", {
      role: "participant",
      consent,
      reviews: {},
      navigate: () => undefined,
      saveQuestion: () => undefined,
    });
    expect(reply.engine).toBe("local");
    expect(reply.supported).toBe(true);
    expect(reply.quotes[0]?.sectionId).toBe("rights");
    expect(reply.note).toMatch(/free limit/);
  });
});
