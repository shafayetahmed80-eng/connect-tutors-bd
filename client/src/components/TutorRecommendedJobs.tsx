import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatSalaryAmount } from "@shared/salary-amount";
import { formatTuitionType } from "@shared/job-card";
import JobDetailsModal, { type JobDetailsData } from "@/components/JobDetailsModal";
import { JobIdTag } from "@/components/JobIdTag";
import { Bookmark, BookOpen, CalendarDays, Check, ChevronRight, Clock, Compass, ExternalLink, MapPin, Send, Sparkles, UserRound, Wallet } from "lucide-react";
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

export function TutorRecommendedJobs() {
  const [, navigate] = useLocation();
  const recommendedQuery = trpc.tutor.recommendedJobs.useQuery({ limit: 3 });
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
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
      <section aria-label="Loading recommended jobs" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-j-surface-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-j-surface-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-j-border bg-white p-5 shadow-xs" />
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
      title: `${job.classCourse || "Tuition"} · ${job.category || ""}`,
      postedAt: job.publishedAt ? new Date(job.publishedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recently",
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
    <section aria-labelledby="recommended-tuitions-heading" className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="recommended-tuitions-heading" className="text-base font-bold tracking-tight text-j-ink sm:text-lg">
                Recommended For You
              </h2>
              {totalCount > 0 ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                  {totalCount} Matching
                </span>
              ) : null}
            </div>
            <p className="text-xs text-j-ink-muted">
              আপনার পছন্দের বিষয় এবং লোকেশনের সাথে সর্বোচ্চ ম্যাচিং টিউশন পোস্ট
            </p>
          </div>
        </div>

        <Link
          href="/tutor/dashboard/jobs"
          className="inline-flex items-center gap-1 text-xs font-bold text-j-accent transition-colors hover:text-j-accent-hover hover:underline"
        >
          View all jobs on Job Board <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <article className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-j-border bg-white p-8 text-center shadow-xs">
          <div className="grid size-12 place-items-center rounded-full bg-sky-50 text-j-accent">
            <Compass size={24} aria-hidden="true" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-j-ink">এই মুহূর্তে হুবহু ম্যাচিং নতুন টিউশন নেই</h3>
          <p className="mt-1 max-w-md text-xs leading-5 text-j-ink-muted">
            আপনার প্রোফাইলে আরও কিছু এলাকা (Teaching Areas) ও বিষয় (Subjects) যুক্ত করলে ম্যাচিং টিউশন পাওয়ার সম্ভাবনা বহুগুণ বৃদ্ধি পাবে।
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link href="/tutor/dashboard/profile">
              <Button size="sm" variant="outline" className="rounded-xl border-j-border text-xs font-bold text-j-ink">
                Update Teaching Preferences
              </Button>
            </Link>
            <Link href="/tutor/dashboard/jobs">
              <Button size="sm" className="rounded-xl bg-j-accent text-xs font-bold text-white hover:bg-j-accent-hover">
                Browse All Live Jobs
              </Button>
            </Link>
          </div>
        </article>
      ) : (
        /* Recommended Cards Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => {
            const job = item.job;
            const isBookmarked = savedJobs.has(job.publicJobId);
            const isJobApplying = applyingJobId === job.id;

            let badgeStyle = "bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/20";
            if (item.matchGrade === "perfect") {
              badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20";
            } else if (item.matchGrade === "high") {
              badgeStyle = "bg-teal-50 text-teal-700 border-teal-200 ring-teal-500/20";
            }

            return (
              <article
                key={job.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-j-border bg-white p-5 shadow-[0_4px_20px_rgba(15,33,55,0.04)] transition-all duration-200 hover:border-j-accent/40 hover:shadow-[0_8px_28px_rgba(15,33,55,0.08)]"
              >
                <div>
                  {/* Top Bar: Job ID + Match Badge + Bookmark */}
                  <div className="flex items-center justify-between gap-2">
                    <JobIdTag jobId={job.publicJobId} iconSize={12} className="font-mono text-2xs" />

                    <div className="flex items-center gap-1.5">
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

                  {/* Class & Category */}
                  <h3 className="mt-3 text-sm font-bold text-j-ink group-hover:text-j-accent">
                    {job.classCourse || "Tuition Requirement"}
                    {job.category ? <span className="font-normal text-j-ink-muted"> · {job.category}</span> : null}
                  </h3>

                  {/* Subjects */}
                  <div className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-[#173d60]">
                    <BookOpen size={14} className="mt-0.5 shrink-0 text-j-accent" aria-hidden="true" />
                    <span className="line-clamp-2 leading-relaxed">{job.subjects || "Various subjects"}</span>
                  </div>

                  {/* Key Info: Salary, Days, Mode, Location */}
                  <div className="mt-3.5 space-y-1.5 border-t border-dashed border-j-border pt-3 text-xs text-j-ink-muted">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-j-ink">
                        <Wallet size={13} className="text-emerald-600" aria-hidden="true" />
                        {formatSalaryAmount(job.budgetAmount)}
                      </span>
                      {job.daysPerWeek ? (
                        <span className="flex items-center gap-1 font-medium">
                          <CalendarDays size={13} className="text-[#8fb4d0]" aria-hidden="true" />
                          {job.daysPerWeek} দিন/সপ্তাহ
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 text-2xs">
                      <MapPin size={13} className="shrink-0 text-rose-500" aria-hidden="true" />
                      <span className="truncate">{job.locationLabel || "Location on application"}</span>
                    </div>
                  </div>

                  {/* Match Reason Chips */}
                  {item.matchReasons.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.matchReasons.map((reason, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-j-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-j-ink-muted"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Footer Action */}
                <div className="mt-4 border-t border-j-border pt-3">
                  {item.applied ? (
                    <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-xs font-bold text-emerald-800 ring-1 ring-emerald-600/20">
                      <Check size={14} aria-hidden="true" /> Applied
                    </div>
                  ) : !isApproved ? (
                    <Link href="/tutor/dashboard/profile" className="block w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl border-amber-300 bg-amber-50 text-xs font-bold text-amber-800 hover:bg-amber-100"
                      >
                        Complete Profile to Apply
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openJobDetails(item)}
                      className="w-full rounded-xl bg-j-accent font-bold text-white transition hover:bg-j-accent-hover active:scale-[0.99]"
                    >
                      View Details & Apply <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                  )}
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
