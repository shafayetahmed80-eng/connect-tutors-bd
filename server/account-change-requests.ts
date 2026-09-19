/**
 * The rules for asking for an account change, kept apart from the database so
 * every refusal can be tested on its own.
 */
import {
  ACCOUNT_CHANGE_NAME_MAX,
  ACCOUNT_CHANGE_NAME_MIN,
  ACCOUNT_CHANGE_REASON_MAX,
  ACCOUNT_CHANGE_REASON_MIN,
  accountChangeNeedsReason,
  accountChangeTypesFor,
  type AccountChangeRole,
  type AccountChangeType,
} from "@shared/account-change-requests";
import { normalizeBangladeshMobile } from "./guardian-intake.validation";

export type AccountChangeRefusal =
  | "not_offered"
  | "request_waiting"
  | "invalid_name"
  | "invalid_mobile"
  | "same_as_current"
  | "mobile_taken"
  | "reason_required"
  | "already_verified"
  | "nid_missing"
  | "live_tuition"
  | "nothing_to_withdraw";

export const accountChangeRefusalMessages: Record<AccountChangeRefusal, string> = {
  not_offered: "This change cannot be requested from this account.",
  request_waiting: "A request for this is already waiting. Withdraw it first.",
  invalid_name: `Enter a name of ${ACCOUNT_CHANGE_NAME_MIN} to ${ACCOUNT_CHANGE_NAME_MAX} characters.`,
  invalid_mobile: "Enter a Bangladesh mobile number, such as 01712345678.",
  same_as_current: "That is already the value on this account.",
  mobile_taken: "This mobile number is already used by another account.",
  reason_required: `Write a reason of at least ${ACCOUNT_CHANGE_REASON_MIN} characters.`,
  already_verified: "This profile is already verified.",
  nid_missing: "Upload both sides of your NID card on your Profile first.",
  live_tuition: "An Appointed or Confirmed tuition is still running on this account. It has to end before the account can be closed.",
  nothing_to_withdraw: "There is no request waiting to be withdrawn.",
};

export type AccountChangeContext = {
  role: AccountChangeRole;
  isOwner: boolean;
  currentName: string | null;
  currentMobile: string | null;
  /** The types that already have a request waiting. */
  waitingTypes: AccountChangeType[];
  /** Guardian only. */
  verification?: { status: "unverified" | "verified" | "rejected"; nidFrontUploaded: boolean; nidBackUploaded: boolean };
  /** An Appointed or Confirmed tuition the account owns or holds. */
  liveTuition: boolean;
};

export type AccountChangeAsk = { type: AccountChangeType; value?: string | null; reason?: string | null };

/**
 * Whether the account may ask for this, and the value to store if so - a
 * mobile number is stored in its canonical +880 form, so "01712345678" and
 * "+8801712345678" are one number. Whether another account already uses that
 * number is the caller's to check, against the database.
 */
export function checkAccountChange(context: AccountChangeContext, ask: AccountChangeAsk):
  | { allowed: true; requestedValue: string | null; currentValue: string | null; reason: string | null }
  | { allowed: false; reason: AccountChangeRefusal } {
  if (!accountChangeTypesFor(context.role, context.isOwner).includes(ask.type)) return { allowed: false, reason: "not_offered" };
  if (context.waitingTypes.includes(ask.type)) return { allowed: false, reason: "request_waiting" };

  const reason = ask.reason?.trim() || null;
  if (accountChangeNeedsReason(ask.type) && (!reason || reason.length < ACCOUNT_CHANGE_REASON_MIN)) return { allowed: false, reason: "reason_required" };
  const storedReason = reason ? reason.slice(0, ACCOUNT_CHANGE_REASON_MAX) : null;

  switch (ask.type) {
    case "name": {
      const name = ask.value?.trim().replace(/\s+/g, " ") ?? "";
      if (name.length < ACCOUNT_CHANGE_NAME_MIN || name.length > ACCOUNT_CHANGE_NAME_MAX) return { allowed: false, reason: "invalid_name" };
      if (name === (context.currentName ?? "").trim()) return { allowed: false, reason: "same_as_current" };
      return { allowed: true, requestedValue: name, currentValue: context.currentName, reason: storedReason };
    }
    case "mobile": {
      let mobile: string;
      try {
        mobile = normalizeBangladeshMobile(ask.value ?? "");
      } catch {
        return { allowed: false, reason: "invalid_mobile" };
      }
      let current: string | null = null;
      try {
        current = context.currentMobile ? normalizeBangladeshMobile(context.currentMobile) : null;
      } catch {
        current = context.currentMobile;
      }
      if (mobile === current) return { allowed: false, reason: "same_as_current" };
      return { allowed: true, requestedValue: mobile, currentValue: context.currentMobile, reason: storedReason };
    }
    case "verification": {
      if (context.verification?.status === "verified") return { allowed: false, reason: "already_verified" };
      if (!context.verification?.nidFrontUploaded || !context.verification?.nidBackUploaded) return { allowed: false, reason: "nid_missing" };
      return { allowed: true, requestedValue: null, currentValue: context.verification.status, reason: storedReason };
    }
    case "close_account": {
      if (context.liveTuition) return { allowed: false, reason: "live_tuition" };
      return { allowed: true, requestedValue: null, currentValue: null, reason: storedReason };
    }
  }
}

export type AccountChangeDecisionRefusal =
  | "not_found"
  | "already_decided"
  | "owner_only"
  | "decline_reason_required"
  | "mobile_taken"
  | "live_tuition"
  | "nid_missing";

export const accountChangeDecisionRefusalMessages: Record<AccountChangeDecisionRefusal, string> = {
  not_found: "This request was not found.",
  already_decided: "This request was already decided or withdrawn.",
  owner_only: "Only the Project Owner decides another Admin's request.",
  decline_reason_required: `Write a reason of at least ${ACCOUNT_CHANGE_REASON_MIN} characters.`,
  mobile_taken: "This mobile number is now used by another account. Decline the request instead.",
  live_tuition: "An Appointed or Confirmed tuition is still running on this account. It has to end before the account can be closed.",
  nid_missing: "Both sides of the NID card are no longer on the profile. Decline the request instead.",
};

/**
 * What the account hears about a decision. A verification is told through
 * the Guardian's verification notice instead, and a closed account cannot
 * sign in to read anything, so both have none here.
 */
export function accountChangeDecisionNotice(input: {
  type: AccountChangeType;
  decision: "approve" | "decline";
  requestedValue: string | null;
  declineReason?: string | null;
}): { title: string; message: string } | null {
  if (input.type === "verification") return null;
  if (input.decision === "decline") {
    const title = { name: "Name change declined", mobile: "Mobile number change declined", close_account: "Account delete declined" }[input.type];
    return { title, message: (input.declineReason ?? "").slice(0, 360) };
  }
  if (input.type === "name") return { title: "Name changed", message: `Your name is now ${input.requestedValue}.`.slice(0, 360) };
  if (input.type === "mobile") return { title: "Mobile number changed", message: `Your mobile number is now ${input.requestedValue}. Sign in with this number from now on.` };
  return null;
}
