// R18: Bangkok day selection, all-day browsing, confirmation-aware public copy and old links.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const corrections=read("js/program-corrections.js");
const correctionContext=vm.createContext({});
new vm.Script(corrections).runInContext(correctionContext);
const latest=correctionContext.NongkumProgramCorrections.apply(raw);
const sorter=read("js/schedule-order.js");
const ctx=vm.createContext({Intl,Date,Map,Number,Math});
new vm.Script(sorter).runInContext(ctx);
const order=ctx.NongkumScheduleOrder;
const sorted=order.sortedFixtures(latest.fixtures,latest.sports);
assert.equal(sorted.length,236);
assert.equal(order.bangkokToday(new Date("2026-11-11T16:59:00Z")),"2026-11-11");
assert.equal(order.bangkokToday(new Date("2026-11-11T17:00:00Z")),"2026-11-12");
assert.equal(order.bangkokToday(new Date("2026-11-12T18:30:00Z")),"2026-11-13");
const first=order.nearestDay(sorted,"2026-11-05");
assert.equal(first.kind,"next");
assert.equal(first.day,"2026-11-12");
assert.equal(first.fixtures.length,12);
const onDay=order.nearestDay(sorted,"2026-11-12");
assert.equal(onDay.kind,"today");
assert.equal(onDay.fixtures.length,12,"today keeps whole day, even if morning ended");
assert.equal(order.nearestDay(sorted,"2026-11-13").day,"2026-11-13");
assert.equal(order.nearestDay(sorted,"2026-11-14").day,"2026-11-16");
assert.equal(order.nearestDay(sorted,"2026-11-21").kind,"all-fallback");
assert.equal(order.nearestDay(sorted,"2026-11-21").fixtures.length,236);
assert.equal(order.nearestDay([], "2026-11-05").fixtures.length,0);
assert.equal(sorted.slice(-3).filter(f=>!order.effectiveDay(f)).length,3,"source-year anomalies remain at end");
assert.ok(first.fixtures.every(f=>f.planning_date_confirmation==="confirmed"&&f.planning_time_confirmation==="confirmed"));
assert.equal(latest.fixtures.filter(f=>f.status==="approved").length,0);
assert.equal(JSON.parse(read("data/public-results.json")).results.length,0);

const html=read("index.html"),program=read("js/program.js"),css=read("css/program.css");
const shared=read("js/shared.js");
for(const [name,src] of [["shared",shared],["order",sorter],["program",program]])
  new vm.Script(src,{filename:name});
assert.match(html,/data-day-mode="upcoming"/);
assert.match(html,/data-day-mode="all"/);
assert.match(css,/min-height:48px/);
assert.ok(!html.includes("ข้อมูลร่าง"),"public schedule must not be globally marked draft");
assert.ok(!program.includes("รายละเอียด · ข้อมูลร่าง"));
assert.match(html,/program\.js\?v=r19-venue1/);
assert.match(html,/schedule-order\.js\?v=r18-date1/);

