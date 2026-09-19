import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { parseForm, toArray } from "../../lib/parseForm";

export const config = { api: { bodyParser: false } };

// Uses the `qpdf` command-line tool for real password encryption.
// Install: apt-get install qpdf  (see Dockerfile). Not available on plain
// Vercel serverless — deploy this route on Docker/VPS/Render instead.
function runQpdf(args) {
  return new Promise((resolve, reject) => {
    execFile("qpdf", args, (err) => (err ? reject(err) : resolve()));
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { files, fields } = await parseForm(req);
    const uploaded = toArray(files.files);
    if (uploaded.length !== 1) return res.status(400).json({ error: "Ek PDF file chuno." });
    const password = toArray(fields.password)[0] || "stackpdf";
    const inPath = uploaded[0].filepath;
    const outPath = path.join(os.tmpdir(), `protected-${Date.now()}.pdf`);

    await runQpdf(["--encrypt", password, password, "256", "--", inPath, outPath]);

    const outBuf = fs.readFileSync(outPath);
    fs.unlink(outPath, () => {});
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="stackpdf-protected.pdf"');
    res.status(200).send(outBuf);
  } catch (e) {
    res.status(500).json({ error: "Protect failed — qpdf installed hai? " + e.message });
  }
}
