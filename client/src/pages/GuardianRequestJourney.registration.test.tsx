// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateGuardianRegistration } from "./GuardianRequestJourney";

const mocks = vi.hoisted(() => ({
  capturePhone: vi.fn(),
  register: vi.fn(),
  intakeOptions: null as null | { onSuccess?: () => void; onError?: (error: { message: string }) => void },
  registerOptions: null as null | { onSuccess?: () => void; onError?: (error: { message: string; data?: unknown }) => void },
  authMe: { data: null as unknown, isLoading: false, refetch: vi.fn() },
  invalidate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/pages/JoinTutor", () => ({ SearchableLocationSelect: ({ label }: { label: string }) => <div data-testid={`loc-${label}`} /> }));
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
});

describe("validateGuardianRegistration", () => {
  const valid = {
    name: "Rahima Begum",
    email: "rahima@example.com",
    password: "GuardianPass1",
    confirmPassword: "GuardianPass1",
    accountCityId: "dhaka",
    accountLocationId: "mirpur-10",
  };

  it("accepts a complete, in-bounds account form", () => {
    expect(validateGuardianRegistration(valid, true)).toEqual({});
  });

  it("mirrors the server bounds for every field", () => {
    expect(validateGuardianRegistration({ ...valid, name: "A" }, true).name).toMatch(/full name/i);
    expect(validateGuardianRegistration({ ...valid, email: "not-an-email" }, true).email).toMatch(/valid email/i);
    expect(validateGuardianRegistration({ ...valid, password: "short" }, true).password).toMatch(/8 characters/i);
    expect(validateGuardianRegistration({ ...valid, confirmPassword: "different" }, true).confirmPassword).toMatch(/do not match/i);
    expect(validateGuardianRegistration({ ...valid, accountCityId: "" }, true).cityLocationId).toMatch(/City/i);
    expect(validateGuardianRegistration({ ...valid, accountLocationId: "" }, true).locationId).toMatch(/Location/i);
    expect(validateGuardianRegistration(valid, false).terms).toMatch(/Terms/i);
  });
});

describe("GuardianRequestJourney account creation flow", () => {
  it("captures the +880 mobile number, then shows the Tutor-style Guardian account panel", () => {
    render(<GuardianRequestJourney />);

    fireEvent.change(screen.getByPlaceholderText("01712345678"), { target: { value: "01712345678" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue securely/i }));
    expect(mocks.capturePhone).toHaveBeenCalledWith({ phone: "+8801712345678" });

    act(() => mocks.intakeOptions?.onSuccess?.());

    expect(screen.getByRole("heading", { name: "Create your Guardian account" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back to phone" })).toBeTruthy();
    const phone = screen.getByDisplayValue("1712345678") as HTMLInputElement;
    expect(phone.readOnly).toBe(true);
  });

  it("sends a completed Guardian straight to the dashboard Hire a tutor tab", () => {
    render(<GuardianRequestJourney />);
    act(() => mocks.intakeOptions?.onSuccess?.());

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
