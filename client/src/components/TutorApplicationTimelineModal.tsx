import { useMemo } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  XCircle,
  BookOpen,
  MapPin,
  Banknote,
  GraduationCap,
} from "lucide-react";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { JobIdTag } from "@/components/JobIdTag";
import { PhoneContact } from "@/components/PhoneContact";
import PaymentStatusPill from "@/components/PaymentStatusPill";
import { cn } from "@/lib/utils";
import { formatSubjects, formatTuitionType } from "@shared/job-card";
import type { JobPaymentStatus } from "@shared/job-payment-status";
import {
  getTutorApplicationStage,
  stageShowsGuardianContact,
  type TutorApplicationStage,
} from "@shared/tutor-application-stages";

export type ApplicationTimelineData = {
  interestId: number;
  status: "interested" | "shortlisted" | "declined" | "matched" | "withdrawn";
  appointmentConfirmedAt: string | Date | null;
  createdAt: string | Date;
  publicJobId: string;
  tuitionType: string;
  category: string;
  classCourse: string;
  subjects: string;
  daysPerWeek: number;
  locationLabel: string | null;
  budgetAmount: number | null;
  shortlistedAt: string | Date | null;
  appointedAt: string | Date | null;
  endedAt: string | Date | null;
  tuitionCancelledAt: string | Date | null;
  paymentStatus: JobPaymentStatus;
  paymentCompletedAt?: string | Date | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
};

export type TutorApplicationTimelineModalProps = {
  application: ApplicationTimelineData | null;
  onClose: () => void;
};

function formatTimelineDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function formatSalary(amount: number | null) {
  return amount ? `${amount.toLocaleString("en-US")} BDT` : "Not set";
}

type StepStatus = "completed" | "current" | "upcoming" | "cancelled";

type TimelineStep = {
  key: string;
  title: string;
  titleBn: string;
  description: string;
  timestamp: string | Date | null;
  status: StepStatus;
};

const STAGE_CONFIG: Record<
  TutorApplicationStage,
  {
    badgeLabel: string;
    badgeClass: string;
    guidanceTitle: string;
    guidanceText: string;
    guidanceIcon: typeof Sparkles;
    guidanceBoxClass: string;
  }
> = {
  applied: {
    badgeLabel: "Applied",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    guidanceTitle: "Application Submitted",
    guidanceText:
      "আপনার আবেদনটি সফলভাবে গৃহীত হয়েছে। আমাদের টিম এবং অভিভাবক আবেদনকারীদের প্রোফাইল ও যোগ্যতা যাচাই করছেন। শর্টলিস্টে এলে আপনাকে নোটিফিকেশন পাঠানো হবে।",
    guidanceIcon: Clock,
    guidanceBoxClass: "bg-sky-50/70 border-sky-200 text-sky-900",
  },
  shortlisted: {
    badgeLabel: "Shortlisted",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    guidanceTitle: "You're Shortlisted!",
    guidanceText:
      "অভিনন্দন! আপনি প্রাথমিক শর্টলিস্টে নির্বাচিত হয়েছেন। অভিভাবকের সাথে সমন্বয় করে চূড়ান্ত টিউটর নির্বাচন করা হচ্ছে। নির্বাচিত হলে আপনি সরাসরি ডেমো ক্লাসের সুযোগ পাবেন।",
    guidanceIcon: Sparkles,
    guidanceBoxClass: "bg-amber-50/70 border-amber-200 text-amber-900",
  },
  appointed: {
    badgeLabel: "Appointed for Demo",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    guidanceTitle: "Appointed for Tuition!",
    guidanceText:
      "অভিনন্দন! আপনি এই টিউশনের জন্য অ্যাপয়েন্টেড হয়েছেন। নিচে দেয়া অভিভাবকের নম্বরে দ্রুত কল বা হোয়াটসঅ্যাপে যোগাযোগ করে ডেমো ক্লাসের সময় নির্ধারণ করুন।",
    guidanceIcon: Sparkles,
    guidanceBoxClass: "bg-purple-50/70 border-purple-200 text-purple-900",
  },
  confirmed: {
    badgeLabel: "Appointment Confirmed",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    guidanceTitle: "Appointment Confirmed!",
    guidanceText:
      "আপনার ডেমো ক্লাস সফল হয়েছে এবং অভিভাবক আপনার নিয়োগ চূড়ান্ত করেছেন। নিয়মিত ক্লাস পরিচালনা করুন এবং প্ল্যাটফর্ম পলিসি অনুযায়ী পেমেন্ট স্ট্যাটাস ক্লিয়ার রাখুন।",
    guidanceIcon: CheckCircle2,
    guidanceBoxClass: "bg-emerald-50/70 border-emerald-200 text-emerald-900",
  },
  closed: {
    badgeLabel: "Tuition Closed",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    guidanceTitle: "Tuition Completed & Closed",
    guidanceText:
      "এই টিউশনের যাবতীয় ক্লাস ও পেমেন্ট সম্পূর্ণ পরিশোধিত এবং সফলভাবে ক্লোজ হয়েছে। সফলভাবে দায়িত্ব পালনের জন্য আপনাকে ধন্যবাদ!",
    guidanceIcon: CheckCircle2,
    guidanceBoxClass: "bg-slate-50 border-slate-200 text-slate-800",
  },
  cancelled: {
    badgeLabel: "Cancelled / Closed",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    guidanceTitle: "Tuition Cancelled or Withdrawn",
    guidanceText:
      "এই আবেদন বা টিউশন রিকোয়েস্টটি অভিভাবক বা প্ল্যাটফর্ম কর্তৃক বাতিল করা হয়েছে। নতুন টিউশন পেতে অনুগ্রহ করে নিয়মিত জব বোর্ড পর্যবেক্ষণ করুন।",
    guidanceIcon: AlertCircle,
    guidanceBoxClass: "bg-rose-50/70 border-rose-200 text-rose-900",
  },
};

