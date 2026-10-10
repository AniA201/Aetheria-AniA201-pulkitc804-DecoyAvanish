import type { Passage } from "../data/documents";
import { listPassages } from "../data/documents";
import { answerQuestion, type Answer, type AnswerScope } from "./answers";
import { completeGrounded, ollamaModel, validateModelDraft } from "./ollama";
import { retrievePassages } from "./retrieve";

export type GroundScope = AnswerScope & { passages?: Passage[] };

const notFound =
  "The selected consent form does not answer that. Aetheria will not fill the gap with a guess. Save the question for the research coordinator.";

export async function answerQuestionGrounded(input: string, scope?: GroundScope): Promise<Answer> {
  const local = answerQuestion(input, scope);
  if (!local.supported && local.answer.includes("will not guess")) return local;

  const retrieved = retrievePassages(input, scope?.passages ? { limit: 4, within: scope.passages } : { limit: 4 });
  const cited = local.passageId ? listPassages().find((passage) => passage.id === local.passageId) : undefined;
  const context = unique([cited, ...retrieved.map((item) => item.passage)].filter((passage) => passage != null)).slice(0, 4);
  const top = retrieved[0];
  const extractive =
    !local.supported && top && top.score >= 0.34
      ? ({
          ...local,
          supported: true,
          answer: `The closest passage in ${top.passage.documentId} ${top.passage.version} says: “${top.passage.text}”`,
          sectionId: top.passage.sectionId,
          citation: top.passage.citation,
          quote: top.passage.text,
          page: top.passage.page,
          documentId: top.passage.documentId,
          version: top.passage.version,
          passageId: top.passage.id,
          engine: "local-rules",
        } satisfies Answer)
      : local;

  if (!extractive.supported && (!top || top.score < 0.34)) return local;
  if (context.length === 0) return extractive;

  const raw = await completeGrounded(input, context);
  if (!raw) return extractive;
  const draft = validateModelDraft(
    raw,
    context.map((passage) => ({ id: passage.id, text: passage.text })),
  );
  if (!draft || draft.answer.length < 40) return extractive.supported ? extractive : local;
  if (!draft.supported) {
    if (local.supported) return local;
    return {
      ...local,
      supported: false,
      answer: notFound,
      citation: undefined,
      quote: undefined,
      page: undefined,
      sectionId: undefined,
      passageId: undefined,
      engine: "ollama",
      model: ollamaModel,
    };
  }

  const passage = context.find((item) => item.id === draft.passageIds[0]);
  if (!passage) return extractive;
  return {
    supported: true,
    answer: draft.answer,
    sectionId: passage.sectionId,
    citation: passage.citation,
    quote: passage.text,
    page: passage.page,
    documentId: passage.documentId,
    version: passage.version,
    passageId: passage.id,
    engine: "ollama",
    model: ollamaModel,
  };
}

function unique<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

