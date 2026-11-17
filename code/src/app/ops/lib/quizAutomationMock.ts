// Mock data for the quiz automation UI (see "#local Quiz Automation - Tech Design").
// Replace with real /admin/quiz-generation/* calls once the backend lands.

export type QuizStatus = "PENDING_REVIEW" | "QUEUED" | "REJECTED" | "PUBLISHED";
export type RunStatus = "RUNNING" | "DONE" | "PARTIAL" | "FAILED";
export type RejectionCategory =
  | "WRONG_ANSWER"
  | "DUPLICATE"
  | "TOO_EASY_OR_VAGUE"
  | "NOT_LOCAL"
  | "BAD_OPTIONS"
  | "OTHER";

export const REJECTION_CATEGORIES: { value: RejectionCategory; label: string }[] = [
  { value: "WRONG_ANSWER", label: "Wrong answer" },
  { value: "DUPLICATE", label: "Duplicate / repeat" },
  { value: "TOO_EASY_OR_VAGUE", label: "Too easy or vague" },
  { value: "NOT_LOCAL", label: "Not local enough" },
  { value: "BAD_OPTIONS", label: "Bad options" },
  { value: "OTHER", label: "Other" },
];

export interface MockQuiz {
  id: number;
  hashtag: string;
  question: string;
  options: string[];
  answer_option_index: number; // 1-based
  explanation: string;
  status: QuizStatus;
  generation_run_id: number;
  rejection_category?: RejectionCategory;
  rejection_reason?: string;
}

export interface MockRun {
  id: number;
  started_by: string;
  started_at: string;
  n: number;
  status: RunStatus;
  quizzes_made: number;
  dropped: number;
}

export interface MockQueueRow {
  hashtag: string;
  queued: number;
  last_served: string | null;
}

export const QUEUE_TARGET_DAYS = 30;

export const MOCK_RUNS: MockRun[] = [
  { id: 14, started_by: "ops@hashtaglocal", started_at: "2026-11-12 10:05", n: 5, status: "PARTIAL", quizzes_made: 13, dropped: 2 },
  { id: 13, started_by: "ops@hashtaglocal", started_at: "2026-11-05 16:40", n: 10, status: "DONE", quizzes_made: 30, dropped: 0 },
  { id: 12, started_by: "ops@hashtaglocal", started_at: "2026-11-01 09:12", n: 10, status: "FAILED", quizzes_made: 0, dropped: 0 },
];

export const MOCK_QUIZZES: MockQuiz[] = [
  { id: 101, hashtag: "#indiranagar", question: "Which metro line serves Indiranagar station?", options: ["Purple Line", "Green Line", "Yellow Line", "Pink Line"], answer_option_index: 1, explanation: "Indiranagar is on the Purple Line between Halasuru and Swami Vivekananda Road.", status: "PENDING_REVIEW", generation_run_id: 14 },
  { id: 102, hashtag: "#indiranagar", question: "What is the famous 100 Feet Road in Indiranagar best known for?", options: ["Cafes and nightlife", "Heavy industry", "Farmland", "Airport access"], answer_option_index: 1, explanation: "100 Feet Road is a dining and shopping strip.", status: "PENDING_REVIEW", generation_run_id: 14 },
  { id: 103, hashtag: "#indiranagar", question: "Which lake is closest to Indiranagar?", options: ["Ulsoor Lake", "Hebbal Lake", "Bellandur Lake", "Sankey Tank"], answer_option_index: 1, explanation: "Ulsoor Lake lies just south-west of Indiranagar.", status: "PENDING_REVIEW", generation_run_id: 14 },
  { id: 111, hashtag: "#koramangala", question: "Koramangala is divided into how many blocks?", options: ["Eight", "Five", "Ten", "Three"], answer_option_index: 1, explanation: "Koramangala has eight numbered blocks.", status: "PENDING_REVIEW", generation_run_id: 14 },
  { id: 112, hashtag: "#koramangala", question: "Which of these is a well-known startup hub area in Koramangala?", options: ["5th Block", "Majestic", "Yeshwanthpur", "Whitefield"], answer_option_index: 1, explanation: "5th Block is known for startups, cafes and pubs.", status: "PENDING_REVIEW", generation_run_id: 14 },
  { id: 121, hashtag: "#jayanagar", question: "Which famous complex is in Jayanagar 4th Block?", options: ["Shopping Complex", "Vidhana Soudha", "Lalbagh", "Cubbon Park"], answer_option_index: 1, explanation: "The 4th Block shopping complex is a landmark.", status: "PENDING_REVIEW", generation_run_id: 14 },
  { id: 122, hashtag: "#jayanagar", question: "Jayanagar was planned in which decade?", options: ["1940s-50s", "1990s", "2010s", "1800s"], answer_option_index: 1, explanation: "It was planned as a layout in the 1940s-50s.", status: "PENDING_REVIEW", generation_run_id: 14 },
  { id: 90, hashtag: "#indiranagar", question: "Is Indiranagar in North Bengaluru?", options: ["Yes", "No", "Maybe", "Unknown"], answer_option_index: 1, explanation: "-", status: "REJECTED", generation_run_id: 13, rejection_category: "TOO_EASY_OR_VAGUE", rejection_reason: "Vague, east not north." },
];

export const MOCK_QUEUE: MockQueueRow[] = [
  { hashtag: "#indiranagar", queued: 31, last_served: "2026-11-13" },
  { hashtag: "#koramangala", queued: 18, last_served: "2026-11-13" },
  { hashtag: "#jayanagar", queued: 6, last_served: "2026-11-13" },
  { hashtag: "#hsr-layout", queued: 0, last_served: "2026-11-09" },
  { hashtag: "#whitefield", queued: 24, last_served: "2026-11-13" },
];
