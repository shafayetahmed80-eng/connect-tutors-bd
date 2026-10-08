// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: { admin: { signOutEverywhere: { useMutation: () => ({ mutate, isPending: false }) } } },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SignOutEverywhereButton } from "./SignOutEverywhereButton";

beforeEach(() => mutate.mockReset());
afterEach(() => cleanup());

describe("Sign out everywhere", () => {
  it("signs every other device out once the Admin confirms", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<SignOutEverywhereButton />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("does nothing if the Admin backs out of the question", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<SignOutEverywhereButton />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));

    expect(mutate).not.toHaveBeenCalled();
  });
});
