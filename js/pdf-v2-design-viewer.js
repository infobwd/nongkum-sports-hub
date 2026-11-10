/* R26-E: Independent reader for 41-page R26D redesign. The SHA-pinned V2 source reader is not changed. */
(() => {
"use strict";
const PARTS=Object.freeze([1,2,3].map(n=>"./assets/r26d-v2-41pages/part-"+String(n).padStart(2,"0")+".b64"));
const ENCODED_LENGTHS=Object.freeze([600000,600000,495512]);
const PART_BYTE_LENGTHS=Object.freeze([450000,450000,371633]);
const PDF_BYTES=1271633;
const PDF_SHA="40d04daba7c1b7b5d655e6973989bec54c89c84a7b2832ba4700cd81f059b84f";
const PAGE_COUNT=41;
const PDF_JS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.min.mjs";
const PDF_WORKER="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.worker.min.mjs";
const $=id=>document.getElementById(id);
const ui={
 host:$("pdfCanvasHost"),canvas:$("pdfCanvas"),status:$("pdfStatus"),failure:$("pdfFailure"),
 retry:$("pdfRetry"),prev:$("pdfPrev"),next:$("pdfNext"),page:$("pdfPage"),total:$("pdfTotal"),
 zoomIn:$("pdfZoomIn"),zoomOut:$("pdfZoomOut"),zoomLabel:$("pdfZoomLabel"),
 fitWidth:$("pdfFitWidth"),fitPage:$("pdfFitPage"),download:$("designDownload"),tools:$("pdfTools")
};
const params=new URLSearchParams(location.search);
function parsePage(input) {
 return /^\d{1,2}$/.test(String(input??""))?Math.min(PAGE_COUNT,Math.max(1,Number(input))):1;
}
let pageNumber=parsePage(params.get("page"));
let pdf=null,bytes=null,pdfjs=null,task=null,generation=0,fitMode="width",zoom=1,touchStart=null,resizeDelay=null;
function setStatus(message) {ui.status.textContent=message;ui.status.hidden=false;}
function toolbar() {
 ui.page.value=String(pageNumber);
 ui.page.max=String(PAGE_COUNT);
 ui.total.textContent="/ "+PAGE_COUNT;
 ui.prev.disabled=!pdf||pageNumber<=1;
 ui.next.disabled=!pdf||pageNumber>=PAGE_COUNT;
 ui.page.disabled=!pdf;
 ui.zoomIn.disabled=!pdf||zoom>=2;
 ui.zoomOut.disabled=!pdf||zoom<=.8;
 ui.fitWidth.disabled=!pdf;
 ui.fitPage.disabled=!pdf;
 ui.fitWidth.setAttribute("aria-pressed",String(fitMode==="width"));
 ui.fitPage.setAttribute("aria-pressed",String(fitMode==="page"));
 ui.zoomLabel.textContent=zoom===1?(fitMode==="page"?"พอดีทั้งหน้า":"พอดีความกว้าง"):Math.round(zoom*100)+"%";
 ui.download.disabled=!bytes;
}
async function verifiedSource() {
 if(!crypto?.subtle)throw Error("secure_context_required");
 const chunks=await Promise.all(PARTS.map(async (path,i)=>{
  const res=await fetch(path+"?v=r26e1",{cache:"no-store",credentials:"same-origin"});
  if(!res.ok)throw Error("chunk_http_"+(i+1));
  const encoded=(await res.text()).replace(/\s+/g,"");
  if(encoded.length!==ENCODED_LENGTHS[i])throw Error("chunk_size_"+(i+1));
  const decoded=atob(encoded);
  if(decoded.length!==PART_BYTE_LENGTHS[i])throw Error("chunk_bytes_"+(i+1));
  return decoded;
 }));
 const data=new Uint8Array(PDF_BYTES);
 let offset=0;
 for(const chunk of chunks) {
  for(let i=0;i<chunk.length;i++)data[offset+i]=chunk.charCodeAt(i);
  offset+=chunk.length;
 }
 if(offset!==PDF_BYTES||String.fromCharCode(...data.subarray(0,5))!=="%PDF-")throw Error("invalid_pdf");
 const hashed=await crypto.subtle.digest("SHA-256",data);
 const digest=Array.from(new Uint8Array(hashed),x=>x.toString(16).padStart(2,"0")).join("");
 if(digest!==PDF_SHA)throw Error("pdf_revision_mismatch");
 return data;
}
async function render() {
 if(!pdf)return;
 const mine=++generation;
 if(task) {
  const prior=task;task=null;
  try{prior.cancel();}catch(_){}
  try{await prior.promise;}catch(_){}
 }
 if(mine!==generation||!pdf)return;
 setStatus("กำลังแสดงหน้า "+pageNumber+"…");
 try {
  const item=await pdf.getPage(pageNumber);
  if(mine!==generation)return;
  const base=item.getViewport({scale:1});
  const availableWidth=Math.max(1,ui.host.clientWidth-20);
  const availableHeight=Math.max(1,ui.host.clientHeight-20);
  const fit=fitMode==="page"?Math.min(availableWidth/base.width,availableHeight/base.height):availableWidth/base.width;
  const scale=Math.min(3,Math.max(.1,fit*zoom));
  const viewport=item.getViewport({scale});
  const pixels=Math.min(window.devicePixelRatio||1,2,Math.sqrt(8000000/(viewport.width*viewport.height)));
  const ratio=Math.max(1,pixels);
  ui.canvas.width=Math.max(1,Math.round(viewport.width*ratio));
  ui.canvas.height=Math.max(1,Math.round(viewport.height*ratio));
  ui.canvas.style.width=Math.round(viewport.width)+"px";
  ui.canvas.style.height=Math.round(viewport.height)+"px";
  const ctx=ui.canvas.getContext("2d",{alpha:false});
  if(!ctx)throw Error("canvas_unavailable");
  task=item.render({canvasContext:ctx,viewport,transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]});
  await task.promise;
  if(mine!==generation)return;
  task=null;
  ui.canvas.setAttribute("aria-label","สูจิบัตร V2 ฉบับออกแบบใหม่ หน้า "+pageNumber+" จาก 41 หน้า");
  ui.status.hidden=true;
 }catch(err) {
  if(mine===generation && err?.name!=="RenderingCancelledException")setStatus("แสดงหน้านี้ไม่สำเร็จ กรุณาลองเปิดอีกครั้ง");
 }
}
function setPage(raw) {
 if(!pdf)return;
 const next=Math.min(PAGE_COUNT,Math.max(1,Math.trunc(Number(raw)||1)));
 if(next===pageNumber)return;
 pageNumber=next;
 const url=new URL(location.href);
 url.searchParams.set("page",String(pageNumber));
 history.replaceState(null,"",url.pathname+url.search+url.hash);
 ui.host.scrollTop=0;ui.host.scrollLeft=0;
 toolbar();render();
}
function setZoom(next) {
 if(!pdf)return;
 zoom=Math.max(.8,Math.min(2,Math.round(next*10)/10));
 ui.host.scrollTop=0;ui.host.scrollLeft=0;
 toolbar();render();
}
async function start() {
 if(pdf)return;
 ui.failure.hidden=true;
 setStatus("กำลังตรวจไฟล์สูจิบัตรฉบับออกแบบใหม่…");
 try {
  const source=await verifiedSource();
  pdfjs??=await import(PDF_JS);
  pdfjs.GlobalWorkerOptions.workerSrc=PDF_WORKER;
  const doc=await pdfjs.getDocument({data:new Uint8Array(source)}).promise;
  if(doc.numPages!==PAGE_COUNT){await doc.destroy();throw Error("unexpected_pages");}
  bytes=source;pdf=doc;pageNumber=parsePage(params.get("page"));
  toolbar();
  await render();
 }catch(err){
  console.warn("R26-E PDF reader unavailable:",err?.message||"error");
  ui.failure.hidden=false;
  setStatus("ยังเปิด PDF ฉบับออกแบบใหม่ไม่ได้ · เปิดไฟล์ใน Drive หรือกลับไป V2 ต้นฉบับ");
  toolbar();
 }
}
ui.prev.addEventListener("click",()=>setPage(pageNumber-1));
ui.next.addEventListener("click",()=>setPage(pageNumber+1));
ui.page.addEventListener("change",()=>setPage(ui.page.value));
ui.fitWidth.addEventListener("click",()=>{fitMode="width";zoom=1;toolbar();render();});
ui.fitPage.addEventListener("click",()=>{fitMode="page";zoom=1;toolbar();render();});
ui.zoomIn.addEventListener("click",()=>setZoom(zoom+.2));
ui.zoomOut.addEventListener("click",()=>setZoom(zoom-.2));
ui.retry.addEventListener("click",()=>start());
ui.download.addEventListener("click",()=>{
 if(!bytes)return;
 const url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
 const a=document.createElement("a");
 a.href=url;
 a.download="MittraphapGames_2569_V2_R26D_41pages_REVIEW_ONLY.pdf";
 a.click();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
});
ui.host.addEventListener("touchstart",e=>{
 if(e.touches.length!==1||zoom>1){touchStart=null;return;}
 touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
},{passive:true});
ui.host.addEventListener("touchend",e=>{
 if(!touchStart||e.changedTouches.length!==1){touchStart=null;return;}
 const dx=e.changedTouches[0].clientX-touchStart.x;
 const dy=e.changedTouches[0].clientY-touchStart.y;
 touchStart=null;
 if(zoom===1&&Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.4)setPage(pageNumber+(dx<0?1:-1));
},{passive:true});
ui.host.addEventListener("touchcancel",()=>touchStart=null,{passive:true});
window.addEventListener("resize",()=>{
 if(!pdf)return;
 clearTimeout(resizeDelay);
 resizeDelay=setTimeout(render,180);
},{passive:true});
document.addEventListener("keydown",e=>{
 if(!pdf||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||""))return;
 if(e.key==="ArrowLeft"){e.preventDefault();setPage(pageNumber-1);}
 if(e.key==="ArrowRight"){e.preventDefault();setPage(pageNumber+1);}
});
window.NongkumV2DesignReader=Object.freeze({parsePage,PDF_SHA,PDF_BYTES,PAGE_COUNT,PARTS});
toolbar();start();
})();
