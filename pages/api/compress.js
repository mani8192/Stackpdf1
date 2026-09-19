import { PDFDocument } from "pdf-lib";
import fs from "fs";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };

// Note: true visual compression (re-encoding embedded images) needs a heavier
// library (e.g. Ghostscript on a Node server / container). This endpoint
// re-saves the PDF with object-stream compression, which trims size for most
// text-heavy PDFs. Swap in Ghostscript-based logic for image-heavy files.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length !== 1) return res.status(400).json({ error: "Ek PDF file chuno." });
    const bytes = fs.readFileSync(uploaded[0].filepath);
    const doc = await PDFDocument.load(bytes);
    const outBytes = await doc.save({ useObjectStreams: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="stackpdf-compressed.pdf"');
    res.status(200).send(Buffer.from(outBytes));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
