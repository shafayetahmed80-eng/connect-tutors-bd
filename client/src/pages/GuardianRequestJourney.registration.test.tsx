// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateGuardianRegistration } from "./GuardianRequestJourney";

const mocks = vi.hoisted(() => ({
  capturePhone: vi.fn(),
  phoneStatus: vi.fn(),
  verifyPhone: vi.fn(),
  register: vi.fn(),
  phoneStatusOptions: null as null | { onSuccess?: (result: { registered: boolean }) => void; onError?: (error: { message: string }) => void },
  intakeOptions: null as null | { onSuccess?: (result: { resendAfterSeconds: number }, variables: { phone: string }) => void; onError?: (error: { message: string }) => void },
  verifyOptions: null as null | { onSuccess?: (result: unknown, variables: { phone: string }) => void; onError?: (error: { message: string; data?: unknown }) => void },
  registerOptions: null as null | { onSuccess?: () => void; onError?: (error: { message: string; data?: unknown }) => void },
  authMe: { data: null as unknown, isLoading: false, refetch: vi.fn() },
  invalidate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/pages/JoinTutor", () => ({
  SearchableLocationSelect: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) =>
    <input data-testid={`loc-${label}`} value={value} onChange={(event) => onChange(event.target.value)} />,
}));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => mocks.toastSuccess(...a), error: (...a: unknown[]) => mocks.toastError(...a), info: (...a: unknown[]) => mocks.toastInfo(...a) } }));
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
      phoneStatus: {
        useMutation: (options: typeof mocks.phoneStatusOptions) => {
          mocks.phoneStatusOptions = options;
          return { mutate: mocks.phoneStatus, isPending: false };
        },
      },
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
  mocks.phoneStatusOptions = null;
  mocks.intakeOptions = null;
  mocks.registerOptions = null;
  mocks.verifyOptions = null;
});

