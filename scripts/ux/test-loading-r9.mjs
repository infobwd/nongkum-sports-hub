// R9 — initial loading placeholders, first-load retry and refresh-state safety.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const htmlProgram=read("index.html"),htmlResults=read("results.html");
const css=read("css/base.css");
const shared=read("js/shared.js"),sorter=read("js/schedule-order.js"),program=read("js/program.js"),resultRenderers=read("js/results-renderers.js"),results=read("js/results.js");
const programData=JSON.parse(read("data/draft-schedule.json"));
const published=JSON.parse(read("data/public-results.json"));
const pids=["school","search","sports","levels","cards","count","empty","more","advancedFilters","activeFiltersHint","resultsLink",
  "refreshProgram","programRefreshStatus","sharedFixture","sharedFixtureCard","sharedFixtureStatus","programOverview","showFullSchedule",
  "programSkeleton","programListing","programLoadFailure","retryProgram","sharedFixtureLoadFailure","retrySharedFixture"];
const rids=["resultSchool","resultLevel","resultSports","resultsList","resultsCount","noResults","publishedAt","programLink",
  "refreshResults","resultsRefreshStatus","sharedResult","sharedResultCard","sharedResultStatus","resultsOverview","showAllResults",
  "resultsSkeleton","resultsListing","resultsLoadFailure","retryResults","sharedResultLoadFailure","retrySharedResult"];
for(const [page,ids] of [[htmlProgram,pids.slice(-6)],[htmlResults,rids.slice(-6)]]){
  for(const id of ids)assert.ok(page.includes('id="'+id+'"'),"R9 missing HTML element "+id);
}
for(const page of [htmlProgram,htmlResults]){
  assert.match(page,/aria-busy="true"/);
  assert.match(page,/class="loading-skeleton" aria-hidden="true"/);
  assert.doesNotMatch(page,/splash-screen|loading-overlay/i);
}
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/\.loading-skeleton\[hidden\],\.load-failure\[hidden\]\{display:none!important\}/);
assert.match(css,/min-height:44px/);
assert.doesNotMatch(css,/\.loading-skeleton\{[^}]*position:fixed/);
for(const code of [shared,sorter,program,resultRenderers,results])new vm.Script(code);

function el(id){
  return {id,hidden:/LoadFailure$/.test(id),textContent:"",innerHTML:"",value:"",open:false,children:[],handlers:{},attrs:{},
    appendChild(x){this.children.push(x);},
    addEventListener(type,fn){this.handlers[type]=fn;},
    setAttribute(k,v){this.attrs[k]=v;},
    querySelector(){return null;},
    querySelectorAll(){return [];}
  };
}
function harness(kind,fetchSource,query=""){
  const isProgram=kind==="program",ids=isProgram?pids:rids,els=Object.fromEntries(ids.map(id=>[id,el(id)]));
  const location=new URL("https://example.org/nongkum-sports-hub/"+(isProgram?"index.html":"results.html")+query);
  const store=new Map();
  const ctx=vm.createContext({URL,URLSearchParams,Date,Intl,location,history:{replaceState(){}},
    console:{log(){},error(){}},
    document:{visibilityState:"visible",getElementById(id){return els[id]??null;},createElement(tag){return el(tag);}},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    setInterval(){return 1;},fetch:()=>fetchSource()});
  new vm.Script(shared).runInContext(ctx);
  if(isProgram)new vm.Script(sorter).runInContext(ctx);
  if(!isProgram)new vm.Script(resultRenderers).runInContext(ctx);
  new vm.Script(isProgram?program:results).runInContext(ctx);
  return {els,ctx};
}
function deferred(){
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b;});
  return {promise,resolve,reject};
}
const success=data=>({ok:true,json:async()=>data});
async function flush(){for(let i=0;i<30;i++)await Promise.resolve();}

// Program: initial pending -> loaded, no fake empty/error; refreshed failure retains cards.
const pending=deferred();
let mode="pending";
const p=harness("program",()=>mode==="pending"?pending.promise:Promise.reject(Error("offline")));
assert.equal(p.els.programSkeleton.hidden,false,"initial skeleton must be visible");
assert.equal(p.els.programListing.attrs["aria-busy"],"true");
assert.equal(p.els.programLoadFailure.hidden,true);
pending.resolve(success(programData));await flush();
assert.equal(p.els.programSkeleton.hidden,true);
assert.equal(p.els.programListing.attrs["aria-busy"],"false");
assert.equal(p.els.programLoadFailure.hidden,true);
assert.match(p.els.count.textContent,/พบ 236 รายการ/);
const before=p.els.cards.innerHTML;
mode="fail";
p.els.refreshProgram.handlers.click();await flush();
assert.equal(p.els.programSkeleton.hidden,true,"no skeleton when refreshing existing list");
assert.equal(p.els.programLoadFailure.hidden,true,"stale data is not first-load error");
assert.equal(p.els.cards.innerHTML,before,"keep existing list when refresh fails");
assert.match(p.els.programRefreshStatus.textContent,/ยังคงข้อมูลล่าสุดที่โหลดไว้/);

