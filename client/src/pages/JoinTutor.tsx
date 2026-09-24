import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { fieldGrid, fieldLabel, filledField, primaryButton } from "@/components/journeyField";
import { confirmPasswordBorder, GenderField, getPasswordMatch, PasswordField, PasswordMatch, PasswordStrength, PhoneField, PolicyConsent, RegistrationFieldError, registrationFooter, RequiredMark, SignInPrompt } from "@/components/registrationFields";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SiteContentProvider, SiteText, useSiteContentResolver } from "@/lib/siteContent";
import { formatBangladeshMobile, isValidBangladeshLocalMobile, normalizeBangladeshLocalMobile, saveTutorOnboardingDraft } from "@/lib/tutorOnboarding";
import { clearCurrentTutorPortalToken, getCurrentTutorPortalToken, storeCurrentTutorPortalToken } from "@/lib/tutorPortalSession";
import { completeTutorLoginHandoff } from "@/lib/tutorLoginHandoff";
import { TRPCClientError } from "@trpc/client";
import { ArrowRight, ChevronDown, LoaderCircle, MapPin, MapPinned } from "lucide-react";
import React, { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const fieldClass = `${filledField} mt-2`;

const initialForm = {
  name: "",
  phone: "",
  contactEmail: "",
  password: "",
  confirmPassword: "",
  // No default. A pre-ticked answer is the form's guess, not the person's.
  gender: "" as "" | "male" | "female",
  cityId: "",
  locationId: "",
};

type TutorRegistrationForm = typeof initialForm;
type TutorRegistrationErrorKey = keyof TutorRegistrationForm | "agreed";
type TutorRegistrationErrors = Partial<Record<TutorRegistrationErrorKey, string>>;

export const TUTOR_SIGN_IN_HREF = "/auth?role=tutor";
/** Where a completed Tutor registration lands inside the portal. */
export const TUTOR_REGISTRATION_DESTINATION = "/tutor/dashboard/jobs";

/** Validates the whole single-step Tutor registration form at once. */
export function validateTutorRegistration(
  form: TutorRegistrationForm,
  agreed: boolean,
): TutorRegistrationErrors {
  const errors: TutorRegistrationErrors = {};

  // These rules mirror the server `tutorAuthInputSchema` so a value that passes
  // here is not bounced back with a generic error after submission.
  const name = form.name.trim();
  if (name.length < 2) errors.name = "Enter your full name.";
  else if (name.length > 160) errors.name = "Full name must be 160 characters or fewer.";
  if (!form.phone.trim()) errors.phone = "Enter your Bangladesh mobile number after +880.";
  else if (!isValidBangladeshLocalMobile(form.phone)) errors.phone = "Enter a valid 10-digit Bangladesh mobile number after +880.";
  const email = form.contactEmail.trim();
  if (!email) errors.contactEmail = "Enter your email address.";
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.contactEmail = "Enter a valid email address.";
  else if (email.length > 320) errors.contactEmail = "Email address must be 320 characters or fewer.";
  if (!form.password) errors.password = "Create a password with at least 8 characters.";
  else if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
  else if (form.password.length > 128) errors.password = "Password must be 128 characters or fewer.";
  if (!form.confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!form.gender) errors.gender = "Choose your gender to continue.";
  if (!form.cityId) errors.cityId = "Choose your City to continue.";
  if (!form.locationId) errors.locationId = "Choose your Location to continue.";
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
  const [fieldErrors, setFieldErrors] = useState<TutorRegistrationErrors>({});
  const [submitError, setSubmitError] = useState("");
  const resolveSlot = useSiteContentResolver();

  useEffect(() => {
    if (!authLoading && user?.role === "tutor" && getCurrentTutorPortalToken()) navigate("/tutor/dashboard");
  }, [authLoading, navigate, user?.role]);

  const cities = cityCatalog.data ?? [];
  const cityLocations = locationCatalog.data ?? [];
  const locationsLoading = cityCatalog.isLoading || locationCatalog.isLoading;
  const passwordMatch = getPasswordMatch(form.password, form.confirmPassword);

  const focusFirstError = (errors: TutorRegistrationErrors) => {
    const firstErrorField = Object.keys(errors)[0];
    if (!firstErrorField) return;
    window.requestAnimationFrame(() => document.getElementById(firstErrorField)?.focus());
  };

  const update = <Key extends keyof TutorRegistrationForm>(key: Key, value: TutorRegistrationForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    const errors = validateTutorRegistration(form, agreed);
    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }

    let accountCreated = false;
    try {
      const result = await registerTutor.mutateAsync({
        name: form.name.trim(),
        email: form.contactEmail.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: formatBangladeshMobile(form.phone),
        gender: form.gender as "male" | "female",
        cityId: form.cityId,
        locationId: form.locationId,
        termsAccepted: agreed,
      });
      accountCreated = true;
      // Only persist the profile pre-fill once the account actually exists — a
      // failed attempt must not leave a draft that resurfaces in a later session.
      saveTutorOnboardingDraft({
        name: form.name.trim(),
        phone: formatBangladeshMobile(form.phone),
        contactEmail: form.contactEmail.trim(),
        gender: form.gender as "male" | "female",
        cityId: form.cityId,
        locationId: form.locationId,
      });
      if (!result.tutorPortalToken) throw new Error("Tutor portal proof was not issued.");
      await completeTutorLoginHandoff({
        tutorPortalToken: result.tutorPortalToken,
        storeTutorPortalToken: storeCurrentTutorPortalToken,
        clearTutorPortalToken: clearCurrentTutorPortalToken,
        fetchAuthenticatedUser: () => utils.auth.me.fetch(),
        navigate,
        destination: TUTOR_REGISTRATION_DESTINATION,
      });
      toast.success("Tutor account created. Welcome to the Job Board.");
    } catch (cause) {
      // The account already exists server-side; a failure past this point is a
      // sign-in hand-off problem, not a registration one. Don't tell the user to
      // retype and resubmit (that just hits CONFLICT) — send them to sign in.
      if (accountCreated) {
        setSubmitError("Your Tutor account was created. Please sign in to open your dashboard.");
        navigate(TUTOR_SIGN_IN_HREF);
        return;
      }

      const trpcError = cause instanceof TRPCClientError ? cause : null;
      const serverMessage = typeof trpcError?.message === "string" && trpcError.message.trim() ? trpcError.message : null;
      const zodFieldErrors = (trpcError?.data as { zodFieldErrors?: Record<string, string[]> } | null | undefined)?.zodFieldErrors;

      // The server's own input validation is a touch stricter than the checks in
      // validateTutorRegistration for a few edge cases (name length, e-mail shape).
      // Map each rejected field back to its input instead of a single generic line.
      if (zodFieldErrors && Object.keys(zodFieldErrors).length) {
        const fieldByServerName: Partial<Record<string, TutorRegistrationErrorKey>> = {
          name: "name", email: "contactEmail", phone: "phone", password: "password",
          confirmPassword: "confirmPassword", cityId: "cityId", locationId: "locationId",
        };
        const mapped: TutorRegistrationErrors = {};
        for (const [serverField, messages] of Object.entries(zodFieldErrors)) {
          const clientField = fieldByServerName[serverField];
          if (clientField && messages[0]) mapped[clientField] = messages[0];
        }
        if (Object.keys(mapped).length) {
          setFieldErrors(current => ({ ...current, ...mapped }));
          setSubmitError("Please fix the highlighted field and try again.");
          focusFirstError(mapped);
          return;
        }
      }

      // An invalid City/location combination is a fixable input mistake, not a
      // server failure — surface the reason on the location field instead of a
      // generic "check your details".
      if (trpcError?.data?.code === "BAD_REQUEST" && serverMessage) {
        setFieldErrors(current => ({ ...current, cityId: serverMessage }));
        setSubmitError(serverMessage);
        focusFirstError({ cityId: serverMessage });
        return;
      }

      // A duplicate email or mobile number comes back as CONFLICT with a
      // specific, user-ready message. Point at the field that actually clashed
      // instead of blaming the email every time.
      if (trpcError?.data?.code === "CONFLICT" && serverMessage) {
        const clashingField: TutorRegistrationErrorKey = /mobile number/i.test(serverMessage) ? "phone" : "contactEmail";
        setFieldErrors(current => ({ ...current, [clashingField]: serverMessage }));
        setSubmitError(serverMessage);
        focusFirstError({ [clashingField]: serverMessage });
        return;
      }

      // Rate limiting carries an actionable "please wait" message; show it
      // verbatim so the user does not read it as a details problem and retry.
      if (trpcError?.data?.code === "TOO_MANY_REQUESTS" && serverMessage) {
        setSubmitError(serverMessage);
        return;
      }

      const message = "We could not create your account. Please check your details and try again.";
      setSubmitError(message);
    }
  };

  return <SiteContentProvider page="tutor-profile"><div className="site-page min-h-screen bg-j-page text-j-ink">
    <SiteHeader variant="journey" journeyAudience="tutor" />
    <main className="px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-4xl">
        <div className="mb-5 text-center">
          <h1 id="tutor-registration-title" className="text-2xl font-extrabold tracking-[-0.03em] text-j-ink sm:text-3xl"><SiteText slotId="tutor-registration.heading" /></h1>
        </div>

        <form noValidate onSubmit={submitRegistration} className="mx-auto mt-4 rounded-[1.65rem] border border-j-border bg-white p-5 shadow-[0_20px_56px_rgba(27,84,122,0.13)] sm:p-6">
          <section aria-labelledby="tutor-registration-title" className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
            <div className={fieldGrid}>
              <RegistrationFieldError id="name-error" message={fieldErrors.name}><label className="block" htmlFor="name"><span className={fieldLabel}>{resolveSlot("tutor-registration.field.fullName", "Full name")}<RequiredMark /></span><input id="name" required maxLength={160} value={form.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : undefined} className={fieldClass} placeholder="Your full name" autoComplete="name" /></label></RegistrationFieldError>
              <RegistrationFieldError id="gender-error" message={fieldErrors.gender}><GenderField id="gender" name="gender" label={resolveSlot("tutor-registration.field.gender", "Gender")} value={form.gender} onSelect={(value) => update("gender", value)} /></RegistrationFieldError>
              <RegistrationFieldError id="phone-error" message={fieldErrors.phone}><PhoneField id="phone" label={resolveSlot("tutor-registration.field.phone", "Phone number")} value={form.phone} onChange={(value) => update("phone", normalizeBangladeshLocalMobile(value))} placeholder="1XXXXXXXXX" invalid={Boolean(fieldErrors.phone)} describedBy={fieldErrors.phone ? "phone-error" : undefined} /></RegistrationFieldError>
              <RegistrationFieldError id="contactEmail-error" message={fieldErrors.contactEmail}><label className="block" htmlFor="contactEmail"><span className={fieldLabel}>{resolveSlot("tutor-registration.field.email", "Email")}<RequiredMark /></span><input id="contactEmail" required maxLength={320} value={form.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} aria-invalid={Boolean(fieldErrors.contactEmail)} aria-describedby={fieldErrors.contactEmail ? "contactEmail-error" : undefined} className={fieldClass} placeholder="name@example.com" type="email" autoComplete="email" /></label></RegistrationFieldError>
              <RegistrationFieldError id="password-error" message={fieldErrors.password}><PasswordField id="password" label={resolveSlot("tutor-registration.field.password", "Password")} value={form.password} onChange={(value) => update("password", value)} placeholder="At least 8 characters" invalid={Boolean(fieldErrors.password)} describedBy={fieldErrors.password ? "password-error" : "password-strength"}><PasswordStrength id="password-strength" password={form.password} /></PasswordField></RegistrationFieldError>
              <RegistrationFieldError id="confirmPassword-error" message={fieldErrors.confirmPassword}><PasswordField id="confirmPassword" label={resolveSlot("tutor-registration.field.confirmPassword", "Confirm password")} value={form.confirmPassword} onChange={(value) => update("confirmPassword", value)} placeholder="Re-enter your password" invalid={fieldErrors.confirmPassword ? true : passwordMatch ? !passwordMatch.matches : undefined} describedBy={fieldErrors.confirmPassword ? "confirmPassword-error" : passwordMatch ? "password-match" : undefined} inputClassName={confirmPasswordBorder(form.password, form.confirmPassword, fieldErrors.confirmPassword)}><PasswordMatch id="password-match" password={form.password} confirmPassword={form.confirmPassword} /></PasswordField></RegistrationFieldError>
              <RegistrationFieldError id="cityId-error" message={fieldErrors.cityId}><SearchableLocationSelect triggerId="cityId" label="City" slotId="tutor-registration.field.city" required value={form.cityId} options={cities} disabled={cityCatalog.isLoading} placeholder={cityCatalog.isLoading ? "Loading cities…" : "Search a City"} searchPlaceholder="Search City" emptyMessage="No City matches your search." onChange={(cityId) => { setForm((current) => ({ ...current, cityId, locationId: "" })); setFieldErrors((current) => ({ ...current, cityId: undefined, locationId: undefined })); }} /></RegistrationFieldError>
              <RegistrationFieldError id="locationId-error" message={fieldErrors.locationId}><SearchableLocationSelect triggerId="locationId" label="Location" slotId="tutor-registration.field.location" required value={form.locationId} options={cityLocations} disabled={!form.cityId || locationCatalog.isLoading} placeholder={!form.cityId ? "Choose a City first" : locationCatalog.isLoading ? "Loading locations…" : cityLocations.length ? "Search a location" : "No location found for this City"} searchPlaceholder="Search location or Sub-area" emptyMessage="No location matches your search." onChange={(locationId) => update("locationId", locationId)} /></RegistrationFieldError>
            </div>
            <RegistrationFieldError id="agreed-error" message={fieldErrors.agreed}><PolicyConsent id="agreed" checked={agreed} onChange={(checked) => { setAgreed(checked); setFieldErrors((current) => ({ ...current, agreed: undefined })); }} /></RegistrationFieldError>
            {submitError ? <p role="alert" className="mt-4 rounded-xl border border-j-err-border bg-j-err-wash px-4 py-3 text-sm font-semibold leading-6 text-j-err">{submitError}</p> : null}
            <div className={registrationFooter}>
              <SignInPrompt href={TUTOR_SIGN_IN_HREF} />
              <button type="submit" disabled={registerTutor.isPending || locationsLoading} className={`${primaryButton} shrink-0`}>{registerTutor.isPending ? <><LoaderCircle className="animate-spin" size={17} /> Creating your account…</> : <><SiteText slotId="button-section.tutorRegistration.create" fallback="Create Tutor account" /> <ArrowRight size={17} /></>}</button>
            </div>
          </section>
        </form>
      </section>
    </main>
    <SiteFooter />
  </div></SiteContentProvider>;
}

