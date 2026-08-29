import type { TrpcContext } from "./_core/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

const guardianUser = {
  id: 710,
  openId: "password:guardian:rahima@example.com",
  email: "rahima@example.com",
  name: "Rahima Begum",
  passwordHash: "scrypt$private",
  loginMethod: "password",
  role: "guardian" as const,
  accountStatus: "active" as const,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  lastSignedIn: new Date("2026-08-01T00:00:00.000Z"),
};

function guardianContext(): TrpcContext {
  return {
    user: guardianUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => vi.restoreAllMocks());

describe("Guardian core workspace procedures", () => {
  it("returns a stable opaque Guardian ID and never a database key as the public identity value", async () => {
    vi.spyOn(db, "getGuardianProfileByUserId").mockResolvedValue({
      userId: guardianUser.id,
      guardianId: "GD-8K4M29",
      phone: "+8801712345678",
      gender: "female",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
      termsVersion: "guardian-v1",
      createdAt: guardianUser.createdAt,
      updatedAt: guardianUser.updatedAt,
      name: guardianUser.name,
      email: guardianUser.email,
      accountCreatedAt: guardianUser.createdAt,
    });

    const result = await appRouter.createCaller(guardianContext()).guardianProfile.me();

    expect(result).toMatchObject({ guardianId: "GD-8K4M29", name: "Rahima Begum", email: "rahima@example.com" });
    expect(result.guardianId).not.toBe(String(guardianUser.id));
    expect(result.accountCreatedAt).toEqual(guardianUser.createdAt);
  });

  it("allows a Guardian to update only their own approved non-login profile fields", async () => {
    const helpers = db as typeof db & {
      updateGuardianProfileByUserId: (input: {
        userId: number;
        name: string;
        gender: "male" | "female";
        cityLocationId: string;
        locationId: string;
      }) => Promise<{ updated: true }>;
    };
    const updateGuardianProfileByUserId = vi.spyOn(helpers, "updateGuardianProfileByUserId").mockResolvedValue({ updated: true });

    await expect(appRouter.createCaller(guardianContext()).guardianProfile.update({
      name: "Rahima Akter",
      gender: "female",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
    })).resolves.toEqual({ updated: true });

    expect(updateGuardianProfileByUserId).toHaveBeenCalledWith({
      userId: guardianUser.id,
      name: "Rahima Akter",
      gender: "female",
      cityLocationId: "dhaka-city",
      locationId: "mirpur-10",
    });
  });

  it("requires the current password before changing a Guardian password and never returns password material", async () => {
    const helpers = db as typeof db & {
      changeGuardianPasswordByUserId: (input: { userId: number; currentPassword: string; newPassword: string }) => Promise<"changed" | "invalid-current-password">;
    };
    const changeGuardianPasswordByUserId = vi.spyOn(helpers, "changeGuardianPasswordByUserId").mockResolvedValue("changed");

    const result = await appRouter.createCaller(guardianContext()).guardianProfile.changePassword({
      currentPassword: "current-pass-123",
      newPassword: "new-pass-456",
      confirmNewPassword: "new-pass-456",
    });

    expect(result).toEqual({ changed: true });
    expect(changeGuardianPasswordByUserId).toHaveBeenCalledWith({
      userId: guardianUser.id,
      currentPassword: "current-pass-123",
      newPassword: "new-pass-456",
    });
    expect(result).not.toHaveProperty("password");
  });
});
