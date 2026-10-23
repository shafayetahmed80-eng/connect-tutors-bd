import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_MESSAGE_PRESETS,
  isValidSlashCommand,
  normalizeSlashCommand,
  type MessagePreset,
  type MessagePresetCategory,
} from "@shared/message-presets";
import { Check, Copy, Edit3, Plus, Search, Trash2, Zap } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

const CATEGORY_TABS: Array<{ id: MessagePresetCategory; label: string; icon: string }> = [
  { id: "tutor_chat", label: "টিউটর লাইভ চ্যাট", icon: "💬" },
  { id: "tutor_notify", label: "টিউটর বাল্ক নোটিফাই", icon: "📢" },
  { id: "guardian_notify", label: "অভিভাবক বাল্ক নোটিফাই", icon: "👨‍👩‍👧" },
];

export default function AdminSlashPresetsManager() {
  const [activeCategory, setActiveCategory] = useState<MessagePresetCategory>("tutor_chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftCategory, setDraftCategory] = useState<MessagePresetCategory>("tutor_chat");
  const [draftCommand, setDraftCommand] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  // Delete modal state
  const [deletingItem, setDeletingItem] = useState<{ id: number; title: string; command?: string | null } | null>(null);

  const utils = trpc.useUtils();
  const templatesQuery = trpc.admin.listMessageTemplates.useQuery({ category: activeCategory });

  const createMutation = trpc.admin.createMessageTemplate.useMutation({
    onSuccess: () => {
      toast.success("নতুন স্ল্যাশ কমান্ড ও প্রিসেট সফলভাবে সংরক্ষিত হয়েছে।");
      closeModal();
      void utils.admin.listMessageTemplates.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const updateMutation = trpc.admin.updateMessageTemplate.useMutation({
    onSuccess: () => {
      toast.success("স্ল্যাশ কমান্ড ও প্রিসেট সফলভাবে আপডেট হয়েছে।");
      closeModal();
      void utils.admin.listMessageTemplates.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const deleteMutation = trpc.admin.deleteMessageTemplate.useMutation({
    onSuccess: () => {
      toast.success("প্রিসেট মুছে ফেলা হয়েছে।");
      setDeletingItem(null);
      void utils.admin.listMessageTemplates.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setDraftCommand("");
    setDraftTitle("");
    setDraftBody("");
  };

  const openCreateModal = (prefill?: { command?: string; title?: string; body?: string }) => {
    setEditingId(null);
    setDraftCategory(activeCategory);
    setDraftCommand(prefill?.command ? normalizeSlashCommand(prefill.command) : "");
    setDraftTitle(prefill?.title ?? "");
    setDraftBody(prefill?.body ?? "");
    setModalOpen(true);
  };

  const openEditModal = (item: { id: number; category: MessagePresetCategory; command?: string | null; title: string; body: string }) => {
    setEditingId(item.id);
    setDraftCategory(item.category);
    setDraftCommand(item.command ?? "");
    setDraftTitle(item.title);
    setDraftBody(item.body);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draftTitle.trim();
    const body = draftBody.trim();
    const command = draftCommand.trim() ? normalizeSlashCommand(draftCommand) : null;

    if (!title || !body) {
      toast.error("অনুগ্রহ করে শিরোনাম ও মেসেজ বডি পূরণ করুন।");
      return;
    }

    if (command && !isValidSlashCommand(command)) {
      toast.error("স্ল্যাশ কমান্ডে শুধু ইংরেজি বর্ণ, সংখ্যা, হাইফেন বা আন্ডারস্কোর ব্যবহার করুন (যেমন: /discount)।");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        category: draftCategory,
        command,
        title,
        body,
      });
    } else {
      createMutation.mutate({
        category: draftCategory,
        command,
        title,
        body,
      });
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
      toast.success("ক্লিপবোর্ডে কপি করা হয়েছে!");
    } catch {
      toast.error("কপি করতে সমস্যা হয়েছে।");
    }
  };

  // Combine system default presets and database custom templates for the active category
  const customTemplates = templatesQuery.data?.items ?? [];
  const systemPresets = useMemo(() => {
    return DEFAULT_MESSAGE_PRESETS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  // Filter items by search query
  const filteredCustom = useMemo(() => {
    if (!searchQuery.trim()) return customTemplates;
    const q = searchQuery.toLowerCase().trim();
    return customTemplates.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        (item.command && item.command.toLowerCase().includes(q))
    );
  }, [customTemplates, searchQuery]);

  const filteredSystem = useMemo(() => {
    if (!searchQuery.trim()) return systemPresets;
    const q = searchQuery.toLowerCase().trim();
    return systemPresets.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.command.toLowerCase().includes(q)
    );
  }, [systemPresets, searchQuery]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <section className="mt-3 rounded-xl border border-j-border bg-white p-3.5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-j-border pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Zap className="size-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-j-ink">
              স্ল্যাশ কমান্ড ও মেসেজ প্রিসেট ম্যানেজার (Slash Commands & Message Presets)
            </h2>
          </div>
          <p className="mt-0.5 text-2xs text-j-ink-soft">
            লাইভ চ্যাটে স্ল্যাশ (<span className="font-mono font-bold text-emerald-700">/</span>) কিবোর্ড শর্টকাট এবং বাল্ক নোটিফিকেশন পাঠানোর সময় ব্যবহারের জন্য সেন্ট্রাল প্রিসেট পরিচালনা করুন।
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-j-accent px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-600 active:scale-95"
        >
          <Plus className="size-3.5" />
          <span>নতুন কমান্ড / প্রিসেট যোগ করুন</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
        <div role="tablist" aria-label="Message Preset Categories" className="inline-flex flex-wrap gap-1 rounded-xl border border-j-border bg-j-surface-sunken p-1">
          {CATEGORY_TABS.map(tab => {
            const active = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(tab.id)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                  active
                    ? "bg-white text-j-accent shadow-sm"
                    : "text-j-ink-soft hover:text-j-ink"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-j-ink-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="কমান্ড বা মেসেজ খুঁজুন…"
            className="h-8 w-full rounded-xl border border-j-border bg-j-surface-sunken pl-8 pr-2.5 text-xs outline-none focus:border-j-accent focus:bg-white"
          />
        </div>
      </div>

      {/* Presets Grid */}
      <div className="mt-3 space-y-4">
        {/* Custom Presets Section */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-2xs font-bold uppercase tracking-wider text-j-ink-faint">
              কাস্টম প্রিসেট ({filteredCustom.length})
            </h3>
            {filteredCustom.length > 0 ? (
              <span className="text-3xs text-j-ink-muted">অ্যাডমিন কর্তৃক সংরক্ষিত</span>
            ) : null}
          </div>

          {templatesQuery.isLoading ? (
            <div className="py-6 text-center text-xs text-j-ink-muted">প্রিসেট লোড হচ্ছে…</div>
          ) : filteredCustom.length === 0 ? (
            <div className="mt-1.5 rounded-xl border border-dashed border-j-border bg-j-surface-sunken/50 p-4 text-center">
              <p className="text-xs text-j-ink-soft">এই ক্যাটাগরিতে এখনো কোনো কাস্টম প্রিসেট তৈরি করা হয়নি।</p>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-j-accent hover:underline"
              >
                <Plus className="size-3" />
                <span>প্রথম কাস্টম স্ল্যাশ কমান্ড তৈরি করুন</span>
              </button>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCustom.map(item => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-j-border bg-white p-3 shadow-xs transition hover:border-sky-300 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      {item.command ? (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700">
                          {item.command}
                        </span>
                      ) : (
                        <span className="rounded-md border border-j-border bg-j-surface-sunken px-2 py-0.5 text-3xs font-medium text-j-ink-muted">
                          কমান্ডবিহীন
                        </span>
                      )}
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-3xs font-bold text-sky-700">
                        কাস্টম
                      </span>
                    </div>

                    <h4 className="mt-2 text-xs font-bold text-j-ink leading-snug line-clamp-1">{item.title}</h4>
                    <p className="mt-1 text-2xs leading-relaxed text-j-ink-soft line-clamp-3">
                      {item.body}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-j-border/60 pt-2 text-3xs text-j-ink-muted">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.body, `custom-${item.id}`)}
                      className="inline-flex items-center gap-1 font-medium text-j-ink-soft hover:text-j-ink"
                    >
                      {copiedId === `custom-${item.id}` ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-700">কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>কপি</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${item.title}`}
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold text-j-ink-soft hover:bg-j-surface-sunken hover:text-j-accent"
                      >
                        <Edit3 className="size-3" />
                        <span>এডিট</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => setDeletingItem(item)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-3" />
                        <span>মুছুন</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Default Presets Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-2xs font-bold uppercase tracking-wider text-j-ink-faint">
              সিস্টেম বিল্ট-ইন প্রিসেট ({filteredSystem.length})
            </h3>
            <span className="text-3xs text-j-ink-muted">প্ল্যাটফর্ম স্ট্যান্ডার্ড টেমপ্লেট</span>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSystem.map(item => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-j-border bg-j-surface-sunken/40 p-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
                      {item.command}
                    </span>
                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-3xs font-medium text-slate-600">
                      সিস্টেম ডিফল্ট
                    </span>
                  </div>

                  <h4 className="mt-2 text-xs font-bold text-j-ink leading-snug line-clamp-1">{item.title}</h4>
                  <p className="mt-1 text-2xs leading-relaxed text-j-ink-soft line-clamp-3">
                    {item.body}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-j-border/60 pt-2 text-3xs text-j-ink-muted">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.body, `sys-${item.id}`)}
                    className="inline-flex items-center gap-1 font-medium text-j-ink-soft hover:text-j-ink"
                  >
                    {copiedId === `sys-${item.id}` ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span className="text-emerald-700">কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>কপি</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openCreateModal({ command: `${item.command}-custom`, title: item.title, body: item.body })}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold text-j-accent hover:bg-sky-50"
                  >
                    <Plus className="size-3" />
                    <span>কাস্টমাইজ ও কপি</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen ? (
        <Modal size="dialog" onClose={closeModal} busy={isSaving}>
          <ModalHeader
            title={editingId ? "স্ল্যাশ কমান্ড ও প্রিসেট সম্পাদনা" : "নতুন স্ল্যাশ কমান্ড ও প্রিসেট"}
          />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <div className="space-y-3">
                {/* Command Field */}
                <div>
                  <label htmlFor="preset-command-input" className="block text-xs font-bold text-j-ink">
                    স্ল্যাশ কমান্ড (Slash Command)
                  </label>
                  <div className="mt-1 relative flex items-center">
                    <span className="absolute left-3 font-mono text-sm font-bold text-emerald-600">/</span>
                    <input
                      id="preset-command-input"
                      type="text"
                      value={draftCommand.startsWith("/") ? draftCommand.slice(1) : draftCommand}
                      onChange={e => setDraftCommand(normalizeSlashCommand(e.target.value))}
                      placeholder="discount (যেমন: /discount)"
                      maxLength={35}
                      className="h-control w-full rounded-xl border border-j-border bg-j-surface-sunken pl-7 pr-3 font-mono text-xs outline-none focus:border-j-accent focus:bg-white focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <p className="mt-1 text-3xs text-j-ink-muted">
                    লাইভ চ্যাটে বা নোটিফিকেশনে এই শর্টকাট লিখলেই মেসেজ ড্রপডাউনে পাওয়া যাবে।
                  </p>
                </div>

                {/* Category Field */}
                <div>
                  <label htmlFor="preset-category-select" className="block text-xs font-bold text-j-ink">
                    ক্যাটাগরি (Category)
                  </label>
                  <select
                    id="preset-category-select"
                    value={draftCategory}
                    onChange={e => setDraftCategory(e.target.value as MessagePresetCategory)}
                    className="mt-1 h-control w-full rounded-xl border border-j-border bg-j-surface-sunken px-3 text-xs outline-none focus:border-j-accent focus:bg-white"
                  >
                    <option value="tutor_chat">💬 টিউটর লাইভ চ্যাট (Tutor Live Chat)</option>
                    <option value="tutor_notify">📢 টিউটর বাল্ক নোটিফাই (Tutor Bulk Notify)</option>
                    <option value="guardian_notify">👨‍👩‍👧 অভিভাবক বাল্ক নোটিফাই (Guardian Bulk Notify)</option>
                  </select>
                </div>

                {/* Title Field */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="preset-title-input" className="block text-xs font-bold text-j-ink">
                      শিরোনাম / প্রিসেট নাম (Title)
                    </label>
                    <span className="text-3xs text-j-ink-muted">{draftTitle.length}/120</span>
                  </div>
                  <input
                    id="preset-title-input"
                    type="text"
                    value={draftTitle}
                    onChange={e => setDraftTitle(e.target.value)}
                    placeholder="যেমন: বিশেষ ছাড় ও অফার"
                    maxLength={120}
                    required
                    className="mt-1 h-control w-full rounded-xl border border-j-border bg-j-surface-sunken px-3 text-xs outline-none focus:border-j-accent focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* Body Field */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="preset-body-textarea" className="block text-xs font-bold text-j-ink">
                      মেসেজের পূর্ণ বিবরণ (Message Body)
                    </label>
                    <span className="text-3xs text-j-ink-muted">{draftBody.length}/2000</span>
                  </div>
                  <textarea
                    id="preset-body-textarea"
                    value={draftBody}
                    onChange={e => setDraftBody(e.target.value)}
                    placeholder="মেসেজের মূল বক্তব্য লিখুন…"
                    rows={4}
                    maxLength={2000}
                    required
                    className="mt-1 w-full rounded-xl border border-j-border bg-j-surface-sunken p-2.5 text-xs leading-relaxed outline-none focus:border-j-accent focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="h-control rounded-xl border border-j-border px-4 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSaving || !draftTitle.trim() || !draftBody.trim()}
                className="h-control rounded-xl bg-j-accent px-5 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-40"
              >
                {isSaving ? "সংরক্ষণ হচ্ছে…" : editingId ? "আপডেট করুন" : "সংরক্ষণ করুন"}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      ) : null}

      {/* Delete Confirmation Modal */}
      {deletingItem ? (
        <Modal size="dialog" onClose={() => setDeletingItem(null)} busy={deleteMutation.isPending}>
          <ModalHeader title="প্রিসেটটি মুছে ফেলতে চান?" />
          <ModalBody>
            <p className="text-sm leading-relaxed text-j-ink-soft">
              <span className="font-bold text-j-ink">"{deletingItem.title}"</span>{" "}
              {deletingItem.command ? (
                <>
                  (<span className="font-mono text-emerald-700">{deletingItem.command}</span>){" "}
                </>
              ) : null}
              প্রিসেটটি স্থায়ীভাবে মুছে ফেলা হবে। আপনি কি নিশ্চিত?
            </p>
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={() => setDeletingItem(null)}
              disabled={deleteMutation.isPending}
              className="h-control rounded-xl border border-j-border px-4 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken"
            >
              ফিরে যান
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate({ id: deletingItem.id })}
              disabled={deleteMutation.isPending}
              className="h-control rounded-xl bg-red-600 px-5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? "মুছে ফেলা হচ্ছে…" : "হ্যাঁ, মুছে ফেলুন"}
            </button>
          </ModalFooter>
        </Modal>
      ) : null}
    </section>
  );
}
