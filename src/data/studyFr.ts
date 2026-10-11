// French readings and French answer keys for the five practice sections.
// Written for this practice app from the English readings, with the same figures. Not reviewed by a
// qualified translator; the English form stays the official consent.
import type { SectionId, TeachPrompt } from "./study";
import type { PracticeSection } from "./studyEs";

export const studyNameFr = "Prévention de la migraine épisodique";

export const sectionsFr: Record<SectionId, PracticeSection> = {
  procedures: {
    title: "Déroulement de l'étude et durée",
    short: "Visites, durée et attribution du groupe",
    plain:
      "La clinique vous demande de venir 6 fois sur environ 16 semaines. Chaque visite dure environ 2 heures. Lors de certaines visites, on vous prend un peu de sang, environ 2 cuillères à café. Un tirage au sort décide si vous recevez Aetherol ou un placebo. Ni vous ni le médecin de l'étude ne savez lequel vous recevez pendant l'étude.",
    terms: [
      { word: "Placebo", meaning: "Un produit sans le médicament de l'étude. Il sert à comparer les groupes." },
      { word: "Tirage au sort", meaning: "Un procédé, et non votre choix ni celui du médecin, décide dans quel groupe vous êtes." },
    ],
    ask: "Combien de visites y a-t-il et combien de temps dure chacune ?",
  },
  risks: {
    title: "Risques et bénéfices possibles",
    short: "Ce que le formulaire dit qui pourrait arriver",
    plain:
      "Aetherol peut causer des nausées, des vertiges ou de la fatigue. Le formulaire indique que, dans des études précédentes, environ 1 personne sur 10 a eu des nausées. Les réactions allergiques sont décrites comme rares. Une prise de sang peut laisser un bleu. Le formulaire ne promet pas que l'étude aidera vos migraines.",
    terms: [
      { word: "Fatigue", meaning: "Une fatigue plus forte que la fatigue normale de fin de journée." },
      { word: "Aucune promesse de bénéfice", meaning: "L'étude est une recherche. Elle ne garantit pas que vous irez mieux." },
    ],
    ask: "Quels risques le formulaire décrit-il, et promet-il un bénéfice ?",
  },
  rights: {
    title: "Vos droits et comment quitter l'étude",
    short: "Vous pouvez partir",
    plain:
      "Vous pouvez dire non, et vous pouvez partir plus tard. Partir ne vous retire pas les soins habituels de votre propre médecin. L'équipe peut garder les informations de sécurité déjà recueillies. On doit vous informer de toute nouvelle information qui pourrait changer votre décision de rester.",
    terms: [{ word: "Volontaire", meaning: "C'est votre décision. Vous n'êtes pas obligé d'entrer ni de rester." }],
    ask: "Que se passe-t-il si je décide de quitter l'étude ?",
  },
  costs: {
    title: "Coûts et paiement",
    short: "Ce que vous payez et ce que vous recevez",
    plain:
      "Vous ne payez ni le médicament de l'étude ni les visites exigées par l'étude. Vous recevez 50 $ après chaque visite à la clinique que vous terminez. Ce paiement ne couvre pas vos soins habituels pour la migraine ni les frais de transport supplémentaires.",
    terms: [{ word: "Indemnisation", meaning: "Le paiement que le formulaire dit que vous recevez pour chaque visite terminée." }],
    ask: "Vais-je être payé, et dois-je payer les visites ?",
  },
  privacy: {
    title: "Confidentialité et utilisation de vos données",
    short: "Qui peut voir les dossiers codés",
    plain:
      "Dans les dossiers de l'étude, votre nom est remplacé par un code. Le promoteur et les moniteurs peuvent voir les dossiers codés pour vérifier que l'étude a été faite comme prévu. Les dossiers peuvent être conservés 15 ans. Les résultats publiés et la fiche publique de l'étude n'indiquent pas votre nom.",
    terms: [
      { word: "Dossiers codés", meaning: "Des dossiers marqués d'un code d'étude au lieu de votre nom." },
      { word: "Moniteur", meaning: "Une personne qui vérifie les dossiers pour contrôler comment l'étude a été faite." },
    ],
    ask: "Qui peut voir mes dossiers, et mon nom sera-t-il publié ?",
  },
};

