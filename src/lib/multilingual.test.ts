import { describe, expect, it } from "vitest";
import { personaFixtures, sections, teachPrompts } from "../data/study";
import { practice } from "../data/practiceLanguages";
import { acceptTranslation, asksForAdvice, keepsNumbers, plausibleLength, topicOf } from "./multilingual";
import { otherLanguages } from "./languages";
import { assessTeachback, detectLanguage } from "./teachback";

const misconceptionLabel = (promptId: string, id: string) =>
  teachPrompts.find((item) => item.id === promptId)!.misconceptions!.find((item) => item.id === id)!.label;

describe("practice readings and answer keys in every language", () => {
  it.each(otherLanguages)("%s has an answer key for every practice question, with the same concept ids", (language) => {
    for (const prompt of teachPrompts) {
      const local = practice[language].prompts.find((item) => item.id === prompt.id);
      expect(local, `${language} ${prompt.id}`).toBeTruthy();
      expect(local!.concepts.map((concept) => concept.id)).toEqual(prompt.concepts.map((concept) => concept.id));
      expect(local!.misconceptions?.map((item) => item.id)).toEqual(prompt.misconceptions?.map((item) => item.id));
    }
  });

  it.each(otherLanguages)("%s keeps the practice form's figures in the readings", (language) => {
    for (const section of sections) {
      const local = practice[language].sections[section.id];
      for (const figure of section.plain.match(/\d+/g) ?? []) expect(local.plain, `${language} ${section.id} ${figure}`).toContain(figure);
      expect(local.plain.match(/\d+/g)?.sort(), `${language} ${section.id} adds no numbers`).toEqual(section.plain.match(/\d+/g)?.sort());
    }
  });

  it("gets the expected result for every persona, including the Spanish, French, and Mandarin speakers", () => {
    for (const persona of personaFixtures) {
      expect(assessTeachback(persona.promptId, persona.response, teachPrompts, persona.speaker).label, persona.persona).toBe(persona.expect);
    }
  });
});

describe("language detection", () => {
  it("tells English, Spanish, French, and Mandarin apart", () => {
    expect(detectLanguage("I can leave at any time and my doctor still treats me.")).toBeNull();
    expect(detectLanguage("Puedo salir del estudio en cualquier momento y mi médico sigue atendiéndome.")).toBe("es");
    expect(detectLanguage("Je peux partir à tout moment et mon médecin continue à me soigner.")).toBe("fr");
    expect(detectLanguage("我可以随时退出研究。")).toBe("zh");
    expect(detectLanguage("Ella no paga el medicamento y le dan 50 dólares por cada visita.")).toBe("es");
  });
});

