import { useEffect, useState } from "react";
import type { SiteLimitValues } from "@shared/site-limits";
import { modalPanelHeight, modalShadow } from "@/components/SiteDimensionStyle";

/** The drawn stage is this wide; whatever it draws is scaled to fit it. */
const STAGE_PX = 336;
const STAGE_PAD_PX = 14;
/** What a dialog holds in the drawing: a title, a few lines, two buttons. Real dialogs are as tall as what they say. */
const DIALOG_DRAWN_HEIGHT_PX = 232;
const BAR_PX = { header: 52, footer: 56 };

function useWindowHeight() {
  const [height, setHeight] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return height;
}

function Skeleton({ lines }: { lines: number }) {
  return <div className="space-y-3">
    {Array.from({ length: lines }, (_, index) => <div key={index} className="h-3 rounded-full bg-j-border" style={{ width: `${index % 3 === 2 ? 55 : 100 - (index % 3) * 12}%` }} />)}
  </div>;
}

/** One drawn dialog at its real size, then shrunk, so its shape and its size beside the other one are both true. */
function Drawn({ width, height, scale, limits, lines }: { width: number; height: number; scale: number; limits: SiteLimitValues; lines: number }) {
  return <div style={{ width: width * scale, height: height * scale }}>
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden border border-j-border bg-background"
      style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", borderRadius: limits["modal.radius"], boxShadow: modalShadow(limits) }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-j-border bg-white px-5" style={{ height: BAR_PX.header }}>
        <div className="h-3.5 w-40 rounded-full bg-j-ink-faint" />
        <div className="size-5 rounded-full bg-j-border" />
      </div>
      <div className="min-h-0 flex-1 px-5 py-4"><Skeleton lines={lines} /></div>
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-j-border bg-white px-5" style={{ height: BAR_PX.footer }}>
        <div className="rounded-xl border border-j-border" style={{ height: limits["control.height"], width: 84 }} />
        <div className="rounded-xl bg-j-accent" style={{ height: limits["control.height"], width: 104 }} />
      </div>
    </div>
  </div>;
}

/**
 * The dialog and the panel drawn from the numbers as they are typed, before
 * anything is saved: same shadow and corner rounding as the real thing, the
 * panel as tall as it would stand on the window the Owner is looking at, both
 * at one scale so one can be judged against the other. Laptop sizes only; a
 * phone shows every dialog as a full-width sheet whatever these say.
 */
export default function ModalSizePreview({ limits }: { limits: SiteLimitValues }) {
  const windowHeight = useWindowHeight();
  const dialogWidth = limits["modal.width.dialog"];
  const panelWidth = limits["modal.width.panel"];
  const panelHeight = Math.round(modalPanelHeight(limits, windowHeight));
  const scale = (STAGE_PX - STAGE_PAD_PX * 2) / Math.max(dialogWidth, panelWidth);
  // The page behind a dialog, dimmed by the Owner's own darkness number.
  const stageColour = `color-mix(in srgb, var(--j-ink) ${limits["modal.backdropOpacity"]}%, white)`;

  const stage = (children: React.ReactNode) => <div className="flex justify-center rounded-xl" style={{ width: STAGE_PX, padding: STAGE_PAD_PX, backgroundColor: stageColour }}>{children}</div>;

  return <figure aria-label="Dialog and panel sizes" className="space-y-4">
    <div>
      <figcaption className="mb-1.5 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Panel · {panelWidth} × {panelHeight} px on this screen</figcaption>
      <div data-testid="preview-panel">{stage(<Drawn width={panelWidth} height={panelHeight} scale={scale} limits={limits} lines={14} />)}</div>
    </div>
    <div>
      <p className="mb-1.5 text-2xs font-bold uppercase tracking-wide text-j-ink-faint">Dialog · {dialogWidth} px wide</p>
      <div data-testid="preview-dialog">{stage(<Drawn width={dialogWidth} height={DIALOG_DRAWN_HEIGHT_PX} scale={scale} limits={limits} lines={3} />)}</div>
    </div>
  </figure>;
}
