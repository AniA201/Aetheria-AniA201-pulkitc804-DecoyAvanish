import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Passage } from "../data/documents";
import { setExtraPassages } from "../data/documents";
import type { BlockId } from "../lib/blocks";
import { practiceBrief, type Brief } from "../lib/brief";
import type { SubmittedConsent } from "../lib/consent";
import type { LayAudience, LayCorrection } from "../lib/laySummary";
import type { TrialBlockId } from "../lib/publicTrial";
import type { TeachResult } from "../lib/teachback";
import { readingSource } from "../lib/workbook";

export type ReviewState = "open" | "under-review" | "resolved" | "dismissed";
export type DraftState = "draft" | "accepted" | "rejected";
export type AudienceState = DraftState | "in-review" | "stale";
export type LineDecision = "accepted" | "rejected";
export type Role = "participant" | "researcher";
export type Audience = "adult" | "caregiver";
export type CommentTarget = Audience | LayAudience;
export type Language = "en" | "es";

export type Translation = { title: string; plain: string; engine: string; at: string };

export type TrialProposal = {
  id: string;
  block: TrialBlockId;
  from: string;
  to: string;
  label: string;
  createdAt: string;
  decisions: Record<string, LineDecision>;
};

export type LayVersion = { id: string; audience: LayAudience; text: string; state: AudienceState; at: string; reason: string };

export type Proposal = {
  id: string;
  blockId: BlockId;
  from: string;
  to: string;
  createdAt: string;
  decisions: Record<string, LineDecision>;
};

export type ReviewerComment = {
  id: string;
  audience: CommentTarget;
  reviewer: "Medical" | "Legal" | "Patient advocate";
  stance: "approve" | "change";
  text: string;
  at: string;
};

export type AudienceVersion = {
  id: string;
  audience: Audience;
  text: string;
  state: AudienceState;
  at: string;
  reason: string;
};

export type TranslationHandoff = { language: string; at: string; note: string } | null;

export type SavedQuestion = {
  id: string;
  question: string;
  answer: string;
  supported: boolean;
  citation?: string;
  documentId?: string;
  version?: string;
  followUp?: boolean;
};

export type AuditEvent = {
  id: string;
  at: string;
  action: string;
  detail: string;
};

export type ImportedDocument = {
  id: string;
  filename: string;
  studyId: string;
  documentId: string;
  version: string;
  usable: boolean;
  passageCount: number;
  passages: Passage[];
};

type SessionData = {
  role: Role | null;
  displayName: string;
  accessRequest: "none" | "pending";
  fontScale: "md" | "lg" | "xl";
  contrast: "paper" | "high";
  reducedMotion: boolean;
  textOnly: boolean;
  narrationRate: number;
  consent: SubmittedConsent | null;
  reviewed: string[];
  saved: SavedQuestion[];
  teach: TeachResult[];
  reviews: Record<string, ReviewState>;
  reviewNotes: Record<string, string>;
  draft: DraftState;
  draftText: string;
  imports: ImportedDocument[];
  audit: AuditEvent[];
  approvedVersions: string[];
  publicStudyId: string;
  audienceText: Record<Audience, string>;
  audienceState: Record<Audience, AudienceState>;
  audienceHistory: AudienceVersion[];
  comments: ReviewerComment[];
  translationHandoff: TranslationHandoff;
  proposals: Proposal[];
  brief: Brief;
  briefDecisions: Record<string, LineDecision>;
  lastSpoken: string;
  language: Language;
  translations: Record<string, Translation>;
  trialProposals: TrialProposal[];
  layEdits: Partial<Record<LayAudience, string>>;
  layState: Partial<Record<LayAudience, AudienceState>>;
  layHistory: LayVersion[];
  layCorrection: LayCorrection;
  layHandoff: TranslationHandoff;
};

