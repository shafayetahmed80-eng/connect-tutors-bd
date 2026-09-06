import { AlertCircle, Camera, IdCard, Mail, MapPin, PencilLine, Phone, ShieldCheck, Trash2, UserRound } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { GuardianVerificationBadge } from "@/components/GuardianVerificationBadge";
import { GuardianWorkspaceSkeleton, GuardianWorkspaceState } from "@/components/GuardianWorkspaceState";
import { PhotoUploadSuccess } from "@/components/PhotoUploadSuccess";
import { guardianHeardAboutUsValues, guardianNationalityOptions, guardianReligionOptions } from "@shared/guardian-profile";
import { formatRequestSource } from "@shared/request-source";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const IMAGE_ACCEPT = "image/jpeg,image/jpg,image/pjpeg,image/png,image/webp";
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

type GuardianForm = {
  gender: "male" | "female";
  cityLocationId: string;
  locationId: string;
  additionalPhone: string;
  religion: string;
  nationality: string;
  socialLinks: string;
  addressDetails: string;
  profession: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  emergencyContactAddress: string;
  emergencyContactProfession: string;
  heardAboutUs: string;
};

const EMPTY_FORM: GuardianForm = {
  gender: "female", cityLocationId: "", locationId: "",
  additionalPhone: "", religion: "", nationality: "", socialLinks: "", addressDetails: "", profession: "",
  emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "", emergencyContactAddress: "", emergencyContactProfession: "",
  heardAboutUs: "",
};

/** Fields that count toward the completion figure - everything optional the Guardian can fill. */
const COMPLETION_KEYS: (keyof GuardianForm)[] = [
  "additionalPhone", "religion", "nationality", "socialLinks", "addressDetails", "profession",
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "emergencyContactAddress", "emergencyContactProfession",
  "heardAboutUs",
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "G";
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#eef4f9] py-2 last:border-b-0">
      <span className="shrink-0 text-xs text-j-ink-muted">{label}</span>
      <span className={`min-w-0 break-words text-right text-sm ${value ? "font-medium text-j-ink" : "italic text-j-ink-faint"}`}>{value || "Not added"}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-bold text-j-ink-strong">{label}{children}</label>;
}

const inputClass = "rounded-xl border border-j-field-border bg-white px-3 py-2.5 text-sm font-medium text-j-ink outline-none ring-[#1677c8] focus:ring-2";

