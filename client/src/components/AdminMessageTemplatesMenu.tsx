import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BookmarkPlus, FileText, ListPlus, Plus, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type MessageTemplateCategory = "tutor_chat" | "tutor_notify" | "guardian_notify";

export type AdminMessageTemplatesMenuProps = {
  category: MessageTemplateCategory;
  onSelect: (template: { title: string; body: string }) => void;
  currentDraft?: { title?: string; body: string };
  buttonLabel?: string;
  buttonClassName?: string;
  variant?: "icon" | "button";
  align?: "left" | "right";
  dropUp?: boolean;
};

export function AdminMessageTemplatesMenu({
  category,
  onSelect,
  currentDraft,
  buttonLabel = "Templates",
  buttonClassName,
  variant = "icon",
  align = "left",
  dropUp = false,
}: AdminMessageTemplatesMenuProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const utils = typeof trpc.useUtils === "function" ? trpc.useUtils() : undefined;
  const templatesQuery = trpc.admin.listMessageTemplates.useQuery({ category }, { enabled: open });
  // For chat, also read quick replies to ensure any pre-existing quick replies appear seamlessly
  const chatQuickRepliesQuery = trpc.admin.listChatQuickReplies?.useQuery
    ? trpc.admin.listChatQuickReplies.useQuery(undefined, { enabled: open && category === "tutor_chat" })
    : { data: undefined };

  const create = trpc.admin.createMessageTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template saved.");
      setNewTitle("");
      setNewBody("");
      setCreating(false);
      void utils?.admin?.listMessageTemplates?.invalidate?.();
      if (category === "tutor_chat") {
        void utils?.admin?.listChatQuickReplies?.invalidate?.();
      }
    },
    onError: error => toast.error(error.message),
  });

  const remove = trpc.admin.deleteMessageTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template removed.");
      void utils?.admin?.listMessageTemplates?.invalidate?.();
    },
    onError: error => toast.error(error.message),
  });

  const removeLegacyQuickReply = trpc.admin.deleteChatQuickReply?.useMutation
    ? trpc.admin.deleteChatQuickReply.useMutation({
        onSuccess: () => {
          toast.success("Template removed.");
          void utils?.admin?.listChatQuickReplies?.invalidate?.();
        },
        onError: error => toast.error(error.message),
      })
    : { mutate: () => {} };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Combine templates
  const serverTemplates = templatesQuery.data?.items ?? [];
  const legacyQuickReplies = category === "tutor_chat"
    ? (chatQuickRepliesQuery.data?.items ?? []).filter(
        lq => !serverTemplates.some(st => st.title === lq.label && st.body === lq.body)
      ).map(lq => ({
        id: -lq.id, // negative id for legacy quick replies
        legacyId: lq.id,
        category: "tutor_chat" as MessageTemplateCategory,
        title: lq.label,
        body: lq.body,
      }))
    : [];

  const allTemplates = [...serverTemplates, ...legacyQuickReplies];

  const handleStartSaveCurrent = () => {
    setNewTitle(currentDraft?.title?.trim() || currentDraft?.body?.slice(0, 30).trim() || "");
    setNewBody(currentDraft?.body?.trim() || "");
    setCreating(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    const body = newBody.trim();
    if (!title || !body) return;
    create.mutate({ category, title, body });
  };

  const hasDraft = Boolean(currentDraft?.body?.trim());

  return (
    <div ref={menuRef} className="relative inline-block">
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-label={buttonLabel}
          aria-expanded={open}
          title={buttonLabel}
          className={buttonClassName || "grid h-control w-10 shrink-0 place-items-center rounded-xl border border-j-border text-j-ink-soft hover:bg-j-surface-sunken"}
        >
          <ListPlus className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          className={buttonClassName || "inline-flex h-control items-center gap-1.5 rounded-xl border border-j-border bg-white px-3 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken"}
        >
          <FileText className="size-3.5 text-j-accent" />
          <span>{buttonLabel}</span>
          {allTemplates.length > 0 ? (
            <span className="rounded-full bg-sky-50 px-1.5 py-0.2 text-3xs font-bold text-j-accent">
              {allTemplates.length}
            </span>
          ) : null}
        </button>
      )}

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] sm:hidden"
            onClick={() => { setOpen(false); setCreating(false); }}
            aria-hidden="true"
          />
          <div
            className={`fixed inset-x-2 bottom-3 z-50 flex max-h-[85vh] flex-col rounded-xl border border-j-border bg-white p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 sm:absolute sm:inset-auto sm:z-30 sm:max-h-none sm:w-80 sm:rounded-xl sm:p-3 sm:shadow-xl ${
              dropUp ? "sm:bottom-12" : "sm:top-full sm:mt-1.5"
            } ${align === "right" ? "sm:right-0" : "sm:left-0"}`}
          >
            <div className="flex items-center justify-between border-b border-j-border pb-2">
              <div className="flex items-center gap-1.5">
                <BookmarkPlus className="size-4 text-j-accent" />
                <p className="text-xs font-bold text-j-ink">Saved Templates</p>
                <span className="rounded-full bg-j-surface-muted px-1.5 py-0.2 text-3xs font-semibold tabular-nums text-j-ink-muted">
                  {allTemplates.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(val => !val)}
                  className="inline-flex items-center gap-1 text-2xs font-bold text-j-accent hover:underline"
                >
                  {creating ? <X className="size-3" /> : <Plus className="size-3" />}
                  {creating ? "Cancel" : "New"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setCreating(false); }}
                  aria-label="Close"
                  className="rounded-lg p-1 text-j-ink-muted hover:bg-j-surface-sunken hover:text-j-ink sm:hidden"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

          {creating ? (
            <form onSubmit={handleCreateSubmit} className="mt-2.5 space-y-2 border-b border-j-border pb-2.5">
              <p className="text-2xs font-bold text-j-ink-soft">Save as new template</p>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Template Title"
                maxLength={120}
                required
                className="h-control w-full rounded-xl border border-j-border px-2.5 text-xs outline-none focus:border-j-accent"
              />
              <textarea
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder="Template message content…"
                rows={3}
                required
                maxLength={2000}
                className="w-full rounded-xl border border-j-border px-2.5 py-1.5 text-xs outline-none focus:border-j-accent"
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newTitle.trim() || !newBody.trim() || create.isPending}
                  className="h-7 rounded-lg text-xs"
                >
                  {create.isPending ? "Saving…" : "Save Template"}
                </Button>
              </div>
            </form>
          ) : hasDraft ? (
            <div className="mt-2 border-b border-j-border pb-2">
              <button
                type="button"
                onClick={handleStartSaveCurrent}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-1.5 text-xs font-bold text-[#1267c8] hover:bg-sky-100/70"
              >
                <BookmarkPlus className="size-3.5" />
                <span>Save Current Message as Template</span>
              </button>
            </div>
          ) : null}

          <div className="mt-2 max-h-60 space-y-1.5 overflow-y-auto pr-1">
            {templatesQuery.isLoading ? (
              <p className="py-3 text-center text-xs text-j-ink-muted">Loading templates…</p>
            ) : allTemplates.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-j-ink-muted">No templates saved yet.</p>
                <p className="mt-0.5 text-2xs text-j-ink-faint">Save your frequently used messages to reuse them anytime.</p>
              </div>
            ) : (
              allTemplates.map(item => (
                <div
                  key={item.id}
                  className="group flex items-start justify-between gap-2 rounded-xl border border-transparent p-2 hover:border-j-border hover:bg-j-surface-sunken"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect({ title: item.title, body: item.body });
                      setOpen(false);
                      toast.info(`Inserted template: ${item.title}`);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-xs font-bold text-j-ink group-hover:text-j-accent">{item.title}</p>
                    <p className="line-clamp-2 text-2xs leading-relaxed text-j-ink-soft">{item.body}</p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete template ${item.title}`}
                    title="Delete template"
                    onClick={() => {
                      if ("legacyId" in item && item.legacyId) {
                        removeLegacyQuickReply.mutate({ id: item.legacyId });
                      } else {
                        remove.mutate({ id: item.id });
                      }
                    }}
                    className="shrink-0 p-1 text-j-ink-faint opacity-50 transition-opacity hover:text-red-600 hover:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    ) : null}
    </div>
  );
}
