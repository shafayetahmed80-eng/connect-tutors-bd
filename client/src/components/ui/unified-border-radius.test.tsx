// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import React from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Select, SelectTrigger, SelectValue } from "./select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";

afterEach(() => {
  cleanup();
});

describe("Unified 12px Border Radius (rounded-xl)", () => {
  it("renders shared Button with rounded-xl by default", () => {
    const { getByRole } = render(<Button>Click me</Button>);
    const button = getByRole("button");
    expect(button.className).toContain("rounded-xl");
  });

  it("renders shared Button with sm and lg size retaining rounded-xl", () => {
    const { rerender, getByRole } = render(<Button size="sm">Small</Button>);
    expect(getByRole("button").className).toContain("rounded-xl");

    rerender(<Button size="lg">Large</Button>);
    expect(getByRole("button").className).toContain("rounded-xl");
  });

  it("renders shared Input with rounded-xl", () => {
    const { getByRole } = render(<Input placeholder="Type here" />);
    const input = getByRole("textbox");
    expect(input.className).toContain("rounded-xl");
  });

  it("renders shared Textarea with rounded-xl", () => {
    const { getByRole } = render(<Textarea placeholder="Bio" />);
    const textarea = getByRole("textbox");
    expect(textarea.className).toContain("rounded-xl");
  });

  it("renders shared SelectTrigger with rounded-xl", () => {
    const { getByRole } = render(
      <Select>
        <SelectTrigger aria-label="Choose option">
          <SelectValue placeholder="Select one" />
        </SelectTrigger>
      </Select>
    );
    const trigger = getByRole("combobox");
    expect(trigger.className).toContain("rounded-xl");
  });

  it("renders InputOTPSlot with first and last rounded-l-xl and rounded-r-xl", () => {
    const { container } = render(
      <InputOTP maxLength={2}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>
    );
    const slots = container.querySelectorAll("[data-slot='input-otp-slot']");
    expect(slots.length).toBe(2);
    expect(slots[0].className).toContain("first:rounded-l-xl");
    expect(slots[1].className).toContain("last:rounded-r-xl");
  });
});
