import { getQueue } from "../../../../lib/queue";

// Frontend polls this every ~400ms. Returns live progress (0-100),
// how many files are individually done so far, and final state.
export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const queue = getQueue();
    const job = await queue.getJob(id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const state = await job.getState(); // 'waiting' | 'active' | 'completed' | 'failed'
    const progress = job.progress || 0; // set by the worker as { percent, doneCount, total }

    res.status(200).json({
      state,
      progress,
      failedReason: job.failedReason || null,
      returnvalue: job.returnvalue || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
