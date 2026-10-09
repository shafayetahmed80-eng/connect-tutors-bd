import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_CHAT_FILTERS,
  adminChatFilterAlerts,
  buildAdminChatFilterInput,
  countAdminChatFilters,
} from "./admin-chat-filters";

describe("buildAdminChatFilterInput", () => {
  it("sends nothing for a panel nobody has touched", () => {
    expect(buildAdminChatFilterInput(DEFAULT_ADMIN_CHAT_FILTERS)).toEqual({});
    expect(countAdminChatFilters(DEFAULT_ADMIN_CHAT_FILTERS)).toBe(0);
  });

  it("turns what was chosen into what the server takes, whole days at both ends and hours as a number", () => {
    expect(buildAdminChatFilterInput({ status: "unread", handledBy: "mine", waiting: "24", lastFrom: "2026-09-01", lastTo: "2026-09-30" })).toEqual({
      unread: "unread",
      claim: "mine",
      waitingHours: 24,
      // The last day runs to its final moment, or a message sent at noon on it would fall outside its own range.
      lastMessageFrom: new Date("2026-09-01T00:00:00"),
      lastMessageTo: new Date("2026-09-30T23:59:59.999"),
    });
  });

  it("calls a conversation nobody has claimed \"unclaimed\", the word the server knows", () => {
    expect(buildAdminChatFilterInput({ ...DEFAULT_ADMIN_CHAT_FILTERS, handledBy: "nobody" })).toEqual({ claim: "unclaimed" });
    expect(buildAdminChatFilterInput({ ...DEFAULT_ADMIN_CHAT_FILTERS, handledBy: "others" })).toEqual({ claim: "others" });
  });

  it("counts each filter that is narrowing, one each", () => {
    expect(countAdminChatFilters({ ...DEFAULT_ADMIN_CHAT_FILTERS, status: "read", waiting: "6", lastTo: "2026-09-30" })).toBe(3);
  });
});

describe("adminChatFilterAlerts", () => {
  it("keeps Apply waiting only while the dates are the wrong way round", () => {
    expect(adminChatFilterAlerts({ ...DEFAULT_ADMIN_CHAT_FILTERS, lastFrom: "2026-09-10", lastTo: "2026-09-10" })).toEqual([]);
    expect(adminChatFilterAlerts({ ...DEFAULT_ADMIN_CHAT_FILTERS, lastTo: "2026-09-01" })).toEqual([]);
    expect(adminChatFilterAlerts({ ...DEFAULT_ADMIN_CHAT_FILTERS, lastFrom: "2026-09-10", lastTo: "2026-09-01" })).toEqual(["The 'from' date cannot be later than the 'to' date."]);
  });
});
