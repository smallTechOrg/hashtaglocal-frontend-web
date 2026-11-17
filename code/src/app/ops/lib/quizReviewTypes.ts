// Types for the quiz automation API (backend /admin/quiz review endpoints).
// The backend serialises JSON in snake_case.

export type QuizReviewStatus = "PENDING" | "QUEUED" | "REJECTED" | "PUBLISHED";

export type QuizRejectReason =
  | "WRONG_ANSWER"
  | "UNCLEAR_QUESTION"
  | "POOR_OPTIONS"
  | "NOT_LOCAL"
  | "TOO_EASY"
  | "TOO_HARD"
  | "REPEAT"
  | "OTHER";

export const REJECT_REASONS: { value: QuizRejectReason; label: string }[] = [
  { value: "WRONG_ANSWER", label: "Wrong answer" },
  { value: "UNCLEAR_QUESTION", label: "Unclear question" },
  { value: "POOR_OPTIONS", label: "Poor options" },
  { value: "NOT_LOCAL", label: "Not local" },
  { value: "TOO_EASY", label: "Too easy" },
  { value: "TOO_HARD", label: "Too hard" },
  { value: "REPEAT", label: "Repeat" },
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
