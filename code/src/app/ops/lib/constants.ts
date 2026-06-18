import { BASE_URL } from "../../constants/api";
import { getOrCreateDeviceId } from "./auth";

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Where Google sends the user after they consent. */
export const GOOGLE_REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/ops/auth/callback`
    : "http://localhost:3000/ops/auth/callback";

export const ADMIN_API = {
  /** Exchange Google auth code for backend tokens */
  googleCallback: (code: string) =>
    `${BASE_URL}/auth/google/callback?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&platform=WEB&device_id=${encodeURIComponent(getOrCreateDeviceId())}`,

  /** Refresh access token */
  refreshToken: `${BASE_URL}/auth/refresh`,

  /** List pending actions (oldest first) */
  pendingActions: `${BASE_URL}/admin/issue-action/pending`,

  /** Approve an action */
  approveAction: (actionId: number) =>
    `${BASE_URL}/admin/issue-action/${actionId}/approve`,

  /** Reject an action */
  rejectAction: (actionId: number) =>
    `${BASE_URL}/admin/issue-action/${actionId}/reject`,

  /** Fetch a single issue (uses the public endpoint with auth for ONHOLD) */
  issue: (issueId: number) => `${BASE_URL}/api/v1/issue/${issueId}`,

  /** Fetch user summary for admin review */
  userSummary: (userId: number) => `${BASE_URL}/admin/user/${userId}/summary`,

  /** List recently approved/rejected actions (newest first) */
  recentActions: `${BASE_URL}/admin/issue-action/history`,

  /** Report issue to government complaint portal */
  reportComplaint: (issueId: number) =>
    `${BASE_URL}/api/v1/portal/REPORT_ISSUE?issue_id=${encodeURIComponent(String(issueId))}`,

  // ---- Event approval ----

  /** List scraped events awaiting admin review (geocoded only) */
  pendingEvents: `${BASE_URL}/admin/event/pending`,

  /** Approve an event, optionally setting a display name override */
  approveEvent: (eventId: number) => `${BASE_URL}/admin/event/${eventId}/approve`,

  /** Reject an event */
  rejectEvent: (eventId: number) => `${BASE_URL}/admin/event/${eventId}/reject`,

  /** List already-reviewed (approved / rejected) events */
  eventHistory: `${BASE_URL}/admin/event/history`,

  /** Manually create an event via the ops portal */
  createEvent: `${BASE_URL}/admin/event/manual`,

  /** Edit an existing event */
  editEvent: (eventId: number) => `${BASE_URL}/admin/event/${eventId}`,

  /** Manually trigger the geocoding pass for events awaiting a location */
  triggerGeocode: `${BASE_URL}/admin/event/geocode`,

  // ---- City bulletin: quizzes (manual entry, one per locality per date) ----

  /** List quizzes; optional ?locality_id= & ?date=YYYY-MM-DD filters */
  quizzes: (localityId?: number | null, date?: string | null) => {
    const params = new URLSearchParams();
    if (localityId) params.set("locality_id", String(localityId));
    if (date) params.set("date", date);
    const qs = params.toString();
    return `${BASE_URL}/admin/quiz${qs ? `?${qs}` : ""}`;
  },

  /** Create a quiz for a locality + date (Groq generates the explanation) */
  createQuiz: `${BASE_URL}/admin/quiz`,

  /** Edit a quiz (explanation editable; regenerate_explanation=true re-calls Groq) */
  editQuiz: (quizId: number) => `${BASE_URL}/admin/quiz/${quizId}`,

  /** Delete a quiz (blocked once users have attempted it) */
  deleteQuiz: (quizId: number) => `${BASE_URL}/admin/quiz/${quizId}`,

  /** Localities with saved users — the dropdown options for quiz/bulletin pages */
  quizLocalities: `${BASE_URL}/admin/quiz/localities`,

  // ---- City bulletin: bulletins (weather + editable AI summary) ----

  /** List bulletins; optional ?locality_id= & ?date=YYYY-MM-DD filters */
  bulletins: (localityId?: number | null, date?: string | null) => {
    const params = new URLSearchParams();
    if (localityId) params.set("locality_id", String(localityId));
    if (date) params.set("date", date);
    const qs = params.toString();
    return `${BASE_URL}/admin/bulletin${qs ? `?${qs}` : ""}`;
  },

  /** Edit a bulletin's AI weather summary */
  editBulletinSummary: (bulletinId: number) =>
    `${BASE_URL}/admin/bulletin/${bulletinId}/summary`,

  /** Manually run the daily weather generation (same as the 8 AM cron) */
  generateBulletins: `${BASE_URL}/admin/bulletin/generate`,

  // ---- Broadcast ----

  /** Send a push notification to every user with an active device token */
  notification: `${BASE_URL}/admin/notification`,
  // ---- AI prompts (read-only view of GroqClient templates) ----

  /** Read the Groq prompt templates currently in use */
  aiPrompts: `${BASE_URL}/admin/ai-prompts`,
};
