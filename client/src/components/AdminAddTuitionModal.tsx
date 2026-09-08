import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { SearchableLocationSelect } from "@/pages/JoinTutor";
import {
  getGuardianCurriculumTypesForCategory,
  getGuardianLevelsForCurriculum,
  getGuardianSubjectsForLearningNeed,
  guardianCurriculumCategories,
} from "@/pages/GuardianRequestJourney";
import { formatRequestSource, INSTITUTE_NAME_MAX_LENGTH, REQUEST_SOURCE_VALUES, type RequestSource } from "@shared/request-source";
import { formatStudentGender, formatTuitionType } from "@shared/job-card";
import { parseSalaryAmount } from "@shared/salary-amount";
import { defaultSiteLimits } from "@shared/site-limits";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, Send } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

type TuitionType = "home" | "online" | "group" | "package";
type PreferredGender = "any" | "female" | "male";
type StudentGender = "" | "female" | "male";

/**
 * The whole Guardian journey on one screen, for an Admin typing in a tuition
 * that came from off the site.
 *
 * It is deliberately not the journey's own three steps: an Admin filling in a
 * phone call wants every box in front of them at once, so this trades the
 * journey's roomy 44px fields for a dense three-column grid at 11px. The
 * fields themselves, and which of them are required, are exactly the
 * journey's - the server validates both with one schema.
 */

const label = "block text-[11px] font-semibold leading-tight text-j-ink-soft";
const control = "mt-1 h-8 w-full rounded-lg border border-j-field-border bg-white px-2 text-[11px] text-j-ink outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100";
const star = <span className="text-[#bd3535]">*</span>;

function Field({ title, required, children }: { title: string; required?: boolean; children: ReactNode }) {
  return <label className="block">
    <span className={label}>{title} {required ? star : null}</span>
    {children}
  </label>;
}

function Select({ title, required, value, onChange, options, placeholder, format }: {
  title: string; required?: boolean; value: string; onChange: (value: string) => void;
  options: readonly string[]; placeholder: string; format?: (value: string) => string;
}) {
  return <Field title={title} required={required}>
    <select value={value} onChange={event => onChange(event.target.value)} className={control}>
      <option value="">{placeholder}</option>
      {options.map(option => <option key={option} value={option}>{format ? format(option) : option}</option>)}
    </select>
  </Field>;
}

function Text({ title, required, value, onChange, placeholder, maxLength, inputMode }: {
  title: string; required?: boolean; value: string; onChange: (value: string) => void;
  placeholder?: string; maxLength?: number; inputMode?: "numeric" | "tel" | "text";
}) {
  return <Field title={title} required={required}>
    <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode} className={control} />
  </Field>;
}

/**
 * The location pickers are the journey's own searchable ones rather than a
 * bare `<select>`: the catalog runs to hundreds of areas, and typing into it
 * is the only way an Admin finds one quickly.
 */
function CompactLocation({ children }: { children: ReactNode }) {
  return <div className="[&_button]:h-8 [&_button]:text-[11px] [&_label>span:first-child]:text-[11px] [&_label>span:first-child]:font-semibold">{children}</div>;
}

