// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  invalidate: vi.fn(),
  navigate: vi.fn(),
  createOptions: null as null | { onSuccess?: (result: { id: number }) => void; onError?: (error: { message: string }) => void },
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/components/JourneyProgress", () => ({ JourneyProgress: () => <div /> }));
vi.mock("@/pages/JoinTutor", () => ({ SearchableLocationSelect: () => <div /> }));
vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return { ...actual, useLocation: () => ["/guardian/dashboard/hire", mocks.navigate] };
});
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorRequests: { mine: { invalidate: mocks.invalidate } } }),
    siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
    siteLimits: { resolved: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) } },
    auth: { me: { useQuery: () => ({ data: { id: 4, role: "guardian" }, isLoading: false, refetch: vi.fn() }) } },
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [{ id: "dhaka", label: "Dhaka" }] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [] }) },
    },
    guardianIntake: { capturePhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    guardianAuth: { register: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    tutorRequests: {
      create: { useMutation: (options: typeof mocks.createOptions) => { mocks.createOptions = options; return { mutate: mocks.create, isPending: false }; } },
      mine: { useQuery: () => ({ data: [], isLoading: false }) },
      updatePending: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import GuardianRequestJourney from "./GuardianRequestJourney";

afterEach(() => {
  cleanup();
  mocks.create.mockReset();
  mocks.invalidate.mockReset();
  mocks.navigate.mockReset();
  mocks.createOptions = null;
  window.sessionStorage.clear();
});

function select(label: string, value: string) {
  fireEvent.change(screen.getByRole("combobox", { name: new RegExp(label) }), { target: { value } });
}

/** Picks the first real option, so the catalogue can change without this test. */
function selectFirstOption(label: string) {
  const field = screen.getByRole("combobox", { name: new RegExp(label) }) as HTMLSelectElement;
  const option = Array.from(field.options).find(candidate => candidate.value !== "");
  if (!option) throw new Error(`No option to choose for ${label}`);
  fireEvent.change(field, { target: { value: option.value } });
  return option.value;
}

/** Fills the least a Guardian can answer and stops on step 2. */
function fillThroughStepOne() {
  select("Tuition type", "online");
  const category = selectFirstOption("Curriculum / category");
  const classCourse = selectFirstOption("Class / level");
  const subject = within(screen.getByRole("group", { name: "Subject selection" })).getAllByRole("button")[0];
  const subjectName = subject.textContent?.trim() ?? "";
  fireEvent.click(subject);
  fireEvent.click(screen.getByRole("button", { name: "Continue to tuition preferences" }));
  return { category, classCourse, subjects: [subjectName] };
}

/** Answers every required step-2 field, leaving the submit ready to press. */
function fillStepTwo() {
  fireEvent.change(screen.getByRole("spinbutton", { name: /Number of students/ }), { target: { value: "1" } });
  select("Days per week", "3");
  select("Where Did You Hear About Us", "facebook");
  select("Preferred Tutor gender", "any");
  fireEvent.change(screen.getByRole("textbox", { name: "Amount (Taka) *" }), { target: { value: "5000" } });
}

describe("GuardianRequestJourney create flow", () => {
  it("sends the request from step 2 and lands on step 3 rather than leaving the journey", () => {
    render(<GuardianRequestJourney embedded />);
    const chosen = fillThroughStepOne();

    // Step 2 owns the submit now - there is no third Continue.
    fillStepTwo();

    expect(screen.queryByRole("button", { name: "Continue to tuition preferences" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      tuitionType: "online",
      ...chosen,
      heardAboutUs: "facebook",
      budgetAmount: 5000,
    }));

    act(() => { mocks.createOptions?.onSuccess?.({ id: 1 }); });

    // The confirmation is step 3 of the same journey: the sheet stays open, the
    // Posted jobs list behind it is told to refetch, and nothing navigates.
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.invalidate).toHaveBeenCalled();
    expect(screen.getByText("6800")).not.toBeNull();
    expect(screen.getByRole("link", { name: "View my request" }).getAttribute("href")).toBe("/guardian/dashboard/posted-jobs");
    expect(screen.queryByRole("button", { name: "Send request" })).toBeNull();
  });

  it("clears the answers back to an empty step 1 when the Guardian posts another", () => {
    render(<GuardianRequestJourney embedded />);
    fillThroughStepOne();
    fillStepTwo();
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    act(() => { mocks.createOptions?.onSuccess?.({ id: 1 }); });

    fireEvent.click(screen.getByRole("button", { name: "+ Post another request" }));

    // Step 1 again, with the previous answers gone rather than carried over.
    expect(screen.getByRole("button", { name: "Continue to tuition preferences" })).not.toBeNull();
    expect((screen.getByRole("combobox", { name: /Curriculum \/ category/ }) as HTMLSelectElement).value).toBe("");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
