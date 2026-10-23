import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronUp,
  GraduationCap,
  IdCard,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { TutorProfileSectionId } from "@/pages/TutorProfileSectionDraft";
import type { TutorProfileReadoutSection } from "@/pages/TutorProfileSectionReadout";

export type TutorProfileBottomNavProps = {
  sections: TutorProfileReadoutSection[];
  activeTab: TutorProfileSectionId;
  onTabChange: (id: TutorProfileSectionId) => void;
  completionPercentage?: number;
  requiredLeft?: number;
  onBackToDashboard?: () => void;
};

export const SECTION_METADATA: Record<
  TutorProfileSectionId,
  {
    label: string;
    englishLabel: string;
    icon: typeof UserRound;
    description: string;
  }
> = {
  a: {
    label: "ব্যক্তিগত",
    englishLabel: "Personal",
    icon: UserRound,
    description: "নাম, ফোন, রক্ত, জরুরি যোগাযোগ ও স্থায়ী ঠিকানা",
  },
  c: {
    label: "শিক্ষা",
    englishLabel: "Education",
    icon: GraduationCap,
    description: "বিশ্ববিদ্যালয়, বিভাগ, ডিগ্রি, কলেজ ও স্কুল",
  },
  d: {
    label: "টিউশন",
    englishLabel: "Tuition",
    icon: BookOpenCheck,
    description: "পছন্দের এলাকা, বিষয়, ক্লাস ও পারিশ্রমিক",
  },
  f: {
    label: "ডকুমেন্ট",
    englishLabel: "Credential",
    icon: IdCard,
    description: "স্টুডেন্ট আইডি, এনআইডি ও শিক্ষাগত সনদ",
  },
  e: {
    label: "পরিচিতি",
    englishLabel: "Bio",
    icon: Sparkles,
    description: "নিজের সম্পর্কে বায়ো ও পড়ানোর পদ্ধতি",
  },
};

export const ORDERED_PROFILE_SECTION_IDS: TutorProfileSectionId[] = ["a", "c", "d", "f", "e"];

export function getSectionStatus(section?: TutorProfileReadoutSection) {
  if (!section) return { filled: 0, total: 0, complete: false, missing: 0 };
  const required = section.groups.flatMap(g => g.rows).filter(r => !r.optional);
  const filled = required.filter(r => !r.missing).length;
  const complete = required.length > 0 && filled === required.length;
  const missing = required.length - filled;
  return { filled, total: required.length, complete, missing };
}

function triggerHaptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(10);
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }
}

