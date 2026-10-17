// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChatAnimatedBubble,
  ChatSendButton,
  ChatTypingIndicator,
  VoiceRecordingBar,
} from "./ChatMotion";

describe("ChatMotion components", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    cleanup();
  });

  it("renders ChatAnimatedBubble with children and role attribute", () => {
    render(
      <ChatAnimatedBubble own={true} className="test-bubble">
        <p>Animated message text</p>
      </ChatAnimatedBubble>
    );

    expect(screen.getByText("Animated message text")).toBeTruthy();
    const bubble = screen.getByText("Animated message text").closest("[data-chat-bubble-role]");
    expect(bubble?.getAttribute("data-chat-bubble-role")).toBe("own");
  });

  it("renders ChatTypingIndicator with live status and bouncing wave dots", () => {
    const { rerender } = render(<ChatTypingIndicator senderRole="admin" />);
    expect(screen.getByText("Admin is typing…")).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();

    rerender(<ChatTypingIndicator senderRole="tutor" />);
    expect(screen.getByText("Tutor is typing…")).toBeTruthy();
  });

  it("renders VoiceRecordingBar with live elapsed timer, frequency wave, and controls", () => {
    const onStop = vi.fn();
    const onCancel = vi.fn();

    render(<VoiceRecordingBar onStop={onStop} onCancel={onCancel} />);

    expect(screen.getByRole("region", { name: "Voice recording in progress" })).toBeTruthy();
    expect(screen.getByText("00:00")).toBeTruthy();

    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("00:05")).toBeTruthy();

    // Cancel recording
    fireEvent.click(screen.getByRole("button", { name: "Cancel recording" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Stop and send recording
    fireEvent.click(screen.getByRole("button", { name: "Send voice note" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("renders ChatSendButton with micro-animations and click handling", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <ChatSendButton disabled={false} isPending={false} onClick={onClick} ariaLabel="Send message" />
    );

    const button = screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <ChatSendButton disabled={true} isPending={false} onClick={onClick} ariaLabel="Send message" />
    );
    expect(button.disabled).toBe(true);
  });
});
