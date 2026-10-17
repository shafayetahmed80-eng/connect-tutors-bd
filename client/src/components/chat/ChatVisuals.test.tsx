// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChatAutoLink,
  ChatDateDivider,
  ImageLightboxModal,
  formatChatDateGroup,
  isDifferentDay,
} from "./ChatVisuals";

afterEach(cleanup);

describe("ChatVisuals components and helpers", () => {
  it("formats dates into Today, Yesterday, and formatted strings", () => {
    const today = new Date();
    expect(formatChatDateGroup(today)).toBe("Today");

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    expect(formatChatDateGroup(yesterday)).toBe("Yesterday");

    const past = new Date(2025, 4, 12);
    expect(formatChatDateGroup(past)).toContain("12 May 2025");
  });

  it("checks if two timestamps are on different calendar days", () => {
    const d1 = "2026-10-15T10:00:00.000Z";
    const d2 = "2026-10-15T15:30:00.000Z";
    const d3 = "2026-10-16T09:00:00.000Z";

    expect(isDifferentDay(d1, d2)).toBe(false);
    expect(isDifferentDay(d1, d3)).toBe(true);
  });

  it("renders ChatDateDivider with formatted label", () => {
    render(<ChatDateDivider date={new Date()} />);
    expect(screen.getByText("Today")).toBeTruthy();
  });

  it("parses text and renders URLs as clickable links", () => {
    render(<ChatAutoLink text="Check this link https://connecttutorsbd.com/jobs and apply!" />);
    const link = screen.getByRole("link", { name: /connecttutorsbd.com\/jobs/ });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://connecttutorsbd.com/jobs");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders ImageLightboxModal with zoom and download controls", () => {
    const onClose = vi.fn();
    render(<ImageLightboxModal url="https://example.com/photo.jpg" onClose={onClose} title="Receipt" />);

    expect(screen.getByRole("dialog", { name: "Receipt" })).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();

    const zoomInBtn = screen.getByRole("button", { name: "Zoom in" });
    fireEvent.click(zoomInBtn);
    expect(screen.getByText("125%")).toBeTruthy();

    const zoomOutBtn = screen.getByRole("button", { name: "Zoom out" });
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText("100%")).toBeTruthy();

    const downloadLink = screen.getByRole("link", { name: "Download image" });
    expect(downloadLink.getAttribute("href")).toBe("https://example.com/photo.jpg");

    const closeBtn = screen.getByRole("button", { name: "Close image preview" });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes ImageLightboxModal on Escape key", () => {
    const onClose = vi.fn();
    render(<ImageLightboxModal url="https://example.com/photo.jpg" onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
