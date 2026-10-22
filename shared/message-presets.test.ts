import { describe, expect, it } from "vitest";
import {
  DEFAULT_MESSAGE_PRESETS,
  findPresetByCommand,
  getPresetsByCategory,
} from "./message-presets";

describe("message presets", () => {
  it("provides built-in presets for tutor_chat, tutor_notify, and guardian_notify", () => {
    const chatPresets = getPresetsByCategory("tutor_chat");
    const tutorNotifyPresets = getPresetsByCategory("tutor_notify");
    const guardianNotifyPresets = getPresetsByCategory("guardian_notify");

    expect(chatPresets.length).toBeGreaterThanOrEqual(5);
    expect(tutorNotifyPresets.length).toBeGreaterThanOrEqual(4);
    expect(guardianNotifyPresets.length).toBeGreaterThanOrEqual(3);
  });

  it("finds preset by slash command case-insensitively with or without leading slash", () => {
    const feePreset = findPresetByCommand("/fee");
    expect(feePreset).toBeDefined();
    expect(feePreset?.title).toContain("ফি");

    const verifyPreset = findPresetByCommand("verify");
    expect(verifyPreset).toBeDefined();
    expect(verifyPreset?.command).toBe("/verify");

    expect(findPresetByCommand("/unknown-cmd")).toBeUndefined();
  });

  it("ensures all presets have non-empty titles, commands, and bodies", () => {
    for (const preset of DEFAULT_MESSAGE_PRESETS) {
      expect(preset.command.startsWith("/")).toBe(true);
      expect(preset.title.trim().length).toBeGreaterThan(0);
      expect(preset.body.trim().length).toBeGreaterThan(0);
    }
  });
});
