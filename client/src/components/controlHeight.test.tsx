// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterPanelFrame, ListToolbarCard } from "@/components/ListToolbar";
import { GenderField, PhoneField } from "@/components/registrationFields";

afterEach(cleanup);

/**
 * The Owner's rule of 2026-10-11: a field and a button stand one height,
 * wherever they are - 40px since 2026-10-12. The number is one variable
 * (--control-height, set from Admin; see SiteDimensionStyle.test.ts) and a piece
 * stands it by carrying h-control or min-h-control, never a literal.
 */
describe("one height for a field and a button", () => {
  it("makes the shared input and the large button stand the one height (h-control)", () => {
    render(<><Input aria-label="Name" /><Button size="lg">Save</Button></>);

    expect(screen.getByLabelText("Name").className).toContain("h-control");
    expect(screen.getByRole("button", { name: "Save" }).className).toContain("h-control");
    expect(screen.getByLabelText("Name").className).not.toContain("h-11");
  });

  it("makes the toolbar card's Filter button and the panel's Clear and Apply stand the one height", () => {
    render(<>
      <ListToolbarCard eyebrow="Jobs" count={3} caption="in this list" filterOpen={false} onToggleFilter={() => {}} activeFilterCount={0} panelId="p" />
      <FilterPanelFrame id="p" ariaLabel="Filters" total={3} onClose={() => {}} onClear={() => {}} onApply={() => {}}><p>boxes</p></FilterPanelFrame>
    </>);

    for (const name of [/^Filter/, "Clear", "Apply", "Close"]) {
      expect(screen.getByRole("button", { name }).className, String(name)).toContain("min-h-control");
    }
  });

  it("gives the registration phone box and gender pill the journey field height, so they follow the Owner's dial", () => {
    const { container } = render(<>
      <PhoneField id="phone" label="Phone number" value="" onChange={() => {}} />
      <GenderField name="gender" label="Gender" value="" onSelect={() => {}} />
    </>);

    const phoneBox = container.querySelector("#phone")!.parentElement!;
    expect(phoneBox.className).toContain("modal-field-journey");
    // The typing area takes the box's height; it has no vertical padding of its own to drift from it.
    expect(container.querySelector("#phone")!.className).not.toMatch(/\bpy-/);

    const pill = container.querySelector("fieldset > div")!;
    expect(pill.className).toContain("modal-field-journey");
  });
});
