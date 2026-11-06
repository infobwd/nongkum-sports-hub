/**
 * R11D.2 — source-PDF viewer. This file only runs when pdf-viewer.html is opened.
 * PDF paths are fixed to two same-origin approved documents (41-page program or 64-page committee V3).
 * doc=committee selects the committee document; other values retain the original program PDF.
 * PDF.js and worker use the same pinned version. If CDN fails, offer local PDF.
 */
const query = new URLSearchParams(location.search);
const isCommittee = query.get("doc") === "committee";
const PDF_URL = isCommittee ? "./assets/souvenir-committee-2569-v3.pdf" : "./assets/souvenir-2569-v2.pdf";
const PDF_JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.min.mjs";
const PDF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.worker.min.mjs";
const EXPECTED_PAGES = isCommittee ? 64 : 41;
const $ = (id) => document.getElementById(id);
const el = {
  prev: $("pdfPrev"), next: $("pdfNext"), input: $("pdfPage"),
  total: $("pdfTotal"), zoomOut: $("pdfZoomOut"), zoomIn: $("pdfZoomIn"),
  fitWidth: $("pdfFitWidth"), fitPage: $("pdfFitPage"),
  zoomLabel: $("pdfZoomLabel"), open: $("pdfOpenOriginal"),
  status: $("pdfStatus"), failure: $("pdfFailure"), fallback: $("pdfFallback"),
  retry: $("pdfRetry"), host: $("pdfCanvasHost"), canvas: $("pdfCanvas"),
  back: $("pdfBack"), tools: $("pdfTools"), bottomBar: $("pdfBottomBar")
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
let swipeStart = null;
let pinchStart = null;
let lastTap = null;
const fixtureRef = query.get("fixture") || "";
const embedded = query.get("embedded") === "1" &&
  typeof window !== "undefined" && window.parent && window.parent !== window;
const openedFromProgram = !isCommittee && query.get("from")==="program";
const backUrl = new URL(isCommittee ? "./committee.html" : (openedFromProgram ? "./index.html" : "./review.html"), location.href);
// Never accept an arbitrary redirect target. Only a known same-origin program/review
// route can be selected. A valid fixture ID narrows the destination to the same card.
if (!isCommittee && fixtureRef.length <= 180 && /^[A-Za-z0-9_.\u0E00-\u0E7F-]+$/.test(fixtureRef)) {
  backUrl.searchParams.set("fixture", fixtureRef);
}
el.back.href = backUrl.toString();
if(openedFromProgram){
  el.back.textContent="← กลับไปตารางแข่ง";
  el.back.setAttribute("aria-label","ปิด PDF และกลับไปคู่แข่งขันในตาราง");
}
if (isCommittee) {
  document.title = "อ่านสูจิบัตรกรรมการ V3 · มิตรภาพเกมส์ 2569";
  el.back.textContent = "← กลับไปหน้ากรรมการ";
  el.back.setAttribute("aria-label", "ปิด PDF แล้วกลับไปหน้ากรรมการ");
  const heading = document.querySelector(".pdf-book-title");
  if (heading) {
    heading.textContent = "สูจิบัตรกรรมการ ";
    const caption = document.createElement("small");
    caption.textContent = "V3 · รอตรวจ";
    heading.appendChild(caption);
  }
  const footer = document.querySelector(".pdf-draft");
  if (footer) footer.textContent = "สูจิบัตรกรรมการ V3 · รอตรวจ ไม่ใช่คำสั่งแต่งตั้ง";
  const sourceLink = document.getElementById("pdfOpenOriginal");
  if (sourceLink) sourceLink.textContent = "เปิด PDF ฉบับเต็ม";
}
// An embedded reader uses the parent Review header and warning. Reuse the
// existing options menu in the *same* bottom navigation (no duplicate controls).
// Do not activate embedded mode for a direct/standalone tab with ?embedded=1.
if (embedded) {
  document.documentElement?.classList?.add("pdf-embedded");
  if (typeof el.bottomBar?.appendChild === "function") {
    el.bottomBar.appendChild(el.tools);
  }
}

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
  lastTap = null;
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

function updateZoom(nextZoom) {
  if (!pdf) return;
  zoom = Math.max(0.8, Math.min(2, Math.round(nextZoom * 10) / 10));
  updateToolbar();
  renderPage();
}
function touchPoint(touch) {
  return { x: touch.clientX, y: touch.clientY };
}
function touchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}
// Book-style gestures are limited to the PDF reading surface. Native vertical panning
// remains available and swipe page-turns are disabled whenever the PDF is zoomed.
el.host.addEventListener("touchstart", event => {
  if (!pdf) return;
  if (event.touches.length >= 2) {
    const distance = touchDistance(event.touches);
    pinchStart = distance > 0 ? { distance, zoomAtStart: zoom, previewZoom: zoom } : null;
    swipeStart = null;
    lastTap = null;
  } else if (event.touches.length === 1 && !pinchStart) {
    swipeStart = { ...touchPoint(event.touches[0]), at: Date.now() };
  }
}, { passive: true });
el.host.addEventListener("touchmove", event => {
  if (!pinchStart || event.touches.length < 2) return;
  if (event.cancelable) event.preventDefault(); // Prevent Safari page zoom only on a two-finger gesture.
  const distance = touchDistance(event.touches);
  pinchStart.previewZoom = Math.max(0.8, Math.min(2,
    pinchStart.zoomAtStart * distance / pinchStart.distance));
  // Lightweight preview; commit to a PDF.js render only after the gesture finishes.
  el.canvas.style.transformOrigin = "center top";
  el.canvas.style.transform = "scale(" + (pinchStart.previewZoom / zoom) + ")";
}, { passive: false });
el.host.addEventListener("touchend", event => {
  if (pinchStart) {
    if (event.touches.length < 2) {
      const next = pinchStart.previewZoom;
      pinchStart = null;
      swipeStart = null;
      lastTap = null;
      el.canvas.style.transform = "";
      el.canvas.style.transformOrigin = "";
      updateZoom(next);
    }
    return;
  }
  if (event.touches.length || !swipeStart || !event.changedTouches.length) return;
  const end = touchPoint(event.changedTouches[0]);
  const dx = end.x - swipeStart.x, dy = end.y - swipeStart.y;
  const duration = Date.now() - swipeStart.at;
  swipeStart = null;
  if (zoom === 1 && Math.abs(dx) >= 65 && Math.abs(dx) > Math.abs(dy) * 1.35 &&
      duration <= 850) {
    lastTap = null;
    setPage(pageNumber + (dx < 0 ? 1 : -1));
    return;
  }
  if (Math.abs(dx) > 20 || Math.abs(dy) > 20 || duration > 350) {
    lastTap = null;
    return;
  }
  const now = Date.now();
  if (lastTap && now - lastTap.at < 340 &&
      Math.hypot(end.x - lastTap.x, end.y - lastTap.y) < 32) {
    lastTap = null;
    updateZoom(zoom > 1 ? 1 : 1.8);
  } else {
    lastTap = { ...end, at: now };
  }
}, { passive: true });
el.host.addEventListener("touchcancel", () => {
  swipeStart = null;
  pinchStart = null;
  lastTap = null;
  el.canvas.style.transform = "";
  el.canvas.style.transformOrigin = "";
}, { passive: true });
// The enclosing mobile review dialog has its own close button. The direct
// viewer can always navigate to the same-origin review page, even from LINE.
el.back.addEventListener("click", event => {
  if (!embedded) return; // Native href is the standalone fallback.
  event.preventDefault();
  window.parent.postMessage({ type: "nongkum:close-pdf-viewer" }, location.origin);
});

el.prev.addEventListener("click", () => setPage(pageNumber - 1));
el.next.addEventListener("click", () => setPage(pageNumber + 1));
el.input.addEventListener("change", () => {
  if (!pdf) return;
  setPage(el.input.value);
  updateToolbar();
});
el.zoomIn.addEventListener("click", () => updateZoom(zoom + 0.2));
el.zoomOut.addEventListener("click", () => updateZoom(zoom - 0.2));
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
