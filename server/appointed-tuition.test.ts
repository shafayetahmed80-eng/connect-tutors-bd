import { describe, expect, it } from "vitest";
import {
  appointmentConfirmedTutorNotification,
  appointmentEndedTutorNotification,
  canReopenAppointedTuition,
  canReopenConfirmedTuition,
  tuitionCancelledTutorNotification,
} from "./appointed-tuition";

describe("sending a tuition back to Live", () => {
  it("is only for an Appointed tuition - the one with a Tutor to remove", () => {
    expect(canReopenAppointedTuition("appointed")).toBe(true);
    for (const lifecycle of ["pending", "live", "confirmed", "cancelled"] as const) {
      expect(canReopenAppointedTuition(lifecycle), lifecycle).toBe(false);
    }
  });

  it("takes a Confirmed tuition back only through its own removal", () => {
    expect(canReopenConfirmedTuition("confirmed")).toBe(true);
    for (const lifecycle of ["pending", "live", "appointed", "cancelled"] as const) {
      expect(canReopenConfirmedTuition(lifecycle), lifecycle).toBe(false);
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

describe("when an Admin cancels a tuition", () => {
  it("tells its Tutor which job ended, and keeps the Admin's reason out of it", () => {
    const note = tuitionCancelledTutorNotification("6812");
    expect(note.title).toBe("Your tuition 6812 has been cancelled");
    expect(note.message).not.toMatch(/because|reason|decided/i);
  });
});
