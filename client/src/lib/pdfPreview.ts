/**
 * Draws a PDF inside the site with pdf.js, so a private letter looks the same
 * on every phone and computer instead of going wherever each browser sends a
 * PDF (a new tab on one, a silent download on another).
 *
 * pdf.js is loaded only the first time a letter is opened, so nobody else
 * downloads it. The legacy build is the one that still runs on the older
 * phone browsers the modern build refuses.
 */
type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsLoading: Promise<PdfJs> | null = null;

function loadPdfJs() {
  pdfjsLoading ??= Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsLoading;
}

/**
 * Renders every page as a canvas filling `container`'s width, sharp on a
 * high-density screen, and swaps them in once all are drawn. pdf.js takes
 * ownership of the bytes it is given, so it works on a copy.
 */
export async function renderPdfPages(bytes: Uint8Array, container: HTMLElement) {
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  try {
    const width = container.clientWidth;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const canvases: HTMLCanvasElement[] = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: (width / page.getViewport({ scale: 1 }).width) * density });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser cannot draw the letter.");
      await page.render({ canvasContext: context, viewport }).promise;
      canvases.push(canvas);
    }
    container.replaceChildren(...canvases);
  } finally {
    await document.destroy();
  }
}

/** Saves bytes as a file with a proper name; the browser's own download handles the rest. */
export function saveFile(bytes: Uint8Array, fileName: string, type = "application/pdf") {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  // Some browsers read the file after click() returns; give them time.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
