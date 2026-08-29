import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { JourneyProgress } from "@/components/JourneyProgress";
import { fieldLabel, filledField, primaryButton, ghostButton } from "@/components/journeyField";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BANGLADESH_COUNTRY_CODE, formatBangladeshMobile, isValidBangladeshLocalMobile, normalizeBangladeshLocalMobile, saveTutorOnboardingDraft } from "@/lib/tutorOnboarding";
import { clearCurrentTutorPortalLoginHandoff, clearCurrentTutorPortalToken, getCurrentTutorPortalToken, markCurrentTutorPortalLoginHandoff, storeCurrentTutorPortalToken } from "@/lib/tutorPortalSession";
import { completeTutorLoginHandoff } from "@/lib/tutorLoginHandoff";
import { ArrowLeft, ArrowRight, ChevronDown, Eye, EyeOff, LoaderCircle, MapPinned, Search, ShieldCheck } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const fieldClass = `${filledField} mt-2`;

const initialForm = {
  name: "",
  phone: "",
  contactEmail: "",
  password: "",
  confirmPassword: "",
  gender: "male" as "male" | "female",
  cityId: "",
  locationId: "",
};

type TutorRegistrationForm = typeof initialForm;
type TutorRegistrationErrorKey = keyof TutorRegistrationForm | "agreed";
type TutorRegistrationErrors = Partial<Record<TutorRegistrationErrorKey, string>>;

const tutorRegistrationSteps = [
  { label: "Your account", description: "Contact and sign-in details" },
  { label: "Your location", description: "Teaching area and consent" },
] as const;

export const TUTOR_SIGN_IN_HREF = "/auth?role=tutor";

export function validateTutorRegistrationStep(
  step: 1 | 2,
  form: TutorRegistrationForm,
  agreed: boolean,
): TutorRegistrationErrors {
  const errors: TutorRegistrationErrors = {};

  if (step === 1) {
    if (!form.name.trim()) errors.name = "Enter your full name.";
    if (!form.phone.trim()) errors.phone = "Enter your Bangladesh mobile number after +880.";
    else if (!isValidBangladeshLocalMobile(form.phone)) errors.phone = "Enter a valid 10-digit Bangladesh mobile number after +880.";
    if (!form.contactEmail.trim()) errors.contactEmail = "Enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) errors.contactEmail = "Enter a valid email address.";
    if (!form.password) errors.password = "Create a password with at least 8 characters.";
    else if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (!form.confirmPassword) errors.confirmPassword = "Confirm your password.";
    else if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";
    return errors;
  }

  if (!form.cityId) errors.cityId = "Choose your City to continue.";
  if (!form.locationId) errors.locationId = "Choose your Thana, Upazila, Area, or Sub-area to continue.";
  if (!agreed) errors.agreed = "Accept the Terms of Use and Privacy Policy to create your account.";
  return errors;
}

