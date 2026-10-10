import type { ReviewState } from "../state/Session";

export function reviewLabel(state: ReviewState): string {
  switch (state) {
    case "open":
      return "Open";
    case "under-review":
      return "Under review";
    case "resolved":
      return "Resolved";
    case "dismissed":
      return "Not a discrepancy";
  }
}

export function isOpenReview(state: ReviewState): boolean {
  return state === "open" || state === "under-review";
}