function element(id){
 return {id,innerHTML:"",textContent:"",value:"",hidden:false,children:[],handlers:{},
  appendChild(x){this.children.push(x);},
  addEventListener(k,fn){this.handlers[k]=fn;},
  querySelectorAll(){return [];},
  setAttribute(){}};
}
const storage=new Map();
class Clock extends Date {
 constructor(...args){super(...(args.length?args:["2026-11-05T02:00:00Z"]));}
 static now(){return new Date("2026-11-05T02:00:00Z").valueOf();}
}
async function mount(url,dateClass=Clock){
 const ids=["school","search","sports","levels","cards","count","empty","more","advancedFilters",
  "activeFiltersHint","resultsLink","refreshProgram","programRefreshStatus","sharedFixture",
  "sharedFixtureCard","sharedFixtureStatus","programOverview","showFullSchedule","scheduleDaySwitch",
  "scheduleDayHint","scheduleVerificationSummary","resultNote","programListing"];
 const els=Object.fromEntries(ids.map(id=>[id,element(id)]));
 const history={latest:"",replaceState(_a,_b,u){this.latest=u;}};
 els.programListing.scrollIntoView=()=>{};
 const location=new URL(url);
 const context=vm.createContext({Date:dateClass,Intl,console,URL,URLSearchParams,location,history,
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  document:{getElementById:id=>els[id]||null,createElement:tag=>element(tag)},
  localStorage:{getItem:()=>null,setItem(){}},
  fetch:async()=>({ok:true,json:async()=>latest})});
 new vm.Script(shared).runInContext(context);
 new vm.Script(sorter).runInContext(context);
 new vm.Script(corrections).runInContext(context);
 new vm.Script(program).runInContext(context);
 for(let i=0;i<16;i++)await Promise.resolve();
 return {els,history,context};
}
const day=await mount("https://example.org/index.html");
assert.match(day.els.scheduleDayHint.textContent,/วันแข่งขันถัดไป.*12 พฤศจิกายน 2569/);
assert.match(day.els.count.textContent,/พบ 236 รายการ · แสดง 12/);
assert.equal(day.els.more.hidden,true,"next day has exactly twelve confirmed matches");
assert.match(day.els.cards.innerHTML,/ยืนยันวัน เวลา และสถานที่แข่งขันแล้ว/);
assert.doesNotMatch(day.els.cards.innerHTML,/ควรตรวจเพิ่ม|ข้อสังเกตจาก PDF|ข้อมูลร่าง/);
assert.match(day.els.cards.innerHTML,/รายละเอียดการแข่งขัน/);
assert.match(day.els.scheduleVerificationSummary.textContent,/สถานที่แข่งขันทุกกีฬา: โรงเรียนบ้านหนองกระทุ่ม.*45 รายการ.*191 รายการ/);
assert.match(day.els.cards.innerHTML,/โรงเรียนบ้านหนองกระทุ่ม/);
assert.match(day.els.cards.innerHTML,/สนาม [1-4]/);
assert.ok(latest.fixtures.filter(x=>x.planning_time_confirmation==="confirmed").some(x=>x.qa_flags?.length),
 "QA metadata retained even though warnings are not shown to public");
const modeEvent=mode=>({target:{closest:()=>({dataset:{dayMode:mode}})}});
day.els.scheduleDaySwitch.handlers.click(modeEvent("all"));
assert.match(day.els.scheduleDayHint.textContent,/แสดงครบทุกวันที่/);
assert.equal(day.els.more.hidden,false);
assert.match(day.els.count.textContent,/แสดง 12/);
day.els.more.handlers.click();
assert.match(day.els.count.textContent,/แสดง 24/);
assert.match(day.els.cards.innerHTML,/13 พฤศจิกายน 2569/);
assert.equal(storage.get("nongkum-program-day-mode"),"all");
const returned=await mount("https://example.org/index.html?from=results#programListing");
assert.match(returned.els.scheduleDayHint.textContent,/แสดงครบทุกวันที่/,"selected all-days mode persists across tabs");
returned.els.scheduleDaySwitch.handlers.click(modeEvent("upcoming"));
assert.match(returned.els.scheduleDayHint.textContent,/วันแข่งขันถัดไป/);
assert.equal(storage.get("nongkum-program-day-mode"),"upcoming");
const outOfSeason=await mount("https://example.org/index.html",class extends Date{
 constructor(...args){super(...(args.length?args:["2026-11-25T02:00:00Z"]));}
});
assert.match(outOfSeason.els.scheduleDayHint.textContent,/แสดงรายการทุกวัน รวมรายการย้อนหลัง/);
assert.equal(outOfSeason.els.more.hidden,false);
const onlyPast=await mount("https://example.org/index.html?sport=football",class extends Date{
 constructor(...args){super(...(args.length?args:["2026-11-25T02:00:00Z"]));}
});
assert.match(onlyPast.els.count.textContent,/พบ 21 รายการ/);
console.log("R18 PASS: Bangkok midnight, today/next/fallback, 24 confirmed without public warnings, 236 browseable, day-toggle return");
