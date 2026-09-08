// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: { createPostedTuition: { useMutation: () => ({ mutate: mocks.post, isPending: false }) } },
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [{ id: "dhaka-city", label: "Dhaka" }] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [{ id: "dhaka-shyamoli", label: "Shyamoli" }] }) },
    },
    siteLimits: { resolved: { useQuery: () => ({ data: undefined }) } },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import AdminAddTuitionModal from "./AdminAddTuitionModal";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const open = () => render(<AdminAddTuitionModal onClose={vi.fn()} onPosted={vi.fn()} />);
const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
// Two Post buttons are rendered - one in the header for a laptop, one at the
// foot for a phone - and CSS shows exactly one. jsdom applies no CSS, so both
// are in the tree here; either one runs the same handler.
const postButton = () => screen.getAllByRole("button", { name: /^Post$/ })[0];

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

    type(/Guardian name/, "Off-site Guardian");
    type(/Mobile number/, "01999888777");
    fireEvent.change(screen.getByLabelText(/Curriculum \/ category/), { target: { value: "Bangla Medium" } });
    fireEvent.change(screen.getByLabelText(/Class \/ level/), { target: { value: "Class 4" } });
    const subjects = screen.getByRole("group", { name: /Subject selection/ });
    fireEvent.click(within(subjects).getAllByRole("button")[0]);
    fireEvent.change(screen.getByLabelText(/Days per week/), { target: { value: "3" } });
    type(/Monthly salary/, "6,500");
    fireEvent.change(screen.getByLabelText(/Where Did You Hear About Us/), { target: { value: "others" } });

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
