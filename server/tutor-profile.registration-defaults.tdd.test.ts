import { describe, expect, it } from "vitest";
import * as db from "./db";

type RegistrationProfileDefaults = {
  name: string;
  phone: string;
  contactEmail: string;
  gender: "male" | "female";
  locationId: string;
  profileStatus: "draft";
};

type FutureRegistrationDefaultMapper = (input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  gender: "male" | "female";
  locationId: string;
}) => RegistrationProfileDefaults;

function getRegistrationDefaultMapper() {
  return (
    db as typeof db & {
      createTutorProfileDefaults?: FutureRegistrationDefaultMapper;
    }
  ).createTutorProfileDefaults;
}

describe("Tutor registration Profile defaults — TP-01 red test", () => {
  it("derives one private draft Profile from non-secret registration values only", () => {
    const createTutorProfileDefaults = getRegistrationDefaultMapper();
    const input = {
      name: "  Amina Rahman  ",
      email: "  AMINA@EXAMPLE.COM ",
      password: "strong-pass-123",
      confirmPassword: "strong-pass-123",
      phone: "+8801712345678",
      gender: "female" as const,
      locationId: "dhaka-city",
    };

    expect(createTutorProfileDefaults).toBeTypeOf("function");

    const defaults = createTutorProfileDefaults?.(input);
    expect(defaults).toEqual<RegistrationProfileDefaults>({
      name: "Amina Rahman",
      phone: "+8801712345678",
      contactEmail: "amina@example.com",
      gender: "female",
      locationId: "dhaka-city",
      profileStatus: "draft",
    });
    expect(defaults).not.toHaveProperty("password");
    expect(defaults).not.toHaveProperty("confirmPassword");
  });
});
