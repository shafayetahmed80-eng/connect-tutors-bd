/** Shared responsive classes for the Tutor Profile controls that must remain usable on portrait mobile screens. */
export const tutorProfileResponsiveClasses = {
  workspace: "w-full min-w-0 overflow-x-clip space-y-4",
  section: "min-w-0 overflow-x-clip",
  fieldRoot: "min-w-0",
  selectorRoot: "relative min-w-0 w-full",
  selectorTrigger: "min-w-0 w-full",
  selectorText: "min-w-0 flex-1 truncate",
  selectorChip: "max-w-full min-w-0",
  selectorChipText: "min-w-0 break-words",
  completionCard: "rounded-2xl border border-j-border bg-white/95 p-4 shadow-[0_1px_2px_rgba(23,59,96,0.04),0_10px_28px_rgba(23,59,96,0.06)] backdrop-blur lg:sticky lg:top-3 lg:z-20",
  completionActions: "mt-3 grid grid-cols-1 gap-2 sm:mt-0 sm:grid-cols-2",
  completionActionButton: "min-h-11 w-full whitespace-normal text-center leading-5",
  photoPanel: "min-w-0 w-full",
  photoPreview: "mx-auto flex aspect-square w-28 max-w-full items-center justify-center overflow-hidden rounded-full bg-[#dcefff] text-[#167ddd] ring-4 ring-white shadow-sm sm:w-32",
  photoActionButton: "min-h-11 w-full whitespace-normal text-center leading-5",
  photoEditorPanel: "max-h-[100dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl",
  photoEditorCropStage: "relative h-[52dvh] min-h-[240px] max-h-[360px] bg-[#102840] sm:h-[min(62vh,390px)]",
} as const;
