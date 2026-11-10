import React, { useState } from "react";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import RecordTable, { type RecordColumn } from "@/components/RecordTable";
import StatusTabRow, { type StatusTabItem } from "@/components/StatusTabRow";
import { TutorListPager } from "@/components/TutorListPager";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { LoadingCradle } from "@/components/BrandMark";
import SearchInput from "@/components/SearchInput";
import { formatBangladeshLocalPhoneDisplay } from "@shared/phone";
import {
  type ExpressRequestStatus,
  EXPRESS_REQUEST_STATUSES,
} from "@shared/express-tutor-request";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Phone,
  PhoneCall,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

type ExpressItem = {
  id: number;
  phone: string;
  guardianName: string | null;
  classCourse: string;
  curriculumType: string | null;
  subjects: string | null;
  tuitionType: string;
  locationLabel: string;
  notes: string | null;
  source: string;
  status: ExpressRequestStatus;
  contactedAt: string | Date | null;
  createdAt: string | Date;
};

type TabKey = "all" | "new" | "contacted" | "converted" | "cancelled";

const statusTabs: StatusTabItem<TabKey>[] = [
  { key: "all", label: "All Leads" },
  { key: "new", label: "New (নতুন)" },
  { key: "contacted", label: "Contacted (যোগাযোগ হয়েছে)" },
  { key: "converted", label: "Converted (টিউশন পোস্ট)" },
  { key: "cancelled", label: "Cancelled" },
];

function StatusBadge({ status }: { status: ExpressRequestStatus }) {
  if (status === "new") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" /> New Lead
      </span>
    );
  }
  if (status === "contacted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20">
        <CheckCircle2 size={12} /> Contacted
      </span>
    );
  }
  if (status === "converted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <Sparkles size={12} /> Converted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      Cancelled
    </span>
  );
}

