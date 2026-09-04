import { LabelIcon, RecordIcon } from "@/components/recordIcons";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, ClipboardList, FileCheck2, UserRoundCog } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

/** Which record a row is about, so a Tutor can sort the list by eye. */
const TYPE_ICON = {
  profile_moderation: UserRoundCog,
  interest_decision: ClipboardList,
  appointment: BadgeCheck,
  confirmation_letter: FileCheck2,
} as const;

type TutorNotification = {
  id: number;
  type: keyof typeof TYPE_ICON;
  title: string;
  message: string;
  actionPath: string;
  readAt: string | Date | null;
  createdAt: string | Date;
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * What the site has told this Tutor.
 *
 * A Guardian has had this since the request lifecycle shipped; a Tutor had
 * nothing, so approvals, change requests, shortlistings and declines all
 * happened in silence and the only way to learn of one was to come back and
 * look at a tab.
 */
export function TutorNotificationInbox() {
  const utils = trpc.useUtils();
  const notificationsQuery = trpc.tutorNotifications.mine.useQuery({ limit: 20 });
  const unreadCountQuery = trpc.tutorNotifications.unreadCount.useQuery();

  const refresh = async () => {
    await Promise.all([utils.tutorNotifications.mine.invalidate(), utils.tutorNotifications.unreadCount.invalidate()]);
  };
  const markRead = trpc.tutorNotifications.markRead.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const markAllRead = trpc.tutorNotifications.markAllRead.useMutation({
    onSuccess: async () => { await refresh(); toast.success("All notifications have been marked read."); },
    onError: error => toast.error(error.message),
  });

  const notifications = (notificationsQuery.data?.items ?? []) as TutorNotification[];
  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;

  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#dce9f1] pb-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-j-ink-muted">
        <LabelIcon label="Notifications" />
        {unreadCount > 0 ? <>Unread <span className="tabular-nums font-bold text-[#1267c8]">{String(unreadCount).padStart(2, "0")}</span></> : "Nothing unread"}
      </p>
      {unreadCount > 0
        ? <Button type="button" variant="outline" disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()} className="rounded-xl">
            {markAllRead.isPending ? "Marking…" : "Mark all read"}
          </Button>
        : null}
    </div>

    {notificationsQuery.isLoading
      ? <p className="rounded-xl border border-j-border bg-white px-4 py-8 text-center text-sm font-semibold text-j-ink-muted">Loading your notifications…</p>
      : null}

    {!notificationsQuery.isLoading && notificationsQuery.isError
      ? <p role="alert" className="rounded-xl border border-j-err-border bg-j-err-wash px-4 py-8 text-center text-sm font-semibold text-j-err">Your notifications could not be loaded just now. Please try again.</p>
      : null}

    {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0
      ? <p className="rounded-xl border border-dashed border-[#c9dce9] bg-white px-4 py-8 text-center text-sm text-j-ink-muted">
          Nothing yet. Decisions about your profile and your applications will appear here.
        </p>
      : null}

    <ul className="space-y-3">
      {notifications.map(notification => {
        const Icon = TYPE_ICON[notification.type] ?? ClipboardList;
        const unread = !notification.readAt;
        return <li key={notification.id} className={`rounded-xl border bg-white p-4 shadow-[0_10px_26px_-18px_rgba(38,83,117,0.5)] sm:p-5 ${unread ? "border-[#bcdcf3]" : "border-j-border"}`}>
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${unread ? "bg-j-accent-wash text-j-accent" : "bg-j-surface-muted text-j-ink-faint"}`}>
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className={`text-sm ${unread ? "font-bold text-j-ink" : "font-semibold text-j-ink-soft"}`}>{notification.title}</h3>
                <p className="flex items-center gap-1.5 text-2xs font-semibold text-j-ink-faint">
                  <RecordIcon name="posted" size={11} className="text-[#8fb4d0]" />{formatDate(notification.createdAt)}
                </p>
              </div>
              <p className="mt-1 text-sm leading-6 text-j-ink-soft">{notification.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link href={notification.actionPath} className="text-xs font-bold text-j-accent hover:underline">Open</Link>
                {unread
                  ? <button type="button" disabled={markRead.isPending} onClick={() => markRead.mutate({ notificationId: notification.id })} className="text-xs font-semibold text-j-ink-muted hover:text-j-ink-soft disabled:opacity-50">Mark read</button>
                  : null}
              </div>
            </div>
          </div>
        </li>;
      })}
    </ul>
  </section>;
}
