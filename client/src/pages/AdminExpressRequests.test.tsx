// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListQuery = vi.fn();
const mockUpdateMutation = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listExpressRequests: {
          invalidate: vi.fn(),
        },
      },
    }),
    admin: {
      listExpressRequests: {
        useQuery: (input: unknown) => {
          mockListQuery(input);
          return {
            data: {
              items: [
                {
                  id: 1,
                  phone: "01711223344",
                  guardianName: "রহিম সাহেব",
                  classCourse: "Class 9-10 (SSC)",
                  curriculumType: "Bangla Medium",
                  subjects: "General Math, Physics",
                  tuitionType: "home",
                  locationLabel: "ধানমন্ডি ৩২",
                  source: "home_hero",
                  status: "new",
                  adminNote: null,
                  createdAt: new Date().toISOString(),
                },
              ],
              total: 1,
            },
            isLoading: false,
          };
        },
      },
      updateExpressRequestStatus: {
        useMutation: () => ({
          mutate: mockUpdateMutation,
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Admin", role: "admin" },
    isAuthenticated: true,
  }),
}));

vi.mock("@/components/AdminWorkspaceLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AdminExpressRequests from "./AdminExpressRequests";

describe("AdminExpressRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders lead list with phone, location, subject, and status", () => {
    render(<AdminExpressRequests />);

    expect(screen.getByText(/Express Tutor Requests/)).toBeTruthy();
    expect(screen.getByText("রহিম সাহেব")).toBeTruthy();
    expect(screen.getByText(/ধানমন্ডি ৩২/)).toBeTruthy();
    expect(screen.getByText("New Lead")).toBeTruthy();
  });

  it("renders action buttons for WhatsApp, Call, and Status Update", () => {
    render(<AdminExpressRequests />);

    const callLink = screen.getByTitle("Direct Call");
    expect(callLink).toBeTruthy();
    expect(callLink.getAttribute("href")).toContain("tel:01711223344");

    const waLink = screen.getByTitle("WhatsApp Chat");
    expect(waLink).toBeTruthy();
    expect(waLink.getAttribute("href")).toContain("wa.me/8801711223344");
  });
});
