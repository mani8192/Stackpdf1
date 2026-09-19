import fs from "fs";
import pdfParse from "pdf-parse";
import { Document, Packer, Paragraph } from "docx";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };

// Extracts text from the PDF and rebuilds it as a .docx (text-only — layout,
// images and exact formatting are not preserved). For pixel-perfect PDF->Word
// you need a commercial engine (e.g. CloudConvert API, Adobe API).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length !== 1) return res.status(400).json({ error: "Ek PDF file chuno." });
    const buf = fs.readFileSync(uploaded[0].filepath);
    const data = await pdfParse(buf);
    const paragraphs = data.text
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((line) => new Paragraph(line));

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const outBuf = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="stackpdf-converted.docx"');
    res.status(200).send(outBuf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
