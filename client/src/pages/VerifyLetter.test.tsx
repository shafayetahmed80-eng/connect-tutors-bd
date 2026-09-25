// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/components/SiteHeader", () => ({ default: () => <header aria-label="Site header" /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/lib/siteContent", () => ({ useSiteContact: () => ({ display: "+8801516131411" }) }));

const verify = vi.hoisted(() => ({ state: {} as { data?: unknown; isLoading: boolean; error: unknown }, input: undefined as unknown }));
vi.mock("@/lib/trpc", () => ({
  trpc: { confirmationLetters: { verify: { useQuery: (input: unknown) => { verify.input = input; return verify.state; } } } },
}));

import VerifyLetter from "./VerifyLetter";

function openAt(path: string) {
  const location = memoryLocation({ path, record: true });
  render(<Router hook={location.hook}><VerifyLetter /></Router>);
  return location;
}

beforeEach(() => {
  verify.state = { isLoading: false, error: null };
  verify.input = undefined;
});

afterEach(() => cleanup());

describe("checking a Confirmation Letter", () => {
  it("asks the server about the Letter ID and code in the QR link", () => {
    verify.state = { isLoading: true, error: null };
    openAt("/verify/CTB-2026-000019-V1/ABCDEFGHJK");
    expect(verify.input).toEqual({ letterNumber: "CTB-2026-000019-V1", code: "ABCDEFGHJK" });
    expect(screen.getByText("Checking the letter…")).toBeTruthy();
    expect((screen.getByLabelText("Code") as HTMLInputElement).value).toBe("ABCDE-FGHJK");
  });

  it("confirms a genuine, current letter and lays out the details on record", () => {
    verify.state = {
      isLoading: false,
      error: null,
      data: {
        status: "valid",
        letterNumber: "CTB-2026-000019-V1",
        issued: "23 Aug 2026",
        version: "1",
        tutorRows: [["Name", "Ayesha Rahman"], ["Tutor ID", "777"]],
        tuitionRows: [["Job ID", "6818"], ["Start date", "1 September 2026"]],
        fee: "5,000 – 7,000 Taka",
      },
    };
    openAt("/verify/CTB-2026-000019-V1/ABCDEFGHJK");
    const result = screen.getByRole("status");
    expect(result.textContent).toContain("Genuine letter");
    expect(result.textContent).toContain("Connect Tutors issued this letter on 23 Aug 2026");
    const details = Array.from(result.querySelectorAll("dl > div"), row => row.textContent);
    expect(details).toEqual([
      "Letter IDCTB-2026-000019-V1", "Issued23 Aug 2026", "Version1",
      "TutorAyesha Rahman", "Tutor ID777", "Job ID6818", "Start date1 September 2026",
      "Agreed monthly fee5,000 – 7,000 Taka",
    ]);
  });

  it("says when a letter has been replaced, and by which", () => {
    verify.state = { isLoading: false, error: null, data: { status: "replaced", letterNumber: "CTB-2026-000019-V1", issued: "23 Aug 2026", replacedBy: "CTB-2026-000019-V2" } };
    openAt("/verify/CTB-2026-000019-V1/ABCDEFGHJK");
    const result = screen.getByRole("status");
    expect(result.textContent).toContain("This letter has been replaced");
    expect(result.textContent).toContain("The current letter is CTB-2026-000019-V2");
    expect(result.querySelector("dl")).toBeNull();
  });

  it("says plainly when it cannot confirm a letter, and how to reach us", () => {
    verify.state = { isLoading: false, error: null, data: { status: "unknown" } };
    openAt("/verify/CTB-2026-000019-V1/WRONGCODE2");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("We could not confirm this letter");
    expect(alert.textContent).toContain("+8801516131411");
  });

  it("takes a typed Letter ID and code to their check page", () => {
    const location = openAt("/verify");
    expect(verify.input).toBeUndefined();
    fireEvent.change(screen.getByLabelText("Letter ID"), { target: { value: "ctb-2026-000019-v1" } });
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "abcde-fghjk" } });
    fireEvent.click(screen.getByRole("button", { name: "Check letter" }));
    expect(location.history?.at(-1)).toBe("/verify/CTB-2026-000019-V1/ABCDEFGHJK");
  });
});
