import { PDFDocument } from "pdf-lib";
import archiver from "archiver";
import fs from "fs";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length !== 1) return res.status(400).json({ error: "Ek PDF file chuno split karne ke liye." });
    const bytes = fs.readFileSync(uploaded[0].filepath);
    const src = await PDFDocument.load(bytes);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="stackpdf-split-pages.zip"');
    const archive = archiver("zip");
    archive.pipe(res);

    for (let i = 0; i < src.getPageCount(); i++) {
      const out = await PDFDocument.create();
      const [p] = await out.copyPages(src, [i]);
      out.addPage(p);
      const b = await out.save();
      archive.append(Buffer.from(b), { name: `page-${i + 1}.pdf` });
    }
    await archive.finalize();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
