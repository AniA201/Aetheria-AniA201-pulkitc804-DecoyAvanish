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
import type { SubmittedConsent } from "../lib/consent";
import type { TeachResult } from "../lib/teachback";

export type ReviewState = "open" | "under-review" | "resolved" | "dismissed";
export type DraftState = "draft" | "accepted" | "rejected";
export type Role = "participant" | "researcher";

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
};

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
          reviews: {},
          reviewNotes: {},
          audit: pushAudit(
            current,
            "Consent submitted",
            `${consent.filename} · ${consent.documentId} ${consent.version}. ${consent.hasProtocol ? "Sample file includes a paired protocol." : "No paired protocol was submitted."}`,
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
