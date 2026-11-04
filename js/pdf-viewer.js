/**
 * R11D.2 — source-PDF viewer. This file only runs when pdf-viewer.html is opened.
 * PDF and requested page are same-origin/fixed; only source_pdf.page becomes ?page=N.
 * PDF.js and worker use the same pinned version. If CDN fails, offer local PDF.
 */
const PDF_URL = "./assets/souvenir-2569-v2.pdf";
const PDF_JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.min.mjs";
const PDF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.worker.min.mjs";
const EXPECTED_PAGES = 41;
const $ = (id) => document.getElementById(id);
const el = {
  prev: $("pdfPrev"), next: $("pdfNext"), input: $("pdfPage"),
  total: $("pdfTotal"), zoomOut: $("pdfZoomOut"), zoomIn: $("pdfZoomIn"),
  fitWidth: $("pdfFitWidth"), fitPage: $("pdfFitPage"),
  zoomLabel: $("pdfZoomLabel"), open: $("pdfOpenOriginal"),
  status: $("pdfStatus"), failure: $("pdfFailure"), fallback: $("pdfFallback"),
  retry: $("pdfRetry"), host: $("pdfCanvasHost"), canvas: $("pdfCanvas")
};
const pageQuery = new URLSearchParams(location.search).get("page");
function initialPage(raw) {
  if (!/^\d{1,2}$/.test(String(raw ?? ""))) return 1;
  return Math.max(1, Math.min(EXPECTED_PAGES, Number(raw)));
}
let pageNumber = initialPage(pageQuery);
let pdf = null;
let activeTask = null;
let generation = 0;
let zoom = 1;
let fitMode = "width";
let busy = false;
let resizeDebounce = null;

