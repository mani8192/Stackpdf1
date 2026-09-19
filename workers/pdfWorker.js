// Run this as its own process: `npm run worker`
// It pulls jobs off the Redis queue and does the real PDF/image work,
// completely separate from the web server — so submitting a job with
// 10,000 files never blocks or times out an HTTP request. You can also
// run several of these in parallel (on the same or different machines)
// to process many jobs at once; just point them at the same REDIS_URL.

const { Worker } = require("bullmq");
const fs = require("fs");
const path = require("path");
const { PDFDocument, degrees, StandardFonts, rgb } = require("pdf-lib");
const archiver = require("archiver");
const { Redis } = require("ioredis");

const connection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

async function reportProgress(job, doneCount, total) {
  const percent = total === 0 ? 100 : Math.round((doneCount / total) * 100);
  await job.updateProgress({ percent, doneCount, total });
}

async function handleMerge(job, { filePaths, jobDir }) {
  const merged = await PDFDocument.create();
  let done = 0;
  for (const fp of filePaths) {
    const bytes = fs.readFileSync(fp);
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
    done++;
    await reportProgress(job, done, filePaths.length);
  }
  const outPath = path.join(jobDir, "output.pdf");
  fs.writeFileSync(outPath, await merged.save());
  return { outputPath: outPath, mime: "application/pdf", filename: "stackpdf-merged.pdf" };
}

async function handleImageToPdf(job, { filePaths, jobDir }) {
  const doc = await PDFDocument.create();
  let done = 0;
  for (const fp of filePaths) {
    const bytes = fs.readFileSync(fp);
    const ext = path.extname(fp).toLowerCase();
    let img;
    if (ext === ".png") img = await doc.embedPng(bytes);
    else img = await doc.embedJpg(bytes);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    done++;
    await reportProgress(job, done, filePaths.length);
  }
  const outPath = path.join(jobDir, "output.pdf");
  fs.writeFileSync(outPath, await doc.save());
  return { outputPath: outPath, mime: "application/pdf", filename: "stackpdf-images.pdf" };
}

async function handleSplit(job, { filePaths, jobDir }) {
  const bytes = fs.readFileSync(filePaths[0]);
  const src = await PDFDocument.load(bytes);
  const outPath = path.join(jobDir, "output.zip");
  const output = fs.createWriteStream(outPath);
  const archive = archiver("zip");
  archive.pipe(output);

  const total = src.getPageCount();
  for (let i = 0; i < total; i++) {
    const out = await PDFDocument.create();
    const [p] = await out.copyPages(src, [i]);
    out.addPage(p);
    archive.append(Buffer.from(await out.save()), { name: `page-${i + 1}.pdf` });
    await reportProgress(job, i + 1, total);
  }
  await archive.finalize();
  await new Promise((resolve) => output.on("close", resolve));
  return { outputPath: outPath, mime: "application/zip", filename: "stackpdf-split-pages.zip" };
}

async function handleRotate(job, { filePaths, jobDir, extra }) {
  const bytes = fs.readFileSync(filePaths[0]);
  const doc = await PDFDocument.load(bytes);
  const angle = parseInt(extra.angle || "90", 10);
  doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle || 0) + angle)));
  await reportProgress(job, 1, 1);
  const outPath = path.join(jobDir, "output.pdf");
  fs.writeFileSync(outPath, await doc.save());
  return { outputPath: outPath, mime: "application/pdf", filename: "stackpdf-rotated.pdf" };
}

async function handleWatermark(job, { filePaths, jobDir, extra }) {
  const bytes = fs.readFileSync(filePaths[0]);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const text = extra.text || "StackPDF";
  doc.getPages().forEach((p) => {
    const { width, height } = p.getSize();
    p.drawText(text, { x: width / 4, y: height / 2, size: 50, font, opacity: 0.15, rotate: degrees(45), color: rgb(0, 0, 0) });
  });
  await reportProgress(job, 1, 1);
  const outPath = path.join(jobDir, "output.pdf");
  fs.writeFileSync(outPath, await doc.save());
  return { outputPath: outPath, mime: "application/pdf", filename: "stackpdf-watermarked.pdf" };
}

async function handleCompress(job, { filePaths, jobDir }) {
  const bytes = fs.readFileSync(filePaths[0]);
  const doc = await PDFDocument.load(bytes);
  await reportProgress(job, 1, 1);
  const outPath = path.join(jobDir, "output.pdf");
  fs.writeFileSync(outPath, await doc.save({ useObjectStreams: true }));
  return { outputPath: outPath, mime: "application/pdf", filename: "stackpdf-compressed.pdf" };
}

const HANDLERS = {
  merge: handleMerge,
  imagetopdf: handleImageToPdf,
  split: handleSplit,
  rotate: handleRotate,
  watermark: handleWatermark,
  compress: handleCompress,
};

const worker = new Worker(
  "stackpdf-jobs",
  async (job) => {
    const { tool, filePaths, jobDir, extra } = job.data;
    const handler = HANDLERS[tool];
    if (!handler) throw new Error(`No worker handler for tool: ${tool}`);
    const result = await handler(job, { filePaths, jobDir, extra: extra || {} });
    return result;
  },
  { connection, concurrency: 4 } // process up to 4 jobs at once per worker instance
);

worker.on("completed", (job) => console.log(`[worker] job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));

console.log("StackPDF worker started, waiting for jobs...");
