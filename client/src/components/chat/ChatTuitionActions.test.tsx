// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

afterEach(() => {
  cleanup();
});
import {
  extractJobIdsFromText,
  ChatTuitionJobCard,
  PinnedJobBanner,
  ShareJobModal,
  isOutOfOfficeHours,
  ChatOutOfOfficeBanner,
  ChatPriorityFilterBar,
  ChatPriorityTagSelector,
  ChatEmergencyCallWhatsAppActions,
  type ChatPriorityTag,
} from "./ChatTuitionActions";

describe("ChatTuitionActions", () => {
  describe("Task 9: Tuition Job Cards & Pinning", () => {
    it("extractJobIdsFromText extracts job IDs from various message formats", () => {
      const text = "Check out #JOB-6801 and also JOB-6802. Or see https://connecttutorsbd.com/job-board?job=6803 and #6804.";
      const ids = extractJobIdsFromText(text);
      expect(ids).toContain("6801");
      expect(ids).toContain("6802");
      expect(ids).toContain("6803");
      expect(ids).toContain("6804");
    });

    it("returns empty array when text has no job IDs", () => {
      expect(extractJobIdsFromText("Hello admin how are you?")).toEqual([]);
      expect(extractJobIdsFromText("")).toEqual([]);
    });

    it("renders ChatTuitionJobCard with link, BTPA badge and triggers onTogglePin", () => {
      const onTogglePin = vi.fn();
      render(<ChatTuitionJobCard jobId="6801" isPinned={false} onTogglePin={onTogglePin} />);

      expect(screen.getByText("জব #6801")).toBeTruthy();
      expect(screen.getByText("Member: BTPA - 077")).toBeTruthy();

      const detailsLink = screen.getByRole("link", { name: /বিস্তারিত ও আবেদন দেখুন/i });
      expect(detailsLink.getAttribute("href")).toBe("/job-board?job=6801");

      const pinButton = screen.getByRole("button", { name: /জব #6801 উপরে পিন করুন/i });
      fireEvent.click(pinButton);
      expect(onTogglePin).toHaveBeenCalledWith("6801");
    });

    it("renders ChatTuitionJobCard in pinned state", () => {
      const onTogglePin = vi.fn();
      render(<ChatTuitionJobCard jobId="6801" isPinned={true} onTogglePin={onTogglePin} />);

      const unpinButton = screen.getByRole("button", { name: /জব #6801 পিন থেকে সরান/i });
      expect(unpinButton.textContent).toContain("পিন সরানো");
      fireEvent.click(unpinButton);
      expect(onTogglePin).toHaveBeenCalledWith("6801");
    });

    it("renders PinnedJobBanner and handles unpin action", () => {
      const onUnpin = vi.fn();
      render(<PinnedJobBanner jobId="6801" onUnpin={onUnpin} />);

      expect(screen.getByText("জব #6801")).toBeTruthy();
      const unpinBtn = screen.getByRole("button", { name: /পিন সরান/i });
      fireEvent.click(unpinBtn);
      expect(onUnpin).toHaveBeenCalledOnce();
    });

    it("renders ShareJobModal with quick suggestions and custom input", () => {
      const onSelectJob = vi.fn();
      const onClose = vi.fn();
      render(<ShareJobModal onSelectJob={onSelectJob} onClose={onClose} />);

      expect(screen.getByText("টিউশন জব কার্ড শেয়ার করুন")).toBeTruthy();

      // Click a suggestion
      const suggestion = screen.getByRole("button", { name: /জব #6801/i });
      fireEvent.click(suggestion);
      expect(onSelectJob).toHaveBeenCalledWith("#JOB-6801");
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Task 10: Priority Tags in Admin", () => {
    it("renders ChatPriorityFilterBar and handles filter change", () => {
      const onSelectTag = vi.fn();
      render(
        <ChatPriorityFilterBar
          selectedTag="all"
          onSelectTag={onSelectTag}
          tagCounts={{ urgent: 3, payment: 1 }}
        />
      );

      expect(screen.getByText("সকল")).toBeTruthy();
      expect(screen.getByText(/জরুরী/)).toBeTruthy();
      expect(screen.getByText("(3)")).toBeTruthy();

      const urgentBtn = screen.getByRole("button", { name: /জরুরী/i });
      fireEvent.click(urgentBtn);
      expect(onSelectTag).toHaveBeenCalledWith("urgent");
    });

    it("renders ChatPriorityTagSelector and allows assigning a tag", () => {
      const onSelectTag = vi.fn();
      render(<ChatPriorityTagSelector currentTag={null} onSelectTag={onSelectTag} />);

      const selectorBtn = screen.getByRole("button", { name: /চ্যাটের প্রায়োরিটি ট্যাগ নির্ধারণ করুন/i });
      fireEvent.click(selectorBtn);

      const urgentOption = screen.getByRole("button", { name: "জরুরী" });
      fireEvent.click(urgentOption);
      expect(onSelectTag).toHaveBeenCalledWith("urgent");
    });
  });

  describe("Task 11: Out-of-Office Smart Auto-Response Banner", () => {
    it("calculates isOutOfOfficeHours correctly for BST (UTC+6)", () => {
      // 23:30 BST = 17:30 UTC -> Out of office
      const nightDate = new Date("2026-10-17T17:30:00.000Z");
      expect(isOutOfOfficeHours(nightDate)).toBe(true);

      // 03:00 BST = 21:00 UTC previous day -> Out of office
      const lateNightDate = new Date("2026-10-17T21:00:00.000Z");
      expect(isOutOfOfficeHours(lateNightDate)).toBe(true);

      // 14:00 BST = 08:00 UTC -> Office hours
      const workDate = new Date("2026-10-17T08:00:00.000Z");
      expect(isOutOfOfficeHours(workDate)).toBe(false);
    });

    it("renders ChatOutOfOfficeBanner and handles dismiss", () => {
      render(<ChatOutOfOfficeBanner forceShow={true} />);

      expect(screen.getByText("আমাদের সাপোর্ট টিম বর্তমানে অফলাইনে আছেন")).toBeTruthy();
      const closeBtn = screen.getByRole("button", { name: /নোটিশ বন্ধ করুন/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByText("আমাদের সাপোর্ট টিম বর্তমানে অফলাইনে আছেন")).toBeNull();
    });
  });

  describe("Task 12: Verified Emergency Call & WhatsApp Launcher", () => {
    it("renders emergency actions and BTPA accreditation badge", () => {
      const mockContact = {
        number: "8801516131411",
        display: "+8801516131411",
        tel: "tel:+8801516131411",
        whatsapp: (msg?: string) => `https://wa.me/8801516131411?text=${encodeURIComponent(msg || "")}`,
      };

      render(<ChatEmergencyCallWhatsAppActions contact={mockContact} />);

      const waLink = screen.getByRole("link", { name: /WhatsApp/i });
      expect(waLink.getAttribute("href")).toContain("wa.me/8801516131411");

      const telLink = screen.getByRole("link", { name: /\+8801516131411/i });
      expect(telLink.getAttribute("href")).toBe("tel:+8801516131411");

      expect(screen.getByText("BTPA - 077")).toBeTruthy();
    });
  });
});
