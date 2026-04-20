export const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

const API_V1_BASE = `${BASE_URL}/api/v1`;
const API_ROOT = `${BASE_URL}/api`;

export const API_PATHS = {
  issues: `${API_V1_BASE}/issues`,
  issue: (id: number | string) => `${API_V1_BASE}/issue/${id}`,
  issueStories: (locality: string) =>
    `${API_V1_BASE}/issues/stories?locality=${locality}`,
  polygons: `${API_ROOT}/localities/polygons`,
};
