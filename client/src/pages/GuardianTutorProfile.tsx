import { SiteContentProvider } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { indexResolvedFields } from "@shared/tutor-profile-field-registry";
import { ArrowLeft, IdCard, Loader2, UserRound } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { hydrateTeachingProfile } from "./TutorProfileWorkspace";
import { getTutorProfileReadoutSections, withoutMissingRows, type TutorProfileReadoutResolvers } from "./TutorProfileSectionReadout";
import { TutorProfileSummaryView } from "./TutorProfileSummaryView";

/**
 * One applicant's profile, as the Guardian whose tuition they applied to reads it.
 *
 * The body is the Tutor's own read-out - the one the Admin's profile page shows
 * too - built from what the server chose to send. Every field a Guardian may not
 * read was left out there, so nothing on this page decides what is private; it
 * only drops rows that are empty, and the Tutor's own progress counts.
 */
export function GuardianTutorProfileContent({ requestId, tutorId }: { requestId: number; tutorId: string }) {
  const profileQuery = trpc.tutorRequests.appliedTutorProfile.useQuery({ requestId, tutorId }, { retry: false });
  const data = profileQuery.data;

  const sections = useMemo(() => {
    if (!data) return [];
    const labels = data.catalogLabels;
    // The server already named every id it sent, so these only read the names back.
    const from = (map: Record<string, string>): ((id: string) => string) => id => map[id] ?? "";
    const resolvers: TutorProfileReadoutResolvers = {
      subject: from(labels.subjects),
      classLevel: from(labels.classLevels),
      curriculum: from(labels.curricula),
      university: from(labels.universities),
      department: from(labels.facultyDepartments),
      location: from(labels.locations),
      area: from(labels.locations),
    };
    return withoutMissingRows(getTutorProfileReadoutSections(
      hydrateTeachingProfile(data.profile as never, null),
      resolvers,
      indexResolvedFields(data.fieldConfig),
    ));
  }, [data]);

  const profile = data?.profile;

  return <div className="mx-auto w-full max-w-5xl space-y-4 pb-10">
    <Link href={`/guardian/dashboard/applied-tutors/${requestId}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-j-accent hover:underline">
      <ArrowLeft size={15} /> Back to Applied Tutors
    </Link>

    {profileQuery.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Tutor profile…</div> : null}
    {profileQuery.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{profileQuery.error?.message ?? "This Tutor profile is unavailable."}</div> : null}

    {profile ? <>
      <section className="rounded-2xl border border-j-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-sky-200 bg-[#f4f9fd] text-j-ink-faint">
            {profile.profilePhotoUrl
              ? <img src={profile.profilePhotoUrl} alt={profile.name ? `${profile.name} profile photo` : "Tutor profile photo"} className="size-full object-cover" />
              : <UserRound size={30} aria-hidden={true} />}
          </span>
          <div className="min-w-0 flex-1">
            {profile.name ? <h2 className="text-lg font-bold tracking-[-0.02em] text-j-ink">{profile.name}</h2> : null}
            {profile.headline ? <p className="mt-0.5 text-sm text-j-ink-soft">{profile.headline}</p> : null}
            {profile.tutorNumber ? <p className="mt-1 inline-flex items-center gap-1 text-2xs text-j-ink-muted"><IdCard size={13} />Tutor ID {profile.tutorNumber}</p> : null}
          </div>
        </div>
      </section>

      <SiteContentProvider page="tutor-profile">
        <TutorProfileSummaryView sections={sections} showProgress={false} />
      </SiteContentProvider>
    </> : null}
  </div>;
}
