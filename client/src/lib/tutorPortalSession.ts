export const TUTOR_PORTAL_SESSION_STORAGE_KEY = "connect-tutors:tutor-portal-session";
export const TUTOR_PORTAL_GLOBAL_LOGOUT_EVENT_KEY = "connect-tutors:tutor-portal-logout";
export const TUTOR_PORTAL_LOGOUT_EVENT_KEY = TUTOR_PORTAL_GLOBAL_LOGOUT_EVENT_KEY;
export const TUTOR_PORTAL_SIGNED_OUT_NOTICE_KEY = "connect-tutors:tutor-signed-out-notice";
export const TUTOR_PORTAL_REAUTH_NOTICE_KEY = "connect-tutors:tutor-portal-reauth-notice";
export const TUTOR_PORTAL_LOGIN_HANDOFF_KEY = "connect-tutors:tutor-login-handoff";
const TUTOR_PORTAL_RENEWAL_INTERVAL_MS = 20_000;

type SessionStorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;
type StorageEventTargetLike = {
  addEventListener: (type: "storage", listener: (event: { key: string | null }) => void) => void;
  removeEventListener: (type: "storage", listener: (event: { key: string | null }) => void) => void;
};

function isSafeTutorPortalToken(value: string) {
  return value.trim().length > 0 && value.trim().length <= 512;
}

export function getTutorPortalToken(storage: Pick<Storage, "getItem">) {
  const value = storage.getItem(TUTOR_PORTAL_SESSION_STORAGE_KEY);
  return value && isSafeTutorPortalToken(value) ? value : null;
}

export function shouldRequireTutorPortalSignIn(role: string | null | undefined, token: string | null) {
  return role === "tutor" && !token;
}

/*
 * There is deliberately no "this location ends the session" rule here any
 * more. Reading the Job Board, or following a link to the home page, used to
 * revoke the portal proof the moment the route left /tutor/dashboard - and
 * since the account cookie stayed valid, the Tutor was left signed in to the
 * site but signed out of their own panel, with no idea why. It also fought
 * the TTL directly: that was raised to a year so that "only an explicit
 * sign-out ends a session", which this rule then quietly contradicted.
 *
 * What the proof protects is unchanged. A session cookie taken on its own
 * still cannot open the Tutor Dashboard, because the paired token never
 * leaves the browser that signed in - and that is just as true while the
 * Tutor is reading a public page.
 */

export function getTutorPortalRenewalIntervalMs() {
  return TUTOR_PORTAL_RENEWAL_INTERVAL_MS;
}

export function storeTutorPortalToken(storage: SessionStorageLike, token: string) {
  if (!isSafeTutorPortalToken(token)) return;
  storage.setItem(TUTOR_PORTAL_SESSION_STORAGE_KEY, token);
}

export function clearTutorPortalToken(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(TUTOR_PORTAL_SESSION_STORAGE_KEY);
}

export function markTutorPortalLoginHandoff(storage: Pick<Storage, "setItem">) {
  storage.setItem(TUTOR_PORTAL_LOGIN_HANDOFF_KEY, "1");
}

export function clearTutorPortalLoginHandoff(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(TUTOR_PORTAL_LOGIN_HANDOFF_KEY);
}

export function isTutorPortalLoginHandoffActive(storage: Pick<Storage, "getItem">) {
  return storage.getItem(TUTOR_PORTAL_LOGIN_HANDOFF_KEY) === "1";
}

export function markTutorSignedOutNotice(storage: Pick<Storage, "setItem">) {
  storage.setItem(TUTOR_PORTAL_SIGNED_OUT_NOTICE_KEY, "1");
}

export function consumeTutorSignedOutNotice(storage: Pick<Storage, "getItem" | "removeItem">) {
  const shouldShowNotice = storage.getItem(TUTOR_PORTAL_SIGNED_OUT_NOTICE_KEY) === "1";
  storage.removeItem(TUTOR_PORTAL_SIGNED_OUT_NOTICE_KEY);
  return shouldShowNotice;
}

/** Set when a Tutor lands on a protected route in a tab that has no portal proof yet. */
export function markTutorPortalReauthNotice(storage: Pick<Storage, "setItem">) {
  storage.setItem(TUTOR_PORTAL_REAUTH_NOTICE_KEY, "1");
}

export function consumeTutorPortalReauthNotice(storage: Pick<Storage, "getItem" | "removeItem">) {
  const shouldShowNotice = storage.getItem(TUTOR_PORTAL_REAUTH_NOTICE_KEY) === "1";
  storage.removeItem(TUTOR_PORTAL_REAUTH_NOTICE_KEY);
  return shouldShowNotice;
}

/**
 * The proof itself lives in `localStorage`, not `sessionStorage`.
 *
 * Per-tab storage meant a second tab, or reopening the browser, looked like an
 * unauthenticated visit even though the account cookie was still valid - the
 * Tutor was sent back to sign-in without ever having signed out.
 *
 * Against the threat this proof exists for - a session cookie taken on its own,
 * away from the browser it was issued to - `localStorage` is just as effective:
 * the attacker still holds no token. It concedes nothing to XSS either, which
 * could read either store.
 *
 * The markers below stay per-tab on purpose. They describe one tab's journey,
 * not who is signed in.
 */
export function getCurrentTutorPortalToken() {
  if (typeof window === "undefined") return null;
  return getTutorPortalToken(window.localStorage);
}

export function storeCurrentTutorPortalToken(token: string) {
  if (typeof window === "undefined") return;
  storeTutorPortalToken(window.localStorage, token);
}

export function clearCurrentTutorPortalToken() {
  if (typeof window === "undefined") return;
  clearTutorPortalToken(window.localStorage);
}

export function markCurrentTutorPortalLoginHandoff() {
  if (typeof window === "undefined") return;
  markTutorPortalLoginHandoff(window.sessionStorage);
}

export function clearCurrentTutorPortalLoginHandoff() {
  if (typeof window === "undefined") return;
  clearTutorPortalLoginHandoff(window.sessionStorage);
}

export function isCurrentTutorPortalLoginHandoffActive() {
  if (typeof window === "undefined") return false;
  return isTutorPortalLoginHandoffActive(window.sessionStorage);
}

export function markCurrentTutorSignedOutNotice() {
  if (typeof window === "undefined") return;
  markTutorSignedOutNotice(window.sessionStorage);
}

export function consumeCurrentTutorSignedOutNotice() {
  if (typeof window === "undefined") return false;
  return consumeTutorSignedOutNotice(window.sessionStorage);
}

export function markCurrentTutorPortalReauthNotice() {
  if (typeof window === "undefined") return;
  markTutorPortalReauthNotice(window.sessionStorage);
}

export function consumeCurrentTutorPortalReauthNotice() {
  if (typeof window === "undefined") return false;
  return consumeTutorPortalReauthNotice(window.sessionStorage);
}

export function broadcastTutorPortalLogout() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TUTOR_PORTAL_GLOBAL_LOGOUT_EVENT_KEY, String(Date.now()));
}

export function subscribeToTutorPortalGlobalLogout(
  eventTarget: StorageEventTargetLike,
  onLogout: () => void,
) {
  const listener = (event: { key: string | null }) => {
    if (event.key === TUTOR_PORTAL_GLOBAL_LOGOUT_EVENT_KEY) onLogout();
  };
  eventTarget.addEventListener("storage", listener);
  return () => eventTarget.removeEventListener("storage", listener);
}