describe("Spanish check", () => {
  it("assesses a full Spanish reply as understood, with English labels for the research team", () => {
    const result = assessTeachback(
      "withdrawal",
      "Puedo salir en cualquier momento, mi médico me sigue atendiendo y pueden guardar la información de seguridad ya registrada.",
    );
    expect(result.label).toBe("Understands the key concept");
    expect(result.language).toBe("es");
    expect(result.matched).toContain("You may leave at any time");
    expect(result.shownMatched).toContain("Puede salir en cualquier momento");
  });

  it("finds a Spanish misunderstanding and explains in Spanish", () => {
    const result = assessTeachback("randomization", "Seguro me dan el medicamento nuevo porque el médico elige.");
    expect(result.label).toBe("Needs clarification");
    expect(result.feedback).toMatch(/El formulario dice otra cosa/);
  });

  it("does not treat a negated Spanish misunderstanding as one", () => {
    const result = assessTeachback("risk", "Puede causar náuseas y no garantiza que me ayude.", teachPrompts, "participant", "es");
    expect(result.label).toBe("Understands the key concept");
  });

  it("catches the lose-care misunderstanding in everyday Spanish, but not its negation", () => {
    const wrong = assessTeachback("withdrawal", "Si me salgo del estudio pierdo la atención de mi médico.", teachPrompts, "participant", "es");
    expect(wrong.label).toBe("Needs clarification");
    expect(wrong.misconception).toBe(misconceptionLabel("withdrawal", "lose-care"));
    expect(wrong.matched).not.toContain("Regular care from your own doctor continues");
    const mixed = assessTeachback("withdrawal", "Puedo salir en cualquier momento. Pero pierdo la atención de mi médico.", teachPrompts, "participant", "es");
    expect(mixed.matched).toEqual(["You may leave at any time"]);
    const right = assessTeachback("withdrawal", "Puedo salir en cualquier momento y no pierdo la atención de mi médico.", teachPrompts, "participant", "es");
    expect(right.misconception).toBeUndefined();
    const promise = assessTeachback("risk", "Puede causar náuseas. El formulario no promete que me va a curar.", teachPrompts, "participant", "es");
    expect(promise.misconception).toBeUndefined();
  });

  it("reads a Spanish caregiver reply as the participant's", () => {
    const result = assessTeachback("withdrawal", "Ella puede salir en cualquier momento y su médico la sigue atendiendo.", teachPrompts, "caregiver", "es");
    expect(result.matched).toContain("You may leave at any time");
    expect(result.matched).toContain("Regular care from your own doctor continues");
  });

  it("tells an off-topic reply apart from a short yes", () => {
    expect(assessTeachback("randomization", "Puedo salir cuando quiera del estudio.", teachPrompts, "participant", "es").feedback).toMatch(/todavía no menciona/);
    expect(assessTeachback("randomization", "我可以随时退出。", teachPrompts, "participant", "zh").feedback).toMatch(/还没有说到/);
    expect(assessTeachback("randomization", "I can leave whenever I want.").feedback).toMatch(/does not yet mention/);
  });

  it("treats a short Spanish yes as not enough", () => {
    expect(assessTeachback("costs", "Sí.", teachPrompts, "participant", "es").label).toBe("Needs clarification");
    expect(assessTeachback("costs", "No sé", teachPrompts, "participant", "es").label).toBe("Requires human follow-up");
  });

  it("routes a Spanish reply about an uploaded form to a person", () => {
    const upload = [{ ...teachPrompts[0], id: "section-1", concepts: [{ id: "x", label: "Point", phrases: ["visit"] }] }];
    const result = assessTeachback("section-1", "Tengo que ir a la clínica y no sé cuántas veces.", upload);
    expect(result.label).toBe("Requires human follow-up");
    expect(result.language).toBe("es");
  });

  it("keeps English checks unchanged on a translated screen when the reply is English and there is no key", () => {
    const upload = [{ ...teachPrompts[0], id: "section-1", concepts: [{ id: "x", label: "Point", phrases: ["visit"] }] }];
    for (const language of otherLanguages) {
      expect(assessTeachback("section-1", "I visit the clinic.", upload, "participant", language).language).toBe("en");
    }
  });
});

describe("French check", () => {
  it("assesses a full French reply as understood, with English labels for the research team", () => {
    const result = assessTeachback(
      "withdrawal",
      "Je peux partir à tout moment, mon médecin continue à me soigner et l'équipe peut garder les informations de sécurité déjà recueillies.",
    );
    expect(result.label).toBe("Understands the key concept");
    expect(result.language).toBe("fr");
    expect(result.matched).toContain("You may leave at any time");
    expect(result.shownMatched).toContain("Vous pouvez partir à tout moment");
  });

  it("catches the lose-care misunderstanding in French, but not its negation", () => {
    const wrong = assessTeachback("withdrawal", "Si je quitte l'étude, je perds mon médecin.", teachPrompts, "participant", "fr");
    expect(wrong.label).toBe("Needs clarification");
    expect(wrong.misconception).toBe(misconceptionLabel("withdrawal", "lose-care"));
    expect(wrong.feedback).toMatch(/Le formulaire dit autre chose/);
    expect(wrong.matched).not.toContain("Regular care from your own doctor continues");
    const right = assessTeachback("withdrawal", "Je peux partir à tout moment et je ne vais pas perdre mon médecin.", teachPrompts, "participant", "fr");
    expect(right.misconception).toBeUndefined();
    expect(right.label).toBe("Partially understands");
  });

  it("does not treat “does not promise that it will cure me” as a promise", () => {
    const result = assessTeachback("risk", "Ça peut donner des nausées. Le formulaire ne promet pas que ça va me guérir.", teachPrompts, "participant", "fr");
    expect(result.misconception).toBeUndefined();
    expect(result.label).toBe("Understands the key concept");
  });

  it("reads a French caregiver reply as the participant's", () => {
    const result = assessTeachback("withdrawal", "Elle peut partir à tout moment et son médecin continue à la soigner.", teachPrompts, "caregiver", "fr");
    expect(result.matched).toContain("You may leave at any time");
    expect(result.matched).toContain("Regular care from your own doctor continues");
  });

  it("treats a short French yes as not enough and “I don't know” as a person's job", () => {
    expect(assessTeachback("costs", "Oui.", teachPrompts, "participant", "fr").label).toBe("Needs clarification");
    expect(assessTeachback("costs", "D'accord", teachPrompts, "participant", "fr").label).toBe("Needs clarification");
    expect(assessTeachback("costs", "Je ne sais pas", teachPrompts, "participant", "fr").label).toBe("Requires human follow-up");
  });
});

