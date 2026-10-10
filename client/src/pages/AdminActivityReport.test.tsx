// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { role: "admin" } as { role: string } | null,
  isOwner: true,
  moneyInputs: [] as unknown[],
  moneyEnabled: [] as unknown[],
  reportEnabled: [] as unknown[],
  money: {
    data: undefined as unknown,
    isError: false,
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock("@/components/AdminWorkspaceLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/BrandMark", () => ({ LoadingCradle: () => <span /> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      getWorkspaceAccess: { useQuery: () => ({ data: { isOwner: mocks.isOwner }, isLoading: false }) },
      getActivityReport: {
        useQuery: (_input: unknown, options: { enabled: boolean }) => {
          mocks.reportEnabled.push(options.enabled);
          return { data: { windowDays: 30, generatedAt: new Date("2026-10-10T08:00:00Z"), totals: { activeAdmins: 2, securityEvents: 0, successfulLogins: 7, failedLogins: 1, twoFactorVerifications: 0, tutorModerations: 0, guardianContactViews: 0 }, adminSummaries: [], recentEvents: [] }, isLoading: false, isError: false };
        },
      },
      getMoneySummary: {
        useQuery: (input: unknown, options: { enabled: boolean }) => {
          mocks.moneyInputs.push(input);
          mocks.moneyEnabled.push(options.enabled);
          return { ...mocks.money, isLoading: false };
        },
      },
    },
  },
}));

import AdminActivityReport, { MoneyCards, type OwnerMoneySummary } from "./AdminActivityReport";

const summary: OwnerMoneySummary = {
  windowDays: 30,
  collected: { amount: 125000, payments: 12 },
  stillDue: { amount: 48500, tuitions: 7 },
  waiting: { amount: 6000, payments: 2 },
  closed: { tuitions: 4 },
};

beforeEach(() => {
  mocks.user = { role: "admin" };
  mocks.isOwner = true;
  mocks.moneyInputs = [];
  mocks.moneyEnabled = [];
  mocks.reportEnabled = [];
  mocks.money = { data: summary, isError: false };
});

afterEach(cleanup);

describe("MoneyCards", () => {
  it("shows the four figures, each beside its own label", () => {
    render(<MoneyCards money={summary} />);
    const card = (label: string) => screen.getByRole("heading", { name: label }).closest("article")!;

    expect(within(card("Received")).getByText("125,000 Taka")).toBeTruthy();
    expect(within(card("Received")).getByText("12 verified payments in the last 30 days")).toBeTruthy();
    expect(within(card("Still due")).getByText("48,500 Taka")).toBeTruthy();
    expect(within(card("Still due")).getByText("on 7 Confirmed tuitions, as of now")).toBeTruthy();
    expect(within(card("Waiting for verification")).getByText("6,000 Taka")).toBeTruthy();
    expect(within(card("Waiting for verification")).getByText("2 payments reported by Tutors, as of now")).toBeTruthy();
    expect(within(card("Closed")).getByText("4")).toBeTruthy();
    expect(within(card("Closed")).getByText("tuitions paid in full in the last 30 days")).toBeTruthy();
  });

  it("uses the singular for exactly one", () => {
    render(<MoneyCards money={{ ...summary, windowDays: 7, collected: { amount: 800, payments: 1 }, stillDue: { amount: 800, tuitions: 1 }, waiting: { amount: 300, payments: 1 }, closed: { tuitions: 1 } }} />);

    expect(screen.getByText("1 verified payment in the last 7 days")).toBeTruthy();
    expect(screen.getByText("on 1 Confirmed tuition, as of now")).toBeTruthy();
    expect(screen.getByText("1 payment reported by Tutors, as of now")).toBeTruthy();
    expect(screen.getByText("tuition paid in full in the last 7 days")).toBeTruthy();
  });

  it("shows zero money as 0 Taka rather than leaving the card empty", () => {
    render(<MoneyCards money={{ ...summary, collected: { amount: 0, payments: 0 }, stillDue: { amount: 0, tuitions: 0 }, waiting: { amount: 0, payments: 0 }, closed: { tuitions: 0 } }} />);

    expect(screen.getAllByText("0 Taka")).toHaveLength(3);
    expect(screen.getByText("0 verified payments in the last 30 days")).toBeTruthy();
  });
});

describe("the Owner activity report's platform charge", () => {
  it("asks for the figures over the window that is chosen, and asks again when it changes", () => {
    render(<AdminActivityReport />);

    expect(screen.getByRole("region", { name: "Platform charge" })).toBeTruthy();
    expect(mocks.moneyInputs.at(-1)).toEqual({ windowDays: 30 });

    fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));

    expect(mocks.moneyInputs.at(-1)).toEqual({ windowDays: 7 });
  });

  it("says so, and still shows the rest of the report, when the figures cannot be loaded", () => {
    mocks.money = { data: undefined, isError: true };
    render(<AdminActivityReport />);

    expect(screen.getByRole("alert").textContent).toContain("could not be loaded");
    expect(screen.queryByRole("region", { name: "Platform charge" })).toBeNull();
    expect(screen.getByText("Per-Admin activity")).toBeTruthy();
  });

  it("asks for nothing, and shows nothing, to anyone but the Owner", () => {
    mocks.isOwner = false;
    render(<AdminActivityReport />);

    expect(screen.getByText("Owner access required")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Platform charge" })).toBeNull();
    expect(mocks.moneyEnabled.every(enabled => enabled === false)).toBe(true);
  });
});
