export const TUTOR_PORTAL_SESSION_STORAGE_KEY = "connect-tutors:tutor-portal-session";
export const TUTOR_PORTAL_GLOBAL_LOGOUT_EVENT_KEY = "connect-tutors:tutor-portal-logout";
export const TUTOR_PORTAL_LOGOUT_EVENT_KEY = TUTOR_PORTAL_GLOBAL_LOGOUT_EVENT_KEY;
export const TUTOR_PORTAL_SIGNED_OUT_NOTICE_KEY = "connect-tutors:tutor-signed-out-notice";
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

export function shouldEndTutorPortalSessionForLocation(location: string, token: string | null) {
  return Boolean(token) && !location.startsWith("/tutor/dashboard");
}

/** A newly issued proof survives only during the authenticated route transition. */
export function shouldDeferTutorPortalPublicExitForLoginHandoff(location: string, handoffActive: boolean) {
  const pathname = location.split("?", 1)[0];
  return handoffActive && ["/tutor/login", "/auth", "/login", "/become-tutor", "/join-tutor"].includes(pathname);
}

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

export function getCurrentTutorPortalToken() {
  if (typeof window === "undefined") return null;
  return getTutorPortalToken(window.sessionStorage);
}

export function storeCurrentTutorPortalToken(token: string) {
  if (typeof window === "undefined") return;
  storeTutorPortalToken(window.sessionStorage, token);
}

export function clearCurrentTutorPortalToken() {
  if (typeof window === "undefined") return;
  clearTutorPortalToken(window.sessionStorage);
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
