// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutateMock = vi.fn();
let mutationSuccessHandler: ((data: { id: number; phone: string }) => void) | null = null;

vi.mock("@/lib/trpc", () => ({
  trpc: {
    catalog: {
      searchGuardianLocations: {
        useQuery: () => ({
          data: [
            { id: 1, name: "Dhanmondi", district: "Dhaka" },
            { id: 2, name: "Mirpur", district: "Dhaka" },
          ],
          isLoading: false,
        }),
      },
    },
    tutorRequests: {
      submitExpress: {
        useMutation: (options?: { onSuccess?: (data: { id: number; phone: string }) => void }) => {
          mutationSuccessHandler = options?.onSuccess ?? null;
          return {
            mutate: (input: unknown) => {
              mutateMock(input);
              mutationSuccessHandler?.({ id: 101, phone: "01712345678" });
            },
            isPending: false,
          };
        },
      },
    },
  },
}));

import { ExpressTutorRequestCard } from "./ExpressTutorRequestCard";

describe("ExpressTutorRequestCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationSuccessHandler = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the 15-second request card with trust badge and fields", () => {
    render(<ExpressTutorRequestCard source="home_hero" />);

    expect(screen.getByText("১৫-সেকেন্ডে শিক্ষক খুঁজুন (Express Request)")).toBeTruthy();
    expect(screen.getByText(/কোনো পাসওয়ার্ড লাগবে না/)).toBeTruthy();
    expect(screen.getAllByText(/BTPA - 077/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText("017XX XXXXXX")).toBeTruthy();
  });

  it("allows selecting a class chip and entering guardian details", async () => {
    render(<ExpressTutorRequestCard source="home_hero" />);

    // Click Class 6-8 chip
    const classChip = screen.getByRole("button", { name: /Class 6-8/i });
    fireEvent.click(classChip);

    // Enter phone
    const phoneInput = screen.getByPlaceholderText("017XX XXXXXX");
    fireEvent.change(phoneInput, { target: { value: "01712345678" } });

    // Enter area
    const areaInput = screen.getByPlaceholderText(/যেমন: ধানমন্ডি/i);
    fireEvent.change(areaInput, { target: { value: "ধানমন্ডি ৩২" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /অনুরোধ পাঠান/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledTimes(1);
    });

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "1712345678",
        classCourse: "Class 6-8 (JSC/Middle)",
        locationLabel: "ধানমন্ডি ৩২",
        source: "home_hero",
      })
    );
  });

  it("shows celebration view upon successful submission", async () => {
    const onSuccess = vi.fn();
    render(<ExpressTutorRequestCard source="job_board" onSuccess={onSuccess} />);

    // Phone
    fireEvent.change(screen.getByPlaceholderText("017XX XXXXXX"), {
      target: { value: "01712345678" },
    });

    // Area
    fireEvent.change(screen.getByPlaceholderText(/যেমন: ধানমন্ডি/i), {
      target: { value: "উত্তরা সেক্টর ৪" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /অনুরোধ পাঠান/i }));

    await waitFor(() => {
      expect(screen.getByText("ধন্যবাদ! আপনার শিক্ষক খোঁজার অনুরোধ পেয়েছি")).toBeTruthy();
    });

    expect(screen.getByText(/Lead #101/)).toBeTruthy();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
