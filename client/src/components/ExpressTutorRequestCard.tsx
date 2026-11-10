import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  EXPRESS_POPULAR_CLASSES,
  EXPRESS_CURRICULUM_OPTIONS,
  EXPRESS_COMMON_SUBJECTS,
  type ExpressRequestSource,
} from "@shared/express-tutor-request";
import {
  cleanBangladeshLocalPhoneDigits,
  formatBangladeshLocalPhoneDisplay,
  isValidBangladeshLocalPhone,
} from "@shared/phone";

export const POPULAR_LOCATION_CHIPS = [
  "ধানমন্ডি (Dhanmondi)",
  "মিরপুর (Mirpur)",
  "উত্তরা (Uttara)",
  "গুলশান / বনানী (Gulshan)",
  "মোহাম্মদপুর (Mohammadpur)",
  "বসুন্ধরা আ/এ (Bashundhara)",
  "বাড্ডা / রামপুরা (Badda)",
  "মগবাজার (Moghbazar)",
  "চট্টগ্রাম (Chattogram)",
] as const;

export interface ExpressTutorRequestCardProps {
  source?: ExpressRequestSource;
  className?: string;
  compact?: boolean;
  onSuccess?: (data: { id: number; phone: string }) => void;
  titleOverride?: string;
  subtitleOverride?: string;
}

