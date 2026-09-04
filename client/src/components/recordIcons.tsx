import React from "react";
import {
  AlignLeft, Award, BadgeCheck, BookOpen, Building2, CakeSlice, CalendarClock, CalendarDays,
  CalendarPlus, Car, Clock, Compass, Contact, FileBadge, FileText, Flag, Globe, GraduationCap,
  Hash, Heart, House, IdCard, Landmark, Languages, Layers, Link2, Lock, Mail, MapPin, Megaphone,
  MessageSquare, Phone, School, Send, ShieldAlert, Sparkles, Target, UserRound, Users, Wallet,
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
  // identifiers and dates
  jobId: Hash,
  requestId: Hash,
  tutorId: IdCard,
  guardianId: IdCard,
  posted: CalendarClock,
  created: CalendarPlus,
  birthday: CakeSlice,

  // the tuition itself
  daysPerWeek: CalendarDays,
  packageDuration: CalendarDays,
  timeSlots: Clock,
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
  travel: Car,
  institute: School,
  referral: Megaphone,
  notes: AlignLeft,

  // a person, and how to reach them
  name: UserRound,
  email: Mail,
  phone: Phone,
  address: MapPin,
  nationality: Flag,
  religion: Landmark,
  language: Languages,
  emergency: ShieldAlert,
  family: Heart,
  social: Link2,
  password: Lock,
  contact: Contact,

  // a tutor's own record
  education: GraduationCap,
  degree: Award,
  result: BadgeCheck,
  department: Building2,
  document: FileBadge,
  experience: Target,
  headline: Sparkles,
  about: FileText,
  approach: MessageSquare,
  areas: Compass,
  online: Globe,
  send: Send,
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

/**
 * Which icon a written label gets, looked up by the label itself.
 *
 * Keyed by text rather than carried on the row so the functions that build
 * these records stay plain data a test can read without rendering anything.
 * A label with no entry gets no icon at all - better a clean row than a mark
 * that means nothing.
 */
const LABEL_ICONS: Record<string, RecordIconName> = {
  // guardian request summary
  "Category": "category", "Curriculum Type": "curriculumType", "Class / level": "classLevel",
  "Subjects": "subjects", "Student gender": "studentGender", "Address Details": "address",
  "Tuition type": "tuitionType", "Maximum students": "students", "Number of students": "students",
  "Package duration": "packageDuration", "Location": "location", "Days per week": "daysPerWeek",
  "Institute Name": "institute", "Where Did You Hear About Us": "referral",
  "Preferred Tutor gender": "tutorGender", "Salary": "salary", "Additional notes": "notes",

  // tutor profile - who they are
  "Full name": "name", "Gender": "studentGender", "Date of birth": "birthday",
  "Nationality": "nationality", "Religion": "religion", "Mobile number": "phone",
  "Additional phone": "phone", "Email address": "email", "Present address": "address",
  "Permanent address": "address", "Current location": "location",
  "Social profile links": "social", "Communication preferences": "contact",

  // tutor profile - family and emergency
  "Father's name": "family", "Father's phone number": "phone",
  "Mother's name": "family", "Mother's phone number": "phone",
  "Emergency contact name": "emergency", "Emergency contact phone": "emergency",
  "Emergency contact relation": "emergency", "Emergency contact address": "emergency",

  // tutor profile - education
  "Education level": "education", "Institute": "institute", "Degree / exam title": "degree",
  "Related department / subject": "department", "Dept ID": "department",
  "Result / GPA": "result", "Graduation year": "degree", "Year/semester": "posted",
  "Current study status": "education", "Academic achievement": "result",
  "Qualification history": "degree", "Supporting documents": "document",
  "University ID card": "document",

  // tutor profile - teaching
  "Professional headline": "headline", "About me": "about", "Why choose me": "headline",
  "Teaching approach": "approach", "Special expertise": "experience",
  "Teaching experience (years)": "experience", "Prior teaching experience": "experience",
  "Primary subjects": "subjects", "Additional subjects": "subjects",
  "Curriculum": "curriculumType", "Student types": "students",
  "Preferred class size": "students", "Preferred student gender": "studentGender",
  "Preferred teaching days": "daysPerWeek", "Preferred time slots": "timeSlots",
  "Teaching areas": "areas", "Teaching languages": "language",
  "Available nationwide": "online", "Travel distance (km)": "travel",
  "Minimum monthly fee": "salary", "Maximum monthly fee": "salary",
};

export function labelIconName(label: string): RecordIconName | null {
  return LABEL_ICONS[label] ?? null;
}

/** The icon for a written label, or nothing when the vocabulary has no entry. */
export function LabelIcon({ label, size = 13, className }: { label: string; size?: number; className?: string }) {
  const name = labelIconName(label);
  return name ? <RecordIcon name={name} size={size} className={className} /> : null;
}