// Program: first-load network failure has distinct recoverable error, not no-match empty.
let programOnline=false;
const broken=harness("program",()=>programOnline?Promise.resolve(success(programData)):Promise.reject(Error("offline")));
await flush();
assert.equal(broken.els.programSkeleton.hidden,true);
assert.equal(broken.els.programListing.attrs["aria-busy"],"false");
assert.equal(broken.els.programLoadFailure.hidden,false);
assert.equal(broken.els.empty.hidden,true);
assert.ok(typeof broken.els.retryProgram.handlers.click==="function");
programOnline=true;
broken.els.retryProgram.handlers.click();await flush();
assert.equal(broken.els.programLoadFailure.hidden,true);
assert.match(broken.els.count.textContent,/พบ 236 รายการ/);

// Deep-link first load fails: retry must be visible in the direct pane, not hidden in overview.
let directOnline=false;
const direct=harness("program",()=>directOnline?Promise.resolve(success(programData)):Promise.reject(Error("offline")),
  "?fixture="+encodeURIComponent(programData.fixtures[0].id));
await flush();
assert.equal(direct.els.programOverview.hidden,true);
assert.equal(direct.els.sharedFixtureLoadFailure.hidden,false);
assert.equal(direct.els.programSkeleton.hidden,true);
directOnline=true;
direct.els.retrySharedFixture.handlers.click();await flush();
assert.equal(direct.els.sharedFixtureLoadFailure.hidden,true);
assert.ok(direct.els.sharedFixtureCard.innerHTML.length>0);

// Valid published-results empty ≠ load error.
const empty=harness("results",()=>Promise.resolve(success(published)));
assert.equal(empty.els.resultsSkeleton.hidden,false);
await flush();
assert.equal(empty.els.resultsSkeleton.hidden,true);
assert.equal(empty.els.resultsListing.attrs["aria-busy"],"false");
assert.equal(empty.els.resultsLoadFailure.hidden,true);
assert.equal(empty.els.noResults.hidden,false);
assert.equal(empty.els.resultsCount.textContent,"0 รายการ");

// Results: network error + retry back to valid empty; refresh error retains an already loaded empty state.
let resultsOnline=false;
const rb=harness("results",()=>resultsOnline?Promise.resolve(success(published)):Promise.reject(Error("offline")));
await flush();
assert.equal(rb.els.resultsSkeleton.hidden,true);
assert.equal(rb.els.resultsLoadFailure.hidden,false);
assert.equal(rb.els.noResults.hidden,true);
resultsOnline=true;
rb.els.retryResults.handlers.click();await flush();
assert.equal(rb.els.resultsLoadFailure.hidden,true);
assert.equal(rb.els.noResults.hidden,false);
resultsOnline=false;
rb.els.refreshResults.handlers.click();await flush();
assert.equal(rb.els.resultsLoadFailure.hidden,true);
assert.equal(rb.els.noResults.hidden,false,"keep the approved-only empty state after refresh failure");
assert.match(rb.els.resultsRefreshStatus.textContent,/ยังคงผลล่าสุดที่โหลดไว้/);

// Direct approved-result link failure must expose its own retry.
let rdOnline=false;
const rd=harness("results",()=>rdOnline?Promise.resolve(success(published)):Promise.reject(Error("offline")),"?result=no-such-result");
await flush();
assert.equal(rd.els.resultsOverview.hidden,true);
assert.equal(rd.els.sharedResultLoadFailure.hidden,false);
rdOnline=true;
rd.els.retrySharedResult.handlers.click();await flush();
assert.equal(rd.els.sharedResultLoadFailure.hidden,true);
assert.match(rd.els.sharedResultCard.innerHTML,/ยังไม่มีผลการแข่งขันที่ผ่านการรับรอง/);

console.log("PASS R9: skeleton first load, no splash, aria-busy, retry, stale-data preservation, valid empty, direct-link recovery, reduced motion");
