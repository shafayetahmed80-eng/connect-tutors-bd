// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updatePending: vi.fn(),
  invalidate: vi.fn(),
  updateOptions: null as null | { onSuccess?: () => void; onError?: (error: { message: string; data?: { code?: string } }) => void },
  request: {
    id: 17,
    status: "new",
    publicationState: "submitted",
    tuitionType: "online",
    category: "English Medium",
    curriculumType: "Cambridge",
    classCourse: "Standard 1",
    subjects: "[\"English\"]",
    learningNeeds: [{ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Standard 1", subjects: ["English"] }] }],
    daysPerWeek: 3,
    preferredGender: "female",
    studentFirstName: "Amina",
    studentGender: "female",
    addressDetails: "Private access note",
    groupCapacity: null,
    packageDurationMonths: null,
    studentCount: 1,
    tuitionCityLocationId: null,
    tuitionLocationId: null,
    // A saved request carries its salary; the amount is required now, so an
    // edit cannot get past step two without one.
    budgetAmount: 8000,
    // A referral answer is required too, so an edit stalls on step two
    // without one - the same way it stalls without a salary.
    instituteName: "Dhaka College",
    heardAboutUs: "websites",
    notes: "Weekday afternoons",
  } as Record<string, unknown>,
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/components/JourneyProgress", () => ({ JourneyProgress: () => <div /> }));
vi.mock("@/pages/JoinTutor", () => ({ SearchableLocationSelect: () => <div /> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorRequests: { mine: { invalidate: mocks.invalidate } } }),
    // Content overrides are cosmetic; an empty list keeps the code defaults.
    siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
    // The Owner-tunable limits; undefined data leaves the form on the shipped numbers.
    siteLimits: { resolved: { useQuery: () => ({ data: undefined, isLoading: false, isError: false }) } },
    auth: { me: { useQuery: () => ({ data: { id: 4, role: "guardian" }, isLoading: false, refetch: vi.fn() }) } },
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [{ id: "dhaka", label: "Dhaka" }] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [] }) },
      searchSchoolColleges: { useQuery: () => ({ data: [], isFetching: false }) },
    },
    guardianIntake: { phoneStatus: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, capturePhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) }, verifyPhone: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    guardianAuth: { register: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    tutorRequests: {
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      mine: { useQuery: () => ({ data: [mocks.request], isLoading: false }) },
      updatePending: { useMutation: (options: typeof mocks.updateOptions) => { mocks.updateOptions = options; return { mutate: mocks.updatePending, isPending: false }; } },
    },
  },
}));

import GuardianRequestJourney from "./GuardianRequestJourney";

afterEach(() => {
  cleanup();
  mocks.updatePending.mockReset();
  mocks.invalidate.mockReset();
  mocks.updateOptions = null;
  mocks.request.status = "new";
  mocks.request.publicationState = "submitted";
  // The base request is a legacy one with no time; a test that gives it one takes it back.
  delete mocks.request.tutoringTime;
  window.history.pushState({}, "", "/request-tutor");
});