export default function JoinTutor() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const registerTutor = trpc.auth.registerTutor.useMutation();
  const utils = trpc.useUtils();
  const [form, setForm] = useState(initialForm);
  const cityCatalog = trpc.catalog.searchGuardianLocations.useQuery({ query: "", limit: 50, types: ["city"] });
  const locationCatalog = trpc.catalog.searchRegistrationLocations.useQuery({ cityId: form.cityId, query: "", limit: 300 }, { enabled: Boolean(form.cityId) });
  const [agreed, setAgreed] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [fieldErrors, setFieldErrors] = useState<TutorRegistrationErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role === "tutor" && getCurrentTutorPortalToken()) navigate("/tutor/dashboard");
  }, [authLoading, navigate, user?.role]);

  const cities = cityCatalog.data ?? [];
  const cityLocations = locationCatalog.data ?? [];
  const locationsLoading = cityCatalog.isLoading || locationCatalog.isLoading;
  const selectedCity = cities.find((city) => city.id === form.cityId);

  const focusFirstError = (errors: TutorRegistrationErrors) => {
    const firstErrorField = Object.keys(errors)[0];
    if (!firstErrorField) return;
    window.requestAnimationFrame(() => document.getElementById(firstErrorField)?.focus());
  };

  const update = <Key extends keyof TutorRegistrationForm>(key: Key, value: TutorRegistrationForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const continueToLocation = () => {
    const errors = validateTutorRegistrationStep(1, form, agreed);
    setFieldErrors(errors);
    setSubmitError("");
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }
    setActiveStep(2);
  };

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    const errors = {
      ...validateTutorRegistrationStep(1, form, agreed),
      ...validateTutorRegistrationStep(2, form, agreed),
    };
    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      const firstStepHasErrors = Object.keys(validateTutorRegistrationStep(1, form, agreed)).length > 0;
      setActiveStep(firstStepHasErrors ? 1 : 2);
      focusFirstError(errors);
      return;
    }

    try {
      saveTutorOnboardingDraft({
        name: form.name.trim(),
        phone: formatBangladeshMobile(form.phone),
        contactEmail: form.contactEmail.trim(),
        gender: form.gender,
        locationId: form.locationId,
      });
      const result = await registerTutor.mutateAsync({
        name: form.name.trim(),
        email: form.contactEmail.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: formatBangladeshMobile(form.phone),
        gender: form.gender,
        cityId: form.cityId,
        locationId: form.locationId,
      });
      if (!result.tutorPortalToken) throw new Error("Tutor portal proof was not issued.");
      await completeTutorLoginHandoff({
        tutorPortalToken: result.tutorPortalToken,
        storeTutorPortalToken: storeCurrentTutorPortalToken,
        markPortalLoginHandoff: markCurrentTutorPortalLoginHandoff,
        clearTutorPortalToken: clearCurrentTutorPortalToken,
        clearPortalLoginHandoff: clearCurrentTutorPortalLoginHandoff,
        fetchAuthenticatedUser: () => utils.auth.me.fetch(),
        navigate,
      });
      toast.success("Tutor account created. Welcome to your dashboard.");
    } catch (cause) {
      const message = cause instanceof Error && cause.message.includes("already exists")
        ? "An account with this email already exists. Please sign in instead."
        : "We could not create your account. Please check your details and try again.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return <div className="site-page min-h-screen bg-j-page text-j-ink">
    <SiteHeader variant="journey" journeyAudience="tutor" />
    <main className="px-4 py-10 sm:px-6 lg:py-16">
      <section className="mx-auto max-w-4xl">
        <div className="mb-7 max-w-2xl text-center sm:mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full bg-j-accent-wash px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.15em] text-[#1257a8]"><ShieldCheck size={14} aria-hidden="true" /> Tutor registration</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-j-ink sm:text-4xl">Build your Tutor profile in two simple steps.</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#617e96]">Your contact details stay private. Add your teaching preferences after you reach your Tutor Dashboard.</p>
        </div>

        <JourneyProgress activeStep={activeStep} ariaLabel="Tutor registration progress" steps={tutorRegistrationSteps} />

        <form noValidate onSubmit={submitRegistration} className="mx-auto mt-5 rounded-[1.65rem] border border-j-border bg-white p-5 shadow-[0_20px_56px_rgba(27,84,122,0.13)] sm:p-8">
          {activeStep === 1 ? <section aria-labelledby="tutor-account-step-title" className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
            <div className="mb-7 border-b border-[#e6eef4] pb-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-j-accent">Step 1 of 2</p>
              <h2 id="tutor-account-step-title" className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-j-ink">Create your secure account</h2>
              <p className="mt-2 text-sm text-[#617e96]">Use an email and mobile number you can access. You will choose your teaching location next.</p>
            </div>
            <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
              <FieldError id="name-error" message={fieldErrors.name}><label className={fieldLabel} htmlFor="name">Full name <RequiredMark /><input id="name" required value={form.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : undefined} className={fieldClass} placeholder="Your full name" autoComplete="name" /></label></FieldError>
              <fieldset><legend className={fieldLabel}>Gender <RequiredMark /></legend><div className="mt-2 inline-flex rounded-xl bg-[#eef3f8] p-1">{(["male", "female"] as const).map((option) => <label key={option} className={`cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-j-accent/50 ${form.gender === option ? "bg-white text-j-accent shadow-[0_2px_6px_rgba(30,74,110,.12)]" : "text-[#6a8398] hover:text-j-ink-soft"}`}><input type="radio" name="gender" className="sr-only" checked={form.gender === option} onChange={() => update("gender", option)} />{option === "male" ? "Male" : "Female"}</label>)}</div></fieldset>
              <FieldError id="phone-error" message={fieldErrors.phone}><label className={fieldLabel} htmlFor="phone">Phone number <RequiredMark /><span className="mt-2 flex items-stretch overflow-hidden rounded-xl border border-j-field-border bg-j-surface-sunken transition focus-within:border-j-accent focus-within:bg-white focus-within:ring-4 focus-within:ring-j-accent/12"><span className="flex items-center border-r border-j-border px-3.5 text-sm font-bold text-j-ink-soft">{BANGLADESH_COUNTRY_CODE}</span><input id="phone" required value={form.phone} onChange={(event) => update("phone", normalizeBangladeshLocalMobile(event.target.value))} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : undefined} className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-sm text-j-ink outline-none placeholder:text-[#9aabbb]" placeholder="1XXXXXXXXX" inputMode="numeric" pattern="1[3-9][0-9]{8}" maxLength={10} autoComplete="tel-national" /></span></label></FieldError>
              <FieldError id="contactEmail-error" message={fieldErrors.contactEmail}><label className={fieldLabel} htmlFor="contactEmail">Email <RequiredMark /><input id="contactEmail" required value={form.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} aria-invalid={Boolean(fieldErrors.contactEmail)} aria-describedby={fieldErrors.contactEmail ? "contactEmail-error" : undefined} className={fieldClass} placeholder="name@example.com" type="email" autoComplete="email" /></label></FieldError>
              <FieldError id="password-error" message={fieldErrors.password}><label className={fieldLabel} htmlFor="password">Password <RequiredMark /><PasswordInput id="password" value={form.password} onChange={(value) => update("password", value)} show={showPassword} onToggle={() => setShowPassword((current) => !current)} placeholder="At least 8 characters" error={fieldErrors.password} autoComplete="new-password" /></label></FieldError>
              <FieldError id="confirmPassword-error" message={fieldErrors.confirmPassword}><label className={fieldLabel} htmlFor="confirmPassword">Confirm password <RequiredMark /><PasswordInput id="confirmPassword" value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} show={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} placeholder="Re-enter your password" error={fieldErrors.confirmPassword} autoComplete="new-password" /></label></FieldError>
            </div>
            <div className="mt-8 flex flex-col-reverse gap-4 border-t border-[#e5edf3] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#59748b]">Already registered? <Link href={TUTOR_SIGN_IN_HREF} className="font-extrabold text-j-accent underline underline-offset-2">Sign in with email or mobile</Link></p>
              <button type="button" onClick={continueToLocation} className={primaryButton}>Continue to location <ArrowRight size={17} /></button>
            </div>
          </section> : <section aria-labelledby="tutor-location-step-title" className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
            <div className="mb-7 border-b border-[#e6eef4] pb-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-j-accent">Step 2 of 2</p>
              <h2 id="tutor-location-step-title" className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-j-ink">Choose where you want to teach</h2>
              <p className="mt-2 text-sm text-[#617e96]">Your City controls the available Thana, Upazila, Area, and Sub-area choices.</p>
            </div>
            <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
              <FieldError id="cityId-error" message={fieldErrors.cityId}><SearchableLocationSelect triggerId="cityId" label="City" required value={form.cityId} options={cities} disabled={cityCatalog.isLoading} placeholder={cityCatalog.isLoading ? "Loading cities…" : "Search a City"} searchPlaceholder="Search City" emptyMessage="No City matches your search." onChange={(cityId) => { setForm((current) => ({ ...current, cityId, locationId: "" })); setFieldErrors((current) => ({ ...current, cityId: undefined, locationId: undefined })); }} /></FieldError>
              <FieldError id="locationId-error" message={fieldErrors.locationId}><SearchableLocationSelect triggerId="locationId" label="Thana / Upazila / Area / Sub-area" required value={form.locationId} options={cityLocations} disabled={!form.cityId || locationCatalog.isLoading} placeholder={!form.cityId ? "Choose a City first" : locationCatalog.isLoading ? "Loading locations…" : cityLocations.length ? "Search Thana, Upazila, Area, or Sub-area" : "No location found for this City"} searchPlaceholder="Search location or Sub-area" emptyMessage="No location matches your search." countContext={selectedCity?.label} onChange={(locationId) => update("locationId", locationId)} /></FieldError>
            </div>
            <FieldError id="agreed-error" message={fieldErrors.agreed}><label className="mt-7 flex max-w-xl items-start gap-3 rounded-2xl border border-j-border bg-j-surface-sunken p-4 text-sm leading-6 text-[#526f87]" htmlFor="agreed"><input id="agreed" checked={agreed} onChange={(event) => { setAgreed(event.target.checked); setFieldErrors((current) => ({ ...current, agreed: undefined })); }} type="checkbox" className="mt-1 h-4 w-4 rounded border-[#9dbbd1] text-j-accent" /><span>I agree to the <Link href="/terms-conditions" className="font-extrabold text-j-accent underline underline-offset-2">Terms of Use</Link> and <Link href="/privacy-policy" className="font-extrabold text-j-accent underline underline-offset-2">Privacy Policy</Link>.</span></label></FieldError>
            {submitError ? <p role="alert" className="mt-5 rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{submitError}</p> : null}
            <div className="mt-8 flex flex-col-reverse gap-4 border-t border-[#e5edf3] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => { setSubmitError(""); setActiveStep(1); }} className={ghostButton}><ArrowLeft size={17} /> Back</button>
              <button type="submit" disabled={registerTutor.isPending || locationsLoading} className={`${primaryButton} shrink-0`}>{registerTutor.isPending ? <><LoaderCircle className="animate-spin" size={17} /> Creating your account…</> : <>Create Tutor account <ArrowRight size={17} /></>}</button>
            </div>
            <p className="mt-4 text-center text-sm text-[#59748b]">Already registered? <Link href="/tutor/login" className="font-extrabold text-j-accent underline underline-offset-2">Sign in with email</Link></p>
          </section>}
        </form>
      </section>
    </main>
    <SiteFooter />
  </div>;
}

