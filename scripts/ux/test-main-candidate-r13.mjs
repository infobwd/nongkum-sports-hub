// R13: main schedule consumes 237 latest PDF fixtures, shares candidate URLs and shows clear draft provenance.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const latest=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const original=JSON.parse(read("data/draft-schedule.json"));
const index=read("index.html"),results=read("results.html"),review=read("review.html"),sheet=read("forms/score-sheet.html");
const program=read("js/program.js"),form=read("forms/score-sheet.js"),shared=read("js/shared.js");
const share=read("js/review-share.js"),toastScript=read("js/ui-toast.js");
const sorter=read("js/schedule-order.js");
const corrections=read("js/program-corrections.js");
for(const s of [program,form,shared,sorter,share,toastScript,read("js/results.js")])new vm.Script(s);
assert.equal(latest.fixtures.length,237);
assert.equal(original.fixtures.length,236);
assert.equal(latest.fixtures.filter(x=>x.kind==="match").length,187);
assert.equal(latest.fixtures.filter(x=>x.kind==="track_event").length,50);
assert.equal(latest.fixtures.filter(x=>(x.qa_flags||[]).length>0).length,70);
assert.equal(latest.fixtures.filter(x=>x.source_pdf?.source_date_text==="17 พ.ย. 68").length,3);
assert.equal(latest.fixtures.filter(x=>x.planning_date_confirmation==="confirmed"&&x.planning_venue_confirmation==="confirmed"&&x.planning_time_confirmation==="confirmed").length,45);
assert.equal(latest.fixtures.filter(x=>x.planning_venue_confirmation==="confirmed"&&x.planning_venue==="โรงเรียนบ้านหนองกระทุ่ม").length,237);
assert.equal(latest.fixtures.filter(x=>[8,14].includes(x.source_page)&&x.planning_date==="2026-11-16"&&x.planning_time_confirmation==="confirmed").length,21);
assert.ok(latest.fixtures.every(x=>x.date===null&&x.status==="draft"));
assert.ok(latest.fixtures.every(x=>original.fixtures.some(o=>o.id===x.id)||x.id==="football-p07-มัธยมหญิง-020-repeated-final"));
assert.ok(index.includes("มิตรภาพเกมส์")&&review.includes("มิตรภาพเกมส์")&&results.includes("มิตรภาพเกมส์")&&sheet.includes("มิตรภาพเกมส์"));
assert.ok(index.includes('js/review-share.js?v=r14-share1')&&index.includes('js/ui-toast.js?v=r13-main1'));
assert.ok(results.includes('js/ui-toast.js?v=r13-main1'));
assert.ok(index.includes('css/review-share.css?v=r12a1'));
assert.match(program,/program-from-pdf-2569-20261104-draft\.json/);
assert.match(form,/program-from-pdf-2569-20261104-draft\.json/);
assert.match(program,/website_publication_status==="not_released"/);
assert.match(program,/pdfDateLabel/);
assert.match(program,/ปีในสูจิบัตรไม่ตรง/);
assert.match(program,/ควรตรวจเพิ่ม/);
assert.match(program,/shareLatestCandidate/);
assert.match(program,/NongkumToast/);
assert.match(read("js/results.js"),/NongkumToast/);
assert.ok(!program.includes("method:'POST'")&&!program.includes('method:"POST"'));
assert.ok(!form.includes("method:'POST'")&&!form.includes('method:"POST"'));

function el(id){
  return {id,innerHTML:"",textContent:"",value:"",hidden:false,open:false,disabled:false,
   handlers:{},children:[],attrs:{},appendChild(x){this.children.push(x);},
   addEventListener(k,fn){this.handlers[k]=fn;},setAttribute(k,v){this.attrs[k]=v;},
   querySelector(){return null;},querySelectorAll(k){
      if(k!=="button")return [];
      const key=this.id==="sports"?"sport":"level";
      return [...this.innerHTML.matchAll(new RegExp("data-"+key+"='([^']*)'","g"))].map(x=>({
        dataset:{[key]:x[1]},handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},click(){this.handlers.click();}}));
   }};
}
async function mount(query){
 const ids=["school","search","sports","levels","cards","count","empty","more","advancedFilters","activeFiltersHint",
 "resultsLink","refreshProgram","programRefreshStatus","sharedFixture","sharedFixtureCard","sharedFixtureStatus",
 "programOverview","showFullSchedule","programSkeleton","programListing","programLoadFailure","retryProgram",
 "sharedFixtureLoadFailure","retrySharedFixture"];
 const els=Object.fromEntries(ids.map(id=>[id,el(id)]));
 const location=new URL("https://infobwd.github.io/nongkum-sports-hub/index.html"+query),paths=[],messages=[];
 let copied="";
 const ctx=vm.createContext({URL,URLSearchParams,location,history:{replaceState(){}},Date,Intl,console,
 document:{getElementById:id=>els[id]||null,createElement:tag=>el(tag)},
 localStorage:{getItem(){return null;},setItem(){}},
 navigator:{clipboard:{writeText:async value=>{copied=value;}}},
 NongkumToast:{show:(...x)=>{messages.push(x);return true;}},
 fetch:async path=>{paths.push(path);return {ok:true,json:async()=>latest};}});
 new vm.Script(shared).runInContext(ctx);
 new vm.Script(share).runInContext(ctx);
 new vm.Script(sorter).runInContext(ctx);
 new vm.Script(corrections).runInContext(ctx);
 new vm.Script(program).runInContext(ctx);
 for(let n=0;n<25;n++)await Promise.resolve();
 return {els,paths,messages,get copied(){return copied;}};
}
const all=await mount("");
assert.match(all.paths[0],/program-from-pdf-2569-20261104-draft\.json/);
assert.match(all.els.count.textContent,/พบ 236 รายการ/);
assert.match(all.els.cards.innerHTML,/วันพฤหัสบดีที่ 12 พฤศจิกายน 2569/);
assert.match(all.els.cards.innerHTML,/เวลาแข่งขัน/);
assert.match(all.els.cards.innerHTML,/สนามแข่งขัน/);
assert.equal(all.els.programLoadFailure.hidden,true);
const first=latest.fixtures[0];
all.els.cards.handlers.click({target:{closest:()=>({dataset:{shareFixture:first.id}})}});
for(let n=0;n<20;n++)await Promise.resolve();
assert.ok(all.copied.includes("/r/")&&all.copied.includes("มิตรภาพเกมส์"));
assert.ok(all.copied.includes("โปรดตรวจสอบการเปลี่ยนแปลงล่าสุด"));
assert.ok(all.messages.some(x=>x[0].includes("คัดลอก")));
const direct=await mount("?fixture="+encodeURIComponent("football-p07-มัธยมหญิง-007"));
assert.equal(direct.els.sharedFixture.hidden,false);
assert.equal(direct.els.programOverview.hidden,true);
assert.ok(direct.els.sharedFixtureCard.innerHTML.includes("มัธยมหญิง"));
assert.ok(direct.els.sharedFixtureCard.innerHTML.includes("18 พฤศจิกายน"));
const excluded=await mount("?fixture=football-p07-มัธยมหญิง-020-repeated-final");
assert.match(excluded.els.sharedFixtureCard.innerHTML,/ไม่พบคู่แข่งขัน/);
const track=await mount("?sport=athletics");
assert.match(track.els.count.textContent,/พบ 50 รายการ/);
assert.match(track.els.cards.innerHTML,/16 พ\.ย\. 2569/);
console.log("PASS R13: main 237 latest PDF records, dates/times/venues and QA, native short share copy toast, score-sheet source, new Games spelling");
