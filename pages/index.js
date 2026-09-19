import Head from "next/head";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TOOLS = [
  { id: "merge", icon: "🧩", name: "Merge PDF", desc: "Combine multiple PDFs into one file.", accept: ".pdf", api: "/api/merge", multi: true, outputName: "merged.pdf", queued: true },
  { id: "split", icon: "✂️", name: "Split PDF", desc: "Split a PDF into single-page files.", accept: ".pdf", api: "/api/split", multi: false, outputName: "split-pages.zip", queued: true },
  { id: "imagetopdf", icon: "🖼️", name: "Image to PDF", desc: "Turn JPG/PNG images into a PDF.", accept: "image/*", api: "/api/imagetopdf", multi: true, outputName: "images.pdf", queued: true },
  { id: "rotate", icon: "🔄", name: "Rotate PDF", desc: "Rotate all pages by 90°.", accept: ".pdf", api: "/api/rotate", multi: false, outputName: "rotated.pdf", queued: true },
  { id: "watermark", icon: "💧", name: "Watermark", desc: "Stamp a text watermark on every page.", accept: ".pdf", api: "/api/watermark", multi: false, outputName: "watermarked.pdf", queued: true },
  { id: "compress", icon: "📉", name: "Compress PDF", desc: "Shrink PDF file size.", accept: ".pdf", api: "/api/compress", multi: false, outputName: "compressed.pdf", queued: true },
  { id: "wordtopdf", icon: "📝", name: "Word to PDF", desc: "Convert .doc/.docx to PDF.", accept: ".doc,.docx", api: "/api/wordtopdf", multi: false, outputName: "converted.pdf" },
  { id: "exceltopdf", icon: "📊", name: "Excel to PDF", desc: "Convert .xls/.xlsx to PDF.", accept: ".xls,.xlsx", api: "/api/exceltopdf", multi: false, outputName: "converted.pdf" },
  { id: "pdftoword", icon: "📄", name: "PDF to Word", desc: "Extract PDF text into an editable .docx.", accept: ".pdf", api: "/api/pdftoword", multi: false, outputName: "converted.docx" },
  { id: "protect", icon: "🔐", name: "Protect PDF", desc: "Add a password to your PDF.", accept: ".pdf", api: "/api/protect", multi: false, outputName: "protected.pdf", needsPassword: true },
  { id: "ocr", icon: "🔎", name: "OCR Image", desc: "Extract text from a scanned image.", accept: "image/*", api: "/api/ocr", multi: false, outputName: null, textOutput: true },
];

const ABOUT_FEATURES = [
  { icon: "⚡", title: "Instant Processing", text: "Files start processing the moment you drop them — no waiting in a queue." },
  { icon: "🔒", title: "Private by Design", text: "Files are processed and discarded — nothing is stored longer than needed." },
  { icon: "📦", title: "Handles Any Volume", text: "1 file or 1,000 files — the same smooth experience every time." },
  { icon: "🧩", title: "11 Tools, One Place", text: "Merge, split, convert, protect and more — no need to jump between apps." },
  { icon: "🌍", title: "Works Everywhere", text: "Any browser, any device — phone, tablet or desktop." },
  { icon: "🌓", title: "Light & Dark Mode", text: "Matches your system theme automatically." },
  { icon: "🖼️", title: "Image ↔ PDF", text: "Turn photos into polished PDFs or pull pages back out as images." },
  { icon: "💧", title: "Watermark & Protect", text: "Stamp your brand or lock sensitive files with a password." },
  { icon: "🔎", title: "Built-in OCR", text: "Pull readable text out of scanned images in seconds." },
  { icon: "📊", title: "Office Conversions", text: "Word and Excel files convert to PDF without losing formatting." },
  { icon: "🎯", title: "Simple by Default", text: "No clutter — pick a tool, drop a file, get your result." },
];

