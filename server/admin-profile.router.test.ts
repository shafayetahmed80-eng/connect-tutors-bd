import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ getAdminProfileByUserId: vi.fn(), updateAdminProfileByUserId: vi.fn() }));
const imageMocks = vi.hoisted(() => ({ getAdminProfileImageUrls: vi.fn() }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});
vi.mock("./admin-profile-image", () => imageMocks);

import { ENV } from "./_core/env";
import { TutorRequestLocationError } from "./db";
import { appRouter } from "./routers";

const owner = {
  id: 42, openId: ENV.ownerOpenId, email: "owner@example.com", name: "Owner",
  passwordHash: null, loginMethod: "oauth", role: "admin" as const, accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const otherAdmin = { ...owner, id: 43, openId: "another-admin" };

function createCaller(user: TrpcContext["user"] = owner) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

const profile = { userId: 43, name: "Nadia", email: "nadia@example.com", loginId: "nadia", isOwner: false };
const images = { photo: "https://signed/photo", nidFront: null, nidBack: null };

afterEach(() => vi.clearAllMocks());

describe("adminProfile", () => {
  it("gives every Admin their own profile and images", async () => {
    dbMocks.getAdminProfileByUserId.mockResolvedValue(profile);
    imageMocks.getAdminProfileImageUrls.mockResolvedValue(images);

    await expect(createCaller(otherAdmin).adminProfile.me()).resolves.toEqual(profile);
    expect(dbMocks.getAdminProfileByUserId).toHaveBeenCalledWith(43);
    await expect(createCaller(otherAdmin).adminProfile.images()).resolves.toEqual(images);
    expect(imageMocks.getAdminProfileImageUrls).toHaveBeenCalledWith({ userId: 43 });
  });

  it("keeps another Admin's name and mobile as they are - those are asked for from Settings", async () => {
    dbMocks.updateAdminProfileByUserId.mockResolvedValue({ updated: true });
    dbMocks.getAdminProfileByUserId.mockResolvedValue({ ...profile, isOwner: false, phone: "+8801700000000" });

    await createCaller(otherAdmin).adminProfile.update({ name: "Someone Else", phone: "01999999999", designation: "Coordinator" });
    expect(dbMocks.updateAdminProfileByUserId).toHaveBeenCalledWith(expect.objectContaining({
      userId: 43, name: "Nadia", phone: "+8801700000000", designation: "Coordinator",
    }));
  });

  it("saves the Owner's own profile, turning a blank into a cleared field", async () => {
    dbMocks.updateAdminProfileByUserId.mockResolvedValue({ updated: true });
    dbMocks.getAdminProfileByUserId.mockResolvedValue({ ...profile, isOwner: true });

    await createCaller(otherAdmin).adminProfile.update({
      name: "  Nadia Rahman ", phone: " 01711111111 ", additionalPhone: "", gender: null,
      religion: "Islam", nationality: "", cityLocationId: "", locationId: "", designation: "Coordinator",
    });
    expect(dbMocks.updateAdminProfileByUserId).toHaveBeenCalledWith(expect.objectContaining({
      userId: 43, name: "Nadia Rahman", phone: "01711111111", additionalPhone: null, gender: null,
      religion: "Islam", nationality: null, cityLocationId: null, locationId: null, designation: "Coordinator",
    }));
  });

  it("refuses a name too short, a religion off the list, and a location outside its City", async () => {
    await expect(createCaller().adminProfile.update({ name: "N" })).rejects.toThrow();
    await expect(createCaller().adminProfile.update({ name: "Nadia", religion: "Something else" })).rejects.toThrow();
    expect(dbMocks.updateAdminProfileByUserId).not.toHaveBeenCalled();

    dbMocks.updateAdminProfileByUserId.mockRejectedValueOnce(new TutorRequestLocationError());
    await expect(createCaller().adminProfile.update({ name: "Nadia", cityLocationId: "dhaka" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("lets the Project Owner read another Admin's profile, and nobody else", async () => {
    dbMocks.getAdminProfileByUserId.mockResolvedValue(profile);
    imageMocks.getAdminProfileImageUrls.mockResolvedValue(images);

    await expect(createCaller().adminProfile.view({ userId: 43 })).resolves.toEqual({ profile, images });
    await expect(createCaller(otherAdmin).adminProfile.view({ userId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    dbMocks.getAdminProfileByUserId.mockResolvedValueOnce(undefined);
    await expect(createCaller().adminProfile.view({ userId: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is not a Guardian's", async () => {
    const guardian = { ...owner, role: "guardian" as const };
    await expect(createCaller(guardian).adminProfile.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller(guardian).adminProfile.update({ name: "Nadia" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
