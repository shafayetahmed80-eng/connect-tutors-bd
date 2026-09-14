// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuardianApplicantRows, { type GuardianApplicantRow } from "./GuardianApplicantRows";

afterEach(() => cleanup());

const applicant = (id: string, name: string, verified: boolean): GuardianApplicantRow => ({
  id, tutorNumber: 777, name, phone: null, phoneHidden: true, instituteName: null, departmentName: null,
  cityLabel: null, locationLabel: null, teachingExperienceYears: null, verified,
  shortlisted: false, appointmentRequested: false, appointed: false,
});

describe("Guardian applicant rows", () => {
  it("marks a Tutor with a Confirmed tuition Verified beside the name, and nobody else", () => {
    render(<GuardianApplicantRows
      tutors={[applicant("tutor-175", "Tania Sultana", true), applicant("tutor-404", "Tanvir Ahmed", false)]}
      requestId={13}
      emptyLabel="No Tutor has applied yet."
      serialFrom={1}
      actions={{ canRequestAppointment: true, busy: false, onShortlist: vi.fn(), onRequestAppointment: vi.fn(), onWithdrawAppointment: vi.fn() }}
    />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Tania Sultana")).toBeTruthy();
    expect(within(rows[0]).getByText("Verified")).toBeTruthy();
    expect(within(rows[1]).queryByText("Verified")).toBeNull();
  });
});
