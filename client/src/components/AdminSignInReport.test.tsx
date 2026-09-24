// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { clearBlock, reportQuery, blocksQuery, balanceQuery } = vi.hoisted(() => ({
  clearBlock: vi.fn(),
  reportQuery: vi.fn(),
  blocksQuery: vi.fn(),
  balanceQuery: vi.fn((): { isLoading: boolean; isError: boolean; data?: unknown } => ({ isLoading: false, isError: false, data: { configured: false } })),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listSignInBlocks: { invalidate: vi.fn() } } }),
    admin: {
      getSignInReport: { useQuery: (input: unknown) => reportQuery(input) },
      listSignInBlocks: { useQuery: () => blocksQuery() },
      getSmsBalance: { useQuery: () => balanceQuery() },
      clearSignInBlock: { useMutation: () => ({ mutate: clearBlock, isPending: false }) },
    },
  },
}));

import { AdminSignInReport } from "./AdminSignInReport";

type CountKey = "newGuardians" | "newTutors" | "signIns" | "failed" | "wrongCard" | "blocked" | "codesSent" | "codesVerified" | "wrongCodes";
const day = (date: string, counts: Partial<Record<CountKey, number>> = {}) => ({
  date, newGuardians: 0, newTutors: 0, signIns: 0, failed: 0, wrongCard: 0, blocked: 0, codesSent: 0, codesVerified: 0, wrongCodes: 0, ...counts,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdminSignInReport", () => {
  it("shows the period totals and one row per day", () => {
    reportQuery.mockReturnValue({ isLoading: false, isError: false, data: {
      days: [day("2026-09-24", { newTutors: 2, signIns: 5, codesSent: 4, codesVerified: 2 }), day("2026-09-23", { failed: 3, wrongCard: 1, wrongCodes: 1 })],
      totals: { newGuardians: 0, newTutors: 2, signIns: 5, failed: 3, wrongCard: 1, blocked: 0, codesSent: 4, codesVerified: 2, wrongCodes: 1 },
    } });
    blocksQuery.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<AdminSignInReport />);

    const totals = screen.getAllByRole("definition").slice(0, 9).map(cell => cell.textContent);
    expect(totals).toEqual(["0", "2", "5", "3", "1", "0", "4", "2", "1"]);
    expect(screen.getByText("not set up")).not.toBeNull();
    const table = screen.getByRole("table", { name: "Sign-in and registration counts per day" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(reportQuery).toHaveBeenLastCalledWith({ windowDays: 7 });
    expect(screen.getByText("No one is blocked right now.")).not.toBeNull();
  });

  it("shows the SMS balance, or why there is none", () => {
    reportQuery.mockReturnValue({ isLoading: true });
    blocksQuery.mockReturnValue({ isLoading: true });
    balanceQuery.mockReturnValueOnce({ isLoading: false, isError: false, data: { configured: true, balance: 1234.5 } });
    const { unmount } = render(<AdminSignInReport />);
    expect(screen.getByText(/SMS balance/).textContent).toBe("SMS balance: 1,234.5 Taka");
    unmount();

    balanceQuery.mockReturnValueOnce({ isLoading: false, isError: false, data: { configured: true, balance: null, problem: "this server's IP is not whitelisted at the SMS provider" } });
    render(<AdminSignInReport />);
    expect(screen.getByText(/SMS balance/).textContent).toContain("not whitelisted");
  });

  it("switches to 30 days", () => {
    reportQuery.mockReturnValue({ isLoading: true });
    blocksQuery.mockReturnValue({ isLoading: true });
    render(<AdminSignInReport />);

    fireEvent.click(screen.getByRole("button", { name: "30 days" }));
    expect(reportQuery).toHaveBeenLastCalledWith({ windowDays: 30 });
  });

  it("lists a blocked account by its masked identifier and unlocks it", () => {
    reportQuery.mockReturnValue({ isLoading: true });
    blocksQuery.mockReturnValue({ isLoading: false, isError: false, data: [
      { id: "a".repeat(24), kind: "account", ip: "203.0.113.9", role: "tutor", identifierMasked: "tu***@example.com", retryAfterSeconds: 600 },
    ] });
    render(<AdminSignInReport />);

    const row = screen.getByText("tu***@example.com").closest("li")!;
    expect(row.textContent).toContain("Account");
    expect(row.textContent).toContain("IP 203.0.113.9");
    expect(row.textContent).toContain("Clears in 10 min");
    fireEvent.click(within(row).getByRole("button", { name: "Unlock" }));
    expect(clearBlock).toHaveBeenCalledWith({ id: "a".repeat(24) });
  });
});
