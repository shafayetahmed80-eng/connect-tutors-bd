/**
 * How much room is left in a descriptive field, read beside its label.
 *
 * Blue while there is room - the app's own accent, calmer than green and not
 * already spoken for by a status pill elsewhere on the same page. Past the
 * limit it turns the same warning red the Job Board's gender note uses, and
 * counts down past zero rather than freezing at "0 remaining", so a Tutor
 * pasting in a long paragraph can see exactly how much to cut.
 */
export default function CharacterRemaining({ value, maxLength }: { value: string; maxLength: number }) {
  const remaining = maxLength - value.length;
  const over = remaining < 0;
  return <span className={`text-2xs font-bold tabular-nums ${over ? "text-[#bd3535]" : "text-j-accent"}`}>
    {remaining} remaining
  </span>;
}