/** French answer keys. Ids match the English prompts so results line up in the handoff. Phrases are matched without accents. */
export const teachPromptsFr: TeachPrompt[] = [
  {
    id: "randomization",
    sectionId: "procedures",
    topic: "Attribution",
    question: "Avec vos propres mots, comment décide-t-on si vous recevez Aetherol ou un placebo, et qui sait lequel vous recevez ?",
    concepts: [
      { id: "chance", label: "L'attribution se fait au hasard", phrases: ["hasard", "tirage au sort", "au sort", "aleatoire", "je ne choisis pas", "ce n'est pas moi qui choisis", "pas mon choix"] },
      { id: "blind-you", label: "On ne vous dit pas lequel vous recevez", phrases: ["je ne saurai pas", "je ne le saurai pas", "je ne sais pas lequel", "on ne me dit pas", "on ne me le dit pas", "ni moi"] },
      { id: "blind-doctor", label: "Le médecin de l'étude ne le sait pas non plus", phrases: ["medecin ne sait pas", "medecin ne le sait pas", "docteur ne sait pas", "medecin non plus", "docteur non plus", "ni le medecin", "ni le docteur"] },
    ],
    reexplain: "Un tirage au sort choisit Aetherol ou le placebo. Pendant l'étude, on ne vous dit pas lequel, et le médecin de l'étude ne le sait pas non plus.",
    misconceptions: [
      {
        id: "will-get-drug",
        label: "que vous recevrez forcément Aetherol",
        phrases: ["je vais forcement recevoir", "je recevrai forcement", "je suis sur de recevoir", "on va me donner aetherol", "je vais recevoir aetherol", "je recevrai aetherol", "on va me donner le nouveau medicament", "je vais avoir le nouveau medicament", "tout le monde recoit aetherol"],
      },
      { id: "chooser", label: "que quelqu'un choisit votre groupe", phrases: ["je choisis", "je peux choisir", "le medecin choisit", "le docteur choisit", "le medecin decide", "le docteur decide"] },
    ],
  },
  {
    id: "withdrawal",
    sectionId: "rights",
    topic: "Quitter l'étude",
    question: "Que se passe-t-il si vous décidez de quitter l'étude ?",
    concepts: [
      { id: "anytime", label: "Vous pouvez partir à tout moment", phrases: ["tout moment", "n'importe quand", "n'importe quel moment", "je peux partir", "je peux quitter", "je peux arreter", "me retirer", "quitter l'etude"] },
      { id: "care", label: "Les soins habituels de votre propre médecin continuent", phrases: ["mon medecin", "mon docteur", "soins habituels", "soins medicaux", "continue a me soigner", "me soigne toujours", "mes soins"] },
      { id: "safety", label: "Les informations de sécurité déjà recueillies peuvent être gardées", phrases: ["securite", "deja recueilli", "deja collecte", "deja enregistre", "deja note"] },
    ],
    reexplain: "Vous pouvez partir à tout moment. Partir ne change pas les soins habituels de votre propre médecin. L'équipe peut garder les informations de sécurité déjà enregistrées.",
    misconceptions: [
      {
        id: "cannot-leave",
        label: "que vous ne pouvez plus partir une fois commencé",
        phrases: ["je ne peux pas partir", "je ne peux pas quitter", "je ne peux pas arreter", "je dois rester", "je dois finir", "je dois aller jusqu'au bout", "on ne peut pas partir", "impossible de partir", "je suis oblige de rester", "je suis obligee de rester"],
      },
      {
        id: "lose-care",
        label: "que partir vous fait perdre vos soins habituels",
        phrases: ["je perds mon medecin", "je perds mes soins", "je perds les soins", "perdre mon medecin", "perdre mes soins", "perdre les soins", "je n'aurai plus de medecin", "je n'aurai plus de soins", "on ne me soignera plus", "mon medecin ne me soignera plus", "on arrete de me soigner"],
      },
    ],
  },
  {
    id: "risk",
    sectionId: "risks",
    topic: "Risques",
    question: "Que devez-vous savoir sur les risques et sur le fait que l'étude vous aidera ou non ?",
    concepts: [
      { id: "effects", label: "Nausées, vertiges ou fatigue sont mentionnés", phrases: ["nausee", "vertige", "fatigue", "fatigu", "etourdi"] },
      { id: "benefit", label: "Le formulaire ne promet pas de bénéfice", phrases: ["ne promet pas", "pas de promesse", "aucune promesse", "pourrait ne pas aider", "peut ne pas aider", "ne garantit pas", "pas garanti"] },
    ],
    reexplain: "Le formulaire dit qu'Aetherol peut causer des nausées, des vertiges ou de la fatigue. Il dit aussi que l'étude peut ne pas aider vos migraines. Il n'y a aucune promesse de bénéfice.",
    misconceptions: [
      { id: "promised-benefit", label: "que l'étude va aider ou guérir vos migraines", phrases: ["va me guerir", "va guerir", "me guerira", "va forcement m'aider", "m'aidera forcement", "c'est garanti", "garantit que", "va regler mes migraines", "mes migraines vont disparaitre"] },
      { id: "no-risk", label: "qu'il n'y a aucun risque", phrases: ["aucun risque", "pas de risque", "sans risque", "aucun effet secondaire", "pas d'effets secondaires", "pas d'effet secondaire", "sans danger", "completement sur", "totalement sur"] },
    ],
  },
  {
    id: "costs",
    sectionId: "costs",
    topic: "Coûts et paiement",
    question: "Avec vos propres mots, que payez-vous, que vous paie-t-on, et qu'est-ce que l'étude ne couvre pas ?",
    concepts: [
      { id: "no-cost", label: "Le médicament et les visites de l'étude ne vous coûtent rien", phrases: ["gratuit", "je ne paie pas", "je ne paye pas", "je ne paie rien", "je ne paye rien", "ne coute rien", "sans frais", "rien a payer", "pas a payer"] },
      { id: "payment", label: "Vous recevez 50 $ pour chaque visite terminée", phrases: ["50 $", "50$", "$50", "50 dollars", "cinquante"] },
      { id: "usual-care", label: "L'étude ne paie pas vos soins habituels pour la migraine", phrases: ["soins habituels", "soins normaux", "ne couvre pas", "pas couvert", "transport", "deplacement"] },
    ],
    reexplain: "Le médicament, le placebo et les visites de l'étude ne vous coûtent rien. Vous recevez 50 $ après chaque visite terminée. L'étude ne paie pas vos soins habituels pour la migraine ni les déplacements supplémentaires.",
    misconceptions: [
      {
        id: "research-is-care",
        label: "que l'étude remplace ou paie vos soins habituels",
        phrases: ["paie tous mes soins", "paye tous mes soins", "paie mes soins", "paye mes soins", "couvre tous mes soins", "couvre mes soins", "remplace mon medecin", "a la place de mon medecin", "je n'ai plus besoin de mon medecin"],
      },
    ],
  },
  {
    id: "privacy",
    sectionId: "privacy",
    topic: "Confidentialité",
    question: "Avec vos propres mots, qui peut voir vos dossiers d'étude, et votre nom est-il partagé ?",
    concepts: [
      { id: "coded", label: "Les dossiers utilisent un code au lieu de votre nom", phrases: ["code", "au lieu de mon nom", "sans mon nom"] },
      { id: "reviewers", label: "Le promoteur, le médecin de l'étude et les moniteurs peuvent consulter les dossiers codés", phrases: ["promoteur", "moniteur", "medecin de l'etude", "equipe de l'etude", "sponsor"] },
      { id: "not-public", label: "Votre nom n'est pas publié ni dans la fiche publique", phrases: ["pas publie", "ne sera pas publie", "pas dans la fiche", "sans mon nom", "pas partage", "n'apparait pas", "ne figure pas"] },
    ],
    reexplain: "Vos dossiers portent un code au lieu de votre nom. Le promoteur, le médecin de l'étude et les moniteurs peuvent consulter ces dossiers codés. Votre nom n'est pas publié et n'apparaît pas dans la fiche publique de l'étude.",
    misconceptions: [
      { id: "name-public", label: "que votre nom sera rendu public", phrases: ["mon nom sera publie", "mon nom est publie", "on publie mon nom", "mon nom sera public", "tout le monde peut voir", "n'importe qui peut voir", "mon nom sera en ligne"] },
    ],
  },
];

