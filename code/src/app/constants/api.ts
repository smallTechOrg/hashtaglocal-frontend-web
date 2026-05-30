export const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

const API_V1_BASE = `${BASE_URL}/api/v1`;
const API_ROOT = `${BASE_URL}/api`;

export const API_PATHS = {
  issues: `${API_V1_BASE}/issues`,
  issue: (id: number | string) => `${API_V1_BASE}/issue/${id}`,
  events: `${API_V1_BASE}/events`,
  polygons: `${API_ROOT}/localities/polygons`,
  profile: `${BASE_URL}/account/profile`,
  reportIssue: `${API_V1_BASE}/issue`,
  mediaUploadUrl: (contentType: string) =>
    `${API_V1_BASE}/media/upload-url?content_type=${encodeURIComponent(contentType)}`,

  // Feed / broadcast channel
  feed: `${API_V1_BASE}/feed`,
  feedTimeline: (hashtag: string, cursor?: string, limit?: number) => {
    const params = new URLSearchParams({ hashtag });
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    return `${API_V1_BASE}/feed?${params.toString()}`;
  },
  feedPost: (id: number | string) => `${API_V1_BASE}/feed/${id}`,

  // Admin feed moderation (under /admin, ADMIN role)
  feedModerationQueue: (verdict?: string, cursor?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (verdict) params.set("verdict", verdict);
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return `${BASE_URL}/admin/feed/moderation${qs ? `?${qs}` : ""}`;
  },
  feedApprove: (id: number) => `${BASE_URL}/admin/feed/${id}/approve`,
  feedHide: (id: number) => `${BASE_URL}/admin/feed/${id}/hide`,
  feedPin: (id: number) => `${BASE_URL}/admin/feed/${id}`,
  feedAdminCreate: `${BASE_URL}/admin/feed`,
};
