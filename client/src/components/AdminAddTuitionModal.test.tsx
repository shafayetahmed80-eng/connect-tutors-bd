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

afterEach(() => { cleanup(); vi.clearAllMocks(); window.localStorage.clear(); window.sessionStorage.clear(); });

const open = () => render(<AdminAddTuitionModal onClose={vi.fn()} onPosted={vi.fn()} />);
const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
// Two Post buttons are rendered - one in the header for a laptop, one at the
// foot for a phone - and CSS shows exactly one. jsdom applies no CSS, so both
// are in the tree here; either one runs the same handler.
const postButton = () => screen.getAllByRole("button", { name: /^Post$/ })[0];

/** Types into a chip box and takes the one offer that matches, as a person would. */
function chooseChip(scope: HTMLElement | Document, label: RegExp, option: string) {
  const box = within(scope as HTMLElement).getByRole("combobox", { name: label });
  fireEvent.click(box);
  fireEvent.change(box, { target: { value: option } });
  const list = within(scope as HTMLElement).getByRole("listbox");
  fireEvent.click(within(list).getByRole("button", { name: option }));
}
/** The block a curriculum opens: its class box, and a subject group for each class chosen. */
const curriculum = (name: string) => screen.getByRole("group", { name });

/** Everything a tuition needs to post, so a test can vary only what it is about. */
function fillTuition() {
  type(/Guardian name/, "Off-site Guardian");
  type(/Mobile number/, "01999888777");
  chooseChip(document.body, /Curriculum \/ category/, "Bangla Medium");
  chooseChip(curriculum("Bangla Medium"), /Class \/ level/, "Class 4");
  fireEvent.click(within(screen.getByRole("group", { name: "Subjects for Class 4" })).getAllByRole("button")[0]);
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
    expect(screen.getByRole("combobox", { name: /Curriculum \/ category/ })).toBeTruthy();
    for (const field of [/Tuition type/, /Student gender/, /Days per week/, /Preferred Tutor gender/, /Monthly salary/, /Institute Name/, /Where Did You Hear About Us/, /Address Details/, /Additional notes/]) {
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

  it("offers the subjects that belong to the chosen curriculum and class, a list for each class", () => {
    open();
    chooseChip(document.body, /Curriculum \/ category/, "Bangla Medium");
    chooseChip(curriculum("Bangla Medium"), /Class \/ level/, "Class 4");
    chooseChip(curriculum("Bangla Medium"), /Class \/ level/, "Class 9");
    const subjectsOf = (className: string) => within(screen.getByRole("group", { name: `Subjects for ${className}` })).getAllByRole("button").map(button => button.textContent);

    // A different class is a different subject list, not the same one again.
    expect(subjectsOf("Class 9")).not.toEqual(subjectsOf("Class 4"));
  });

  it("keeps each class's own subjects, and takes a class's subjects away with the class", () => {
    open();
    chooseChip(document.body, /Curriculum \/ category/, "Bangla Medium");
    chooseChip(curriculum("Bangla Medium"), /Class \/ level/, "Class 4");
    chooseChip(curriculum("Bangla Medium"), /Class \/ level/, "Class 9");
    fireEvent.click(within(screen.getByRole("group", { name: "Subjects for Class 9" })).getAllByRole("button").at(-1)!);
    expect(within(screen.getByRole("group", { name: "Subjects for Class 9" })).getByRole("button", { pressed: true })).toBeTruthy();
    // Class 4 has none of its own yet: choosing in one class does not choose in another.
    expect(screen.getByRole("status", { name: /0 of \d+ subjects selected for Class 4/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove Class 9" }));
    expect(screen.queryByRole("group", { name: "Subjects for Class 9" })).toBeNull();
  });

  it("takes a second curriculum, with its own classes", () => {
    open();
    chooseChip(document.body, /Curriculum \/ category/, "Bangla Medium");
    chooseChip(document.body, /Curriculum \/ category/, "English Version");

    expect(curriculum("Bangla Medium")).toBeTruthy();
    expect(curriculum("English Version")).toBeTruthy();
    chooseChip(curriculum("English Version"), /Class \/ level/, "Class 6");
    expect(screen.getByRole("group", { name: "Subjects for Class 6" })).toBeTruthy();
  });

  it("sends the tuition as the Guardian journey would have posted it", () => {
    open();
    fillTuition();
    fireEvent.click(postButton());

    expect(mocks.post).toHaveBeenCalledWith(expect.objectContaining({
      guardianName: "Off-site Guardian",
      guardianPhone: "01999888777",
      tuitionType: "home",
      learningNeeds: [{ category: "Bangla Medium", classes: [{ classCourse: "Class 4", subjects: [expect.any(String)] }] }],
      daysPerWeek: 3,
      // Typed with a comma, sent as a number.
      budgetAmount: 6500,
      heardAboutUs: "others",
    }));
  });

  it("asks for a Tutoring Time in the browser's time box, and does not insist on one", () => {
    open();

    const box = screen.getByLabelText(/Tutoring Time/) as HTMLInputElement;
    expect(box.type).toBe("time");
    expect(box.value).toBe("");
    // Optional like the Guardian journey's own: no required star beside the title.
    expect(box.closest("label")!.textContent).not.toContain("*");
  });

  it("posts the time the Admin typed as a 24-hour HH:mm", () => {
    open();
    fillTuition();
    type(/Tutoring Time/, "16:30");
    fireEvent.click(postButton());

    expect(mocks.post).toHaveBeenCalledWith(expect.objectContaining({ tutoringTime: "16:30", daysPerWeek: 3, budgetAmount: 6500 }));
  });

  it("posts an explicit null, not an absent key, when the box is blank", () => {
    open();
    fillTuition();
    fireEvent.click(postButton());

    expect(mocks.post).toHaveBeenCalledTimes(1);
    // The key is there and holds null: the server would refuse an empty string, and an absent key now
    // means "leave the stored time alone", which a post has nothing to leave alone but which an edit does.
    expect(mocks.post.mock.calls[0][0]).toHaveProperty("tutoringTime", null);
  });

  it("posts an explicit null when the Admin typed a time and then cleared it again", () => {
    open();
    fillTuition();
    type(/Tutoring Time/, "16:30");
    type(/Tutoring Time/, "");
    fireEvent.click(postButton());

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post.mock.calls[0][0]).toHaveProperty("tutoringTime", null);
  });

  it("will not post a tuition whose class has no subject chosen yet", () => {
    open();
    fillTuition();
    fireEvent.click(within(screen.getByRole("group", { name: "Subjects for Class 4" })).getByRole("button", { pressed: true }));
    fireEvent.click(postButton());

    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Select at least one subject for Class 4 to continue.");
  });

  it("does not post a tuition with no salary", () => {
    open();
    type(/Guardian name/, "Off-site Guardian");
    fireEvent.click(postButton());
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

const draft: { learningNeeds?: Array<{ category: string; curriculumType: string | null; classes: Array<{ classCourse: string; subjects: string[] }> }> } & Record<string, unknown> & {
  requestId: number; guardianName: string; guardianPhone: string; guardianIsAdminPosted: boolean; tuitionType: string; tuitionCityLocationId: string; tuitionLocationId: string;
  category: string; curriculumType: string | null; classCourse: string; subjects: string; studentGender: string; addressDetails: string; studentCount: number;
  groupCapacity: number | null; packageDurationMonths: number | null; daysPerWeek: number; preferredGender: string; budgetAmount: number; instituteName: string;
  heardAboutUs: string; notes: string;
} = {
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
    expect((screen.getByLabelText(/Mobile number/) as HTMLInputElement).value).toBe("1674 936 203");
    expect((screen.getByLabelText(/Days per week/) as HTMLSelectElement).value).toBe("3");
    expect((screen.getByLabelText(/Monthly salary/) as HTMLInputElement).value).toBe("6500");
    expect((screen.getByLabelText(/Number of students/) as HTMLInputElement).value).toBe("2");
    expect((screen.getByLabelText(/Institute Name/) as HTMLInputElement).value).toBe("City College");
    expect((screen.getByLabelText(/Additional notes/) as HTMLTextAreaElement).value).toBe("Evening slots only");
    // The curriculum, class and subject the tuition already carries come back chosen.
    expect(within(curriculum("Bangla Medium")).getByRole("button", { name: "Remove Class 4" })).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Subjects for Class 4" })).getByRole("button", { pressed: true }).textContent).toContain("General Maths");
  });

  it("opens a tuition that asks for several curricula and classes with each one chosen, and sends the same list back", () => {
    openEdit({
      learningNeeds: [
        { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 4", subjects: ["General Maths"] }] },
        { category: "English Version", curriculumType: null, classes: [{ classCourse: "Class 6", subjects: ["English"] }, { classCourse: "Class 7", subjects: ["General Science"] }] },
      ],
    });

    expect(curriculum("Bangla Medium")).toBeTruthy();
    expect(within(curriculum("English Version")).getByRole("button", { name: "Remove Class 7" })).toBeTruthy();
    expect(within(screen.getByRole("group", { name: "Subjects for Class 7" })).getByRole("button", { pressed: true }).textContent).toContain("General Science");

    fireEvent.click(updateButton());
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 14,
      learningNeeds: [
        { category: "Bangla Medium", classes: [{ classCourse: "Class 4", subjects: ["General Maths"] }] },
        { category: "English Version", classes: [{ classCourse: "Class 6", subjects: ["English"] }, { classCourse: "Class 7", subjects: ["General Science"] }] },
      ],
    }));
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

  it("opens with the time the tuition already carries, and sends it back with the edit", () => {
    openEdit({ tutoringTime: "16:30" });

    expect((screen.getByLabelText(/Tutoring Time/) as HTMLInputElement).value).toBe("16:30");
    fireEvent.click(updateButton());

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ requestId: 14, tutoringTime: "16:30" }));
  });

  it("sends a changed time in place of the old one", () => {
    openEdit({ tutoringTime: "16:30" });
    type(/Tutoring Time/, "07:15");
    fireEvent.click(updateButton());

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ requestId: 14, tutoringTime: "07:15" }));
  });

  it("sends an explicit null once the Admin has cleared the time, which is how the server clears it", () => {
    openEdit({ tutoringTime: "16:30" });
    type(/Tutoring Time/, "");
    fireEvent.click(updateButton());

    expect(mocks.update).toHaveBeenCalledTimes(1);
    // Null, not a missing key: a missing key on an edit leaves the stored time alone.
    expect(mocks.update.mock.calls[0][0]).toHaveProperty("tutoringTime", null);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ requestId: 14 }));
  });

  it("sends the saved time back as it was when the Admin edits something else", () => {
    openEdit({ tutoringTime: "16:30" });
    type(/Monthly salary/, "8000");
    fireEvent.click(updateButton());

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0][0]).toHaveProperty("tutoringTime", "16:30");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ requestId: 14, budgetAmount: 8000 }));
  });

  it("opens a saved time that carries stray spaces trimmed, and sends the clean HH:mm", () => {
    // The server refuses a padded time outright now, so the form must never be the one to send it.
    openEdit({ tutoringTime: " 08:05 " });

    expect((screen.getByLabelText(/Tutoring Time/) as HTMLInputElement).value).toBe("08:05");
    fireEvent.click(updateButton());

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0][0]).toHaveProperty("tutoringTime", "08:05");
  });

  it.each([
    ["has none", null],
    ["was made before the field existed", undefined],
    ["holds something that is not an HH:mm time", "25:99"],
  ])("opens the time box empty and sends an explicit null for a tuition that %s", (_name, stored) => {
    openEdit({ tutoringTime: stored });

    expect((screen.getByLabelText(/Tutoring Time/) as HTMLInputElement).value).toBe("");
    fireEvent.click(updateButton());

    expect(mocks.update).toHaveBeenCalledTimes(1);
    // Always present, and null: an edit that has nothing to say about the time still says so plainly.
    expect(mocks.update.mock.calls[0][0]).toHaveProperty("tutoringTime", null);
  });

  it("opens a legacy draft that has no tutoringTime key at all with an empty box, and sends null", () => {
    // Not the same as a draft whose key holds undefined: the base draft above predates the field, so the key is not in the object.
    expect(draft).not.toHaveProperty("tutoringTime");
    openEdit();

    expect((screen.getByLabelText(/Tutoring Time/) as HTMLInputElement).value).toBe("");
    fireEvent.click(updateButton());

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0][0]).toHaveProperty("tutoringTime", null);
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

  it("restores a saved draft when opening Add Tuition and clears it on click", () => {
    window.localStorage.setItem("connect-tutors:draft:admin-add-tuition", JSON.stringify({
      data: {
        guardianName: "Restored Guardian",
        guardianPhone: "1799999999",
        salaryAmount: "7000",
        notes: "Restored note",
      },
      savedAt: Date.now(),
    }));

    open();

    expect((screen.getByLabelText(/Guardian name/) as HTMLInputElement).value).toBe("Restored Guardian");
    expect((screen.getByLabelText(/Mobile number/) as HTMLInputElement).value).toBe("1799 999 999");
    expect(screen.getByText(/সংরক্ষিত ড্রাফট/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /মুছে ফেলুন/ }));
    expect((screen.getByLabelText(/Guardian name/) as HTMLInputElement).value).toBe("");
    expect(screen.queryByText(/সংরক্ষিত ড্রাফট/)).toBeNull();
    expect(window.localStorage.getItem("connect-tutors:draft:admin-add-tuition")).toBeNull();
  });
});
