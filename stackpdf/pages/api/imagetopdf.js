import { PDFDocument } from "pdf-lib";
import fs from "fs";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length < 1) return res.status(400).json({ error: "Kam se kam 1 image chuno." });
    const doc = await PDFDocument.create();
    for (const f of uploaded) {
      const bytes = fs.readFileSync(f.filepath);
      let img;
      if ((f.mimetype || "").includes("png")) img = await doc.embedPng(bytes);
      else img = await doc.embedJpg(bytes);
      const page = doc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    const outBytes = await doc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="stackpdf-images.pdf"');
    res.status(200).send(Buffer.from(outBytes));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