export function ExpressTutorRequestCard({
  source = "home_hero",
  className = "",
  compact = false,
  onSuccess,
  titleOverride,
  subtitleOverride,
}: ExpressTutorRequestCardProps) {
  const [, setLocation] = useLocation();

  // Form states
  const [phone, setPhone] = useState("");
  const [classCourse, setClassCourse] = useState("Class 9-10 (SSC)");
  const [customClass, setCustomClass] = useState("");
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [curriculumType, setCurriculumType] = useState("Bangla Medium");
  const [locationLabel, setLocationLabel] = useState("");
  const [subjects, setSubjects] = useState("All Subjects");
  const [tuitionType, setTuitionType] = useState<"home" | "online">("home");
  const [honeypot, setHoneypot] = useState("");

  // Validation & submission states
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ id: number; phone: string } | null>(null);

  const isPhoneValid = isValidBangladeshLocalPhone(phone);
  const isLocationValid = locationLabel.trim().length >= 2;
  const effectiveClass = isCustomClass ? customClass.trim() : classCourse;
  const isFormValid = isPhoneValid && isLocationValid && effectiveClass.length > 0;

  const submitMutation = trpc.tutorRequests.submitExpress.useMutation({
    onSuccess: data => {
      setSubmittedData({ id: data.id, phone: data.phone });
      onSuccess?.({ id: data.id, phone: data.phone });
      toast.success("আপনার অনুরোধটি সফলভাবে পাঠানো হয়েছে!");
    },
    onError: error => {
      toast.error(error.message || "অনুরোধ পাঠানো সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneTouched(true);

    if (!isPhoneValid) {
      toast.error("সঠিক ১১ অঙ্কের বাংলাদেশি মোবাইল নম্বর লিখুন।");
      return;
    }
    if (!isLocationValid) {
      toast.error("আপনার এলাকা বা থানা উল্লেখ করুন।");
      return;
    }
    if (!effectiveClass) {
      toast.error("শিক্ষার্থীর শ্রেণি নির্বাচন করুন।");
      return;
    }

    submitMutation.mutate({
      phone,
      classCourse: effectiveClass,
      curriculumType,
      subjects,
      locationLabel: locationLabel.trim(),
      tuitionType,
      source,
      honeypot: honeypot || undefined,
    });
  };

  // SUCCESS VIEW
  if (submittedData) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl transition-all duration-300 ${className}`}
        data-testid="express-request-success"
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-50 blur-2xl" />
        <div className="relative text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
            <CheckCircle2 size={32} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Sparkles size={13} /> অনুরোধ গৃহীত হয়েছে · Lead #{submittedData.id}
          </span>

          <h3 className="mt-3 text-lg font-bold text-slate-900 sm:text-xl">
            ধন্যবাদ! আপনার শিক্ষক খোঁজার অনুরোধ পেয়েছি
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
            আমাদের একজন সিনিয়র টিউশন কোঅর্ডিনেটর দ্রুত আপনার নম্বরে (
            <span className="font-semibold text-slate-900">
              {formatBangladeshLocalPhoneDisplay(submittedData.phone)}
            </span>
            ) যোগাযোগ করে উপযুক্ত সেরা শিক্ষক নিশ্চিত করবেন।
          </p>

          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-left text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <ShieldCheck size={16} className="text-emerald-600" />
              কানেক্ট টিউটরস নিরাপত্তা নিশ্চয়তা:
            </div>
            <p className="mt-1 text-[11px] leading-normal text-slate-500">
              আমরা বাংলাদেশ টিউশন প্রোভাইডার্স অ্যাসোসিয়েশন (Member: BTPA - 077) নিবন্ধিত। কোনো ভুয়া
              তথ্য বা অপ্রয়োজনীয় কল দেওয়া হয় না।
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setSubmittedData(null);
                setPhone("");
                setLocationLabel("");
                setPhoneTouched(false);
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              আরেকটি অনুরোধ পাঠান
            </button>
            <button
              type="button"
              onClick={() => {
                setLocation("/request-tutor");
              }}
              className="flex-1 rounded-xl bg-[#1677E8] py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1265c7]"
            >
              বাজেট ও বিস্তারিত দিন (ঐচ্ছিক) <ArrowRight size={14} className="ml-1 inline" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl transition-all duration-300 ${compact ? "p-4 sm:p-5" : "p-5 sm:p-6"} ${className}`}
      data-testid="express-tutor-request-card"
    >
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <Zap size={16} className="fill-amber-500" />
          </span>
          <div>
            <span className="text-xs font-bold tracking-tight text-slate-900 sm:text-sm">
              {titleOverride || "১৫-সেকেন্ডে শিক্ষক খুঁজুন (Express Request)"}
            </span>
            <p className="text-[11px] text-slate-500">
              {subtitleOverride || "কোনো পাসওয়ার্ড লাগবে না · সম্পূর্ণ ফ্রি ও দ্রুত শিক্ষক নিয়োগ"}
            </p>
          </div>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#1677E8] sm:inline-flex">
          <BadgeCheck size={13} /> BTPA - 077
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        {/* Invisible honeypot for spam bots */}
        <input
          type="text"
          name="user_verification_token"
          value={honeypot}
          onChange={e => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0, width: 0 }}
          aria-hidden="true"
        />

        {/* 1. Phone Input */}
        <div>
          <label className="block text-xs font-bold text-slate-800" htmlFor="express-phone">
            ১. আপনার মোবাইল নম্বর <span className="text-red-500">*</span>
          </label>
          <div
            className={`mt-1.5 flex items-stretch overflow-hidden rounded-xl border bg-slate-50 transition focus-within:border-[#1677E8] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1677E8]/20 ${
              phoneTouched && !isPhoneValid ? "border-red-400 bg-red-50/30" : "border-slate-200"
            }`}
          >
            <span className="flex select-none items-center gap-1 border-r border-slate-200 px-3 text-xs font-bold text-slate-600">
              <Phone size={13} className="text-slate-400" /> +880
            </span>
            <input
              id="express-phone"
              type="tel"
              required
              value={formatBangladeshLocalPhoneDisplay(phone)}
              onChange={e => {
                setPhone(cleanBangladeshLocalPhoneDigits(e.target.value));
                setPhoneTouched(true);
              }}
              placeholder="017XX XXXXXX"
              className="w-full bg-transparent px-3 py-2 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400 tabular-nums sm:text-sm"
              maxLength={14}
              autoComplete="tel-national"
            />
          </div>
          {phoneTouched && !isPhoneValid && (
            <p className="mt-1 text-[11px] text-red-500">
              ১১ অঙ্কের সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)
            </p>
          )}
        </div>

        {/* 2. Class & Medium */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800" htmlFor="express-class">
              ২. শিক্ষার্থীর শ্রেণি ও মাধ্যম <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCustomClass(!isCustomClass)}
              className="text-[11px] font-semibold text-[#1677E8] hover:underline"
            >
              {isCustomClass ? "জনপ্রিয় তালিকা থেকে বাছুন" : "+ অন্য শ্রেণি লিখুন"}
            </button>
          </div>

          {isCustomClass ? (
            <div className="mt-1.5 flex gap-2">
              <input
                id="express-class"
                type="text"
                value={customClass}
                onChange={e => setCustomClass(e.target.value)}
                placeholder="যেমন: Class 9, HSC 2nd Year, Spoken English..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-[#1677E8] focus:bg-white focus:ring-2 focus:ring-[#1677E8]/20 sm:text-sm"
              />
              <select
                value={curriculumType}
                onChange={e => setCurriculumType(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-700 outline-none"
              >
                {EXPRESS_CURRICULUM_OPTIONS.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {EXPRESS_POPULAR_CLASSES.slice(0, 6).map(item => {
                const isSelected = classCourse === item.label;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setClassCourse(item.label);
                      setCurriculumType(item.curriculum);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? "bg-[#1677E8] text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Location / Thana */}
        <div>
          <label className="block text-xs font-bold text-slate-800" htmlFor="express-location">
            ৩. আপনার এলাকা বা থানা <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <MapPin size={14} />
            </span>
            <input
              id="express-location"
              type="text"
              required
              value={locationLabel}
              onChange={e => setLocationLabel(e.target.value)}
              placeholder="যেমন: ধানমন্ডি, মিরপুর ১০, উত্তরা সেক্টর ৪..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-[#1677E8] focus:bg-white focus:ring-2 focus:ring-[#1677E8]/20 sm:text-sm"
            />
          </div>

          {/* Quick Location Chips */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {POPULAR_LOCATION_CHIPS.slice(0, 5).map(loc => {
              const cleanLoc = loc.split(" ")[0];
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocationLabel(loc)}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-blue-50 hover:text-[#1677E8]"
                >
                  {cleanLoc}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Subject and Tuition Mode (Inline Row) */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700" htmlFor="express-subjects">
              পড়ার বিষয় (ঐচ্ছিক)
            </label>
            <select
              id="express-subjects"
              value={subjects}
              onChange={e => setSubjects(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-[#1677E8] focus:bg-white"
            >
              {EXPRESS_COMMON_SUBJECTS.map(subj => (
                <option key={subj} value={subj}>
                  {subj === "All Subjects" ? "সকল বিষয় (All Subjects)" : subj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700">পাঠদানের মাধ্যম</label>
            <div className="mt-1 flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setTuitionType("home")}
                className={`flex-1 rounded-lg py-1 text-center text-xs font-semibold transition ${
                  tuitionType === "home" ? "bg-white text-[#1677E8] shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                হোম টিউশন
              </button>
              <button
                type="button"
                onClick={() => setTuitionType("online")}
                className={`flex-1 rounded-lg py-1 text-center text-xs font-semibold transition ${
                  tuitionType === "online" ? "bg-white text-[#1677E8] shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                অনলাইন
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1677E8] to-[#1265c7] py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60 sm:text-sm"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> অনুরোধ পাঠানো হচ্ছে...
              </>
            ) : (
              <>
                <Zap size={16} className="fill-white" /> বিনামূল্যে শিক্ষক পেতে অনুরোধ পাঠান
              </>
            )}
          </button>
        </div>

        {/* Trust Badges Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-600" /> কোনো পাসওয়ার্ডের ঝামেলা নেই
          </span>
          <span className="font-medium text-slate-600">
            অফিসিয়াল মেম্বার: <strong className="text-slate-800">BTPA - 077</strong>
          </span>
        </div>
      </form>
    </div>
  );
}
