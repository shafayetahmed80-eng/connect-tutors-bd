/**
 * Who may read a stored file.
 *
 * `/manus-storage/<key>` used to hand any stored file to anyone who knew the
 * path. Profile photos are meant to be seen, but identity documents are not: a
 * University ID, an NID card or a certificate, a Guardian's NID, and a chat
 * attachment are private to the person they belong to and to the Admins.
 */
export type StorageAccess =
  | { visibility: "public" }
  | { visibility: "private"; ownerUserId?: number; tutorId?: string };

export function storageAccessFor(key: string): StorageAccess {
  const k = key.replace(/^\/+/, "");
  const tutorDocument = k.match(/^tutors\/(\d+)\/(?:university-id[^/]*|documents\/[^/]+)$/);
  if (tutorDocument) return { visibility: "private", ownerUserId: Number(tutorDocument[1]) };
  const guardianNid = k.match(/^guardians\/(\d+)\/nid-[^/]+$/);
  if (guardianNid) return { visibility: "private", ownerUserId: Number(guardianNid[1]) };
  const chat = k.match(/^chat\/([^/]+)\/[^/]+$/);
  if (chat) return { visibility: "private", tutorId: chat[1] };
  return { visibility: "public" };
}

/** An Admin may read any private file; anyone else only their own. `ownTutorId` is the Tutor id behind the signed-in account, if any. */
export function mayReadStorage(
  access: StorageAccess,
  viewer: { id: number; role: string } | null,
  ownTutorId: string | null = null,
): boolean {
  if (access.visibility === "public") return true;
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  if (access.ownerUserId !== undefined) return access.ownerUserId === viewer.id;
  if (access.tutorId !== undefined) return viewer.role === "tutor" && ownTutorId === access.tutorId;
  return false;
}
