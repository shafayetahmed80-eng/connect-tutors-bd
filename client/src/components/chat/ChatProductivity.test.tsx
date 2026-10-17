// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChatMessageBody,
  EmojiReactionPicker,
  ReplyPreviewBar,
  TutorPeekProfileDrawer,
} from "./ChatProductivity";

afterEach(cleanup);

describe("ChatProductivity components", () => {
  it("renders plain message body and auto-links", () => {
    render(<ChatMessageBody text="Visit https://connecttutorsbd.com today!" />);
    const link = screen.getByRole("link", { name: /connecttutorsbd.com/ });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://connecttutorsbd.com");
  });

  it("highlights search query keywords with <mark>", () => {
    render(<ChatMessageBody text="Need chemistry tutor for class 10" query="chemistry" />);
    const mark = screen.getByText("chemistry");
    expect(mark.tagName.toLowerCase()).toBe("mark");
  });

  it("renders structured quoted reply box above the message", () => {
    const text = '> [Replying to Tutor]: "Can I have payment info?"\n\nPlease check the invoice in the portal.';
    render(<ChatMessageBody text={text} />);

    expect(screen.getByText("Replying to Tutor")).toBeTruthy();
    expect(screen.getByText("Can I have payment info?")).toBeTruthy();
    expect(screen.getByText("Please check the invoice in the portal.")).toBeTruthy();
  });

  it("renders ReplyPreviewBar and handles cancellation", () => {
    const onCancel = vi.fn();
    render(
      <ReplyPreviewBar
        replyingTo={{ id: 5, body: "What are your available days?", senderRole: "tutor" }}
        onCancel={onCancel}
        currentRole="admin"
      />
    );

    expect(screen.getByText(/Replying to Tutor/)).toBeTruthy();
    expect(screen.getByText("What are your available days?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel reply" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("handles multi-emoji reaction picker interactions", () => {
    const onToggle = vi.fn();
    const onSelectEmoji = vi.fn();

    render(
      <EmojiReactionPicker
        reacted={false}
        currentEmoji="👍"
        onToggle={onToggle}
        onSelectEmoji={onSelectEmoji}
      />
    );

    const toggleBtn = screen.getByRole("button", { name: "React with 👍" });
    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalled();

    // Open more reactions popup
    const moreBtn = screen.getByRole("button", { name: "More reactions" });
    fireEvent.click(moreBtn);

    const heartBtn = screen.getByRole("button", { name: "React with ❤️" });
    fireEvent.click(heartBtn);
    expect(onSelectEmoji).toHaveBeenCalledWith("❤️");
  });

  it("renders TutorPeekProfileDrawer with tutor credentials and copy phone", () => {
    const onClose = vi.fn();
    const mockClipboard = { writeText: vi.fn() };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(
      <TutorPeekProfileDrawer
        tutor={{
          tutorId: "t-101",
          tutorNumber: 420,
          tutorName: "Rakibul Hasan",
          phone: "01711223344",
          instituteName: "BUET",
          departmentName: "CSE",
        }}
        onClose={onClose}
      />
    );

    expect(screen.getByText("Rakibul Hasan")).toBeTruthy();
    expect(screen.getByText("Tutor ID 420")).toBeTruthy();
    expect(screen.getByText("BUET")).toBeTruthy();
    expect(screen.getByText("01711223344")).toBeTruthy();
    expect(screen.getByText(/Member: BTPA - 077/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Copy phone number" }));
    expect(mockClipboard.writeText).toHaveBeenCalledWith("01711223344");

    fireEvent.click(screen.getByRole("button", { name: "Close profile drawer" }));
    expect(onClose).toHaveBeenCalled();
  });
});
