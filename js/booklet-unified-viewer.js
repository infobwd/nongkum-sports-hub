/* R24-G: Unified permissioned 155-page PDF reader. No PDF, map or OAuth token persistence. */
(() => {
"use strict";
const FILE_ID = "1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF";
const PDF_SHA = "a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d";
const MAP_SHA = "4ca526eb48e2e21edb72e38dc5e474429f52a3e62f8d73fd635e1329b1410e90";
const EXPECTED_PAGES = 155;
const MAX_PDF_BYTES = 35_000_000;
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const PDF_JS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.min.mjs";
const PDF_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/legacy/build/pdf.worker.min.mjs";
const $ = id => document.getElementById(id);
const ui = {
  start:$("r24gStart"), status:$("r24gStatus"), oauthHint:$("r24gOAuthHint"),
  google:$("r24gGoogle"), local:$("r24gLocalPdf"), change:$("r24gChangeSource"),
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
  ui.mapSection.hidden = !sourceId;
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
function loadGoogleScript() {
  return new Promise((resolve,reject)=>{
    if(window.google?.accounts?.oauth2){resolve();return;}
    const script=document.createElement("script");
    script.src="https://accounts.google.com/gsi/client";
    script.async=true;script.defer=true;
    script.onload=()=>window.google?.accounts?.oauth2 ? resolve() : reject(Error("gsi_missing"));
    script.onerror=()=>reject(Error("gsi_unavailable"));
    document.head.append(script);
  });
}
async function loadDrive(token) {
  status("กำลังตรวจสิทธิ์บัญชี Google และรับไฟล์ PDF…");
  try {
    const headers={Authorization:"Bearer "+token};
    const metadata=await fetch("https://www.googleapis.com/drive/v3/files/"+FILE_ID+
      "?fields=id,name,mimeType,size,capabilities(canDownload)&supportsAllDrives=true",
      {headers,cache:"no-store",credentials:"omit"});
    if(!metadata.ok)throw Error("drive_permission");
    const info=await metadata.json();
    if(info.id!==FILE_ID || info.mimeType!=="application/pdf" ||
       info.capabilities?.canDownload===false || !Number.isSafeInteger(Number(info.size)) ||
       Number(info.size)>MAX_PDF_BYTES)throw Error("drive_not_downloadable");
    const body=await fetch("https://www.googleapis.com/drive/v3/files/"+FILE_ID+
      "?alt=media&supportsAllDrives=true",{headers,cache:"no-store",credentials:"omit"});
    if(!body.ok)throw Error("drive_permission");
    await openBytes(await body.arrayBuffer());
  }catch(_){
    await closePdf();
    showStart("ไม่สามารถอ่าน PDF ด้วยบัญชีนี้ได้ ตรวจสิทธิ์ Google Drive หรือลองเปิดผ่านตัวอ่าน Google Drive ด้านล่าง",true);
  }
}
async function configureGoogle() {
  try {
    const r=await fetch("./data/booklet-oauth-config.json?v=r24g1",{cache:"no-store"});
    if(!r.ok)throw Error("config_missing");
    const c=await r.json();
    if(c.schema_version!==1 || c.enabled!==true || c.allowed_origin!==location.origin ||
       c.scope!==SCOPE || !/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(c.client_id||"")) {
      ui.oauthHint.textContent="ยังไม่ได้เปิดระบบเข้าสู่ระบบ Google สำหรับตัวอ่านแบบ V2/V3 ขณะนี้เปิดผ่านกรอบ Google Drive หรือไฟล์ในเครื่องได้";
      return;
    }
    await loadGoogleScript();
    const client=google.accounts.oauth2.initTokenClient({
      client_id:c.client_id,scope:SCOPE,
      callback:response=>{
        if(!response?.access_token || !google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE)) {
          status("ไม่ได้รับสิทธิ์อ่านไฟล์ผ่านบัญชี Google",true);return;
        }
        loadDrive(response.access_token);
      },
      error_callback:()=>status("ไม่สามารถเปิดหน้าลงชื่อเข้าใช้ Google ได้ ลองเปิดในเบราว์เซอร์ภายนอก",true)
    });
    ui.google.hidden=false;
    ui.google.disabled=false;
    ui.oauthHint.textContent="เปิดอ่านด้วยบัญชี Google ที่ผู้ดูแลเอกสารอนุญาต โดยไม่ต้องเลือกไฟล์จากอุปกรณ์";
    ui.google.addEventListener("click",()=>client.requestAccessToken({prompt:"select_account"}));
  }catch(_){
    ui.oauthHint.textContent="ระบบลงชื่อเข้าใช้ Google ยังไม่พร้อม ใช้ตัวอ่าน Google Drive หรือเลือกไฟล์ในอุปกรณ์แทน";
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
  showStart("เลือกวิธีเปิดอ่านใหม่ได้ เอกสารที่เปิดในเว็บไม่ได้ถูกบันทึกไว้");
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
if(sourceId) ui.mapStatus.textContent="เลือกแผนที่ตำแหน่งส่วนตัวเพื่อเน้นรายการที่เปิดจากตาราง";
configureGoogle();
})();
