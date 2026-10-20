import { useEffect, useMemo, useState } from "react";
import {
  ALargeSmall, Check, Eye, Monitor, RotateCcw,
  Sliders, Smartphone, Sparkles, Type,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { homeCopy } from "@shared/public-content";
import {
  allStudioFonts,
  loadStudioFont,
  setUploadedStudioFonts,
  studioFontFamily,
  studioFonts,
  type StudioFont,
} from "@/lib/image-studio-fonts";

const LETTER_SPACING_PRESETS = [
  { value: "normal", label: "স্বাভাবিক / Normal (0)", tip: "বাংলা লেখার জন্য সেরা" },
  { value: "-0.02em", label: "হালকা টাইট / Tight (-0.02em)", tip: "মিডিয়াম ব্যালেন্স" },
  { value: "-0.052em", label: "ব্র্যান্ড ডিফল্ট (-0.052em)", tip: "ল্যাটিন/ইংরেজি জন্য কম্প্যাক্ট" },
  { value: "-0.071em", label: "বেশি টাইট (-0.071em)", tip: "বড় হেডিংয়ের জন্য" },
  { value: "0.02em", label: "প্রশস্ত / Wide (+0.02em)", tip: "খোলামেলা লুক" },
] as const;

export default function HomeHeroTypographySuite() {
  const utils = trpc.useUtils();
  const overridesQuery = trpc.siteContent.list.useQuery({ page: "home" });
  const uploadedQuery = trpc.imageStudio.uploadedFonts.useQuery();
  const saveMutation = trpc.siteContent.save.useMutation();
  const resetMutation = trpc.siteContent.reset.useMutation();

  // Load uploaded studio fonts into library
  if (uploadedQuery.data) {
    setUploadedStudioFonts(uploadedQuery.data);
  }

  // Active overrides mapping
  const stored = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of overridesQuery.data ?? []) {
      if (row.text != null) {
        map.set(row.slotId, row.text);
      }
    }
    return map;
  }, [overridesQuery.data]);

  // Form states with homeCopy initial values
  const [lead, setLead] = useState<string>(() => homeCopy.hero.title.lead);
  const [accent, setAccent] = useState<string>(() => homeCopy.hero.title.accent);
  const [tail, setTail] = useState<string>(() => homeCopy.hero.title.tail ?? "");
  const [description, setDescription] = useState<string>(() => homeCopy.hero.description);
  const [fontFamily, setFontFamily] = useState<string>("default");
  const [letterSpacing, setLetterSpacing] = useState<string>("-0.052em");
  const [desktopSizePx, setDesktopSizePx] = useState(56);
  const [mobileSizePx, setMobileSizePx] = useState(18);
  const [hideMobileDesc, setHideMobileDesc] = useState(true);
  const [singleLineMobile, setSingleLineMobile] = useState(true);

  // Preview mode tab
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile">("mobile");
  const [saving, setSaving] = useState(false);

  // Keyed on contents rather than map reference to prevent re-seeding on fresh array returns
  const storedKey = JSON.stringify(Array.from(stored.entries()));

  // Sync state when stored overrides change
  useEffect(() => {
    setLead(stored.get("home.hero.title.lead") ?? homeCopy.hero.title.lead);
    setAccent(stored.get("home.hero.title.accent") ?? homeCopy.hero.title.accent);
    setTail(stored.get("home.hero.title.tail") ?? (homeCopy.hero.title.tail ?? ""));
    setDescription(stored.get("home.hero.description") ?? homeCopy.hero.description);
    setFontFamily(stored.get("home.hero.fontFamily") ?? "default");
    setLetterSpacing(stored.get("home.hero.letterSpacing") ?? "-0.052em");
    setDesktopSizePx(Number.parseInt(stored.get("home.hero.desktopSizePx") ?? "56", 10) || 56);
    setMobileSizePx(Number.parseInt(stored.get("home.hero.mobileSizePx") ?? "18", 10) || 18);
    setHideMobileDesc((stored.get("home.hero.hideMobileDesc") ?? "true") === "true");
    setSingleLineMobile((stored.get("home.hero.singleLineMobile") ?? "true") === "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedKey]);

  // Ensure font is loaded when selected so preview immediately reflects it
  useEffect(() => {
    if (fontFamily && fontFamily !== "default") {
      void loadStudioFont(fontFamily);
    }
  }, [fontFamily]);

  // Calculate dirty status
  const isDirty = useMemo(() => {
    const currentLead = stored.get("home.hero.title.lead") ?? homeCopy.hero.title.lead;
    const currentAccent = stored.get("home.hero.title.accent") ?? homeCopy.hero.title.accent;
    const currentTail = stored.get("home.hero.title.tail") ?? (homeCopy.hero.title.tail ?? "");
    const currentDesc = stored.get("home.hero.description") ?? homeCopy.hero.description;
    const currentFont = stored.get("home.hero.fontFamily") ?? "default";
    const currentSpacing = stored.get("home.hero.letterSpacing") ?? "-0.052em";
    const currentDeskPx = Number.parseInt(stored.get("home.hero.desktopSizePx") ?? "56", 10) || 56;
    const currentMobPx = Number.parseInt(stored.get("home.hero.mobileSizePx") ?? "18", 10) || 18;
    const currentHideDesc = (stored.get("home.hero.hideMobileDesc") ?? "true") === "true";
    const currentSingleLine = (stored.get("home.hero.singleLineMobile") ?? "true") === "true";

    return (
      lead !== currentLead ||
      accent !== currentAccent ||
      tail !== currentTail ||
      description !== currentDesc ||
      fontFamily !== currentFont ||
      letterSpacing !== currentSpacing ||
      desktopSizePx !== currentDeskPx ||
      mobileSizePx !== currentMobPx ||
      hideMobileDesc !== currentHideDesc ||
      singleLineMobile !== currentSingleLine
    );
  }, [
    stored, lead, accent, tail, description, fontFamily,
    letterSpacing, desktopSizePx, mobileSizePx, hideMobileDesc, singleLineMobile,
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const tasks = [
        {
          slotId: "home.hero.title.lead",
          text: lead === homeCopy.hero.title.lead ? null : lead,
        },
        {
          slotId: "home.hero.title.accent",
          text: accent === homeCopy.hero.title.accent ? null : accent,
        },
        {
          slotId: "home.hero.title.tail",
          text: tail === (homeCopy.hero.title.tail ?? "") ? null : tail,
        },
        {
          slotId: "home.hero.description",
          text: description === homeCopy.hero.description ? null : description,
        },
        {
          slotId: "home.hero.fontFamily",
          text: fontFamily === "default" ? null : fontFamily,
        },
        {
          slotId: "home.hero.letterSpacing",
          text: letterSpacing === "-0.052em" ? null : letterSpacing,
        },
        {
          slotId: "home.hero.desktopSizePx",
          text: desktopSizePx === 56 ? null : String(desktopSizePx),
        },
        {
          slotId: "home.hero.mobileSizePx",
          text: mobileSizePx === 18 ? null : String(mobileSizePx),
        },
        {
          slotId: "home.hero.hideMobileDesc",
          text: hideMobileDesc ? null : "false",
        },
        {
          slotId: "home.hero.singleLineMobile",
          text: singleLineMobile ? null : "false",
        },
      ];

      for (const task of tasks) {
        await saveMutation.mutateAsync({
          slotId: task.slotId,
          text: task.text,
        });
      }

      await utils.siteContent.list.invalidate({ page: "home" });
      toast.success("হোমপেইজ হিরো টাইপোগ্রাফি ও সেটিংস সফলভাবে সংরক্ষিত হয়েছে।");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "সংরক্ষণ করা সম্ভব হয়নি।");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("আপনি কি হিরো সেকশনের সব সেটিংস ডিফল্ট মানে ফিরিয়ে নিতে চান?")) return;
    setSaving(true);
    try {
      const slotIds = [
        "home.hero.title.lead",
        "home.hero.title.accent",
        "home.hero.title.tail",
        "home.hero.description",
        "home.hero.fontFamily",
        "home.hero.letterSpacing",
        "home.hero.desktopSizePx",
        "home.hero.mobileSizePx",
        "home.hero.hideMobileDesc",
        "home.hero.singleLineMobile",
      ];
      for (const slotId of slotIds) {
        if (stored.has(slotId)) {
          await resetMutation.mutateAsync({ slotId });
        }
      }
      await utils.siteContent.list.invalidate({ page: "home" });
      toast.success("ডিফল্ট সেটিংস সফলভাবে ফিরিয়ে আনা হয়েছে।");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "রিসেট করা সম্ভব হয়নি।");
    } finally {
      setSaving(false);
    }
  };

  // Group fonts for dropdown
  const allFonts = allStudioFonts();
  const banglaFonts = allFonts.filter(f => f.script === "bn");
  const englishFonts = allFonts.filter(f => f.script === "en");
  const uploadedFonts = allFonts.filter(f => f.uploaded);

  // Active family css name for preview
  const previewFontFamily =
    fontFamily && fontFamily !== "default"
      ? `"${studioFontFamily(fontFamily)}", "DM Sans", "Noto Sans Bengali", sans-serif`
      : '"DM Sans", "Noto Sans Bengali", sans-serif';

  return (
    <div className="rounded-2xl border border-j-border bg-white p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-j-border pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-j-ink">
            <Sparkles className="size-5 text-j-accent" />
            হোমপেইজ হিরো টাইপোগ্রাফি ও ডিসপ্লে কন্ট্রোল
          </h2>
          <p className="text-xs text-j-ink-soft">
            শিরোনাম, পোস্টার ফন্ট ফ্যামিলি, সাইজ, লেটার স্পেসিং ও মোবাইলে ১-লাইন ডিসপ্লে কনফিগার করুন।
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
              পরিবর্তন বাকি
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-j-border px-3 text-xs font-bold text-j-ink-soft hover:bg-j-surface-sunken disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" /> ডিফল্ট
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !isDirty}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-j-accent px-4 text-xs font-bold text-white hover:bg-j-accent-hover disabled:opacity-50"
          >
            <Check className="size-3.5" /> সংরক্ষণ করুন
          </button>
        </div>
      </div>

      {/* Grid: Controls Left, Live Preview Right */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Controls Column (7 cols) */}
        <div className="space-y-5 lg:col-span-7">
          {/* 1. Heading Content */}
          <div className="space-y-3 rounded-xl border border-j-border bg-j-surface p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-j-ink">
              <Type className="size-4 text-j-accent" />
              ১. শিরোনাম লেখা (Heading Text)
            </h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-2xs font-bold text-j-ink-soft">
                  প্রথম অংশ (Lead)
                </label>
                <input
                  type="text"
                  value={lead}
                  onChange={e => setLead(e.target.value)}
                  placeholder="Build your "
                  className="h-control w-full rounded-xl border border-j-border bg-white px-3 text-sm focus:border-j-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-2xs font-bold text-j-accent">
                  রঙিন অংশ (Accent)
                </label>
                <input
                  type="text"
                  value={accent}
                  onChange={e => setAccent(e.target.value)}
                  placeholder="learning connection"
                  className="h-control w-full rounded-xl border border-j-accent bg-sky-50/50 px-3 text-sm font-semibold text-j-ink focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-2xs font-bold text-j-ink-soft">
                  শেষ অংশ (Tail)
                </label>
                <input
                  type="text"
                  value={tail}
                  onChange={e => setTail(e.target.value)}
                  placeholder=" with the right tutor."
                  className="h-control w-full rounded-xl border border-j-border bg-white px-3 text-sm focus:border-j-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Sub-heading */}
            <div className="pt-2">
              <label className="mb-1 block text-2xs font-bold text-j-ink-soft">
                সাব-শিরোনাম (Description)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-j-border bg-white p-3 text-xs leading-relaxed focus:border-j-accent focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Font Family (Image Studio Fonts) */}
          <div className="space-y-3 rounded-xl border border-j-border bg-j-surface p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-j-ink">
              <ALargeSmall className="size-4 text-j-accent" />
              ২. ফন্ট ফ্যামিলি (Font Family — ইমেজ সেকশনের ফন্ট লাইব্রেরি)
            </h3>
            <select
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value)}
              className="h-control w-full rounded-xl border border-j-border bg-white px-3 text-sm font-medium focus:border-j-accent focus:outline-none"
            >
              <option value="default">ডিফল্ট ফন্ট (DM Sans / Noto Sans Bengali)</option>
              {banglaFonts.length > 0 && (
                <optgroup label="─── বাংলা ফন্টসমূহ (Bangla Fonts) ───">
                  {banglaFonts.map(font => (
                    <option key={font.id} value={font.id}>
                      {font.code} · {font.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {englishFonts.length > 0 && (
                <optgroup label="─── English Fonts ───">
                  {englishFonts.map(font => (
                    <option key={font.id} value={font.id}>
                      {font.code} · {font.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {uploadedFonts.length > 0 && (
                <optgroup label="─── আপলোডকৃত ফন্ট (Uploaded Fonts) ───">
                  {uploadedFonts.map(font => (
                    <option key={font.id} value={font.id}>
                      {font.code} · {font.name} (Uploaded)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-2xs text-j-ink-soft">
              * ইমেজ সেকশনের পোস্টার স্টুডিওর ১৩টি বাংলা ও ৩০টি ইংলিশ ফন্ট থেকে সরাসরি যে কোনোটি বেছে নেওয়া যাবে।
            </p>
          </div>

          {/* 3. Font Sizes (Desktop & Mobile) */}
          <div className="space-y-3 rounded-xl border border-j-border bg-j-surface p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-j-ink">
              <Sliders className="size-4 text-j-accent" />
              ৩. ফন্ট সাইজ (Font Sizes)
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Desktop Size */}
              <div className="space-y-1.5 rounded-lg border border-j-border/80 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-j-ink">
                    <Monitor className="size-3.5 text-j-accent" /> ডেসকটপ সাইজ
                  </span>
                  <span className="rounded-md bg-j-surface px-2 py-0.5 text-xs font-bold text-j-accent">
                    {desktopSizePx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={32}
                  max={72}
                  step={1}
                  value={desktopSizePx}
                  onChange={e => setDesktopSizePx(Number(e.target.value))}
                  className="w-full accent-[var(--j-accent)]"
                />
                <span className="text-2xs text-j-ink-soft">রেফারেন্স ডিফল্ট: ৫৬px</span>
              </div>

              {/* Mobile Size */}
              <div className="space-y-1.5 rounded-lg border border-j-border/80 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-j-ink">
                    <Smartphone className="size-3.5 text-j-accent" /> মোবাইল সাইজ (ছোট)
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                    {mobileSizePx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={28}
                  step={1}
                  value={mobileSizePx}
                  onChange={e => setMobileSizePx(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <span className="text-2xs text-j-ink-soft">মোবাইলে ১ লাইনে ফিট হওয়ার জন্য ১৮px রেকমেন্ডেড</span>
              </div>
            </div>
          </div>

          {/* 4. Letter Spacing */}
          <div className="space-y-3 rounded-xl border border-j-border bg-j-surface p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-j-ink">
              <span className="text-sm font-mono">↔</span>
              ৪. লেটার স্পেসিং (Letter Spacing)
            </h3>
            <div className="flex flex-wrap gap-2">
              {LETTER_SPACING_PRESETS.map(preset => {
                const active = letterSpacing === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setLetterSpacing(preset.value)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-j-accent bg-j-accent text-white shadow-sm"
                        : "border-j-border bg-white text-j-ink hover:bg-j-surface-sunken"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-2xs font-bold text-j-ink-soft">কাস্টম মান:</span>
              <input
                type="text"
                value={letterSpacing}
                onChange={e => setLetterSpacing(e.target.value)}
                placeholder="normal অথবা -0.052em"
                className="h-8 w-44 rounded-lg border border-j-border bg-white px-2.5 text-xs focus:border-j-accent focus:outline-none"
              />
            </div>
          </div>

          {/* 5. Mobile Behaviour Settings */}
          <div className="space-y-3 rounded-xl border border-j-border bg-j-surface p-4">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-j-ink">
              <Smartphone className="size-4 text-emerald-600" />
              ৫. মোবাইল ডিসপ্লে নিয়ন্ত্রণ (Mobile Rules)
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 rounded-xl border border-j-border bg-white p-3 cursor-pointer hover:bg-j-surface-sunken transition">
                <input
                  type="checkbox"
                  checked={singleLineMobile}
                  onChange={e => setSingleLineMobile(e.target.checked)}
                  className="size-4 accent-[var(--j-accent)]"
                />
                <div>
                  <span className="block text-xs font-bold text-j-ink">
                    মোবাইলে শিরোনাম সর্বদা ১ লাইনে রাখুন (Single line / no-wrap)
                  </span>
                  <span className="block text-2xs text-j-ink-soft">
                    স্ক্রিনে হেডিং ভেঙে একাধিক লাইনে যাবে না, ছোট ফন্টে ১ লাইনে কম্প্যাক্ট থাকবে।
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-j-border bg-white p-3 cursor-pointer hover:bg-j-surface-sunken transition">
                <input
                  type="checkbox"
                  checked={hideMobileDesc}
                  onChange={e => setHideMobileDesc(e.target.checked)}
                  className="size-4 accent-[var(--j-accent)]"
                />
                <div>
                  <span className="block text-xs font-bold text-j-ink">
                    মোবাইলে সাব-শিরোনাম পুরোপুরি লুকান (Hide description on mobile)
                  </span>
                  <span className="block text-2xs text-j-ink-soft">
                    মোবাইল ভিউপোর্টে সাব-শিরোনাম হাইড করে সরাসরি কল-টু-অ্যাকশন বাটন সামনে আনবে।
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Live Preview Column (5 cols) */}
        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-j-ink">
              <Eye className="size-4 text-j-accent" />
              লাইভ প্রিভিউ (Live Preview)
            </h3>
            {/* Viewport switch */}
            <div className="inline-flex rounded-xl border border-j-border bg-j-surface p-1">
              <button
                type="button"
                onClick={() => setPreviewTab("desktop")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  previewTab === "desktop"
                    ? "bg-white text-j-accent shadow-sm"
                    : "text-j-ink-soft hover:text-j-ink"
                }`}
              >
                <Monitor className="size-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("mobile")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  previewTab === "mobile"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-j-ink-soft hover:text-j-ink"
                }`}
              >
                <Smartphone className="size-3.5" /> Mobile
              </button>
            </div>
          </div>

          {/* Desktop Preview Card */}
          {previewTab === "desktop" ? (
            <div className="overflow-hidden rounded-2xl border border-j-border bg-gradient-to-b from-[#f8fcff] to-[#fffefa] p-5 shadow-sm">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white/80 px-2.5 py-1 text-2xs font-bold text-sky-700">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Kicker preview
              </div>
              <h1
                style={{
                  fontFamily: previewFontFamily,
                  fontSize: `${desktopSizePx}px`,
                  letterSpacing,
                  lineHeight: 1.05,
                  fontWeight: 800,
                  color: "#102849",
                }}
                className="mb-3"
              >
                {lead}
                <span style={{ color: "var(--sky-deep, #0b5fa8)" }}>{accent}</span>
                {tail}
              </h1>
              <p className="text-xs leading-relaxed text-[#55728e] max-w-md">
                {description}
              </p>
              <div className="mt-4 flex gap-2">
                <span className="inline-flex h-8 items-center rounded-lg bg-j-accent px-3 text-xs font-bold text-white">
                  Request a tutor
                </span>
                <span className="inline-flex h-8 items-center rounded-lg border border-sky-300 px-3 text-xs font-bold text-j-accent bg-white">
                  Join as a tutor
                </span>
              </div>
            </div>
          ) : (
            /* Mobile Simulated Frame (340px width) */
            <div className="mx-auto max-w-[340px] rounded-3xl border-4 border-slate-700 bg-slate-900 p-2 shadow-xl">
              <div className="mx-auto mb-2 h-3.5 w-20 rounded-full bg-slate-800" />
              <div className="overflow-hidden rounded-2xl border border-j-border bg-gradient-to-b from-[#f8fcff] to-[#fffefa] p-4 text-left">
                {/* Mobile Kicker */}
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Kicker
                </div>

                {/* Mobile Headline — Strictly 1 line */}
                <h1
                  style={{
                    fontFamily: previewFontFamily,
                    fontSize: `${mobileSizePx}px`,
                    letterSpacing: "normal",
                    lineHeight: 1.25,
                    fontWeight: 800,
                    color: "#102849",
                    whiteSpace: singleLineMobile ? "nowrap" : "normal",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  className="mb-2"
                  title={`${lead}${accent}${tail}`}
                >
                  {lead}
                  <span style={{ color: "var(--sky-deep, #0b5fa8)" }}>{accent}</span>
                  {tail}
                </h1>

                {/* Mobile Description (Shown only if not hidden) */}
                {hideMobileDesc ? (
                  <div className="mb-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 p-2 text-center text-[10px] font-semibold text-emerald-800">
                    ✓ সাব-শিরোনাম মোবাইলে লুকানো রয়েছে
                  </div>
                ) : (
                  <p className="mb-3 text-[11px] leading-relaxed text-[#55728e]">
                    {description}
                  </p>
                )}

                {/* Buttons - Side by Side on Mobile */}
                <div className="flex gap-2">
                  <span className="flex-1 inline-flex h-9 items-center justify-center rounded-xl bg-j-accent px-2 text-2xs font-bold text-white whitespace-nowrap shadow-sm">
                    Request a tutor
                  </span>
                  <span className="flex-1 inline-flex h-9 items-center justify-center rounded-xl border border-sky-300 px-2 text-2xs font-bold text-j-accent bg-white whitespace-nowrap">
                    Join as a tutor
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-j-border bg-slate-50 p-3 text-2xs text-j-ink-soft space-y-1">
            <p className="font-bold text-j-ink">💡 টেকনিক্যাল সামারি:</p>
            <p>• ফন্ট: {fontFamily === "default" ? "ডিফল্ট (DM Sans / Noto Sans)" : fontFamily}</p>
            <p>• ডেসকটপ সাইজ: {desktopSizePx}px | লেটার স্পেসিং: {letterSpacing}</p>
            <p>• মোবাইল সাইজ: {mobileSizePx}px | ১-লাইন: {singleLineMobile ? "সক্রিয়" : "বন্ধ"} | সাব-হেডিং: {hideMobileDesc ? "লুকানো" : "প্রদর্শিত"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
