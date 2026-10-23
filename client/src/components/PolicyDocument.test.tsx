// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PolicyDocument from "./PolicyDocument";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  writeText: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
  },
}));

describe("PolicyDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: mocks.writeText,
      },
    });
    window.location.hash = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders headings with generated anchor ids", () => {
    const doc = `## Who can use Connect Tutors
Connect Tutors connects guardians and tutors.

### Platform charge
Platform fee details.`;

    render(<PolicyDocument body={doc} />);

    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.id).toBe("who-can-use-connect-tutors");
    expect(h2.textContent).toContain("Who can use Connect Tutors");

    const h3 = screen.getByRole("heading", { level: 3 });
    expect(h3.id).toBe("platform-charge");
    expect(h3.textContent).toContain("Platform charge");
  });

  it("copies anchor url to clipboard, updates window hash and triggers success toast", async () => {
    const doc = `## Cancellation Policy
Details on cancellation.`;

    const onHeadingClick = vi.fn();
    render(<PolicyDocument body={doc} onHeadingClick={onHeadingClick} />);

    const copyBtn = screen.getByRole("button", { name: "Copy link to section cancellation-policy" });
    expect(copyBtn).toBeTruthy();

    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mocks.writeText).toHaveBeenCalledWith(
        expect.stringContaining("#cancellation-policy")
      );
    });

    expect(mocks.toastSuccess).toHaveBeenCalledWith("সেকশন লিংক কপি হয়েছে!");
    expect(onHeadingClick).toHaveBeenCalledWith("cancellation-policy");
    expect(window.location.hash).toBe("#cancellation-policy");
  });

  it("hides anchor buttons when showAnchorLinks is false", () => {
    const doc = `## Simple Heading
Some text.`;

    render(<PolicyDocument body={doc} showAnchorLinks={false} />);

    expect(screen.queryByRole("button", { name: /Copy link to section/i })).toBeNull();
  });

  it("renders lists, emphasis, and safe external/internal links", () => {
    const doc = `## Contact Information

- Visit our [contact page](/contact) for help.
- Visit [Google](https://google.com) externally.
- Keep **credentials** and *passwords* private.`;

    render(<PolicyDocument body={doc} />);

    const internalLink = screen.getByRole("link", { name: "contact page" });
    expect(internalLink.getAttribute("href")).toBe("/contact");
    expect(internalLink.getAttribute("target")).toBeNull();

    const externalLink = screen.getByRole("link", { name: "Google" });
    expect(externalLink.getAttribute("href")).toBe("https://google.com");
    expect(externalLink.getAttribute("target")).toBe("_blank");
    expect(externalLink.getAttribute("rel")).toContain("noreferrer");

    expect(screen.getByText("credentials").tagName).toBe("STRONG");
    expect(screen.getByText("passwords").tagName).toBe("EM");
  });

  it("returns null for an empty document", () => {
    const { container } = render(<PolicyDocument body="" />);
    expect(container.firstChild).toBeNull();
  });
});
