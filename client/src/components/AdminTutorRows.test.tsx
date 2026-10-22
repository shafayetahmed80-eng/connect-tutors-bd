// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminTutorRows, { type AdminTutorRow } from "./AdminTutorRows";

const DESKTOP_WIDTH = 1024;

afterEach(() => {
  cleanup();
  window.innerWidth = DESKTOP_WIDTH;
});

function onAPhone() {
  window.innerWidth = 375;
}

const mockTutors: AdminTutorRow[] = [
  {
    id: "tut-1",
    tutorNumber: 4892,
    name: "Tanvir Rahman",
    phone: "01712345678",
    instituteName: "BUET",
    departmentName: "Computer Science and Engineering",
    cityLabel: "Dhaka",
    locationLabel: "Dhanmondi",
    teachingExperienceYears: 3,
    profileStatus: "approved",
    verified: true,
  },
  {
    id: "tut-2",
    tutorNumber: 4893,
    name: "Nusrat Jahan",
    phone: "01812345679",
    instituteName: "Dhaka University",
    departmentName: "Physics",
    cityLabel: "Dhaka",
    locationLabel: "Mirpur",
    teachingExperienceYears: 1,
    profileStatus: "pending",
    verified: false,
    applicationStage: "shortlisted",
    appliedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

describe("AdminTutorRows", () => {
  it("renders a full table on desktop screens", () => {
    render(
      <AdminTutorRows
        tutors={mockTutors}
        caption="Tutor Directory"
        emptyLabel="No tutors found"
      />
    );

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Tanvir Rahman")).toBeTruthy();
    expect(screen.getByText("Nusrat Jahan")).toBeTruthy();
    expect(screen.getByText("BUET")).toBeTruthy();
    expect(screen.getByText("Dhaka University")).toBeTruthy();
  });

  it("renders space-efficient compact cards on mobile screens", () => {
    onAPhone();
    render(
      <AdminTutorRows
        tutors={mockTutors}
        caption="Tutor Directory"
        emptyLabel="No tutors found"
        showApplicationStage={true}
      />
    );

    // Should not render a table
    expect(screen.queryByRole("table")).toBeNull();
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(2);

    // Card 1 assertions
    const card1 = within(cards[0]);
    expect(card1.getByText("Tanvir Rahman")).toBeTruthy();
    expect(card1.getByText("4892")).toBeTruthy();
    expect(card1.getByText("approved")).toBeTruthy();
    expect(card1.getByLabelText("Verified")).toBeTruthy();
    expect(card1.getByText("BUET")).toBeTruthy();
    expect(card1.getByText(/Computer Science and Engineering/)).toBeTruthy();
    expect(card1.getByText(/Dhanmondi, Dhaka/)).toBeTruthy();
    expect(card1.getByText(/3 yr exp/)).toBeTruthy();

    // Contact controls
    expect(card1.getByRole("link", { name: "Call +880 1712 345678" })).toBeTruthy();
    expect(card1.getByRole("link", { name: "Message +880 1712 345678 on WhatsApp" })).toBeTruthy();
    expect(card1.getByRole("button", { name: "Copy +880 1712 345678" })).toBeTruthy();

    // Card 2 assertions (with application stage)
    const card2 = within(cards[1]);
    expect(card2.getByText("Nusrat Jahan")).toBeTruthy();
    expect(card2.getByText("4893")).toBeTruthy();
    expect(card2.getByText("pending")).toBeTruthy();
    expect(card2.getByLabelText("Not verified")).toBeTruthy();
    expect(card2.getByText("Shortlisted")).toBeTruthy();
  });

  it("supports hand-picking row selection on mobile cards", () => {
    onAPhone();
    const selected = new Set<string>(["tut-1"]);
    const onToggle = vi.fn();

    render(
      <AdminTutorRows
        tutors={mockTutors}
        caption="Tutor Directory"
        emptyLabel="No tutors found"
        selection={{
          isSelected: id => selected.has(id),
          onToggle,
        }}
      />
    );

    const checkbox1 = screen.getByRole("checkbox", { name: "Select Tanvir Rahman" }) as HTMLInputElement;
    expect(checkbox1.checked).toBe(true);

    const checkbox2 = screen.getByRole("checkbox", { name: "Select Nusrat Jahan" }) as HTMLInputElement;
    expect(checkbox2.checked).toBe(false);

    fireEvent.click(checkbox2);
    expect(onToggle).toHaveBeenCalledWith("tut-2");
  });

  it("renders guardian appointment actions on mobile cards", () => {
    onAPhone();
    const onApprove = vi.fn();
    const onDecline = vi.fn();

    const tutorWithAppointment: AdminTutorRow = {
      ...mockTutors[0],
      appointmentRequestedAt: new Date().toISOString(),
    };

    render(
      <AdminTutorRows
        tutors={[tutorWithAppointment]}
        caption="Applied Tutors"
        emptyLabel="None"
        showGuardianMarks={true}
        appointmentActions={{
          busy: false,
          onApprove,
          onDecline,
        }}
      />
    );

    expect(screen.getByText("Appointment requested")).toBeTruthy();
    const approveBtn = screen.getByRole("button", { name: "Approve the appointment of Tanvir Rahman" });
    const declineBtn = screen.getByRole("button", { name: "Decline the appointment request for Tanvir Rahman" });

    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledWith(tutorWithAppointment);

    fireEvent.click(declineBtn);
    expect(onDecline).toHaveBeenCalledWith(tutorWithAppointment);
  });

  it("renders applicant actions (Shortlist, Appoint, Confirm) on mobile cards", () => {
    onAPhone();
    const onAction = vi.fn();

    render(
      <AdminTutorRows
        tutors={[mockTutors[0]]}
        caption="Applied Tutors"
        emptyLabel="None"
        applicantRowActions={{
          busy: false,
          optionsFor: () => [
            { action: "shortlist", disabled: false },
            { action: "appoint", disabled: false },
          ],
          onAction,
        }}
      />
    );

    const shortlistBtn = screen.getByRole("button", { name: "Shortlist Tanvir Rahman" });
    const appointBtn = screen.getByRole("button", { name: "Appoint Tanvir Rahman" });

    fireEvent.click(shortlistBtn);
    expect(onAction).toHaveBeenCalledWith(mockTutors[0], "shortlist");

    fireEvent.click(appointBtn);
    expect(onAction).toHaveBeenCalledWith(mockTutors[0], "appoint");
  });

  it("renders disabled reason and title for disabled applicant actions on mobile cards", () => {
    onAPhone();
    render(
      <AdminTutorRows
        tutors={[mockTutors[1]]}
        caption="Applied Tutors"
        emptyLabel="None"
        applicantRowActions={{
          busy: false,
          optionsFor: () => [
            { action: "shortlist", disabled: false },
            { action: "appoint", disabled: true, disabledReason: "Profile is pending review. Approve profile first." },
          ],
          onAction: vi.fn(),
        }}
      />
    );

    const appointBtn = screen.getByRole("button", { name: "Appoint Nusrat Jahan" });
    expect((appointBtn as HTMLButtonElement).disabled).toBe(true);
    expect(appointBtn.getAttribute("title")).toBe("Profile is pending review. Approve profile first.");
    expect(screen.getByText(/Profile is pending review. Approve profile first./)).toBeTruthy();
  });

  it("displays Pending Profile badge and disabled title in applicant table view", () => {
    render(
      <AdminTutorRows
        tutors={[mockTutors[1]]}
        caption="Applied Tutors"
        emptyLabel="None"
        showApplicationStage={true}
        applicantRowActions={{
          busy: false,
          optionsFor: () => [
            { action: "shortlist", disabled: false },
            { action: "appoint", disabled: true, disabledReason: "Profile is pending review. Approve profile first." },
          ],
          onAction: vi.fn(),
        }}
      />
    );

    expect(screen.getByText("Pending Profile")).toBeTruthy();
    const appointBtn = screen.getByRole("button", { name: "Appoint Nusrat Jahan" });
    expect((appointBtn as HTMLButtonElement).disabled).toBe(true);
    expect(appointBtn.getAttribute("title")).toBe("Profile is pending review. Approve profile first.");
  });

  it("opens the Quick Peek bottom sheet drawer on tapping the peek button", () => {
    onAPhone();
    render(
      <AdminTutorRows
        tutors={[mockTutors[0]]}
        caption="Tutor Directory"
        emptyLabel="None"
      />
    );

    const peekBtn = screen.getByRole("button", { name: "Quick peek for Tanvir Rahman" });
    fireEvent.click(peekBtn);

    // Bottom sheet drawer content should be visible
    expect(screen.getByText("Quick profile summary & direct actions")).toBeTruthy();
    expect(screen.getByText("Academic Background")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Full Profile" }).getAttribute("href")).toBe("/admin/tutor-profiles/tut-1");
  });
});
