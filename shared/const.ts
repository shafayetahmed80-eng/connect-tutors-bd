export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const ADMIN_TWO_FACTOR_COOKIE_NAME = "connect-admin-2fa";
export const ADMIN_TWO_FACTOR_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

export const OAUTH_STATE_COOKIE = "__Host-oauth_state";
export const PENDING_ROLE_COOKIE = "connect-role";
export const PENDING_REDIRECT_COOKIE = "connect-redirect";
export type OAuthState = { redirectUri: string; nonce?: string };

export function encodeOAuthState(state: OAuthState): string {
  return btoa(JSON.stringify(state));
}

export function decodeOAuthState(encoded: string): OAuthState {
  return JSON.parse(atob(encoded)) as OAuthState;
}
