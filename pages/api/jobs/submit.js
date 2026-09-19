import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import formidable from "formidable";
import { getQueue } from "../../../lib/queue";

export const config = { api: { bodyParser: false } };

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const jobId = uuidv4();
    const jobDir = path.join(UPLOAD_ROOT, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    // Stream uploads straight to disk under this job's folder — formidable
    // handles this without buffering everything in memory, so it scales to
    // very large batches.
    const form = formidable({
      multiples: true,
      uploadDir: jobDir,
      keepExtensions: true,
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB per file ceiling
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
    });

    const uploaded = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);
    const filePaths = uploaded.map((f) => f.filepath);
    const tool = Array.isArray(fields.tool) ? fields.tool[0] : fields.tool;
    const extra = {};
    for (const k of ["text", "angle", "password"]) {
      const v = Array.isArray(fields[k]) ? fields[k][0] : fields[k];
      if (v) extra[k] = v;
    }

    const queue = getQueue();
    await queue.add(
      "process",
      { jobId, tool, filePaths, jobDir, extra, total: filePaths.length },
      { jobId, removeOnComplete: false, removeOnFail: false }
    );

    res.status(200).json({ jobId, total: filePaths.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
