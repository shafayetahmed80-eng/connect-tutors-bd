import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Plus, Search, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";

export interface FacebookSavedGroup {
  id: string;
  name: string;
  url: string;
  category: string;
  description?: string;
  isPreset?: boolean;
}

export const FB_SAVED_GROUPS_STORAGE_KEY = "connect_tutors_fb_saved_groups_v2";

export const DEFAULT_PRESET_GROUPS: FacebookSavedGroup[] = [
  {
    id: "preset-official",
    name: "Connect Tutors Official Page",
    url: "https://www.facebook.com/connecttutorsbd",
    category: "Official",
    description: "Official Verified Connect Tutors Page (BTPA-077)",
    isPreset: true,
  },
  {
    id: "preset-general-dhaka",
    name: "Dhaka Tuition & Tutors Hub",
    url: "https://www.facebook.com/groups/dhakatutors",
    category: "General",
    description: "All areas tuition seekers & tutors community in Dhaka",
    isPreset: true,
  },
  {
    id: "preset-dhanmondi",
    name: "Dhanmondi & Mohammadpur Tuition Community",
    url: "https://www.facebook.com/groups/dhanmondituition",
    category: "Dhanmondi",
    description: "Targeted for Dhanmondi, Mohammadpur, Lalmatia, Kalabagan",
    isPreset: true,
  },
  {
    id: "preset-mirpur-uttara",
    name: "Mirpur & Uttara Tutors Network",
    url: "https://www.facebook.com/groups/mirpurtuition",
    category: "Mirpur / Uttara",
    description: "Targeted for Mirpur, Uttara, Pallabi, Cantonment",
    isPreset: true,
  },
  {
    id: "preset-english-medium",
    name: "English Medium & Cambridge Tutors Dhaka",
    url: "https://www.facebook.com/groups/englishmediumtutorsdhaka",
    category: "English Medium",
    description: "Cambridge, Edexcel, O/A Level tuition seekers & teachers",
    isPreset: true,
  },
  {
    id: "preset-buet-du",
    name: "BUET & DU Tutors Society",
    url: "https://www.facebook.com/groups/buetdututors",
    category: "University",
    description: "Tutors from BUET, DU, Medical & top public universities",
    isPreset: true,
  },
];

export function loadSavedFacebookGroups(): FacebookSavedGroup[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(FB_SAVED_GROUPS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {}
  return DEFAULT_PRESET_GROUPS;
}

export function saveFacebookGroupsToStorage(groups: FacebookSavedGroup[]) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(FB_SAVED_GROUPS_STORAGE_KEY, JSON.stringify(groups));
    }
  } catch {}
}

interface FacebookGroupHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  postTextToCopy?: string;
  activeLocation?: string;
  activeCategory?: string;
}

