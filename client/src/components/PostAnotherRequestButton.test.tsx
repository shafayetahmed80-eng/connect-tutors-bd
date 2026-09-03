// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostAnotherRequestButton } from "./PostAnotherRequestButton";

afterEach(cleanup);

describe("PostAnotherRequestButton", () => {
  it("goes somewhere when given a destination and does something when given a handler", () => {
    const { unmount } = render(<PostAnotherRequestButton href="/guardian/dashboard/hire" variant="solid" />);
    expect(screen.getByRole("link", { name: "Post another request" }).getAttribute("href")).toBe("/guardian/dashboard/hire");
    unmount();

    // The confirmation resets the journey in place, so there it is a button.
    const onClick = vi.fn();
    render(<PostAnotherRequestButton onClick={onClick} variant="card" />);
    fireEvent.click(screen.getByRole("button", { name: "Post another request" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("says the same thing whichever skin it wears, with the plus left to the chip", () => {
    const { container, unmount } = render(<PostAnotherRequestButton href="/x" variant="solid" />);
    const solidName = screen.getByRole("link").textContent?.trim();
    // The chip draws the plus, so the label does not spell it.
    expect(solidName).toBe("Post another request");
    expect(container.querySelector('span[aria-hidden="true"] svg')).not.toBeNull();
    unmount();

    render(<PostAnotherRequestButton onClick={vi.fn()} variant="card" />);
    expect(screen.getByRole("button").textContent?.trim()).toBe("Post another request");
  });

  it("fills where it is the only action and stays a card where it is the second one", () => {
    const { container, unmount } = render(<PostAnotherRequestButton href="/x" variant="solid" />);
    const solid = container.firstElementChild as HTMLElement;
    // Posted jobs has nothing else to press; a white card would sink into the
    // white job cards below it.
    expect(solid.className).toContain("bg-j-accent");
    expect(solid.className).not.toContain("bg-white");
    unmount();

    render(<PostAnotherRequestButton onClick={vi.fn()} variant="card" />);
    const card = screen.getByRole("button");
    // Beside the primary blue "View my request", two solids would compete.
    expect(card.className).toContain("bg-white");
    expect(card.className).not.toContain("bg-j-accent ");
  });

  it("shares one hover language with the job cards", () => {
    const { container } = render(<PostAnotherRequestButton href="/x" variant="solid" />);
    const shell = container.firstElementChild as HTMLElement;

    expect(shell.className).toContain("duration-[320ms]");
    expect(shell.className).toContain("hover:-translate-y-[1.5px]");
    expect(shell.className).toContain("motion-reduce:hover:translate-y-0");
  });
});