describe("Mandarin check", () => {
  it("assesses a full Mandarin reply as understood, with English labels for the research team", () => {
    const result = assessTeachback("withdrawal", "我可以随时退出，我的医生会继续给我看病，研究团队可以保留已经收集的安全信息。");
    expect(result.label).toBe("Understands the key concept");
    expect(result.language).toBe("zh");
    expect(result.matched).toContain("You may leave at any time");
    expect(result.shownMatched).toContain("您可以随时退出");
  });

  it("catches the lose-care misunderstanding in Mandarin, but not its negation", () => {
    const wrong = assessTeachback("withdrawal", "退出后会失去我的医生。");
    expect(wrong.label).toBe("Needs clarification");
    expect(wrong.misconception).toBe(misconceptionLabel("withdrawal", "lose-care"));
    expect(wrong.feedback).toMatch(/表格说的不是这样/);
    expect(wrong.matched).not.toContain("Regular care from your own doctor continues");
    const mixed = assessTeachback("withdrawal", "我可以随时退出，但是退出后会失去我的医生。");
    expect(mixed.misconception).toBe(misconceptionLabel("withdrawal", "lose-care"));
    expect(mixed.matched).toEqual(["You may leave at any time"]);
    const right = assessTeachback("withdrawal", "我可以随时退出，退出后不会失去我的医生。");
    expect(right.misconception).toBeUndefined();
    expect(right.label).toBe("Partially understands");
  });

  it("does not treat “the form does not promise it will cure me” as a promise", () => {
    const result = assessTeachback("risk", "可能会恶心，表格没有承诺会治好我的偏头痛。");
    expect(result.misconception).toBeUndefined();
    expect(result.label).toBe("Understands the key concept");
  });

  it("ignores spaces a voice transcript may add between characters", () => {
    expect(assessTeachback("withdrawal", "我 可以 随时 退出 ， 我的 医生 会 继续 给 我 看病").matched).toEqual([
      "You may leave at any time",
      "Regular care from your own doctor continues",
    ]);
  });

  it("reads a Mandarin caregiver reply as the participant's", () => {
    const result = assessTeachback("withdrawal", "她可以随时退出，她的医生会继续给她看病。", teachPrompts, "caregiver");
    expect(result.matched).toContain("You may leave at any time");
    expect(result.matched).toContain("Regular care from your own doctor continues");
  });

  it("treats a short Mandarin yes as not enough and “I don't know” as a person's job", () => {
    expect(assessTeachback("costs", "好的。", teachPrompts, "participant", "zh").label).toBe("Needs clarification");
    expect(assessTeachback("costs", "明白了", teachPrompts, "participant", "zh").label).toBe("Needs clarification");
    expect(assessTeachback("costs", "我不知道", teachPrompts, "participant", "zh").label).toBe("Requires human follow-up");
  });

  it("routes a Mandarin reply about an uploaded form to a person", () => {
    const upload = [{ ...teachPrompts[0], id: "section-1", concepts: [{ id: "x", label: "Point", phrases: ["visit"] }] }];
    const result = assessTeachback("section-1", "我要去诊所几次，我不太清楚。", upload);
    expect(result.label).toBe("Requires human follow-up");
    expect(result.language).toBe("zh");
    expect(result.feedback).toMatch(/口译员|工作人员/);
  });
});

