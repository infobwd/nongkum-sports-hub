// R11D.3: split-scrolling desktop, mobile-first review and page-fit contracts.
// Synthetic DOM and PDF.js rendering only; real Safari/LINE visual QA is separate.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const reviewHtml = read("review.html");
const css = read("css/review.css");
const reviewJs = read("js/review.js");
const viewerHtml = read("pdf-viewer.html");
const viewerJs = read("js/pdf-viewer.js");
const viewerCss = read("css/pdf-viewer.css");
const shared = read("js/shared.js");
const model = read("js/review-model.js");
const dataset = JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const diff = JSON.parse(read("data/reconciliation/r11a-program-diff-20261104.json"));

assert.ok(reviewHtml.indexOf('id="reviewMain"') < reviewHtml.indexOf("</main>"));
assert.ok(reviewHtml.indexOf('id="pdfPreview"') > reviewHtml.indexOf("</main>"),
  "fullscreen modal must be a sibling of (not inert inside) the main content");
assert.match(reviewHtml, /<details id="reviewPdfDetails"[^>]* open>/);
assert.match(reviewHtml, /id="reviewPdfHeading"/);
assert.match(reviewHtml, /id="reviewSchool"/);
assert.match(reviewHtml, /id="reviewSport"/);
assert.match(css, /@media\(min-width:1001px\)/);
assert.match(css, /body\.review-pdf-open\{display:grid;grid-template-columns:/);
assert.match(css, /overflow-y:auto;overscroll-behavior-y:contain/);
assert.match(css, /body\.review-pdf-open \.review-pdf-preview\{top:0;right:0;bottom:0;width:57vw/);
assert.match(css, /body\.review-pdf-open \.mobile-nav\{display:none!important\}/);
assert.match(css, /z-index:1300/);
assert.match(css, /\.review-main>\.review-filters\{order:2\}/);
assert.match(css, /\.review-main>#reviewListing\{order:4\}/);
assert.match(css, /\.review-main>\.review-pdf-download\{order:5\}/);
assert.match(css, /\.review-main>\.review-summary\{order:6\}/);
assert.match(reviewJs, /el\.inert=compact/);
assert.match(reviewJs, /updatePdfModality/);
assert.match(viewerHtml, /id="pdfFitWidth"[^>]*aria-pressed="true"/);
assert.match(viewerHtml, /id="pdfFitPage"[^>]*aria-pressed="false"/);
assert.match(viewerJs, /const availableHeight = Math\.max\(1, el\.host\.clientHeight - 24\)/);
assert.match(viewerJs, /const baseScale = fitMode === "page"/);
assert.match(viewerJs, /el\.host\.scrollTop = 0/);
assert.match(viewerCss, /overscroll-behavior:contain/);
assert.match(viewerCss, /min-height:0;overscroll-behavior:contain/);
assert.doesNotMatch(reviewJs, /innerHTML\s*=/);
assert.equal(dataset.fixtures.length, 237);
new vm.Script(reviewJs, {filename:"js/review.js"});
new vm.Script(viewerJs, {filename:"js/pdf-viewer.js"});

class Node {
  constructor(tag,id="",activeRef=null) {
    this.tag=tag;this.id=id;this.children=[];this.handlers={};this.attrs={};
    this.textContent="";this.value="";this.checked=false;
    this.hidden=id==="pdfPreview";this.open=id==="reviewPdfDetails";
    this.disabled=false;this.isConnected=true;this.className="";
    this.scrollTop=0;this.scrollLeft=0;this.offsetHeight=id==="reviewHeader"?150:0;
    this.activeRef=activeRef;
    this.style={};this.clientWidth=800;this.clientHeight=500;
  }
  appendChild(node) {
    if(node.tag==="#fragment"){this.children.push(...node.children);node.children=[];}
    else this.children.push(node);
    return node;
  }
  replaceChildren(...nodes){this.children=[];for(const node of nodes)this.appendChild(node);}
  addEventListener(key,fn){this.handlers[key]=fn;}
  setAttribute(key,val){this.attrs[key]=String(val);}
  removeAttribute(key){delete this[key];delete this.attrs[key];}
  focus(){if(this.activeRef)this.activeRef.value=this;}
  scrollIntoView(){}
  select(){}
}
async function flush(){for(let i=0;i<50;i++)await Promise.resolve();}
function findButton(root,label){
  if(root.tag==="button"&&String(root.textContent).includes(label))return root;
  for(const node of root.children){const found=findButton(node,label);if(found)return found;}
  return null;
}
async function reviewScenario(mobile){
  const focusRef={value:null};
  const ids=[...reviewHtml.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  const elements=Object.fromEntries(ids.map(id=>[id,new Node("div",id,focusRef)]));
  const classes=new Set();
  const body={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
  const document={
    body,get activeElement(){return focusRef.value;},
    getElementById:id=>elements[id]||null,
    createElement:tag=>new Node(tag,"",focusRef),
    createDocumentFragment:()=>new Node("#fragment","",focusRef),
    addEventListener:(type,fn)=>{document.handlers[type]=fn;},handlers:{}
  };
  const loc=new URL("https://example.test/nongkum-sports-hub/review.html");
  const win={
    scrollY:1490,restoredY:null,
    scrollTo:(x,y)=>{win.restoredY=y;},
    matchMedia:(query)=>({matches:mobile&&(query.includes("1000")||query.includes("690"))}),
    addEventListener:(type,fn)=>{win.handlers[type]=fn;},handlers:{}
  };
  const ctx=vm.createContext({
    document,window:win,URL,URLSearchParams,Date,Intl,location:loc,
    history:{replaceState(_a,_b,path){loc.href=new URL(path,loc.href).href;}},
    navigator:{clipboard:{writeText:async()=>{}}},
    setTimeout:()=>0,clearTimeout:()=>{},
    fetch:async url=>{
      if(url.includes("program-from-pdf-2569-20261104-draft.json"))return {ok:true,json:async()=>dataset};
      if(url.includes("r11a-program-diff-20261104.json"))return {ok:true,json:async()=>diff};
      throw Error("Unexpected PDF prefetch: " + url);
    },
    console:{error(){}}
  });
  new vm.Script(shared).runInContext(ctx);
  new vm.Script(model).runInContext(ctx);
  new vm.Script(reviewJs).runInContext(ctx);
  await flush();
  assert.equal(elements.reviewCards.children.length,8);
  assert.equal(typeof ctx.NongkumPageRefresh,"function","review exposes read-only loader to pull gesture");
  assert.equal(await ctx.NongkumPageRefresh(),true,"review pull callback reports successful fetch");
  assert.equal(elements.reviewCards.children.length,8,"refresh retains the list layout");
  assert.equal(elements.reviewPdfDetails.open,!mobile,
    "PDF tools default collapsed only on narrow mobile viewports");
  const card=elements.reviewCards.children[0];
  const button=findButton(card,"ดูต้นฉบับ หน้า");
  assert.ok(button);
  button.handlers.click();
  assert.equal(elements.pdfPreview.hidden,false);
  assert.equal(await ctx.NongkumPageRefresh(),false,"active PDF blocks page pull-to-refresh");
  assert.ok(classes.has("review-pdf-open"));
  assert.equal(elements.pdfPreview.attrs["aria-modal"],mobile?"true":"false");
  assert.equal(elements.reviewMain.inert,mobile);
  assert.equal(elements.reviewHeader.inert,mobile);
  assert.equal(elements.reviewBottomNav.inert,mobile);
  assert.ok(String(elements.pdfPreviewFrame.src).includes("page="));
  assert.equal(focusRef.value,elements.pdfPreviewClose);
  if(mobile){
    assert.equal(elements.reviewMain.scrollTop,0);
    document.handlers.keydown({key:"Escape",preventDefault(){}});
    assert.equal(elements.reviewMain.inert,false);
    assert.equal(win.restoredY,1490);
  }else{
    assert.equal(elements.reviewMain.scrollTop,1340,
      "desktop internal column starts at the original review scroll position");
    elements.reviewMain.scrollTop+=215;
    elements.pdfPreviewClose.handlers.click();
    assert.equal(win.restoredY,1705,
      "closing desktop comparison restores the changed left-column position");
  }
  assert.equal(elements.pdfPreview.hidden,true);
  assert.equal(elements.pdfPreviewFrame.src,undefined);
  assert.ok(!classes.has("review-pdf-open"));
  assert.equal(elements.reviewCards.children[0],card);
}

await reviewScenario(false);
await reviewScenario(true);

// Render the real fit/page logic with a mock fixed-source PDF (no external network).
const viewerIds=[...viewerHtml.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const focusRef={value:null};
const els=Object.fromEntries(viewerIds.map(id=>[id,new Node("div",id,focusRef)]));
els.pdfCanvasHost.clientWidth=800;els.pdfCanvasHost.clientHeight=500;
els.pdfCanvas.getContext=()=>({});
const pdfRenderRequests=[];
const fakePdf={
  numPages:41,
  getPage:async()=>({
    getViewport:({scale})=>({width:595*scale,height:842*scale,scale}),
    render:({viewport})=>{
      pdfRenderRequests.push(viewport);
      return {promise:Promise.resolve(),cancel(){}};
    }
  })
};
const location=new URL("https://example.test/nongkum-sports-hub/pdf-viewer.html?page=7");
const win={devicePixelRatio:1,addEventListener(){}};
const doc={getElementById:id=>els[id]||null};
const vctx=vm.createContext({
  document:doc,window:win,location,URL,URLSearchParams,
  history:{replaceState(_a,_b,path){location.href=new URL(path,location.href).href;}},
  Math,console:{error(){}},setTimeout:()=>0,clearTimeout:()=>{},fakePdf
});
const viewerWithoutAutoStart=viewerJs.replace(/\nstartViewer\(\);\s*$/,"");
assert.notEqual(viewerWithoutAutoStart,viewerJs,"remove startViewer only in the simulation");
new vm.Script(viewerWithoutAutoStart).runInContext(vctx);
vm.runInContext("pdf=fakePdf;updateToolbar();",vctx);
vm.runInContext("renderPage();",vctx);
await flush();
const widthRendered=pdfRenderRequests.at(-1).width;
assert.ok(widthRendered>700,"fit width should expand into wide pane");
els.pdfFitPage.handlers.click();
await flush();
const pageRendered=pdfRenderRequests.at(-1).width;
assert.ok(pageRendered<widthRendered/2,"fit-page must use available height, not only width");
assert.equal(els.pdfZoomLabel.textContent,"พอดีทั้งหน้า");
assert.equal(els.pdfFitPage.attrs["aria-pressed"],"true");
els.pdfFitWidth.handlers.click();
await flush();
assert.equal(els.pdfZoomLabel.textContent,"พอดีความกว้าง");
assert.equal(els.pdfFitWidth.attrs["aria-pressed"],"true");
els.pdfCanvasHost.scrollTop=300;
els.pdfCanvasHost.scrollLeft=100;
vm.runInContext("setPage(8)",vctx);
await flush();
assert.equal(els.pdfCanvasHost.scrollTop,0,"page change resets vertical scroll");
assert.equal(els.pdfCanvasHost.scrollLeft,0,"page change resets horizontal scroll");
assert.equal(location.searchParams.get("page"),"8");
els.pdfZoomIn.handlers.click();
await flush();
assert.equal(els.pdfZoomLabel.textContent,"120%");
assert.equal(els.pdfTotal.textContent,"/ 41");
console.log("R11D.3 PASS: desktop independent scroll/restore, mobile modal/nav isolation, filter-first order, PDF fit/page reset.");
