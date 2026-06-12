const TOKEN_KEY = "ops_access_token";
const TOKEN_EXPIRY_KEY = "ops_access_token_expiry";
const REFRESH_KEY = "ops_refresh_token";
const REFRESH_EXPIRY_KEY = "ops_refresh_token_expiry";
const DEVICE_ID_KEY = "hl_device_id";

export interface TokenPair {
  accessToken: { value: string; expiry: number };
  refreshToken: { value: string; expiry: number };
}

/** Store tokens returned by the backend */
export function saveTokens(tokens: TokenPair) {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken.value);
  // Backend returns expiry as epoch SECONDS — convert to millis for JS Date.now()
  localStorage.setItem(
    TOKEN_EXPIRY_KEY,
    String(tokens.accessToken.expiry * 1000),
  );
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken.value);
  localStorage.setItem(
    REFRESH_EXPIRY_KEY,
    String(tokens.refreshToken.expiry * 1000),
  );
}

/** Get the current access token (or null if missing/expired) */
export function getAccessToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  // expiry is epoch millis
  if (Date.now() >= Number(expiry)) return null;
  return token;
}

/** Get the refresh token (or null if missing/expired) */
export function getRefreshToken(): string | null {
  const token = localStorage.getItem(REFRESH_KEY);
  const expiry = localStorage.getItem(REFRESH_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() >= Number(expiry)) return null;
  return token;
}

/** Are we currently authenticated? */
export function isAuthenticated(): boolean {
  // Valid if we have an access token OR a refresh token (refresh can get a new access token)
  return getAccessToken() !== null || getRefreshToken() !== null;
}

/** Clear all stored tokens (logout) */
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(REFRESH_EXPIRY_KEY);
}

const DEVICE_ID_COOKIE_MAX_AGE = 2 * 365 * 24 * 60 * 60; // 2 years in seconds

function readDeviceIdCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${DEVICE_ID_KEY}=([^;]+)`),
  );
  return match ? match[1] : null;
}

function writeDeviceIdCookie(id: string) {
  document.cookie = `${DEVICE_ID_KEY}=${id}; max-age=${DEVICE_ID_COOKIE_MAX_AGE}; path=/; SameSite=Strict`;
}

/** Get or create a persistent device ID for this browser.
 *  Dual-written to localStorage + a long-lived cookie so either can survive being cleared. */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY) ?? readDeviceIdCookie();
  if (!id) {
    id = crypto.randomUUID();
  }
  localStorage.setItem(DEVICE_ID_KEY, id);
  writeDeviceIdCookie(id);
  return id;
}

/** Build the Google OAuth consent URL */
export function buildGoogleAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
