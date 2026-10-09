import { DateField, FilterSelect } from "@/components/JobFilterFields";
import { useAppliedFilters } from "@/components/useAppliedFilters";
import {
  DEFAULT_ADMIN_CHAT_FILTERS,
  adminChatFilterAlerts,
  adminChatHandledByOptions,
  adminChatStatusOptions,
  adminChatWaitingOptions,
  buildAdminChatFilterInput,
  type AdminChatFilterState,
} from "@shared/admin-chat-filters";

/** The filter state behind the Tutor Chats panel. */
export function useAdminChatFilters({ onChange }: { onChange?: () => void } = {}) {
  return useAppliedFilters({
    defaults: DEFAULT_ADMIN_CHAT_FILTERS,
    build: buildAdminChatFilterInput,
    alertsFor: adminChatFilterAlerts,
    onChange,
  });
}

/**
 * The boxes of the Tutor Chats panel: whether a message is unread, who has
 * claimed the conversation, how long a Tutor has waited, and the day of the
 * last message. They narrow the list; the sort beside the search only regroups it.
 */
export function AdminChatFilterFields({ draft, setDraft }: {
  draft: AdminChatFilterState;
  setDraft: (next: AdminChatFilterState) => void;
}) {
  const set = (change: Partial<AdminChatFilterState>) => setDraft({ ...draft, ...change });
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
    <FilterSelect label="Status" value={draft.status} onChange={value => set({ status: value as AdminChatFilterState["status"] })} options={[...adminChatStatusOptions]} />
    <FilterSelect label="Claimed By" value={draft.handledBy} onChange={value => set({ handledBy: value as AdminChatFilterState["handledBy"] })} options={[...adminChatHandledByOptions]} />
    <div className="col-span-2 lg:col-span-1"><FilterSelect label="Waiting For A Reply" value={draft.waiting} onChange={value => set({ waiting: value as AdminChatFilterState["waiting"] })} options={[...adminChatWaitingOptions]} /></div>
    <DateField label="Last Message From" value={draft.lastFrom} max={draft.lastTo || undefined} onChange={lastFrom => set({ lastFrom })} />
    <DateField label="Last Message To" value={draft.lastTo} min={draft.lastFrom || undefined} onChange={lastTo => set({ lastTo })} />
  </div>;
}
