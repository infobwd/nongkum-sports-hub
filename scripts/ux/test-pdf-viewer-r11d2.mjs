// R11D.2: verified binary PDF, source-page routing, desktop/mobile preview and return.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const pdfBytes = readFileSync(new URL("../../assets/souvenir-2569-v2.pdf", import.meta.url));
const sha256 = createHash("sha256").update(pdfBytes).digest("hex");
const expectedSha = "1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf";
assert.equal(sha256, expectedSha, "locally hosted PDF must be byte-identical to Drive V2 / R11A source");
assert.equal(pdfBytes.length, 982844);
assert.ok(pdfBytes.subarray(0, 5).toString() === "%PDF-", "viewer binary must be a real PDF");

const program = JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const diff = JSON.parse(read("data/reconciliation/r11a-program-diff-20261104.json"));
assert.equal(program.metadata.source_sha256, expectedSha);
assert.equal(program.metadata.physical_pdf_pages, 41);
assert.equal(program.metadata.all_data_approved, false);
assert.equal(program.fixtures.length, 237);
assert.equal(program.fixtures.filter(f=>f.kind==="match").length, 187);
assert.equal(program.fixtures.filter(f=>f.kind==="track_event").length, 50);
assert.equal(program.fixtures.filter(f=>f.kind==="track_event").reduce((s,f)=>s+f.lanes.length,0), 289);
const pages = program.fixtures.map(x => Number(x.source_pdf?.page));
assert.ok(pages.every(p=>Number.isInteger(p)&&p>=1&&p<=41), "all fixtures have correct physical page numbers");
for (const p of [7,11,17,18,23,35]) {
  assert.ok(pages.includes(p), "representative page " + p + " must exist");
}
assert.ok(program.fixtures.find(f=>f.sport_id==="football"&&f.source_pdf.page===7));
assert.ok(program.fixtures.find(f=>f.sport_id==="volleyball"&&f.source_pdf.page===11));
assert.ok(program.fixtures.find(f=>f.sport_id==="petanque"&&f.source_pdf.page===17));
assert.ok(program.fixtures.find(f=>f.sport_id==="petanque"&&f.source_pdf.page===18));
assert.ok(program.fixtures.find(f=>f.sport_id==="athletics"&&f.source_pdf.page===23));
assert.ok(program.fixtures.find(f=>f.sport_id==="athletics"&&f.source_pdf.page===35));
const html = read("review.html");
const viewerHtml = read("pdf-viewer.html");
const viewerJs = read("js/pdf-viewer.js");
const css = read("css/review.css");
const viewerCss = read("css/pdf-viewer.css");
const shared = read("js/shared.js");
const model = read("js/review-model.js");
const review = read("js/review.js");
assert.match(html, /id="pdfPreview"/);
assert.match(html, /id="pdfPreviewFrame"/);
assert.match(html, /id="pdfPreviewClose"/);
assert.doesNotMatch(html, /<iframe[^>]+src=/, "PDF iframe must not load until a card is clicked");
assert.match(review, /f\.source_pdf\?\.page/);
assert.match(review, /"ดูต้นฉบับ หน้า "\+pdfPage/);
assert.match(review, /url\.searchParams\.set\("page",String\(page\)\)/);
assert.match(review, /ui\.pdfFrame\.src=url\.toString\(\)/);
assert.match(review, /ui\.pdfFrame\.removeAttribute\("src"\)/);
assert.match(review, /document\.body\.classList\.remove\("review-pdf-open"\)/);
assert.doesNotMatch(review, /fetch\(\s*PDF_URL/, "no eager PDF fetch on review listing");
assert.match(css,/body\.review-pdf-open \.review-main/);
assert.match(css,/@media\(max-width:1000px\)/);
assert.match(css, /safe-area-inset-top/);
assert.match(viewerHtml,/id="pdfPrev"/);
assert.match(viewerHtml,/id="pdfNext"/);
assert.match(viewerHtml,/id="pdfZoomIn"/);
assert.match(viewerHtml,/id="pdfZoomOut"/);
assert.match(viewerHtml,/id="pdfCanvas"/);
assert.match(viewerHtml,/id="pdfFallback"/);
assert.match(viewerCss,/pdf-canvas-host/);
assert.match(viewerJs,/const EXPECTED_PAGES = 41/);
assert.match(viewerJs,/url: PDF_URL/);
assert.match(viewerJs,/\.render\(\{/);
assert.match(viewerJs,/activeTask\.cancel\(\)/);
assert.match(viewerJs,/8_000_000/);
assert.match(viewerJs,/import\(PDF_JS_URL\)/);
assert.match(viewerJs,/PDF_WORKER_URL/);
assert.match(viewerJs,/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/6\.4\.299\/pdf\.min\.mjs/);
assert.match(viewerJs,/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/6\.4\.299\/pdf\.worker\.min\.mjs/);
assert.doesNotMatch(viewerJs, /searchParams\.get\("file"\)/, "viewer must not accept user-supplied PDF URLs");
assert.doesNotMatch(review+viewerJs, /fetch\([^)]*\{[^}]*method:\s*["']POST["']/s);
new vm.Script(viewerJs,{filename:"js/pdf-viewer.js"});
new vm.Script(review,{filename:"js/review.js"});
new vm.Script(model,{filename:"js/review-model.js"});

class Element {
  constructor(tag,id=""){
    this.tag=tag;this.id=id;this.children=[];this.handlers={};
    this.attrs={};this.textContent="";this.value="";this.checked=false;
    this.hidden=id==="pdfPreview";this.open=false;this.disabled=false;
    this.className="";this.replaceCount=0;this.isConnected=true;
  }
  appendChild(node){
    if(node.tag==="#fragment"){
      this.children.push(...node.children);node.children=[];
    } else this.children.push(node);
    return node;
  }
  replaceChildren(...nodes){
    this.replaceCount++;this.children=[];
    for(const node of nodes)this.appendChild(node);
  }
  addEventListener(event,fn){this.handlers[event]=fn;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  removeAttribute(k){delete this[k];delete this.attrs[k];}
  focus(){}
  select(){}
  scrollIntoView(){}
}
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const els=Object.fromEntries(ids.map(id=>[id,new Element("div",id)]));
const activeClasses=new Set();
const body={classList:{add:x=>activeClasses.add(x),remove:x=>activeClasses.delete(x)}};
const location=new URL("https://example.test/nongkum-sports-hub/review.html");
const document={
  body,getElementById:id=>els[id]??null,createElement:tag=>new Element(tag),
  createDocumentFragment:()=>new Element("#fragment"),
  addEventListener:(event,fn)=>{document.handlers[event]=fn;},handlers:{}
};
const window={
  scrollY:1490, scrollTo:(x,y)=>{window.restoredY=y;},
};
const ctx=vm.createContext({
 document,window,location,URL,URLSearchParams,Date,Intl,
 history:{replaceState(_a,_b,p){location.href=new URL(p,location.href).href;}},
 navigator:{clipboard:{writeText:async()=>{}}},
 fetch:async url=>{
   if(url.includes("program-from-pdf-2569-20261104-draft.json"))return {ok:true,json:async()=>program};
   if(url.includes("r11a-program-diff-20261104.json"))return {ok:true,json:async()=>diff};
   throw Error("unexpected eager URL "+url);
 },
 setTimeout:(fn)=>0,clearTimeout:()=>{},console:{error(){}}
});
new vm.Script(shared).runInContext(ctx);
new vm.Script(model).runInContext(ctx);
new vm.Script(review).runInContext(ctx);
for(let i=0;i<30;i++)await Promise.resolve();
assert.equal(els.reviewCards.children.length,8);
assert.equal(els.pdfPreview.hidden,true);
assert.ok(!("src" in els.pdfPreviewFrame),"PDF must not be fetched before clicking");
function findButton(node,text){
 if(node.tag==="button" && String(node.textContent).includes(text))return node;
 for(const child of node.children){const found=findButton(child,text);if(found)return found;}
 return null;
}
const card=els.reviewCards.children[0];
const fixtureId=card.attrs["data-fixture-id"];
const chosen=program.fixtures.find(f=>f.id===fixtureId);
assert.ok(chosen);
const open=findButton(card,"ดูต้นฉบับ หน้า");
assert.ok(open);
open.handlers.click();
assert.equal(els.pdfPreview.hidden,false);
assert.ok(activeClasses.has("review-pdf-open"));
assert.equal(new URL(els.pdfPreviewFrame.src).searchParams.get("page"),String(chosen.source_pdf.page));
assert.match(els.pdfPreviewContext.textContent,/หน้า \d+/);
els.pdfPreviewClose.handlers.click();
assert.equal(els.pdfPreview.hidden,true);
assert.ok(!activeClasses.has("review-pdf-open"));
assert.ok(!("src" in els.pdfPreviewFrame));
assert.equal(window.restoredY,1490,"close must restore original scroll position");
assert.equal(els.reviewCards.children[0],card,"do not remount cards on PDF close");
assert.equal(els.reviewSchool.value,"");
assert.equal(els.reviewSport.value,"");
assert.equal(els.reviewCards.children.length,8);
console.log("R11D.2 PASS: identical source PDF, 237 valid pages, lazy viewer, page routing, back-to-card & safe-area contracts");
