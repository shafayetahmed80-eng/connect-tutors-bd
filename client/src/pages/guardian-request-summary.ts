import { formatStudentGender, formatTuitionType, formatTutorPreference } from "@shared/job-card";
import { formatInstituteName, formatRequestSource } from "@shared/request-source";
import { formatSalaryAmount, parseSalaryAmount } from "@shared/salary-amount";
import { formatTutoringTime } from "@shared/tutoring-time";
import type { LearningNeed } from "@shared/learning-needs";

/**
 * One reading of a tuition request, shared by the step 3 review and the page a
 * Guardian lands on after sending it.
 *
 * Both screens show the same request; building the rows once means the review
 * and the confirmation cannot drift into saying different things about it.
 * Every optional field appears here even when it is empty - a blank row reading
 * "Not set" tells the Guardian the question was asked and left unanswered,
 * which a hidden row does not.
 */

export type GuardianSummaryRow = {
  label: string;
  value: string;
  /** True when the field is empty; the view colours it rather than hiding it. */
  empty?: boolean;
  /** An empty optional field is a choice; an empty required one is a gap. */
  optional?: boolean;
};

export type GuardianSummaryGroup = {
  /** Matches the step it came from, so a review can offer "Edit" per group. */
  step: 1 | 2;
  title: string;
  rows: GuardianSummaryRow[];
};

export type GuardianSummaryInput = {
  learningNeeds: LearningNeed[];
  tuitionType: string;
  groupCapacity: string;
  packageDurationMonths: string;
  studentCount: string;
  studentGender: string;
  addressDetails: string;
  daysPerWeek: string;
  /** Optional on purpose: callers built before the field existed omit it. */
  tutoringTime?: string;
  preferredGender: string;
  salaryAmount: string;
  instituteName: string;
  heardAboutUs: string;
};

function filled(label: string, value: string, optional = false): GuardianSummaryRow {
  const text = value.trim();
  return text ? { label, value: text } : { label, value: "Not set", empty: true, optional };
}

function plural(count: string, singular: string) {
  return `${count} ${singular}${count === "1" ? "" : "s"}`;
}

/**
 * One row per curriculum, naming the English Medium type beside it, with each
 * class and the subjects chosen for that class ("Class 5: Math, English").
 * Nothing chosen yet is one empty row, so the review says the question was asked.
 */
function learningNeedRows(needs: LearningNeed[]): GuardianSummaryRow[] {
  if (needs.length === 0) return [{ label: "Curriculum / category", value: "Not set", empty: true }];
  return needs.map(need => {
    const label = need.curriculumType ? `${need.category} (${need.curriculumType})` : need.category;
    const value = need.classes.map(item => `${item.classCourse}: ${item.subjects.join(", ") || "no subject yet"}`).join(" · ");
    return value ? { label, value } : { label, value: "Not set", empty: true };
  });
}

export function buildGuardianRequestSummary(
  input: GuardianSummaryInput,
  notes: string,
  tuitionCityLabel: string,
  tuitionLocationLabel: string,
): GuardianSummaryGroup[] {
  const location = input.tuitionType === "online"
    ? "Online Tuition"
    : [tuitionCityLabel, tuitionLocationLabel].filter(Boolean).join(" — ");

  const headCount: GuardianSummaryRow[] = [];
  if (input.tuitionType === "group") {
    headCount.push(filled("Maximum students", input.groupCapacity && plural(input.groupCapacity, "student")));
  } else {
    headCount.push(filled("Number of students", input.studentCount && plural(input.studentCount, "student")));
  }
  if (input.tuitionType === "package") {
    headCount.push(filled("Package duration", input.packageDurationMonths && plural(input.packageDurationMonths, "month")));
  }

  const salary = parseSalaryAmount(input.salaryAmount);

  return [
    {
      step: 1,
      title: "Learning needs",
      rows: [
        ...learningNeedRows(input.learningNeeds),
        filled("Student gender", input.studentGender ? formatStudentGender(input.studentGender) : "", true),
        filled("Address Details", input.addressDetails, true),
      ],
    },
    {
      step: 2,
      title: "Tuition preferences",
      rows: [
        filled("Tuition type", input.tuitionType ? formatTuitionType(input.tuitionType) : ""),
        ...headCount,
        filled("Location", location),
        filled("Days per week", input.daysPerWeek && plural(input.daysPerWeek, "day")),
        // Free text and a referral answer, in the order the field list sets.
        { label: "Institute Name", value: formatInstituteName(input.instituteName), empty: !input.instituteName.trim(), optional: true },
        { label: "Where Did You Hear About Us", value: formatRequestSource(input.heardAboutUs), empty: !input.heardAboutUs },
        filled("Preferred Tutor gender", input.preferredGender ? formatTutorPreference(input.preferredGender) : ""),
        { label: "Salary", value: formatSalaryAmount(salary), empty: salary === null },
        // Where the form puts it: just above the notes.
        filled("Tutoring Time", formatTutoringTime(input.tutoringTime), true),
        filled("Additional notes", notes, true),
      ],
    },
  ];
}
