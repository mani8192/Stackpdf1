import { Queue } from "bullmq";
import { getRedis } from "./redis";

// One queue handles every tool — the job's `data.tool` field tells the
// worker which operation to run. This is what lets StackPDF accept a batch
// of any size (1 file or 10,000) without the web server itself blocking:
// the API route just enqueues the job and returns instantly, and one or
// more worker processes (workers/pdfWorker.js) pull jobs off the queue and
// do the actual PDF/image work in the background.
let queue;
export function getQueue() {
  if (!queue) {
    queue = new Queue("stackpdf-jobs", { connection: getRedis() });
  }
  return queue;
}
