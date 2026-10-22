// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TutorSubmissionSuccessModal } from "./TutorSubmissionSuccessModal";

describe("TutorSubmissionSuccessModal", () => {
  afterEach(() => { cleanup(); });
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <TutorSubmissionSuccessModal
        isOpen={false}
        onClose={vi.fn()}
        onGoToJobBoard={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders celebratory eligibility message and actions when isOpen is true", () => {
    const onGoToJobBoard = vi.fn();
    const onClose = vi.fn();

    render(
      <TutorSubmissionSuccessModal
        isOpen={true}
        onClose={onClose}
        onGoToJobBoard={onGoToJobBoard}
      />
    );

    expect(screen.getByText("প্রোফাইল সাবমিশন সফল হয়েছে")).toBeTruthy();
    expect(screen.getByText("অভিনন্দন! আপনি এখন টিউশনে আবেদনের যোগ্য")).toBeTruthy();
    expect(screen.getByText(/স্ট্যাটাস: পেন্ডিং রিভিউ/)).toBeTruthy();
    expect(screen.getByText(/জব বোর্ড থেকে সরাসরি টিউশনে আবেদন করতে পারবেন/)).toBeTruthy();

    const jobBoardBtn = screen.getByRole("button", { name: /জব বোর্ডে যান ও আবেদন করুন/i });
    expect(jobBoardBtn).toBeTruthy();
    fireEvent.click(jobBoardBtn);
    expect(onGoToJobBoard).toHaveBeenCalledTimes(1);

    const stayBtn = screen.getByRole("button", { name: /প্রোফাইলে থাকুন/i });
    expect(stayBtn).toBeTruthy();
    fireEvent.click(stayBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
