// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ post: vi.fn(), update: vi.fn(), refetchNextJobId: vi.fn(), toastError: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      createPostedTuition: { useMutation: () => ({ mutate: mocks.post, isPending: false }) },
      updatePostedTuition: { useMutation: () => ({ mutate: mocks.update, isPending: false }) },
      nextJobId: { useQuery: () => ({ data: { jobId: "6831" }, isLoading: false, refetch: mocks.refetchNextJobId }) },
    },
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [{ id: "dhaka-city", label: "Dhaka" }] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [{ id: "dhaka-shyamoli", label: "Shyamoli" }] }) },
    },
    siteLimits: { resolved: { useQuery: () => ({ data: undefined }) } },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: mocks.toastError }) }));

import AdminAddTuitionModal from "./AdminAddTuitionModal";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const open = () => render(<AdminAddTuitionModal onClose={vi.fn()} onPosted={vi.fn()} />);
const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
// Two Post buttons are rendered - one in the header for a laptop, one at the
// foot for a phone - and CSS shows exactly one. jsdom applies no CSS, so both
// are in the tree here; either one runs the same handler.
const postButton = () => screen.getAllByRole("button", { name: /^Post$/ })[0];

/** Everything a tuition needs to post, so a test can vary only what it is about. */
function fillTuition() {
  type(/Guardian name/, "Off-site Guardian");
  type(/Mobile number/, "01999888777");
  fireEvent.change(screen.getByLabelText(/Curriculum \/ category/), { target: { value: "Bangla Medium" } });
  fireEvent.change(screen.getByLabelText(/Class \/ level/), { target: { value: "Class 4" } });
  const subjects = screen.getByRole("group", { name: /Subject selection/ });
  fireEvent.click(within(subjects).getAllByRole("button")[0]);
  fireEvent.change(screen.getByLabelText(/Days per week/), { target: { value: "3" } });
  type(/Monthly salary/, "6,500");
  fireEvent.change(screen.getByLabelText(/Where Did You Hear About Us/), { target: { value: "others" } });
}

