// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { adminMutate, memberMutate } = vi.hoisted(() => ({ adminMutate: vi.fn(), memberMutate: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: { signOutEverywhere: { useMutation: () => ({ mutate: adminMutate, isPending: false }) } },
    account: { signOutEverywhere: { useMutation: () => ({ mutate: memberMutate, isPending: false }) } },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SignOutEverywhereButton } from "./SignOutEverywhereButton";

beforeEach(() => { adminMutate.mockReset(); memberMutate.mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Sign out everywhere", () => {
  it("signs every other device out once an Admin confirms", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<SignOutEverywhereButton />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));

    expect(adminMutate).toHaveBeenCalledTimes(1);
    expect(memberMutate).not.toHaveBeenCalled();
  });

  it("goes through the Tutor and Guardian route when it is theirs", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<SignOutEverywhereButton member />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));

    expect(memberMutate).toHaveBeenCalledTimes(1);
    expect(adminMutate).not.toHaveBeenCalled();
  });

  it("does nothing if the person backs out of the question", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<SignOutEverywhereButton member />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));

    expect(memberMutate).not.toHaveBeenCalled();
    expect(adminMutate).not.toHaveBeenCalled();
  });
});
