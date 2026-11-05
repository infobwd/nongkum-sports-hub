// R11D.4 — book reader navigation, gestures and safe return. No network or PII.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const html=read("pdf-viewer.html");
const script=read("js/pdf-viewer.js");
const css=read("css/pdf-viewer.css");
const review=read("js/review.js");
const reviewHtml=read("review.html");
const dataset=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));

assert.equal(dataset.fixtures.length,237);
assert.match(html,/id="pdfBack"[^>]+href="\.\/review\.html"/);
assert.match(html,/class="pdf-toolbar pdf-bottom-bar"/);
assert.ok(html.indexOf('id="pdfCanvasHost"')<html.indexOf('id="pdfPrev"'),
  "Page navigation should appear beneath the book");
assert.match(html,/id="pdfTools"/);
assert.match(html,/id="pdfZoomIn"/);
assert.match(html,/id="pdfFitWidth"/);
assert.match(html,/id="pdfFitPage"/);
assert.match(css,/safe-area-inset-bottom/);
assert.match(css,/safe-area-inset-top/);
assert.match(css,/touch-action:pan-x pan-y/);
assert.match(css,/min-height:48px/);
assert.match(script,/passive: false/);
assert.match(script,/touchstart/);
assert.match(script,/touchmove/);
assert.match(script,/touchend/);
assert.match(script,/touchcancel/);
assert.match(script,/Math\.abs\(dx\) >= 65/);
assert.match(script,/if \(zoom === 1/);
assert.match(script,/updateZoom\(zoom > 1 \? 1 : 1\.8\)/);
assert.match(script,/window\.parent\.postMessage/);
assert.match(script,/fixtureRef\.length <= 180/);
assert.doesNotMatch(script,/searchParams\.get\(["'](?:return|redirect|url|file)["']\)/);
assert.match(review,/event\.origin!==location\.origin/);
assert.match(review,/event\.source!==ui\.pdfFrame\.contentWindow/);
assert.match(review,/url\.searchParams\.set\("fixture",f\.id\)/);
assert.match(review,/url\.searchParams\.set\("embedded","1"\)/);
assert.match(reviewHtml,/id="pdfPreviewClose"/);
new vm.Script(script,{filename:"js/pdf-viewer.js"});
new vm.Script(review,{filename:"js/review.js"});

class Element {
  constructor(id=""){
    this.id=id;this.handlers={};this.attrs={};this.style={};this.value="";
    this.disabled=false;this.hidden=false;this.textContent="";
    this.scrollTop=0;this.scrollLeft=0;this.clientWidth=390;this.clientHeight=650;
    this.href="";this.open=false;this.isConnected=true;
  }
  addEventListener(type,cb){this.handlers[type]=cb;}
  setAttribute(key,value){this.attrs[key]=String(value);}
  focus(){}
  getContext(){return {};}
}
async function settle(){for(let i=0;i<55;i++)await Promise.resolve();}
function createViewer(urlString,iframe=false){
  const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  const els=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
  const location=new URL(urlString);
  const messages=[];
  const win={devicePixelRatio:1,handlers:{},
    addEventListener(type,cb){this.handlers[type]=cb;},
    parent:null
  };
  win.parent=iframe?{postMessage:(payload,origin)=>messages.push({payload,origin})}:win;
  const requests=[];
  const fakePdf={numPages:41,getPage:async()=>({
    getViewport:({scale})=>({width:595*scale,height:842*scale}),
    render:({viewport})=>{
      requests.push(viewport);
      return {promise:Promise.resolve(),cancel(){}};
    }
  })};
  const ctx=vm.createContext({
    document:{getElementById:id=>els[id]||null},
    location,window:win,URL,URLSearchParams,Date,Math,
    history:{replaceState(_a,_b,p){location.href=new URL(p,location.href).href;}},
    console:{error(){}},setTimeout:()=>0,clearTimeout:()=>{},
    fakePdf
  });
  const noStart=script.replace(/\nstartViewer\(\);\s*$/,"");
  assert.notEqual(noStart,script);
  new vm.Script(noStart).runInContext(ctx);
  vm.runInContext("pdf=fakePdf;updateToolbar();renderPage();",ctx);
  return {els,ctx,location,win,messages,requests};
}
function touch(x,y){return {clientX:x,clientY:y};}
function event(start,end,moving=false){
  return {touches:moving?[start]:[],changedTouches:[end],cancelable:true,preventDefault(){}};
}
function swipe(viewer,dx,dy){
  const e=viewer.els.pdfCanvasHost;
  e.handlers.touchstart({touches:[touch(200,220)]});
  e.handlers.touchend(event(touch(200,220),touch(200+dx,220+dy)));
}
function tap(viewer,x=200,y=220){
  const e=viewer.els.pdfCanvasHost;
  e.handlers.touchstart({touches:[touch(x,y)]});
  e.handlers.touchend(event(touch(x,y),touch(x,y)));
}
const direct=createViewer("https://example.test/nongkum/pdf-viewer.html?page=1");
await settle();
assert.equal(direct.els.pdfBack.href,"https://example.test/nongkum/review.html");
assert.equal(direct.els.pdfPrev.disabled,true);
assert.equal(direct.els.pdfNext.disabled,false);
swipe(direct,-150,3);
await settle();
assert.equal(direct.location.searchParams.get("page"),"2","left swipe advances page");
swipe(direct,150,3);
await settle();
assert.equal(direct.location.searchParams.get("page"),"1","right swipe reverses page");
swipe(direct,-160,220);
await settle();
assert.equal(direct.location.searchParams.get("page"),"1","vertical scroll must not turn page");
tap(direct);tap(direct);
await settle();
assert.equal(vm.runInContext("zoom",direct.ctx),1.8,"double-tap zooms");
swipe(direct,-190,0);
await settle();
assert.equal(direct.location.searchParams.get("page"),"1","zoomed page must not turn on swipe");
tap(direct);tap(direct);
await settle();
assert.equal(vm.runInContext("zoom",direct.ctx),1,"second double-tap resets zoom");
const host=direct.els.pdfCanvasHost;
host.handlers.touchstart({touches:[touch(100,200),touch(200,200)]});
let prevented=false;
host.handlers.touchmove({touches:[touch(75,200),touch(225,200)],
  cancelable:true,preventDefault(){prevented=true;}});
assert.equal(prevented,true,"prevent page-level pinch zoom on mobile");
assert.match(direct.els.pdfCanvas.style.transform,/scale\(/);
host.handlers.touchend({touches:[touch(75,200)],changedTouches:[touch(225,200)]});
await settle();
assert.equal(vm.runInContext("zoom",direct.ctx),1.5,"pinch commits zoom when finished");
assert.equal(direct.els.pdfCanvas.style.transform,"","clear temporary preview");
swipe(direct,-150,0);
assert.equal(direct.location.searchParams.get("page"),"1","pinch zoom must lock swipe");
direct.els.pdfFitWidth.handlers.click();
await settle();
assert.equal(vm.runInContext("zoom",direct.ctx),1,"fit width restores unzoomed reader");
vm.runInContext("setPage(41)",direct.ctx);
await settle();
swipe(direct,-170,0);
assert.equal(direct.location.searchParams.get("page"),"41","stop at last page");
vm.runInContext("setPage(1)",direct.ctx);
await settle();
swipe(direct,170,0);
assert.equal(direct.location.searchParams.get("page"),"1","stop at first page");

// A fixture from a published card creates a fixed same-origin back destination.
// Untrusted external redirect URLs are never honored.
const fixture=dataset.fixtures[0].id;
const directFixture=createViewer("https://example.test/nongkum/pdf-viewer.html?page=7&fixture="+encodeURIComponent(fixture));
assert.equal(new URL(directFixture.els.pdfBack.href).searchParams.get("fixture"),fixture);
const bad=createViewer("https://example.test/nongkum/pdf-viewer.html?page=7&fixture=https%3A%2F%2Fexample.evil%2F");
assert.equal(bad.els.pdfBack.href,"https://example.test/nongkum/review.html");
const embedded=createViewer("https://example.test/nongkum/pdf-viewer.html?page=7&embedded=1&fixture="+encodeURIComponent(fixture),true);
let stopped=false;
embedded.els.pdfBack.handlers.click({preventDefault(){stopped=true;}});
assert.equal(stopped,true);
assert.equal(embedded.messages.length,1);
assert.equal(embedded.messages[0].payload.type,"nongkum:close-pdf-viewer");
assert.equal(embedded.messages[0].origin,"https://example.test");

// Source page references (not match sequence) remain intact.
assert.ok(dataset.fixtures.every(f=>Number.isInteger(Number(f.source_pdf.page))&&
  Number(f.source_pdf.page)>=1&&Number(f.source_pdf.page)<=41));
console.log("R11D.4 PASS: back/return routing, touch swipe boundaries, zoom gesture safety, PDF 41-page source");
