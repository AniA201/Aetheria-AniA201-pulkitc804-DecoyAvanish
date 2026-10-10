export const packs = [
  {
    id: "teach",
    name: "Teach It Back",
    where: "Explore Consent, Ask Aetheria, Teach-Back, My Summary",
    used: "The participant reads each consent chapter, gets answers only from that form, and explains the idea in their own words. The summary is a handoff. It is not a signature.",
  },
  {
    id: "plain",
    name: "Say It Plainly",
    where: "Explore Consent and Plain Language Studio",
    used: "A shorter reading sits beside the original clause. The draft has to keep the consent’s own numbers. Accepting it does not change the source.",
  },
  {
    id: "once",
    name: "Write Once",
    where: "Document Integrity and Documents & Versions",
    used: "Visit count, duration, and payment are shared facts. When the protocol and the consent disagree, both sentences stay visible until a person reviews them.",
  },
  {
    id: "preflight",
    name: "Protocol Pre-Flight",
    where: "Document Integrity",
    used: "Each planted mismatch says where it is and why it matters. This screen does not approve the protocol or invent a score.",
  },
] as const;
