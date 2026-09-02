// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as Array<{ slotId: string; text: string | null; textSizePx: number | null; spacing: string | null }>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({}),
    siteContent: {
      list: { useQuery: () => ({ data: state.rows, isLoading: false, isError: false }) },
      listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
    },
  },
}));

import { TUTOR_PROFILE_RECORD_ROW_PX, findSiteContentSizeSlot } from "@shared/site-content";
import { SiteContentProvider } from "@/lib/siteContent";
import { TutorProfileReadoutRows } from "./TutorProfileReadoutRows";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";

const rows = [
  { label: "Primary subjects", value: "Not given", missing: true },
  { label: "Additional subjects", value: "Not given", missing: true, optional: true },
  { label: "Curriculum", value: "English Medium", missing: false },
];

function renderRows() {
  return render(
    <SiteContentProvider page="tutor-profile">
      <TutorProfileReadoutRows rows={rows} />
    </SiteContentProvider>,
  );
}

beforeEach(() => { state.rows = []; });
afterEach(cleanup);

describe("tutor profile readout rows", () => {
  it("carries no inline size until an Admin sets one, so the 12px in code stands", () => {
    renderRows();

    for (const text of ["Primary subjects", "Curriculum", "English Medium"]) {
      expect(screen.getByText(text).style.fontSize, text).toBe("");
    }
  });

  it("applies the Admin's size to labels and values alike", () => {
    state.rows = [{ slotId: "tutor-profile.size.record-row", text: null, textSizePx: 16, spacing: null }];
    renderRows();

    // One control moves the pair: a label at one size beside a value at another
    // is the mismatch splitting them into two knobs would invite.
    for (const text of ["Primary subjects", "Curriculum", "English Medium"]) {
      expect(screen.getByText(text).style.fontSize, text).toBe("16px");
    }
  });

  it("keeps the missing, muted and present treatments apart at any size", () => {
    state.rows = [{ slotId: "tutor-profile.size.record-row", text: null, textSizePx: 16, spacing: null }];
    renderRows();

    // Both empty fields read "Not given" now, so colour is the only thing left
    // telling a tutor which blank actually blocks submission.
    const missing = screen.getAllByText("Not given");
    expect(missing).toHaveLength(2);
    expect(missing[0].className).toContain("text-j-err");
    expect(missing[1].className).toContain("#9aabbb");
    expect(screen.getByText("English Medium").className).toContain("#243b52");
  });

  it("keeps the shipped class and the registry's default on the same number", () => {
    // Tailwind generates arbitrary sizes at build time, so the class has to
    // spell 12px out. Nothing but this test stops the two drifting apart.
    for (const token of [tp.rowLabel, tp.rowValue, tp.rowValueMuted, tp.rowValueMissing]) {
      expect(token, token).toContain(`text-[${TUTOR_PROFILE_RECORD_ROW_PX}px]`);
    }
    expect(findSiteContentSizeSlot("tutor-profile.size.record-row")?.defaultPx).toBe(TUTOR_PROFILE_RECORD_ROW_PX);
  });

  it("gives the identity rail a size-free treatment so it keeps its own 13px", () => {
    // Combining rowValueMissing with another text-* class leaves two font
    // sizes on one element and no reliable winner.
    expect(tp.rowValueMissingTone).not.toMatch(/\btext-\[/);
    expect(tp.rowValueMissingTone).toContain("text-j-err");
  });

  it("clamps a size stored outside the supported range", () => {
    state.rows = [{ slotId: "tutor-profile.size.record-row", text: null, textSizePx: 900, spacing: null }];
    renderRows();

    expect(screen.getByText("Primary subjects").style.fontSize).toBe("48px");
  });
});
