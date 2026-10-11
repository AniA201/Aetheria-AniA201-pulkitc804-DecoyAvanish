// The practice form in each non-English screen language: short readings, answer keys, and the words
// used to route a question when no model can translate it. Same figures and concept ids as English.
import type { OtherLanguage } from "../lib/languages";
import type { SectionId, TeachPrompt } from "./study";
import { adviceWordsEs, sectionsEs, studyNameEs, teachPromptsEs, topicWordsEs, type PracticeSection } from "./studyEs";
import { adviceWordsFr, sectionsFr, studyNameFr, teachPromptsFr, topicWordsFr } from "./studyFr";
import { adviceWordsZh, sectionsZh, studyNameZh, teachPromptsZh, topicWordsZh } from "./studyZh";

export type PracticeLanguage = {
  studyName: string;
  sections: Record<SectionId, PracticeSection>;
  prompts: TeachPrompt[];
  topicWords: Record<SectionId, RegExp>;
  adviceWords: RegExp;
};

export const practice: Record<OtherLanguage, PracticeLanguage> = {
  es: { studyName: studyNameEs, sections: sectionsEs, prompts: teachPromptsEs, topicWords: topicWordsEs, adviceWords: adviceWordsEs },
  fr: { studyName: studyNameFr, sections: sectionsFr, prompts: teachPromptsFr, topicWords: topicWordsFr, adviceWords: adviceWordsFr },
  zh: { studyName: studyNameZh, sections: sectionsZh, prompts: teachPromptsZh, topicWords: topicWordsZh, adviceWords: adviceWordsZh },
};

/** The answer key for one practice question in `language`, when one exists. */
export const practicePrompt = (language: OtherLanguage, promptId: string): TeachPrompt | null =>
  practice[language].prompts.find((item) => item.id === promptId) ?? null;
