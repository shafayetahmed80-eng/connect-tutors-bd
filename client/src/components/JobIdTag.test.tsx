// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { JobIdTag } from "./JobIdTag";
import { ModalHeader, Modal } from "@/components/ui/modal";

afterEach(cleanup);

const tag = () => document.querySelector("[data-job-id]") as HTMLElement;

describe("JobIdTag", () => {
  it("draws the Status card's look: deep blue, bold, upper case, wide letter-space, a paler # in front", () => {
    render(<JobIdTag jobId="6804" />);

    for (const token of ["text-[#1680c2]", "font-bold", "uppercase", "tracking-[.16em]"]) {
      expect(tag().className, token).toContain(token);
    }
    const icon = tag().querySelector("svg")!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.getAttribute("class")).toContain("text-[#8fb4d0]");
  });

  it("says Job ID : and the number on a card or a header", () => {
    render(<JobIdTag jobId="6804" />);
    expect(tag().textContent).toBe("Job ID : 6804");
  });

  it("is only the number in a table column whose heading already says Job ID", () => {
    render(<JobIdTag bare jobId="6804" />);
    expect(tag().textContent).toBe("6804");
    expect(tag().querySelector("svg")).not.toBeNull();
  });

  it("reads as the plain words inside a sentence, with no colon", () => {
    render(<JobIdTag colon={false} jobId="6804" />);
    expect(tag().textContent).toBe("Job ID 6804");
  });

  it("leaves the words alone and only styles them upper case, so a screen reader and a dialog's name read them as before", () => {
    render(<Modal onClose={() => {}}><ModalHeader title={<>Cancel <JobIdTag colon={false} jobId="6804" />?</>} /></Modal>);

    expect(screen.getByRole("dialog", { name: "Cancel Job ID 6804?" })).toBeTruthy();
    expect(tag().textContent).not.toContain("JOB");
  });

  it("sets no size of its own, so the Owner's text sizes still decide how large it is", () => {
    render(<JobIdTag jobId="6804" />);
    expect(tag().className).not.toMatch(/(^|\s)text-(xs|sm|base|lg|2xs|\[[0-9]+px\])(\s|$)/);
  });

  it("takes a size, a width or any other class from where it is used", () => {
    render(<JobIdTag bare className="w-16 shrink-0 text-2xs" jobId="6804" />);
    expect(tag().className).toContain("w-16");
    expect(tag().className).toContain("text-2xs");
  });
});
