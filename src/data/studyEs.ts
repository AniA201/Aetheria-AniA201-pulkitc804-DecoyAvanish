// Spanish readings and Spanish answer keys for the five practice sections.
// Written for this practice app from the English readings, with the same figures. Not reviewed by a
// qualified translator; the English form stays the official consent.
import type { SectionId, TeachPrompt } from "./study";

export type PracticeSection = { title: string; short: string; plain: string; terms: { word: string; meaning: string }[]; ask: string };

export const studyNameEs = "Prevención de la migraña episódica";

export const sectionsEs: Record<SectionId, PracticeSection> = {
  procedures: {
    title: "Procedimientos del estudio y tiempo",
    short: "Visitas, tiempo y cómo se asigna el grupo",
    plain:
      "La clínica le pide venir 6 veces en unas 16 semanas. Cada visita dura unas 2 horas. En algunas visitas le sacan un poco de sangre, unas 2 cucharaditas. Un proceso al azar decide si recibe Aetherol o placebo. Ni usted ni el médico del estudio saben cuál recibe mientras dura el estudio.",
    terms: [
      { word: "Placebo", meaning: "Un producto sin el medicamento del estudio. Se usa para poder comparar los grupos." },
      { word: "Asignado al azar", meaning: "Un proceso, no una elección suya ni del médico, decide a qué grupo entra." },
    ],
    ask: "¿Cuántas visitas tiene el estudio y cuánto dura cada una?",
  },
  risks: {
    title: "Riesgos y posibles beneficios",
    short: "Lo que el formulario dice que podría pasar",
    plain:
      "Aetherol puede causar náuseas, mareos o cansancio. El formulario dice que en estudios anteriores alrededor de 1 de cada 10 personas tuvo náuseas. Las reacciones alérgicas se describen como raras. Sacar sangre puede dejar un moretón. El formulario no promete que el estudio ayude con sus migrañas.",
    terms: [
      { word: "Fatiga", meaning: "Cansancio mayor que el cansancio normal del final del día." },
      { word: "Sin promesa de beneficio", meaning: "El estudio es investigación. No garantiza que usted se sienta mejor." },
    ],
    ask: "¿Qué riesgos describe el formulario y promete algún beneficio?",
  },
  rights: {
    title: "Sus derechos y cómo dejar el estudio",
    short: "Puede salir",
    plain:
      "Puede decir que no, y puede salir más adelante. Salir no le quita la atención regular de su propio médico. El equipo puede guardar la información de seguridad ya recogida. Deben avisarle si hay información nueva que pueda cambiar su decisión de seguir.",
    terms: [{ word: "Voluntario", meaning: "Es su decisión. No tiene que entrar y no tiene que quedarse." }],
    ask: "¿Qué pasa si decido salir del estudio?",
  },
  costs: {
    title: "Costos y pago",
    short: "Lo que paga y lo que recibe",
    plain:
      "Usted no paga el medicamento del estudio ni las visitas que el estudio exige. Recibe $50 después de cada visita a la clínica que complete. Ese pago no cubre su atención habitual de la migraña ni gastos extra de viaje.",
    terms: [{ word: "Compensación", meaning: "El pago que el formulario dice que recibe por cada visita completada." }],
    ask: "¿Me van a pagar y tengo que pagar por las visitas?",
  },
  privacy: {
    title: "Privacidad y uso de sus datos",
    short: "Quién puede ver los registros codificados",
    plain:
      "En los registros del estudio su nombre se cambia por un código. El patrocinador y los monitores pueden ver los registros codificados para revisar que el estudio se hizo como estaba escrito. Los registros se pueden guardar 15 años. Los resultados publicados y la lista pública del estudio no incluyen su nombre.",
    terms: [
      { word: "Registros codificados", meaning: "Registros marcados con un código del estudio en lugar de su nombre." },
      { word: "Monitor", meaning: "Una persona que revisa los registros para comprobar cómo se hizo el estudio." },
    ],
    ask: "¿Quién puede ver mis registros y se publicará mi nombre?",
  },
};

