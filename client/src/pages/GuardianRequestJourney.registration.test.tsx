// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateGuardianRegistration } from "./GuardianRequestJourney";

const mocks = vi.hoisted(() => ({
  capturePhone: vi.fn(),
  verifyPhone: vi.fn(),
  register: vi.fn(),
  intakeOptions: null as null | { onSuccess?: (result: { resendAfterSeconds: number }, variables: { phone: string }) => void; onError?: (error: { message: string }) => void },
  verifyOptions: null as null | { onSuccess?: (result: unknown, variables: { phone: string }) => void; onError?: (error: { message: string; data?: unknown }) => void },
  registerOptions: null as null | { onSuccess?: () => void; onError?: (error: { message: string; data?: unknown }) => void },
  authMe: { data: null as unknown, isLoading: false, refetch: vi.fn() },
  invalidate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/pages/JoinTutor", () => ({
  SearchableLocationSelect: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) =>
    <input data-testid={`loc-${label}`} value={value} onChange={(event) => onChange(event.target.value)} />,
}));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => mocks.toastSuccess(...a), error: (...a: unknown[]) => mocks.toastError(...a) } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { invalidate: mocks.invalidate } }, tutorRequests: { mine: { invalidate: vi.fn() } } }),
    // Content overrides are cosmetic; an empty list keeps the code defaults.
    siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
    // The Owner-tunable limits; undefined data leaves the form on the shipped numbers.
    siteLimits: { resolved: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) } },
    auth: { me: { useQuery: () => mocks.authMe } },
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [{ id: "dhaka", label: "Dhaka" }] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [] }) },
    },
    guardianIntake: {
      capturePhone: {
        useMutation: (options: typeof mocks.intakeOptions) => {
          mocks.intakeOptions = options;
          return { mutate: mocks.capturePhone, isPending: false };
        },
      },
      verifyPhone: {
        useMutation: (options: typeof mocks.verifyOptions) => {
          mocks.verifyOptions = options;
          return { mutate: mocks.verifyPhone, isPending: false };
        },
      },
    },
    guardianAuth: {
      register: {
        useMutation: (options: typeof mocks.registerOptions) => {
          mocks.registerOptions = options;
          return { mutate: mocks.register, isPending: false };
        },
      },
    },
    tutorRequests: {
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      mine: { useQuery: () => ({ data: [], isLoading: false }) },
      updatePending: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import GuardianRequestJourney from "./GuardianRequestJourney";

beforeEach(() => {
  mocks.authMe = { data: null, isLoading: false, refetch: vi.fn() };
  window.history.pushState({}, "", "/request-tutor");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.intakeOptions = null;
  mocks.registerOptions = null;
  mocks.verifyOptions = null;
});

/** Fills every account-form field the validator requires, so "Continue" moves on to the phone step. */
function fillAccountForm() {
  fireEvent.change(screen.getByPlaceholderText("Your full name"), { target: { value: "Rahima Begum" } });
  fireEvent.click(screen.getByRole("radio", { name: "Female" }));
  fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "rahima@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), { target: { value: "GuardianPass1" } });
  fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), { target: { value: "GuardianPass1" } });
  fireEvent.change(screen.getByTestId("loc-City"), { target: { value: "dhaka" } });
  fireEvent.change(screen.getByTestId("loc-Location"), { target: { value: "mirpur-10" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("validateGuardianRegistration", () => {
  const valid = {
    name: "Rahima Begum",
    email: "rahima@example.com",
    password: "GuardianPass1",
    confirmPassword: "GuardianPass1",
    accountCityId: "dhaka",
    accountLocationId: "mirpur-10",
    gender: "female",
  };

  it("accepts a complete, in-bounds account form", () => {
    expect(validateGuardianRegistration(valid, true)).toEqual({});
  });

  it("mirrors the server bounds for every field", () => {
    expect(validateGuardianRegistration({ ...valid, name: "A" }, true).name).toMatch(/full name/i);
    expect(validateGuardianRegistration({ ...valid, email: "not-an-email" }, true).email).toMatch(/valid email/i);
    expect(validateGuardianRegistration({ ...valid, password: "short" }, true).password).toMatch(/8 characters/i);
    expect(validateGuardianRegistration({ ...valid, confirmPassword: "different" }, true).confirmPassword).toMatch(/do not match/i);
    expect(validateGuardianRegistration({ ...valid, gender: "" }, true).gender).toMatch(/gender/i);
    expect(validateGuardianRegistration({ ...valid, accountCityId: "" }, true).cityLocationId).toMatch(/City/i);
    expect(validateGuardianRegistration({ ...valid, accountLocationId: "" }, true).locationId).toMatch(/Location/i);
    expect(validateGuardianRegistration(valid, false).terms).toMatch(/Terms/i);
  });
});

describe("GuardianRequestJourney account creation flow", () => {
  it("asks for the account details first, then an SMS code for the +880 number - the account is only created once that code is verified", () => {
    render(<GuardianRequestJourney />);

    expect(screen.getByRole("heading", { name: "Create your Guardian account" })).toBeTruthy();
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(mocks.register).not.toHaveBeenCalled();

    expect(screen.getByRole("heading", { name: "Verify your phone number" })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("01712345678"), { target: { value: "01712345678" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue securely/i }));
    expect(mocks.capturePhone).toHaveBeenCalledWith({ phone: "+8801712345678" });

    act(() => mocks.intakeOptions?.onSuccess?.({ resendAfterSeconds: 60 }, { phone: "+8801712345678" }));
    expect(screen.getByText("Sent to +8801712345678")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Continue securely/i })).toBeNull();
    expect((screen.getByRole("button", { name: /Send a new code/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Verify code/ }));
    expect(screen.getByText("৪ অঙ্কের কোডটি লিখুন।")).toBeTruthy();
    expect(mocks.verifyPhone).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: "48a21" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/ }));
    expect(mocks.verifyPhone).toHaveBeenCalledWith({ phone: "+8801712345678", code: "4821" });
    expect(mocks.register).not.toHaveBeenCalled();

    act(() => mocks.verifyOptions?.onSuccess?.({ success: true }, { phone: "+8801712345678" }));
    expect(mocks.register).toHaveBeenCalledWith(expect.objectContaining({
      name: "Rahima Begum", email: "rahima@example.com", password: "GuardianPass1", confirmPassword: "GuardianPass1",
      phone: "+8801712345678", cityLocationId: "dhaka", locationId: "mirpur-10", termsAccepted: true,
    }));
  });

  it("does not ask again for a number this visit already proved", () => {
    render(<GuardianRequestJourney />);
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByPlaceholderText("01712345678"), { target: { value: "01712345678" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue securely/i }));
    act(() => mocks.intakeOptions?.onSuccess?.({ resendAfterSeconds: 60 }, { phone: "+8801712345678" }));
    act(() => mocks.verifyOptions?.onSuccess?.({ success: true }, { phone: "+8801712345678" }));
    expect(mocks.register).toHaveBeenCalledTimes(1);

    // Back to the phone step with the same number: no second SMS, straight to creating the account again.
    fireEvent.click(screen.getByRole("button", { name: "Back to your details" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue securely/i }));
    expect(mocks.capturePhone).toHaveBeenCalledTimes(1);
    expect(mocks.register).toHaveBeenCalledTimes(2);

    // A different number is a new proof.
    fireEvent.click(screen.getByRole("button", { name: "Back to your details" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByPlaceholderText("01712345678"), { target: { value: "01812345678" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue securely/i }));
    expect(mocks.capturePhone).toHaveBeenLastCalledWith({ phone: "+8801812345678" });
  });

  it("asks for a new code once the intake has lapsed", () => {
    render(<GuardianRequestJourney />);
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByPlaceholderText("01712345678"), { target: { value: "01712345678" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue securely/i }));
    act(() => mocks.intakeOptions?.onSuccess?.({ resendAfterSeconds: 60 }, { phone: "+8801712345678" }));
    act(() => mocks.verifyOptions?.onSuccess?.({ success: true }, { phone: "+8801712345678" }));
    act(() => mocks.registerOptions?.onError?.({ message: "আপনার নিবন্ধন সেশনটি আর সক্রিয় নেই। ফোন নম্বর দিয়ে আবার শুরু করুন।", data: { code: "UNAUTHORIZED" } }));

    fireEvent.click(screen.getByRole("button", { name: /Continue securely/i }));
    expect(mocks.capturePhone).toHaveBeenCalledTimes(2);
  });

  it("shows a wrong code's message under the code box", () => {
    render(<GuardianRequestJourney />);
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByPlaceholderText("01712345678"), { target: { value: "01712345678" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue securely/i }));
    act(() => mocks.intakeOptions?.onSuccess?.({ resendAfterSeconds: 60 }, { phone: "+8801712345678" }));

    act(() => mocks.verifyOptions?.onError?.({ message: "কোডটি সঠিক নয়। আর 3 বার চেষ্টা করা যাবে।", data: { zodFieldErrors: { phoneCode: ["কোডটি সঠিক নয়। আর 3 বার চেষ্টা করা যাবে।"] } } }));

    expect(screen.getByRole("alert").textContent).toBe("কোডটি সঠিক নয়। আর 3 বার চেষ্টা করা যাবে।");
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("returns to the account form to fix a field the server rejects, such as a taken email", () => {
    render(<GuardianRequestJourney />);
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByPlaceholderText("01712345678"), { target: { value: "01712345678" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue securely/i }));
    act(() => mocks.intakeOptions?.onSuccess?.({ resendAfterSeconds: 60 }, { phone: "+8801712345678" }));
    fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: "4821" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/ }));
    act(() => mocks.verifyOptions?.onSuccess?.({ success: true }, { phone: "+8801712345678" }));

    act(() => mocks.registerOptions?.onError?.({ message: "", data: { zodFieldErrors: { email: ["An account with this email already exists."] } } }));

    expect(screen.getByRole("heading", { name: "Create your Guardian account" })).toBeTruthy();
    expect(screen.getByText("An account with this email already exists.")).toBeTruthy();
  });

  it("sends a completed Guardian straight to the dashboard Hire a tutor tab", () => {
    render(<GuardianRequestJourney />);
    act(() => mocks.verifyOptions?.onSuccess?.({ success: true }, { phone: "+8801712345678" }));

    act(() => mocks.registerOptions?.onSuccess?.());

    expect(mocks.toastSuccess).toHaveBeenCalled();
    expect(mocks.invalidate).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/guardian/dashboard/hire");
  });

  it("redirects an already-signed-in Guardian away from the public request journey", async () => {
    mocks.authMe = { data: { id: 9, role: "guardian" }, isLoading: false, refetch: vi.fn() };
    render(<GuardianRequestJourney />);

    await waitFor(() => expect(window.location.pathname).toBe("/guardian/dashboard/hire"));
  });
});
