// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: 7, name: "Rina", role: "guardian", accountStatus: "active" } as null | { id: number; name: string; role: string; accountStatus: string },
  authLoading: false,
  status: { data: undefined as unknown, isLoading: false },
  send: vi.fn(),
  verify: vi.fn(),
  invalidate: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user, loading: mocks.authLoading, logout: mocks.logout }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ invalidate: mocks.invalidate }),
    auth: {
      loginTwoFactorStatus: { useQuery: () => mocks.status },
      sendLoginTwoFactorCode: { useMutation: () => ({ mutateAsync: mocks.send, isPending: false }) },
      verifyLoginTwoFactorCode: { useMutation: () => ({ mutateAsync: mocks.verify, isPending: false }) },
    },
  },
}));

import LoginTwoFactorChallenge, { safeNextPath } from "./LoginTwoFactorChallenge";

const owedStatus = { required: true, cleared: false, maskedPhone: "+880171••••111", rememberDays: 30 };

beforeEach(() => {
  mocks.user = { id: 7, name: "Rina", role: "guardian", accountStatus: "active" };
  mocks.authLoading = false;
  mocks.status = { data: owedStatus, isLoading: false };
  mocks.send.mockResolvedValue({ success: true, resendAfterSeconds: 60, maskedPhone: "+880171••••111" });
  mocks.verify.mockResolvedValue({ success: true, rememberDays: 30 });
  mocks.invalidate.mockResolvedValue(undefined);
  window.history.pushState({}, "", "/login-verify?next=%2Ftutor%2Fdashboard%2Fprofile");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("safeNextPath", () => {
  it("keeps a path on this site and refuses anything that leaves it", () => {
    expect(safeNextPath("/tutor/dashboard/profile", "/x")).toBe("/tutor/dashboard/profile");
    expect(safeNextPath("//evil.example", "/x")).toBe("/x");
    expect(safeNextPath("https://evil.example", "/x")).toBe("/x");
    expect(safeNextPath("/\\evil.example", "/x")).toBe("/x");
    expect(safeNextPath(null, "/x")).toBe("/x");
  });
});

describe("the sign-in code page", () => {
  it("texts the code once on arrival and says where it went", async () => {
    render(<LoginTwoFactorChallenge />);
    await waitFor(() => expect(screen.getByText("Enter the 4-digit code sent to +880171••••111.")).toBeTruthy());
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: /Send another code/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("verifies the moment four digits are typed, then goes where the person was headed", async () => {
    render(<LoginTwoFactorChallenge />);
    await waitFor(() => expect(mocks.send).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("4-digit code"), { target: { value: "48a21" } });
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith({ code: "4821" }));
    await waitFor(() => expect(window.location.pathname).toBe("/tutor/dashboard/profile"));
    expect(mocks.invalidate).toHaveBeenCalled();
  });

  it("shows a wrong code's message and empties the box", async () => {
    mocks.verify.mockRejectedValueOnce(new Error("The code is not correct. 3 tries left."));
    render(<LoginTwoFactorChallenge />);
    await waitFor(() => expect(mocks.send).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("4-digit code"), { target: { value: "0000" } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("The code is not correct. 3 tries left."));
    expect((screen.getByLabelText("4-digit code") as HTMLInputElement).value).toBe("");
    expect(window.location.pathname).toBe("/login-verify");
  });

  it("sends someone who owes nothing straight on", async () => {
    mocks.status = { data: { required: false, cleared: true, maskedPhone: null, rememberDays: 30 }, isLoading: false };
    render(<LoginTwoFactorChallenge />);
    await waitFor(() => expect(window.location.pathname).toBe("/tutor/dashboard/profile"));
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("sends a signed-out visitor to sign in", async () => {
    mocks.user = null;
    mocks.status = { data: undefined, isLoading: false };
    render(<LoginTwoFactorChallenge />);
    await waitFor(() => expect(window.location.pathname).toBe("/auth"));
  });

  it("signs out from the page", async () => {
    mocks.logout.mockResolvedValue(undefined);
    render(<LoginTwoFactorChallenge />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Sign out/ })); });
    expect(mocks.logout).toHaveBeenCalled();
    await waitFor(() => expect(window.location.pathname).toBe("/auth"));
  });
});
