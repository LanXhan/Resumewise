import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

export const MAX_PAGES = 10;
// Below this many characters we assume there is no text layer (scanned/image-only PDF).
export const MIN_TEXT_CHARS = 200;

export type PdfExtractionErrorCode =
  | "NOT_PDF"
  | "ENCRYPTED"
  | "CORRUPT"
  | "TOO_MANY_PAGES"
  | "NO_TEXT";

export class PdfExtractionError extends Error {
  constructor(
    public readonly code: PdfExtractionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

export interface ExtractedText {
  text: string;
  pageCount: number;
}

const PDF_MAGIC = "%PDF-";

function isPdf(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.subarray(0, PDF_MAGIC.length)) === PDF_MAGIC;
}

export async function extractText(bytes: Uint8Array): Promise<ExtractedText> {
  if (!isPdf(bytes)) {
    throw new PdfExtractionError("NOT_PDF", "File is not a PDF.");
  }

  // pdf.js may take ownership of the buffer it is given, so pass a copy.
  const pdf = await getDocumentProxy(bytes.slice(), { verbosity: 0 }).catch((err: unknown) => {
    if (err instanceof Error && err.name === "PasswordException") {
      throw new PdfExtractionError("ENCRYPTED", "PDF is password-protected.");
    }
    throw new PdfExtractionError("CORRUPT", "PDF could not be read.");
  });

  try {
    if (pdf.numPages > MAX_PAGES) {
      throw new PdfExtractionError("TOO_MANY_PAGES", `PDF has more than ${MAX_PAGES} pages.`);
    }

    const { text: pages } = await extractPdfText(pdf, { mergePages: false });
    const text = pages.join("\n\n");

    if (text.trim().length < MIN_TEXT_CHARS) {
      throw new PdfExtractionError("NO_TEXT", "PDF has no extractable text (it may be scanned).");
    }

    return { text, pageCount: pdf.numPages };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
