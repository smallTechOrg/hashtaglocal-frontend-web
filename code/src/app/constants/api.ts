export const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

const API_V1_BASE = `${BASE_URL}/api/v1`;
const API_ROOT = `${BASE_URL}/api`;

export const API_PATHS = {
  issues: `${API_V1_BASE}/issues`,
  issue: (id: number | string) => `${API_V1_BASE}/issue/${id}`,
  events: `${API_V1_BASE}/events`,
  polygons: `${API_ROOT}/localities/polygons`,
  localityByCoords: (lat: number, lng: number) =>
    `${API_ROOT}/localities/hashtag?lat=${lat}&lng=${lng}`,
  reportIssue: `${API_V1_BASE}/issue`,
  mediaUploadUrl: (contentType: string) =>
    `${API_V1_BASE}/media/upload-url?content_type=${encodeURIComponent(contentType)}`,
};