function updateOpenLinks() {
  const url = PDF_URL + "#page=" + pageNumber;
  el.open.href = url;
  el.fallback.href = url;
}
function updateToolbar() {
  const pages = pdf?.numPages ?? EXPECTED_PAGES;
  el.input.value = String(pageNumber);
  el.input.max = String(pages);
  el.total.textContent = "/ " + pages;
  el.prev.disabled = !pdf || pageNumber <= 1;
  el.next.disabled = !pdf || pageNumber >= pages;
  el.zoomIn.disabled = !pdf || zoom >= 2;
  el.zoomOut.disabled = !pdf || zoom <= 0.8;
  el.zoomLabel.textContent = zoom === 1
    ? (fitMode === "page" ? "พอดีทั้งหน้า" : "พอดีความกว้าง")
    : Math.round(zoom * 100) + "%";
  el.fitWidth.disabled = !pdf;
  el.fitPage.disabled = !pdf;
  el.fitWidth.setAttribute("aria-pressed", String(fitMode === "width"));
  el.fitPage.setAttribute("aria-pressed", String(fitMode === "page"));
  updateOpenLinks();
}
function setPage(page) {
  if (!pdf) return;
  const next = Math.min(pdf.numPages, Math.max(1, Math.trunc(Number(page) || 1)));
  if (next === pageNumber && !busy) return;
  pageNumber = next;
  updateToolbar();
  const url = new URL(location.href);
  url.searchParams.set("page", String(pageNumber));
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  // Page navigation always starts at the top, unlike zoom within the current page.
  el.host.scrollTop = 0;
  el.host.scrollLeft = 0;
  renderPage();
}
async function renderPage() {
  if (!pdf) return;
  const requestId = ++generation;
  if (activeTask) {
    // Finish cancellation before reusing the same canvas; quick taps otherwise
    // sometimes trigger "Cannot use the same canvas during multiple render()" on iOS.
    const previousPromise = activeTask.promise;
    try { activeTask.cancel(); } catch (_) {}
    activeTask = null;
    try { await previousPromise; } catch (_) { /* cancelled task settles here */ }
  }
  if (requestId !== generation) return;
  busy = true;
  el.status.hidden = false;
  el.status.textContent = "กำลังแสดงหน้า " + pageNumber + "…";
  el.failure.hidden = true;
  try {
    const page = await pdf.getPage(pageNumber);
    if (requestId !== generation) return;
    const unscaled = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(1, el.host.clientWidth - 22);
    const availableHeight = Math.max(1, el.host.clientHeight - 24);
    const baseScale = fitMode === "page"
      ? Math.min(availableWidth / unscaled.width, availableHeight / unscaled.height)
      : availableWidth / unscaled.width;
    const pageScale = Math.min(2.5, Math.max(0.1, baseScale)) * zoom;
    const viewport = page.getViewport({ scale: pageScale });
    // Cap backing canvas memory for iPhone / LINE WebView.
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2,
      Math.sqrt(8_000_000 / (viewport.width * viewport.height))));
    const canvas = el.canvas;
    canvas.width = Math.max(1, Math.round(viewport.width * ratio));
    canvas.height = Math.max(1, Math.round(viewport.height * ratio));
    canvas.style.width = Math.round(viewport.width) + "px";
    canvas.style.height = Math.round(viewport.height) + "px";
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw Error("ไม่รองรับ canvas");
    activeTask = page.render({
      canvasContext: context, viewport,
      transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0]
    });
    await activeTask.promise;
    if (requestId !== generation) return;
    activeTask = null;
    el.status.hidden = true;
    el.canvas.setAttribute("aria-label", "สูจิบัตรหน้า " + pageNumber + " จาก " + pdf.numPages + " หน้า");
  } catch (err) {
    if (requestId !== generation || err?.name === "RenderingCancelledException") return;
    el.status.textContent = "ไม่สามารถแสดงหน้าที่เลือกได้";
    el.failure.hidden = false;
    console.error("R11D.2 PDF page render failed", err);
  } finally {
    if (requestId === generation) busy = false;
  }
}
async function startViewer() {
  el.status.hidden = false;
  el.failure.hidden = true;
  el.status.textContent = "กำลังเปิดสูจิบัตร PDF…";
  updateToolbar();
  try {
    // Import only when the viewer is explicitly opened. Never load PDF.js for all 237 cards.
    const pdfjs = await import(PDF_JS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    const task = pdfjs.getDocument({ url: PDF_URL });
    pdf = await task.promise;
    if (pdf.numPages !== EXPECTED_PAGES) throw Error("จำนวนหน้าของสูจิบัตรเปลี่ยนจากที่ตรวจไว้");
    pageNumber = Math.min(pageNumber, pdf.numPages);
    updateToolbar();
    await renderPage();
  } catch (err) {
    el.status.textContent = "เปิดตัวอ่าน PDF ไม่สำเร็จ — ใช้ปุ่มเปิดไฟล์โดยตรงได้";
    el.failure.hidden = false;
    updateOpenLinks();
    console.error("R11D.2 PDF viewer failed", err);
  }
}
function setFitMode(mode) {
  if (!pdf || !["width", "page"].includes(mode)) return;
  fitMode = mode;
  zoom = 1;
  updateToolbar();
  el.host.scrollTop = 0;
  el.host.scrollLeft = 0;
  renderPage();
}
el.fitWidth.addEventListener("click", () => setFitMode("width"));
el.fitPage.addEventListener("click", () => setFitMode("page"));
el.prev.addEventListener("click", () => setPage(pageNumber - 1));
el.next.addEventListener("click", () => setPage(pageNumber + 1));
el.input.addEventListener("change", () => {
  if (!pdf) return;
  setPage(el.input.value);
  updateToolbar();
});
el.zoomIn.addEventListener("click", () => {
  zoom = Math.min(2, Math.round((zoom + 0.2) * 10) / 10);
  updateToolbar();
  renderPage();
});
el.zoomOut.addEventListener("click", () => {
  zoom = Math.max(0.8, Math.round((zoom - 0.2) * 10) / 10);
  updateToolbar();
  renderPage();
});
el.retry.addEventListener("click", () => {
  if (pdf) renderPage();
  else startViewer();
});
window.addEventListener("resize", () => {
  if (!pdf) return;
  if (resizeDebounce) clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => {
    resizeDebounce = null;
    renderPage();
  }, 220);
});
updateToolbar();
startViewer();
