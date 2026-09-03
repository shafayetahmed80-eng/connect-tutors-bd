// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MoneyAmountField } from "./MoneyAmountField";

afterEach(cleanup);

function renderField(props: Partial<React.ComponentProps<typeof MoneyAmountField>> = {}) {
  const onChange = vi.fn();
  const view = render(
    <MoneyAmountField
      ariaLabel="Amount (Taka)"
      value=""
      onChange={onChange}
      placeholder="Ex - 5,000"
      inputClassName="field"
      {...props}
    />,
  );
  return { onChange, view, field: screen.getByLabelText("Amount (Taka)") as HTMLInputElement };
}

describe("MoneyAmountField", () => {
  it("keeps the placeholder readable until there is a number to label", () => {
    renderField();

    // Nothing typed: no currency word crowding the placeholder.
    expect(screen.queryByText("Taka")).toBeNull();
  });

  it("puts the currency word inside the box as soon as an amount is typed", () => {
    renderField({ value: "5000" });

    expect(screen.getByText("Taka")).toBeTruthy();
  });

  it("does not repeat the currency to a screen reader that already heard it in the label", () => {
    renderField({ value: "5000" });

    // The label names the currency; the word in the box is decoration.
    expect(screen.getByText("Taka").getAttribute("aria-hidden")).toBe("true");
  });

  it("regroups the digits when the field is left, so 5000 settles as 5,000", () => {
    const { onChange, field } = renderField({ value: "5000", formatOnBlur: true });

    fireEvent.blur(field);
    expect(onChange).toHaveBeenCalledWith("5,000");
  });

  it("leaves the typed text alone while it is still being typed", () => {
    const { onChange, field } = renderField({ value: "50", formatOnBlur: true });

    fireEvent.change(field, { target: { value: "500" } });
    expect(onChange).toHaveBeenCalledWith("500");
    expect(onChange).not.toHaveBeenCalledWith("5,000");
  });

  it("holds its peace on blur where the caller stores something other than the typed text", () => {
    // A filter that strips to digits every keystroke would throw the commas
    // away on the next render, so it does not ask for them.
    const { onChange, field } = renderField({ value: "5000" });

    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not try to regroup an empty field", () => {
    const { onChange, field } = renderField({ value: "", formatOnBlur: true });

    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
  });
});
