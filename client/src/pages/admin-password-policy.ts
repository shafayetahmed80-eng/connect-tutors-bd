export const adminPasswordPolicy = {
  title: "Password strength policy",
  required: [
    "Use 8–128 characters.",
    "Enter the same password in both fields.",
  ],
  recommended: "For stronger protection, use 12+ characters with a mix of letters, numbers, and symbols.",
} as const;

export type AdminPasswordFeedback = {
  lengthMet: boolean;
  confirmationMet: boolean;
  meetsMinimum: boolean;
  strength: "Too short" | "Too long" | "Basic" | "Good" | "Strong";
};

export function getAdminPasswordFeedback(password: string, confirmation: string): AdminPasswordFeedback {
  const lengthMet = password.length >= 8 && password.length <= 128;
  const confirmationMet = password.length > 0 && password === confirmation;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const characterGroups = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  const strength = password.length < 8
    ? "Too short"
    : password.length > 128
      ? "Too long"
      : password.length >= 10 && characterGroups >= 3
        ? "Strong"
        : characterGroups >= 2
          ? "Good"
          : "Basic";

  return {
    lengthMet,
    confirmationMet,
    meetsMinimum: lengthMet && confirmationMet,
    strength,
  };
}
