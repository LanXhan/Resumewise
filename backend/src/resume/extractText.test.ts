import { describe, it, expect } from "vitest";
import { PDFDocument, PDFHexString, StandardFonts } from "pdf-lib";
import { extractText, PdfExtractionError, MAX_PAGES } from "./extractText.js";

// Test PDFs are generated in code so every fixture is readable here, and no
// binary files (or real people's resumes) live in the repo.

interface TextLine {
  text: string;
  x?: number;
  row?: number; // defaults to the line's position in the list
}

async function buildPdf(pages: TextLine[][]): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([612, 792]);
    lines.forEach((line, i) =>
      page.drawText(line.text, { x: line.x ?? 50, y: 740 - (line.row ?? i) * 20, size: 11, font }),
    );
  }
  return doc;
}

async function pdfBytes(pages: TextLine[][]): Promise<Uint8Array> {
  return (await buildPdf(pages)).save();
}

const lines = (...texts: string[]): TextLine[] => texts.map((text) => ({ text }));

const resumeLines = lines(
  "Jane Doe",
  "jane@example.com | +1 555 123 4567 | Manila, PH",
  "Experience",
  "Software Engineer, Acme Corp, Jan 2021 - Present",
  "Built the billing API in Node.js and TypeScript serving 2M requests a day.",
  "Led migration from MySQL to PostgreSQL with zero downtime.",
  "Education",
  "BS Computer Science, University of the Philippines, 2015 - 2019",
);

async function expectCode(bytes: Uint8Array, code: string) {
  const err = await extractText(bytes).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(PdfExtractionError);
  expect((err as PdfExtractionError).code).toBe(code);
}

describe("extractText", () => {
  it("extracts text from a simple one-page PDF", async () => {
    const result = await extractText(await pdfBytes([resumeLines]));
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("Jane Doe");
    expect(result.text).toContain("jane@example.com");
    expect(result.text).toContain("Led migration from MySQL to PostgreSQL");
  });

  it("keeps all pages in order, separated by a blank line", async () => {
    const result = await extractText(
      await pdfBytes([resumeLines, lines("Projects", "Resumewise - resume optimizer")]),
    );
    expect(result.pageCount).toBe(2);
    expect(result.text).toContain("2015 - 2019\n\nProjects");
  });

  it("rejects non-PDF bytes", async () => {
    await expectCode(new TextEncoder().encode("PK\u0003\u0004 this is a zip/docx"), "NOT_PDF");
  });

  it("rejects a corrupt PDF", async () => {
    const truncated = (await pdfBytes([resumeLines])).slice(0, 200);
    await expectCode(truncated, "CORRUPT");
  });

  it("rejects a password-protected PDF", async () => {
    // pdf-lib cannot encrypt, so add a Standard security handler entry to the trailer.
    // pdf.js sees it, finds the empty password doesn't match, and asks for one.
    const doc = await buildPdf([resumeLines]);
    doc.context.trailerInfo.Encrypt = doc.context.register(
      doc.context.obj({
        Filter: "Standard",
        V: 1,
        R: 2,
        P: -4,
        O: PDFHexString.of("11".repeat(32)),
        U: PDFHexString.of("22".repeat(32)),
      }),
    );
    doc.context.trailerInfo.ID = doc.context.obj([
      PDFHexString.of("ab".repeat(16)),
      PDFHexString.of("ab".repeat(16)),
    ]);
    await expectCode(await doc.save({ useObjectStreams: false }), "ENCRYPTED");
  });

  it("rejects a PDF with too many pages", async () => {
    const pages = Array.from({ length: MAX_PAGES + 1 }, () => resumeLines);
    await expectCode(await pdfBytes(pages), "TOO_MANY_PAGES");
  });

  it("rejects a PDF with no text layer (like a scan)", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]).drawRectangle({ x: 50, y: 50, width: 500, height: 700 });
    await expectCode(await doc.save(), "NO_TEXT");
  });

  it("does not modify the caller's buffer", async () => {
    const bytes = await pdfBytes([resumeLines]);
    const copy = bytes.slice();
    await extractText(bytes);
    expect(bytes).toEqual(copy);
  });

  // Known limitation, documented rather than fixed: text is read row by row
  // across the page, so two columns side by side get interleaved.
  it("interleaves two-column layouts (known limitation)", async () => {
    const left = ["Skills", "TypeScript", "React", "PostgreSQL"];
    const right = ["Experience", "Software Engineer", "Acme Corp", "Jan 2021 - Present"];
    const page: TextLine[] = [...resumeLines];
    left.forEach((text, i) => {
      const row = resumeLines.length + i;
      page.push({ text, x: 50, row }, { text: right[i], x: 320, row });
    });
    const result = await extractText(await pdfBytes([page]));
    // The left column's "React" is glued to the right column's "Acme Corp".
    expect(result.text).toContain("Skills Experience\nTypeScript Software Engineer\nReact Acme Corp");
  });
});