/**
 * A place picker you type into.
 *
 * The field itself is the search box: clicking it opens the list and every
 * keystroke narrows it. It used to be a button that opened a panel with a
 * separate search input inside, which meant nobody could type until they had
 * found and pressed the chevron first - the list looked searchable and did not
 * behave it.
 *
 * Built to the ARIA combobox pattern: focus stays in the input and
 * `aria-activedescendant` moves through the options, so arrow keys and a
 * screen reader agree about which place is highlighted. The chevron is
 * decorative and lets clicks fall through to the input behind it.
 */
export function SearchableLocationSelect({ triggerId, label, slotId, required, value, options, disabled, placeholder, searchPlaceholder, emptyMessage, onChange }: {
  triggerId?: string;
  label: string;
  /** A site-content slot that lets an Owner reword the label; falls back to `label`. */
  slotId?: string;
  required?: boolean;
  value: string;
  options: Array<{ id: string; label: string }>;
  disabled?: boolean;
  /** Shown when nothing is chosen yet. */
  placeholder: string;
  /** Shown while the list is open, where it reads as an instruction to type. */
  searchPlaceholder: string;
  emptyMessage: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selectorRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  // Callers do not always name the field, but it always needs a label to be
  // announced by - and a label that focuses it when clicked.
  const inputId = triggerId ?? `${listId}-field`;
  const resolveSlot = useSiteContentResolver();
  const labelText = resolveSlot(slotId ?? "", label);
  const selected = options.find((option) => option.id === value);
  const normalizedSearch = query.trim().toLocaleLowerCase();
  // An open field with nothing typed offers the whole list; a closed one reads
  // back the chosen place rather than the half-typed search that found it.
  const filteredOptions = useMemo(
    () => (normalizedSearch ? options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedSearch)) : options),
    [normalizedSearch, options],
  );

  const close = () => { setOpen(false); setQuery(""); setActiveIndex(0); };
  const choose = (optionId: string) => { onChange(optionId); close(); };

  useEffect(() => {
    if (disabled) close();
  }, [disabled]);

  useEffect(() => { setActiveIndex(0); }, [normalizedSearch]);

  useEffect(() => {
    if (!open) return;
    const closeWhenOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !selectorRef.current?.contains(target)) close();
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    return () => document.removeEventListener("pointerdown", closeWhenOutside);
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => Math.min(Math.max(current + step, 0), Math.max(filteredOptions.length - 1, 0)));
      return;
    }
    if (event.key === "Enter") {
      // The journey's form spans all three steps, so a stray Enter here must
      // pick a place rather than submit the request.
      if (!open) return;
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) choose(option.id);
      return;
    }
    if (event.key === "Escape" && open) { event.preventDefault(); close(); }
  };

  const activeOption = open ? filteredOptions[activeIndex] : undefined;

  return <div ref={selectorRef} className={`relative block ${open ? "z-40" : "z-0"}`}>
    <label htmlFor={inputId} className={fieldLabel}>{labelText}{required ? <RequiredMark /> : null}</label>
    <span className="relative mt-2 block">
      <MapPin aria-hidden="true" size={16} className="input-text-journey pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-j-accent" />
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOption ? `${listId}-${activeOption.id}` : undefined}
        autoComplete="off"
        disabled={disabled}
        value={open ? query : selected?.label ?? ""}
        placeholder={open ? searchPlaceholder : placeholder}
        onChange={(event) => { setOpen(true); setQuery(event.target.value); }}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`${filledField} !bg-white pl-10 pr-9 font-normal disabled:cursor-not-allowed disabled:opacity-55`}
      />
      <ChevronDown aria-hidden="true" size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5d7b91] transition ${open ? "-rotate-180" : ""}`} />
    </span>
    {open ? <ul id={listId} role="listbox" aria-label={`${labelText} options`} className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-j-border bg-white p-2 shadow-[0_18px_42px_rgba(22,78,117,0.2)]">
      {filteredOptions.length ? filteredOptions.map((option, index) => <li
        key={option.id}
        id={`${listId}-${option.id}`}
        role="option"
        aria-selected={option.id === value}
        // Pointer down would blur the input before the click landed.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(option.id)}
        onMouseEnter={() => setActiveIndex(index)}
        className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${option.id === value ? "bg-j-accent-wash text-[#126ea9]" : index === activeIndex ? "bg-j-surface-sunken text-j-ink-strong" : "text-j-ink-strong"}`}
      ><MapPinned aria-hidden="true" size={14} className="shrink-0 text-[#4d93bd]" />{option.label}</li>) : <li role="presentation" className="px-3 py-5 text-center text-sm font-normal text-[#71899b]">{emptyMessage}</li>}
    </ul> : null}
  </div>;
}
