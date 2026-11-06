// R18-B: selected-day calendar strip, grouped totals, unknown dates and session-only return.
// Synthetic DOM harness, NOT an iPhone/LINE device acceptance claim.
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const data=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const html=read("index.html"),css=read("css/program.css");
const shared=read("js/shared.js"),sorter=read("js/schedule-order.js"),program=read("js/program.js");
assert.equal(data.fixtures.length,237);
for(const source of [shared,sorter,program])new vm.Script(source);
assert.match(html,/data-day-mode="date"/);
assert.match(html,/id="scheduleDatePicker"/);
assert.match(html,/id="scheduleDateOptions"/);
assert.match(css,/\.schedule-date-options\{display:flex/);
assert.match(css,/\.schedule-date-chip\[aria-pressed="true"\]/);
assert.match(html,/js\/program\.js\?v=r19-venue1-r18b/);
const storage=new Map();
const element=id=>({id,value:"",innerHTML:"",textContent:"",hidden:false,children:[],handlers:{},
  appendChild(child){this.children.push(child);},
  addEventListener(type,fn){this.handlers[type]=fn;},
  querySelectorAll(){return [];},
  setAttribute(){},scrollIntoView(){}});
class TestDate extends Date {
  constructor(...args){super(...(args.length?args:["2026-11-06T02:00:00Z"]));}
  static now(){return Date.parse("2026-11-06T02:00:00Z");}
}
async function mount(url){
  const names=["school","search","sports","levels","cards","count","empty","more","advancedFilters",
    "activeFiltersHint","resultsLink","refreshProgram","programRefreshStatus","sharedFixture",
    "sharedFixtureCard","sharedFixtureStatus","programOverview","showFullSchedule","programSkeleton",
    "programListing","programLoadFailure","retryProgram","sharedFixtureLoadFailure","retrySharedFixture",
    "resultNote","scheduleDaySwitch","scheduleDayHint","scheduleDatePicker","scheduleDateOptions",
    "scheduleVerificationSummary"];
  const els=Object.fromEntries(names.map(id=>[id,element(id)]));
  const location=new URL(url);
  const history={last:"",replaceState(_state,_title,href){this.last=href;}};
  const context=vm.createContext({
    Date:TestDate,Intl,console,URL,URLSearchParams,location,history,
    sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    localStorage:{getItem:()=>null,setItem(){}},
    document:{getElementById:id=>els[id]||null,createElement:tag=>element(tag)},
    fetch:async()=>({ok:true,json:async()=>data})
  });
  for(const source of [shared,sorter,program])new vm.Script(source).runInContext(context);
  for(let i=0;i<20;i++)await Promise.resolve();
  return els;
}
const mode=mode=>({target:{closest:()=>({dataset:{dayMode:mode}})}});
const day=key=>({target:{closest:()=>({dataset:{selectedDay:key}})}});
const els=await mount("https://example.test/index.html");
assert.equal(els.scheduleDatePicker.hidden,true,"fresh visit defaults to upcoming mode");
assert.match(els.scheduleDayHint.textContent,/วันแข่งขันถัดไป.*12 พฤศจิกายน/);
els.scheduleDaySwitch.handlers.click(mode("date"));
assert.equal(els.scheduleDatePicker.hidden,false);
for(const [iso,count] of [["2026-11-12",12],["2026-11-13",12],["2026-11-16",73],
 ["2026-11-17",38],["2026-11-18",33],["2026-11-19",37],["2026-11-20",29]])
  assert.match(els.scheduleDateOptions.innerHTML,new RegExp(iso+"[\\s\\S]*?"+count+" รายการ"));
assert.match(els.scheduleDateOptions.innerHTML,/data-selected-day='unknown'/);
assert.match(els.scheduleDateOptions.innerHTML,/รอยืนยันวัน/);
assert.match(els.count.textContent,/พบ 12 รายการ · แสดง 12/);
els.scheduleDateOptions.handlers.click(day("2026-11-16"));
assert.match(els.scheduleDayHint.textContent,/16 พฤศจิกายน 2569 · 73 รายการ/);
assert.match(els.count.textContent,/พบ 73 รายการ · แสดง 12/);
assert.match(els.cards.innerHTML,/แสดง 12 จาก 73 รายการ/);
assert.equal(els.more.hidden,false);
els.more.handlers.click();
assert.match(els.count.textContent,/แสดง 24/);
assert.match(els.cards.innerHTML,/แสดง 24 จาก 73 รายการ/);
assert.equal(storage.get("nongkum-program-day-mode"),"date");
assert.equal(storage.get("nongkum-program-selected-day"),"2026-11-16");
const returned=await mount("https://example.test/index.html?from=results#programListing");
assert.equal(returned.scheduleDatePicker.hidden,false);
assert.match(returned.scheduleDayHint.textContent,/16 พฤศจิกายน 2569 · 73 รายการ/);
assert.match(returned.cards.innerHTML,/แสดง 12 จาก 73 รายการ/);
const fresh=await mount("https://example.test/index.html");
assert.equal(fresh.scheduleDatePicker.hidden,true,"new entry ignores stored date and mode");
assert.match(fresh.scheduleDayHint.textContent,/วันแข่งขันถัดไป/);
returned.scheduleDateOptions.handlers.click(day("unknown"));
assert.match(returned.scheduleDayHint.textContent,/รอยืนยันวันแข่งขัน · 3 รายการ/);
assert.match(returned.count.textContent,/พบ 3 รายการ · แสดง 3/);
assert.match(returned.cards.innerHTML,/รอยืนยันวันแข่งขัน/);
assert.doesNotMatch(returned.cards.innerHTML,/วันจันทร์ที่ 17 พฤศจิกายน 2569/);
returned.scheduleDaySwitch.handlers.click(mode("all"));
assert.equal(returned.scheduleDatePicker.hidden,true);
assert.match(returned.count.textContent,/พบ 237 รายการ/);
assert.equal(returned.more.hidden,false);
assert.equal(JSON.parse(read("data/public-results.json")).results.length,0);
console.log("R18-B PASS: 7 real days + 3 unknown, date chips, 73-item pagination counts, return-state, fresh-default and approved-only.");
