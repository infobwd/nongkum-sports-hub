// R11D.1: mobile teacher workflow, incremental DOM, Thai search and verified PDF link.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const html=read("review.html");
const css=read("css/review.css");
const script=read("js/review.js");
const shared=read("js/shared.js");
const model=read("js/review-model.js");
const data=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const diff=JSON.parse(read("data/reconciliation/r11a-program-diff-20261104.json"));
const pdf="https://drive.google.com/file/d/1zMxnF99lJHTQ8zgCH1QUs5rB9Uf8O4IO/view?usp=drivesdk";

assert.ok(html.includes('href="'+pdf+'"'),"V2 PDF must point to the verified Drive file");
assert.match(html,/ร่าง - สูจิบัตรกีฬากลุ่ม ปี 2569_V2\.pdf/);
assert.match(html,/บางบัญชีอาจต้องขอสิทธิ์/,"do not promise public download access");
assert.match(html,/rel="noopener noreferrer"/);
assert.match(html,/id="reviewExtraFilters"/);
assert.match(html,/ค้นหาและตัวเลือกเพิ่มเติม/);
assert.match(html,/aria-current="page" aria-label="ตรวจโปรแกรมฉบับใหม่"/);
assert.doesNotMatch(html,/>R11D · ฉบับตรวจสอบข้อมูล</);
assert.doesNotMatch(html,/เพิ่มเติม \(QA\)/);
assert.doesNotMatch(html,/>Fixture ID</);
assert.match(css,/review-mobile-nav\{grid-template-columns:repeat\(3/);
assert.match(css,/review-pdf-download/);
assert.match(css,/review-card-details/);
assert.match(script,/const PAGE_SIZE=8/);
assert.match(script,/const SEARCH_DELAY_MS=280/);
assert.match(script,/compositionstart/);
assert.match(script,/compositionend/);
assert.match(script,/filterSignature===signature/);
assert.match(script,/ui\.cards\.appendChild\(fragment\)/);
assert.match(script,/ui\.cards\.replaceChildren\(fragment\)/);
assert.doesNotMatch(script,/innerHTML\s*=/);
assert.doesNotMatch(script,/localStorage|sessionStorage/);
assert.ok(data.fixtures.length===237&&diff.summary.candidate_total===237);
new vm.Script(script);
new vm.Script(model);

class Element {
  constructor(tag,id=""){
    this.tag=tag;this.id=id;this.children=[];this.handlers={};
    this.attrs={};this.textContent="";this.value="";this.checked=false;
    this.hidden=false;this.open=false;this.disabled=false;
    this.className="";this.replaceCount=0;this.appendCount=0;
  }
  appendChild(node){
    this.appendCount++;
    if(node.tag==="#fragment"){
      this.children.push(...node.children);
      node.children=[];
    }else this.children.push(node);
    return node;
  }
  replaceChildren(...nodes){
    this.replaceCount++;
    this.children=[];
    for(const node of nodes)this.appendChild(node);
  }
  addEventListener(event,fn){this.handlers[event]=fn;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  focus(){}
  select(){}
  scrollIntoView(){}
}
const elementIds=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
const els=Object.fromEntries(elementIds.map(id=>[id,new Element("div",id)]));
const location=new URL("https://example.test/nongkum-sports-hub/review.html");
let nextTimer=0;
const timers=new Map();
const fetchPaths=[];
const fakeDocument={
  getElementById:id=>els[id]||null,
  createElement:tag=>new Element(tag),
  createDocumentFragment:()=>new Element("#fragment")
};
const ctx=vm.createContext({
  document:fakeDocument,location,history:{replaceState(_a,_b,path){location.href=new URL(path,location.href).href;}},
  URL,URLSearchParams,Date,Intl,
  navigator:{clipboard:{writeText:async()=>{}}},
  setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id;},
  clearTimeout:id=>timers.delete(id),
  fetch:async path=>{
    fetchPaths.push(path);
    if(path.includes("program-from-pdf-2569-20261104-draft.json"))
      return {ok:true,json:async()=>data};
    if(path.includes("r11a-program-diff-20261104.json"))
      return {ok:true,json:async()=>diff};
    throw Error("unexpected fetch "+path);
  },
  console:{error(){}}
});
new vm.Script(shared).runInContext(ctx);
new vm.Script(model).runInContext(ctx);
new vm.Script(script).runInContext(ctx);

async function settle(){for(let i=0;i<50;i++)await Promise.resolve();}
function runTimers(){
  const current=[...timers.values()];
  timers.clear();
  for(const {fn} of current)fn();
}
await settle();
assert.equal(els.reviewCards.children.length,8,"initial render must create 8 cards only");
assert.match(els.reviewCount.textContent,/แสดง 8 จาก 237 รายการ/);
assert.equal(els.reviewExtraFilters.open,false,"advanced filters collapsed for teachers");
assert.equal(els.revisionLabel.textContent.includes("Revision:"),false);
assert.equal(els.reviewSkeleton.hidden,true);
assert.equal(els.reviewLoadFailure.hidden,true);
assert.equal(els.reviewListing.attrs["aria-busy"],"false");
assert.equal(fetchPaths.length,2,"candidate + optional diff fetch once per load");

const initialFirst=els.reviewCards.children[0];
const initialReplaceCount=els.reviewCards.replaceCount;
els.reviewMore.handlers.click();
assert.equal(els.reviewCards.children.length,16,"show more appends only next 8");
assert.equal(els.reviewCards.children[0],initialFirst,"previous DOM cards must stay mounted");
assert.equal(els.reviewCards.replaceCount,initialReplaceCount,"append must not rebuild cards");
els.reviewMore.handlers.click();
assert.equal(els.reviewCards.children.length,24);
assert.equal(els.reviewCards.replaceCount,initialReplaceCount,"append pages without re-rendering");

els.reviewSearch.value="ว";
els.reviewSearch.handlers.input();
els.reviewSearch.value="วัง";
els.reviewSearch.handlers.input();
els.reviewSearch.value="วังด้ง";
els.reviewSearch.handlers.input();
assert.equal(timers.size,1,"typing must be coalesced into one timer");
assert.equal(els.reviewCards.children.length,24,"typing must not immediately rebuild listing");
runTimers();
assert.match(els.reviewCount.textContent,/จาก \d+ รายการ/);
assert.ok(els.reviewCards.children.length<=8);
const afterDebounce=els.reviewCards.replaceCount;
els.reviewSearch.handlers.input();
runTimers();
assert.equal(els.reviewCards.replaceCount,afterDebounce,
  "same search filter must not redraw cards");

els.reviewSearch.handlers.compositionstart();
els.reviewSearch.value="ฟุตบอล";
els.reviewSearch.handlers.input();
assert.equal(timers.size,0,"do not filter during Thai IME composition");
els.reviewSearch.handlers.compositionend();
assert.equal(timers.size,1,"filter only after IME completes");
runTimers();
assert.ok(els.reviewCards.children.length>0,"Thai sport names should be searchable");
assert.match(els.reviewCount.textContent,/จาก \d+ รายการ/);

els.reviewSearch.value="คู่ 20";
els.reviewSearch.handlers.input();
runTimers();
assert.ok(els.reviewCards.children.length>0,"pair-number search should work");
els.reviewQaOnly.checked=true;
els.reviewQaOnly.handlers.change();
assert.ok(els.reviewCards.children.length<=8);
assert.ok(els.reviewCount.textContent.includes("จาก "));

els.clearFilters.handlers.click();
assert.equal(els.reviewCards.children.length,8);
assert.match(els.reviewCount.textContent,/แสดง 8 จาก 237 รายการ/);
assert.equal(els.reviewExtraFilters.open,false);

const sportNames=new Map(data.sports.map(s=>[s.id,s.name]));
assert.ok(ctx.NongkumReviewModel.filterItems(
  data.fixtures,{search:"ฟุตบอล"},ctx.Nongkum.classifyLevel,sportNames).length>0);
assert.ok(ctx.NongkumReviewModel.filterItems(
  data.fixtures,{search:"คู่ 20"},ctx.Nongkum.classifyLevel,sportNames).length>0);
const issue=ctx.NongkumReviewModel.formatIssue(data.fixtures[0],"ฟุตบอล");
assert.match(issue,/รหัสรายการ:/);
assert.match(issue,/ควรแก้เป็น:/);
assert.doesNotMatch(issue,/Fixture ID:|Revision:|QA:/);
console.log("R11D.1 PASS: Drive V2 PDF link, 8-card incremental DOM, Thai search debounce, teacher copy, active review nav");