export default function AdminAddTuitionModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [tuitionType, setTuitionType] = useState<TuitionType>("home");
  const [tuitionCityId, setTuitionCityId] = useState("");
  const [tuitionLocationId, setTuitionLocationId] = useState("");
  const [guardianCityId, setGuardianCityId] = useState("");
  const [guardianLocationId, setGuardianLocationId] = useState("");
  const [category, setCategory] = useState("");
  const [curriculumType, setCurriculumType] = useState("");
  const [classCourse, setClassCourse] = useState("");
  const [studentGender, setStudentGender] = useState<StudentGender>("");
  const [addressDetails, setAddressDetails] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [studentCount, setStudentCount] = useState("1");
  const [groupCapacity, setGroupCapacity] = useState("");
  const [packageDurationMonths, setPackageDurationMonths] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [preferredGender, setPreferredGender] = useState<PreferredGender>("any");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [heardAboutUs, setHeardAboutUs] = useState<RequestSource | "">("");
  const [notes, setNotes] = useState("");

  const online = tuitionType === "online";
  const cities = trpc.catalog.searchGuardianLocations.useQuery({ query: "", limit: 50, types: ["city"] });
  const tuitionLocations = trpc.catalog.searchRegistrationLocations.useQuery({ cityId: tuitionCityId, query: "", limit: 300 }, { enabled: Boolean(tuitionCityId) });
  const guardianLocations = trpc.catalog.searchRegistrationLocations.useQuery({ cityId: guardianCityId, query: "", limit: 300 }, { enabled: Boolean(guardianCityId) });

  const levels = getGuardianLevelsForCurriculum(category);
  const availableSubjects = getGuardianSubjectsForLearningNeed(category, classCourse);
  // The Owner's own limit, falling back to the shipped one - the same read the
  // Guardian journey makes, so both forms cap subjects at the same number.
  const resolvedLimits = trpc.siteLimits.resolved.useQuery();
  const subjectLimit = resolvedLimits.data?.["request.subjects"] ?? defaultSiteLimits()["request.subjects"];

  const post = trpc.admin.createPostedTuition.useMutation({
    onSuccess: () => { toast.success("The tuition is live on the Job Board."); onPosted(); },
    onError: error => toast.error(error.message),
  });

  const changeCategory = (value: string) => {
    setCategory(value);
    setCurriculumType(value === "English Medium" ? curriculumType : "");
    const nextLevel = getGuardianLevelsForCurriculum(value).includes(classCourse) ? classCourse : "";
    setClassCourse(nextLevel);
    const allowed = new Set(getGuardianSubjectsForLearningNeed(value, nextLevel));
    setSubjects(current => current.filter(subject => allowed.has(subject)));
  };

  const changeLevel = (value: string) => {
    setClassCourse(value);
    const allowed = new Set(getGuardianSubjectsForLearningNeed(category, value));
    setSubjects(current => current.filter(subject => allowed.has(subject)));
  };

  const toggleSubject = (subject: string) => setSubjects(current => current.includes(subject)
    ? current.filter(item => item !== subject)
    : current.length < subjectLimit ? [...current, subject] : current);

  const submit = () => {
    const days = Number(daysPerWeek);
    const salary = parseSalaryAmount(salaryAmount);
    if (salary === null) { toast.error("Enter the monthly salary."); return; }
    const base = {
      guardianName: guardianName.trim(),
      guardianPhone: guardianPhone.trim(),
      category, classCourse, subjects, daysPerWeek: days,
      preferredGender, budgetAmount: salary,
      heardAboutUs: heardAboutUs as RequestSource,
      ...(curriculumType ? { curriculumType } : {}),
      ...(studentGender ? { studentGender } : {}),
      ...(addressDetails.trim() ? { addressDetails: addressDetails.trim() } : {}),
      ...(instituteName.trim() ? { instituteName: instituteName.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    const place = { tuitionCityLocationId: tuitionCityId, tuitionLocationId };
    if (tuitionType === "online") {
      post.mutate({ ...base, tuitionType: "online", studentCount: Number(studentCount), guardianCityLocationId: guardianCityId, guardianLocationId });
      return;
    }
    if (tuitionType === "group") { post.mutate({ ...base, ...place, tuitionType: "group", groupCapacity: Number(groupCapacity) }); return; }
    if (tuitionType === "package") { post.mutate({ ...base, ...place, tuitionType: "package", packageDurationMonths: Number(packageDurationMonths), studentCount: Number(studentCount) }); return; }
    post.mutate({ ...base, ...place, tuitionType: "home", studentCount: Number(studentCount) });
  };

  const postButton = <button
    type="button"
    disabled={post.isPending}
    onClick={submit}
    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0f7048] px-4 text-xs font-bold text-white hover:bg-[#0c5b3a] disabled:opacity-50"
  >{post.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}{post.isPending ? "Posting…" : "Post"}</button>;

  return <Modal size="lg" onClose={onClose} busy={post.isPending}>
    {/* On a laptop the Post button sits in the header, top right. On a phone
        the header has no room for it, so it moves to the foot instead. */}
    <ModalHeader title="Add Tuition" action={<span className="hidden sm:inline-flex">{postButton}</span>} />
    <ModalBody>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
        <Text title="Guardian name" required value={guardianName} onChange={setGuardianName} maxLength={160} placeholder="Full name" />
        <Text title="Mobile number" required value={guardianPhone} onChange={setGuardianPhone} maxLength={20} inputMode="tel" placeholder="01XXXXXXXXX" />
        <Select title="Tuition type" required value={tuitionType} onChange={value => setTuitionType(value as TuitionType)} options={["home", "online", "group", "package"]} placeholder="Choose" format={value => formatTuitionType(value)} />

        {online ? <>
          <CompactLocation><SearchableLocationSelect label="Guardian City" value={guardianCityId} options={cities.data ?? []} placeholder="Search a City" searchPlaceholder="Search City" emptyMessage="No City matches." required onChange={value => { setGuardianCityId(value); setGuardianLocationId(""); }} /></CompactLocation>
          <CompactLocation><SearchableLocationSelect label="Guardian Location" value={guardianLocationId} options={guardianLocations.data ?? []} placeholder="Choose a City first" searchPlaceholder="Search location" emptyMessage="No location matches." disabled={!guardianCityId} required onChange={setGuardianLocationId} /></CompactLocation>
        </> : <>
          <CompactLocation><SearchableLocationSelect label="Tuition City" value={tuitionCityId} options={cities.data ?? []} placeholder="Search a City" searchPlaceholder="Search City" emptyMessage="No City matches." required onChange={value => { setTuitionCityId(value); setTuitionLocationId(""); }} /></CompactLocation>
          <CompactLocation><SearchableLocationSelect label="Location" value={tuitionLocationId} options={tuitionLocations.data ?? []} placeholder="Choose a City first" searchPlaceholder="Search location" emptyMessage="No location matches." disabled={!tuitionCityId} required onChange={setTuitionLocationId} /></CompactLocation>
        </>}

        <Select title="Curriculum / category" required value={category} onChange={changeCategory} options={guardianCurriculumCategories} placeholder="Choose a category" />
        {category === "English Medium"
          ? <Select title="Curriculum Type" required value={curriculumType} onChange={setCurriculumType} options={getGuardianCurriculumTypesForCategory(category)} placeholder="Choose a type" />
          : null}
        <Select title="Class / level" required value={classCourse} onChange={changeLevel} options={levels} placeholder={category ? "Choose a level" : "Choose a curriculum first"} />
        <Select title="Student gender" value={studentGender} onChange={value => setStudentGender(value as StudentGender)} options={["female", "male"]} placeholder="No selection" format={value => formatStudentGender(value)} />

        {tuitionType === "group"
          ? <Text title="Maximum students" required value={groupCapacity} onChange={setGroupCapacity} inputMode="numeric" placeholder="2–100" />
          : <Text title="Number of students" required value={studentCount} onChange={setStudentCount} inputMode="numeric" placeholder="1–100" />}
        {tuitionType === "package" ? <Text title="Package duration (months)" required value={packageDurationMonths} onChange={setPackageDurationMonths} inputMode="numeric" placeholder="1–24" /> : null}
        <Select title="Days per week" required value={daysPerWeek} onChange={setDaysPerWeek} options={["1", "2", "3", "4", "5", "6", "7"]} placeholder="Choose days" format={value => `${value} day${value === "1" ? "" : "s"}`} />
        <Select title="Preferred Tutor gender" required value={preferredGender} onChange={value => setPreferredGender(value as PreferredGender)} options={["any", "female", "male"]} placeholder="Choose" format={value => value === "any" ? "Any" : value === "male" ? "Male" : "Female"} />

        <Field title="Monthly salary" required>
          <span className="mt-1 flex h-8 items-stretch overflow-hidden rounded-lg border border-j-field-border bg-white">
            {/* Typed however the Admin writes numbers - 5000, 5,000, even
                "5,000 Taka". `parseSalaryAmount` keeps only the digits. */}
            <input value={salaryAmount} onChange={event => setSalaryAmount(event.target.value)} inputMode="numeric" placeholder="5,000" className="min-w-0 flex-1 px-2 text-[11px] text-j-ink outline-none" />
            <span className="flex items-center border-l border-j-border px-2 text-[10px] font-semibold text-j-ink-muted">Taka</span>
          </span>
        </Field>
        <Text title="Institute Name" value={instituteName} onChange={setInstituteName} maxLength={INSTITUTE_NAME_MAX_LENGTH} placeholder="Optional" />
        <Select title="Where Did You Hear About Us" required value={heardAboutUs} onChange={value => setHeardAboutUs(value as RequestSource)} options={REQUEST_SOURCE_VALUES} placeholder="Choose an answer" format={value => formatRequestSource(value as RequestSource)} />
        <Text title="Address Details" value={addressDetails} onChange={setAddressDetails} maxLength={160} placeholder="Optional" />
      </div>

      <fieldset className="mt-3.5 border-t border-j-border pt-3">
        <legend className="text-[11px] font-semibold text-j-ink-soft">Subject selection {star} <span className="font-normal text-j-ink-muted">— {subjects.length} of {subjectLimit}</span></legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {availableSubjects.map(subject => {
            const selected = subjects.includes(subject);
            return <button
              key={subject}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleSubject(subject)}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${selected ? "border-j-accent bg-j-accent-wash text-[#126ea9]" : "border-[#dbeaf2] bg-white text-[#58758a] hover:bg-j-surface-sunken"}`}
            >{selected ? <Check size={11} aria-hidden={true} /> : null}{subject}</button>;
          })}
        </div>
      </fieldset>

      <label className="mt-3 block">
        <span className={label}>Additional notes</span>
        <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={2} maxLength={2000} className="mt-1 w-full rounded-lg border border-j-field-border bg-white p-2 text-[11px] text-j-ink outline-none focus:border-j-accent focus:ring-2 focus:ring-sky-100" />
      </label>

      <div className="mt-3 flex justify-end sm:hidden">{postButton}</div>
    </ModalBody>
  </Modal>;
}
