/**
 * A Tutor who offers only online tuition has no place to teach in, so Teaching
 * Areas is theirs to leave empty. Anyone who offers anything else, alone or
 * alongside it, must still say where.
 *
 * One answer for the form, the completion count and the server's submission
 * check, so they cannot disagree about who has to fill it in.
 */
export function offersOnlineTuitionOnly(value: { tuitionTypes?: readonly string[] }): boolean {
  return value.tuitionTypes?.length === 1 && value.tuitionTypes[0] === "online";
}
