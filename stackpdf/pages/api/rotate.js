import { PDFDocument, degrees } from "pdf-lib";
import fs from "fs";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files, fields } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length !== 1) return res.status(400).json({ error: "Ek PDF file chuno." });
    const angle = parseInt(toArray(fields.angle)[0] || "90", 10);
    const bytes = fs.readFileSync(uploaded[0].filepath);
    const doc = await PDFDocument.load(bytes);
    doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle || 0) + angle)));
    const outBytes = await doc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="stackpdf-rotated.pdf"');
    res.status(200).send(Buffer.from(outBytes));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
