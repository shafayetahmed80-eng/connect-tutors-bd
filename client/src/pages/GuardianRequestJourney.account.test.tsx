// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountStage, canStartGuardianRequestSubmission, getGuardianLocationSelectionState, RequestStage, SuccessState } from "./GuardianRequestJourney";

afterEach(() => cleanup());

const accountStageProps = {
  name: "",
  email: "",
  gender: "female" as const,
  password: "",
  confirmPassword: "",
  showPassword: false,
  cities: [{ id: "dhaka", label: "Dhaka" }],
  accountCityId: "",
  accountLocations: [],
  accountLocationId: "",
  accountCityLabel: "",
  termsAccepted: false,
  pending: false,
  onName: vi.fn(),
  onEmail: vi.fn(),
  onGender: vi.fn(),
  onPassword: vi.fn(),
  onConfirmPassword: vi.fn(),
  onTogglePassword: vi.fn(),
  onCity: vi.fn(),
  onLocation: vi.fn(),
  onTerms: vi.fn(),
  onBack: vi.fn(),
  onCreate: vi.fn(),
};

function PasswordStrengthHarness() {
  const [password, setPassword] = React.useState("");
  return <AccountStage {...accountStageProps} password={password} onPassword={setPassword} />;
}

function PasswordMatchHarness() {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  return <AccountStage {...accountStageProps} password={password} confirmPassword={confirmPassword} onPassword={setPassword} onConfirmPassword={setConfirmPassword} />;
}

const requestStageProps = {
  step: 3 as const,
  requestInput: { category: "English Medium", curriculumType: "Cambridge", classCourse: "Class 1–5", selectedSubjects: ["English", "Mathematics"], tuitionType: "home" as const, groupCapacity: "", packageDurationMonths: "", studentCount: "1", studentGender: "" as const, addressDetails: "", tuitionCityLocationId: "dhaka", tuitionLocationId: "mirpur-10", daysPerWeek: "4", preferredGender: "female" as const, budgetKind: "range" as const, budgetMinimum: "5000", budgetMaximum: "7000" },
  studentName: "Amina",
  notes: "Weekday afternoons preferred.",
  cities: [{ id: "dhaka", label: "Dhaka" }],
  tuitionLocations: [{ id: "mirpur-10", label: "Mirpur 10" }],
  tuitionCityLabel: "Dhaka",
  tuitionLocationLabel: "Mirpur 10",
  pending: false,
  onSetCategory: vi.fn(), onSetCurriculumType: vi.fn(), onSetClassCourse: vi.fn(), onSetStudentName: vi.fn(), onSetStudentGender: vi.fn(), onSetAddressDetails: vi.fn(), onToggleSubject: vi.fn(), onSetTuitionType: vi.fn(), onSetGroupCapacity: vi.fn(), onSetPackageDurationMonths: vi.fn(), onSetStudentCount: vi.fn(), onSetTuitionCity: vi.fn(), onSetTuitionLocation: vi.fn(), onSetDays: vi.fn(), onSetPreferredGender: vi.fn(), onSetBudgetKind: vi.fn(), onSetBudgetMinimum: vi.fn(), onSetBudgetMaximum: vi.fn(), onSetNotes: vi.fn(), onBack: vi.fn(), onAdvance: vi.fn(), onSubmit: vi.fn(), onEditStep: vi.fn(),
};

