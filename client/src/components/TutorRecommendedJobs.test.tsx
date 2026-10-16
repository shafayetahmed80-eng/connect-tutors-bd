// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TutorRecommendedJobs } from "./TutorRecommendedJobs";

afterEach(() => cleanup());

const mockRecommendedData = {
  items: [
    {
      job: {
        id: 1042,
        publicJobId: "CT-J1042",
        tuitionType: "home",
        category: "English Medium",
        classCourse: "Class 10",
        subjects: "Physics, Higher Mathematics",
        studentCount: 1,
        studentGender: "male",
        preferredTutorGender: "male",
        daysPerWeek: 3,
        tutoringTime: "18:00",
        budgetAmount: 8000,
        country: "Bangladesh",
        cityLocationId: "loc-dhaka",
        locationId: "loc-dhanmondi",
        locationLabel: "Dhanmondi, Dhaka",
        notes: "Need an experienced tutor",
        directionLabel: null,
        publishedAt: new Date().toISOString(),
      },
      matchScore: 98,
      matchGrade: "perfect" as const,
      matchReasons: ["📍 পছন্দের এলাকা", "📚 সব বিষয় মিলেছে"],
      applied: false,
    },
  ],
  totalMatchingCount: 5,
  tutorSummary: {
    locationCount: 3,
    subjectCount: 4,
    profileApproved: true,
  },
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    tutor: {
      recommendedJobs: {
        useQuery: vi.fn().mockImplementation(() => ({
          data: mockRecommendedData,
          isLoading: false,
          refetch: vi.fn(),
        })),
      },
    },
    jobBoard: {
      expressInterest: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

describe("TutorRecommendedJobs", () => {
  it("renders the heading and matching jobs count", () => {
    render(<TutorRecommendedJobs />);

    expect(screen.getByText("Recommended For You")).toBeTruthy();
    expect(screen.getByText("5 Matching")).toBeTruthy();
    expect(screen.getByText("Class 10")).toBeTruthy();
    expect(screen.getByText("Physics, Higher Mathematics")).toBeTruthy();
    expect(screen.getByText("98% Match")).toBeTruthy();
    expect(screen.getByText("8,000 Taka")).toBeTruthy();
    expect(screen.getByText("3 দিন/সপ্তাহ")).toBeTruthy();
    expect(screen.getByText(/Dhanmondi, Dhaka/)).toBeTruthy();
  });

  it("offers View Details & Apply button when tutor profile is approved", () => {
    render(<TutorRecommendedJobs />);

    const applyBtn = screen.getByRole("button", { name: /View Details & Apply/i });
    expect(applyBtn).toBeTruthy();
  });
});