/** Fills every account-form field the validator requires, so "Continue" sends the code. */
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
  /** The first screen: the number, then Continue. `phoneStatus` answers whether the number already has an account. */
  function enterNumber(number = "01712345678") {
    fireEvent.change(screen.getByPlaceholderText("01712345678"), { target: { value: number } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  }
  const numberIsNew = () => act(() => mocks.phoneStatusOptions?.onSuccess?.({ registered: false }));
  const codeSent = (phone = "+8801712345678") => act(() => mocks.intakeOptions?.onSuccess?.({ resendAfterSeconds: 60 }, { phone }));

  it("takes the mobile number first, then the account form, and only then sends and checks the SMS code - the account is made once that code is right", () => {
    render(<GuardianRequestJourney />);

    expect(screen.getByRole("heading", { name: "Start with your phone number" })).toBeTruthy();
    expect(mocks.capturePhone).not.toHaveBeenCalled();
    enterNumber();
    expect(mocks.phoneStatus).toHaveBeenCalledWith({ phone: "+8801712345678" });
    // Asking whether the number is known sends nothing.
    expect(mocks.capturePhone).not.toHaveBeenCalled();
    numberIsNew();

    expect(screen.getByRole("heading", { name: "Create your Guardian account" })).toBeTruthy();
    // The number is carried over and can be read, not typed over.
    const shown = screen.getByDisplayValue("1712345678") as HTMLInputElement;
    expect(shown.readOnly).toBe(true);
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(mocks.capturePhone).toHaveBeenCalledWith({ phone: "+8801712345678" });
    expect(mocks.register).not.toHaveBeenCalled();

    codeSent();
    expect(screen.getByRole("heading", { name: "Verify your phone number" })).toBeTruthy();
    expect(screen.getByText("Sent to +8801712345678")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Send a new code/ }) as HTMLButtonElement).disabled).toBe(true);

    // The fourth digit verifies by itself, however it got there.
    fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: "48a21" } });
    expect(mocks.verifyPhone).toHaveBeenCalledWith({ phone: "+8801712345678", code: "4821" });
    expect(mocks.register).not.toHaveBeenCalled();

    act(() => mocks.verifyOptions?.onSuccess?.({ success: true }, { phone: "+8801712345678" }));
    expect(mocks.register).toHaveBeenCalledWith(expect.objectContaining({
      name: "Rahima Begum", email: "rahima@example.com", password: "GuardianPass1", confirmPassword: "GuardianPass1",
      phone: "+8801712345678", cityLocationId: "dhaka", locationId: "mirpur-10", termsAccepted: true,
    }));
  });

  it("sends a number that already has an account straight to sign-in", () => {
    render(<GuardianRequestJourney />);
    enterNumber();
    act(() => mocks.phoneStatusOptions?.onSuccess?.({ registered: true }));

    expect(window.location.pathname + window.location.search).toBe("/auth?role=guardian");
    expect(mocks.toastInfo).toHaveBeenCalled();
    expect(mocks.capturePhone).not.toHaveBeenCalled();
  });

  it("does not look a number up until it is a whole Bangladesh mobile number", () => {
    render(<GuardianRequestJourney />);
    enterNumber("0171234");

    expect(mocks.phoneStatus).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Enter a valid Bangladesh mobile number");
  });

  it("still has the Verify code button for a code typed in slowly, and asks for all four digits", () => {
    render(<GuardianRequestJourney />);
    enterNumber();
    numberIsNew();
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    codeSent();

    fireEvent.click(screen.getByRole("button", { name: /Verify code/ }));
    expect(screen.getByText("৪ অঙ্কের কোডটি লিখুন।")).toBeTruthy();
    expect(mocks.verifyPhone).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: "482" } });
    expect(mocks.verifyPhone).not.toHaveBeenCalled();
  });

  it("goes back from the code screen to the form with everything still filled in, and back again to the number", () => {
    render(<GuardianRequestJourney />);
    enterNumber();
    numberIsNew();
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    codeSent();

    fireEvent.click(screen.getByRole("button", { name: "Back to your details" }));
    expect((screen.getByPlaceholderText("Your full name") as HTMLInputElement).value).toBe("Rahima Begum");
    expect(screen.getByDisplayValue("1712345678")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back to phone" }));
    expect(screen.getByRole("heading", { name: "Start with your phone number" })).toBeTruthy();
    expect((screen.getByPlaceholderText("01712345678") as HTMLInputElement).value).toBe("01712345678");
  });

  it("does not send a second SMS for a number this visit already proved", () => {
    render(<GuardianRequestJourney />);
    enterNumber();
    numberIsNew();
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    codeSent();
    act(() => mocks.verifyOptions?.onSuccess?.({ success: true }, { phone: "+8801712345678" }));
    expect(mocks.register).toHaveBeenCalledTimes(1);

    // The server turned the form down (a taken email, say): back on the form, and Continue creates the account again with no new code.
    act(() => mocks.registerOptions?.onError?.({ message: "", data: { zodFieldErrors: { email: ["An account with this email already exists."] } } }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(mocks.capturePhone).toHaveBeenCalledTimes(1);
    expect(mocks.register).toHaveBeenCalledTimes(2);
  });

  it("asks for a new code once the intake has lapsed", () => {
    render(<GuardianRequestJourney />);
    enterNumber();
    numberIsNew();
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    codeSent();
    act(() => mocks.verifyOptions?.onSuccess?.({ success: true }, { phone: "+8801712345678" }));
    act(() => mocks.registerOptions?.onError?.({ message: "আপনার নিবন্ধন সেশনটি আর সক্রিয় নেই। ফোন নম্বর দিয়ে আবার শুরু করুন।", data: { code: "UNAUTHORIZED" } }));

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(mocks.capturePhone).toHaveBeenCalledTimes(2);
  });

  it("shows a wrong code's message under the code box and empties the box", () => {
    render(<GuardianRequestJourney />);
    enterNumber();
    numberIsNew();
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    codeSent();
    fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: "0000" } });

    act(() => mocks.verifyOptions?.onError?.({ message: "কোডটি সঠিক নয়। আর 3 বার চেষ্টা করা যাবে।", data: { zodFieldErrors: { phoneCode: ["কোডটি সঠিক নয়। আর 3 বার চেষ্টা করা যাবে।"] } } }));

    expect(screen.getByRole("alert").textContent).toBe("কোডটি সঠিক নয়। আর 3 বার চেষ্টা করা যাবে।");
    expect((screen.getByLabelText(/Verification code/) as HTMLInputElement).value).toBe("");
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("returns to the account form to fix a field the server rejects, such as a taken email", () => {
    render(<GuardianRequestJourney />);
    enterNumber();
    numberIsNew();
    fillAccountForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    codeSent();
    fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: "4821" } });
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
