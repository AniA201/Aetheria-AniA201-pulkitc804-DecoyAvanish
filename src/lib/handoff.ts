import type { TeachResult } from "./teachback";

const tokenKey = "aetheria_token";

export type SendState = "sent" | "local-only" | "failed";

export type StoredHandoff = {
  id: string;
  prompt_id: string;
  topic: string;
  label: TeachResult["label"];
  response: string;
  feedback: string;
  speaker: "participant" | "caregiver";
  misconception: string | null;
  language: "en" | "es";
  document_id: string;
  version: string;
  engine: string | null;
  created_at: string;
  participant: string;
};

function token(): string | null {
  try {
    return sessionStorage.getItem(tokenKey);
  } catch {
    return null;
  }
}

/** Sends one teach-back result to the research team. Without a sign-in it stays in this browser. */
export async function sendHandoff(result: TeachResult, topic: string): Promise<{ state: SendState; detail: string }> {
  const bearer = token();
  if (!bearer) {
    return { state: "local-only", detail: "Saved in this browser only. Sign in with a participant account to send it to the research team." };
  }
  try {
    const response = await fetch("/api/handoffs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({
        prompt_id: result.promptId,
        topic,
        label: result.label,
        response: result.response ?? "",
        feedback: result.feedback,
        speaker: result.speaker ?? "participant",
        misconception: result.misconception ?? null,
        language: result.language ?? "en",
        document_id: result.documentId,
        version: result.version,
        engine: result.engine ?? null,
      }),
    });
    if (response.ok) return { state: "sent", detail: "Sent to the research team." };
    if (response.status === 401) return { state: "failed", detail: "Your sign-in has expired, so this was not sent. It is still saved in this browser." };
    if (response.status === 403) return { state: "local-only", detail: "This account is not a participant account, so the result stays in this browser." };
    return { state: "failed", detail: "The research-team service did not accept it. It is still saved in this browser." };
  } catch {
    return { state: "failed", detail: "The research-team service could not be reached. It is still saved in this browser." };
  }
}

export async function loadHandoffs(): Promise<{ state: "ok" | "signed-out" | "forbidden" | "offline"; handoffs: StoredHandoff[] }> {
  const bearer = token();
  if (!bearer) return { state: "signed-out", handoffs: [] };
  try {
    const response = await fetch("/api/handoffs", { headers: { Authorization: `Bearer ${bearer}` } });
    if (response.status === 401) return { state: "signed-out", handoffs: [] };
    if (response.status === 403) return { state: "forbidden", handoffs: [] };
    if (!response.ok) return { state: "offline", handoffs: [] };
    const body = (await response.json()) as { handoffs: StoredHandoff[] };
    return { state: "ok", handoffs: body.handoffs };
  } catch {
    return { state: "offline", handoffs: [] };
  }
}
