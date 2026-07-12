import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/** Captures a DOM node as a PNG data URL at 2x pixel density. */
export async function captureNodeAsPng(node: HTMLElement): Promise<string> {
  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
  });
}

function filenameWithDate(base: string, ext: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}.${ext}`;
}

/** Triggers a browser download for a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadComparatorPng(dataUrl: string) {
  downloadDataUrl(dataUrl, filenameWithDate("world-time-zone", "png"));
}

/**
 * Copies a PNG data URL to the clipboard as an image. Falls back to
 * downloading the file if the Clipboard image API isn't available or the
 * write is rejected (e.g. insecure context, unsupported browser).
 */
export async function copyPngToClipboard(
  dataUrl: string,
): Promise<"copied" | "downloaded"> {
  try {
    if (
      typeof ClipboardItem !== "undefined" &&
      navigator.clipboard &&
      "write" in navigator.clipboard
    ) {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      return "copied";
    }
  } catch {
    // Fall through to the download fallback below.
  }
  downloadComparatorPng(dataUrl);
  return "downloaded";
}

/** Reads the natural pixel dimensions of a data URL image. */
function loadImageSize(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Builds and downloads a landscape PDF containing the captured PNG. */
export async function downloadComparatorPdf(dataUrl: string): Promise<void> {
  const { width, height } = await loadImageSize(dataUrl);
  const orientation = width >= height ? "landscape" : "portrait";

  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [width, height],
  });
  pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
  pdf.save(filenameWithDate("world-time-zone", "pdf"));
}