export default function Home() {
  const [active, setActive] = useState(null);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statuses, setStatuses] = useState([]);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [ocrText, setOcrText] = useState("");
  const inputRef = useRef(null);
  const workspaceRef = useRef(null);

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const doneCount = statuses.filter((s) => s === "done").length;
  const fmt = (b) => (b < 1024 ? b + " B" : b < 1024 * 1024 ? (b / 1024).toFixed(1) + " KB" : (b / 1024 / 1024).toFixed(2) + " MB");

  function goHome() {
    setActive(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openTool(t) {
    setActive(t);
    setFiles([]);
    setStatuses([]);
    setProgress(0);
    setOcrText("");
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function addFiles(list) {
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr]);
    setStatuses((prev) => [...prev, ...arr.map(() => "ready")]);
  }

  function removeFile(i) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setStatuses((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function runQueued() {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("tool", active.id);
    if (active.id === "watermark") fd.append("text", "StackPDF");
    if (active.id === "rotate") fd.append("angle", "90");

    const submitRes = await fetch("/api/jobs/submit", { method: "POST", body: fd });
    if (!submitRes.ok) {
      const err = await submitRes.json().catch(() => ({}));
      throw new Error(err.error || "Could not submit job");
    }
    const { jobId } = await submitRes.json();

    // Poll for progress — works the same whether it's 1 file or 10,000,
    // because the actual processing runs in a separate worker process and
    // never blocks this request.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((r) => setTimeout(r, 400));
      const statusRes = await fetch(`/api/jobs/status/${jobId}`);
      const status = await statusRes.json();
      const p = status.progress?.percent ?? 0;
      const doneN = status.progress?.doneCount ?? 0;
      setProgress(p);
      setStatuses((prev) => prev.map((s, i) => (i < doneN ? "done" : s)));

      if (status.state === "completed") {
        setProgress(100);
        setStatuses(files.map(() => "done"));
        const resultRes = await fetch(`/api/jobs/result/${jobId}`);
        const blob = await resultRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stackpdf-${active.outputName}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }
      if (status.state === "failed") {
        throw new Error(status.failedReason || "Job failed");
      }
    }
  }

  async function runDirect() {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    if (active.id === "watermark") fd.append("text", "StackPDF");
    if (active.id === "rotate") fd.append("angle", "90");
    if (active.id === "protect") fd.append("password", password || "stackpdf");

    const total = files.length;
    let tickIndex = 0;
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + Math.max(2, 40 / Math.sqrt(total)), 92);
        const shouldBeDone = Math.floor((next / 100) * total);
        if (shouldBeDone > tickIndex) {
          setStatuses((prev) => prev.map((s, i) => (i < shouldBeDone ? "done" : s)));
          tickIndex = shouldBeDone;
        }
        return next;
      });
    }, 40);

    const res = await fetch(active.api, { method: "POST", body: fd });
    clearInterval(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Processing failed");
    }
    setProgress(100);
    setStatuses(files.map(() => "done"));

    if (active.textOutput) {
      const json = await res.json();
      setOcrText(json.text || "");
    } else {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stackpdf-${active.outputName}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }

  async function run() {
    if (!active || files.length === 0) return;
    setBusy(true);
    setProgress(2);
    setStatuses(files.map(() => "proc"));
    try {
      if (active.queued) {
        await runQueued();
      } else {
        await runDirect();
      }
    } catch (e) {
      alert("Error: " + e.message);
      setStatuses(files.map(() => "ready"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>StackPDF — All-in-One PDF & File Toolkit</title>
        <meta name="description" content="Merge, split, compress and convert PDFs and images online — fast, secure, free." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>" />
      </Head>

      <header>
        <div className="wrap nav">
          <div className="logo" style={{ cursor: "pointer" }} onClick={goHome}>📚<span>Stack</span>PDF</div>
          <div className="navlinks">
            <a href="#tools">Tools</a>
            <a href="#about">About</a>
            <a href="#why">Why Us</a>
          </div>
          <button className="btn btn-primary">Sign Up</button>
        </div>
      </header>

      <main className="wrap">
        <motion.section
          className="hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="pill">⚡ All-in-One PDF & File Toolkit</span>
          <h1>Work Smarter with <span>StackPDF</span></h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <p style={{ margin: 0 }}>Merge, split, compress and convert your PDFs and images — real backend processing, fast and secure.</p>
            <motion.div
              title="Photos → PDF"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              style={{
                flexShrink: 0, width: 54, height: 54, borderRadius: "50%",
                background: "var(--accent-bg)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}
            >
              🖼️→📄
            </motion.div>
          </div>
        </motion.section>

        <section id="tools">
          <h2 className="section-title">Popular Tools</h2>
          <p className="section-sub">Pick a tool to get started — the upload box opens instantly.</p>
          <div className="tools-grid">
            {TOOLS.map((t, i) => (
              <motion.div
                key={t.id}
                className="tool-card"
                onClick={() => openTool(t)}
                whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(20,40,80,.12)" }}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="tool-icon">{t.icon}</div>
                <h3>{t.name}</h3>
                <p>{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <AnimatePresence>
          {active && (
            <motion.div
              ref={workspaceRef}
              className="workspace"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{active.name}</h3>
                <motion.span
                  whileHover={{ rotate: 90, scale: 1.15, color: "var(--danger)" }}
                  whileTap={{ scale: 0.85 }}
                  style={{ cursor: "pointer", color: "var(--muted)", fontSize: 18, display: "inline-block" }}
                  onClick={() => setActive(null)}
                >
                  ✕
                </motion.span>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>{active.desc}</p>

              <div
                className={"drop" + (dragging ? " drag" : "")}
                onClick={() => inputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              >
                <div style={{ fontSize: 34 }}>☁️</div>
                <div style={{ fontWeight: 600 }}>Drag & drop your files here</div>
                <div style={{ color: "var(--muted)", fontSize: 13, margin: "6px 0" }}>or</div>
                <button className="btn btn-primary">Choose Files</button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple={active.multi}
                  accept={active.accept}
                  style={{ display: "none" }}
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {active.needsPassword && (
                <div style={{ marginTop: 14 }}>
                  <input
                    type="text"
                    placeholder="Set a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", width: "100%", maxWidth: 260 }}
                  />
                </div>
              )}

              {ocrText && active.textOutput && (
                <div style={{ marginTop: 14, padding: 14, background: "var(--accent-bg)", borderRadius: 10, fontSize: 13, whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>
                  {ocrText}
                </div>
              )}

              {files.length > 0 && (
                <>
                  <div className="stat-row">
                    <div><b>{files.length}</b>Files</div>
                    <div><b>{fmt(totalSize)}</b>Total size</div>
                    <div><b>{doneCount}/{files.length}</b>Completed</div>
                    <div><b>{Math.round(progress)}%</b>Progress</div>
                  </div>
                  <div className="progress-outer">
                    <motion.div
                      className="progress-inner"
                      animate={{ width: progress + "%" }}
                      transition={{ ease: "easeOut", duration: 0.15 }}
                    />
                  </div>
                  <div>
                    <AnimatePresence>
                      {files.map((f, i) => (
                        <motion.div
                          className="frow"
                          key={f.name + i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                        >
                          <span>📄</span>
                          <span className="fname">{f.name}</span>
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>{fmt(f.size)}</span>
                          {statuses[i] === "done" ? (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="status-done">
                              ✅ Done
                            </motion.span>
                          ) : statuses[i] === "proc" ? (
                            <span className="status-proc">⏳ Processing…</span>
                          ) : (
                            <span className="status-done" style={{ opacity: 0.6 }}>✓ Ready</span>
                          )}
                          {!busy && (
                            <span
                              style={{ cursor: "pointer", color: "var(--muted)", marginLeft: 6 }}
                              onClick={() => removeFile(i)}
                              title="Remove"
                            >
                              ✕
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="toolbar" style={{ marginTop: 14 }}>
                    <motion.button
                      className="btn btn-primary"
                      onClick={run}
                      disabled={busy}
                      whileHover={{ scale: busy ? 1 : 1.03 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      {busy ? "Processing…" : "Process Files"}
                    </motion.button>
                    <button className="btn" onClick={() => { setFiles([]); setStatuses([]); setProgress(0); }}>Clear</button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <section id="about" style={{ padding: "50px 0" }}>
          <h2 className="section-title">About StackPDF</h2>
          <p className="section-sub" style={{ maxWidth: 640 }}>
            StackPDF is a full-stack PDF and file toolkit built to make everyday
            document work fast, private and frustration-free — whether you're
            handling one file or thousands.
          </p>
          <div className="tools-grid">
            {ABOUT_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="tool-card"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <div className="tool-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="why">
          <h2 className="section-title">Why Choose StackPDF?</h2>
          <div className="tools-grid">
            <div className="tool-card"><div className="tool-icon">⚡</div><h3>Lightning Fast</h3><p>Optimized processing, no lag at any scale.</p></div>
            <div className="tool-card"><div className="tool-icon">🔒</div><h3>Secure & Private</h3><p>Your files, your control.</p></div>
            <div className="tool-card"><div className="tool-icon">📱</div><h3>Works Everywhere</h3><p>Any device, any browser.</p></div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div>© 2026 StackPDF. All rights reserved.</div>
          <div style={{ marginTop: 10 }}>Developed by Manish Tiwari</div>
          <div
            style={{
              fontFamily: "'Brush Script MT', cursive",
              fontSize: 28,
              marginTop: 4,
              color: "var(--primary)",
            }}
          >
            Manish Tiwari
          </div>
        </div>
      </footer>
    </>
  );
}