describe("GuardianRequestJourney Pending edit flow", () => {
  it("prefills the Guardian-owned Pending request and submits updatePending rather than create", async () => {
    window.history.pushState({}, "", "/request-tutor?edit=17");
    render(<GuardianRequestJourney />);

    await waitFor(() => expect(screen.getByRole("list", { name: "Tutor request details progress" })).toBeTruthy());
    // The curriculum, its type, the class and the subject come back chosen, each in its own block.
    const english = screen.getByRole("group", { name: "English Medium" });
    expect((within(english).getByRole("combobox", { name: /Curriculum Type/ }) as HTMLSelectElement).value).toBe("Cambridge");
    expect(within(english).getByRole("button", { name: "Remove Standard 1" })).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Subjects for Standard 1" })).getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("textbox", { name: /Student first name/ })).toBeNull();
    expect((screen.getByDisplayValue("Private access note") as HTMLTextAreaElement).value).toBe("Private access note");

    // Step 2 carries the submit, and an edit saves rather than sends.
    fireEvent.click(screen.getByRole("button", { name: "Continue to tuition preferences" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mocks.updatePending).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 17,
      instituteName: "Dhaka College",
      heardAboutUs: "websites",
      tuitionType: "online",
      learningNeeds: [{ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Standard 1", subjects: ["English"] }] }],
      studentGender: "female",
      addressDetails: "Private access note",
      notes: "Weekday afternoons",
    }));
  });

  it("opens a request listed without the list of needs as a list of one, from its category, class and subjects", async () => {
    const { learningNeeds, ...withoutList } = mocks.request;
    mocks.request = withoutList;
    try {
      window.history.pushState({}, "", "/request-tutor?edit=17");
      render(<GuardianRequestJourney />);

      await waitFor(() => expect(screen.getByRole("list", { name: "Tutor request details progress" })).toBeTruthy());
      const english = screen.getByRole("group", { name: "English Medium" });
      expect(within(english).getByRole("button", { name: "Remove Standard 1" })).toBeTruthy();
      expect(within(screen.getByRole("group", { name: "Subjects for Standard 1" })).getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    } finally {
      mocks.request = { ...withoutList, learningNeeds };
    }
  });

  describe("Tutoring Time", () => {
    /** Opens the Pending request for editing and moves to step 2, where the time box lives. */
    async function openStepTwo() {
      window.history.pushState({}, "", "/request-tutor?edit=17");
      render(<GuardianRequestJourney />);
      await waitFor(() => expect(screen.getByRole("list", { name: "Tutor request details progress" })).toBeTruthy());
      fireEvent.click(screen.getByRole("button", { name: "Continue to tuition preferences" }));
      return screen.getByLabelText(/Tutoring Time/) as HTMLInputElement;
    }

    /** What Save changes handed to updatePending. */
    function savedRequest() {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      expect(mocks.updatePending).toHaveBeenCalledTimes(1);
      return mocks.updatePending.mock.calls[0][0] as Record<string, unknown>;
    }

    it("opens with the saved time in the box and sends it back unchanged as the same HH:mm text", async () => {
      mocks.request.tutoringTime = "16:30";
      const box = await openStepTwo();

      expect(box.value).toBe("16:30");
      // Nothing is touched, so the string goes back as it came. Turning it into null would clear a time the
      // Guardian never touched.
      const saved = savedRequest();
      expect(saved.requestId).toBe(17);
      expect(saved.tutoringTime).toBe("16:30");
    });

    it("saves a new time in place of the old one", async () => {
      mocks.request.tutoringTime = "16:30";
      const box = await openStepTwo();

      fireEvent.change(box, { target: { value: "09:05" } });

      expect(savedRequest().tutoringTime).toBe("09:05");
    });

    it("sends null once the Guardian clears the box, which is how the server drops the saved time", async () => {
      mocks.request.tutoringTime = "16:30";
      const box = await openStepTwo();

      fireEvent.change(box, { target: { value: "" } });

      // An explicit null, not a missing key: the server reads a missing time as "leave the stored one alone",
      // so only null clears it. And not "", which would fail the server's pattern.
      const saved = savedRequest();
      expect("tutoringTime" in saved).toBe(true);
      expect(saved.tutoringTime).toBeNull();
      expect(saved.tutoringTime).not.toBe("");
      expect(saved.tutoringTime).not.toBeUndefined();
    });

    it("opens a request that never had a time (null from the server) with an empty box and sends null", async () => {
      mocks.request.tutoringTime = null;
      const box = await openStepTwo();

      expect(box.value).toBe("");
      const saved = savedRequest();
      expect("tutoringTime" in saved).toBe(true);
      expect(saved.tutoringTime).toBeNull();
    });

    it("opens a legacy request with no time key at all with an empty box and sends null", async () => {
      // The base request in this file is exactly that: it predates the field.
      expect("tutoringTime" in mocks.request).toBe(false);
      const box = await openStepTwo();

      expect(box.value).toBe("");
      // There is no stored time to keep, so the form says "no time" with null rather than leaving the key out.
      const saved = savedRequest();
      expect("tutoringTime" in saved).toBe(true);
      expect(saved.tutoringTime).toBeNull();
    });

    it.each(["4pm", "4:30 PM", "24:00", "16:60", "16:30:00", ""])("opens a saved value that does not read as a time (%j) with an empty box and sends null", async value => {
      // Nothing the form writes can be anything but HH:mm, but if a row did
      // carry something else, the Guardian would otherwise be stuck on a value
      // the server refuses and cannot see in a time box.
      mocks.request.tutoringTime = value;
      const box = await openStepTwo();

      expect(box.value).toBe("");
      const saved = savedRequest();
      expect("tutoringTime" in saved).toBe(true);
      expect(saved.tutoringTime).toBeNull();
    });

    it("sends the new time, not null, when the Guardian clears the box and then types another", async () => {
      mocks.request.tutoringTime = "16:30";
      const box = await openStepTwo();

      fireEvent.change(box, { target: { value: "" } });
      fireEvent.change(box, { target: { value: "07:15" } });

      // The clear is not remembered: the last thing in the box is what goes to the server.
      expect(savedRequest().tutoringTime).toBe("07:15");
    });
  });

  it("does not render a stale non-Pending request as editable", async () => {
    mocks.request.status = "reviewing";
    window.history.pushState({}, "", "/request-tutor?edit=17");
    render(<GuardianRequestJourney />);

    await waitFor(() => expect(window.location.pathname).toBe("/guardian/dashboard/posted-jobs"));
  });
});