export function TutorProfileBottomNav({
  sections,
  activeTab,
  onTabChange,
  completionPercentage = 0,
  requiredLeft,
  onBackToDashboard,
}: TutorProfileBottomNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sectionsById = React.useMemo(() => {
    const map = new Map<TutorProfileSectionId, TutorProfileReadoutSection>();
    for (const sec of sections) {
      map.set(sec.id, sec);
    }
    return map;
  }, [sections]);

  const handleSelectTab = (id: TutorProfileSectionId) => {
    triggerHaptic();
    onTabChange(id);
    // Smooth scroll to top of workspace container
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenDrawer = () => {
    triggerHaptic();
    setDrawerOpen(true);
  };

  const isAllComplete = requiredLeft === 0;

  return (
    <>
      <nav
        aria-label="Tutor profile section navigation"
        className="fixed bottom-0 inset-x-0 z-30 flex flex-col border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden pb-[env(safe-area-inset-bottom)]"
      >
        {/* Top Progress Line Indicator */}
        <div className="relative h-[2.5px] w-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isAllComplete ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
          />
        </div>

        {/* Mini Utility & Overview Bar */}
        <div className="flex h-7 items-center justify-between px-3 border-b border-slate-100 bg-slate-50/80 text-[11px] font-medium text-slate-600">
          {onBackToDashboard ? (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 active:opacity-75 focus-visible:outline-none"
            >
              <ArrowLeft size={12} className="stroke-[2.5]" />
              <span>ড্যাশবোর্ড</span>
            </button>
          ) : (
            <span className="text-slate-400">প্রোফাইল এডিটর</span>
          )}

          <button
            type="button"
            onClick={handleOpenDrawer}
            className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:text-blue-800 active:opacity-75 focus-visible:outline-none"
          >
            <span>অগ্রগতি: {completionPercentage}%</span>
            <ChevronUp size={12} className="stroke-[2.5]" />
          </button>
        </div>

        {/* 5 Bottom Section Buttons */}
        <div className="grid grid-cols-5 items-stretch h-[56px] px-1">
          {ORDERED_PROFILE_SECTION_IDS.map(id => {
            const meta = SECTION_METADATA[id];
            const section = sectionsById.get(id);
            const status = getSectionStatus(section);
            const isActive = activeTab === id;
            const Icon = meta.icon;

            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${meta.englishLabel} section (${status.complete ? "Completed" : `${status.missing} required fields left`})`}
                onClick={() => handleSelectTab(id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 transition-all focus-visible:outline-none ${
                  isActive
                    ? "text-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-800 font-medium"
                }`}
              >
                {/* Active Indicator Top Pill */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-[1px] left-1/2 h-[2.5px] w-6 -translate-x-1/2 rounded-full bg-blue-600 shadow-xs"
                  />
                )}

                {/* Icon with Status Badge */}
                <div className="relative">
                  <Icon
                    size={20}
                    className={`transition-transform duration-150 ${
                      isActive ? "scale-110 stroke-[2.3]" : "stroke-[1.8]"
                    }`}
                  />
                  {status.complete ? (
                    <span
                      data-testid={`badge-complete-${id}`}
                      title="Completed"
                      className="absolute -top-1 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs"
                    >
                      <Check size={9} className="stroke-[3]" />
                    </span>
                  ) : status.missing > 0 ? (
                    <span
                      data-testid={`badge-incomplete-${id}`}
                      title={`${status.missing} fields left`}
                      className="absolute -top-1 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs text-[9px] font-bold"
                    >
                      !
                    </span>
                  ) : null}
                </div>

                {/* Bengali Section Label */}
                <span className="text-[11px] leading-tight tracking-tight">
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Profile Overview & Jump Drawer Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="bottom"
          aria-label="Profile sections drawer"
          className="max-h-[85dvh] w-full gap-0 rounded-t-3xl border-t border-slate-200 bg-white p-0 shadow-2xl sm:max-w-none md:hidden"
        >
          {/* Draggable Handle */}
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />

          <SheetHeader className="border-b border-slate-100 px-5 pb-3 pt-2 text-left">
            <SheetTitle className="text-base font-bold text-slate-800">
              📋 প্রোফাইল অগ্রগতি ও সেকশন তালিকা
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              আপনার প্রোফাইলের ৫টি সেকশনের অগ্রগতি দেখুন এবং যেকোনো সেকশনে দ্রুত প্রবেশ করুন।
            </SheetDescription>
          </SheetHeader>

          <div className="max-h-[70dvh] overflow-y-auto p-5 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {/* Progress Card */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600">সার্বিক অগ্রগতি</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {completionPercentage}%
                  </p>
                </div>
                <div className="text-right text-xs">
                  {isAllComplete ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                      <Check size={13} className="stroke-[2.5]" />
                      সব তথ্য সম্পূর্ণ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
                      <AlertCircle size={13} />
                      {requiredLeft ? `${requiredLeft}টি তথ্য বাকি` : "অসম্পূর্ণ তথ্য রয়েছে"}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAllComplete ? "bg-emerald-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* 5 Section Rows */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                সেকশন ভিত্তিক বিবরণ (ট্যাপ করে যান)
              </p>
              {ORDERED_PROFILE_SECTION_IDS.map(id => {
                const meta = SECTION_METADATA[id];
                const section = sectionsById.get(id);
                const status = getSectionStatus(section);
                const isActive = activeTab === id;
                const Icon = meta.icon;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      handleSelectTab(id);
                      setDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.99] ${
                      isActive
                        ? "border-blue-400 bg-blue-50/70 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : status.complete
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {meta.label}
                          </p>
                          <span className="text-xs text-slate-400">({meta.englishLabel})</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {status.complete ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-bold text-emerald-700">
                          <Check size={11} className="stroke-[3]" />
                          সম্পন্ন
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-semibold text-amber-700 border border-amber-200">
                          {status.missing}টি বাকি
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Back to dashboard button inside drawer */}
            {onBackToDashboard && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDrawerOpen(false);
                    onBackToDashboard();
                  }}
                  className="w-full rounded-xl py-2.5 text-xs font-semibold text-slate-700"
                >
                  <ArrowLeft size={14} className="mr-1.5" />
                  ড্যাশবোর্ডে ফিরে যান
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
