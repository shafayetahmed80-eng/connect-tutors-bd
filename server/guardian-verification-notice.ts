/**
 * What a Guardian is told when an Admin decides on their profile verification.
 *
 * Verified and rejected are decisions the Guardian needs to hear about; a
 * reset back to unverified is an Admin correcting themselves, so it says
 * nothing. The rejection reason is already shown on the Guardian's own
 * profile, so the message points there rather than repeating it.
 */
export function guardianVerificationNotice(status: "unverified" | "verified" | "rejected") {
  if (status === "verified") {
    return { title: "Your profile is verified", message: "An Admin has verified your profile." };
  }
  if (status === "rejected") {
    return { title: "Your profile verification was not approved", message: "Open your profile to see what to change." };
  }
  return null;
}