type SessionApi = SessionData & {
  setRole: (role: Role | null, displayName?: string) => void;
  requestResearchAccess: (name: string) => void;
  setNarrationRate: (value: number) => void;
  setFontScale: (value: SessionData["fontScale"]) => void;
  setContrast: (value: SessionData["contrast"]) => void;
  setReducedMotion: (value: boolean) => void;
  setTextOnly: (value: boolean) => void;
  markReviewed: (id: string) => void;
  submitConsent: (consent: SubmittedConsent) => void;
  clearConsent: () => void;
  saveQuestion: (entry: Omit<SavedQuestion, "id">) => void;
  recordTeach: (result: TeachResult) => void;
  setReview: (id: string, state: ReviewState) => void;
  setReviewNote: (id: string, note: string) => void;
  setDraft: (state: DraftState) => void;
  setDraftText: (text: string) => void;
  addImport: (document: ImportedDocument) => void;
  setApprovedVersions: (versions: string[]) => void;
  setPublicStudyId: (id: string) => void;
  setAudienceText: (audience: Audience, text: string) => void;
  setAudienceState: (audience: Audience, state: AudienceState) => void;
  regenerateReadings: (reason: string) => void;
  addComment: (comment: Omit<ReviewerComment, "id" | "at">) => void;
  removeComment: (id: string) => void;
  setTranslationHandoff: (handoff: TranslationHandoff) => void;
  addProposal: (blockId: BlockId, from: string, to: string) => void;
  decideLine: (proposalId: string, lineId: string, decision: LineDecision) => void;
  setBrief: (brief: Brief) => void;
  decideBrief: (id: string, decision: LineDecision) => void;
  setLastSpoken: (text: string) => void;
  setLanguage: (language: Language) => void;
  setTranslation: (key: string, value: Translation | null) => void;
  addTrialProposal: (proposal: Omit<TrialProposal, "id" | "createdAt" | "decisions">) => void;
  decideTrialLine: (proposalId: string, lineId: string, decision: LineDecision) => void;
  setLayEdit: (audience: LayAudience, text: string | null) => void;
  setLayState: (audience: LayAudience, state: AudienceState) => void;
  setLayCorrection: (correction: LayCorrection, reason: string, current: Partial<Record<LayAudience, string>>) => void;
  setLayHandoff: (handoff: TranslationHandoff) => void;
  reset: () => void;
};

const storageKey = "aetheria-session-v1";

const empty: SessionData = {
  role: null,
  displayName: "",
  accessRequest: "none",
  fontScale: "md",
  contrast: "paper",
  reducedMotion: false,
  textOnly: false,
  narrationRate: 1,
  consent: null,
  reviewed: [],
  saved: [],
  teach: [],
  reviews: {},
  reviewNotes: {},
  draft: "draft",
  draftText: "",
  imports: [],
  audit: [],
  approvedVersions: [],
  publicStudyId: "",
  audienceText: { adult: readingSource(null).adult, caregiver: readingSource(null).caregiver },
  audienceState: { adult: "draft", caregiver: "draft" },
  audienceHistory: [],
  comments: [
    {
      id: "seed-medical",
      audience: "adult",
      reviewer: "Medical",
      stance: "approve",
      text: "Practice comment: the figures match the consent clause.",
      at: "practice",
    },
    {
      id: "seed-medical-caregiver",
      audience: "caregiver",
      reviewer: "Medical",
      stance: "approve",
      text: "Practice comment: the figures match the consent clause.",
      at: "practice",
    },
    {
      id: "seed-patient",
      audience: "caregiver",
      reviewer: "Patient advocate",
      stance: "change",
      text: "Practice comment: say who “the person in the study” is the first time it appears.",
      at: "practice",
    },
  ],
  translationHandoff: null,
  proposals: [],
  brief: practiceBrief,
  briefDecisions: {},
  lastSpoken: "",
  language: "en",
  translations: {},
  trialProposals: [],
  layEdits: {},
  layState: {},
  layHistory: [],
  layCorrection: null,
  layHandoff: null,
};

const layComments: ReviewerComment[] = [
  { id: "seed-lay-adult", audience: "lay-adult", reviewer: "Medical", stance: "approve", text: "Practice comment: the numbers match the registry results.", at: "practice" },
  { id: "seed-lay-physician-medical", audience: "lay-physician", reviewer: "Medical", stance: "approve", text: "Practice comment: the statistics are reported as posted.", at: "practice" },
  {
    id: "seed-lay-physician-legal",
    audience: "lay-physician",
    reviewer: "Legal",
    stance: "change",
    text: "Practice comment: say that the confidence intervals are the registry's, not recalculated here.",
    at: "practice",
  },
  {
    id: "seed-lay-es",
    audience: "lay-es",
    reviewer: "Patient advocate",
    stance: "change",
    text: "Practice comment: a qualified medical translator must review this before any Spanish reader sees it.",
    at: "practice",
  },
];
empty.comments = [...empty.comments, ...layComments];