export function FacebookGroupHelperModal({
  isOpen,
  onClose,
  postTextToCopy,
  activeLocation,
  activeCategory,
}: FacebookGroupHelperModalProps) {
  const [groups, setGroups] = useState<FacebookSavedGroup[]>(() => loadSavedFacebookGroups());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // New Group Form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGroups(loadSavedFacebookGroups());
    }
  }, [isOpen]);

  // Derive unique categories
  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    for (const g of groups) {
      if (g.category) set.add(g.category);
    }
    return Array.from(set);
  }, [groups]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return groups.filter(g => {
      const matchesSearch =
        !term ||
        g.name.toLowerCase().includes(term) ||
        g.category.toLowerCase().includes(term) ||
        (g.description && g.description.toLowerCase().includes(term));
      const matchesCategory =
        selectedCategory === "All" || g.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [groups, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) {
      toast.error("অনুগ্রহ করে গ্রুপের নাম এবং সঠিক লিংক প্রদান করুন।");
      return;
    }

    let url = newUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    const newGroup: FacebookSavedGroup = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      url,
      category: newCategory.trim() || "General",
      isPreset: false,
    };

    const updated = [newGroup, ...groups];
    setGroups(updated);
    saveFacebookGroupsToStorage(updated);

    setNewName("");
    setNewUrl("");
    setNewCategory("");
    setIsAddingNew(false);
    toast.success("নতুন ফেসবুক গ্রুপ সফলভাবে তালিকায় যুক্ত হয়েছে!");
  };

  const handleDeleteGroup = (id: string) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
    saveFacebookGroupsToStorage(updated);
    toast.info("গ্রুপটি তালিকা থেকে মুছে ফেলা হয়েছে।");
  };

  const handleCopyAndOpen = async (group: FacebookSavedGroup) => {
    if (postTextToCopy) {
      try {
        await navigator.clipboard.writeText(postTextToCopy);
        setCopiedGroupId(group.id);
        setTimeout(() => setCopiedGroupId(null), 2500);
        toast.success(
          `পোস্ট ক্লিপবোর্ডে কপি হয়েছে! "${group.name}"-এ পোস্ট করতে পেস্ট (Ctrl+V) করুন।`
        );
      } catch {
        toast.error("পোস্ট টেক্সট কপি করা যায়নি।");
      }
    }
    window.open(group.url, "_blank", "noopener,noreferrer");
  };

  // Direct search query on Facebook
  const searchQuery = [activeLocation, activeCategory, "Tuition"].filter(Boolean).join(" ");
  const fbSearchUrl = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(
    searchQuery || "Dhaka Tuition"
  )}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-helper-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-xl border border-j-border bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-j-border bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#1877f2]/10 text-[#1877f2]">
              <Users className="size-5" />
            </div>
            <div>
              <h2 id="group-helper-title" className="text-base font-bold text-j-ink">
                Facebook Group Helper (টার্গেটেড ফেসবুক গ্রুপ ডিরেক্টরি)
              </h2>
              <p className="text-2xs text-j-ink-soft">
                নির্দিষ্ট এলাকা ও কারিকুলাম ভিত্তিক গ্রুপে ১-ক্লিকে পোস্ট কপি করে সরাসরি ওপেন করুন।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close group helper"
            className="flex size-8 items-center justify-center rounded-full text-j-ink-soft hover:bg-slate-200 hover:text-j-ink transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-j-border bg-white text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-j-ink-soft" />
            <input
              type="text"
              placeholder="গ্রুপের নাম বা ক্যাটাগরি দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-j-border bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877f2]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fbSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold transition"
              title={`Search Facebook for "${searchQuery}" groups`}
            >
              <Search className="size-3.5" />
              <span>ফেসবুক গ্রুপ সার্চ ({activeLocation || "Dhaka"})</span>
            </a>

            <button
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1877f2] bg-[#1877f2] text-white hover:bg-[#166fe5] font-semibold transition shadow-2xs"
            >
              <Plus className="size-3.5" />
              <span>{isAddingNew ? "ফর্ম বন্ধ করুন" : "নতুন গ্রুপ যোগ করুন"}</span>
            </button>
          </div>
        </div>

        {/* Add New Group Form (Collapsible) */}
        {isAddingNew && (
          <form
            onSubmit={handleAddGroup}
            className="px-6 py-3.5 border-b border-j-border bg-blue-50/50 space-y-3 animate-in fade-in duration-150"
          >
            <p className="text-xs font-bold text-[#1877f2]">নতুন ফেসবুক গ্রুপ বা পেজের তথ্য দিন:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                placeholder="গ্রুপের নাম (যেমন: Dhanmondi Tutors)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-j-border bg-white text-xs"
                required
              />
              <input
                type="url"
                placeholder="গ্রুপের লিংক (https://facebook.com/groups/...)"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-j-border bg-white text-xs"
                required
              />
              <input
                type="text"
                placeholder="ক্যাটাগরি বা এলাকা (যেমন: Dhanmondi)"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-j-border bg-white text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-j-ink-soft hover:bg-slate-200"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded-lg bg-[#1877f2] text-white text-xs font-bold hover:bg-[#166fe5]"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </form>
        )}

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 px-6 py-2 border-b border-j-border bg-slate-50/50 overflow-x-auto text-2xs font-semibold">
          <span className="text-j-ink-soft mr-1">ফিল্টার:</span>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-[#1877f2] text-white shadow-2xs font-bold"
                  : "bg-white text-j-ink border border-j-border hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 max-h-[50vh]">
          {filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-xs text-j-ink-soft">
              কোনো গ্রুপ পাওয়া যায়নি। নতুন গ্রুপ যোগ করতে উপরের বাটনটিতে ক্লিক করুন।
            </div>
          ) : (
            filteredGroups.map(group => {
              const isCopied = copiedGroupId === group.id;
              return (
                <div
                  key={group.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-j-border bg-white hover:border-[#1877f2]/50 hover:bg-slate-50/50 transition group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-j-ink group-hover:text-[#1877f2] transition">
                        {group.name}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-2xs font-bold text-slate-700">
                        {group.category}
                      </span>
                      {group.isPreset && (
                        <span className="text-3xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                          Verified Preset
                        </span>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-2xs text-j-ink-soft">{group.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {postTextToCopy && (
                      <button
                        type="button"
                        onClick={() => handleCopyAndOpen(group)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs ${
                          isCopied
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-[#1877f2] bg-[#1877f2] text-white hover:bg-[#166fe5]"
                        }`}
                        title="Copy post text to clipboard and open group in new tab"
                      >
                        {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        <span>{isCopied ? "Copied & Opened!" : "Copy & Open Group"}</span>
                      </button>
                    )}

                    <a
                      href={group.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-j-border bg-white text-xs font-semibold text-j-ink hover:bg-slate-100 transition"
                      title="Open group in Facebook"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>Open</span>
                    </a>

                    {!group.isPreset && (
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete custom group"
                        aria-label={`Delete ${group.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-j-border bg-slate-50/80 text-xs">
          <p className="text-2xs text-j-ink-soft">
            💡 টিপস: "Copy & Open Group" চাপলে স্বয়ংক্রিয়ভাবে পোস্ট কপি হয়ে গ্রুপ নতুন ট্যাবে খুলে যাবে,
            সেখানে শুধুমাত্র <kbd className="px-1 py-0.5 rounded bg-slate-200 font-mono text-2xs">Ctrl + V</kbd> চেপে পেস্ট করুন।
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-j-border bg-white text-xs font-semibold text-j-ink hover:bg-slate-100"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