function RequiredMark() {
  return <span className="text-[#dd4b4b]" aria-label="required"> *</span>;
}

function FieldError({ children, id, message }: { children: React.ReactNode; id: string; message?: string }) {
  return <div>{children}{message ? <p id={id} role="alert" className="mt-2 text-xs font-semibold text-[#bd3535]">{message}</p> : null}</div>;
}

function PasswordInput({ id, value, onChange, show, onToggle, placeholder, error, autoComplete }: { id: string; value: string; onChange: (value: string) => void; show: boolean; onToggle: () => void; placeholder: string; error?: string; autoComplete: string }) {
  return <span className="relative mt-2 block"><input id={id} required value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`${filledField} pr-12`} placeholder={placeholder} type={show ? "text" : "password"} autoComplete={autoComplete} minLength={8} /><button type="button" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"} title={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 inline-flex items-center rounded-r-xl px-3 text-j-ink-soft transition hover:text-j-accent focus:outline-none focus:ring-2 focus:ring-j-accent/40">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>;
}

export function SearchableLocationSelect({ triggerId, label, required, value, options, disabled, placeholder, searchPlaceholder, emptyMessage, countContext, onChange }: {
  triggerId?: string;
  label: string;
  required?: boolean;
  value: string;
  options: Array<{ id: string; label: string }>;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  countContext?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const selectorRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(() => options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedSearch)), [normalizedSearch, options]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const closeWhenOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !selectorRef.current?.contains(target)) {
        setOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    return () => document.removeEventListener("pointerdown", closeWhenOutside);
  }, [open]);

  return <div ref={selectorRef} className={`relative block text-[13px] font-semibold text-j-ink-soft ${open ? "z-40" : "z-0"}`}>
    <span>{label} {required ? <RequiredMark /> : <span className="text-[#8aa0b2]">(if applicable)</span>}</span>
    <button id={triggerId} type="button" aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => { setOpen((current) => !current); setSearchTerm(""); }} className={`${fieldClass} flex min-h-10 items-center justify-between gap-2 text-left font-normal disabled:cursor-not-allowed disabled:opacity-55`}>
      <span className={selected ? "truncate" : "truncate text-[#8fa1af]"}>{selected?.label ?? placeholder}</span><ChevronDown size={16} className={`shrink-0 text-[#5d7b91] transition ${open ? "rotate-180" : ""}`} />
    </button>
    {countContext && !disabled && options.length ? <p aria-live="polite" className="mt-1 text-xs font-normal text-[#607f95]">{options.length} locations available in {countContext}</p> : null}
    {open ? <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-j-border bg-white p-2 shadow-[0_18px_42px_rgba(22,78,117,0.2)]">
      <div className="mb-2 flex items-center gap-2 rounded-xl bg-j-surface-sunken px-3 py-2"><Search size={15} className="shrink-0 text-[#4982a7]" /><input aria-label={`${label} search`} autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none placeholder:text-[#83a0b3]" placeholder={searchPlaceholder} /></div>
      {countContext ? <p aria-live="polite" className="mb-2 px-2 text-xs font-medium text-[#607f95]">{searchTerm.trim() ? `${filteredOptions.length} of ${options.length} locations match your search` : `${options.length} locations available in ${countContext}`}</p> : null}
      <div role="listbox" aria-label={`${label} options`} className="max-h-56 overflow-y-auto pr-1">
        {filteredOptions.length ? filteredOptions.map((option) => <button key={option.id} type="button" role="option" aria-selected={option.id === value} onClick={() => { onChange(option.id); setOpen(false); setSearchTerm(""); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-j-surface-sunken ${option.id === value ? "bg-j-accent-wash text-[#126ea9]" : "text-j-ink-strong"}`}><MapPinned size={14} className="shrink-0 text-[#4d93bd]" />{option.label}</button>) : <p className="px-3 py-5 text-center text-sm font-normal text-[#71899b]">{emptyMessage}</p>}
      </div>
    </div> : null}
  </div>;
}
