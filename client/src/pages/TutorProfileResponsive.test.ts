import { describe, expect, it } from "vitest";
import { tutorProfileResponsiveClasses } from "./TutorProfileResponsive";

describe("Tutor Profile mobile responsive layout contract", () => {
  it("stacks completion actions on portrait mobile widths and permits a two-column desktop layout", () => {
    expect(tutorProfileResponsiveClasses.completionActions).toContain("grid-cols-1");
    expect(tutorProfileResponsiveClasses.completionActions).toContain("sm:grid-cols-2");
    expect(tutorProfileResponsiveClasses.completionActionButton).toContain("min-h-11");
    expect(tutorProfileResponsiveClasses.completionActionButton).toContain("whitespace-normal");
  });

  it("stacks the identity rail above the workspace on narrow screens and pins it only from lg up", () => {
    expect(tutorProfileResponsiveClasses.workspaceShell).toContain("lg:grid-cols-[300px_minmax(0,1fr)]");
    expect(tutorProfileResponsiveClasses.workspaceShell).toContain("min-w-0");
    expect(tutorProfileResponsiveClasses.identityRail.split(" ")).not.toContain("sticky");
    expect(tutorProfileResponsiveClasses.identityRail).toContain("lg:sticky");
    expect(tutorProfileResponsiveClasses.identityRail).toContain("lg:top-16");
  });

  it("bounds the photo preview inside the narrow identity rail", () => {
    expect(tutorProfileResponsiveClasses.photoPreview).toContain("aspect-square");
    expect(tutorProfileResponsiveClasses.photoPreview).toContain("max-w-full");
  });

  it("keeps the crop editor's stage bounded within a portrait viewport", () => {
    expect(tutorProfileResponsiveClasses.photoEditorCropStage).toContain("52dvh");
    expect(tutorProfileResponsiveClasses.photoEditorCropStage).toContain("max-h-[360px]");
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
