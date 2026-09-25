import AccountChangeHistory from "@/components/AccountChangeHistory";
import {
  ArrowLeft, BookMarked, Briefcase, Camera, Contact, CreditCard, Flag, Home, IdCard, Loader2, Mail, MapPin,
  PencilLine, Phone, ShieldCheck, UserRound, Users, type LucideIcon,
} from "lucide-react";
import { LoadingCradle } from "@/components/BrandMark";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { PhotoUploadSuccess } from "@/components/PhotoUploadSuccess";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
  ADMIN_PROFILE_LIMITS, adminNationalityOptions, adminProfileCompletion, adminReligionOptions, type AdminProfileImageKind,
} from "@shared/admin-profile";

const IMAGE_ACCEPT = "image/jpeg,image/jpg,image/pjpeg,image/png,image/webp";
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

type AdminProfileData = {
  userId: number;
  name: string | null;
  email: string | null;
  loginId: string | null;
  isOwner: boolean;
  phone: string | null;
  additionalPhone: string | null;
  gender: "male" | "female" | null;
  religion: string | null;
  nationality: string | null;
  cityLocationId: string | null;
  locationId: string | null;
  addressDetails: string | null;
  designation: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  emergencyContactAddress: string | null;
  emergencyContactProfession: string | null;
  photoUploaded: boolean;
  nidFrontUploaded: boolean;
  nidBackUploaded: boolean;
};

type AdminProfileImages = { photo: string | null; nidFront: string | null; nidBack: string | null };

type AdminForm = {
  name: string;
  phone: string;
  additionalPhone: string;
  gender: "" | "male" | "female";
  religion: string;
  nationality: string;
  cityLocationId: string;
  locationId: string;
  addressDetails: string;
  designation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  emergencyContactAddress: string;
  emergencyContactProfession: string;
};

type ProfileTab = "personal" | "emergency";

function toForm(profile: AdminProfileData): AdminForm {
  return {
    name: profile.name ?? "",
    phone: profile.phone ?? "",
    additionalPhone: profile.additionalPhone ?? "",
    gender: profile.gender ?? "",
    religion: profile.religion ?? "",
    nationality: profile.nationality ?? "",
    cityLocationId: profile.cityLocationId ?? "",
    locationId: profile.locationId ?? "",
    addressDetails: profile.addressDetails ?? "",
    designation: profile.designation ?? "",
    emergencyContactName: profile.emergencyContactName ?? "",
    emergencyContactPhone: profile.emergencyContactPhone ?? "",
    emergencyContactRelation: profile.emergencyContactRelation ?? "",
    emergencyContactAddress: profile.emergencyContactAddress ?? "",
    emergencyContactProfession: profile.emergencyContactProfession ?? "",
  };
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "A";
}

/** One read-out line, as on the Guardian profile: label column, value beside it, red when unset. */
function ReadRow({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value: string; href?: string | null }) {
  return (
    <div className="flex flex-col gap-px border-b border-[#eef4f9] py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="flex items-center gap-1.5 text-xs text-j-ink-muted sm:w-[152px] sm:shrink-0">
        <Icon size={13} className="shrink-0 text-[#8fb4d0]" aria-hidden={true} />{label}
      </span>
      <span className={`min-w-0 break-words text-sm font-medium sm:flex-1 ${value ? "text-j-ink" : "text-j-err"}`}>
        {value || "Not set"}
        {value && href ? <a href={href} target="_blank" rel="noreferrer" className="ml-2 text-xs font-bold text-[#1677c8] hover:underline">View</a> : null}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-bold text-j-ink-strong">{label}{children}</label>;
}

const inputClass = "rounded-xl border border-j-field-border bg-white px-3 py-2.5 text-sm font-medium text-j-ink outline-none ring-[#1677c8] focus:ring-2";

/** Sends one image to the Admin's own upload address, or removes it. */
async function sendImage(kind: AdminProfileImageKind, file: File | null) {
  const body = file ? new FormData() : undefined;
  if (file && body) body.append("image", file);
  const response = await fetch(`/api/admin/profile-image/${kind}`, { method: file ? "POST" : "DELETE", body, credentials: "same-origin" });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || (file ? "Unable to upload the image." : "Unable to remove the image."));
}