describe("Add Tuition", () => {
  it("puts the whole journey on one screen, with the Guardian's name and number in front", () => {
    open();

    // The two fields an off-site tuition adds.
    expect(screen.getByLabelText(/Guardian name/)).toBeTruthy();
    expect(screen.getByLabelText(/Mobile number/)).toBeTruthy();
    // And the journey's own, all of them, with no step to walk through.
    for (const field of [/Tuition type/, /Curriculum \/ category/, /Class \/ level/, /Student gender/, /Days per week/, /Preferred Tutor gender/, /Monthly salary/, /Institute Name/, /Where Did You Hear About Us/, /Address Details/, /Additional notes/]) {
      expect(screen.getByLabelText(field), String(field)).toBeTruthy();
    }
    expect(postButton()).toBeTruthy();
  });

  it("leads with the Job ID, filled in with the next one in sequence", () => {
    open();

    const field = screen.getByLabelText(/Job ID/) as HTMLInputElement;
    expect(screen.getAllByRole("textbox")[0]).toBe(field);
    expect(field.value).toBe("6831");
    expect(field.readOnly).toBe(false);
  });

  it("posts under the Job ID it showed", () => {
    open();
    fillTuition();
    fireEvent.click(postButton());
    expect(mocks.post).toHaveBeenCalledWith(expect.objectContaining({ jobId: "6831" }));
  });

  it("posts under the Job ID the Admin typed over it, keeping only the digits", () => {
    open();
    type(/Job ID/, "7 0 0 0");
    expect((screen.getByLabelText(/Job ID/) as HTMLInputElement).value).toBe("7000");
    fillTuition();
    fireEvent.click(postButton());
    expect(mocks.post).toHaveBeenCalledWith(expect.objectContaining({ jobId: "7000" }));
  });

  it("will not post with the Job ID cleared", () => {
    open();
    type(/Job ID/, "");
    fillTuition();
    fireEvent.click(postButton());
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Enter the Job ID.");
  });

  it("swaps the tuition location for the Guardian's own when the tuition is online", () => {
    open();

    expect(screen.getByText("Tuition City")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Tuition type/), { target: { value: "online" } });
    // Nothing to take the Guardian's City from any more, so it is asked for.
    expect(screen.queryByText("Tuition City")).toBeNull();
    expect(screen.getByText("Guardian City")).toBeTruthy();
  });

  it("asks for a package's duration and a group's capacity, and only those", () => {
    open();
    expect(screen.getByLabelText(/Number of students/)).toBeTruthy();
    expect(screen.queryByLabelText(/Package duration/)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Tuition type/), { target: { value: "group" } });
    expect(screen.getByLabelText(/Maximum students/)).toBeTruthy();
    expect(screen.queryByLabelText(/Number of students/)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Tuition type/), { target: { value: "package" } });
    expect(screen.getByLabelText(/Package duration/)).toBeTruthy();
    expect(screen.getByLabelText(/Number of students/)).toBeTruthy();
  });

  it("offers the subjects that belong to the chosen curriculum and level", () => {
    open();
    const subjects = () => screen.getByRole("group", { name: /Subject selection/ });

    fireEvent.change(screen.getByLabelText(/Curriculum \/ category/), { target: { value: "Bangla Medium" } });
    fireEvent.change(screen.getByLabelText(/Class \/ level/), { target: { value: "Class 4" } });
    const primary = within(subjects()).getAllByRole("button").map(button => button.textContent);

    // A different level is a different subject list, not the same one again.
    fireEvent.change(screen.getByLabelText(/Class \/ level/), { target: { value: "Class 9" } });
    expect(within(subjects()).getAllByRole("button").map(button => button.textContent)).not.toEqual(primary);
  });

  it("drops a chosen subject that the new level does not teach", () => {
    open();
    fireEvent.change(screen.getByLabelText(/Curriculum \/ category/), { target: { value: "Bangla Medium" } });
    fireEvent.change(screen.getByLabelText(/Class \/ level/), { target: { value: "Class 9" } });
    const subjects = screen.getByRole("group", { name: /Subject selection/ });
    const chosen = within(subjects).getAllByRole("button").at(-1)!;
    fireEvent.click(chosen);
    expect(within(subjects).getByRole("button", { pressed: true })).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Class \/ level/), { target: { value: "Nursery" } });
    // The count in the legend is the honest one: nothing carried over that the
    // new level does not offer.
    expect(screen.getByText(/0 of \d+/)).toBeTruthy();
  });

  it("sends the tuition as the Guardian journey would have posted it", () => {
    open();
    fillTuition();
    fireEvent.click(postButton());

    expect(mocks.post).toHaveBeenCalledWith(expect.objectContaining({
      guardianName: "Off-site Guardian",
      guardianPhone: "01999888777",
      tuitionType: "home",
      category: "Bangla Medium",
      classCourse: "Class 4",
      daysPerWeek: 3,
      // Typed with a comma, sent as a number.
      budgetAmount: 6500,
      heardAboutUs: "others",
    }));
  });

  it("does not post a tuition with no salary", () => {
    open();
    type(/Guardian name/, "Off-site Guardian");
    fireEvent.click(postButton());
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

const draft = {
  requestId: 14,
  guardianName: "Sojib Rahman",
  guardianPhone: "+8801674936203",
  guardianIsAdminPosted: true,
  tuitionType: "home",
  tuitionCityLocationId: "dhaka-city",
  tuitionLocationId: "dhaka-shyamoli",
  category: "Bangla Medium",
  curriculumType: null,
  classCourse: "Class 4",
  subjects: JSON.stringify(["General Maths"]),
  studentGender: "female",
  addressDetails: "House 4, Road 2",
  studentCount: 2,
  groupCapacity: null,
  packageDurationMonths: null,
  daysPerWeek: 3,
  preferredGender: "female",
  budgetAmount: 6500,
  instituteName: "City College",
  heardAboutUs: "facebook",
  notes: "Evening slots only",
};

const openEdit = (overrides: Partial<typeof draft> = {}) =>
  render(<AdminAddTuitionModal onClose={vi.fn()} onPosted={vi.fn()} draft={{ ...draft, ...overrides }} />);
const updateButton = () => screen.getAllByRole("button", { name: /^Update$/ })[0];

describe("Edit", () => {
  it("opens the same form filled in, headed by the Job ID", () => {
    openEdit();

    expect(screen.getByRole("heading", { name: /Edit Job ID 6813/ })).toBeTruthy();
    expect((screen.getByLabelText(/Guardian name/) as HTMLInputElement).value).toBe("Sojib Rahman");
    expect((screen.getByLabelText(/Mobile number/) as HTMLInputElement).value).toBe("+8801674936203");
    expect((screen.getByLabelText(/Class \/ level/) as HTMLSelectElement).value).toBe("Class 4");
    expect((screen.getByLabelText(/Days per week/) as HTMLSelectElement).value).toBe("3");
    expect((screen.getByLabelText(/Monthly salary/) as HTMLInputElement).value).toBe("6500");
    expect((screen.getByLabelText(/Number of students/) as HTMLInputElement).value).toBe("2");
    expect((screen.getByLabelText(/Institute Name/) as HTMLInputElement).value).toBe("City College");
    expect((screen.getByLabelText(/Additional notes/) as HTMLTextAreaElement).value).toBe("Evening slots only");
    // The subject the tuition already carries comes back chosen.
    const subjects = screen.getByRole("group", { name: /Subject selection/ });
    expect(within(subjects).getByRole("button", { pressed: true }).textContent).toContain("General Maths");
  });

  it("shows the tuition's own Job ID, which an edit cannot change", () => {
    openEdit();
    // Anchored: the dialog itself is named "Edit Job ID 6813".
    const field = screen.getByLabelText(/^Job ID/) as HTMLInputElement;
    expect(field.value).toBe("6813");
    expect(field.readOnly).toBe(true);
  });

  it("sends the edit against that tuition, not a new one", () => {
    openEdit();
    type(/Monthly salary/, "8000");
    fireEvent.click(updateButton());

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ requestId: 14, budgetAmount: 8000 }));
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("jobId");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("lets an Admin correct the name and number they wrote themselves", () => {
    openEdit({ guardianIsAdminPosted: true });
    expect((screen.getByLabelText(/Guardian name/) as HTMLInputElement).readOnly).toBe(false);
    expect((screen.getByLabelText(/Mobile number/) as HTMLInputElement).readOnly).toBe(false);
  });

  it("will not let one be changed on a Guardian who registered themselves", () => {
    // Their number is how they sign in - an Admin editing a job must not be
    // able to lock them out of their own account.
    openEdit({ guardianIsAdminPosted: false });
    expect((screen.getByLabelText(/Guardian name/) as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText(/Mobile number/) as HTMLInputElement).readOnly).toBe(true);
  });
});
