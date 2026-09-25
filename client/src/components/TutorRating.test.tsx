// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { save, invalidate, reviewsQuery } = vi.hoisted(() => ({ save: vi.fn(), invalidate: vi.fn(), reviewsQuery: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorReviews: { mine: { invalidate } } }),
    tutorReviews: {
      save: { useMutation: (options: { onSuccess: () => void }) => ({ mutate: (input: unknown) => { save(input); options.onSuccess(); }, isPending: false }) },
      forTutor: { useQuery: () => reviewsQuery() },
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AdminTutorRatings, RateTutorDialog, TutorRatingLine } from "./TutorRating";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TutorRatingLine", () => {
  it("shows the average and count, and nothing before any rating", () => {
    const { rerender, container } = render(<TutorRatingLine summary={{ average: 4.7, count: 3 }} />);
    expect(container.textContent).toBe("4.7 · 3 ratings");
    rerender(<TutorRatingLine summary={{ average: null, count: 0 }} />);
    expect(container.textContent).toBe("");
  });
});

describe("RateTutorDialog", () => {
  it("needs a star before it saves, then saves stars and comment", () => {
    const onClose = vi.fn();
    render(<RateTutorDialog requestId={7} jobId="6806" onClose={onClose} />);

    expect((screen.getByRole("button", { name: "Save rating" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    fireEvent.change(screen.getByLabelText(/Comment/), { target: { value: "  Very patient teacher.  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save rating" }));

    expect(save).toHaveBeenCalledWith({ requestId: 7, rating: 4, comment: "Very patient teacher." });
    expect(invalidate).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("opens on the rating already given, to change it", () => {
    render(<RateTutorDialog requestId={7} jobId="6806" existing={{ rating: 3, comment: "Good" }} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Change your rating" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "3 stars" }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByLabelText(/Comment/) as HTMLTextAreaElement).value).toBe("Good");
  });

  it("moves the stars with the arrow keys", () => {
    render(<RateTutorDialog requestId={7} jobId="6806" existing={{ rating: 3, comment: null }} onClose={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "3 stars" }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "4 stars" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("AdminTutorRatings", () => {
  it("lists each rating with the Guardian and the Job ID", () => {
    reviewsQuery.mockReturnValue({ isLoading: false, isError: false, data: { summary: { average: 4.5, count: 2 }, reviews: [
      { id: 1, requestId: 7, rating: 5, comment: "Excellent", updatedAt: "2026-09-20T10:00:00Z", guardianName: "Rina Akter" },
      { id: 2, requestId: 8, rating: 4, comment: null, updatedAt: "2026-09-18T10:00:00Z", guardianName: null },
    ] } });
    render(<AdminTutorRatings tutorId="t-1" />);

    expect(screen.getByText("4.5 · 2 ratings")).toBeTruthy();
    expect(screen.getByText("Excellent")).toBeTruthy();
    expect(screen.getByText("Job ID 6806")).toBeTruthy();
    expect(screen.getByLabelText("5 of 5 stars")).toBeTruthy();
    expect(screen.getByText("Guardian")).toBeTruthy();
  });

  it("says so when nobody has rated yet", () => {
    reviewsQuery.mockReturnValue({ isLoading: false, isError: false, data: { summary: { average: null, count: 0 }, reviews: [] } });
    render(<AdminTutorRatings tutorId="t-1" />);
    expect(screen.getByText("No Guardian has rated this Tutor yet.")).toBeTruthy();
  });
});
