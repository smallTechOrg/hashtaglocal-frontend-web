export const BASE_URL = "https://staging.api.smalltech.in/local";

const API_V1_BASE = `${BASE_URL}/api/v1`;
const API_ROOT = `${BASE_URL}/api`;

export const API_PATHS = {
  issues: `${API_V1_BASE}/issues`,
  issue: (id: number | string) => `${API_V1_BASE}/issue/${id}`,
  polygons: `${API_ROOT}/localities/polygons`,
};