/** Spanish answer keys. Ids match the English prompts so results line up in the handoff. Phrases are matched without accents. */
export const teachPromptsEs: TeachPrompt[] = [
  {
    id: "randomization",
    sectionId: "procedures",
    topic: "Asignación",
    question: "Con sus propias palabras, ¿cómo se decide si recibe Aetherol o placebo, y quién sabe cuál recibe?",
    concepts: [
      { id: "chance", label: "La asignación es al azar", phrases: ["azar", "aleatori", "sorteo", "no lo elijo", "no es mi decision", "no elijo"] },
      { id: "blind-you", label: "A usted no le dicen cuál recibe", phrases: ["no sabre", "no voy a saber", "no me dicen", "no me lo dicen", "no se cual", "ni yo"] },
      { id: "blind-doctor", label: "Al médico del estudio tampoco se lo dicen", phrases: ["medico no sabe", "doctor no sabe", "medico tampoco", "doctor tampoco", "ni el medico", "ni el doctor"] },
    ],
    reexplain: "Un proceso al azar elige Aetherol o placebo. Durante el estudio no le dicen cuál es, y al médico del estudio tampoco.",
    misconceptions: [
      { id: "will-get-drug", label: "que seguro recibirá Aetherol", phrases: ["seguro me dan el medicamento", "definitivamente recibire", "me van a dar el medicamento nuevo", "seguro recibo", "voy a recibir el medicamento nuevo", "me van a dar aetherol", "voy a recibir aetherol", "recibire aetherol", "todos reciben aetherol", "todos recibimos aetherol"] },
      { id: "chooser", label: "que alguien elige su grupo", phrases: ["yo elijo", "puedo elegir", "yo escojo", "puedo escoger", "el medico elige", "el doctor elige", "el medico escoge", "el doctor escoge", "el medico decide", "el doctor decide"] },
    ],
  },
  {
    id: "withdrawal",
    sectionId: "rights",
    topic: "Dejar el estudio",
    question: "¿Qué pasa si decide dejar el estudio?",
    concepts: [
      { id: "anytime", label: "Puede salir en cualquier momento", phrases: ["cualquier momento", "puedo salir", "puedo dejar", "retirarme", "dejar el estudio", "salirme", "puedo irme"] },
      { id: "care", label: "Sigue la atención regular de su propio médico", phrases: ["mi medico", "mi doctor", "atencion regular", "atencion medica", "me sigue atendiendo", "sigue atendiendome"] },
      { id: "safety", label: "Pueden guardar la información de seguridad ya recogida", phrases: ["seguridad", "ya recogida", "ya recolectada", "ya registrada", "ya tienen"] },
    ],
    reexplain: "Puede salir en cualquier momento. Salir no cambia la atención regular de su propio médico. El equipo puede guardar la información de seguridad ya registrada.",
    misconceptions: [
      { id: "cannot-leave", label: "que no puede salir una vez que empieza", phrases: ["no puedo salir", "no puedo dejar", "tengo que quedarme", "tengo que terminar", "no puedo retirarme", "no me puedo salir", "no me puedo ir", "no puedo irme", "no se puede salir", "no puedo abandonar", "estoy obligad", "me obligan a quedarme"] },
      {
        id: "lose-care",
        label: "que salir le quita su atención regular",
        phrases: [
          "pierdo mi atencion",
          "pierdo la atencion",
          "pierdo el cuidado",
          "pierdo mi cuidado",
          "pierdo a mi medico",
          "pierdo a mi doctor",
          "pierdo mi medico",
          "pierdo mi doctor",
          "perder la atencion",
          "perder mi atencion",
          "perder a mi medico",
          "perderia la atencion",
          "perderia a mi medico",
          "me quedo sin atencion",
          "me quedo sin medico",
          "me quedo sin doctor",
          "ya no me atienden",
          "ya no me atiende",
          "me dejan de atender",
          "me deja de atender",
          "me quitan la atencion",
          "me quitan mi atencion",
          "me quitan el medico",
        ],
      },
    ],
  },
  {
    id: "risk",
    sectionId: "risks",
    topic: "Riesgos",
    question: "¿Qué debe saber sobre los riesgos y sobre si el estudio le ayudará?",
    concepts: [
      { id: "effects", label: "Se nombran náuseas, mareos o cansancio", phrases: ["nausea", "mareo", "mareado", "cansancio", "fatiga", "cansado"] },
      { id: "benefit", label: "El formulario no promete un beneficio", phrases: ["no promete", "puede que no ayude", "podria no ayudar", "no es una promesa", "no hay promesa", "no garantiza", "puede no ayudar"] },
    ],
    reexplain: "El formulario dice que Aetherol puede causar náuseas, mareos o cansancio. También dice que el estudio puede no ayudar con sus migrañas. No hay promesa de beneficio.",
    misconceptions: [
      { id: "promised-benefit", label: "que el estudio le va a ayudar o curar", phrases: ["me va a curar", "va a curar", "me curara", "seguro me ayuda", "me va a ayudar", "me ayudara", "garantiza que", "definitivamente ayuda", "se me quitan las migranas", "se me van a quitar"] },
      { id: "no-risk", label: "que no hay riesgos", phrases: ["no hay riesgos", "no hay ningun riesgo", "sin riesgos", "sin ningun riesgo", "no tiene riesgos", "no tiene ningun riesgo", "completamente seguro", "sin efectos secundarios", "no tiene efectos secundarios", "no hay efectos secundarios"] },
    ],
  },
  {
    id: "costs",
    sectionId: "costs",
    topic: "Costos y pago",
    question: "Con sus propias palabras, ¿qué paga usted, qué le pagan y qué no cubre el estudio?",
    concepts: [
      { id: "no-cost", label: "El medicamento y las visitas del estudio no le cuestan nada", phrases: ["no pago", "gratis", "sin costo", "no cuesta", "no tengo que pagar"] },
      { id: "payment", label: "Recibe $50 por cada visita completada", phrases: ["$50", "50 dolares", "cincuenta"] },
      { id: "usual-care", label: "El estudio no paga su atención habitual de la migraña", phrases: ["atencion habitual", "atencion usual", "no cubre", "atencion regular", "viaje"] },
    ],
    reexplain: "El medicamento, el placebo y las visitas del estudio no le cuestan nada. Recibe $50 después de cada visita que complete. El estudio no paga su atención habitual de la migraña ni el viaje extra.",
    misconceptions: [
      { id: "research-is-care", label: "que el estudio reemplaza o paga su atención regular", phrases: ["paga toda mi atencion", "paga mi atencion", "paga mis citas", "paga mi medico", "cubre mi atencion", "cubre toda mi", "reemplaza a mi medico", "en lugar de mi medico", "ya no necesito a mi medico"] },
    ],
  },
  {
    id: "privacy",
    sectionId: "privacy",
    topic: "Privacidad",
    question: "Con sus propias palabras, ¿quién puede ver sus registros del estudio y se comparte su nombre?",
    concepts: [
      { id: "coded", label: "Los registros usan un código en lugar de su nombre", phrases: ["codigo", "codificad", "en lugar de mi nombre", "sin mi nombre"] },
      { id: "reviewers", label: "El patrocinador, el médico del estudio y los monitores pueden revisar los registros codificados", phrases: ["patrocinador", "monitor", "medico del estudio", "equipo del estudio"] },
      { id: "not-public", label: "Su nombre no se publica ni aparece en la lista pública", phrases: ["no se publica", "no aparece", "no sale", "sin mi nombre", "no es publico", "no se comparte"] },
    ],
    reexplain: "Sus registros llevan un código en lugar de su nombre. El patrocinador, el médico del estudio y los monitores pueden revisar esos registros codificados. Su nombre no se publica y no aparece en la lista pública del estudio.",
    misconceptions: [
      { id: "name-public", label: "que su nombre se hará público", phrases: ["mi nombre se publica", "publican mi nombre", "mi nombre sale", "mi nombre aparece", "mi nombre sera publico", "todos pueden ver", "cualquiera puede ver", "todo el mundo puede ver"] },
    ],
  },
];

