/** Extract all text from a PDF file in the browser (pdf.js is client-only). */
export async function extractPdfText(file: File): Promise<string> {
  // Lazy import keeps pdf.js out of the SSR bundle (it references DOMMatrix).
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let out = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    out += `\n\n--- Page ${pageNum} ---\n${text}`;
  }

  return out.trim();
}