function formatDate(val: string | Date | null) {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminExpressRequests() {
  const [selectedStatus, setSelectedStatus] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Note dialog state
  const [activeNoteItem, setActiveNoteItem] = useState<ExpressItem | null>(null);
  const [noteText, setNoteText] = useState("");

  const utils = trpc.useUtils();
  const listQuery = trpc.admin.listExpressRequests.useQuery({
    status: selectedStatus === "all" ? undefined : selectedStatus,
    search: query.trim() || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const updateMutation = trpc.admin.updateExpressRequestStatus.useMutation({
    onSuccess: () => {
      toast.success("Lead status updated.");
      setActiveNoteItem(null);
      setNoteText("");
      void utils.admin.listExpressRequests.invalidate();
    },
    onError: err => {
      toast.error(err.message || "Failed to update lead status.");
    },
  });

  const items = (listQuery.data?.items ?? []) as ExpressItem[];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleMarkContacted = (item: ExpressItem) => {
    updateMutation.mutate({
      id: item.id,
      status: "contacted",
    });
  };

  const handleSaveNote = () => {
    if (!activeNoteItem) return;
    updateMutation.mutate({
      id: activeNoteItem.id,
      status: activeNoteItem.status,
      notes: noteText.trim(),
    });
  };

  const columns: RecordColumn<ExpressItem>[] = [
    {
      key: "id",
      label: "Lead ID",
      place: "head",
      cell: item => (
        <div>
          <span className="font-bold text-slate-900">#{item.id}</span>
          {item.guardianName && (
            <p className="text-xs font-medium text-slate-600">{item.guardianName}</p>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      label: "Mobile & Action",
      cell: item => {
        const rawDigits = item.phone.replace(/\D/g, "");
        const international = rawDigits.startsWith("880") ? rawDigits : `880${rawDigits.replace(/^0/, "")}`;
        return (
          <div className="flex flex-col gap-1">
            <span className="font-mono font-bold text-slate-900">
              {formatBangladeshLocalPhoneDisplay(item.phone)}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <a
                href={`tel:${item.phone}`}
                title="Direct Call"
                className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline"
              >
                <PhoneCall size={12} /> Call
              </a>
              <span className="text-slate-300">·</span>
              <a
                href={`https://wa.me/${international}`}
                target="_blank"
                rel="noreferrer"
                title="WhatsApp Chat"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
              >
                WhatsApp <ExternalLink size={11} />
              </a>
            </div>
          </div>
        );
      },
    },
    {
      key: "classCourse",
      label: "Class & Medium",
      cell: item => (
        <div>
          <span className="font-semibold text-slate-800">{item.classCourse}</span>
          {item.curriculumType && (
            <p className="text-xs text-slate-500">{item.curriculumType}</p>
          )}
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      cell: item => (
        <span className="max-w-[12rem] break-words text-xs text-slate-700">
          {item.locationLabel}
        </span>
      ),
    },
    {
      key: "subjects",
      label: "Subjects",
      cell: item => <span className="text-xs text-slate-600">{item.subjects || "All Subjects"}</span>,
    },
    {
      key: "status",
      label: "Status",
      cell: item => <StatusBadge status={item.status} />,
    },
    {
      key: "date",
      label: "Received",
      cell: item => <span className="whitespace-nowrap text-xs text-slate-500">{formatDate(item.createdAt)}</span>,
    },
    {
      key: "actions",
      label: "Action",
      place: "action",
      cell: item => (
        <div className="flex items-center gap-1.5">
          {item.status === "new" && (
            <button
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => handleMarkContacted(item)}
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-blue-50 px-2.5 text-xs font-semibold text-[#1677E8] hover:bg-blue-100 disabled:opacity-50"
            >
              <CheckCircle2 size={12} /> Contacted
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveNoteItem(item);
              setNoteText(item.notes || "");
            }}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <MessageSquare size={12} /> {item.notes ? "Edit Note" : "Note"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminWorkspaceLayout title="Express Leads">
      <div className="mx-auto w-full max-w-[100rem] space-y-4 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Zap size={16} className="fill-amber-500" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Express Tutor Requests (১৫-সেকেন্ড রিকোয়েস্ট লিড)
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              হোমপেজ ও জব বোর্ড থেকে আসা অভিভাবক লিডসমূহ। অভিভাবকের সাথে সরাসরি কথা বলে টিউশন নিশ্চিত করুন।
            </p>
          </div>
        </div>

        {/* Status Filters */}
        <StatusTabRow
          label="Lead status"
          items={statusTabs}
          selected={selectedStatus}
          onSelect={key => {
            setSelectedStatus((key ?? "all") as TabKey);
            setPage(1);
          }}
        />

        {/* Search */}
        <div className="max-w-md">
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
            placeholder="Search mobile, class or area..."
            label="Search leads"
            variant="sunken"
          />
        </div>

        {/* Table Content */}
        {listQuery.isLoading ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400">
            <LoadingCradle className="mr-2" /> Loading Express Leads…
          </div>
        ) : listQuery.isError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            Express requests could not be loaded.
          </div>
        ) : (
          <RecordTable
            caption="Express Tutor Request Leads"
            columns={columns}
            rows={items}
            rowKey={row => row.id}
            empty="No express requests found for this filter."
            tableClassName="min-w-[56rem]"
          />
        )}

        {/* Pager */}
        <TutorListPager
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          label="Express leads pages"
          pageSize={pageSize}
          pageSizeOptions={[20, 50, 100]}
          onPageSize={next => {
            setPageSize(next);
            setPage(1);
          }}
          totalItems={total}
        />

        {/* Note Dialog */}
        {activeNoteItem && (
          <Modal
            size="dialog"
            onClose={() => setActiveNoteItem(null)}
            busy={updateMutation.isPending}
          >
            <ModalHeader
              title={`Coordinator Note for Lead #${activeNoteItem.id}`}
              meta={<>{formatBangladeshLocalPhoneDisplay(activeNoteItem.phone)} · {activeNoteItem.classCourse}</>}
            />
            <ModalBody>
              <label className="block text-xs font-semibold text-slate-700" htmlFor="lead-note">
                কল বা আলোচনার নোট (Coordinator Notes)
              </label>
              <textarea
                id="lead-note"
                rows={4}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="অভিভাবকের চাহিদা, প্রস্তাবিত বাজেট বা শিক্ষকের পছন্দ লিখে রাখুন..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none transition focus:border-[#1677E8] focus:bg-white sm:text-sm"
              />
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                onClick={() => setActiveNoteItem(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={handleSaveNote}
                className="rounded-xl bg-[#1677E8] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#1265c7] disabled:opacity-50"
              >
                Save Note
              </button>
            </ModalFooter>
          </Modal>
        )}
      </div>
    </AdminWorkspaceLayout>
  );
}
