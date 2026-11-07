/* R24-C: client-local private 155-page booklet preview, without private PDF/map upload. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const PDF_SHA = "a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d";
  const MAP_SHA = "4ca526eb48e2e21edb72e38dc5e474429f52a3e62f8d73fd635e1329b1410e90";
  const PDF_JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.min.mjs";
  const PDF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.worker.min.mjs";
  const source = new URLSearchParams(location.search);
  const fixture = source.get("fixture") || "";
  const entry = source.get("entry") || "";
  const validFixture = /^[A-Za-z0-9_.\u0E00-\u0E7F-]{1,180}$/.test(fixture);
  const validEntry = /^pdf-p\d{2}-l\d{2}$/.test(entry);
  const kind = validFixture && !entry ? "fixture" : validEntry && !fixture ? "entry" : null;
  const sourceId = kind === "fixture" ? fixture : kind === "entry" ? entry : null;
  const back = $("privateBack");
  back.href = kind === "fixture" ? "./index.html" : kind === "entry" ? "./committee.html" : "./booklets.html";
  const ui = {
    pdfInput:$("privatePdf"), mapInput:$("privateMap"), open:$("privateOpen"),
    status:$("privateStatus"), tools:$("privateTools"), page:$("privatePage"),
    pages:$("privatePages"), prev:$("privatePrev"), next:$("privateNext"),
    zoomOut:$("privateZoomOut"), zoomIn:$("privateZoomIn"),
    host:$("privateHost"), canvas:$("privateCanvas"), overlay:$("privateOverlay"),
    context:$("privateContext"), fileHint:$("privateFileHint")
  };
  let doc = null, page = 1, marker = null, pdfJs = null, zoom = 1, activeRender = null, sequence = 0;
  let loading = false;
  const digest = async (algorithm, data) => {
    const bytes = data instanceof ArrayBuffer ? data : new TextEncoder().encode(data);
    const hash = await crypto.subtle.digest(algorithm, bytes);
    return Array.from(new Uint8Array(hash), v => v.toString(16).padStart(2, "0")).join("");
  };
  function status(message, error = false) {
    ui.status.textContent = message;
    ui.status.dataset.error = String(error);
  }
  function validMap(map) {
    if (!map || map.schema_version !== 1 || map.document_status !== "review_only_not_public" ||
        map.source_sha256 !== PDF_SHA || map.page_count !== 155 || map.anchor_count !== 486 ||
        map.coordinate_space !== "normalized_top_left_cropbox" ||
        !map.entries || Array.isArray(map.entries) || typeof map.entries !== "object") return false;
    const keys = Object.keys(map.entries);
    if (keys.length !== 486 || !keys.every(key => /^v4[a-f0-9]{12}$/.test(key))) return false;
    for (const key of keys) {
      const row = map.entries[key], r = row?.rect;
      if (!Number.isInteger(row?.page) || row.page < 1 || row.page > 155 ||
          !Array.isArray(r) || r.length !== 4 ||
          !r.every(n => typeof n === "number" && Number.isFinite(n)) ||
          !(0 <= r[0] && r[0] < r[2] && r[2] <= 1 &&
            0 <= r[1] && r[1] < r[3] && r[3] <= 1)) return false;
    }
    return true;
  }
  function serializedMap(map) {
    return Object.keys(map.entries).sort().map(key => {
      const row = map.entries[key];
      return key + ":" + row.page + ":" + row.rect.join(",");
    }).join("\n");
  }
  async function verifiedMap(map) {
    return validMap(map) && (await digest("SHA-256", serializedMap(map))) === MAP_SHA;
  }
  async function sourceRow() {
    if (!sourceId) return null;
    if (kind === "fixture") {
      const response = await fetch("./data/program-from-pdf-2569-20261104-draft.json", {cache:"no-store"});
      if (!response.ok) throw Error("source_unavailable");
      const raw = await response.json();
      if (!Array.isArray(raw.fixtures) || raw.fixtures.length !== 237) throw Error("source_revision");
      const row = raw.fixtures.find(f => f.id === sourceId &&
        f.id !== "football-p07-มัธยมหญิง-020-repeated-final");
      return row ? {id:row.id,label:"รายการแข่งขัน · " + row.sport_id + " · คู่/รายการ " + row.source_match_no} : null;
    }
    const response = await fetch("./data/committee-2569-draft-public-review.json", {cache:"no-store"});
    if (!response.ok) throw Error("source_unavailable");
    const roster = await response.json();
    if (!Array.isArray(roster.entries) || roster.entries.length !== 250) throw Error("source_revision");
    const row = roster.entries.find(x => x.id === sourceId);
    return row ? {id:row.id,label:"กรรมการ · ข้อ " + (row.number || row.section)} : null;
  }
  function clearMark() {
    ui.overlay.replaceChildren();
  }
  function drawMark(viewport) {
    clearMark();
    if (!marker || page !== marker.page) return null;
    const r = marker.rect, top = Math.max(0, r[1] - (kind === "entry" ? .014 : .020));
    const bottom = Math.min(1, r[3] + (kind === "entry" ? .009 : .012));
    const mark = document.createElement("div");
    mark.className = "private-selected-row";
    mark.setAttribute("aria-hidden","true");
    mark.style.left = 0.075 * viewport.width + "px";
    mark.style.top = top * viewport.height + "px";
    mark.style.width = 0.85 * viewport.width + "px";
    mark.style.height = (bottom - top) * viewport.height + "px";
    ui.overlay.appendChild(mark);
    return {y:(top + bottom)/2 * viewport.height};
  }
  async function render() {
    if (!doc || loading) return;
    const mySeq = ++sequence;
    if (activeRender) {
      activeRender.cancel();
      try { await activeRender.promise; } catch (_) {}
      activeRender = null;
    }
    const pageObject = await doc.getPage(page);
    if (mySeq !== sequence) return;
    const baseline = pageObject.getViewport({scale:1});
    const width = Math.max(180, ui.host.clientWidth - 14);
    const scale = Math.min(2.5, Math.max(.45, width / baseline.width * zoom));
    const viewport = pageObject.getViewport({scale});
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    ui.canvas.width = Math.ceil(viewport.width * pixelRatio);
    ui.canvas.height = Math.ceil(viewport.height * pixelRatio);
    ui.canvas.style.width = viewport.width + "px";
    ui.canvas.style.height = viewport.height + "px";
    ui.overlay.style.width = viewport.width + "px";
    ui.overlay.style.height = viewport.height + "px";
    const context = ui.canvas.getContext("2d",{alpha:false});
    activeRender = pageObject.render({
      canvasContext:context,viewport,
      transform:[pixelRatio,0,0,pixelRatio,0,0]
    });
    try { await activeRender.promise; }
    catch (err) { if (err?.name === "RenderingCancelledException") return; throw err; }
    if (mySeq !== sequence) return;
    const pos = drawMark(viewport);
    ui.page.value=String(page);
    ui.pages.textContent=" / 155";
    ui.prev.disabled=page<=1;
    ui.next.disabled=page>=155;
    if (pos) ui.host.scrollTop=Math.max(0,pos.y-ui.host.clientHeight/2);
  }
  async function openLocal() {
    if (loading) return;
    if (!ui.pdfInput.files?.[0] || !ui.mapInput.files?.[0]) {
      status("เลือกทั้งไฟล์ PDF 155 หน้าและไฟล์ตำแหน่งตรวจร่างก่อน", true); return;
    }
    loading = true; ui.open.disabled=true;
    status("กำลังตรวจรุ่นเอกสารและตำแหน่งอ้างอิง…");
    try {
      if (!crypto?.subtle) throw Error("secure_context_required");
      if (ui.pdfInput.files[0].size > 35000000 || ui.mapInput.files[0].size > 2000000) throw Error("file_size");
      const pdfBytes = await ui.pdfInput.files[0].arrayBuffer();
      if ((await digest("SHA-256", pdfBytes)) !== PDF_SHA) throw Error("pdf_revision");
      const map = JSON.parse(await ui.mapInput.files[0].text());
      if (!(await verifiedMap(map))) throw Error("coordinate_revision");
      let target = null, label = "";
      if (sourceId) {
        const matched = await sourceRow();
        if (!matched) throw Error("unknown_source_id");
        const token = "v4" + (await digest("SHA-1",matched.id)).slice(0,12);
        target=Object.prototype.hasOwnProperty.call(map.entries,token) ? map.entries[token] : null;
        if (!target) throw Error("missing_source_anchor");
        label=matched.label;
      }
      if (!pdfJs) {
        pdfJs = await import(PDF_JS_URL);
        pdfJs.GlobalWorkerOptions.workerSrc=PDF_WORKER_URL;
      }
      const next = await pdfJs.getDocument({data:new Uint8Array(pdfBytes)}).promise;
      if (next.numPages !== 155) { await next.destroy(); throw Error("wrong_page_count"); }
      if (doc) await doc.destroy();
      doc=next;marker=target;page=target?.page || 1;zoom=1;sequence++;
      ui.context.textContent=label ? label + " · เล่มรวม หน้า " + page : "เล่มรวมฉบับตรวจร่าง · หน้า 1";
      ui.tools.hidden=false;ui.host.hidden=false;
      status(target ? "ตรวจไฟล์ตรงรุ่นแล้ว · เน้นบรรทัดรายการที่เลือก ไม่ใช่การรับรองข้อมูล" :
        "ตรวจไฟล์ตรงรุ่นแล้ว · เลื่อนอ่านเอกสารตรวจร่างได้");
      await render();
    } catch (err) {
      console.warn("R24-C private document could not be opened:",err?.message);
      clearMark();marker=null;
      ui.host.hidden=true;ui.tools.hidden=true;
      status("ยังเปิดเอกสารไม่ได้: ไฟล์ PDF/แผนที่ไม่ตรงฉบับ หรือข้อมูลอ้างอิงไม่พร้อม โปรดตรวจไฟล์ที่ได้รับอนุญาต",true);
    } finally { loading=false;ui.open.disabled=false; }
  }
  async function move(n) {
    if (!doc || !Number.isInteger(n) || n<1 || n>155) return;
    page=n;ui.host.scrollTop=0;clearMark();
    await render();
  }
  ui.open.addEventListener("click",openLocal);
  ui.prev.addEventListener("click",()=>move(page-1));
  ui.next.addEventListener("click",()=>move(page+1));
  ui.page.addEventListener("change",()=>move(Number(ui.page.value)));
  ui.zoomOut.addEventListener("click",()=>{zoom=Math.max(.7,zoom/1.25);render();});
  ui.zoomIn.addEventListener("click",()=>{zoom=Math.min(2.5,zoom*1.25);render();});
  let resize = 0;
  window.addEventListener("resize",()=>{
    clearTimeout(resize);resize=setTimeout(()=>{if (doc) render();},170);
  },{passive:true});
  if (sourceId) ui.fileHint.textContent="เปิดจากรหัสรายการที่เลือก · ต้องใช้ไฟล์สูจิบัตรและแผนที่ตำแหน่งฉบับเดียวกัน";
  window.NongkumPrivateBooklet = Object.freeze({validMap,serializedMap,verifiedMap});
})();