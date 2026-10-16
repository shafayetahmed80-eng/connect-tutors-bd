import { useState } from "react";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { AdminJobFilterBar, useAdminJobFilters } from "@/components/AdminJobFilters";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import { JobIdTag } from "@/components/JobIdTag";
import RecentSearches from "@/components/RecentSearches";
import SearchInput from "@/components/SearchInput";
import { TutorListPager } from "@/components/TutorListPager";
import { LoadingCradle } from "@/components/BrandMark";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { formatDaysPerWeek, formatNotes, formatPostedDate, formatStudentCount, formatStudentGender, formatSubjects, formatTutorPreference } from "@shared/job-card";
import { formatSalaryAmount } from "@shared/salary-amount";
import { jobIdForRequest } from "@shared/job-id";
import { buildFacebookPostText, type FacebookPostJobInput } from "@shared/facebook-post";
import { Check, Copy, Eye, FileText, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export function AdminFacebookPostsContent() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [previewJob, setPreviewJob] = useState<FacebookPostJobInput | null>(null);

  // Filters for live posted jobs
  const filterPanel = useAdminJobFilters({ onChange: () => setPage(1) });
  const jobs = trpc.admin.listPostedJobs.useQuery({
    stage: "live",
    query,
    page,
    pageSize: PAGE_SIZE,
    postedBy: "all",
    filters: filterPanel.input,
  });

  const items = jobs.data?.items ?? [];
  type LiveJob = (typeof items)[number];

  const handleCopyPost = async (job: LiveJob) => {
    const code = jobIdForRequest(job.id);
    const postText = buildFacebookPostText({
      ...job,
      jobId: code,
      origin: window.location.origin,
    });

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(postText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = postText;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(job.id);
      setTimeout(() => setCopiedId(null), 2500);
      toast.success(`জব ${code}-এর ফেসবুক পোস্ট ক্লিপবোর্ডে কপি হয়েছে!`);
    } catch {
      toast.error("টেক্সট কপি করতে ব্যর্থ হয়েছে।");
    }
  };

  const columns: RecordColumn<LiveJob>[] = [
    {
      key: "jobId",
      label: "Job ID",
      place: "head",
      cell: job => (
        <JobIdTag
          bare
          className="text-2xs font-bold"
          jobId={jobIdForRequest(job.id)}
        />
      ),
      cardCell: job => (
        <div className="flex items-center gap-2">
          <JobIdTag className="text-xs" jobId={jobIdForRequest(job.id)} />
          <span className="text-2xs text-j-ink-faint">
            {formatPostedDate(job.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "postedDate",
      label: "Posted Date",
      place: "head",
      cell: job => (
        <span className="text-2xs text-j-ink-soft whitespace-nowrap">
          {formatPostedDate(job.createdAt)}
        </span>
      ),
    },
    {
      key: "classCourse",
      label: "Class / Medium",
      cell: job => {
        const medium = job.curriculumType || job.category;
        return (
          <div className="space-y-0.5">
            <span className="font-bold text-j-ink block leading-tight">
              {job.classCourse || "Not specified"}
            </span>
            {medium ? (
              <span className="inline-flex rounded bg-sky-50 px-1.5 py-0.5 text-2xs font-semibold text-sky-700">
                {medium}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "subjects",
      label: "Subjects",
      wide: true,
      cellClassName: "max-w-[15rem]",
      cell: job => (
        <span className="text-j-ink-strong leading-snug">
          {formatSubjects(job.subjects)}
        </span>
      ),
    },
    {
      key: "location",
      label: "Location",
      cell: job => (
        <div className="space-y-0.5">
          <span className="font-medium text-j-ink block leading-tight">
            {job.tuitionLocationLabel ?? job.locationText ?? "Online"}
          </span>
          {job.addressDetails?.trim() && job.tuitionType !== "online" ? (
            <p className="text-2xs text-j-ink-faint truncate max-w-[12rem]" title={job.addressDetails}>
              {job.addressDetails}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "salary",
      label: "Salary",
      cell: job => (
        <span className="font-bold text-j-ink whitespace-nowrap">
          {formatSalaryAmount(job.budgetAmount)}
        </span>
      ),
    },
    {
      key: "schedule",
      label: "Days / Time",
      cell: job => (
        <div className="space-y-0.5 whitespace-nowrap">
          <span className="text-j-ink font-medium block">
            {formatDaysPerWeek(job.daysPerWeek)}
          </span>
          <p className="text-2xs text-j-ink-soft">
            {job.tutoringTime || "Flexible"}
          </p>
        </div>
      ),
    },
    {
      key: "student",
      label: "Student",
      cell: job => (
        <div className="space-y-0.5 whitespace-nowrap">
          <span className="text-j-ink font-medium block">
            {formatStudentGender(job.studentGender)}
          </span>
          <p className="text-2xs text-j-ink-faint">
            {formatStudentCount(job.studentCount)}
          </p>
        </div>
      ),
    },
    {
      key: "tutorPref",
      label: "Tutor Preference",
      cell: job => (
        <div className="space-y-0.5">
          <span className="font-medium text-j-ink block">
            {formatTutorPreference(job.preferredGender)}
          </span>
          {job.instituteName ? (
            <p className="text-2xs text-j-ink-soft truncate max-w-[11rem]" title={job.instituteName}>
              {job.instituteName}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "notes",
      label: "Special Notes",
      wide: true,
      cellClassName: "max-w-[14rem]",
      cell: job => (
        <span
          className="text-2xs text-j-ink-soft line-clamp-2 leading-relaxed"
          title={job.notes || undefined}
        >
          {formatNotes(job.notes)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Facebook Post",
      place: "action",
      cellClassName: "text-right whitespace-nowrap",
      cardActionPinned: true,
      cell: job => {
        const isCopied = copiedId === job.id;
        const code = jobIdForRequest(job.id);
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleCopyPost(job)}
              aria-label={`Copy Facebook post for job ${code}`}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition shadow-2xs ${
                isCopied
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-[#1877f2] bg-[#1877f2] text-white hover:bg-[#166fe5] active:scale-[0.98]"
              }`}
            >
              {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{isCopied ? "Copied!" : "Copy Post"}</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewJob({ ...job, jobId: code, origin: window.location.origin })}
              aria-label={`Preview Facebook post for job ${code}`}
              className="inline-grid size-8 place-items-center rounded-lg border border-j-border bg-white text-j-ink-soft hover:bg-j-border-light hover:text-j-ink transition"
              title="Preview Post Text"
            >
              <Eye className="size-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-10">
      {/* Search and Top Controls */}
      <RecentSearches
        page="facebook-posts"
        value={query}
        onPick={term => {
          setQuery(term);
          setPage(1);
        }}
        className="max-w-sm"
      >
        <SearchInput
          value={query}
          onChange={val => {
            setQuery(val);
            setPage(1);
          }}
          onClear={() => {
            setQuery("");
            setPage(1);
          }}
          placeholder="Search by Job ID, class, subject, location..."
          label="Search live tuitions for Facebook post"
          variant="sunken"
        />
      </RecentSearches>

      <AdminJobFilterBar
        filters={filterPanel}
        stage="live"
        eyebrow="Facebook Post"
        count={jobs.data?.total}
        total={jobs.data?.total}
        loading={jobs.isLoading}
        searching={query.trim().length > 0}
        idleCaption="currently live on the Job Board"
        matchingCaption="matching live tuitions"
        panelLabel="Live tuition filters"
      />

      {jobs.isLoading ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft">
          <LoadingCradle className="mr-2" /> Loading live tuitions…
        </div>
      ) : null}

      {jobs.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          Live tuitions could not be loaded.
        </div>
      ) : null}

      {!jobs.isLoading && !jobs.isError ? (
        <RecordTable
          caption="Live tuitions with Guardian Journey details and Facebook post generator"
          columns={columns}
          rows={items}
          rowKey={job => job.id}
          empty={
            query.trim() || filterPanel.activeCount > 0
              ? "No live tuitions match this search."
              : "No live tuitions currently available on the Job Board."
          }
          tableClassName="min-w-[85rem]"
        />
      ) : null}

      <TutorListPager
        page={page}
        totalPages={jobs.data?.totalPages ?? 1}
        onPage={setPage}
        label="Facebook Post pages"
      />

      {/* Preview Facebook Post Modal */}
      {previewJob ? (
        <Modal onClose={() => setPreviewJob(null)}>
          <ModalHeader
            title={`Facebook Post Preview — ${previewJob.jobId || jobIdForRequest(previewJob.id)}`}
          />
          <ModalBody>
            <p className="mb-2 text-xs text-j-ink-soft">
              নিচের টেক্সটটি ফেসবুক গ্রুপ বা পেইজে সরাসরি পোস্ট করার উপযোগী ফরম্যাটে তৈরি করা হয়েছে:
            </p>
            <div className="rounded-xl border border-j-border bg-j-border-light/30 p-4 font-mono text-xs leading-relaxed text-j-ink whitespace-pre-wrap select-all">
              {buildFacebookPostText(previewJob, window.location.origin)}
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={() => {
                const text = buildFacebookPostText(previewJob, window.location.origin);
                navigator.clipboard.writeText(text);
                toast.success("পোস্ট টেক্সট ক্লিপবোর্ডে কপি হয়েছে!");
                setPreviewJob(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1877f2] bg-[#1877f2] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#166fe5]"
            >
              <Copy className="size-3.5" />
              Copy to Clipboard
            </button>
            <button
              type="button"
              onClick={() => setPreviewJob(null)}
              className="rounded-lg border border-j-border bg-white px-3.5 py-2 text-xs font-semibold text-j-ink hover:bg-j-border-light/60 transition"
            >
              Close
            </button>
          </ModalFooter>
        </Modal>
      ) : null}
    </div>
  );
}

export default function AdminFacebookPosts() {
  return (
    <AdminWorkspaceLayout title="Facebook Post">
      <AdminFacebookPostsContent />
    </AdminWorkspaceLayout>
  );
}