function regenerated(current: SessionData, consent: SubmittedConsent | null, reason: string) {
  const source = readingSource(consent);
  const at = new Date().toISOString();
  const history: AudienceVersion[] = (["adult", "caregiver"] as const).map((audience) => ({
    id: crypto.randomUUID(),
    audience,
    text: current.audienceText[audience],
    state: current.audienceState[audience],
    at,
    reason,
  }));
  return {
    audienceText: { adult: source.adult, caregiver: source.caregiver },
    audienceState: { adult: "draft", caregiver: "draft" } as Record<Audience, AudienceState>,
    audienceHistory: [...history, ...current.audienceHistory].slice(0, 20),
  };
}

const SessionContext = createContext<SessionApi | null>(null);

function pushAudit(current: SessionData, action: string, detail: string): AuditEvent[] {
  return [{ id: crypto.randomUUID(), at: new Date().toISOString(), action, detail }, ...current.audit].slice(0, 40);
}

function load(): SessionData {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<SessionData>;
    return {
      ...empty,
      ...parsed,
      consent: parsed.consent ?? null,
      reviewNotes: parsed.reviewNotes ?? {},
      imports: parsed.imports ?? [],
      audit: parsed.audit ?? [],
      draftText: parsed.draftText ?? "",
      approvedVersions: parsed.approvedVersions ?? [],
      publicStudyId: parsed.publicStudyId ?? "",
      audienceText: parsed.audienceText ?? empty.audienceText,
      audienceState: parsed.audienceState ?? empty.audienceState,
      audienceHistory: parsed.audienceHistory ?? [],
      comments: parsed.comments
        ? [...parsed.comments, ...layComments.filter((seed) => !parsed.comments!.some((item) => item.id === seed.id))]
        : empty.comments,
      translationHandoff: parsed.translationHandoff ?? null,
      proposals: parsed.proposals ?? [],
      brief: { ...practiceBrief, ...parsed.brief },
      briefDecisions: parsed.briefDecisions ?? {},
      lastSpoken: parsed.lastSpoken ?? "",
      language: parsed.language === "es" ? "es" : "en",
      translations: parsed.translations ?? {},
      trialProposals: parsed.trialProposals ?? [],
      layEdits: parsed.layEdits ?? {},
      layState: parsed.layState ?? {},
      layHistory: parsed.layHistory ?? [],
      layCorrection: parsed.layCorrection ?? null,
      layHandoff: parsed.layHandoff ?? null,
    };
  } catch {
    return empty;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SessionData>(() => load());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = load();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setData({ ...stored, reducedMotion: stored.reducedMotion || motion });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setExtraPassages(data.imports.flatMap((item) => item.passages));
    sessionStorage.setItem(storageKey, JSON.stringify(data));
    document.documentElement.dataset.font = data.fontScale;
    document.documentElement.dataset.contrast = data.contrast;
    document.documentElement.dataset.motion = data.reducedMotion ? "reduce" : "full";
    document.documentElement.dataset.textOnly = data.textOnly ? "true" : "false";
  }, [data, ready]);

  const api = useMemo<SessionApi>(
    () => ({
      ...data,
      setRole: (role, displayName) =>
        setData((current) => ({
          ...current,
          role,
          displayName: displayName ?? (role ? current.displayName : ""),
          accessRequest: role === "researcher" ? "none" : current.accessRequest,
        })),
      requestResearchAccess: (name) =>
        setData((current) => ({
          ...current,
          displayName: name || current.displayName,
          accessRequest: "pending",
        })),
      setNarrationRate: (narrationRate) => setData((current) => ({ ...current, narrationRate })),
      setFontScale: (fontScale) => setData((current) => ({ ...current, fontScale })),
      setContrast: (contrast) => setData((current) => ({ ...current, contrast })),
      setReducedMotion: (reducedMotion) => setData((current) => ({ ...current, reducedMotion })),
      setTextOnly: (textOnly) => setData((current) => ({ ...current, textOnly })),
      markReviewed: (id) =>
        setData((current) => ({
          ...current,
          reviewed: current.reviewed.includes(id) ? current.reviewed : [...current.reviewed, id],
        })),
      submitConsent: (consent) =>
        setData((current) => ({
          ...current,
          consent,
          reviewed: [],
          saved: [],
          teach: [],
          draft: "draft",
          draftText: "",
          ...regenerated(current, consent, `Source changed to ${consent.filename} · ${consent.documentId} ${consent.version}`),
          reviews: {},
          reviewNotes: {},
          audit: pushAudit(
            current,
            "Consent submitted",
            `${consent.filename} · ${consent.documentId} ${consent.version}. ${consent.hasProtocol ? "Sample file includes a paired protocol." : "No paired protocol was submitted."} Plain readings were regenerated from it; earlier readings are in the version history.`,
          ),
        })),
      clearConsent: () =>
        setData((current) => ({
          ...current,
          consent: null,
          reviewed: [],
          saved: [],
          teach: [],
          draft: "draft",
          draftText: "",
          audienceState: {
            adult: current.audienceState.adult === "accepted" || current.audienceState.adult === "in-review" ? "stale" : current.audienceState.adult,
            caregiver: current.audienceState.caregiver === "accepted" || current.audienceState.caregiver === "in-review" ? "stale" : current.audienceState.caregiver,
          },
          reviews: {},
          reviewNotes: {},
          audit: pushAudit(current, "Consent removed", "The submitted form was cleared so another file can be checked."),
        })),
      saveQuestion: (entry) =>
        setData((current) => ({
          ...current,
          saved: [{ ...entry, id: crypto.randomUUID(), followUp: true }, ...current.saved].slice(0, 20),
          audit: pushAudit(current, "Saved question", "Marked for research-team follow-up in this browser."),
        })),
      recordTeach: (result) =>
        setData((current) => ({
          ...current,
          teach: [result, ...current.teach.filter((item) => item.promptId !== result.promptId)],
          audit: pushAudit(current, "Teach-back", `${result.promptId}: ${result.label}. ${result.documentId} ${result.version}.`),
        })),
      setReview: (id, state) =>
        setData((current) => ({
          ...current,
          reviews: { ...current.reviews, [id]: state },
          audit: pushAudit(
            current,
            "Document review",
            `${id} → ${state}. ${current.reviewNotes[id]?.trim() || "No note."} Source documents were not edited.`,
          ),
        })),
      setReviewNote: (id, note) =>
        setData((current) => ({
          ...current,
          reviewNotes: { ...current.reviewNotes, [id]: note },
        })),
      setDraft: (draft) =>
        setData((current) => ({
          ...current,
          draft,
          audit: pushAudit(current, "Plain-language decision", `${draft}. The source clause was not changed.`),
        })),
      setDraftText: (draftText) => setData((current) => ({ ...current, draftText })),
      setApprovedVersions: (approvedVersions) =>
        setData((current) => ({
          ...current,
          approvedVersions,
          audit: pushAudit(
            current,
            "Approved-version list",
            approvedVersions.length === 0
              ? "The list was cleared. Versions stay Unverified."
              : `A person entered ${approvedVersions.join(", ")}. This is not an IRB approval.`,
          ),
        })),
      setPublicStudyId: (publicStudyId) => setData((current) => ({ ...current, publicStudyId })),
      setAudienceText: (audience, text) =>
        setData((current) => ({
          ...current,
          audienceText: { ...current.audienceText, [audience]: text },
          audienceState: {
            ...current.audienceState,
            [audience]: current.audienceState[audience] === "accepted" ? "stale" : "draft",
          },
        })),
      setAudienceState: (audience, state) =>
        setData((current) => ({
          ...current,
          audienceState: { ...current.audienceState, [audience]: state },
          audit: pushAudit(
            current,
            "Plain-language decision",
            `${audience} → ${state}. The source clause was not changed.`,
          ),
        })),
      regenerateReadings: (reason) =>
        setData((current) => ({
          ...current,
          ...regenerated(current, current.consent, reason),
          audit: pushAudit(current, "Plain readings regenerated", `${reason}. Earlier readings are in the version history.`),
        })),
      addComment: (comment) =>
        setData((current) => ({
          ...current,
          comments: [...current.comments, { ...comment, id: crypto.randomUUID(), at: new Date().toISOString() }],
          audit: pushAudit(current, "Reviewer comment", `${comment.reviewer} on the ${comment.audience} reading: ${comment.stance}.`),
        })),
      removeComment: (id) => setData((current) => ({ ...current, comments: current.comments.filter((item) => item.id !== id) })),
      setTranslationHandoff: (translationHandoff) =>
        setData((current) => ({
          ...current,
          translationHandoff,
          audit: pushAudit(
            current,
            "Translation handoff",
            translationHandoff
              ? `Marked ready for a ${translationHandoff.language} translation reviewer. No translation was generated.`
              : "Handoff withdrawn.",
          ),
        })),
      addProposal: (blockId, from, to) =>
        setData((current) => ({
          ...current,
          proposals: [
            { id: `practice-${current.proposals.length + 2}`, blockId, from, to, createdAt: new Date().toISOString(), decisions: {} },
            ...current.proposals,
          ].slice(0, 12),
          audit: pushAudit(current, "Block change proposed", `${blockId}: ${from} → ${to}. The source files were not edited.`),
        })),
      decideLine: (proposalId, lineId, decision) =>
        setData((current) => ({
          ...current,
          proposals: current.proposals.map((proposal) =>
            proposal.id === proposalId ? { ...proposal, decisions: { ...proposal.decisions, [lineId]: decision } } : proposal,
          ),
          audit: pushAudit(current, "Block change", `${proposalId} · ${lineId} → ${decision}. The source files were not edited.`),
        })),
      setBrief: (brief) => setData((current) => ({ ...current, brief })),
      decideBrief: (id, decision) =>
        setData((current) => ({
          ...current,
          briefDecisions: { ...current.briefDecisions, [id]: decision },
          audit: pushAudit(current, "Design brief", `${id} → ${decision}. This is not a protocol approval.`),
        })),
      setLastSpoken: (lastSpoken) => setData((current) => ({ ...current, lastSpoken })),
      setLanguage: (language) =>
        setData((current) => ({
          ...current,
          language,
          audit: pushAudit(current, "Language", language === "es" ? "Participant screens switched to Spanish (machine-written, not reviewed)." : "Participant screens switched to English."),
        })),
      setTranslation: (key, value) =>
        setData((current) => {
          const translations = { ...current.translations };
          if (value) translations[key] = value;
          else delete translations[key];
          return { ...current, translations };
        }),
      addTrialProposal: (proposal) =>
        setData((current) => ({
          ...current,
          trialProposals: [
            { ...proposal, id: `CR-${String(current.trialProposals.length + 1).padStart(3, "0")}`, createdAt: new Date().toISOString(), decisions: {} },
            ...current.trialProposals,
          ].slice(0, 12),
          audit: pushAudit(current, "Change request", `${proposal.block}: ${proposal.from} → ${proposal.to}. The posted documents were not edited.`),
        })),
      decideTrialLine: (proposalId, lineId, decision) =>
        setData((current) => ({
          ...current,
          trialProposals: current.trialProposals.map((proposal) =>
            proposal.id === proposalId ? { ...proposal, decisions: { ...proposal.decisions, [lineId]: decision } } : proposal,
          ),
          audit: pushAudit(current, "Change request", `${proposalId} · ${lineId} → ${decision}.`),
        })),
      setLayEdit: (audience, text) =>
        setData((current) => {
          const layEdits = { ...current.layEdits };
          if (text === null) delete layEdits[audience];
          else layEdits[audience] = text;
          const state = current.layState[audience];
          return { ...current, layEdits, layState: { ...current.layState, [audience]: state === "accepted" ? "stale" : "draft" } };
        }),
      setLayState: (audience, state) =>
        setData((current) => ({
          ...current,
          layState: { ...current.layState, [audience]: state },
          audit: pushAudit(current, "Lay summary decision", `${audience} → ${state}.`),
        })),
      setLayCorrection: (layCorrection, reason, shown) =>
        setData((current) => {
          const at = new Date().toISOString();
          const history: LayVersion[] = (Object.keys(shown) as LayAudience[]).map((audience) => ({
            id: crypto.randomUUID(),
            audience,
            text: shown[audience] ?? "",
            state: current.layState[audience] ?? "draft",
            at,
            reason,
          }));
          const layState = Object.fromEntries(
            Object.entries(current.layState).map(([key, value]) => [key, value === "accepted" || value === "in-review" ? "stale" : value]),
          ) as Partial<Record<LayAudience, AudienceState>>;
          return {
            ...current,
            layCorrection,
            layEdits: {},
            layState,
            layHistory: [...history, ...current.layHistory].slice(0, 30),
            audit: pushAudit(current, "Lay summaries regenerated", `${reason}. Earlier drafts are in the version history.`),
          };
        }),
      setLayHandoff: (layHandoff) =>
        setData((current) => ({
          ...current,
          layHandoff,
          audit: pushAudit(
            current,
            "Lay summary translation handoff",
            layHandoff ? `Spanish draft marked ready for a ${layHandoff.language} translation reviewer.` : "Handoff withdrawn.",
          ),
        })),
      addImport: (document) =>
        setData((current) => ({
          ...current,
          imports: [document, ...current.imports].slice(0, 8),
          audit: pushAudit(
            current,
            "Document import",
            `${document.filename} · ${document.documentId} ${document.version}. Reader selection was not changed.`,
          ),
        })),
      reset: () => setData(empty),
    }),
    [data],
  );

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return value;
}
