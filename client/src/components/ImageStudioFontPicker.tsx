import { useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, ChevronDown, Search, Star } from "lucide-react";
import {
  findStudioFont,
  loadStudioFont,
  studioFontCategoryLabels,
  studioFontFamily,
  studioFontRegularWeight,
  visibleStudioFonts,
  type StudioFont,
  type StudioFontCategory,
  type StudioFontMarks,
  type StudioFontScript,
} from "@/lib/image-studio-fonts";

const categories: (StudioFontCategory | "all")[] = ["all", "sans", "serif", "display", "hand"];
const BANGLA_SAMPLE = "শিক্ষক প্রয়োজন";

/** Loads a family only once its row scrolls into view, so opening the list never pulls in every font at once. */
function useFontWhenVisible(id: string) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = () => void loadStudioFont(id).then(() => { if (!cancelled) setReady(true); });
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      load();
      return () => { cancelled = true; };
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: "120px" });
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [id]);
  return { ref, style: ready ? { fontFamily: `"${studioFontFamily(id)}"`, fontWeight: studioFontRegularWeight(id) } : undefined };
}

function FontName({ font }: { font: StudioFont }) {
  const { ref, style } = useFontWhenVisible(font.id);
  return <span ref={ref} style={style} className="min-w-0 truncate text-base">
    {font.script === "bn" ? `${BANGLA_SAMPLE} · ${font.name}` : font.name}
  </span>;
}

export function ImageStudioFontPicker({ label, script, value, onChange, marks, canEdit, onMark, busy = false }: {
  label: string;
  script: StudioFontScript;
  value: string;
  onChange: (id: string) => void;
  marks: StudioFontMarks;
  /** The Project Owner: may star and archive for every Admin. */
  canEdit: boolean;
  onMark: (id: string, change: { starred?: boolean; archived?: boolean }) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<StudioFontCategory | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const current = findStudioFont(value);
  const fonts = visibleStudioFonts({ script, category, search, marks, showArchived });
  const archivedCount = visibleStudioFonts({ script, marks, showArchived: true }).length;
  const listId = `font-list-${script}`;

  return <div className="rounded-xl border border-j-border">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={listId} className="flex h-control w-full items-center gap-3 px-3 text-left">
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-j-ink-soft">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-j-ink">{current ? `${current.code} · ${current.name}` : value}</span>
      <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
    </button>

    {open ? <div id={listId} className="space-y-3 border-t border-j-border p-3">
      <label className="flex h-control items-center gap-2 rounded-xl border border-j-border px-3">
        <Search size={15} aria-hidden="true" className="text-j-ink-soft" />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search fonts" aria-label={`Search ${label} fonts`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </label>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Font type">
        {categories.map(item => <button key={item} type="button" aria-pressed={item === category} onClick={() => setCategory(item)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${item === category ? "border-j-accent bg-j-accent text-white" : "border-j-border text-j-ink"}`}>
          {item === "all" ? "All" : studioFontCategoryLabels[item]}
        </button>)}
        {canEdit && archivedCount > 0 ? <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived(!showArchived)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${showArchived ? "border-j-ink bg-j-ink text-white" : "border-j-border text-j-ink-soft"}`}>
          Archived ({archivedCount})
        </button> : null}
      </div>

      <ul className="max-h-80 space-y-1 overflow-y-auto" aria-label={`${label} fonts`}>
        {fonts.map(font => {
          const mark = marks.get(font.id);
          const selected = font.id === value;
          return <li key={font.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${selected ? "bg-j-accent-wash" : "hover:bg-j-surface-sunken"}`}>
            <button type="button" onClick={() => { onChange(font.id); setOpen(false); }} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <span className="w-9 shrink-0 text-xs font-bold tabular-nums text-j-ink-soft">{font.code}</span>
              <FontName font={font} />
            </button>
            {canEdit ? <>
              <button type="button" disabled={busy} onClick={() => onMark(font.id, { starred: !mark?.starred })} aria-pressed={Boolean(mark?.starred)} aria-label={`${mark?.starred ? "Unstar" : "Star"} ${font.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-amber-500 hover:bg-white disabled:opacity-50">
                <Star size={16} aria-hidden="true" fill={mark?.starred ? "currentColor" : "none"} />
              </button>
              <button type="button" disabled={busy} onClick={() => onMark(font.id, { archived: !mark?.archived })} aria-label={`${mark?.archived ? "Restore" : "Archive"} ${font.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-j-ink-soft hover:bg-white disabled:opacity-50">
                {mark?.archived ? <ArchiveRestore size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
              </button>
            </> : mark?.starred ? <Star size={14} aria-label="Starred" className="shrink-0 text-amber-500" fill="currentColor" /> : null}
          </li>;
        })}
        {fonts.length === 0 ? <li className="px-2 py-3 text-sm text-j-ink-soft">No fonts match.</li> : null}
      </ul>
    </div> : null}
  </div>;
}
