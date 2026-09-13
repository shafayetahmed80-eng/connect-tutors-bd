import { ShieldCheck, UserRound } from "lucide-react";

/**
 * Who put a tuition up: an Admin adding it from Posted jobs, or the Guardian
 * posting it themselves. Read from the request's own `postedByAdmin`, not from
 * the Guardian account - an Admin can add a tuition for a Guardian who
 * registered.
 */
export function isAdminPost(postedByAdmin: number | boolean | null | undefined): boolean {
  return Boolean(postedByAdmin);
}

export default function PostTypeBadge({ postedByAdmin, format = "post" }: {
  postedByAdmin: number | boolean | null | undefined;
  /** "Admin Post" on a job card; "Admin" under a Posted By heading. */
  format?: "post" | "short";
}) {
  const admin = isAdminPost(postedByAdmin);
  const Icon = admin ? ShieldCheck : UserRound;
  const label = admin ? "Admin" : "Guardian";
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-bold ${admin ? "bg-violet-50 text-violet-800" : "bg-sky-50 text-sky-800"}`}>
    <Icon size={11} aria-hidden="true" />
    {format === "post" ? `${label} Post` : label}
  </span>;
}
