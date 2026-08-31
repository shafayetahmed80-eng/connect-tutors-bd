import { describe, expect, it } from "vitest";
import { tutorProfileResponsiveClasses } from "./TutorProfileResponsive";

describe("Tutor Profile mobile responsive layout contract", () => {
  it("stacks completion actions on portrait mobile widths and permits a two-column desktop layout", () => {
    expect(tutorProfileResponsiveClasses.completionActions).toContain("grid-cols-1");
    expect(tutorProfileResponsiveClasses.completionActions).toContain("sm:grid-cols-2");
    expect(tutorProfileResponsiveClasses.completionActionButton).toContain("min-h-11");
    expect(tutorProfileResponsiveClasses.completionActionButton).toContain("whitespace-normal");
  });

  it("keeps the completion card in normal document flow (the sticky section nav is the pinned element)", () => {
    expect(tutorProfileResponsiveClasses.completionCard.split(" ")).not.toContain("sticky");
    expect(tutorProfileResponsiveClasses.completionCard).not.toContain("lg:sticky");
  });

  it("bounds photo previews and keeps photo actions readable inside a narrow panel", () => {
    expect(tutorProfileResponsiveClasses.photoPanel).toContain("min-w-0");
    expect(tutorProfileResponsiveClasses.photoPreview).toContain("aspect-square");
    expect(tutorProfileResponsiveClasses.photoPreview).toContain("max-w-full");
    expect(tutorProfileResponsiveClasses.photoActionButton).toContain("min-h-11");
    expect(tutorProfileResponsiveClasses.photoActionButton).toContain("whitespace-normal");
  });

  it("keeps the crop editor within a portrait viewport and allows vertical access to its controls", () => {
    expect(tutorProfileResponsiveClasses.photoEditorPanel).toContain("max-h-[100dvh]");
    expect(tutorProfileResponsiveClasses.photoEditorPanel).toContain("overflow-y-auto");
    expect(tutorProfileResponsiveClasses.photoEditorCropStage).toContain("52dvh");
  });

  it("prevents Profile containers and selector text from expanding beyond narrow Android viewports", () => {
    expect(tutorProfileResponsiveClasses.workspace).toContain("min-w-0");
    expect(tutorProfileResponsiveClasses.workspace).toContain("overflow-x-clip");
    expect(tutorProfileResponsiveClasses.section).toContain("min-w-0");
    expect(tutorProfileResponsiveClasses.section).toContain("overflow-x-clip");
    expect(tutorProfileResponsiveClasses.selectorRoot).toContain("min-w-0");
    expect(tutorProfileResponsiveClasses.selectorText).toContain("min-w-0");
    expect(tutorProfileResponsiveClasses.selectorText).toContain("flex-1");
    expect(tutorProfileResponsiveClasses.selectorChip).toContain("max-w-full");
  });
});
