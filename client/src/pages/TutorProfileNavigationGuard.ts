export function shouldAllowTutorProfileNavigation(
  hasUnsavedChanges: boolean,
  confirmLeave: () => boolean,
) {
  return !hasUnsavedChanges || confirmLeave();
}

export function resolveTutorProfileHistoryNavigation(
  hasUnsavedChanges: boolean,
  confirmLeave: () => boolean,
) {
  return shouldAllowTutorProfileNavigation(hasUnsavedChanges, confirmLeave) ? "leave" : "restore";
}