export default function GuardianProfileWorkspace() {
  const utils = trpc.useUtils();
  const profileQuery = trpc.guardianProfile.me.useQuery();
  const photoQuery = trpc.guardianProfile.photo.useQuery();
  const documentsQuery = trpc.guardianProfile.identityDocuments.useQuery();
  const locationsQuery = trpc.locations.list.useQuery();
  const profile = profileQuery.data;

  const [form, setForm] = useState<GuardianForm>(EMPTY_FORM);
  const [editingTab, setEditingTab] = useState<"personal" | "emergency" | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "emergency">("personal");

  useEffect(() => {
    if (!profile) return;
    setForm({
      gender: profile.gender ?? "female",
      cityLocationId: profile.cityLocationId ?? "",
      locationId: profile.locationId ?? "",
      additionalPhone: profile.additionalPhone ?? "",
      religion: profile.religion ?? "",
      nationality: profile.nationality ?? "",
      socialLinks: profile.socialLinks ?? "",
      addressDetails: profile.addressDetails ?? "",
      profession: profile.profession ?? "",
      emergencyContactName: profile.emergencyContactName ?? "",
      emergencyContactPhone: profile.emergencyContactPhone ?? "",
      emergencyContactRelation: profile.emergencyContactRelation ?? "",
      emergencyContactAddress: profile.emergencyContactAddress ?? "",
      emergencyContactProfession: profile.emergencyContactProfession ?? "",
      heardAboutUs: profile.heardAboutUs ?? "",
    });
  }, [profile]);

  const locations = locationsQuery.data ?? [];
  const cities = useMemo(() => locations.filter(location => location.type === "city"), [locations]);
  const areas = useMemo(() => locations.filter(location => location.parentId === form.cityLocationId), [locations, form.cityLocationId]);
  const cityLabel = locations.find(location => location.id === profile?.cityLocationId)?.label ?? "";
  const areaLabel = locations.find(location => location.id === profile?.locationId)?.label ?? "";
  const addressLine = [areaLabel, cityLabel].filter(Boolean).join(", ");

  const updateMutation = trpc.guardianProfile.update.useMutation({
    onSuccess: async () => {
      await utils.guardianProfile.me.invalidate();
      setEditingTab(null);
      toast.success("Your Guardian profile has been updated.");
    },
    onError: error => toast.error(error.message),
  });

  const set = (patch: Partial<GuardianForm>) => setForm(current => ({ ...current, ...patch }));
  const save = () => {
    if (!profile) return;
    updateMutation.mutate({ name: profile.name ?? "", ...form });
  };

  const completion = useMemo(() => {
    const filled = COMPLETION_KEYS.filter(key => form[key].trim().length > 0).length
      + (profile?.nidFrontUploaded ? 1 : 0) + (profile?.nidBackUploaded ? 1 : 0);
    return Math.round((filled / (COMPLETION_KEYS.length + 2)) * 100);
  }, [form, profile?.nidFrontUploaded, profile?.nidBackUploaded]);

  // --- profile photo -------------------------------------------------------
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoSuccessAt, setPhotoSuccessAt] = useState<number | null>(null);
  const photoUrl = photoQuery.data?.photoUrl ?? null;
  useEffect(() => {
    if (!photoSuccessAt) return;
    const timer = window.setTimeout(() => setPhotoSuccessAt(null), 2800);
    return () => window.clearTimeout(timer);
  }, [photoSuccessAt]);

  const uploadPhoto = async (file: File) => {
    if (!IMAGE_TYPES.includes(file.type.toLowerCase())) return toast.error("Choose a JPEG, PNG, or WebP image.");
    if (file.size > MAX_IMAGE_BYTES) return toast.error("Profile photos must be 20 MB or smaller.");
    setPhotoBusy(true);
    try {
      const body = new FormData();
      body.append("photo", file);
      const response = await fetch("/api/guardian/profile-photo", { method: "POST", body, credentials: "same-origin" });
      const result = await response.json().catch(() => ({})) as { error?: string; photoStatus?: string };
      if (!response.ok || result.photoStatus !== "photo") throw new Error(result.error || "Unable to upload the profile photo.");
      await utils.guardianProfile.photo.invalidate();
      setPhotoSuccessAt(Date.now());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload the profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!window.confirm("Remove this profile photo? Your identity header will use your initials until you upload another.")) return;
    setPhotoBusy(true);
    try {
      const response = await fetch("/api/guardian/profile-photo", { method: "DELETE", credentials: "same-origin" });
      const result = await response.json().catch(() => ({})) as { error?: string; photoStatus?: string };
      if (!response.ok || result.photoStatus !== "no_photo") throw new Error(result.error || "Unable to remove the profile photo.");
      await utils.guardianProfile.photo.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove the profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  // --- NID card images ---------------------------------------------------
  const [nidBusy, setNidBusy] = useState<"front" | "back" | null>(null);
  const nidUrls = documentsQuery.data ?? { front: null, back: null };

  const uploadNid = async (side: "front" | "back", file: File) => {
    if (!IMAGE_TYPES.includes(file.type.toLowerCase())) return toast.error("Choose a JPEG, PNG, or WebP image.");
    if (file.size > MAX_IMAGE_BYTES) return toast.error("NID card images must be 20 MB or smaller.");
    setNidBusy(side);
    try {
      const body = new FormData();
      body.append("document", file);
      const response = await fetch(`/api/guardian/nid-document/${side}`, { method: "POST", body, credentials: "same-origin" });
      const result = await response.json().catch(() => ({})) as { error?: string; nidDocumentStatus?: string };
      if (!response.ok || result.nidDocumentStatus !== "uploaded") throw new Error(result.error || "Unable to upload the NID card image.");
      await Promise.all([utils.guardianProfile.identityDocuments.invalidate(), utils.guardianProfile.me.invalidate()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload the NID card image.");
    } finally {
      setNidBusy(null);
    }
  };

  const removeNid = async (side: "front" | "back") => {
    setNidBusy(side);
    try {
      const response = await fetch(`/api/guardian/nid-document/${side}`, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error("Unable to remove the NID card image.");
      await Promise.all([utils.guardianProfile.identityDocuments.invalidate(), utils.guardianProfile.me.invalidate()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove the NID card image.");
    } finally {
      setNidBusy(null);
    }
  };

  if (profileQuery.isLoading) return <GuardianWorkspaceSkeleton label="Loading your private Guardian profile" />;
  if (profileQuery.error || !profile) {
    return <GuardianWorkspaceState kind="error" title="Profile is temporarily unavailable" message="We could not load your private profile details. Please try again." onRetry={() => { void profileQuery.refetch(); }} />;
  }

  const hasPhoto = Boolean(photoUrl);

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      {/* Identity rail */}
      <section aria-label="Profile summary" className="h-max rounded-2xl border border-j-border bg-white p-5 text-center shadow-sm">
        <div className="relative mx-auto w-28">
          <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-full border border-dashed border-sky-200 bg-[#f4f9fd] text-2xl font-black text-[#1677c8]">
            {hasPhoto ? <img src={photoUrl ?? undefined} alt="Guardian profile photo" className="h-full w-full object-cover" /> : initials(profile.name || "Guardian")}
          </span>
          <button type="button" disabled={photoBusy} onClick={() => photoInputRef.current?.click()} aria-label={hasPhoto ? "Replace profile photo" : "Upload profile photo"}
            className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-2 border-white bg-[#1677c8] text-white shadow-sm transition hover:bg-[#0e4f85] disabled:opacity-60">
            <Camera size={15} aria-hidden={true} />
          </button>
          {photoSuccessAt ? <PhotoUploadSuccess key={photoSuccessAt} className="absolute left-1/2 top-[calc(100%+0.5rem)] -translate-x-1/2 whitespace-nowrap" /> : null}
        </div>
        <input ref={photoInputRef} type="file" className="sr-only" accept={IMAGE_ACCEPT} aria-label="Upload Guardian profile photo"
          onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadPhoto(file); }} />
        {hasPhoto ? (
          <p className="mt-2.5 text-xs">
            <button type="button" disabled={photoBusy} onClick={() => photoInputRef.current?.click()} className="font-semibold text-[#1677c8] hover:underline disabled:opacity-60">{photoBusy ? "Working…" : "Replace"}</button>
            <span className="px-1.5 text-[#c3d1db]" aria-hidden={true}>·</span>
            <button type="button" disabled={photoBusy} onClick={() => void removePhoto()} className="font-semibold text-[#bf3b3b] hover:underline disabled:opacity-60">Remove</button>
          </p>
        ) : <p className="mt-2.5 text-xs text-j-ink-muted">{photoBusy ? "Working…" : "Add a profile photo"}</p>}

        <h2 className="mt-3 break-words text-base font-bold tracking-[-0.02em] text-j-ink">{profile.name || "Your Guardian profile"}</h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-j-ink">
          <IdCard size={15} className="shrink-0 text-[#8fb4d0]" aria-hidden={true} />
          Guardian ID: {profile.guardianId}
        </p>
        <div className="mt-3"><GuardianVerificationBadge status={profile.verificationStatus} rejectionReason={profile.verificationRejectionReason} className="[&>span]:mx-auto [&>span]:flex [&>span]:w-max" /></div>
        <p className="mt-3 border-b border-j-border pb-3 text-xs font-bold text-j-ink">Profile completed: {completion}%</p>

        <div className="mt-4 space-y-2.5 text-left">
          {([[Mail, "Email", profile.email ?? ""], [Phone, "Mobile", profile.phone ?? ""], [Phone, "Additional phone", profile.additionalPhone ?? ""], [MapPin, "Address", addressLine]] as const).map(([Icon, label, value]) => (
            <div key={label} className="flex items-start gap-2.5">
              <Icon size={15} className="mt-0.5 shrink-0 text-[#8fb4d0]" aria-hidden={true} />
              <span className="min-w-0">
                <span className="block text-2xs text-j-ink-muted">{label}</span>
                <span className={`block break-words text-sm ${value ? "font-medium text-j-ink" : "text-j-ink-faint"}`}>{value || "Not added"}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-j-surface-sunken px-3 py-2 text-2xs leading-4 text-j-ink-muted">
          Name, mobile number and email come from your registration. Contact support on WhatsApp to change them.
        </p>
      </section>

      {/* Tabs + read-out */}
      <div className="min-w-0">
        <div className="mb-4 inline-flex rounded-full bg-j-surface-muted p-1" role="tablist" aria-label="Profile sections">
          {(["personal", "emergency"] as const).map(tab => (
            <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${activeTab === tab ? "bg-white text-[#1267c8] shadow-sm" : "text-j-ink-soft"}`}>
              {tab === "personal" ? "Personal Information" : "Emergency Contact"}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-j-border bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="font-bold tracking-[-0.02em] text-j-ink">{activeTab === "personal" ? "Personal Information" : "Emergency Contact"}</h3>
            <Button type="button" variant="outline" onClick={() => setEditingTab(activeTab)} className="h-8 rounded-lg border-[#c9ddeb] px-3 text-xs font-bold text-[#42657d]">
              <PencilLine size={14} /> Edit
            </Button>
          </div>

          {activeTab === "personal" ? (
            <div>
              <ReadRow label="Gender" value={profile.gender === "male" ? "Male" : "Female"} />
              <ReadRow label="Religion" value={profile.religion ?? ""} />
              <ReadRow label="Nationality" value={profile.nationality ?? ""} />
              <ReadRow label="Social profile links" value={profile.socialLinks ?? ""} />
              <ReadRow label="City" value={cityLabel} />
              <ReadRow label="Location" value={areaLabel} />
              <ReadRow label="Address details" value={profile.addressDetails ?? ""} />
              <ReadRow label="Profession" value={profile.profession ?? ""} />
              <ReadRow label="NID card image (front)" value={profile.nidFrontUploaded ? "Uploaded" : ""} />
              <ReadRow label="NID card image (back)" value={profile.nidBackUploaded ? "Uploaded" : ""} />
            </div>
          ) : (
            <div>
              <ReadRow label="Contact name" value={profile.emergencyContactName ?? ""} />
              <ReadRow label="Contact number" value={profile.emergencyContactPhone ?? ""} />
              <ReadRow label="Relation" value={profile.emergencyContactRelation ?? ""} />
              <ReadRow label="Contact address" value={profile.emergencyContactAddress ?? ""} />
              <ReadRow label="Contact profession" value={profile.emergencyContactProfession ?? ""} />
              <ReadRow label="How did you hear about us" value={formatRequestSource(profile.heardAboutUs) === "Not set" ? "" : formatRequestSource(profile.heardAboutUs)} />
            </div>
          )}
        </section>

        <p className="mt-3 flex items-start gap-2 text-2xs leading-4 text-j-ink-muted">
          <ShieldCheck size={13} className="mt-px shrink-0 text-[#8fb4d0]" aria-hidden={true} />
          These details are private. They help our team confirm you are a genuine Guardian and are never shown on the public Job Board.
        </p>
      </div>

      {editingTab === "personal" ? (
        <Modal size="md" onClose={() => setEditingTab(null)} busy={updateMutation.isPending}>
          <ModalHeader title="Personal Information" eyebrow="Edit section" srPrefix="Edit" />
          <ModalBody className="space-y-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Gender"><select value={form.gender} onChange={event => set({ gender: event.target.value as "male" | "female" })} className={inputClass}><option value="female">Female</option><option value="male">Male</option></select></Field>
              <Field label="Additional phone"><input value={form.additionalPhone} maxLength={16} onChange={event => set({ additionalPhone: event.target.value })} className={inputClass} placeholder="Optional" /></Field>
              <Field label="Religion"><select value={form.religion} onChange={event => set({ religion: event.target.value })} className={inputClass}><option value="">Not set</option>{guardianReligionOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></Field>
              <Field label="Nationality"><select value={form.nationality} onChange={event => set({ nationality: event.target.value })} className={inputClass}><option value="">Not set</option>{guardianNationalityOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></Field>
              <Field label="City"><select value={form.cityLocationId} onChange={event => set({ cityLocationId: event.target.value, locationId: "" })} className={inputClass}><option value="">Select city</option>{cities.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}</select></Field>
              <Field label="Location"><select value={form.locationId} disabled={!form.cityLocationId} onChange={event => set({ locationId: event.target.value })} className={`${inputClass} disabled:bg-j-surface-muted`}><option value="">Select location</option>{areas.map(area => <option key={area.id} value={area.id}>{area.label}</option>)}</select></Field>
              <Field label="Profession"><input value={form.profession} maxLength={120} onChange={event => set({ profession: event.target.value })} className={inputClass} placeholder="Ex. Banker" /></Field>
              <Field label="Social profile links"><input value={form.socialLinks} maxLength={500} onChange={event => set({ socialLinks: event.target.value })} className={inputClass} placeholder="Facebook / LinkedIn URL" /></Field>
            </div>
            <Field label="Address details"><textarea value={form.addressDetails} maxLength={255} rows={2} onChange={event => set({ addressDetails: event.target.value })} className={inputClass} placeholder="House, road, area" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["front", "back"] as const).map(side => {
                const url = nidUrls[side];
                return (
                  <div key={side} className="rounded-xl border border-j-border bg-j-surface-sunken p-3">
                    <p className="text-xs font-bold text-j-ink-strong">NID card — {side}</p>
                    {url ? <img src={url} alt={`NID card ${side}`} className="mt-2 h-24 w-full rounded-lg border border-j-border object-cover" /> : <div className="mt-2 grid h-24 place-items-center rounded-lg border border-dashed border-j-field-border text-2xs text-j-ink-faint">No image yet</div>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <label className="cursor-pointer rounded-lg border border-[#c9ddeb] px-2.5 py-1 text-2xs font-bold text-[#42657d] hover:bg-white">
                        {nidBusy === side ? "Working…" : url ? "Replace" : "Upload"}
                        <input type="file" className="sr-only" accept={IMAGE_ACCEPT} disabled={nidBusy === side}
                          onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadNid(side, file); }} />
                      </label>
                      {url ? <button type="button" disabled={nidBusy === side} onClick={() => void removeNid(side)} className="rounded-lg px-2.5 py-1 text-2xs font-bold text-[#bf3b3b] hover:bg-white disabled:opacity-60">Remove</button> : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="flex items-start gap-1.5 text-2xs leading-4 text-j-ink-muted"><AlertCircle size={12} className="mt-px shrink-0" aria-hidden={true} /> Every field here is optional. Uploading your NID helps our team verify you faster; it is stored privately.</p>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" disabled={updateMutation.isPending} onClick={() => setEditingTab(null)} className="rounded-xl">Cancel</Button>
            <Button type="button" disabled={updateMutation.isPending} onClick={save} className="rounded-xl bg-[#1677c8] font-bold hover:bg-[#0e4f85]">{updateMutation.isPending ? "Saving…" : "Save changes"}</Button>
          </ModalFooter>
        </Modal>
      ) : null}

      {editingTab === "emergency" ? (
        <Modal size="md" onClose={() => setEditingTab(null)} busy={updateMutation.isPending}>
          <ModalHeader title="Emergency Contact" eyebrow="Edit section" srPrefix="Edit" />
          <ModalBody className="space-y-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Contact name"><input value={form.emergencyContactName} maxLength={120} onChange={event => set({ emergencyContactName: event.target.value })} className={inputClass} /></Field>
              <Field label="Contact number"><input value={form.emergencyContactPhone} maxLength={16} onChange={event => set({ emergencyContactPhone: event.target.value })} className={inputClass} /></Field>
              <Field label="Relation"><input value={form.emergencyContactRelation} maxLength={60} onChange={event => set({ emergencyContactRelation: event.target.value })} className={inputClass} placeholder="Ex. Brother" /></Field>
              <Field label="Contact profession"><input value={form.emergencyContactProfession} maxLength={120} onChange={event => set({ emergencyContactProfession: event.target.value })} className={inputClass} /></Field>
              <Field label="How did you hear about us"><select value={form.heardAboutUs} onChange={event => set({ heardAboutUs: event.target.value })} className={inputClass}><option value="">Not set</option>{guardianHeardAboutUsValues.map(value => <option key={value} value={value}>{formatRequestSource(value)}</option>)}</select></Field>
            </div>
            <Field label="Contact address"><textarea value={form.emergencyContactAddress} maxLength={255} rows={2} onChange={event => set({ emergencyContactAddress: event.target.value })} className={inputClass} /></Field>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" disabled={updateMutation.isPending} onClick={() => setEditingTab(null)} className="rounded-xl">Cancel</Button>
            <Button type="button" disabled={updateMutation.isPending} onClick={save} className="rounded-xl bg-[#1677c8] font-bold hover:bg-[#0e4f85]">{updateMutation.isPending ? "Saving…" : "Save changes"}</Button>
          </ModalFooter>
        </Modal>
      ) : null}
    </div>
  );
}
