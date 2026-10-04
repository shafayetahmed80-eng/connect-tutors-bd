import { LOGIN_TWO_FACTOR_REQUIRED_ERR_MSG } from "@shared/const";

/** A Tutor or Guardian whose browser still owes the sign-in SMS code is sent to give it, then brought back here. */
export function sendToLoginCodeIfOwed(error: unknown, location: Pick<Location, "pathname" | "search" | "assign"> = window.location) {
  if (!(error instanceof Error) || !error.message.includes(LOGIN_TWO_FACTOR_REQUIRED_ERR_MSG)) return;
  if (location.pathname === "/login-verify") return;
  location.assign(`/login-verify?next=${encodeURIComponent(location.pathname + location.search)}`);
}
