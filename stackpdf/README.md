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
