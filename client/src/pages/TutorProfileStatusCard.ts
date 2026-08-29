export type TutorProfileStatusCardAction = "complete" | "save" | "submit" | "return" | "none";

export type TutorProfileStatusCard = {
  title: string;
  description: string;
  action: TutorProfileStatusCardAction;
  actionLabel?: string;
  showProgress: boolean;
  tone: "attention" | "review" | "success";
};

type TutorProfileStatusCardInput = {
  profileStatus: string | null | undefined;
  completionPercentage: number;
  completed: boolean;
  missingCount: number;
  firstMissingLabel: string | null | undefined;
  isDraftDirty: boolean;
  hasSelectedTuitionReturn?: boolean;
};

export function getTutorProfileStatusCard(input: TutorProfileStatusCardInput): TutorProfileStatusCard {
  if (input.profileStatus === "approved") {
    if (input.hasSelectedTuitionReturn) {
      return {
        title: "Ready to apply",
        description: "Your profile is approved. Return to the selected tuition and click Apply Now yourself.",
        action: "return",
        actionLabel: "Return to selected tuition",
        showProgress: false,
        tone: "success",
      };
    }
    return {
      title: "Profile approved",
      description: "Your profile is approved and ready for Tutor opportunities.",
      action: "none",
      showProgress: false,
      tone: "success",
    };
  }

  if (input.profileStatus === "pending") {
    return {
      title: "Profile under review",
      description: input.hasSelectedTuitionReturn
        ? "Admin approval is required before you can return to the selected tuition and choose Apply Now yourself."
        : "An Admin is reviewing your profile. You will be notified if updates are required.",
      action: "none",
      showProgress: false,
      tone: "review",
    };
  }

  if (!input.completed) {
    const nextDetail = input.firstMissingLabel ? ` Start with ${input.firstMissingLabel}.` : "";
    return {
      title: "Complete your profile",
      description: `${input.missingCount} required ${input.missingCount === 1 ? "detail remains" : "details remain"}.${nextDetail}${input.hasSelectedTuitionReturn ? " Your selected tuition stays saved; no application will be sent automatically." : ""}`,
      action: "complete",
      actionLabel: "Complete profile",
      showProgress: true,
      tone: "attention",
    };
  }

  if (input.isDraftDirty) {
    return {
      title: input.profileStatus === "changes_requested" ? "Updates requested" : "Profile ready",
      description: input.profileStatus === "changes_requested"
        ? `Save your revised profile before submitting it for review.${input.hasSelectedTuitionReturn ? " Your selected tuition remains saved until approval." : ""}`
        : `Save your latest changes before submitting your profile for review.${input.hasSelectedTuitionReturn ? " Your selected tuition remains saved until approval." : ""}`,
      action: "save",
      actionLabel: "Save changes",
      showProgress: true,
      tone: "attention",
    };
  }

  if (input.profileStatus === "changes_requested") {
    return {
      title: "Updates requested",
      description: `Your revised profile is ready. Submit the updates for another Admin review.${input.hasSelectedTuitionReturn ? " Your selected tuition remains saved until approval." : ""}`,
      action: "submit",
      actionLabel: "Submit updates",
      showProgress: true,
      tone: "attention",
    };
  }

  return {
    title: "Ready for review",
    description: `Your required details are complete. Submit your profile for Admin review.${input.hasSelectedTuitionReturn ? " Your selected tuition remains saved until approval." : ""}`,
    action: "submit",
    actionLabel: "Submit for review",
    showProgress: true,
    tone: "review",
  };
}