describe("Guardian private-account presentation", () => {
  it("uses the Tutor-style account controls, recovery actions, and accessible password affordance", () => {
    render(<AccountStage {...accountStageProps} />);

    expect(screen.getByText("Step 2 of 3")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Create your private Guardian account" })).not.toBeNull();
    expect((screen.getByRole("radio", { name: "Female" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("radio", { name: "Male" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Show password" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Back to phone" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Sign in with email or mobile" }).getAttribute("href")).toBe("/auth?role=guardian");
    expect(screen.getByRole("button", { name: "Create Guardian account" })).not.toBeNull();
  });

  it("provides real-time, accessible password-strength guidance without changing the password field", () => {
    render(<PasswordStrengthHarness />);

    const passwordInput = screen.getByPlaceholderText("At least 8 characters") as HTMLInputElement;
    expect(screen.getByText(/Use at least 8 characters/).textContent).toContain("Use at least 8 characters");

    fireEvent.change(passwordInput, { target: { value: "guardian" } });
    expect(screen.getByRole("status", { name: /Password strength: Weak/ }).textContent).toContain("Weak");
    expect(passwordInput.type).toBe("password");

    fireEvent.change(passwordInput, { target: { value: "GuardianPass2026!" } });
    expect(screen.getByRole("status", { name: /Password strength: Excellent/ }).textContent).toContain("Excellent");
    expect(screen.getByRole("progressbar", { name: "Password strength" }).getAttribute("aria-valuenow")).toBe("4");
  });

  it("shows real-time match guidance only after confirmation begins and retains the existing password fields", () => {
    render(<PasswordMatchHarness />);

    const passwordInput = screen.getByPlaceholderText("At least 8 characters") as HTMLInputElement;
    const confirmInput = screen.getByPlaceholderText("Re-enter your password") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "GuardianPass2026!" } });
    expect(screen.queryByText("Passwords match")).toBeNull();
    expect(screen.queryByText(/Passwords do not match yet/)).toBeNull();

    fireEvent.change(confirmInput, { target: { value: "GuardianPass" } });
    expect(screen.getByText(/Passwords do not match yet/).textContent).toContain("Passwords do not match yet");
    expect(confirmInput.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(confirmInput, { target: { value: "GuardianPass2026!" } });
    expect(screen.getByText("Passwords match")).not.toBeNull();
    expect(confirmInput.getAttribute("aria-invalid")).toBe("false");
    expect(passwordInput.type).toBe("password");
    expect(confirmInput.type).toBe("password");
  });

  it("shows a concise password-manager hint without exposing the password value", () => {
    render(<PasswordStrengthHarness />);

    const passwordInput = screen.getByPlaceholderText("At least 8 characters") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "GuardianPass2026!" } });

    const hint = screen.getByRole("note", { name: /password manager/i });
    expect(hint.textContent).toMatch(/browser or device password manager/i);
    expect(hint.textContent).toMatch(/generate and save/i);
    expect(hint.textContent).not.toContain("GuardianPass2026!");
    expect(hint.getAttribute("class")).toContain("flex-wrap");
    expect(passwordInput.getAttribute("autocomplete")).toBe("new-password");
  });

  it("recognises only a current City and Area pair as a complete location selection", () => {
    expect(getGuardianLocationSelectionState("dhaka", "mirpur-10", "Dhaka", "Mirpur 10")).toEqual({
      complete: true,
      cityLabel: "Dhaka",
      locationLabel: "Mirpur 10",
    });
    expect(getGuardianLocationSelectionState("dhaka", "", "Dhaka", "")).toBeNull();
    expect(getGuardianLocationSelectionState("", "mirpur-10", "", "Mirpur 10")).toBeNull();
    expect(getGuardianLocationSelectionState("dhaka", "mirpur-10", "Dhaka", "Uttara")).toEqual({
      complete: true,
      cityLabel: "Dhaka",
      locationLabel: "Uttara",
    });
    expect(getGuardianLocationSelectionState("dhaka", "stale", "Dhaka", "")).toBeNull();
  });

  it("offers a keyboard-reachable location edit action that clears only the selected area", async () => {
    const onSetTuitionLocation = vi.fn();
    render(<RequestStage step={2} requestInput={{ category: "Bangla Medium", curriculumType: "", classCourse: "Class 9–10", selectedSubjects: ["Mathematics"], tuitionType: "home", groupCapacity: "", packageDurationMonths: "", studentCount: "1", studentGender: "", addressDetails: "", tuitionCityLocationId: "dhaka", tuitionLocationId: "mirpur-10", daysPerWeek: "3", preferredGender: "any", budgetKind: "discuss", budgetMinimum: "", budgetMaximum: "" }} studentName="" notes="" cities={[{ id: "dhaka", label: "Dhaka" }]} tuitionLocations={[{ id: "mirpur-10", label: "Mirpur 10" }]} tuitionCityLabel="Dhaka" tuitionLocationLabel="Mirpur 10" pending={false} onSetCategory={vi.fn()} onSetCurriculumType={vi.fn()} onSetClassCourse={vi.fn()} onSetStudentName={vi.fn()} onSetStudentGender={vi.fn()} onSetAddressDetails={vi.fn()} onToggleSubject={vi.fn()} onSetTuitionType={vi.fn()} onSetGroupCapacity={vi.fn()} onSetPackageDurationMonths={vi.fn()} onSetStudentCount={vi.fn()} onSetTuitionCity={vi.fn()} onSetTuitionLocation={onSetTuitionLocation} onSetDays={vi.fn()} onSetPreferredGender={vi.fn()} onSetBudgetKind={vi.fn()} onSetBudgetMinimum={vi.fn()} onSetBudgetMaximum={vi.fn()} onSetNotes={vi.fn()} onBack={vi.fn()} onAdvance={vi.fn()} onSubmit={vi.fn()} />);

    const editButton = screen.getByRole("button", { name: "Change selected location" });
    expect(editButton.className).toContain("min-h-11");
    fireEvent.click(editButton);
    expect(onSetTuitionLocation).toHaveBeenCalledWith("");
  });

  it("offers the approved Tuition Type options and explains the physical-location rule", () => {
    const onSetTuitionType = vi.fn();
    render(<RequestStage {...requestStageProps} step={2} onSetTuitionType={onSetTuitionType} />);

    expect(screen.getByRole("button", { name: "Home Tutoring" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Online Tutoring" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Group Tutoring" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Package Tutoring" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Home and Online Tutoring" })).toBeNull();
    expect(screen.getByText("City and location are required for Home, Group, and Package Tutoring.")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Group Tutoring" }));
    expect(onSetTuitionType).toHaveBeenCalledWith("group");
  });

  it("shows Maximum students only for Group Tutoring and keeps it in the private preview", () => {
    const onSetGroupCapacity = vi.fn();
    const { rerender } = render(<RequestStage {...requestStageProps} step={2} onSetGroupCapacity={onSetGroupCapacity} />);
    expect(screen.queryByRole("spinbutton", { name: /Maximum students/ })).toBeNull();

    rerender(<RequestStage {...requestStageProps} step={2} requestInput={{ ...requestStageProps.requestInput, tuitionType: "group", groupCapacity: "8" }} onSetGroupCapacity={onSetGroupCapacity} />);
    const capacityInput = screen.getByRole("spinbutton", { name: /Maximum students/ }) as HTMLInputElement;
    expect(capacityInput.min).toBe("2");
    expect(capacityInput.max).toBe("100");
    expect(capacityInput.getAttribute("aria-describedby")).toBe("group-capacity-hint");
    fireEvent.change(capacityInput, { target: { value: "12" } });
    expect(onSetGroupCapacity).toHaveBeenCalledWith("12");

    rerender(<RequestStage {...requestStageProps} step={3} requestInput={{ ...requestStageProps.requestInput, tuitionType: "group", groupCapacity: "8" }} />);
    expect(screen.getByText("Maximum students")).not.toBeNull();
    expect(screen.getByText("8 students")).not.toBeNull();
  });

  it("shows Package duration only for Package Tutoring and keeps it in the private preview", () => {
    const onSetPackageDurationMonths = vi.fn();
    const { rerender } = render(<RequestStage {...requestStageProps} step={2} onSetPackageDurationMonths={onSetPackageDurationMonths} />);
    expect(screen.queryByRole("spinbutton", { name: /Package duration/ })).toBeNull();

    rerender(<RequestStage {...requestStageProps} step={2} requestInput={{ ...requestStageProps.requestInput, tuitionType: "package", packageDurationMonths: "6" }} onSetPackageDurationMonths={onSetPackageDurationMonths} />);
    const durationInput = screen.getByRole("spinbutton", { name: /Package duration/ }) as HTMLInputElement;
    expect(durationInput.min).toBe("1");
    expect(durationInput.max).toBe("24");
    expect(durationInput.getAttribute("aria-describedby")).toBe("package-duration-months-hint");
    fireEvent.change(durationInput, { target: { value: "9" } });
    expect(onSetPackageDurationMonths).toHaveBeenCalledWith("9");

    rerender(<RequestStage {...requestStageProps} step={3} requestInput={{ ...requestStageProps.requestInput, tuitionType: "package", packageDurationMonths: "6" }} />);
    expect(screen.getByText("Package duration")).not.toBeNull();
    expect(screen.getByText("6 months")).not.toBeNull();
  });

  it("offers optional Student Gender and private Address Details directly after Student first name", () => {
    const onSetStudentGender = vi.fn();
    const onSetAddressDetails = vi.fn();
    render(<RequestStage {...requestStageProps} step={1} onSetStudentGender={onSetStudentGender} onSetAddressDetails={onSetAddressDetails} />);

    const studentName = screen.getByRole("textbox", { name: /Student first name/ });
    const studentGender = screen.getByRole("combobox", { name: /Student gender/ }) as HTMLSelectElement;
    const addressDetails = screen.getByRole("textbox", { name: /Address Details/ });
    expect(Array.from(studentGender.options).map(option => option.value)).toEqual(["", "female", "male"]);
    expect(studentGender.value).toBe("");
    expect(studentName.compareDocumentPosition(studentGender) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(studentGender.compareDocumentPosition(addressDetails) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/formally assigned Tutor only/)).not.toBeNull();
    fireEvent.change(studentGender, { target: { value: "male" } });
    fireEvent.change(addressDetails, { target: { value: "Use the west entrance" } });
    expect(onSetStudentGender).toHaveBeenCalledWith("male");
    expect(onSetAddressDetails).toHaveBeenCalledWith("Use the west entrance");
  });

  it("shows Number of students only for Home, Online, and Package requests while Group retains Maximum students", () => {
    const onSetStudentCount = vi.fn();
    const { rerender } = render(<RequestStage {...requestStageProps} step={2} onSetStudentCount={onSetStudentCount} />);
    const studentCount = screen.getByRole("spinbutton", { name: /Number of students/ }) as HTMLInputElement;
    expect(studentCount.min).toBe("1");
    expect(studentCount.max).toBe("100");
    fireEvent.change(studentCount, { target: { value: "3" } });
    expect(onSetStudentCount).toHaveBeenCalledWith("3");

    rerender(<RequestStage {...requestStageProps} step={2} requestInput={{ ...requestStageProps.requestInput, tuitionType: "online" }} onSetStudentCount={onSetStudentCount} />);
    expect(screen.getByRole("spinbutton", { name: /Number of students/ })).not.toBeNull();

    rerender(<RequestStage {...requestStageProps} step={2} requestInput={{ ...requestStageProps.requestInput, tuitionType: "package", packageDurationMonths: "6" }} onSetStudentCount={onSetStudentCount} />);
    expect(screen.getByRole("spinbutton", { name: /Number of students/ })).not.toBeNull();

    rerender(<RequestStage {...requestStageProps} step={2} requestInput={{ ...requestStageProps.requestInput, tuitionType: "group", groupCapacity: "8", studentCount: "" }} onSetStudentCount={onSetStudentCount} />);
    expect(screen.queryByRole("spinbutton", { name: /Number of students/ })).toBeNull();
    expect(screen.getByRole("spinbutton", { name: /Maximum students/ })).not.toBeNull();
  });

  it("shows the single-select Curriculum Type field only for English Medium", () => {
    const onSetCurriculumType = vi.fn();
    const { rerender } = render(<RequestStage {...requestStageProps} step={1} requestInput={{ ...requestStageProps.requestInput, category: "English Medium", curriculumType: "" }} onSetCurriculumType={onSetCurriculumType} />);

    const curriculumTypeSelect = screen.getByRole("combobox", { name: /Curriculum Type/ }) as HTMLSelectElement;
    expect(Array.from(curriculumTypeSelect.options).map(option => option.value)).toEqual(["", "British", "Cambridge", "Ed-excel"]);
    fireEvent.change(curriculumTypeSelect, { target: { value: "British" } });
    expect(onSetCurriculumType).toHaveBeenCalledWith("British");

    rerender(<RequestStage {...requestStageProps} step={1} requestInput={{ ...requestStageProps.requestInput, category: "Bangla Medium", curriculumType: "" }} onSetCurriculumType={onSetCurriculumType} />);
    expect(screen.queryByRole("combobox", { name: /Curriculum Type/ })).toBeNull();
  });

  it("presents Learning needs as a clear, accessible selection workspace with selection feedback", () => {
    render(<RequestStage {...requestStageProps} step={1} requestInput={{ ...requestStageProps.requestInput, category: "Bangla Medium", curriculumType: "", classCourse: "Class 1", selectedSubjects: ["English"] }} />);

    expect(screen.getByRole("heading", { name: "Tell us about the learning needs" })).not.toBeNull();
    expect(screen.getByRole("group", { name: "Learning details" })).not.toBeNull();
    expect(screen.getByRole("group", { name: "Subject selection" })).not.toBeNull();
    expect(screen.getByRole("status", { name: "1 subject selected" }).textContent).toContain("1 subject selected");
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Continue to tuition preferences" })).not.toBeNull();
  });

  it("shows a sectioned preview with edit-back actions that preserve the Guardian's entered details", () => {
    const onEditStep = vi.fn();
    render(<RequestStage {...requestStageProps} requestInput={{ ...requestStageProps.requestInput, studentGender: "female", addressDetails: "Opposite the community library" }} onEditStep={onEditStep} />);

    expect(screen.getByRole("heading", { name: "Review your request" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Learning needs" })).not.toBeNull();
    expect(screen.getByText("Curriculum Type")).not.toBeNull();
    expect(screen.getByText("Cambridge")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Tuition preferences" })).not.toBeNull();
    expect(screen.getByText("English, Mathematics")).not.toBeNull();
    expect(screen.getByText("Dhaka — Mirpur 10")).not.toBeNull();
    expect(screen.getByText("Weekday afternoons preferred.")).not.toBeNull();
    expect(screen.getByText("Student gender")).not.toBeNull();
    expect(screen.getAllByText("Female").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Address Details")).not.toBeNull();
    expect(screen.getByText("Opposite the community library")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit learning needs" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit tuition preferences" }));
    expect(onEditStep).toHaveBeenNthCalledWith(1, 1);
    expect(onEditStep).toHaveBeenNthCalledWith(2, 2);
  });

  it("prevents duplicate request starts while a request is pending and labels the protected action clearly", () => {
    render(<RequestStage {...requestStageProps} pending />);

    const submitButton = screen.getByRole("button", { name: "Sending request" }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    expect(canStartGuardianRequestSubmission({ mutationPending: false, submissionStarted: false })).toBe(true);
    expect(canStartGuardianRequestSubmission({ mutationPending: true, submissionStarted: false })).toBe(false);
    expect(canStartGuardianRequestSubmission({ mutationPending: false, submissionStarted: true })).toBe(false);
  });

  it("renders the approved private acknowledgement with dashboard request actions", () => {
    render(<SuccessState requestId={415} />);

    expect(screen.getByRole("heading", { name: "Thank you. Your request is now pending review." })).not.toBeNull();
    expect(screen.getByText("#415")).not.toBeNull();
    expect(screen.getByText(/contact you to confirm any changes before any job is published/i)).not.toBeNull();
    expect(screen.getByText(/not shown on the Job Board/i)).not.toBeNull();
    expect(screen.getByRole("link", { name: "View My Requests" }).getAttribute("href")).toBe("/guardian/dashboard/posted-jobs");
    expect(screen.getByRole("link", { name: "Post Another Request" }).getAttribute("href")).toBe("/guardian/dashboard/hire");
  });
});
