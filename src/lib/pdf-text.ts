/**
 * Extract text from a PDF in the browser.
 *
 * Strategy: first try the embedded digital text layer (fast, accurate for typed
 * PDFs). If a page has little/no extractable text (e.g. a scanned or handwritten
 * answer sheet), fall back to rendering that page to a canvas and running OCR
 * with Tesseract.js.
 *
 * Everything here is client-only — pdf.js references DOMMatrix and Tesseract is
 * heavy, so both are lazy-imported to stay out of the SSR bundle.
 */

export type ExtractProgress = {
  stage: "loading" | "text" | "ocr" | "done";
  page: number;
  totalPages: number;
  /** 0..1 OCR progress for the current page (only during the "ocr" stage). */
  ocrProgress?: number;
};

type ProgressCb = (p: ExtractProgress) => void;

// Below this many characters we treat a page as "image only" and OCR it.
const MIN_TEXT_CHARS = 20;

export async function extractPdfText(file: File, onProgress?: ProgressCb): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = pdf.numPages;

  onProgress?.({ stage: "loading", page: 0, totalPages });

  let ocrWorker: import("tesseract.js").Worker | null = null;
  let out = "";

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      onProgress?.({ stage: "text", page: pageNum, totalPages });
      const content = await page.getTextContent();
      let text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ").trim();

      // Fall back to OCR when the page has no usable digital text layer.
      if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) {
        onProgress?.({ stage: "ocr", page: pageNum, totalPages, ocrProgress: 0 });

        if (!ocrWorker) {
          const Tesseract = await import("tesseract.js");
          ocrWorker = await Tesseract.createWorker("eng", 1, {
            logger: (m) => {
              if (m.status === "recognizing text") {
                onProgress?.({ stage: "ocr", page: pageNum, totalPages, ocrProgress: m.progress });
              }
            },
          });
        }

        const imageData = await renderPageToDataUrl(page);
        const { data } = await ocrWorker.recognize(imageData);
        text = data.text.trim();
      }

      out += `\n\n--- Page ${pageNum} ---\n${text}`;
    }
  } finally {
    if (ocrWorker) await ocrWorker.terminate();
  }

  onProgress?.({ stage: "done", page: totalPages, totalPages });
  return out.trim();
}

/** Render a pdf.js page to a PNG data URL at a scale that's good for OCR. */
async function renderPageToDataUrl(
  page: import("pdfjs-dist").PDFPageProxy,
): Promise<string> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/png");
}
