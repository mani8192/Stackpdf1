import fs from "fs";
import libre from "libreoffice-convert";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };
const convertAsync = (buf, ext) =>
  new Promise((resolve, reject) => {
    libre.convert(buf, ext, undefined, (err, done) => (err ? reject(err) : resolve(done)));
  });

// Requires LibreOffice on the host — see wordtopdf.js note.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length !== 1) return res.status(400).json({ error: "Ek Excel file chuno." });
    const buf = fs.readFileSync(uploaded[0].filepath);
    const pdfBuf = await convertAsync(buf, ".pdf");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="stackpdf-converted.pdf"');
    res.status(200).send(pdfBuf);
  } catch (e) {
    res.status(500).json({ error: "Conversion failed — LibreOffice installed hai? " + e.message });
  }
}
