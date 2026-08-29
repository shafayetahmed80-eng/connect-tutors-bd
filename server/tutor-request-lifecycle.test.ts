import { describe, expect, it } from "vitest";

import { getGuardianRequestLifecycle } from "./tutor-request-lifecycle";

describe("Guardian request lifecycle projection", () => {
  it("projects the five approved Guardian-facing stages with terminal cancellation precedence", () => {
    expect(getGuardianRequestLifecycle({
      status: "new",
      publicationState: "submitted",
      tutorId: null,
      appointmentConfirmedAt: null,
    })).toBe("pending");

    expect(getGuardianRequestLifecycle({
      status: "reviewing",
      publicationState: "published",
      tutorId: null,
      appointmentConfirmedAt: null,
    })).toBe("live");

    expect(getGuardianRequestLifecycle({
      status: "matched",
      publicationState: "published",
      tutorId: "T-1503",
      appointmentConfirmedAt: null,
    })).toBe("appointed");

    expect(getGuardianRequestLifecycle({
      status: "matched",
      publicationState: "published",
      tutorId: "T-1503",
      appointmentConfirmedAt: new Date("2026-08-23T00:00:00.000Z"),
    })).toBe("confirmed");

    expect(getGuardianRequestLifecycle({
      status: "closed",
      publicationState: "published",
      tutorId: "T-1503",
      appointmentConfirmedAt: new Date("2026-08-23T00:00:00.000Z"),
    })).toBe("cancelled");
  });
});
