# StackPDF — Full-Stack PDF Toolkit

Next.js app with a working frontend (React + Framer Motion) and real backend
API routes (Node.js + pdf-lib) that actually merge, split, rotate, watermark,
compress PDFs and convert images to PDF.

## 1. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 2. Deploy to Vercel (with your own domain)

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "StackPDF"
   git branch -M main
   git remote add origin https://github.com/<your-username>/stackpdf.git
   git push -u origin main
   ```
2. Go to https://vercel.com → **Add New Project** → import the `stackpdf` repo.
3. Framework preset: Vercel auto-detects **Next.js** — leave defaults, click **Deploy**.
4. After deploy you'll get a URL like `stackpdf.vercel.app`.
5. To use your own domain: Vercel Project → **Settings → Domains** → add
   `stackpdf.com` (or whatever you bought) → Vercel shows an A/CNAME record →
   add that record in your domain registrar's DNS panel → wait a few minutes
   for it to verify. HTTPS is automatic.

## 3. File size limits

- Vercel's free/hobby plan serverless functions accept up to ~4.5MB request
  body by default; for large PDFs (100+ MB) you'll want either:
  - a paid Vercel plan with a higher body-size limit, or
  - moving heavy processing to a small VPS / Render / Railway Node server
    instead of serverless functions (the `pages/api/*` code works unchanged
    on a plain Node/Express server too).

## 4. All tools — real backend, two deployment tiers

**Tier A — works on plain Vercel serverless (no extra setup):**
Merge PDF, Split PDF, Image → PDF, Rotate PDF, Watermark, Compress, PDF → Word
(text extraction), OCR Image (tesseract.js, pure JS/WASM).

**Tier B — needs system binaries, so deploy with the included `Dockerfile`
on a VPS/Render/Railway/Fly.io instead of plain Vercel serverless:**
- Word → PDF, Excel → PDF — shell out to LibreOffice (`apt install libreoffice`)
- Protect PDF (password encryption) — shells out to `qpdf` (`apt install qpdf`)

Vercel serverless functions can't run these because they don't allow
installing system packages. Easiest fix: deploy the whole app with Docker
(see below) — then every tool, including Tier B, works from one URL.

### Deploy with Docker (all tools working, incl. Word/Excel/Protect)

```bash
docker build -t stackpdf .
docker run -p 3000:3000 stackpdf
```

Push that image to any host that runs Docker containers — Render, Railway,
Fly.io, or a plain VPS (DigitalOcean/Hetzner) all work. Point your domain's
A/CNAME record at that host the same way as described above for Vercel.

### PDF → Word note
Current implementation extracts text and rebuilds a .docx — fast and works
everywhere, but doesn't preserve exact layout/images. For pixel-perfect
conversion, swap in a paid API (CloudConvert, Adobe PDF Services) inside
`pages/api/pdftoword.js`.

### Login/signup + file history (optional next step)
Not included yet. Recommended: **Supabase** (free tier) for Postgres + Auth +
Storage — ask and I'll wire it in.

## 5. Adding accounts + history (optional next step)

Recommended stack: **Supabase** (free tier) for Postgres + Auth + Storage.
- `supabase.auth` for login/signup
- Store processed file metadata in a `files` table
- Store actual files in Supabase Storage bucket if you want download history

Ask me and I'll wire this in.

## 6. Large-batch background processing (1 to 10,000+ files)

Files like Merge, Split, Image→PDF, Rotate, Watermark, Compress now run
through a **background job queue** (BullMQ + Redis) instead of processing
inline in the API request. This means:

- Submitting a job is instant — the web server just enqueues it and returns
  a `jobId`, so it never times out no matter how many files are in the batch.
- One or more separate **worker** processes (`npm run worker`) pull jobs off
  the queue and do the real work, reporting per-file progress back.
- The frontend polls `/api/jobs/status/<id>` every ~400ms and shows each
  file ticking to "Done" as the worker finishes it — real progress, not a
  simulation.
- You can run multiple worker processes (on the same machine or several
  machines) to process many jobs in parallel — just point them all at the
  same `REDIS_URL`.

### Run it locally

You need Redis running. Easiest: install [Docker], then:

```bash
docker run -p 6379:6379 redis:7-alpine
```

In one terminal:
```bash
npm run dev
```
In another terminal:
```bash
npm run worker
```

### Run everything with Docker Compose (web + worker + Redis, one command)

```bash
docker-compose up --build
```

This starts Redis, the Next.js web app, and the worker process together,
sharing an `uploads` volume. Open http://localhost:3000.

For production (Render/Railway/Fly.io/VPS), deploy the same image twice:
once as the "web" service (`npm start`), once as the "worker" service
(`npm run worker`), both pointed at the same managed Redis instance
(Render, Railway and Upstash all offer a free/cheap Redis add-on).

Tools that still use LibreOffice/qpdf (Word/Excel/Protect) are unaffected
by this change — they still run synchronously since they're normally quick,
single-file operations.
