// Types for the quiz automation API (backend /admin/quiz review endpoints).
// The backend serialises JSON in snake_case.

export type QuizReviewStatus = "PENDING" | "QUEUED" | "REJECTED" | "PUBLISHED";

// Must match the backend enum QuizRejectReason.
export type QuizRejectReason =
  | "INACCURATE"
  | "NOT_LOCAL"
  | "LOW_QUALITY"
  | "DUPLICATE"
  | "OTHER";

export const REJECT_REASONS: { value: QuizRejectReason; label: string }[] = [
  { value: "INACCURATE", label: "Inaccurate" },
  { value: "NOT_LOCAL", label: "Not local" },
  { value: "LOW_QUALITY", label: "Low quality" },
  { value: "DUPLICATE", label: "Duplicate" },
  { value: "OTHER", label: "Other" },
];

/** A generated quiz in review (AdminQuizData on the backend). */
export interface QuizReviewItem {
  id: number;
  locality_id: number;
  locality_name: string;
  hashtag: string;
  question: string;
  options: string[];
  /** 1-based index of the correct option. */
  answer_option_index: number;
  explanation: string | null;
  status: QuizReviewStatus | null;
  rejection_reason: QuizRejectReason | null;
  rejection_note: string | null;
  /** Admin user id who approved or rejected the quiz. */
  reviewed_by: number | null;
  /** ISO local date-time, e.g. 2026-11-17T10:04:00. */
  reviewed_at: string | null;
}

/** Queued quizzes for one saved-user locality. */
export interface QueuedCount {
  locality_id: number;
  locality_name: string;
  hashtag: string;
  queued: number;
}
