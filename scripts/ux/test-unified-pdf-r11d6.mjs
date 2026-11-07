// R11D.6 — one embedded header/warning, no double Safe Area, options retained.
// Static contracts + synthetic JS DOM for standalone versus same-origin iframe.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const html=read("pdf-viewer.html");
const css=read("css/pdf-viewer.css");
const js=read("js/pdf-viewer.js");
const reviewHtml=read("review.html");
const reviewCss=read("css/review.css");
const reviewJs=read("js/review.js");
const data=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
assert.equal(data.fixtures.length,237);
assert.match(html,/id="pdfBottomBar" class="pdf-toolbar pdf-bottom-bar"/);
assert.match(html,/id="pdfTools" class="pdf-book-tools"/);
assert.match(html,/id="pdfBack"/);
assert.match(html,/class="pdf-draft"/);
assert.match(html,/href="\.\/css\/pdf-viewer\.css\?v=r11d6"/);
assert.match(html,/src="\.\/js\/pdf-viewer\.js\?v=(?:r14-book1|r23a1)"/);
assert.match(reviewHtml,/id="pdfPreviewClose"/);
assert.match(reviewHtml,/class="review-preview-footer"/);
assert.match(reviewHtml,/href="\.\/css\/review\.css\?v=r11d6"/);
assert.match(reviewHtml,/src="\.\/js\/review\.js\?v=r11d6(?:-r20b1)?(?:-r22)?"/);
assert.match(reviewCss,/padding-top:env\(safe-area-inset-top,0px\);padding-bottom:env\(safe-area-inset-bottom,0px\)/);
assert.doesNotMatch(reviewCss,/padding-top:max\(env\(safe-area-inset-top,0px\),44px\)/);
assert.match(css,/\.pdf-embedded \.pdf-book-header\{display:none\}/);
assert.match(css,/\.pdf-embedded \.pdf-draft\{display:none\}/);
assert.match(css,/\.pdf-embedded \.pdf-swipe-hint\{display:none\}/);
assert.match(css,/\.pdf-embedded \.pdf-book-tools/);
assert.match(css,/\.pdf-embedded \.pdf-tools-panel\{top:auto;bottom:calc\(100% \+ 10px\);right:0\}/);
assert.match(css,/\.pdf-embedded \.pdf-bottom-bar\{padding-bottom:10px\}/);
assert.match(reviewCss,/body\.review-pdf-open \.review-pdf-preview\{z-index:1300\}/);
assert.match(reviewJs,/url\.searchParams\.set\("embedded","1"\)/);
assert.match(reviewJs,/url\.searchParams\.set\("fixture",f\.id\)/);
assert.match(reviewJs,/url\.searchParams\.set\("v","r11d6"\)/);
assert.match(reviewJs,/event\.source!==ui\.pdfFrame\.contentWindow/);
assert.match(reviewJs,/event\.origin!==location\.origin/);
new vm.Script(js);
new vm.Script(reviewJs);

function simulateViewer(embeddedRequested, insideFrame) {
  const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
  const events=new Map();
  class FakeElement {
    constructor(id){
      this.id=id;this.attrs={};this.children=[];this.handlers={};this.style={};
      this.value="";this.textContent="";this.disabled=false;this.hidden=false;
      this.scrollLeft=0;this.scrollTop=0;this.clientWidth=400;this.clientHeight=700;
    }
    addEventListener(type,cb){this.handlers[type]=cb;}
    setAttribute(k,v){this.attrs[k]=String(v);}
    appendChild(x){this.children.push(x);return x;}
    getContext(){return {};}
  }
  const nodes=Object.fromEntries(ids.map(id=>[id,new FakeElement(id)]));
  const classes=new Set();
  const doc={
    documentElement:{classList:{add(name){classes.add(name);}}},
    getElementById(id){return nodes[id]||null;}
  };
  const location=new URL("https://example.test/nongkum/pdf-viewer.html?page=7"+
    (embeddedRequested?"&embedded=1&fixture=football-12m":""));
  const win={devicePixelRatio:1,parent:null,addEventListener(type,cb){events.set(type,cb);}};
  win.parent=insideFrame?{postMessage(){}}:win;
  const ctx=vm.createContext({document:doc,window:win,location,URL,URLSearchParams,
    history:{replaceState(){}},Math,Date,console:{error(){}},setTimeout(){}});
  const script=js.replace(/\nstartViewer\(\);\s*$/,"");
  assert.notEqual(script,js);
  new vm.Script(script).runInContext(ctx);
  return {nodes,classes,ctx};
}
const standalone=simulateViewer(false,false);
assert.equal(standalone.classes.has("pdf-embedded"),false,"standalone reader retains title and safe areas");
assert.equal(standalone.nodes.pdfBottomBar.children.length,0,"standalone options stay in the white header");
assert.equal(standalone.nodes.pdfTools.handlers.toggle,undefined);
assert.equal(standalone.nodes.pdfBack.href,"https://example.test/nongkum/review.html");
const misleadingDirect=simulateViewer(true,false);
assert.equal(misleadingDirect.classes.has("pdf-embedded"),false,
  "?embedded=1 in a direct tab must not hide standalone controls");
const embedded=simulateViewer(true,true);
assert.equal(embedded.classes.has("pdf-embedded"),true);
assert.equal(embedded.nodes.pdfBottomBar.children.length,1);
assert.equal(embedded.nodes.pdfBottomBar.children[0],embedded.nodes.pdfTools,
  "reuse one existing options menu, do not duplicate fit/zoom buttons");
assert.ok(embedded.nodes.pdfFitWidth.handlers.click);
assert.ok(embedded.nodes.pdfFitPage.handlers.click);
assert.ok(embedded.nodes.pdfZoomIn.handlers.click);
assert.ok(embedded.nodes.pdfPrev.handlers.click);
assert.ok(embedded.nodes.pdfNext.handlers.click);
assert.equal(embedded.nodes.pdfBack.href.includes("fixture=football-12m"),true);
assert.equal(data.fixtures.filter(x=>x.kind==="track_event").length,50);
console.log("R11D.6 PASS: embedded vs standalone, one header/warning, safe-area, retained options and 237 records");
