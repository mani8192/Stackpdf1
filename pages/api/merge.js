import { PDFDocument } from "pdf-lib";
import fs from "fs";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length < 2) {
      return res.status(400).json({ error: "Kam se kam 2 PDF files chahiye merge karne ke liye." });
    }
    const merged = await PDFDocument.create();
    for (const f of uploaded) {
      const bytes = fs.readFileSync(f.filepath);
      const src = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    const outBytes = await merged.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="stackpdf-merged.pdf"');
    res.status(200).send(Buffer.from(outBytes));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
