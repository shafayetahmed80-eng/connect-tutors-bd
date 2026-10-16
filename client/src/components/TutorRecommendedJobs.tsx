import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatSalaryAmount } from "@shared/salary-amount";
import { formatLocation, formatPostedDate, formatSubjects, formatTuitionType } from "@shared/job-card";
import JobDetailsModal, { type JobDetailsData } from "@/components/JobDetailsModal";
import { JobIdTag } from "@/components/JobIdTag";
import { RecordIcon } from "@/components/recordIcons";
import { Bookmark, BookOpen, CalendarDays, Check, ChevronRight, Compass, House, MapPin, Send, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SAVED_JOBS_KEY = "ctb_saved_jobs";

function getSavedJobIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SAVED_JOBS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveJobIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage quota errors
  }
}

function Fact({ icon, label, value, wide }: { icon: React.ReactNode; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <p className="job-card-text flex items-center gap-1 text-j-ink-muted">
        <span className="shrink-0 text-[#1677e8]">{icon}</span>
        {label}
      </p>
      <p className="job-card-text mt-0.5 break-words leading-[1.45] text-[#173d60]">
        {value}
      </p>
    </div>
  );
}

export function TutorRecommendedJobs({ limit = 20 }: { limit?: number }) {
  const [, navigate] = useLocation();
  const recommendedQuery = trpc.tutor.recommendedJobs.useQuery({ limit });
  const [selectedJob, setSelectedJob] = useState<(JobDetailsData & { rawId: number; applied?: boolean }) | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);

  const expressInterestMutation = trpc.jobBoard.expressInterest.useMutation({
    onSuccess: () => {
      toast.success("আবেদন সফল হয়েছে! (Application submitted)");
      void recommendedQuery.refetch();
      setSelectedJob(null);
    },
    onError: error => {
      toast.error(error.message || "আবেদন করতে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।");
    },
    onSettled: () => {
      setApplyingJobId(null);
    },
  });

  useEffect(() => {
    setSavedJobs(getSavedJobIds());
  }, []);

  const toggleBookmark = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    const next = new Set(savedJobs);
    if (next.has(jobId)) {
      next.delete(jobId);
      toast.info("বুকমার্ক থেকে মুছে ফেলা হয়েছে");
    } else {
      next.add(jobId);
      toast.success("টিউশন বুকমার্কে সংরক্ষিত হয়েছে");
    }
    setSavedJobs(next);
    saveJobIds(next);
  };

  const data = recommendedQuery.data;
  const isLoading = recommendedQuery.isLoading;

  if (isLoading) {
    return (
      <section aria-label="Loading advance matching jobs" className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-64 animate-pulse rounded-lg bg-j-surface-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-j-surface-muted" />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-j-border bg-white p-5 shadow-xs" />
          ))}
        </div>
      </section>
    );
  }

  const items = data?.items ?? [];
  const totalCount = data?.totalMatchingCount ?? 0;
  const isApproved = data?.tutorSummary?.profileApproved ?? false;

  const openJobDetails = (item: (typeof items)[number]) => {
    const job = item.job;
    const modalData: JobDetailsData = {
      jobId: job.publicJobId,
      title: `${job.classCourse || "Tuition Requirement"} · ${job.category || ""}`,
      postedAt: job.publishedAt ? formatPostedDate(job.publishedAt) : "Recently",
      statusLabel: "Live",
      statusTone: "live",
      tuitionType: job.tuitionType,
      budgetAmount: job.budgetAmount,
      subjects: job.subjects,
      locationLabel: job.locationLabel,
      preferredTutorGender: job.preferredTutorGender || "any",
      studentGender: job.studentGender,
      daysPerWeek: job.daysPerWeek,
      tutoringTime: job.tutoringTime,
      studentCount: job.studentCount,
      notes: job.notes,
    };
    setSelectedJob({ ...modalData, rawId: job.id, applied: item.applied });
  };

  const handleApply = (rawId: number) => {
    if (!isApproved) {
      navigate("/tutor/dashboard/profile");
      return;
    }
    setApplyingJobId(rawId);
    expressInterestMutation.mutate({ tutorJobId: rawId });
  };

  return (
    <section aria-labelledby="advance-matching-heading" className="space-y-6">
      {/* Header bar */}
      <div className="rounded-xl border border-j-border bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-j-accent">
                  Recommended For You
                </p>
                {totalCount > 0 ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                    {totalCount} Matching
                  </span>
                ) : null}
              </div>
              <h1 id="advance-matching-heading" className="mt-1 text-xl font-bold tracking-tight text-j-ink sm:text-2xl">
                Advance Matching Jobs
              </h1>
              <p className="mt-1 text-xs text-j-ink-muted sm:text-sm">
                আপনার পছন্দের বিষয়, লোকেশন এবং পড়ানোর বিষয়ের সাথে ১০০-পয়েন্ট স্কেলে সর্বোচ্চ মেলানো টিউশনসমূহ
              </p>
            </div>
          </div>

          <Link
            href="/tutor/dashboard/jobs"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-j-accent transition-colors hover:text-j-accent-hover hover:underline"
          >
            Browse All on Job Board <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <article className="flex flex-col items-center justify-center rounded-xl border border-dashed border-j-border bg-white p-10 text-center shadow-xs">
          <div className="grid size-14 place-items-center rounded-full bg-sky-50 text-j-accent">
            <Compass size={28} aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-base font-bold text-j-ink">এই মুহূর্তে হুবহু ম্যাচিং নতুন টিউশন নেই</h3>
          <p className="mt-2 max-w-md text-xs leading-6 text-j-ink-muted sm:text-sm">
            আপনার প্রোফাইলে আরও কিছু এলাকা (Teaching Areas) ও বিষয় (Subjects) যুক্ত করলে ম্যাচিং টিউশন পাওয়ার সম্ভাবনা বহুগুণ বৃদ্ধি পাবে।
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/tutor/dashboard/profile">
              <Button size="sm" variant="outline" className="rounded-xl border-j-border font-bold text-j-ink">
                Update Teaching Preferences
              </Button>
            </Link>
            <Link href="/tutor/dashboard/jobs">
              <Button size="sm" className="rounded-xl bg-j-accent font-bold text-white hover:bg-j-accent-hover">
                Browse All Live Jobs
              </Button>
            </Link>
          </div>
        </article>
      ) : (
        /* Matching Job Cards Grid - Styled exactly like JobBoard's JobCard */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map(item => {
            const job = item.job;
            const isBookmarked = savedJobs.has(job.publicJobId);

            let badgeStyle = "bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/20";
            if (item.matchGrade === "perfect") {
              badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20";
            } else if (item.matchGrade === "high") {
              badgeStyle = "bg-teal-50 text-teal-700 border-teal-200 ring-teal-500/20";
            }

            return (
              <article
                key={job.id}
                role="button"
                tabIndex={0}
                onClick={() => openJobDetails(item)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openJobDetails(item);
                  }
                }}
                aria-label={`${job.classCourse || "Tuition"}, Job ID ${job.publicJobId}, ${item.matchScore}% match`}
                className="job-card relative flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-j-border bg-white px-4 pb-3.5 pt-4 shadow-[0_1px_2px_rgba(16,49,77,.05),0_12px_36px_-10px_rgba(16,49,77,.14)] ring-1 ring-[rgba(16,49,77,.035)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:-translate-y-[2px] hover:border-[#a9cdf0] hover:shadow-[0_20px_48px_-12px_rgba(16,49,77,.20)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677e8] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {/* Top subtle blue accent gradient */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,var(--j-accent),transparent)]"
                />

                <div>
                  {/* Card Title & Match Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="job-card-title font-semibold leading-[1.35] tracking-[-.005em] text-[#173d60]">
                      {job.classCourse || "Tuition Requirement"}
                      {job.category ? <span className="font-normal text-j-ink-muted"> · {job.category}</span> : null}
                    </h3>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-extrabold ring-1 ${badgeStyle}`}>
                        <Sparkles size={11} aria-hidden="true" /> {item.matchScore}% Match
                      </span>

                      <button
                        type="button"
                        onClick={e => toggleBookmark(e, job.publicJobId)}
                        aria-label={isBookmarked ? "Remove from bookmarks" : "Save job to bookmarks"}
                        title={isBookmarked ? "Saved" : "Save job"}
                        className={`grid size-7 place-items-center rounded-lg border transition-colors ${
                          isBookmarked
                            ? "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
                            : "border-j-border text-j-ink-muted hover:border-j-ink-muted hover:text-j-ink"
                        }`}
                      >
                        <Bookmark size={13} fill={isBookmarked ? "currentColor" : "none"} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Job ID Tag and Meta */}
                  <div className="job-card-text mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums text-j-ink-muted">
                    <JobIdTag jobId={job.publicJobId} />
                    <span aria-hidden className="text-[#dce9f1]">|</span>
                    <span className="inline-flex items-center gap-1">
                      <RecordIcon name="posted" size={12} className="text-[#8fb4d0]" />
                      Posted : {job.publishedAt ? formatPostedDate(job.publishedAt) : "Recent"}
                    </span>
                    <span aria-hidden className="text-[#dce9f1]">|</span>
                    <span className="font-bold text-[#0f7048]">Live</span>
                  </div>

                  {/* Fact Grid: Tuition Type, Salary, Subjects, Location */}
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
                    <Fact icon={<House size={13} />} label="Tuition Type" value={formatTuitionType(job.tuitionType)} />
                    <Fact icon={<Wallet size={13} />} label="Salary" value={formatSalaryAmount(job.budgetAmount)} />
                    <Fact icon={<BookOpen size={13} />} label="Subjects" value={formatSubjects(job.subjects)} />
                    <Fact
                      icon={<MapPin size={13} />}
                      label="Location"
                      value={formatLocation({ tuitionType: job.tuitionType, locationLabel: job.locationLabel })}
                      wide
                    />
                  </div>

                  {/* Match Reason Chips */}
                  {item.matchReasons.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-j-border pt-2.5">
                      {item.matchReasons.map((reason, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-j-surface-muted px-2 py-0.5 text-2xs font-semibold text-j-ink-muted"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Footer Action matching JobBoard */}
                <div className="mt-4 flex items-center justify-between border-t border-j-border pt-3">
                  <div className="text-2xs text-j-ink-muted">
                    {job.daysPerWeek ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} className="text-[#8fb4d0]" aria-hidden="true" />
                        {job.daysPerWeek} দিন/সপ্তাহ
                      </span>
                    ) : null}
                  </div>

                  <div>
                    {item.applied ? (
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#e7f5ee] px-3.5 text-xs font-bold text-[#0f7048]">
                        <Check size={13} aria-hidden="true" /> Applied
                      </span>
                    ) : !isApproved ? (
                      <Link href="/tutor/dashboard/profile" onClick={e => e.stopPropagation()} className="inline-block">
                        <span className="inline-flex h-control items-center rounded-lg border border-amber-300 bg-amber-50 px-3.5 text-xs font-bold text-amber-800 hover:bg-amber-100">
                          Complete Profile to Apply
                        </span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          openJobDetails(item);
                        }}
                        className="inline-flex h-control items-center rounded-lg bg-[#1677e8] px-3.5 text-xs font-bold text-white transition hover:bg-[#1267c8]"
                      >
                        View Details & Apply
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Job Details Modal for Detailed Inspection & Application */}
      {selectedJob ? (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          action={
            selectedJob.applied ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
                <Check size={14} aria-hidden="true" /> Already Applied
              </span>
            ) : !isApproved ? (
              <Link href="/tutor/dashboard/profile">
                <Button
                  type="button"
                  className="rounded-xl bg-amber-600 font-bold text-white hover:bg-amber-700"
                >
                  Complete Profile to Apply
                </Button>
              </Link>
            ) : (
              <Button
                type="button"
                disabled={applyingJobId === selectedJob.rawId || expressInterestMutation.isPending}
                onClick={() => handleApply(selectedJob.rawId)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-j-accent px-5 py-2.5 font-bold text-white transition hover:bg-j-accent-hover disabled:opacity-60"
              >
                <Send size={14} aria-hidden="true" />
                {applyingJobId === selectedJob.rawId ? "Submitting…" : "Apply Now"}
              </Button>
            )
          }
        />
      ) : null}
    </section>
  );
}
