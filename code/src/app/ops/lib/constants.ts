import { BASE_URL } from "../../constants/api";

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Where Google sends the user after they consent. */
export const GOOGLE_REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/ops/auth/callback`
    : "http://localhost:3000/ops/auth/callback";

export const ADMIN_API = {
  /** Exchange Google auth code for backend tokens */
  googleCallback: (code: string) =>
    `${BASE_URL}/auth/google/callback?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}`,  

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
};
