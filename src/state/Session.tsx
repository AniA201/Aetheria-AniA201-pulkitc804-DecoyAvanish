import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SectionId } from "../data/study";
import type { TeachResult } from "../lib/teachback";

export type ReviewState = "open" | "resolved" | "dismissed";
export type DraftState = "draft" | "accepted" | "rejected";

export type SavedQuestion = {
  id: string;
  question: string;
  answer: string;
  supported: boolean;
  citation?: string;
};

type SessionData = {
  fontScale: "md" | "lg" | "xl";
  contrast: "paper" | "high";
  reducedMotion: boolean;
  textOnly: boolean;
  reviewed: SectionId[];
  saved: SavedQuestion[];
  teach: TeachResult[];
  reviews: Record<string, ReviewState>;
  draft: DraftState;
};

type SessionApi = SessionData & {
  setFontScale: (value: SessionData["fontScale"]) => void;
  setContrast: (value: SessionData["contrast"]) => void;
  setReducedMotion: (value: boolean) => void;
  setTextOnly: (value: boolean) => void;
  markReviewed: (id: SectionId) => void;
  saveQuestion: (entry: Omit<SavedQuestion, "id">) => void;
  recordTeach: (result: TeachResult) => void;
  setReview: (id: string, state: ReviewState) => void;
  setDraft: (state: DraftState) => void;
  reset: () => void;
};

const storageKey = "aetheria-session-v1";

const empty: SessionData = {
  fontScale: "md",
  contrast: "paper",
  reducedMotion: false,
  textOnly: false,
  reviewed: [],
  saved: [],
  teach: [],
  reviews: {},
  draft: "draft",
};

const SessionContext = createContext<SessionApi | null>(null);

function load(): SessionData {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SessionData>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = load();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setData({ ...stored, reducedMotion: stored.reducedMotion || motion });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(storageKey, JSON.stringify(data));
    document.documentElement.dataset.font = data.fontScale;
    document.documentElement.dataset.contrast = data.contrast;
    document.documentElement.dataset.motion = data.reducedMotion ? "reduce" : "full";
    document.documentElement.dataset.textOnly = data.textOnly ? "true" : "false";
  }, [data, ready]);

  const api = useMemo<SessionApi>(
    () => ({
      ...data,
      setFontScale: (fontScale) => setData((current) => ({ ...current, fontScale })),
      setContrast: (contrast) => setData((current) => ({ ...current, contrast })),
      setReducedMotion: (reducedMotion) => setData((current) => ({ ...current, reducedMotion })),
      setTextOnly: (textOnly) => setData((current) => ({ ...current, textOnly })),
      markReviewed: (id) =>
        setData((current) => ({
          ...current,
          reviewed: current.reviewed.includes(id) ? current.reviewed : [...current.reviewed, id],
        })),
      saveQuestion: (entry) =>
        setData((current) => ({
          ...current,
          saved: [{ ...entry, id: crypto.randomUUID() }, ...current.saved].slice(0, 20),
        })),
      recordTeach: (result) =>
        setData((current) => ({
          ...current,
          teach: [result, ...current.teach.filter((item) => item.promptId !== result.promptId)],
        })),
      setReview: (id, state) =>
        setData((current) => ({
          ...current,
          reviews: { ...current.reviews, [id]: state },
        })),
      setDraft: (draft) => setData((current) => ({ ...current, draft })),
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
