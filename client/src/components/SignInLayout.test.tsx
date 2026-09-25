// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "./SignInLayout";

afterEach(cleanup);

function renderForm(pending: boolean) {
  return render(
    <SignInForm
      idPrefix="test"
      identifier=""
      onIdentifier={vi.fn()}
      password=""
      onPassword={vi.fn()}
      pending={pending}
      submitLabel="Sign in"
      onSubmit={vi.fn()}
      forgotHref="/forgot-password"
    />,
  );
}

describe("sign-in submit button glow", () => {
  it("carries no glow while idle", () => {
    renderForm(false);

    expect(screen.getByRole("button", { name: "Sign in" }).className).not.toContain("sign-in-submit-glow");
  });

  it("breathes a glow only while the sign-in request is in flight", () => {
    renderForm(true);

    expect(screen.getByRole("button", { name: "Signing in…" }).className).toContain("sign-in-submit-glow");
  });
});
