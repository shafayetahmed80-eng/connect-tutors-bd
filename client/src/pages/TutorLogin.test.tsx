// @vitest-environment jsdom

import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { loginTutor, completeTutorLoginHandoff } = vi.hoisted(() => ({
  loginTutor: vi.fn(),
  completeTutorLoginHandoff: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { fetch: vi.fn() } } }),
    auth: {
      me: { useQuery: () => ({ data: null, isLoading: false }) },
      loginTutor: { useMutation: () => ({ mutateAsync: loginTutor, isPending: false }) },
    },
  },
}));

vi.mock("@/lib/tutorPortalSession", () => ({
  clearCurrentTutorPortalLoginHandoff: vi.fn(),
  clearCurrentTutorPortalToken: vi.fn(),
  consumeCurrentTutorSignedOutNotice: () => false,
  getCurrentTutorPortalToken: () => null,
  markCurrentTutorPortalLoginHandoff: vi.fn(),
  storeCurrentTutorPortalToken: vi.fn(),
}));

vi.mock("@/lib/tutorLoginHandoff", () => ({
  completeTutorLoginHandoff,
}));

vi.mock("@/components/SiteHeader", () => ({
  default: () => null,
}));

import TutorLogin from "./TutorLogin";

afterEach(() => {
  cleanup();
  loginTutor.mockReset();
  completeTutorLoginHandoff.mockReset();
});

describe("Tutor sign-in transition", () => {
  it("does not offer a direct homepage-return link from the Tutor sign-in form", () => {
    render(<TutorLogin />);

    expect(screen.queryByRole("link", { name: "Return to homepage" })).toBeNull();
  });

  it("warns that Caps Lock is on while a Tutor password is being entered", () => {
    render(<TutorLogin />);

    const password = screen.getByLabelText(/Password/);
    const keyDown = createEvent.keyDown(password, { key: "A" });
    Object.defineProperty(keyDown, "getModifierState", {
      value: (key: string) => key === "CapsLock",
    });
    fireEvent(password, keyDown);

    expect(screen.getByRole("status").textContent).toContain("Caps Lock is on.");
    fireEvent.blur(password);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the Tutor sign-in password visibility control accessible", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorLogin />);

    const password = screen.getByLabelText(/Password/) as HTMLInputElement;
    expect(password.type).toBe("password");
    expect(password.autocomplete).toBe("current-password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).not.toBeNull();
  });

  it("replaces the form with accessible Dashboard-entry feedback while the hand-off is pending", async () => {
    const user = userEvent.setup({ document: window.document });
    loginTutor.mockResolvedValue({ tutorPortalToken: "tab-local-proof" });
    completeTutorLoginHandoff.mockImplementation(() => new Promise(() => undefined));
    render(<TutorLogin />);

    await user.type(screen.getByLabelText(/Email address/), "tutor@example.com");
    await user.type(screen.getByLabelText(/Password/), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in to Tutor Dashboard" }));

    expect(await screen.findByRole("status", { name: "Preparing your Tutor workspace" })).not.toBeNull();
    expect(screen.getByText("Preparing your Tutor Dashboard…")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Sign in to Tutor Dashboard" })).toBeNull();
  });
});
