/**
 * What a Guardian or Tutor reads when an Admin-issued reset link cannot be
 * used. Shared so the page and the server say the same thing.
 */
export const PASSWORD_RESET_LINK_MESSAGES = {
  expired: "This reset link has expired. Ask Connect Tutors support on WhatsApp for a new one.",
  used: "This reset link has already been used. Sign in with your new password, or ask support for a new link.",
  invalid: "This reset link is not valid. Ask Connect Tutors support on WhatsApp for a new one.",
} as const;

export type PasswordResetLinkProblem = keyof typeof PASSWORD_RESET_LINK_MESSAGES;

/** The shape of the token in a reset link: 64 hex characters. */
export const PASSWORD_RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
