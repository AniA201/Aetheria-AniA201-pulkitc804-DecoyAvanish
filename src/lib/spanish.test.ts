import { describe, expect, it } from "vitest";
import { sections, teachPrompts } from "../data/study";
import { sectionsEs, teachPromptsEs } from "../data/studyEs";
import { acceptTranslation, asksForAdvice, keepsNumbers, spanishTopic } from "./spanish";
import { assessTeachback } from "./teachback";

describe("Spanish check", () => {
  it("has a Spanish answer key for every practice question, with the same concept ids", () => {
    for (const prompt of teachPrompts) {
      const es = teachPromptsEs.find((item) => item.id === prompt.id);
      expect(es, prompt.id).toBeTruthy();
      expect(es!.concepts.map((concept) => concept.id)).toEqual(prompt.concepts.map((concept) => concept.id));
    }
  });

  it("keeps the practice form's figures in the Spanish readings", () => {
    for (const section of sections) {
      const es = sectionsEs[section.id];
      const figures = section.plain.match(/\$?\d+/g) ?? [];
      for (const figure of figures) expect(es.plain, `${section.id} ${figure}`).toContain(figure);
    }
  });

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
    expect(wrong.misconception).toBe(teachPrompts.find((item) => item.id === "withdrawal")!.misconceptions!.find((item) => item.id === "lose-care")!.label);
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

  it("keeps English checks unchanged on the Spanish screen when the reply is English and there is no Spanish key", () => {
    const upload = [{ ...teachPrompts[0], id: "section-1", concepts: [{ id: "x", label: "Point", phrases: ["visit"] }] }];
    expect(assessTeachback("section-1", "I visit the clinic.", upload, "participant", "es").language).toBe("en");
  });
});

describe("Spanish questions", () => {
  it("matches a Spanish question to its practice section", () => {
    expect(spanishTopic("¿Cuántas visitas tengo que hacer?")).toBe("procedures");
    expect(spanishTopic("¿Me pagan por venir?")).toBe("costs");
    expect(spanishTopic("¿Puedo salirme del estudio?")).toBe("rights");
    expect(spanishTopic("¿Quién ve mis datos?")).toBe("privacy");
    expect(spanishTopic("¿Tiene efectos secundarios?")).toBe("risks");
    expect(spanishTopic("¿Cuánto tiempo voy a estar en el estudio?")).toBe("procedures");
    expect(spanishTopic("¿Cuánto me pagan por cada visita?")).toBe("costs");
    expect(spanishTopic("¿Puedo dejar de ir a las visitas?")).toBe("rights");
  });

  it("refuses dose, treatment, approval, and cure questions but not ordinary ones", () => {
    for (const question of ["¿Cuál es el mejor tratamiento para mi migraña?", "¿Qué dosis debo tomar?", "¿Está aprobado por la FDA?", "¿Me va a curar?", "¿Debería participar?"]) {
      expect(asksForAdvice(question), question).toBe(true);
    }
    for (const question of ["¿Debo pagar por las visitas?", "¿Cuántas visitas hay?", "¿Puedo salirme cuando quiera?"]) {
      expect(asksForAdvice(question), question).toBe(false);
    }
  });

  it("rejects a translation that explains instead of translating", () => {
    const heading = "Why is this study being done?";
    expect(acceptTranslation(heading, "¿Por qué se hace este estudio?")).toBe("¿Por qué se hace este estudio?");
    expect(
      acceptTranslation(heading, "Este estudio se está realizando para investigar la efectividad de un nuevo tratamiento para tratar la enfermedad de Crohn."),
    ).toBeNull();
    expect(acceptTranslation("You get $50.", "Recibe $50 y $20 extra.")).toBeNull();
  });

  it("rejects a translation that drops or changes a number", () => {
    expect(keepsNumbers("You receive $50 after each of 6 visits.", "Recibe $50 después de cada una de las 6 visitas.")).toBe(true);
    expect(keepsNumbers("You receive $50 after each of 6 visits.", "Recibe $80 después de cada visita.")).toBe(false);
  });
});
