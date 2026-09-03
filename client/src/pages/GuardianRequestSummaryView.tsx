import React, { type ReactNode } from "react";
import { AlignLeft, BookOpen, CalendarDays, GraduationCap, Hash, House, Layers, MapPin, School, Megaphone, UserRound, Users, Wallet } from "lucide-react";
import { tutorProfileTheme as tp } from "./tutorProfileTheme";
import type { GuardianSummaryGroup } from "./guardian-request-summary";

/**
 * The icon that belongs beside each row label.
 *
 * Keyed by label rather than carried on the row so the summary builder stays a
 * plain data function that a test can read without rendering anything.
 */
const SUMMARY_ROW_ICONS: Record<string, ReactNode> = {
  "Category": <GraduationCap size={13} />,
  "Curriculum Type": <Layers size={13} />,
  "Class / level": <GraduationCap size={13} />,
  "Subjects": <BookOpen size={13} />,
  "Student gender": <UserRound size={13} />,
  "Address Details": <MapPin size={13} />,
  "Tuition type": <House size={13} />,
  "Maximum students": <Users size={13} />,
  "Number of students": <Users size={13} />,
  "Package duration": <CalendarDays size={13} />,
  "Location": <MapPin size={13} />,
  "Days per week": <CalendarDays size={13} />,
  "Institute Name": <School size={13} />,
  "Where Did You Hear About Us": <Megaphone size={13} />,
  "Preferred Tutor gender": <Users size={13} />,
  "Salary": <Wallet size={13} />,
  "Additional notes": <AlignLeft size={13} />,
};

function summaryRowIcon(label: string): ReactNode {
  return SUMMARY_ROW_ICONS[label] ?? <Hash size={13} />;
}

/**
 * A request as a read-only record, laid out the way the Tutor profile's
 * "View Profile" preview lays a profile out: one card per group, a heading, and
 * ruled `label | value` rows. Colour is what separates a blank from an answer.
 *
 * It renders inside a page today and inside a dialog once the journey moves
 * into one, so it owns no shell of its own - the caller supplies the header
 * action, the footer, and the surrounding box.
 */
export function GuardianRequestSummaryView({
  groups,
  renderGroupAction,
}: {
  groups: GuardianSummaryGroup[];
  /** Optional per-group control, e.g. the review's "Edit learning needs". */
  renderGroupAction?: (group: GuardianSummaryGroup) => ReactNode;
}) {
  return <div className={tp.stack}>
    {groups.map(group => <section key={group.title} className={`${tp.card} ${tp.cardPad}`} aria-labelledby={`request-group-${group.step}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 id={`request-group-${group.step}`} className={`text-[13px] ${tp.heading}`}>{group.title}</h3>
        {renderGroupAction?.(group)}
      </div>

      <dl className="mt-3 grid lg:grid-cols-2 lg:gap-x-10">
        {group.rows.map(row => <div
          key={row.label}
          className="flex flex-col gap-0.5 border-b border-j-border/60 py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-3 lg:[&:nth-last-child(2)]:border-b-0"
        >
          <dt className={`flex items-center gap-1.5 sm:w-44 sm:shrink-0 ${tp.rowLabel}`}>
            <span aria-hidden="true" className="shrink-0 text-[#8fb4d0]">{summaryRowIcon(row.label)}</span>{row.label}
          </dt>
          {/* A blank optional answer is a choice and stays grey; a blank
              required one is a gap in the record and reads red, the same way
              the Tutor profile separates the two. */}
          <dd className={`min-w-0 break-words ${row.empty ? (row.optional ? tp.rowValueMuted : tp.rowValueMissing) : tp.rowValue}`}>{row.value}</dd>
        </div>)}
      </dl>
    </section>)}
  </div>;
}