/** Spanish words that point a question to one practice section. Matched without accents. */
export const topicWordsEs: Record<SectionId, RegExp> = {
  procedures: /\b(visita|visitas|cuantas veces|cuanto dura|cuanto tiempo|duracion|sangre|placebo|azar|grupo|semanas|meses|horas|procedimiento|procedimientos)\b/,
  risks: /\b(riesgo|riesgos|efecto|efectos|secundario|secundarios|nausea|nauseas|mareo|mareos|peligro|beneficio|ayudar|ayuda)\b/,
  rights: /\b(salir|salirme|retirar|retirarme|dejar|abandonar|derecho|derechos|voluntario|renunciar|irme)\b/,
  costs: /\b(pago|pagan|pagar|dinero|costo|costos|cuesta|gratis|dolares|compensacion|cobran)\b/,
  privacy: /\b(privacidad|nombre|datos|registros|informacion|confidencial|publica|publicar)\b/,
};

/** Dose, personal treatment, approval, or cure questions in Spanish. Matched without accents. */
export const adviceWordsEs =
  /\b(dosis|miligramos?|mg|embarazada|embarazo|ibuprofeno|mis? medicamentos?|otros? medicamentos?|aprobad[oa]s?|aprobacion|fda|cura|curar|curarme|garantiza|garantia|mejor tratamiento|que tratamiento|(debo|deberia) (tomar|dejar|participar|entrar|unirme|firmar)|me conviene|me recomienda|recomienda|recomendaria)\b/;

export const stripAccents = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
