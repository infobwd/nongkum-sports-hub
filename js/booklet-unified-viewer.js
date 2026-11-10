/* R25-E: Design V2 R25D3 155-page public review PDF in immutable same-origin chunks; full SHA required before display. */
(() => {
"use strict";
const PDF_PARTS = Object.freeze(Array.from({length:7}, (_,i)=>"./assets/r25d3-155pages/part-"+String(i+1).padStart(2,"0")+".b64"));
const PDF_PART_LENGTHS = Object.freeze([819200,819200,819200,819200,819200,819200,723632]);
const PDF_BYTE_LENGTH = 4229122;
const PDF_SHA = "9da71db34f092a4a65a1ee2ea05984b343fc03097988854b1debe5251e2fae1a";
const MAP_SHA = "4ca526eb48e2e21edb72e38dc5e474429f52a3e62f8d73fd635e1329b1410e90";
const EXPECTED_PAGES = 155;
const MAX_PDF_BYTES = 35_000_000;
const PDF_JS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.min.mjs";
const PDF_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.worker.min.mjs";
const $ = id => document.getElementById(id);
const ui = {
  start:$("r24gStart"), status:$("r24gStatus"),
  local:$("r24gLocalPdf"), change:$("r24gChangeSource"),
  pdfStatus:$("pdfStatus"), host:$("pdfCanvasHost"), surface:$("pdfPageSurface"),
  canvas:$("pdfCanvas"), overlay:$("pdfHighlightLayer"),
  prev:$("pdfPrev"), next:$("pdfNext"), page:$("pdfPage"), total:$("pdfTotal"),
  zoomOut:$("pdfZoomOut"), zoomIn:$("pdfZoomIn"), zoomLabel:$("pdfZoomLabel"),
  fitWidth:$("pdfFitWidth"), fitPage:$("pdfFitPage"), tools:$("pdfTools"),
  bottom:$("pdfBottomBar"), swipe:$("pdfSwipe"),
  match:$("pdfMatchStatus"), mapSection:$("r24gMapSection"),
  mapInput:$("r24gMap"), mapStatus:$("r24gMapStatus")
};
const params = new URLSearchParams(location.search);
const fixture = params.get("fixture") || "";
const entry = params.get("entry") || "";
const validFixture = /^[A-Za-z0-9_.\u0E00-\u0E7F-]{1,180}$/.test(fixture);
const validEntry = /^pdf-p\d{2}-l\d{2}$/.test(entry);
const kind = validFixture && !entry ? "fixture" : validEntry && !fixture ? "entry" : null;
const sourceId = kind === "fixture" ? fixture : kind === "entry" ? entry : null;
const originalBack = $("pdfBack");
const noteId = params.get("note") || "";
const openedFromNotes = !sourceId && /^[A-Z0-9-]{4,70}$/.test(noteId);
if(openedFromNotes){
  originalBack.href="./booklet-notes.html?note="+encodeURIComponent(noteId)+"#note-"+noteId;
  originalBack.textContent="← กลับไปข้อสังเกต";
  originalBack.setAttribute("aria-label","กลับไปยังข้อสังเกตเรื่องเดิม");
  const warning=$("r24kBookNotice");
  if(warning)warning.hidden=false;
}
if (kind === "fixture") originalBack.href = "./index.html";
if (kind === "entry") originalBack.href = "./committee.html";
function parsePage(raw) {
  return /^\d{1,3}$/.test(String(raw ?? "")) ? Math.min(155,Math.max(1,Number(raw))) : 1;
}
let pageNumber = parsePage(params.get("page"));
let pdf = null, pdfjs = null, renderTask = null, generation = 0;
let zoom = 1, fitMode = "width", swipeStart = null, pinchStart = null, lastTap = null;
let marker = null, markerPositioned = false, resizeTimer = null, busy = false;
function status(message,error=false) {
  ui.status.textContent = message;
  ui.status.dataset.error = String(error);
}
function showPdf(message) {
  ui.start.hidden = true;
  ui.host.hidden = false;
  ui.bottom.hidden = false;
  ui.swipe.hidden = false;
  ui.change.hidden = false;
  ui.pdfStatus.hidden = false;
  ui.pdfStatus.textContent = message;
  // R25D3 moved all schedule tables; no R24 source-coordinate map is valid for this PDF.
  ui.mapSection.hidden = true;
  ui.page.disabled = false;
  ui.tools.open = false;
  updateToolbar();
}
function showStart(message,error=false) {
  ui.start.hidden = false;
  ui.host.hidden = true;
  ui.bottom.hidden = true;
  ui.swipe.hidden = true;
  ui.change.hidden = true;
  ui.pdfStatus.hidden = true;
  ui.match.hidden = true;
  ui.mapSection.hidden = true;
  ui.tools.open = false;
  status(message,error);
  updateToolbar();
}
function updateToolbar() {
  ui.page.value = String(pageNumber);
  ui.page.max = String(EXPECTED_PAGES);
  ui.total.textContent = "/ " + EXPECTED_PAGES;
  ui.prev.disabled = !pdf || pageNumber<=1;
  ui.next.disabled = !pdf || pageNumber>=EXPECTED_PAGES;
  ui.zoomOut.disabled = !pdf || zoom<=0.8;
  ui.zoomIn.disabled = !pdf || zoom>=2;
  ui.fitWidth.disabled = !pdf;
  ui.fitPage.disabled = !pdf;
  ui.fitWidth.setAttribute("aria-pressed",String(fitMode==="width"));
  ui.fitPage.setAttribute("aria-pressed",String(fitMode==="page"));
  ui.zoomLabel.textContent = zoom===1
    ? (fitMode==="width" ? "พอดีความกว้าง" : "พอดีทั้งหน้า")
    : Math.round(zoom*100)+"%";
}
async function digest(algorithm,input) {
  const bytes = input instanceof ArrayBuffer ? input : new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest(algorithm,bytes);
  return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,"0")).join("");
}
async function verifyPdfBytes(bytes) {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength<100 || bytes.byteLength>MAX_PDF_BYTES)
    throw Error("pdf_size");
  const first = new Uint8Array(bytes,0,5);
  if (String.fromCharCode(...first)!=="%PDF-") throw Error("not_pdf");
  if ((await digest("SHA-256",bytes))!==PDF_SHA) throw Error("pdf_revision");
  return true;
}
function validMap(map) {
  if (!map || map.schema_version!==1 || map.document_status!=="review_only_not_public" ||
      map.source_sha256!==PDF_SHA || map.page_count!==EXPECTED_PAGES ||
      map.anchor_count!==486 || map.coordinate_space!=="normalized_top_left_cropbox" ||
      !map.entries || Array.isArray(map.entries) || typeof map.entries!=="object") return false;
  const keys=Object.keys(map.entries);
  if (keys.length!==486 || !keys.every(k=>/^v4[a-f0-9]{12}$/.test(k))) return false;
  return keys.every(k=>{
    const row=map.entries[k],r=row?.rect;
    return Number.isInteger(row?.page) && row.page>=1 && row.page<=155 &&
      Array.isArray(r) && r.length===4 &&
      r.every(n=>typeof n==="number" && Number.isFinite(n)) &&
      r[0]>=0 && r[0]<r[2] && r[2]<=1 &&
      r[1]>=0 && r[1]<r[3] && r[3]<=1;
  });
}
function serializeMap(map) {
  return Object.keys(map.entries).sort().map(key=>{
    const row=map.entries[key];
    return key+":"+row.page+":"+row.rect.join(",");
  }).join("\n");
}
async function verifiedMap(map) {
  return validMap(map) && (await digest("SHA-256",serializeMap(map)))===MAP_SHA;
}
async function checkedSource() {
  if (!sourceId) return null;
  if (kind==="fixture") {
    const r=await fetch("./data/program-from-pdf-2569-20261104-draft.json",{cache:"no-store"});
    if(!r.ok)throw Error("source_unavailable");
    const data=await r.json();
    if(!Array.isArray(data.fixtures)||data.fixtures.length!==237)throw Error("source_revision");
    return data.fixtures.find(x=>x.id===sourceId &&
      x.id!=="football-p07-มัธยมหญิง-020-repeated-final") || null;
  }
  const r=await fetch("./data/committee-2569-draft-public-review.json",{cache:"no-store"});
  if(!r.ok)throw Error("source_unavailable");
  const data=await r.json();
  if(!Array.isArray(data.entries)||data.entries.length!==250)throw Error("source_revision");
  return data.entries.find(x=>x.id===sourceId) || null;
}
function markPage(viewport) {
  ui.overlay.replaceChildren();
  ui.match.hidden = true;
  if (!marker || pageNumber!==marker.page) return;
  const r=marker.rect,top=Math.max(0,r[1]-(kind==="entry"?.014:.020));
  const bottom=Math.min(1,r[3]+(kind==="entry"?.009:.012));
  const div=document.createElement("div");
  div.className="r24g-selected";
  div.style.left=(.075*viewport.width)+"px";
  div.style.top=(top*viewport.height)+"px";
  div.style.width=(.85*viewport.width)+"px";
  div.style.height=((bottom-top)*viewport.height)+"px";
  ui.overlay.append(div);
  ui.match.hidden=false;
  ui.match.textContent="เน้นตำแหน่งรายการที่เลือกในเล่มรวมฉบับตรวจร่าง (ไม่ได้รับรองข้อความ)";
  if(!markerPositioned) {
    markerPositioned=true;
    ui.host.scrollTop=Math.max(0,((top+bottom)/2)*viewport.height-ui.host.clientHeight/2);
  }
}
async function renderPage() {
  if (!pdf) return;
  const requestId=++generation;
  if (renderTask) {
    const previous=renderTask;
    renderTask=null;
    try{previous.cancel();}catch(_){}
    try{await previous.promise;}catch(_){}
  }
  if(requestId!==generation || !pdf)return;
  busy=true;
  ui.overlay.replaceChildren();
  ui.match.hidden=true;
  ui.pdfStatus.hidden=false;
  ui.pdfStatus.textContent="กำลังแสดงหน้า "+pageNumber+"…";
  try {
    const current=await pdf.getPage(pageNumber);
    if(requestId!==generation)return;
    const base=current.getViewport({scale:1});
    const width=Math.max(1,ui.host.clientWidth-22);
    const height=Math.max(1,ui.host.clientHeight-24);
    const fit=fitMode==="page"?Math.min(width/base.width,height/base.height):width/base.width;
    const viewport=current.getViewport({scale:Math.min(2.5,Math.max(.1,fit))*zoom});
    const ratio=Math.max(1,Math.min(window.devicePixelRatio||1,2,Math.sqrt(8_000_000/(viewport.width*viewport.height))));
    ui.canvas.width=Math.max(1,Math.round(viewport.width*ratio));
    ui.canvas.height=Math.max(1,Math.round(viewport.height*ratio));
    ui.canvas.style.width=Math.round(viewport.width)+"px";
    ui.canvas.style.height=Math.round(viewport.height)+"px";
    ui.overlay.style.width=Math.round(viewport.width)+"px";
    ui.overlay.style.height=Math.round(viewport.height)+"px";
    const context=ui.canvas.getContext("2d",{alpha:false});
    if(!context)throw Error("canvas_unavailable");
    renderTask=current.render({canvasContext:context,viewport,
      transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]});
    await renderTask.promise;
    if(requestId!==generation)return;
    renderTask=null;
    ui.pdfStatus.hidden=true;
    ui.canvas.setAttribute("aria-label","สูจิบัตรหน้า "+pageNumber+" จาก 155 หน้า");
    markPage(viewport);
  } catch(err) {
    if(requestId!==generation || err?.name==="RenderingCancelledException")return;
    ui.pdfStatus.textContent="แสดงหน้านี้ไม่สำเร็จ โปรดลองใหม่หรือเปิดใน Google Drive";
  } finally {
    if(requestId===generation)busy=false;
  }
}
function setPage(raw) {
  if(!pdf)return;
  const n=Math.max(1,Math.min(155,Math.trunc(Number(raw)||1)));
  if(n===pageNumber && !busy)return;
  pageNumber=n;
  updateToolbar();
  const u=new URL(location.href);
  u.searchParams.set("page",String(pageNumber));
  history.replaceState(null,"",u.pathname+u.search+u.hash);
  ui.host.scrollTop=0;ui.host.scrollLeft=0;lastTap=null;
  renderPage();
}
async function closePdf() {
  generation++;
  if(renderTask) {
    const active=renderTask;renderTask=null;
    try{active.cancel();}catch(_){}
    try{await active.promise;}catch(_){}
  }
  if(pdf){const old=pdf;pdf=null;try{await old.destroy();}catch(_){}}
  marker=null;markerPositioned=false;
  ui.overlay.replaceChildren();
}
async function openBytes(bytes) {
  if(typeof crypto==="undefined" || !crypto.subtle)throw Error("secure_context_required");
  await verifyPdfBytes(bytes);
  await closePdf();
  if(!pdfjs){
    pdfjs=await import(PDF_JS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc=PDF_WORKER_URL;
  }
  const next=await pdfjs.getDocument({data:new Uint8Array(bytes)}).promise;
  if(next.numPages!==EXPECTED_PAGES){await next.destroy();throw Error("page_count");}
  pdf=next;zoom=1;fitMode="width";pageNumber=parsePage(params.get("page"));
  marker=null;markerPositioned=false;
  showPdf("ตรวจรุ่นไฟล์ตรงแล้ว กำลังแสดงสูจิบัตร…");
  await renderPage();
}
async function loadLocal() {
  const file=ui.local.files?.[0];
  if(!file)return;
  status("กำลังตรวจไฟล์ PDF ฉบับรวม…");
  try {
    if(file.size>MAX_PDF_BYTES)throw Error("file_size");
    await openBytes(await file.arrayBuffer());
  }catch(_){
    await closePdf();
    showStart("เปิด PDF ไม่ได้: โปรดเลือกไฟล์ฉบับรวม 155 หน้าที่ได้รับอนุญาตและตรงรุ่น",true);
  }finally{ui.local.value="";}
}
async function fetchPublishedPdfBytes() {
  // Each part is immutable base64 text in this repository. No external cross-origin PDF fetch.
  // Byte lengths and the final SHA-256 gate protect against missing/mixed revisions.
  const chunks = await Promise.all(PDF_PARTS.map(async (path,i)=>{
    const response = await fetch(path+"?v=r25e1",{cache:"no-store",credentials:"same-origin"});
    if(!response.ok)throw Error("pdf_chunk_http_"+(i+1)+"_"+response.status);
    const encoded = (await response.text()).replace(/\\s+/g,"");
    if(encoded.length !== PDF_PART_LENGTHS[i]) throw Error("pdf_chunk_size_"+(i+1));
    const decoded = atob(encoded);
    return decoded;
  }));
  const output = new Uint8Array(PDF_BYTE_LENGTH);
  let offset = 0;
  for(const chunk of chunks){
    if(offset+chunk.length>output.length)throw Error("pdf_chunk_overflow");
    for(let i=0;i<chunk.length;i++)output[offset+i]=chunk.charCodeAt(i);
    offset+=chunk.length;
  }
  if(offset!==PDF_BYTE_LENGTH)throw Error("pdf_total_size");
  return output.buffer;
}
async function loadPublishedPdf() {
  status("กำลังเปิดสูจิบัตรฉบับล่าสุด 155 หน้า…");
  try {
    await openBytes(await fetchPublishedPdfBytes());
  } catch(err) {
    console.warn("R25-E PDF reader fallback:",err?.message||"unavailable");
    await closePdf();
    showStart("ยังเปิดสูจิบัตรฉบับล่าสุดในเว็บไม่สำเร็จ โปรดลองเปิดไฟล์ใน Google Drive หรือเลือก PDF ฉบับล่าสุดจากเครื่อง",true);
  }
}
async function loadPrivateMap() {
  const file=ui.mapInput.files?.[0];
  if(!file||!pdf||!sourceId)return;
  ui.mapStatus.textContent="กำลังตรวจแผนที่ตำแหน่ง…";
  try {
    if(file.size>2_000_000)throw Error("map_size");
    const map=JSON.parse(await file.text());
    if(!(await verifiedMap(map)))throw Error("map_revision");
    const row=await checkedSource();
    if(!row)throw Error("source_id");
    const token="v4"+(await digest("SHA-1",row.id)).slice(0,12);
    if(!Object.prototype.hasOwnProperty.call(map.entries,token))throw Error("no_anchor");
    marker=map.entries[token];
    markerPositioned=false;
    ui.mapStatus.textContent="ตรวจแผนที่ตรงฉบับแล้ว · เน้นตำแหน่งเพื่อประกอบการตรวจร่าง";
    setPage(marker.page);
    if(pageNumber===marker.page)renderPage();
  }catch(_){
    marker=null;ui.overlay.replaceChildren();ui.match.hidden=true;
    ui.mapStatus.textContent="ยังเน้นตำแหน่งไม่ได้ แผนที่ไม่ตรงรุ่นหรือไม่มีรหัสรายการที่เลือก";
  }finally{ui.mapInput.value="";}
}
ui.local.addEventListener("change",loadLocal);
ui.mapInput.addEventListener("change",loadPrivateMap);
ui.change.addEventListener("click",async()=>{
  await closePdf();
  showStart("หากต้องการเปลี่ยนวิธีอ่าน สามารถเลือกเปิดจาก Google Drive หรือไฟล์ในเครื่องได้");
});
ui.prev.addEventListener("click",()=>setPage(pageNumber-1));
ui.next.addEventListener("click",()=>setPage(pageNumber+1));
ui.page.addEventListener("change",()=>{setPage(ui.page.value);updateToolbar();});
ui.fitWidth.addEventListener("click",()=>{fitMode="width";zoom=1;updateToolbar();renderPage();});
ui.fitPage.addEventListener("click",()=>{fitMode="page";zoom=1;updateToolbar();renderPage();});
function updateZoom(next){
  zoom=Math.max(.8,Math.min(2,Math.round(next*10)/10));
  updateToolbar();renderPage();
}
ui.zoomIn.addEventListener("click",()=>updateZoom(zoom+.2));
ui.zoomOut.addEventListener("click",()=>updateZoom(zoom-.2));
const tp=t=>({x:t.clientX,y:t.clientY});
const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
ui.host.addEventListener("touchstart",e=>{
  if(!pdf)return;
  if(e.touches.length>=2){
    const d=distance(e.touches);
    pinchStart=d>0?{start:d,zoom,preview:zoom}:null;
    swipeStart=null;lastTap=null;
  }else if(e.touches.length===1&&!pinchStart)swipeStart={...tp(e.touches[0]),at:Date.now()};
},{passive:true});
ui.host.addEventListener("touchmove",e=>{
  if(!pinchStart||e.touches.length<2)return;
  if(e.cancelable)e.preventDefault();
  pinchStart.preview=Math.max(.8,Math.min(2,pinchStart.zoom*distance(e.touches)/pinchStart.start));
  ui.surface.style.transformOrigin="center top";
  ui.surface.style.transform="scale("+(pinchStart.preview/zoom)+")";
},{passive:false});
ui.host.addEventListener("touchend",e=>{
  if(pinchStart){
    if(e.touches.length<2){
      const z=pinchStart.preview;
      pinchStart=null;swipeStart=null;lastTap=null;
      ui.surface.style.transform="";ui.surface.style.transformOrigin="";
      updateZoom(z);
    }return;
  }
  if(e.touches.length||!swipeStart||!e.changedTouches.length)return;
  const end=tp(e.changedTouches[0]),dx=end.x-swipeStart.x,dy=end.y-swipeStart.y;
  const duration=Date.now()-swipeStart.at;swipeStart=null;
  if(zoom===1&&Math.abs(dx)>=65&&Math.abs(dx)>Math.abs(dy)*1.35&&duration<=850){
    lastTap=null;setPage(pageNumber+(dx<0?1:-1));return;
  }
  if(Math.abs(dx)>20||Math.abs(dy)>20||duration>350){lastTap=null;return;}
  const now=Date.now();
  if(lastTap&&now-lastTap.at<340&&Math.hypot(end.x-lastTap.x,end.y-lastTap.y)<32) {
    lastTap=null;updateZoom(zoom>1?1:1.8);
  }else lastTap={...end,at:now};
},{passive:true});
ui.host.addEventListener("touchcancel",()=>{
  pinchStart=null;swipeStart=null;lastTap=null;
  ui.surface.style.transform="";ui.surface.style.transformOrigin="";
},{passive:true});
window.addEventListener("resize",()=>{
  if(!pdf)return;
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(renderPage,220);
},{passive:true});
document.addEventListener("keydown",e=>{
  if(!pdf || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||""))return;
  if(e.key==="ArrowLeft"){e.preventDefault();setPage(pageNumber-1);}
  if(e.key==="ArrowRight"){e.preventDefault();setPage(pageNumber+1);}
});
window.NongkumUnifiedBooklet=Object.freeze({parsePage,validMap,serializeMap,verifiedMap,verifyPdfBytes});
// Only the source V2/V3 readers currently have verified highlight coordinates.
const highlightNotice = $("r25eHighlightNotice");
const originalLink = $("r25eOriginalLink");
if(highlightNotice && originalLink && (sourceId||openedFromNotes)){
  highlightNotice.hidden=false;
  if(kind==="fixture"){
    originalLink.href="./pdf-viewer.html?fixture="+encodeURIComponent(sourceId);
    originalLink.textContent="เปิดตาราง V2 พร้อมตำแหน่งที่ตรวจแล้ว";
  }else if(kind==="entry"){
    originalLink.href="./committee-pdf-viewer.html?page=1";
    originalLink.textContent="เปิดสูจิบัตรกรรมการ V3";
  }else{
    originalLink.href="./pdf-viewer.html?note="+encodeURIComponent(noteId);
    originalLink.textContent="เปิดสูจิบัตร V2 พร้อมตำแหน่งข้อสังเกต";
  }
}
if(sourceId) ui.mapStatus.textContent="ยังไม่มีแผนที่ตำแหน่งที่ตรวจรับสำหรับเล่ม Design V2 ฉบับจัดตารางใหม่";
loadPublishedPdf();
})();