/** French words that point a question to one practice section. Matched without accents. */
export const topicWordsFr: Record<SectionId, RegExp> = {
  procedures: /\b(visite|visites|combien de fois|combien de temps|duree|dure|sang|placebo|hasard|groupe|semaines|mois|heures|deroulement)\b/,
  risks: /\b(risque|risques|effet|effets|secondaire|secondaires|nausee|nausees|vertige|vertiges|danger|benefice|aider|aide)\b/,
  rights: /\b(quitter|partir|retirer|arreter|abandonner|droit|droits|volontaire)\b/,
  costs: /\b(paye|payee|paie|payer|payes|argent|cout|couts|coute|gratuit|dollars|indemnisation|remboursement|frais|recois|recoit|recevoir|recevrai|toucher|touche)\b/,
  privacy: /\b(confidentialite|nom|donnees|dossiers|informations|confidentiel|publie|publier|prive)\b/,
};

/** Dose, personal treatment, approval, or cure questions in French. Matched without accents. */
export const adviceWordsFr =
  /\b(dose|doses|dosage|milligrammes?|mg|enceinte|grossesse|ibuprofene|mes medicaments|mon medicament|autres? medicaments?|approuve|approuvee|approbation|fda|guerir|guerison|meilleur traitement|quel traitement|(dois|devrais)-je (prendre|arreter|participer|signer)|je (dois|devrais) (prendre|arreter|participer|signer)|me conseillez|recommandez|recommande)\b/;