function checkImage(file: File, what: string) {
  if (!IMAGE_TYPES.includes(file.type)) return `${what} must be a JPG, PNG or WebP image.`;
  if (file.size > MAX_IMAGE_BYTES) return `${what} must be 20 MB or smaller.`;
  return null;
}

/**
 * The profile itself: the identity rail and the two tabs. The same view serves
 * an Admin's own page, with its photo control and Edit buttons, and the
 * Project Owner's read-only look at another Admin.
 */
export function AdminProfileView({ profile, images, locations, own }: {
  profile: AdminProfileData;
  images: AdminProfileImages;
  locations: Array<{ id: string; label: string; type: string; parentId: string | null }>;
  /** Present only on the Admin's own page. */
  own?: {
    onEdit: (tab: ProfileTab) => void;
    onPhoto: (file: File | null) => void;
    photoBusy: boolean;
    photoSuccessAt: number | null;
  };
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cityLabel = locations.find(location => location.id === profile.cityLocationId)?.label ?? "";
  const areaLabel = locations.find(location => location.id === profile.locationId)?.label ?? "";
  const addressLine = [profile.addressDetails, areaLabel, cityLabel].filter(Boolean).join(", ");
  const completion = adminProfileCompletion(profile);
  const hasPhoto = Boolean(images.photo);

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <section aria-label="Profile summary" className="nav-section-card h-max rounded-2xl border border-j-border bg-white p-5 text-center shadow-sm">
        <div className="relative mx-auto w-28">
          <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-full border border-dashed border-sky-200 bg-[#f4f9fd] text-2xl font-black text-[#1677c8]">
            {hasPhoto ? <img src={images.photo ?? undefined} alt="Admin profile photo" className="h-full w-full object-cover" /> : initials(profile.name || "Admin")}
          </span>
          {own ? <button type="button" disabled={own.photoBusy} onClick={() => photoInputRef.current?.click()} aria-label={hasPhoto ? "Replace profile photo" : "Upload profile photo"}
            className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-2 border-white bg-[#1677c8] text-white shadow-sm transition hover:bg-[#0e4f85] disabled:opacity-60 max-md:size-10">
            <Camera size={15} aria-hidden={true} />
          </button> : null}
          {own?.photoSuccessAt ? <PhotoUploadSuccess key={own.photoSuccessAt} className="absolute left-1/2 top-[calc(100%+0.5rem)] -translate-x-1/2 whitespace-nowrap" /> : null}
        </div>
        {own ? <>
          <input ref={photoInputRef} type="file" className="sr-only" accept={IMAGE_ACCEPT} aria-label="Upload Admin profile photo"
            onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) own.onPhoto(file); }} />
          {hasPhoto ? (
            <p className="mt-2.5 text-xs">
              <button type="button" disabled={own.photoBusy} onClick={() => photoInputRef.current?.click()} className="inline-flex items-center font-semibold text-[#1677c8] hover:underline disabled:opacity-60 max-md:min-h-10 max-md:px-2">{own.photoBusy ? "Working…" : "Replace"}</button>
              <span className="px-1.5 text-[#c3d1db]" aria-hidden={true}>·</span>
              <button type="button" disabled={own.photoBusy} onClick={() => own.onPhoto(null)} className="inline-flex items-center font-semibold text-[#bf3b3b] hover:underline disabled:opacity-60 max-md:min-h-10 max-md:px-2">Remove</button>
            </p>
          ) : <p className="mt-2.5 text-xs text-j-ink-muted">{own.photoBusy ? "Working…" : "Add a profile photo"}</p>}
        </> : null}

        <h2 className="mt-3 break-words text-base font-bold tracking-[-0.02em] text-j-ink">{profile.name || "Admin"}</h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-j-ink">
          <IdCard size={15} className="shrink-0 text-[#8fb4d0]" aria-hidden={true} />
          User ID: {profile.loginId ?? "Not set"}
        </p>
        <span className="mx-auto mt-3 flex w-max items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
          <ShieldCheck size={13} aria-hidden={true} /> {profile.isOwner ? "Project Owner" : "Administrator"}
        </span>
        <p className="mt-3 border-b border-j-border pb-3 text-xs font-bold text-j-ink">Profile completed: {completion}%</p>

        <div className="mt-4 space-y-2.5 text-left">
          {([[Mail, "Email", profile.email ?? ""], [Phone, "Mobile", profile.phone ?? ""], [Phone, "Additional phone", profile.additionalPhone ?? ""], [MapPin, "Address", addressLine]] as const).map(([Icon, label, value]) => (
            <div key={label} className="flex items-start gap-2.5">
              <Icon size={15} className="mt-0.5 shrink-0 text-[#8fb4d0]" aria-hidden={true} />
              <span className="min-w-0">
                <span className="block text-2xs text-j-ink-muted">{label}</span>
                <span className={`block break-words text-sm font-medium ${value ? "text-j-ink" : "text-j-err"}`}>{value || "Not set"}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="min-w-0">
        <div className="nav-pill-tab mb-4 inline-flex bg-j-surface-muted p-1" role="tablist" aria-label="Profile sections">
          {(["personal", "emergency"] as const).map(tab => (
            <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
              className={`nav-pill-tab px-4 py-1.5 text-sm font-bold transition ${activeTab === tab ? "bg-white text-[#1267c8] shadow-sm" : "text-j-ink-soft"}`}>
              {tab === "personal" ? "Personal Information" : "Emergency Contact"}
            </button>
          ))}
        </div>

        <section className="nav-section-card rounded-2xl border border-j-border bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="font-bold tracking-[-0.02em] text-j-ink">{activeTab === "personal" ? "Personal Information" : "Emergency Contact"}</h3>
            {own ? <Button type="button" variant="outline" onClick={() => own.onEdit(activeTab)} className="h-8 rounded-lg border-[#c9ddeb] px-3 text-xs font-bold text-[#42657d]">
              <PencilLine size={14} /> Edit
            </Button> : null}
          </div>

          {activeTab === "personal" ? (
            <div>
              <ReadRow icon={UserRound} label="Gender" value={profile.gender === "male" ? "Male" : profile.gender === "female" ? "Female" : ""} />
              <ReadRow icon={BookMarked} label="Religion" value={profile.religion ?? ""} />
              <ReadRow icon={Flag} label="Nationality" value={profile.nationality ?? ""} />
              <ReadRow icon={MapPin} label="City" value={cityLabel} />
              <ReadRow icon={MapPin} label="Location" value={areaLabel} />
              <ReadRow icon={Home} label="Address details" value={profile.addressDetails ?? ""} />
              <ReadRow icon={Briefcase} label="Designation" value={profile.designation ?? ""} />
              <ReadRow icon={CreditCard} label="NID card image (front)" value={profile.nidFrontUploaded ? "Uploaded" : ""} href={images.nidFront} />
              <ReadRow icon={CreditCard} label="NID card image (back)" value={profile.nidBackUploaded ? "Uploaded" : ""} href={images.nidBack} />
            </div>
          ) : (
            <div>
              <ReadRow icon={Contact} label="Contact name" value={profile.emergencyContactName ?? ""} />
              <ReadRow icon={Phone} label="Contact number" value={profile.emergencyContactPhone ?? ""} />
              <ReadRow icon={Users} label="Relation" value={profile.emergencyContactRelation ?? ""} />
              <ReadRow icon={Home} label="Contact address" value={profile.emergencyContactAddress ?? ""} />
              <ReadRow icon={Briefcase} label="Contact profession" value={profile.emergencyContactProfession ?? ""} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Loading() {
  return <div className="flex min-h-48 items-center justify-center rounded-xl border border-j-border bg-white text-j-ink-soft"><LoadingCradle className="mr-2" /> Loading the profile…</div>;
}

/** The signed-in Admin's own profile, with its editors. */
export function AdminProfileContent() {
  const utils = trpc.useUtils();
  const profileQuery = trpc.adminProfile.me.useQuery();
  const imagesQuery = trpc.adminProfile.images.useQuery();
  const locationsQuery = trpc.locations.list.useQuery();
  const profile = profileQuery.data;
  const images = imagesQuery.data ?? { photo: null, nidFront: null, nidBack: null };

  const [form, setForm] = useState<AdminForm | null>(null);
  const [editingTab, setEditingTab] = useState<ProfileTab | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoSuccessAt, setPhotoSuccessAt] = useState<number | null>(null);
  const [nidBusy, setNidBusy] = useState<AdminProfileImageKind | null>(null);

  useEffect(() => {
    if (!photoSuccessAt) return;
    const timer = window.setTimeout(() => setPhotoSuccessAt(null), 2800);
    return () => window.clearTimeout(timer);
  }, [photoSuccessAt]);

  const locations = locationsQuery.data ?? [];
  const cities = useMemo(() => locations.filter(location => location.type === "city"), [locations]);
  const areas = useMemo(() => locations.filter(location => location.parentId === form?.cityLocationId), [locations, form?.cityLocationId]);

  const updateMutation = trpc.adminProfile.update.useMutation({
    onSuccess: async () => {
      await utils.adminProfile.me.invalidate();
      // The workspace header shows the name too.
      void utils.admin.getWorkspaceAccess.invalidate();
      setEditingTab(null);
      toast.success("Your profile has been updated.");
    },
    onError: error => toast.error(error.message),
  });

  const refreshImages = async () => {
    // The sidebar block and the header avatar show the photo too.
    await Promise.all([utils.adminProfile.images.invalidate(), utils.adminProfile.me.invalidate(), utils.adminProfile.photo.invalidate()]);
  };

  const changePhoto = async (file: File | null) => {
    if (file) {
      const problem = checkImage(file, "Profile photos");
      if (problem) return void toast.error(problem);
    } else if (!window.confirm("Remove this profile photo?")) return;
    setPhotoBusy(true);
    try {
      await sendImage("photo", file);
      await refreshImages();
      if (file) setPhotoSuccessAt(Date.now());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change the profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const changeNid = async (kind: "nid-front" | "nid-back", file: File | null) => {
    if (file) {
      const problem = checkImage(file, "NID card images");
      if (problem) return void toast.error(problem);
    }
    setNidBusy(kind);
    try {
      await sendImage(kind, file);
      await refreshImages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change the NID card image.");
    } finally {
      setNidBusy(null);
    }
  };

  if (profileQuery.isLoading) return <Loading />;
  if (profileQuery.error || !profile) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{profileQuery.error?.message ?? "The profile could not be loaded."}</div>;
  }

  const openEditor = (tab: ProfileTab) => { setForm(toForm(profile)); setEditingTab(tab); };
  const set = (patch: Partial<AdminForm>) => setForm(current => current ? { ...current, ...patch } : current);
  const save = () => {
    if (!form) return;
    updateMutation.mutate({ ...form, gender: form.gender || null });
  };
  const closeEditor = () => setEditingTab(null);

  return <>
    <AdminProfileView
      profile={profile}
      images={images}
      locations={locations}
      own={{ onEdit: openEditor, onPhoto: file => void changePhoto(file), photoBusy, photoSuccessAt }}
    />

    {editingTab === "personal" && form ? (
      <Modal size="md" onClose={closeEditor} busy={updateMutation.isPending}>
        <ModalHeader title="Personal Information" eyebrow="Edit section" srPrefix="Edit" />
        <ModalBody className="space-y-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            {/* Another Admin asks for a new name or mobile from Settings; only the Owner changes theirs here. */}
            {profile.isOwner ? <>
              <Field label="Name"><input value={form.name} maxLength={ADMIN_PROFILE_LIMITS.name} onChange={event => set({ name: event.target.value })} className={inputClass} /></Field>
              <Field label="Mobile"><input value={form.phone} maxLength={ADMIN_PROFILE_LIMITS.phone} inputMode="tel" onChange={event => set({ phone: event.target.value })} className={inputClass} /></Field>
            </> : null}
            <Field label="Additional phone"><input value={form.additionalPhone} maxLength={ADMIN_PROFILE_LIMITS.additionalPhone} inputMode="tel" onChange={event => set({ additionalPhone: event.target.value })} className={inputClass} /></Field>
            <Field label="Gender"><select value={form.gender} onChange={event => set({ gender: event.target.value as AdminForm["gender"] })} className={inputClass}><option value="">Not set</option><option value="female">Female</option><option value="male">Male</option></select></Field>
            <Field label="Religion"><select value={form.religion} onChange={event => set({ religion: event.target.value })} className={inputClass}><option value="">Not set</option>{adminReligionOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="Nationality"><select value={form.nationality} onChange={event => set({ nationality: event.target.value })} className={inputClass}><option value="">Not set</option>{adminNationalityOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="City"><select value={form.cityLocationId} onChange={event => set({ cityLocationId: event.target.value, locationId: "" })} className={inputClass}><option value="">Select city</option>{cities.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}</select></Field>
            <Field label="Location"><select value={form.locationId} disabled={!form.cityLocationId} onChange={event => set({ locationId: event.target.value })} className={`${inputClass} disabled:bg-j-surface-muted`}><option value="">Select location</option>{areas.map(area => <option key={area.id} value={area.id}>{area.label}</option>)}</select></Field>
            <Field label="Designation"><input value={form.designation} maxLength={ADMIN_PROFILE_LIMITS.designation} onChange={event => set({ designation: event.target.value })} className={inputClass} /></Field>
          </div>
          <Field label="Address details"><textarea value={form.addressDetails} maxLength={ADMIN_PROFILE_LIMITS.addressDetails} rows={2} onChange={event => set({ addressDetails: event.target.value })} className={inputClass} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["nid-front", "nid-back"] as const).map(kind => {
              const url = kind === "nid-front" ? images.nidFront : images.nidBack;
              const side = kind === "nid-front" ? "front" : "back";
              return (
                <div key={kind} className="rounded-xl border border-j-border bg-j-surface-sunken p-3">
                  <p className="text-xs font-bold text-j-ink-strong">NID card — {side}</p>
                  {url ? <img src={url} alt={`NID card ${side}`} className="mt-2 h-24 w-full rounded-lg border border-j-border object-cover" /> : <div className="mt-2 grid h-24 place-items-center rounded-lg border border-dashed border-j-field-border text-2xs text-j-ink-faint">No image yet</div>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#c9ddeb] px-2.5 py-1 text-2xs font-bold text-[#42657d] hover:bg-white max-md:min-h-10 max-md:px-4">
                      {nidBusy === kind ? "Working…" : url ? "Replace" : "Upload"}
                      <input type="file" className="sr-only" accept={IMAGE_ACCEPT} disabled={nidBusy === kind} aria-label={`Upload NID card ${side}`}
                        onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void changeNid(kind, file); }} />
                    </label>
                    {url ? <button type="button" disabled={nidBusy === kind} onClick={() => void changeNid(kind, null)} className="inline-flex items-center rounded-lg px-2.5 py-1 text-2xs font-bold text-[#bf3b3b] hover:bg-white disabled:opacity-60 max-md:min-h-10 max-md:px-4">Remove</button> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" disabled={updateMutation.isPending} onClick={closeEditor} className="rounded-xl">Cancel</Button>
          <Button type="button" disabled={updateMutation.isPending || form.name.trim().length < 2} onClick={save} className="rounded-xl bg-[#1677c8] font-bold hover:bg-[#0e4f85]">{updateMutation.isPending ? "Saving…" : "Save changes"}</Button>
        </ModalFooter>
      </Modal>
    ) : null}

    {editingTab === "emergency" && form ? (
      <Modal size="md" onClose={closeEditor} busy={updateMutation.isPending}>
        <ModalHeader title="Emergency Contact" eyebrow="Edit section" srPrefix="Edit" />
        <ModalBody className="space-y-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Contact name"><input value={form.emergencyContactName} maxLength={ADMIN_PROFILE_LIMITS.emergencyContactName} onChange={event => set({ emergencyContactName: event.target.value })} className={inputClass} /></Field>
            <Field label="Contact number"><input value={form.emergencyContactPhone} maxLength={ADMIN_PROFILE_LIMITS.emergencyContactPhone} inputMode="tel" onChange={event => set({ emergencyContactPhone: event.target.value })} className={inputClass} /></Field>
            <Field label="Relation"><input value={form.emergencyContactRelation} maxLength={ADMIN_PROFILE_LIMITS.emergencyContactRelation} onChange={event => set({ emergencyContactRelation: event.target.value })} className={inputClass} /></Field>
            <Field label="Contact profession"><input value={form.emergencyContactProfession} maxLength={ADMIN_PROFILE_LIMITS.emergencyContactProfession} onChange={event => set({ emergencyContactProfession: event.target.value })} className={inputClass} /></Field>
          </div>
          <Field label="Contact address"><textarea value={form.emergencyContactAddress} maxLength={ADMIN_PROFILE_LIMITS.emergencyContactAddress} rows={2} onChange={event => set({ emergencyContactAddress: event.target.value })} className={inputClass} /></Field>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" disabled={updateMutation.isPending} onClick={closeEditor} className="rounded-xl">Cancel</Button>
          <Button type="button" disabled={updateMutation.isPending || form.name.trim().length < 2} onClick={save} className="rounded-xl bg-[#1677c8] font-bold hover:bg-[#0e4f85]">{updateMutation.isPending ? "Saving…" : "Save changes"}</Button>
        </ModalFooter>
      </Modal>
    ) : null}
  </>;
}

/** Another Admin's profile, read-only, for the Project Owner. */
export function AdminProfileOwnerViewContent({ userId }: { userId: number }) {
  const view = trpc.adminProfile.view.useQuery({ userId }, { retry: false });
  const locationsQuery = trpc.locations.list.useQuery();
  return <div className="space-y-4">
    <Link href="/admin/admin-profiles" className="inline-flex items-center gap-1.5 text-sm font-bold text-j-accent hover:underline">
      <ArrowLeft size={15} /> Back to Admin Profiles
    </Link>
    {view.isLoading ? <Loading /> : null}
    {view.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{view.error.message}</div> : null}
    {view.data ? <AdminProfileView profile={view.data.profile} images={view.data.images} locations={locationsQuery.data ?? []} /> : null}
    {view.data ? <AccountChangeHistory userId={userId} /> : null}
  </div>;
}

export default function AdminProfile() {
  const [, params] = useRoute("/admin/profile/:userId");
  const userId = Number(params?.userId);
  const other = Number.isInteger(userId) && userId > 0;
  return <AdminWorkspaceLayout title="Admin Profile">
    {other ? <AdminProfileOwnerViewContent userId={userId} /> : <AdminProfileContent />}
  </AdminWorkspaceLayout>;
}
