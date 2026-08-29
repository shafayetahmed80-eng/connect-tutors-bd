// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TutorInterestControl } from "./JobBoard";

afterEach(cleanup);

describe("TutorInterestControl", () => {
  it("offers the explicit Tutor-only Apply Now action without redundant helper copy before an application exists", () => {
    const onAction = vi.fn();
    render(<TutorInterestControl isInterestSaving={false} onAction={onAction} />);

    expect(screen.queryByText("Not yet applied")).toBeNull();
    expect(screen.queryByText(/Guardian contact stays private/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Apply Now" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("offers withdrawal while review is open and no control after a match is in progress", () => {
    const onAction = vi.fn();
    const { rerender } = render(<TutorInterestControl interest={{ interestId: 24, status: "shortlisted" }} isInterestSaving={false} onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Withdraw application" }));
    expect(onAction).toHaveBeenCalledOnce();

    rerender(<TutorInterestControl interest={{ interestId: 24, status: "matched" }} isInterestSaving={false} onAction={onAction} />);
    expect(screen.getByText("Matched")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
