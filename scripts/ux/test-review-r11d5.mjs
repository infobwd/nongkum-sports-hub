// R11D.5 — prevent fixed iOS status-bar overlays; preserve mobile filter state.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL("../../"+p, import.meta.url), "utf8");
const css = read("css/review.css");
const base = read("css/base.css");
const html = read("review.html");
const js = read("js/review.js");
const shared = read("js/shared.js");
const model = read("js/review-model.js");
const dataset = JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const diff = JSON.parse(read("data/reconciliation/r11a-program-diff-20261104.json"));

assert.equal(dataset.fixtures.length, 237);
assert.doesNotMatch(css, /body\[data-view=["']review["']\]::?before\s*\{/,
  "old WebKit fixed safe-area mask must be removed, not merely hidden");
assert.doesNotMatch(css, /body\.review-pdf-open::?before\s*\{/);
assert.doesNotMatch(css, /@supports\s*\(-webkit-touch-callout:\s*none\)/,
  "no redundant WebKit status-bar overlay");
assert.match(base, /--safe-top:env\(safe-area-inset-top,0px\)/);
assert.match(base, /body\{margin:0;line-height:1\.55;padding-top:var\(--safe-top\)/);
assert.match(base, /No fixed pseudo-element may cover the header while scrolling/);
assert.match(css, /body\.review-pdf-open \.review-pdf-preview\{z-index:1300\}/);
assert.match(css, /body\.review-pdf-open \.mobile-nav\{display:none!important\}/);
assert.match(html, /href="\.\/css\/review\.css\?v=r11d[56]"/);
assert.match(html, /src="\.\/js\/review\.js\?v=r11d[56]"/);
assert.match(html, /id="reviewCollapseExtras"/);
assert.match(css, /\.review-collapse-filters/);
assert.match(css, /\.review-card-details:not\(\[open\]\)>\.review-extra-content\{display:none\}/);
assert.match(css, /\.review-admin-codes:not\(\[open\]\)>:not\(summary\)\{display:none\}/);
assert.match(js, /ui\.extraHint\.textContent=selected\?"ใช้ "\+selected\+" ตัวเลือก":""/);
new vm.Script(js,{filename:"js/review.js"});

class El {
  constructor(tag="div",id=""){
    this.tag=tag;this.id=id;this.children=[];this.handlers={};this.attrs={};
    this.className="";this.value="";this.checked=false;this.textContent="";
    this.hidden=id==="pdfPreview";this.open=false;this.disabled=false;
    this.isConnected=true;this.style={};this.scrollTop=0;this.scrollLeft=0;
  }
  addEventListener(type,cb){this.handlers[type]=cb;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  removeAttribute(k){delete this[k];delete this.attrs[k];}
  appendChild(node){if(node.tag==="#fragment"){this.children.push(...node.children);node.children=[];}else this.children.push(node);return node;}
  replaceChildren(...nodes){this.children=[];nodes.forEach(n=>this.appendChild(n));}
  focus(){this.focused=true;}
  select(){}
  scrollIntoView(){}
  querySelector(tag){return tag==="summary"?{focus:()=>{this.summaryFocused=true;}}:null;}
}
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const els=Object.fromEntries(ids.map(id=>[id,new El("div",id)]));
const loc=new URL("https://example.test/nongkum-sports-hub/review.html");
const document={
  body:{classList:{add(){},remove(){}}},
  getElementById:id=>els[id]||null,
  createElement:tag=>new El(tag),
  createDocumentFragment:()=>new El("#fragment"),
  addEventListener(){}
};
const context=vm.createContext({
  document,window:{scrollY:0,scrollTo(){},addEventListener(){},
    matchMedia:()=>({matches:true})},
  location:loc,URL,URLSearchParams,Date,Intl,
  history:{replaceState(_a,_b,p){loc.href=new URL(p,loc.href).href;}},
  navigator:{clipboard:{writeText:async()=>{}}},
  fetch:async url=>{
    if(url.includes("program-from-pdf-2569-20261104-draft.json"))return {ok:true,json:async()=>dataset};
    if(url.includes("r11a-program-diff-20261104.json"))return {ok:true,json:async()=>diff};
    throw Error("unexpected fetch: "+url);
  },
  setTimeout:()=>1,clearTimeout:()=>{},console:{error(){}}
});
new vm.Script(shared).runInContext(context);
new vm.Script(model).runInContext(context);
new vm.Script(js).runInContext(context);
for(let i=0;i<60;i++)await Promise.resolve();
assert.equal(els.reviewCards.children.length,8);
assert.equal(els.reviewExtraFilters.open,false);
assert.equal(els.reviewExtraHint.textContent,"");
els.reviewExtraFilters.open=true;
els.reviewLevel.value="primary";
els.reviewLevel.handlers.change();
assert.equal(els.reviewExtraHint.textContent,"ใช้ 1 ตัวเลือก");
els.reviewQaOnly.checked=true;
els.reviewQaOnly.handlers.change();
assert.equal(els.reviewExtraHint.textContent,"ใช้ 2 ตัวเลือก");
els.reviewCollapseExtras.handlers.click();
assert.equal(els.reviewExtraFilters.open,false);
assert.equal(els.reviewLevel.value,"primary");
assert.equal(els.reviewQaOnly.checked,true);
assert.equal(els.reviewExtraHint.textContent,"ใช้ 2 ตัวเลือก",
  "active filters remain visible while panel is folded");
assert.equal(els.reviewExtraFilters.summaryFocused,true);
els.clearFilters.handlers.click();
assert.equal(els.reviewExtraHint.textContent,"");
assert.equal(els.reviewLevel.value,"");
assert.equal(els.reviewQaOnly.checked,false);
assert.equal(els.reviewExtraFilters.open,false);
console.log("R11D.5 PASS: no iOS fixed overlay, cache-bust, filter badge/fold, review state and 237-source contract.");
