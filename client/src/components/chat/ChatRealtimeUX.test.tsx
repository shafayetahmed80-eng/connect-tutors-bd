// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChatSoundToggle,
  ChatVoiceNotePlayer,
  MessageStatusTicks,
  ScrollToBottomFloatingButton,
  playMessageChime,
} from "./ChatRealtimeUX";

afterEach(cleanup);

describe("ChatRealtimeUX components", () => {
  it("renders MessageStatusTicks with appropriate ticks and seen label", () => {
    const { rerender } = render(<MessageStatusTicks status="sent" />);
    expect(screen.getByTitle("Sent")).toBeTruthy();

    rerender(<MessageStatusTicks status="delivered" />);
    expect(screen.getByTitle("Delivered")).toBeTruthy();

    rerender(<MessageStatusTicks status="seen" />);
    expect(screen.getByTitle("Seen")).toBeTruthy();
    expect(screen.getByText("Seen")).toBeTruthy();

    rerender(<MessageStatusTicks status="sending" />);
    expect(screen.getByTitle("Sending…")).toBeTruthy();
  });

  it("renders ChatVoiceNotePlayer with playback controls and speed cycling", () => {
    render(<ChatVoiceNotePlayer url="https://example.com/audio.webm" />);

    expect(screen.getByRole("region", { name: "Voice note player" })).toBeTruthy();
    const playBtn = screen.getByRole("button", { name: "Play voice note" });
    expect(playBtn).toBeTruthy();

    const speedBtn = screen.getByRole("button", { name: "Playback speed: 1x" });
    expect(speedBtn).toBeTruthy();

    // Toggle speed: 1x -> 1.5x -> 2x -> 1x
    fireEvent.click(speedBtn);
    expect(screen.getByRole("button", { name: "Playback speed: 1.5x" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Playback speed: 1.5x" }));
    expect(screen.getByRole("button", { name: "Playback speed: 2x" })).toBeTruthy();
  });

  it("renders ScrollToBottomFloatingButton and triggers scroll callback", () => {
    const container = document.createElement("div");
    // Mock scrollHeight > clientHeight
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "scrollTop", { value: 100, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });

    const ref = { current: container };
    const onClick = vi.fn();

    render(
      <ScrollToBottomFloatingButton
        containerRef={ref as unknown as React.RefObject<HTMLElement | null>}
        unreadCount={3}
        onClick={onClick}
      />
    );

    const btn = screen.getByRole("button", { name: "Scroll to newest messages" });
    expect(btn).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders ChatSoundToggle and toggles sound state", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<ChatSoundToggle muted={false} onToggle={onToggle} />);

    const unmuteBtn = screen.getByRole("button", { name: "Mute chat sound alerts" });
    expect(unmuteBtn).toBeTruthy();
    fireEvent.click(unmuteBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<ChatSoundToggle muted={true} onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "Unmute chat sound alerts" })).toBeTruthy();
  });

  it("safely invokes playMessageChime without throw even in simulated browser environment", () => {
    expect(() => playMessageChime()).not.toThrow();
  });
});
