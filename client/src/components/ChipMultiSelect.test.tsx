// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ChipMultiSelect, { type ChipOption } from "./ChipMultiSelect";

afterEach(cleanup);

const fruit: ChipOption[] = [
  { id: "a", label: "Apple" },
  { id: "b", label: "Banana" },
  { id: "c", label: "Cherry" },
];

function Harness({ options = fruit, initial = [], ...rest }: { options?: ChipOption[]; initial?: string[] } & Partial<React.ComponentProps<typeof ChipMultiSelect>>) {
  const [selected, setSelected] = useState<string[]>(initial);
  return <ChipMultiSelect label="Fruit" options={options} selectedIds={selected} onChange={setSelected} {...rest} />;
}

const box = () => screen.getByRole("combobox", { name: /^Fruit/ });
const openList = () => fireEvent.focus(box());
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const list = () => screen.getByRole("listbox", { name: "Fruit" });

describe("ChipMultiSelect", () => {
  it("shows the label inside the empty box, and the list only once opened", () => {
    render(<Harness />);

    expect(screen.getByRole("combobox", { name: "Fruit" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Fruit")).toBeTruthy();
    expect(screen.queryByRole("listbox")).toBeNull();

    openList();
    expect(within(list()).getAllByRole("option").map(option => option.textContent)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("takes a chosen value out of the list and puts it in the box", () => {
    render(<Harness />);
    openList();

    fireEvent.click(within(list()).getByRole("button", { name: "Banana" }));

    // In the box...
    expect(screen.getByRole("button", { name: "Remove Banana" })).toBeTruthy();
    // ...and gone from the list, because there is nothing to do with it there
    // but choose it twice.
    expect(within(list()).getAllByRole("option").map(option => option.textContent)).toEqual(["Apple", "Cherry"]);
  });

  it("gives a value back to the list when its chip is dismissed", () => {
    render(<Harness initial={["b"]} />);
    openList();
    expect(within(list()).getAllByRole("option")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Remove Banana" }));

    expect(screen.queryByRole("button", { name: "Remove Banana" })).toBeNull();
    expect(within(list()).getAllByRole("option").map(option => option.textContent)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("stops at the limit and says nothing about it", () => {
    render(<Harness maxSelections={2} />);

    openList();
    fireEvent.click(within(list()).getByRole("button", { name: "Apple" }));
    fireEvent.click(within(list()).getByRole("button", { name: "Banana" }));

    // The list closes on the last allowed pick rather than explaining itself.
    expect(screen.queryByRole("listbox")).toBeNull();
    openList();
    fireEvent.click(within(list()).getByRole("button", { name: "Cherry" }));
    expect(screen.queryByRole("button", { name: "Remove Cherry" })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(2);
  });

  it("will not open while it is waiting on something else", () => {
    render(<Harness disabled disabledPlaceholder="Fruit - pick a basket first" />);

    expect(screen.getByPlaceholderText("Fruit - pick a basket first")).toBeTruthy();
    openList();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("keeps showing a chip whose option has gone from underneath it", () => {
    // The options narrow as other filters change; a chip that quietly vanished
    // would go on filtering with nothing on screen to say so.
    render(<ChipMultiSelect label="Fruit" options={[{ id: "a", label: "Apple" }]} selectedIds={["a", "z"]} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Remove Apple" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove z" })).toBeTruthy();
  });

  it("narrows the list to what was typed, and takes the first match on Enter", () => {
    // Location can offer a hundred areas; scrolling that to find one name is
    // the slowest way to answer a question you could have typed.
    render(<Harness />);
    openList();

    type("an");
    expect(within(list()).getAllByRole("option").map(option => option.textContent)).toEqual(["Banana"]);

    fireEvent.keyDown(box(), { key: "Enter" });
    expect(screen.getByRole("button", { name: "Remove Banana" })).toBeTruthy();
    // The typed text goes with it, so the next name starts from a clean box.
    expect((box() as HTMLInputElement).value).toBe("");
  });

  it("says when the typed text matches nothing, without saying the box is empty", () => {
    render(<Harness />);
    openList();
    type("zzz");

    expect(within(list()).getByText("Nothing matches that")).toBeTruthy();
    expect(within(list()).queryByText("Nothing left to choose")).toBeNull();
  });

  it("takes back the last chip on Backspace, but only from an empty box", () => {
    render(<Harness initial={["a", "b"]} />);
    openList();

    type("che");
    fireEvent.keyDown(box(), { key: "Backspace" });
    expect(screen.getByRole("button", { name: "Remove Banana" })).toBeTruthy();

    type("");
    fireEvent.keyDown(box(), { key: "Backspace" });
    expect(screen.queryByRole("button", { name: "Remove Banana" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove Apple" })).toBeTruthy();
  });

  it("closes when focus leaves the field, so tabbing does not leave lists open behind it", () => {
    render(<><Harness /><button type="button">Elsewhere</button></>);
    openList();
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.blur(box(), { relatedTarget: screen.getByRole("button", { name: "Elsewhere" }) });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("says so when everything has already been chosen", () => {
    render(<Harness initial={["a", "b", "c"]} />);
    openList();
    expect(within(list()).getByText("Nothing left to choose")).toBeTruthy();
  });
});
