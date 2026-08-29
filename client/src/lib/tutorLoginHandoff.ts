export type FreshTutorAuthIdentity = {
  id: number;
  name: string | null;
  role: "guardian" | "tutor" | "admin" | "user";
  accountStatus: "active" | "suspended" | "closed";
} | null;

type TutorLoginHandoffOptions = {
  tutorPortalToken: string;
  storeTutorPortalToken: (token: string) => void;
  markPortalLoginHandoff: () => void;
  clearTutorPortalToken: () => void;
  clearPortalLoginHandoff: () => void;
  fetchAuthenticatedUser: () => Promise<FreshTutorAuthIdentity>;
  navigate: (destination: string) => void;
};

/** Establishes tab proof and fresh shared identity before entering the protected Tutor route. */
export async function completeTutorLoginHandoff({
  tutorPortalToken,
  storeTutorPortalToken,
  markPortalLoginHandoff,
  clearTutorPortalToken,
  clearPortalLoginHandoff,
  fetchAuthenticatedUser,
  navigate,
}: TutorLoginHandoffOptions) {
  storeTutorPortalToken(tutorPortalToken);
  markPortalLoginHandoff();

  try {
    const authenticatedUser = await fetchAuthenticatedUser();
    if (authenticatedUser?.role !== "tutor") {
      throw new Error("This account is not a Tutor account.");
    }
    navigate("/tutor/dashboard");
  } catch (error) {
    clearTutorPortalToken();
    clearPortalLoginHandoff();
    throw error;
  }
}
