/**
 * The "How it works" guides inside the Guardian and Tutor panels.
 *
 * Each guide is a short run of steps that play one after another as a small
 * animated scene. The words are editable by the Owner (Dynamic Section > How it
 * works); the scene a step plays is fixed in code, because a scene is a drawing,
 * not copy. The list of steps is fixed too - an Owner rewords a step, they do not
 * add or remove one.
 */

export const howItWorksPanels = ["guardian", "tutor"] as const;
export type HowItWorksPanel = (typeof howItWorksPanels)[number];

/** Which drawing a step plays. One per step, named for what it shows. */
export const howItWorksSceneIds = [
  "guardian-request",
  "guardian-review",
  "guardian-board",
  "guardian-applicants",
  "guardian-appoint",
  "guardian-confirmed",
  "tutor-profile",
  "tutor-moderation",
  "tutor-jobs",
  "tutor-apply",
  "tutor-appointed",
  "tutor-confirmed",
] as const;
export type HowItWorksSceneId = (typeof howItWorksSceneIds)[number];

export type HowItWorksStep = { id: string; scene: HowItWorksSceneId; title: string; copy: string };

export type HowItWorksGuide = {
  /** Name of the surface in the Owner's editor, and the page the change lands on. */
  surface: string;
  path: string;
  heading: string;
  intro: string;
  steps: readonly HowItWorksStep[];
};

/** How long each step stays on screen before the next one starts. */
export const HOW_IT_WORKS_STEP_MS = 5200;

export const howItWorksGuides: Record<HowItWorksPanel, HowItWorksGuide> = {
  guardian: {
    surface: "Guardian panel",
    path: "/guardian/dashboard/how-it-works",
    heading: "How it works",
    intro: "From your request to a confirmed Tutor, one clear step at a time.",
    steps: [
      { id: "request", scene: "guardian-request", title: "Post your tuition request", copy: "Open Hire a tutor and share the subject, class, schedule, budget and area. You can review everything before you send it." },
      { id: "review", scene: "guardian-review", title: "Our team checks it", copy: "A coordinator reviews your request and may call you to confirm the details before anything goes live." },
      { id: "board", scene: "guardian-board", title: "It goes on the Job Board", copy: "Once confirmed, your tuition appears as a privacy-safe job. Your phone, email, address and student details are never shown." },
      { id: "applicants", scene: "guardian-applicants", title: "Tutors apply, we shortlist", copy: "Interested Tutors apply. Our team shortlists the best matches and you see them in Applied Tutors." },
      { id: "appoint", scene: "guardian-appoint", title: "Choose your Tutor", copy: "Pick the Tutor you like and ask us to appoint them. Our team approves it and informs the Tutor." },
      { id: "confirmed", scene: "guardian-confirmed", title: "Confirm and start", copy: "Confirm the tuition and your Confirmation Letter is issued. Classes begin as you agreed." },
    ],
  },
  tutor: {
    surface: "Tutor panel",
    path: "/tutor/dashboard/how-it-works",
    heading: "How it works",
    intro: "From your profile to your first tuition, one clear step at a time.",
    steps: [
      { id: "profile", scene: "tutor-profile", title: "Complete your profile", copy: "Fill every section of your profile, including your education, tuition preferences and documents, then submit it." },
      { id: "moderation", scene: "tutor-moderation", title: "We review it", copy: "Our team checks your profile and approves it, or tells you exactly what to fix. You are notified either way." },
      { id: "jobs", scene: "tutor-jobs", title: "Find tuition jobs", copy: "Approved Tutors can browse the Job Board and narrow it down by class, subject, area and salary." },
      { id: "apply", scene: "tutor-apply", title: "Apply to a job", copy: "Apply to the tuitions that suit you. Our team shortlists the best matches and keeps you updated." },
      { id: "appointed", scene: "tutor-appointed", title: "Get appointed", copy: "When a Guardian picks you, our team confirms the appointment and you are notified. Use Chat with Admin for any question." },
      { id: "confirmed", scene: "tutor-confirmed", title: "Confirm and pay the charge", copy: "Your Confirmation Letter is issued. Pay the platform charge from the Payment tab, in instalments, as set for your tuition type." },
    ],
  },
};

export function howItWorksSlotId(panel: HowItWorksPanel, part: "heading" | "intro"): string;
export function howItWorksSlotId(panel: HowItWorksPanel, part: "title" | "copy", stepId: string): string;
export function howItWorksSlotId(panel: HowItWorksPanel, part: string, stepId?: string) {
  return stepId ? `how-it-works.${panel}.${stepId}.${part}` : `how-it-works.${panel}.${part}`;
}
