import { SiteContentProvider } from "@/lib/siteContent";
import { trpc } from "@/lib/trpc";
import { indexResolvedFields } from "@shared/tutor-profile-field-registry";
import { ArrowLeft } from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import { useMemo } from "react";
import { Link } from "wouter";
import { hydrateTeachingProfile } from "./TutorProfileWorkspace";
import { getTutorProfileReadoutSections, withoutMissingRows, type TutorProfileReadoutResolvers } from "./TutorProfileSectionReadout";
import { TutorProfileSummaryView } from "./TutorProfileSummaryView";
import { GuardianTutorProfileHeader } from "@/components/GuardianTutorProfileHeader";

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

    {profileQuery.isLoading ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading Tutor profile…</div> : null}
    {profileQuery.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{profileQuery.error?.message ?? "This Tutor profile is unavailable."}</div> : null}

    {profile ? <>
      <GuardianTutorProfileHeader profile={profile} />

      <SiteContentProvider page="tutor-profile">
        <TutorProfileSummaryView sections={sections} showProgress={false} />
      </SiteContentProvider>
    </> : null}
  </div>;
}