describe("questions in Spanish, French, and Mandarin", () => {
  it("matches a question to its practice section", () => {
    expect(topicOf("¿Cuántas visitas tengo que hacer?", "es")).toBe("procedures");
    expect(topicOf("¿Cuánto me pagan por cada visita?", "es")).toBe("costs");
    expect(topicOf("¿Puedo dejar de ir a las visitas?", "es")).toBe("rights");
    expect(topicOf("¿Quién ve mis datos?", "es")).toBe("privacy");
    expect(topicOf("¿Tiene efectos secundarios?", "es")).toBe("risks");

    expect(topicOf("Combien de visites y a-t-il ?", "fr")).toBe("procedures");
    expect(topicOf("Vais-je être payé pour chaque visite ?", "fr")).toBe("costs");
    expect(topicOf("Est-ce que je peux quitter l'étude ?", "fr")).toBe("rights");
    expect(topicOf("Qui peut voir mes données ?", "fr")).toBe("privacy");
    expect(topicOf("Y a-t-il des effets secondaires ?", "fr")).toBe("risks");

    expect(topicOf("我要去几次？", "zh")).toBe("procedures");
    expect(topicOf("每次就诊给多少钱？", "zh")).toBe("costs");
    expect(topicOf("我可以退出吗？", "zh")).toBe("rights");
    expect(topicOf("谁能看到我的数据？", "zh")).toBe("privacy");
    expect(topicOf("有什么副作用？", "zh")).toBe("risks");
  });

  it("refuses dose, treatment, approval, and cure questions but not ordinary ones", () => {
    const advice = {
      es: ["¿Cuál es el mejor tratamiento para mi migraña?", "¿Qué dosis debo tomar?", "¿Está aprobado por la FDA?", "¿Me va a curar?", "¿Debería participar?"],
      fr: ["Quelle dose dois-je prendre ?", "Est-ce approuvé par la FDA ?", "Est-ce que ça va me guérir ?", "Devrais-je participer ?", "Quel traitement est le meilleur pour moi ?"],
      zh: ["我应该吃多少剂量？", "这个药被FDA批准了吗？", "能治好我的偏头痛吗？", "我应该参加吗？"],
    };
    const ordinary = {
      es: ["¿Debo pagar por las visitas?", "¿Cuántas visitas hay?", "¿Puedo salirme cuando quiera?"],
      fr: ["Dois-je payer les visites ?", "Combien de visites y a-t-il ?", "Est-ce que je peux partir quand je veux ?"],
      zh: ["我需要付钱吗？", "有几次就诊？", "我可以随时退出吗？"],
    };
    for (const language of otherLanguages) {
      for (const question of advice[language]) expect(asksForAdvice(question, language), question).toBe(true);
      for (const question of ordinary[language]) expect(asksForAdvice(question, language), question).toBe(false);
    }
  });
});

describe("machine translation guard", () => {
  it("rejects a translation that explains instead of translating", () => {
    const heading = "Why is this study being done?";
    expect(acceptTranslation(heading, "¿Por qué se hace este estudio?")).toBe("¿Por qué se hace este estudio?");
    expect(
      acceptTranslation(heading, "Este estudio se está realizando para investigar la efectividad de un nuevo tratamiento para tratar la enfermedad de Crohn."),
    ).toBeNull();
    expect(acceptTranslation("You get $50.", "Recibe $50 y $20 extra.")).toBeNull();
    expect(acceptTranslation(heading, "Pourquoi cette étude est-elle faite ?", "en", "fr")).toBe("Pourquoi cette étude est-elle faite ?");
    expect(acceptTranslation(heading, "为什么要做这项研究？", "en", "zh")).toBe("为什么要做这项研究？");
    expect(acceptTranslation(heading, "这项研究是为了调查一种治疗克罗恩病的新疗法的有效性，研究人员会比较两组患者的结果并评估长期安全性。", "en", "zh")).toBeNull();
  });

  it("rejects output in the wrong language", () => {
    expect(acceptTranslation("Why is this study being done?", "Why is this study done?", "en", "zh")).toBeNull();
    expect(acceptTranslation("¿Me pagan por cada visita?", "¿Me pagan por cada una de las visitas?", "es", "en")).toBeNull();
    expect(acceptTranslation("Est-ce que je peux quitter l'étude ?", "Can I leave the study?", "fr", "en")).toBe("Can I leave the study?");
    expect(acceptTranslation("我可以退出吗？", "Can I leave?", "zh", "en")).toBe("Can I leave?");
  });

  it("expects Chinese to be much shorter than English and French a bit longer", () => {
    const source = "You will receive $50 after each completed clinic visit.";
    expect(plausibleLength(source, "每完成一次诊所就诊，您会得到 50 美元。", "en", "zh")).toBe(true);
    expect(plausibleLength(source, "Vous recevrez 50 $ après chaque visite terminée à la clinique.", "en", "fr")).toBe(true);
    expect(plausibleLength("每完成一次就诊，您会得到 50 美元。", "You will receive $50 after each completed visit.", "zh", "en")).toBe(true);
  });

  it("rejects a translation that drops or changes a number", () => {
    expect(keepsNumbers("You receive $50 after each of 6 visits.", "Recibe $50 después de cada una de las 6 visitas.")).toBe(true);
    expect(keepsNumbers("You receive $50 after each of 6 visits.", "Recibe $80 después de cada visita.")).toBe(false);
    expect(keepsNumbers("About 16 weeks.", "大约 16 周。")).toBe(true);
    expect(keepsNumbers("About 16 weeks.", "大约十六周。")).toBe(false);
  });
});
