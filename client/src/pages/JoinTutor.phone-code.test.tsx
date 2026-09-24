// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TRPCClientError } from "@trpc/client";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { sendCode, register } = vi.hoisted(() => ({ sendCode: vi.fn(), register: vi.fn() }));

vi.mock("@/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/components/SiteFooter", () => ({ default: () => null }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/lib/tutorLoginHandoff", () => ({ completeTutorLoginHandoff: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { fetch: vi.fn() } } }),
    auth: {
      registerTutor: { useMutation: () => ({ mutateAsync: register, isPending: false }) },
      sendTutorPhoneCode: { useMutation: () => ({ mutateAsync: sendCode, isPending: false }) },
    },
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [{ id: "dhaka", label: "Dhaka" }], isLoading: false }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [{ id: "mirpur", label: "Mirpur" }], isLoading: false }) },
    },
    siteContent: { list: { useQuery: () => ({ data: [] }) } },
  },
}));

import JoinTutor from "./JoinTutor";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function fillTheForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Full name/), "Karim Uddin");
  await user.click(screen.getByRole("radio", { name: "Male" }));
  await user.type(screen.getByLabelText(/^Phone number/), "1712345678");
  await user.type(screen.getByLabelText(/^Email/), "karim@example.com");
  await user.type(screen.getByPlaceholderText("At least 8 characters"), "strong-pass-1");
  await user.type(screen.getByPlaceholderText("Re-enter your password"), "strong-pass-1");
  await user.click(screen.getByRole("combobox", { name: /City/ }));
  await user.click(screen.getByRole("option", { name: "Dhaka" }));
  await user.click(screen.getByRole("combobox", { name: /Location/ }));
  await user.click(screen.getByRole("option", { name: "Mirpur" }));
  await user.click(screen.getByLabelText(/I agree to the/));
}

describe("Tutor registration with an SMS code", () => {
  it("sends the code first, and creates the account only with it", async () => {
    const user = userEvent.setup({ document: window.document });
    sendCode.mockResolvedValue({ success: true, resendAfterSeconds: 60, expiresInSeconds: 300 });
    register.mockRejectedValue(new Error("stop here"));
    render(<JoinTutor />);
    await fillTheForm(user);

    await user.click(screen.getByRole("button", { name: "Create Tutor account" }));
    expect(sendCode).toHaveBeenCalledWith({ phone: "+8801712345678" });
    expect(register).not.toHaveBeenCalled();
    expect(screen.getByText("Sent to +8801712345678")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Verify and create account" }));
    expect(screen.getByText("Enter the 4-digit code sent to your mobile.")).toBeTruthy();
    expect(register).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^Verification code/), "12x34");
    await user.click(screen.getByRole("button", { name: "Verify and create account" }));
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ phone: "+8801712345678", phoneCode: "1234" }));
    expect(sendCode).toHaveBeenCalledTimes(1);
  });

  it("drops the code when the number is changed, so the next press sends a new one", async () => {
    const user = userEvent.setup({ document: window.document });
    sendCode.mockResolvedValue({ success: true, resendAfterSeconds: 60, expiresInSeconds: 300 });
    render(<JoinTutor />);
    await fillTheForm(user);
    await user.click(screen.getByRole("button", { name: "Create Tutor account" }));

    fireEvent.change(screen.getByLabelText(/^Phone number/), { target: { value: "1812345678" } });
    expect(screen.queryByLabelText(/^Verification code/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Create Tutor account" }));
    expect(sendCode).toHaveBeenLastCalledWith({ phone: "+8801812345678" });
  });

  it("puts an already-registered number's message on the phone field, before any SMS", async () => {
    const user = userEvent.setup({ document: window.document });
    const conflict = new TRPCClientError("This mobile number is already registered to a Tutor account. Sign in instead, or use a different number.");
    Object.defineProperty(conflict, "data", { value: { code: "CONFLICT" }, configurable: true });
    sendCode.mockRejectedValue(conflict);
    render(<JoinTutor />);
    await fillTheForm(user);

    await user.click(screen.getByRole("button", { name: "Create Tutor account" }));
    expect(screen.getByText(/already registered to a Tutor account/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Verification code/)).toBeNull();
  });

  it("shows a wrong code's message under the code box", async () => {
    const user = userEvent.setup({ document: window.document });
    sendCode.mockResolvedValue({ success: true, resendAfterSeconds: 60, expiresInSeconds: 300 });
    const wrong = new TRPCClientError("That code is not right. 4 tries left.");
    Object.defineProperty(wrong, "data", { value: { code: "BAD_REQUEST", zodFieldErrors: { phoneCode: ["That code is not right. 4 tries left."] } }, configurable: true });
    register.mockRejectedValue(wrong);
    render(<JoinTutor />);
    await fillTheForm(user);
    await user.click(screen.getByRole("button", { name: "Create Tutor account" }));

    await user.type(screen.getByLabelText(/^Verification code/), "9999");
    await user.click(screen.getByRole("button", { name: "Verify and create account" }));
    expect(screen.getByText("That code is not right. 4 tries left.")).toBeTruthy();
  });
});