export function TutorApplicationTimelineModal({
  application,
  onClose,
}: TutorApplicationTimelineModalProps) {
  if (!application) return null;

  const currentStage = getTutorApplicationStage(application);
  const stageConfig = STAGE_CONFIG[currentStage] ?? STAGE_CONFIG.applied;
  const GuidanceIcon = stageConfig.guidanceIcon;

  const timelineSteps: TimelineStep[] = useMemo(() => {
    if (currentStage === "cancelled") {
      // Build trajectory leading up to cancellation
      const steps: TimelineStep[] = [
        {
          key: "applied",
          title: "Application Submitted",
          titleBn: "আবেদন জমা দেওয়া হয়েছে",
          description: "Applied via Connect Tutors platform.",
          timestamp: application.createdAt,
          status: "completed",
        },
      ];

      if (application.shortlistedAt) {
        steps.push({
          key: "shortlisted",
          title: "Shortlisted",
          titleBn: "শর্টলিস্ট করা হয়েছিল",
          description: "Was shortlisted for consideration.",
          timestamp: application.shortlistedAt,
          status: "completed",
        });
      }

      if (application.appointedAt) {
        steps.push({
          key: "appointed",
          title: "Appointed",
          titleBn: "নিয়োগ দেওয়া হয়েছিল",
          description: "Was appointed for trial / demo class.",
          timestamp: application.appointedAt,
          status: "completed",
        });
      }

      steps.push({
        key: "cancelled",
        title: "Cancelled / Ended",
        titleBn: "বাতিল বা সমাপ্ত",
        description: "Application or tuition was withdrawn or cancelled.",
        timestamp: application.endedAt ?? application.tuitionCancelledAt ?? null,
        status: "cancelled",
      });

      return steps;
    }

    // Standard progressive lifecycle: Applied -> Shortlisted -> Appointed -> Confirmed -> Closed
    const isAppliedPast = true;
    const isShortlistedPast = Boolean(application.shortlistedAt) || ["shortlisted", "appointed", "confirmed", "closed"].includes(currentStage);
    const isAppointedPast = Boolean(application.appointedAt) || ["appointed", "confirmed", "closed"].includes(currentStage);
    const isConfirmedPast = Boolean(application.appointmentConfirmedAt) || ["confirmed", "closed"].includes(currentStage);
    const isClosedPast = currentStage === "closed";

    const getStepStatus = (stepStage: TutorApplicationStage, isReached: boolean): StepStatus => {
      if (currentStage === stepStage) return "current";
      if (isReached) return "completed";
      return "upcoming";
    };

    return [
      {
        key: "applied",
        title: "Application Submitted",
        titleBn: "আবেদন জমা হয়েছে",
        description: "Your application was registered in Connect Tutors system.",
        timestamp: application.createdAt,
        status: getStepStatus("applied", isAppliedPast),
      },
      {
        key: "shortlisted",
        title: "Shortlisted",
        titleBn: "প্রাথমিক বাছাই (Shortlisted)",
        description: "Profile reviewed and shortlisted by academic coordinator.",
        timestamp: application.shortlistedAt,
        status: getStepStatus("shortlisted", isShortlistedPast),
      },
      {
        key: "appointed",
        title: "Appointed for Demo",
        titleBn: "ডেমোর জন্য অ্যাপয়েন্ট",
        description: "Assigned as the selected tutor for demo class trial.",
        timestamp: application.appointedAt,
        status: getStepStatus("appointed", isAppointedPast),
      },
      {
        key: "confirmed",
        title: "Appointment Confirmed",
        titleBn: "চূড়ান্ত নিয়োগ নিশ্চিত",
        description: "Guardian and admin confirmed ongoing regular tuition.",
        timestamp: application.appointmentConfirmedAt,
        status: getStepStatus("confirmed", isConfirmedPast),
      },
      {
        key: "closed",
        title: "Tuition Closed & Settled",
        titleBn: "টিউশন সমাপ্ত ও পরিশোধিত",
        description: "Tuition term completed and payment successfully cleared.",
        timestamp: application.paymentCompletedAt ?? null,
        status: getStepStatus("closed", isClosedPast),
      },
    ];
  }, [application, currentStage]);

  const hasGuardianContact = stageShowsGuardianContact(currentStage) && Boolean(application.guardianPhone || application.guardianName);

  return (
    <Modal size="panel" fit onClose={onClose} panelTestId="tutor-application-timeline-modal">
      <ModalHeader
        eyebrow="Application Status & Timeline"
        title={
          <span className="flex items-center gap-2">
            <span>Timeline for Job</span>
            <JobIdTag bare jobId={application.publicJobId} className="text-sm font-black" />
          </span>
        }
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-bold", stageConfig.badgeClass)}>
              {stageConfig.badgeLabel}
            </span>
            <span>·</span>
            <span>{application.classCourse}</span>
            <span>·</span>
            <span>{application.category}</span>
          </span>
        }
      />

      <ModalBody className="space-y-5 py-5">
        {/* Contextual Guidance Callout */}
        <section
          aria-label="Stage Guidance"
          className={cn("flex items-start gap-3 rounded-xl border p-4 shadow-xs transition-all", stageConfig.guidanceBoxClass)}
        >
          <div className="mt-0.5 shrink-0 rounded-xl bg-white/70 p-2 shadow-2xs backdrop-blur-xs">
            <GuidanceIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-sm font-bold tracking-tight">
              {stageConfig.guidanceTitle}
            </h3>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {stageConfig.guidanceText}
            </p>
          </div>
        </section>

        {/* Guardian Contact (if appointed or confirmed) */}
        {hasGuardianContact && (
          <section
            aria-label="Guardian Contact"
            className="rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/50 via-white to-blue-50/40 p-4 shadow-xs"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-2xs font-extrabold uppercase tracking-wider text-sky-700">
                  Guardian Contact Information
                </span>
                <h4 className="mt-0.5 font-heading text-base font-extrabold text-[#1680c2]">
                  {application.guardianName || "Guardian"}
                </h4>
                <p className="mt-0.5 text-2xs text-j-ink-muted">
                  ডেমো ক্লাস বা সময়সূচী চূড়ান্ত করতে সরাসরি যোগাযোগ করুন
                </p>
              </div>

              {application.guardianPhone ? (
                <div className="mt-1 sm:mt-0">
                  <PhoneContact phone={application.guardianPhone} size="card" />
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* Interactive Vertical Timeline Stepper */}
        <section aria-label="Progress Stepper" className="rounded-xl border border-j-border bg-white p-4 sm:p-5 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-j-ink-muted">
            Application Progress Tracker
          </h4>

          <ol className="relative mt-5 space-y-6 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:-translate-x-1/2 before:bg-slate-200 sm:before:left-5">
            {timelineSteps.map((step, index) => {
              const isCompleted = step.status === "completed";
              const isCurrent = step.status === "current";
              const isCancelled = step.status === "cancelled";
              const isUpcoming = step.status === "upcoming";

              return (
                <li key={step.key} className="relative flex items-start gap-3.5 sm:gap-4 group">
                  {/* Step Node Icon */}
                  <div
                    className={cn(
                      "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all sm:size-10",
                      isCompleted && "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-50",
                      isCurrent && "bg-sky-600 text-white shadow-md ring-4 ring-sky-100 animate-pulse",
                      isCancelled && "bg-rose-600 text-white shadow-sm ring-4 ring-rose-50",
                      isUpcoming && "bg-slate-100 text-slate-400 border border-slate-200"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4 sm:size-5" />
                    ) : isCancelled ? (
                      <XCircle className="size-4 sm:size-5" />
                    ) : isCurrent ? (
                      <span className="size-2.5 rounded-full bg-white" />
                    ) : (
                      <span className="tabular-nums text-xs">{index + 1}</span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="min-w-0 flex-1 pt-0.5 sm:pt-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-heading text-sm font-bold tracking-tight",
                            isCurrent && "text-sky-700 font-extrabold",
                            isCompleted && "text-slate-800",
                            isCancelled && "text-rose-700",
                            isUpcoming && "text-slate-400"
                          )}
                        >
                          {step.title}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-3xs font-black uppercase tracking-wide text-sky-800">
                            Active Stage
                          </span>
                        )}
                      </div>

                      {step.timestamp ? (
                        <span className="flex items-center gap-1 text-2xs tabular-nums text-j-ink-muted">
                          <Calendar className="size-3 text-slate-400" />
                          {formatTimelineDate(step.timestamp)}
                        </span>
                      ) : isUpcoming ? (
                        <span className="text-3xs italic text-slate-400">
                          Pending / Next step
                        </span>
                      ) : null}
                    </div>

                    <p
                      className={cn(
                        "mt-1 text-xs leading-relaxed",
                        isUpcoming ? "text-slate-400 italic" : "text-j-ink-soft"
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Tuition Overview Card */}
        <section
          aria-label="Tuition Overview"
          className="rounded-xl border border-j-border bg-slate-50/60 p-4"
        >
          <h4 className="text-2xs font-bold uppercase tracking-wider text-j-ink-muted">
            Job Details Summary
          </h4>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <BookOpen className="size-4 shrink-0 text-slate-400 mt-0.5" />
              <div>
                <span className="text-3xs font-semibold uppercase text-j-ink-muted">Subjects</span>
                <p className="font-semibold text-slate-800">{formatSubjects(application.subjects)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <GraduationCap className="size-4 shrink-0 text-slate-400 mt-0.5" />
              <div>
                <span className="text-3xs font-semibold uppercase text-j-ink-muted">Class & Type</span>
                <p className="font-semibold text-slate-800">
                  {application.classCourse} ({formatTuitionType(application.tuitionType)})
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="size-4 shrink-0 text-slate-400 mt-0.5" />
              <div>
                <span className="text-3xs font-semibold uppercase text-j-ink-muted">Location</span>
                <p className="font-semibold text-slate-800">{application.locationLabel || "Not specified"}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Banknote className="size-4 shrink-0 text-slate-400 mt-0.5" />
              <div>
                <span className="text-3xs font-semibold uppercase text-j-ink-muted">Salary & Days</span>
                <p className="font-semibold text-slate-800">
                  {formatSalary(application.budgetAmount)} · {application.daysPerWeek} days/wk
                </p>
              </div>
            </div>

            {application.paymentStatus && (
              <div className="col-span-2 sm:col-span-1">
                <span className="text-3xs font-semibold uppercase text-j-ink-muted block mb-1">
                  Payment Status
                </span>
                <PaymentStatusPill status={application.paymentStatus} />
              </div>
            )}
          </div>
        </section>
      </ModalBody>
    </Modal>
  );
}
