const JOB_ID_PATTERN = /^CT-JOB-\d{6}$/;

export function buildTutorApplyReturnPath(jobId: string) {
  if (!JOB_ID_PATTERN.test(jobId)) return null;
  return `/job-board?job=${jobId}`;
}

export function getSafeTutorApplyReturnPath(value?: string | null) {
  if (!value || !value.startsWith("/job-board?")) return null;

  const [pathname, query] = value.split("?");
  if (pathname !== "/job-board" || !query) return null;

  const parameters = new URLSearchParams(query);
  if (Array.from(parameters.keys()).length !== 1) return null;
  const jobId = parameters.get("job");
  return jobId && JOB_ID_PATTERN.test(jobId) ? buildTutorApplyReturnPath(jobId) : null;
}

export function buildTutorApplySignInPath(jobId: string) {
  const returnPath = buildTutorApplyReturnPath(jobId);
  return returnPath ? `/auth?role=tutor&returnTo=${encodeURIComponent(returnPath)}` : "/auth?role=tutor";
}

const TUTOR_APPLY_RETURN_STORAGE_KEY = "connect-tutors:tutor-apply-return";

export function buildTutorApplyProfilePath(returnTo?: string | null) {
  const safeReturnPath = getSafeTutorApplyReturnPath(returnTo);
  return safeReturnPath
    ? `/tutor/dashboard/profile?returnTo=${encodeURIComponent(safeReturnPath)}`
    : "/tutor/dashboard/profile";
}

export function buildTutorApplyJobBoardPath(returnTo?: string | null) {
  const safeReturnPath = getSafeTutorApplyReturnPath(returnTo);
  return safeReturnPath
    ? `/tutor/dashboard/jobs?returnTo=${encodeURIComponent(safeReturnPath)}`
    : "/tutor/dashboard/jobs";
}

export function getTutorApplyReturnFromLocation(location: string) {
  const publicReturnPath = getSafeTutorApplyReturnPath(location);
  if (publicReturnPath) return publicReturnPath;

  const [pathname, query] = location.split("?", 2);
  if ((pathname !== "/tutor/dashboard/profile" && pathname !== "/tutor/dashboard/jobs") || !query) return null;

  const parameters = new URLSearchParams(query.split("#", 1)[0]);
  if (Array.from(parameters.keys()).length !== 1) return null;
  const returnToValues = parameters.getAll("returnTo");
  return returnToValues.length === 1 ? getSafeTutorApplyReturnPath(returnToValues[0]) : null;
}

export function getTutorApplyPostLoginPath(profileStatus?: string | null, returnTo?: string | null) {
  const safeReturnPath = getSafeTutorApplyReturnPath(returnTo);
  if (!safeReturnPath) return "/tutor/dashboard";
  return profileStatus === "approved" ? buildTutorApplyJobBoardPath(safeReturnPath) : buildTutorApplyProfilePath(safeReturnPath);
}

export function storeTutorApplyReturnPath(storage: Storage, returnTo?: string | null) {
  const safeReturnPath = getSafeTutorApplyReturnPath(returnTo);
  if (!safeReturnPath) return null;
  try {
    storage.setItem(TUTOR_APPLY_RETURN_STORAGE_KEY, safeReturnPath);
    return safeReturnPath;
  } catch {
    return null;
  }
}

export function readStoredTutorApplyReturnPath(storage: Storage) {
  try {
    const safeReturnPath = getSafeTutorApplyReturnPath(storage.getItem(TUTOR_APPLY_RETURN_STORAGE_KEY));
    if (!safeReturnPath) storage.removeItem(TUTOR_APPLY_RETURN_STORAGE_KEY);
    return safeReturnPath;
  } catch {
    return null;
  }
}
