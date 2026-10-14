/**
 * Robust LocalStorage / SessionStorage Form Draft Persistence Utility
 * 
 * Provides fail-safe saving, reading, clearing, and visual notification for form drafts.
 */

export function saveStorageDraft<T>(key: string, data: T): boolean {
  try {
    const payload = JSON.stringify({
      data,
      savedAt: Date.now(),
    });
    window.localStorage.setItem(key, payload);
    try {
      window.sessionStorage.setItem(key, payload);
    } catch {
      // sessionStorage failure is non-fatal
    }
    return true;
  } catch {
    return false;
  }
}

export function readStorageDraft<T>(key: string): T | null {
  try {
    let raw = window.localStorage.getItem(key);
    if (!raw) {
      raw = window.sessionStorage.getItem(key);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      return parsed.data as T;
    }
    // Backward compatibility for raw unnested JSON drafts
    return parsed as T;
  } catch {
    return null;
  }
}

export function removeStorageDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore error
  }
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore error
  }
}

export const DRAFT_STORAGE_KEYS = {
  TUTOR_REGISTRATION: "connect-tutors:draft:tutor-registration",
  GUARDIAN_JOURNEY_GUEST: "connect-tutors:draft:guardian-journey:guest",
  ADMIN_ADD_TUITION: "connect-tutors:draft:admin-add-tuition",
} as const;
