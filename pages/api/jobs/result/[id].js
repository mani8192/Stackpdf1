import fs from "fs";
import { getQueue } from "../../../../lib/queue";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const queue = getQueue();
    const job = await queue.getJob(id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const state = await job.getState();
    if (state !== "completed") return res.status(409).json({ error: "Job not finished yet", state });

    const { outputPath, mime, filename } = job.returnvalue || {};
    if (!outputPath || !fs.existsSync(outputPath)) {
      return res.status(500).json({ error: "Output file missing" });
    }
    res.setHeader("Content-Type", mime || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename || "stackpdf-output"}"`);
    fs.createReadStream(outputPath).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
