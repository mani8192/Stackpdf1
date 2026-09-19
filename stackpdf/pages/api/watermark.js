import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import fs from "fs";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files, fields } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length !== 1) return res.status(400).json({ error: "Ek PDF file chuno." });
    const text = toArray(fields.text)[0] || "StackPDF";
    const bytes = fs.readFileSync(uploaded[0].filepath);
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    doc.getPages().forEach((p) => {
      const { width, height } = p.getSize();
      p.drawText(text, {
        x: width / 4,
        y: height / 2,
        size: 50,
        font,
        opacity: 0.15,
        rotate: degrees(45),
        color: rgb(0, 0, 0),
      });
    });
    const outBytes = await doc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="stackpdf-watermarked.pdf"');
    res.status(200).send(Buffer.from(outBytes));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
