import { describe, expect, it } from "vitest";
import { mayReadStorage, storageAccessFor } from "./storage-access";

describe("storageAccessFor", () => {
  it("keeps photos public and identity documents private", () => {
    for (const key of ["tutors/5/profile-photo_ab12.webp", "admins/2/avatar.png", "confirmation-letters/request-9/L1.pdf", "demo/x.jpg"]) expect(storageAccessFor(key)).toEqual({ visibility: "public" });
    expect(storageAccessFor("tutors/5/university-id_ab12cd34.jpg")).toEqual({ visibility: "private", ownerUserId: 5 });
    expect(storageAccessFor("/tutors/5/documents/nid_card_ab12.png")).toEqual({ visibility: "private", ownerUserId: 5 });
    expect(storageAccessFor("guardians/7/nid-front_ab.jpg")).toEqual({ visibility: "private", ownerUserId: 7 });
    expect(storageAccessFor("chat/tutor-1/1700000.png")).toEqual({ visibility: "private", tutorId: "tutor-1" });
  });
});

describe("mayReadStorage", () => {
  const doc = storageAccessFor("tutors/5/university-id_x.jpg");
  it("lets anyone read a public file", () => expect(mayReadStorage({ visibility: "public" }, null)).toBe(true));
  it("lets an Admin and the owner read, and no one else", () => {
    expect(mayReadStorage(doc, { id: 1, role: "admin" })).toBe(true);
    expect(mayReadStorage(doc, { id: 5, role: "tutor" })).toBe(true);
    expect(mayReadStorage(doc, { id: 6, role: "tutor" })).toBe(false);
    expect(mayReadStorage(doc, null)).toBe(false);
  });
  it("lets only an Admin or that Tutor read a chat attachment", () => {
    const chat = storageAccessFor("chat/tutor-1/1.png");
    expect(mayReadStorage(chat, { id: 9, role: "tutor" }, "tutor-1")).toBe(true);
    expect(mayReadStorage(chat, { id: 9, role: "tutor" }, "tutor-2")).toBe(false);
    expect(mayReadStorage(chat, { id: 9, role: "guardian" }, null)).toBe(false);
    expect(mayReadStorage(chat, { id: 1, role: "admin" })).toBe(true);
  });
});
