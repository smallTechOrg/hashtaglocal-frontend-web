import { ADMIN_API } from "./constants";
import { getAccessToken, getRefreshToken, saveTokens, clearTokens, getOrCreateDeviceId } from "./auth";

/**
 * Authenticated fetch wrapper for admin API calls.
 * Automatically attaches Authorization header and handles 401 with token refresh.
 */
export async function adminFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let token = getAccessToken();

  // If access token expired, try refreshing first
  if (!token) {
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      // Can't refresh — redirect to login
      clearTokens();
      window.location.href = "/ops";
      throw new Error("Session expired");
    }
    token = getAccessToken();
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });

  // If 401, try refresh once and retry
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      clearTokens();
      window.location.href = "/ops";
      throw new Error("Session expired");
    }
    const newToken = getAccessToken();
    headers.set("Authorization", `Bearer ${newToken}`);
    return fetch(url, { ...options, headers });
  }

  return response;
}

/** Try to refresh the access token using the stored refresh token */
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(ADMIN_API.refreshToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken, device_id: getOrCreateDeviceId() }),
    });

    if (!res.ok) return false;

    const json = await res.json();
    const data = json.data;
    saveTokens({
      accessToken: { value: data.access_token.value, expiry: data.access_token.expiry },
      refreshToken: { value: data.refresh_token.value, expiry: data.refresh_token.expiry },
    });
    return true;
  } catch {
    return false;
  }
}
