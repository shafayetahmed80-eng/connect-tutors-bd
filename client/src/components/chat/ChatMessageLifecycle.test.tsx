// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  isWithinFiveMinutes,
  getRemainingSeconds,
  formatRemainingTime,
  ChatMessageActionMenu,
  DeletedMessagePlaceholder,
  EditedMessageBadge,
  InlineMessageEditor,
} from "./ChatMessageLifecycle";

afterEach(cleanup);

describe("ChatMessageLifecycle helpers and components", () => {
  it("correctly identifies whether a timestamp is within 5 minutes", () => {
    const justNow = new Date();
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);

    expect(isWithinFiveMinutes(justNow)).toBe(true);
    expect(isWithinFiveMinutes(threeMinutesAgo)).toBe(true);
    expect(isWithinFiveMinutes(sixMinutesAgo)).toBe(false);
  });

  it("calculates remaining seconds and formats remaining time", () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const remaining = getRemainingSeconds(twoMinutesAgo);
    expect(remaining).toBeGreaterThan(170);
    expect(remaining).toBeLessThanOrEqual(180);

    expect(formatRemainingTime(180)).toBe("3:00");
    expect(formatRemainingTime(65)).toBe("1:05");
    expect(formatRemainingTime(9)).toBe("0:09");
  });

  it("renders ChatMessageActionMenu with Edit and Delete within 5 minutes for own message", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();
    const justNow = new Date();

    render(
      <ChatMessageActionMenu
        messageId={101}
        createdAt={justNow}
        body="Assalamu Alaikum"
        isOwn={true}
        isOpen={true}
        onEdit={onEdit}
        onDelete={onDelete}
        onClose={onClose}
      />
    );

    expect(screen.getByText("এডিট")).toBeTruthy();
    expect(screen.getByText("মুছুন")).toBeTruthy();

    fireEvent.click(screen.getByText("এডিট"));
    expect(onEdit).toHaveBeenCalledWith(101, "Assalamu Alaikum");
    expect(onClose).toHaveBeenCalled();
  });

  it("disables edit/delete in action menu if 5 minutes have elapsed", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    render(
      <ChatMessageActionMenu
        messageId={102}
        createdAt={tenMinutesAgo}
        body="Old message"
        isOwn={true}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText("এডিট")).toBeNull();
    expect(screen.queryByText("মুছুন")).toBeNull();
    expect(screen.getByText("৫ মিনিট অতিক্রান্ত")).toBeTruthy();
  });

  it("renders DeletedMessagePlaceholder and EditedMessageBadge", () => {
    const { rerender } = render(<DeletedMessagePlaceholder own={false} />);
    expect(screen.getByTestId("deleted-message-placeholder").textContent).toContain(
      "[মেসেজটি মুছে ফেলা হয়েছে]"
    );

    rerender(<EditedMessageBadge own={true} />);
    expect(screen.getByTestId("edited-message-badge").textContent).toContain("(সম্পাদিত)");
  });

  it("handles InlineMessageEditor typing, saving, and cancellation", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <InlineMessageEditor
        initialText="Original text"
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Original text");

    fireEvent.change(textarea, { target: { value: "Updated text" } });
    fireEvent.click(screen.getByText("সংরক্ষণ করুন"));

    expect(onSave).toHaveBeenCalledWith("Updated text");

    fireEvent.click(screen.getByText("বাতিল"));
    expect(onCancel).toHaveBeenCalled();
  });
});
