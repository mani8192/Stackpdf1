import fs from "fs";
import Tesseract from "tesseract.js";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };

// Runs OCR on an uploaded image (or a single-page image export) using
// tesseract.js (pure JS/WASM — works on serverless too, but slow on
// large batches). Returns extracted text as JSON.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length !== 1) return res.status(400).json({ error: "Ek image ya scanned page chuno." });
    const buf = fs.readFileSync(uploaded[0].filepath);
    const { data } = await Tesseract.recognize(buf, "eng");
    res.status(200).json({ text: data.text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
