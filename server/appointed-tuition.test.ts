import { describe, expect, it } from "vitest";
import {
  appointmentConfirmedTutorNotification,
  appointmentEndedTutorNotification,
  canReopenAppointedTuition,
} from "./appointed-tuition";

describe("sending a tuition back to Live", () => {
  it("is only for an Appointed tuition - the one with a Tutor to remove", () => {
    expect(canReopenAppointedTuition("appointed")).toBe(true);
    for (const lifecycle of ["pending", "live", "confirmed", "cancelled"] as const) {
      expect(canReopenAppointedTuition(lifecycle), lifecycle).toBe(false);
    }
  });
});

describe("what the Tutor is told after the demo class", () => {
  it("names the job either way, and gives no reason that was never recorded", () => {
    expect(appointmentConfirmedTutorNotification("6812")).toEqual({
      title: "Your appointment to 6812 is confirmed",
      message: "The Guardian is continuing with you after the demo class.",
    });
    const ended = appointmentEndedTutorNotification("6812");
    expect(ended.title).toBe("Your appointment to 6812 has ended");
    expect(ended.message).not.toMatch(/because|decided/i);
  });
});
