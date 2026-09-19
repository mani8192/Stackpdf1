import Head from "next/head";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TOOLS = [
  { id: "merge", icon: "🧩", name: "Merge PDF", desc: "Combine multiple PDFs into one file.", accept: ".pdf", api: "/api/merge", multi: true, outputName: "merged.pdf" },
  { id: "split", icon: "✂️", name: "Split PDF", desc: "Split a PDF into single-page files.", accept: ".pdf", api: "/api/split", multi: false, outputName: "split-pages.zip" },
  { id: "imagetopdf", icon: "🖼️", name: "Image to PDF", desc: "Turn JPG/PNG images into a PDF.", accept: "image/*", api: "/api/imagetopdf", multi: true, outputName: "images.pdf" },
  { id: "rotate", icon: "🔄", name: "Rotate PDF", desc: "Rotate all pages by 90°.", accept: ".pdf", api: "/api/rotate", multi: false, outputName: "rotated.pdf" },
  { id: "watermark", icon: "💧", name: "Watermark", desc: "Stamp a text watermark on every page.", accept: ".pdf", api: "/api/watermark", multi: false, outputName: "watermarked.pdf" },
  { id: "compress", icon: "📉", name: "Compress PDF", desc: "Shrink PDF file size.", accept: ".pdf", api: "/api/compress", multi: false, outputName: "compressed.pdf" },
  { id: "wordtopdf", icon: "📝", name: "Word to PDF", desc: "Convert .doc/.docx to PDF.", accept: ".doc,.docx", api: "/api/wordtopdf", multi: false, outputName: "converted.pdf" },
  { id: "exceltopdf", icon: "📊", name: "Excel to PDF", desc: "Convert .xls/.xlsx to PDF.", accept: ".xls,.xlsx", api: "/api/exceltopdf", multi: false, outputName: "converted.pdf" },
  { id: "pdftoword", icon: "📄", name: "PDF to Word", desc: "Extract PDF text into an editable .docx.", accept: ".pdf", api: "/api/pdftoword", multi: false, outputName: "converted.docx" },
  { id: "protect", icon: "🔐", name: "Protect PDF", desc: "Add a password to your PDF.", accept: ".pdf", api: "/api/protect", multi: false, outputName: "protected.pdf", needsPassword: true },
  { id: "ocr", icon: "🔎", name: "OCR Image", desc: "Extract text from a scanned image.", accept: "image/*", api: "/api/ocr", multi: false, outputName: null, textOutput: true },
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

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const fmt = (b) => (b < 1024 ? b + " B" : b < 1024 * 1024 ? (b / 1024).toFixed(1) + " KB" : (b / 1024 / 1024).toFixed(2) + " MB");

  function openTool(t) {
    setActive(t);
    setFiles([]);
    setStatuses([]);
    setProgress(0);
  }

  function addFiles(list) {
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr]);
    setStatuses((prev) => [...prev, ...arr.map(() => "wait")]);
  }

  async function run() {
    if (!active || files.length === 0) return;
    setBusy(true);
    setProgress(5);
    setStatuses(files.map(() => "proc"));
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      if (active.id === "watermark") fd.append("text", "StackPDF");
      if (active.id === "rotate") fd.append("angle", "90");
      if (active.id === "protect") fd.append("password", password || "stackpdf");

      // simulate live progress while the real request is in flight
      let p = 10;
      const timer = setInterval(() => {
        p = Math.min(p + Math.random() * 15, 90);
        setProgress(p);
      }, 250);

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
    } catch (e) {
      alert("Error: " + e.message);
      setStatuses(files.map(() => "wait"));
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
          <div className="logo">📚<span>Stack</span>PDF</div>
          <div className="navlinks">
            <a href="#tools">Tools</a>
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
          <p>Merge, split, compress and convert your PDFs and images — real backend processing, fast and secure.</p>
        </motion.section>

        <section id="tools">
          <h2 className="section-title">Popular Tools</h2>
          <p className="section-sub">Pick a tool to get started.</p>
          <div className="tools-grid">
            {TOOLS.map((t, i) => (
              <motion.div
                key={t.id}
                className="tool-card"
                onClick={() => openTool(t)}
                whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(20,40,80,.12)" }}
                whileTap={{ scale: 0.97 }}
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
              className="workspace"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>{active.name}</h3>
                <span style={{ cursor: "pointer", color: "var(--muted)" }} onClick={() => setActive(null)}>✕</span>
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
                    <div><b>{Math.round(progress)}%</b>Progress</div>
                  </div>
                  <div className="progress-outer">
                    <motion.div
                      className="progress-inner"
                      animate={{ width: progress + "%" }}
                      transition={{ ease: "easeOut" }}
                    />
                  </div>
                  <div>
                    {files.map((f, i) => (
                      <div className="frow" key={i}>
                        <span>📄</span>
                        <span className="fname">{f.name}</span>
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>{fmt(f.size)}</span>
                        <span className={statuses[i] === "done" ? "status-done" : statuses[i] === "proc" ? "status-proc" : "status-wait"}>
                          {statuses[i] === "done" ? "Done" : statuses[i] === "proc" ? "Processing…" : "Waiting"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button className="btn btn-primary" onClick={run} disabled={busy}>
                      {busy ? "Processing…" : "Process Files"}
                    </button>
                    <button className="btn" onClick={() => { setFiles([]); setStatuses([]); setProgress(0); }}>Clear</button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer>
        <div className="wrap">© 2026 StackPDF. All rights reserved.</div>
      </footer>
    </>
  );
}
