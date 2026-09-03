import React from "react";
import {
  AlignLeft, BookOpen, CalendarClock, CalendarDays, CalendarPlus, GraduationCap,
  Hash, House, IdCard, Layers, Mail, MapPin, Megaphone, Phone, School, UserRound, Users, Wallet,
} from "lucide-react";

/**
 * One place to decide which icon a label gets.
 *
 * The labels themselves live in a dozen different markup shapes - a `<dt>`
 * here, a `<p>` with uppercase tracking there, a chip in a card header - so
 * there is no single component to drop in. What can be shared is the choice:
 * a Job ID is a `Hash` wherever it appears, a posted date is a `CalendarClock`,
 * and a reader who learns the vocabulary on one screen can use it on the next.
 *
 * Sizes: 11px in dense card meta, 12-13px in record rows, 16-17px in fields.
 * Colour comes from the surrounding text, so a muted row mutes its icon too.
 */
export const recordIcon = {
  jobId: Hash,
  requestId: Hash,
  tutorId: IdCard,
  guardianId: IdCard,
  posted: CalendarClock,
  created: CalendarPlus,
  daysPerWeek: CalendarDays,
  packageDuration: CalendarDays,
  tuitionType: House,
  category: GraduationCap,
  classLevel: GraduationCap,
  curriculumType: Layers,
  subjects: BookOpen,
  students: Users,
  studentGender: UserRound,
  tutorGender: Users,
  salary: Wallet,
  location: MapPin,
  institute: School,
  referral: Megaphone,
  notes: AlignLeft,
  email: Mail,
  phone: Phone,
} as const;

export type RecordIconName = keyof typeof recordIcon;

/**
 * The icon for a label, at the size its surroundings use.
 *
 * `aria-hidden` always: every one of these sits beside a written label, so a
 * screen reader that announced it too would say the same thing twice.
 */
export function RecordIcon({ name, size = 13, className }: { name: RecordIconName; size?: number; className?: string }) {
  const Icon = recordIcon[name];
  return <Icon aria-hidden="true" size={size} className={className} />;
}
