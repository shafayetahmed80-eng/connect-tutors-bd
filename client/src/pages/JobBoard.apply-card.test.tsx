// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const job = (id: number, jobId: string, title: string) => ({
  id, jobId, title,
  tuitionType: "home" as const,
  category: "Bangla Medium",
  classCourse: "Class 8",
  subjects: ["History"],
  studentCount: 1,
  studentGender: null,
  preferredTutorGender: "any" as const,
  daysPerWeek: 3,
  budgetAmount: 5000,
  notes: null,
  country: "Bangladesh",
  cityLocationId: "dhaka-city",
  locationId: "dhaka-adabor",
  locationLabel: "Adabor, Dhaka",
  directionLabel: null,
  publishedAt: new Date("2026-11-01T00:00:00.000Z"),
  expiresAt: new Date("2026-12-01T00:00:00.000Z"),
});

const mocks = vi.hoisted(() => ({
  express: vi.fn(),
  withdraw: vi.fn(),
  expressPending: false,
  interests: [] as Array<{ interestId: number; status: string; createdAt: Date; publicJobId: string }>,
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: "tutor" }, loading: false }) }));
vi.mock("@/lib/siteContent", () => ({
  useSiteContact: () => ({ number: "8801000000000", display: "+8801000000000", tel: "tel:", whatsapp: () => "https://wa.me/x" }),
  useSiteContentResolver: () => (_slot: string, fallback: string) => fallback,
  SiteText: ({ fallback }: { fallback?: string }) => <>{fallback ?? ""}</>,
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutor: { myJobInterests: { invalidate: vi.fn() } } }),
    catalog: {
      searchGuardianLocations: { useQuery: () => ({ data: [] }) },
      searchRegistrationLocations: { useQuery: () => ({ data: [] }) },
    },
    jobBoard: {
      filterOptions: { useQuery: () => ({ data: undefined, isLoading: false }) },
      list: { useQuery: () => ({ data: { items: [job(1, "6801", "Need a Tutor for Class 8"), job(2, "6802", "Need a Tutor for Class 9")], totalCount: 2 }, isLoading: false }) },
      expressInterest: { useMutation: () => ({ mutate: mocks.express, isPending: mocks.expressPending }) },
      withdrawInterest: { useMutation: () => ({ mutate: mocks.withdraw, isPending: false }) },
    },
    tutor: {
      myJobInterests: { useQuery: () => ({ data: mocks.interests }) },
      getMyProfile: { useQuery: () => ({ data: { profileStatus: "approved" } }) },
    },
  },
}));

import { JobBoardContent } from "./JobBoard";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.interests = [];
  mocks.expressPending = false;
});

const cardFor = (jobId: string) => screen.getByRole("button", { name: new RegExp(`Job ID ${jobId}`) });

describe("applying from a Job Board card", () => {
  it("offers Apply Now on a job the Tutor has not applied to", () => {
    render(<JobBoardContent embedded />);
    expect(within(cardFor("6801")).getByRole("button", { name: "Apply Now" })).toBeTruthy();
  });

  it("replaces the button with Applied and the day it was made", () => {
    mocks.interests = [{ interestId: 7, status: "interested", createdAt: new Date("2026-11-20T00:00:00.000Z"), publicJobId: "6801" }];
    render(<JobBoardContent embedded />);

    const applied = within(cardFor("6801"));
    expect(applied.getByText("Applied")).toBeTruthy();
    expect(applied.getByText("20 Nov 2026")).toBeTruthy();
    expect(applied.queryByRole("button", { name: "Apply Now" })).toBeNull();

    // The job beside it is untouched.
    expect(within(cardFor("6802")).getByRole("button", { name: "Apply Now" })).toBeTruthy();
  });

  it("applies to the job whose button was pressed", () => {
    render(<JobBoardContent embedded />);

    fireEvent.click(within(cardFor("6802")).getByRole("button", { name: "Apply Now" }));
    expect(mocks.express).toHaveBeenCalledTimes(1);
    expect(mocks.express.mock.calls[0][0]).toEqual({ tutorJobId: 2 });
  });

  it("does not put any other card into the saving state while one is in flight", () => {
    // The bug this guards: the saving state was one page-wide flag, so the
    // moment any application was in flight every button on the board read
    // "Saving…" at once - which looks exactly like every card being clicked.
    mocks.expressPending = true;
    render(<JobBoardContent embedded />);

    for (const jobId of ["6801", "6802"]) {
      expect(within(cardFor(jobId)).getByRole("button", { name: "Apply Now" }), jobId).toBeTruthy();
      expect(within(cardFor(jobId)).queryByRole("button", { name: "Saving…" }), jobId).toBeNull();
    }
  });
});
