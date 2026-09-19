/**
 * Changes an account asks for from its Settings page, and who may ask for
 * which. Password is not here - it is self-service. The Project Owner asks
 * for nothing: they change their own name and mobile directly, and their
 * account can never be closed.
 */
export type AccountChangeRole = "guardian" | "tutor" | "admin";
export type AccountChangeType = "name" | "mobile" | "verification" | "close_account";
export type AccountChangeStatus = "pending" | "approved" | "declined" | "withdrawn";

export const accountChangeTypeValues = ["name", "mobile", "verification", "close_account"] as const satisfies readonly AccountChangeType[];

export const accountChangeTypeLabels: Record<AccountChangeType, string> = {
  name: "Name change",
  mobile: "Mobile number change",
  verification: "Profile verification",
  close_account: "Account delete",
};

export const ACCOUNT_CHANGE_NAME_MIN = 2;
export const ACCOUNT_CHANGE_NAME_MAX = 120;
export const ACCOUNT_CHANGE_REASON_MIN = 3;
export const ACCOUNT_CHANGE_REASON_MAX = 280;

/**
 * What each account may ask for. A Tutor's verification is the profile review
 * they submit from the Profile tab, so it is not a request here.
 */
export function accountChangeTypesFor(role: AccountChangeRole, isOwner: boolean): AccountChangeType[] {
  if (role === "guardian") return ["name", "mobile", "verification", "close_account"];
  if (role === "tutor") return ["name", "mobile", "close_account"];
  return isOwner ? [] : ["name", "mobile", "close_account"];
}

/** Closing an account needs a reason; so does nothing else. */
export function accountChangeNeedsReason(type: AccountChangeType) {
  return type === "close_account";
}

/** Only a name and a mobile number carry a new value. */
export function accountChangeCarriesValue(type: AccountChangeType) {
  return type === "name" || type === "mobile";
}
