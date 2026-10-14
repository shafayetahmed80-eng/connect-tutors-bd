// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Search } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmptyState from "./EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders title, description, and floating icon container with micro-animation classes", () => {
    const { container } = render(
      <EmptyState
        title="No items found"
        description="Try adjusting your search criteria"
      />
    );

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("No items found")).toBeTruthy();
    expect(screen.getByText("Try adjusting your search criteria")).toBeTruthy();

    const iconContainer = screen.getByTestId("empty-state-icon-container");
    expect(iconContainer.className).toContain("empty-float");

    const halo = container.querySelector(".empty-halo-pulse");
    expect(halo).toBeTruthy();
  });

  it("renders custom kicker, hint, and custom Lucide icon", () => {
    render(
      <EmptyState
        icon={Search}
        kicker="Search Filter"
        title="Nothing matches"
        hint={<span>Check spelling</span>}
      />
    );

    expect(screen.getByText("Search Filter")).toBeTruthy();
    expect(screen.getByText("Nothing matches")).toBeTruthy();
    expect(screen.getByText("Check spelling")).toBeTruthy();
  });

  it("renders primary action button and triggers onClick", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="Empty list"
        action={{ label: "Reset list", onClick: onAction }}
      />
    );

    const button = screen.getByRole("button", { name: "Reset list" });
    expect(button).toBeTruthy();
    expect(button.getAttribute("data-ripple")).toBe("true");

    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders secondary action as an anchor link with external attributes", () => {
    render(
      <EmptyState
        title="Empty list"
        secondaryAction={{
          label: "Contact Support",
          href: "https://example.com/support",
          external: true,
        }}
      />
    );

    const link = screen.getByRole("link", { name: "Contact Support" });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://example.com/support");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });

  it("renders compact mode with tighter padding and sizing", () => {
    const { container } = render(
      <EmptyState
        title="Compact Empty"
        compact
      />
    );

    const root = container.querySelector('[role="status"]');
    expect(root?.className).toContain("px-4");
    expect(root?.className).toContain("py-7");

    const iconContainer = screen.getByTestId("empty-state-icon-container");
    expect(iconContainer.className).toContain("size-11");
  });
});
