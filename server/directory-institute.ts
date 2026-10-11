/**
 * The institute an Admin means when they say "প্রতিষ্ঠান": the one on the
 * Tutor's Honours record, falling back to Masters, then to the college of their
 * Higher Secondary and the school of their Secondary (a Tutor may have nothing
 * above those). The caller adds the loose `tutors.institution` text older
 * directory rows carry when none of these is named.
 */
export function pickDirectoryInstitute(
  records: Array<{ qualificationLevel: string | null; instituteName: string | null }>,
): string | null {
  const named = (level: string) => records.find(record => record.qualificationLevel === level && record.instituteName?.trim())?.instituteName ?? null;
  return named("Honours") ?? named("Masters") ?? named("HSC") ?? named("SSC");
}
