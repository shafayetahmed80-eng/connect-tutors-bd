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
    guardianIntake: { phoneStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, capturePhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, verifyPhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    guardianAuth: { register: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    tutorRequests: {
      create: { useMutation: (options: typeof mocks.createOptions) => { mocks.createOptions = options; return { mutate: mocks.create, isPending: false }; } },
      mine: { useQuery: () => ({ data: [], isLoading: false }) },
      updatePending: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import GuardianRequestJourney from "./GuardianRequestJourney";
import { GUARDIAN_REQUEST_DRAFT_VERSION, serializeGuardianRequestDraft } from "./guardian-request-draft";

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

/** Opens a chip box and takes its first offer, so the catalogue can change without this test. */
function chooseFirstChip(scope: HTMLElement | Document, label: RegExp) {
  const box = within(scope as HTMLElement).getByRole("combobox", { name: label });
  fireEvent.click(box);
  // Only the open chip box has a listbox; the form's native selects have options of their own.
  const option = within(within(scope as HTMLElement).getByRole("listbox")).getAllByRole("option")[0];
  const choice = within(option).getByRole("button");
  const name = choice.textContent?.trim() ?? "";
  fireEvent.click(choice);
  return name;
}

/** Fills the least a Guardian can answer and stops on step 2. */
function fillThroughStepOne() {
  select("Tuition type", "online");
  const category = chooseFirstChip(document.body, /Curriculum \/ category/);
  const curriculum = screen.getByRole("group", { name: category });
  const classCourse = chooseFirstChip(curriculum, /Class \/ level/);
  const subject = within(screen.getByRole("group", { name: `Subjects for ${classCourse}` })).getAllByRole("button")[0];
  const subjectName = subject.textContent?.trim() ?? "";
  fireEvent.click(subject);
  fireEvent.click(screen.getByRole("button", { name: "Continue to tuition preferences" }));
  return { learningNeeds: [{ category, classes: [{ classCourse, subjects: [subjectName] }] }] };
}

/** Answers every required step-2 field, leaving the submit ready to press. */
function fillStepTwo() {
  fireEvent.change(screen.getByRole("spinbutton", { name: /Number of students/ }), { target: { value: "1" } });
  select("Days per week", "3");
  select("Where Did You Hear About Us", "facebook");
  select("Preferred Tutor gender", "any");
  fireEvent.change(screen.getByRole("textbox", { name: "Monthly salary (Taka)" }), { target: { value: "5000" } });
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
    expect(screen.getByText("Job ID : 6800")).not.toBeNull();
    expect(screen.getByRole("link", { name: "View my request" }).getAttribute("href")).toBe("/guardian/dashboard/posted-jobs");
    expect(screen.queryByRole("button", { name: "Send request" })).toBeNull();
  });

  describe("Tutoring Time", () => {
    /** The one request the create mutation was handed. */
    function sentRequest() {
      expect(mocks.create).toHaveBeenCalledTimes(1);
      return mocks.create.mock.calls[0][0] as Record<string, unknown>;
    }

    const timeBox = () => screen.getByLabelText(/Tutoring Time/) as HTMLInputElement;

    it("sends the time typed on step 2 with the request", () => {
      render(<GuardianRequestJourney embedded />);
      fillThroughStepOne();
      fillStepTwo();

      fireEvent.change(timeBox(), { target: { value: "16:30" } });
      fireEvent.click(screen.getByRole("button", { name: "Send request" }));

      // Zero-padded 24-hour text, exactly what the browser's time box hands back.
      expect(sentRequest().tutoringTime).toBe("16:30");
    });

    it("sends an explicit null when the box is left blank, never an empty string and never a missing key", () => {
      render(<GuardianRequestJourney embedded />);
      fillThroughStepOne();
      fillStepTwo();

      expect(timeBox().value).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "Send request" }));

      // The server stores NULL for "no time"; an "" would be refused by its pattern. The key is there on
      // purpose: the same form is used to edit, where null is how a cleared box clears a stored time and a
      // missing key would mean "leave it alone". Create sends it the same way so the two cannot drift.
      const request = sentRequest();
      expect("tutoringTime" in request).toBe(true);
      expect(request.tutoringTime).toBeNull();
      expect(request.tutoringTime).not.toBe("");
      expect(request.tutoringTime).not.toBeUndefined();
    });

    it("sends null, not an empty string, when the Guardian types a time and then clears it", () => {
      render(<GuardianRequestJourney embedded />);
      fillThroughStepOne();
      fillStepTwo();

      fireEvent.change(timeBox(), { target: { value: "16:30" } });
      fireEvent.change(timeBox(), { target: { value: "" } });
      fireEvent.click(screen.getByRole("button", { name: "Send request" }));

      const request = sentRequest();
      expect("tutoringTime" in request).toBe(true);
      expect(request.tutoringTime).toBeNull();
      expect(request.tutoringTime).not.toBe("");
    });

    it("is blank again for the next request after the Guardian posts another", () => {
      render(<GuardianRequestJourney embedded />);
      fillThroughStepOne();
      fillStepTwo();
      fireEvent.change(timeBox(), { target: { value: "16:30" } });
      fireEvent.click(screen.getByRole("button", { name: "Send request" }));
      act(() => { mocks.createOptions?.onSuccess?.({ id: 1 }); });

      fireEvent.click(screen.getByRole("button", { name: "Post another request" }));
      fillThroughStepOne();

      // The previous answer is not carried over to the next request.
      expect(timeBox().value).toBe("");
    });

    it("comes back with the rest of an unfinished request when the Guardian returns to it", () => {
      window.sessionStorage.setItem("connect-tutors:guardian-request-draft:4", serializeGuardianRequestDraft({
        version: GUARDIAN_REQUEST_DRAFT_VERSION,
        step: 2,
        request: {
          learningNeeds: [], tuitionType: "online", groupCapacity: "", packageDurationMonths: "", studentCount: "1",
          studentGender: "", addressDetails: "", tuitionCityLocationId: "", tuitionLocationId: "", daysPerWeek: "3",
          tutoringTime: "16:30", preferredGender: "any", salaryAmount: "5000", instituteName: "", heardAboutUs: "facebook",
        },
        notes: "",
      }));
      render(<GuardianRequestJourney embedded />);

      expect(timeBox().value).toBe("16:30");
      expect(JSON.parse(window.sessionStorage.getItem("connect-tutors:guardian-request-draft:4")!).request.tutoringTime).toBe("16:30");
    });

    it("saves a typed time into the draft so a reload keeps it", () => {
      render(<GuardianRequestJourney embedded />);
      fillThroughStepOne();
      fillStepTwo();

      fireEvent.change(timeBox(), { target: { value: "09:05" } });

      expect(JSON.parse(window.sessionStorage.getItem("connect-tutors:guardian-request-draft:4")!).request.tutoringTime).toBe("09:05");
    });
  });

  it("clears the answers back to an empty step 1 when the Guardian posts another", () => {
    render(<GuardianRequestJourney embedded />);
    fillThroughStepOne();
    fillStepTwo();
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));
    act(() => { mocks.createOptions?.onSuccess?.({ id: 1 }); });

    fireEvent.click(screen.getByRole("button", { name: "Post another request" }));

    // Step 1 again, with the previous answers gone rather than carried over.
    expect(screen.getByRole("button", { name: "Continue to tuition preferences" })).not.toBeNull();
    // No curriculum is carried over: the field is empty, and no class or subject block remains.
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
    expect(screen.queryByRole("group", { name: /^Subjects for / })).toBeNull();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
