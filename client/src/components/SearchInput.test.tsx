// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchInput from "./SearchInput";

describe("SearchInput", () => {
  afterEach(cleanup);

  it("renders with placeholder and accessible role", () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search tutors..." label="Search tutors" />);
    const input = screen.getByRole("searchbox", { name: "Search tutors" }) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute("placeholder")).toBe("Search tutors...");
    expect(input.className).toContain("search-input-glow");
  });

  it("hides the clear button when input value is empty", () => {
    render(<SearchInput value="" onChange={() => {}} label="Search" />);
    const clearButton = screen.getByRole("button", { name: "Clear search" });
    expect(clearButton.className).toContain("opacity-0");
    expect(clearButton.className).toContain("pointer-events-none");
    expect(clearButton.getAttribute("tabindex")).toBe("-1");
  });

  it("shows the clear button when input has value", () => {
    render(<SearchInput value="Mathematics" onChange={() => {}} label="Search" />);
    const clearButton = screen.getByRole("button", { name: "Clear search" });
    expect(clearButton.className).toContain("opacity-100");
    expect(clearButton.className).toContain("scale-100");
    expect(clearButton.getAttribute("tabindex")).toBe("0");
  });

  it("clears value and keeps focus on input when clear button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClear = vi.fn();

    function ControlledSearch() {
      const [val, setVal] = useState("Physics");
      return (
        <SearchInput
          value={val}
          onChange={next => {
            setVal(next);
            onChange(next);
          }}
          onClear={onClear}
          label="Search"
        />
      );
    }

    render(<ControlledSearch />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("Physics");

    const clearButton = screen.getByRole("button", { name: "Clear search" });
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledWith("");
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(input);
  });

  it("clears value on Escape key when value is present", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();

    render(<SearchInput value="Dhaka" onChange={onChange} onClear={onClear} label="Search" />);
    const input = screen.getByRole("searchbox");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith("");
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("supports autoFocus attribute", () => {
    render(<SearchInput value="" onChange={() => {}} label="Search" autoFocus />);
    const input = screen.getByRole("searchbox");
    expect(document.activeElement).toBe(input);
  });

  it("supports disabled state", () => {
    render(<SearchInput value="" onChange={() => {}} label="Search" disabled />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
