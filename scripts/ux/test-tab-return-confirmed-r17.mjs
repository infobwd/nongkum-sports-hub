// R17: navigation round-trip, explicit scroll restoration, confirmed 12/13 Nov schedule.
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const latest=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const legacy=JSON.parse(read("data/draft-schedule.json"));
const confirmed=latest.fixtures.filter(f=>["2026-11-12","2026-11-13"].includes(f.planning_date));
assert.equal(latest.fixtures.length,237);
assert.equal(confirmed.length,24);
assert.equal(confirmed.filter(f=>f.planning_date==="2026-11-12").length,12);
assert.equal(confirmed.filter(f=>f.planning_date==="2026-11-13").length,12);
assert.ok(confirmed.every(f=>f.sport_id==="petanque"&&f.planning_date_confirmation==="confirmed"));
assert.ok(confirmed.every(f=>f.planning_venue==="โรงเรียนบ้านหนองกระทุ่ม"&&f.planning_venue_confirmation==="confirmed"));
assert.ok(confirmed.every(f=>f.planning_time_confirmation==="confirmed"&&f.planning_time===f.source_pdf.source_time));
assert.ok(confirmed.every(f=>["09:00","10:00","13:00"].includes(f.planning_time)));
assert.ok(confirmed.every(f=>f.status==="draft"&&f.review_status==="draft"&&f.planning_status==="review"));
assert.ok(confirmed.every(f=>f.planning_time_source.includes("5 พ.ย. 2569")));
assert.ok(confirmed.some(f=>f.qa_flags.includes("QA-06")),"retain unresolved PDF/fixture-map QA");
assert.equal(latest.fixtures.filter(f=>f.qa_flags?.length).length,70);
assert.equal(latest.fixtures.filter(f=>f.source_pdf?.source_date_text==="17 พ.ย. 68").length,3);
assert.ok(latest.fixtures.filter(f=>!confirmed.some(c=>c.id===f.id)).every(f=>f.planning_time_confirmation!=="confirmed"));
assert.equal(legacy.fixtures.length,236,"historical draft remains untouched");
assert.equal(latest.metadata.all_data_approved,false);
assert.equal(latest.metadata.website_publication_status,"not_released");
assert.equal(JSON.parse(read("data/public-results.json")).results.length,0);

const shared=read("js/shared.js"),navigation=read("js/navigation.js");
const order=read("js/schedule-order.js"),program=read("js/program.js");
for(const [name,source] of [["shared",shared],["navigation",navigation],["order",order],["program",program]]){
  new vm.Script(source,{filename:name});
}
function link(target){
  return {dataset:{navView:target},href:"",events:{},
    classList:{add(){},remove(){}},
    addEventListener(type,fn){this.events[type]=fn;}};
}
function element(id){
  return {id,value:"",innerHTML:"",textContent:"",hidden:false,children:[],events:{},
    appendChild(child){this.children.push(child);},
    addEventListener(type,fn){this.events[type]=fn;},
    querySelectorAll(){return [];},
    setAttribute(){},
    scrollIntoView(){}};
}
function harness(url,view,source=latest){
  const location=new URL(url);
  const filters=new Map();
  const ids=["school","search","sports","levels","cards","count","empty","more","advancedFilters",
    "activeFiltersHint","resultsLink","refreshProgram","programRefreshStatus","sharedFixture",
    "sharedFixtureCard","sharedFixtureStatus","programOverview","showFullSchedule","programSkeleton",
    "programListing","programLoadFailure","retryProgram","sharedFixtureLoadFailure",
    "retrySharedFixture","resultNote","navigationNotice","mobileTabNav"];
  const elements=Object.fromEntries(ids.map(id=>[id,element(id)]));
  const links=[link("program"),link("results")];
  const scrollCalls=[];
  elements.programListing.scrollIntoView=opts=>scrollCalls.push(opts);
  const history={last:"",replaceState(_a,_b,href){this.last=href;}};
  const window={events:{},addEventListener(type,fn){this.events[type]=fn;},scrollTo(){}};
  const frameCallbacks=[];
  const ctx=vm.createContext({
    console,URL,URLSearchParams,location,history,window,
    requestAnimationFrame:fn=>{frameCallbacks.push(fn);},
    localStorage:{getItem:key=>filters.get(key)||"",setItem:(key,val)=>filters.set(key,val)},
    document:{body:{dataset:{view}},documentElement:{style:{setProperty(){}}},
      querySelectorAll(selector){assert.equal(selector,"[data-nav-view]");return links;},
      getElementById(id){return elements[id]||null;},
      createElement(tag){return element(tag);}},
    fetch:async()=>({ok:true,json:async()=>source})
  });
  new vm.Script(shared).runInContext(ctx);
  new vm.Script(navigation).runInContext(ctx);
  if(view==="program"){
    new vm.Script(order).runInContext(ctx);
    new vm.Script(program).runInContext(ctx);
  }
  return {location,links,elements,scrollCalls,history,frameCallbacks};
}
const fromResults=harness("https://example.org/results.html?school=nongkrathum&sport=petanque&level=primary","results");
const href=fromResults.links[0].href;
assert.match(href,/^\.\//);
const parsed=new URL(href,"https://example.org/");
assert.equal(parsed.pathname,"/index.html");
assert.equal(parsed.searchParams.get("school"),"nongkrathum");
assert.equal(parsed.searchParams.get("sport"),"petanque");
assert.equal(parsed.searchParams.get("level"),"primary");
assert.equal(parsed.searchParams.get("from"),"results");
assert.equal(parsed.hash,"#programListing");
const directProgram=harness("https://example.org/index.html?school=nongkrathum&sport=petanque","program");
assert.ok(!directProgram.links[0].href.includes("from=results"));
const returned=harness("https://example.org/index.html?sport=petanque&from=results#programListing","program");
for(let i=0;i<12;i++)await Promise.resolve();
assert.match(returned.elements.cards.innerHTML,/วันพฤหัสบดีที่ 12 พฤศจิกายน 2569/);
assert.match(returned.elements.cards.innerHTML,/รายละเอียด · กำหนดแข่งขันยืนยันแล้ว/);
assert.match(returned.elements.cards.innerHTML,/ข้อสังเกตจาก PDF/);
assert.match(returned.elements.cards.innerHTML,/fixture-meta-time verified/);
assert.match(returned.elements.count.textContent,/แสดง 12/);
assert.match(returned.elements.resultNote.textContent,/ตัวกรองที่ใช้: กีฬา เปตอง/);
assert.equal(returned.scrollCalls.length,1,"tab return scrolls after rendered data");
assert.equal(returned.frameCallbacks.length,1,"repeat after layout update");
returned.frameCallbacks[0]();
assert.equal(returned.scrollCalls.length,2);
assert.equal(returned.history.last,"/index.html?sport=petanque#programListing","remove one-time marker, preserve filter and anchor");
assert.equal(directProgram.scrollCalls.length,0,"ordinary visit does not force scroll");
const sorterContext=vm.createContext({Date,Math,Number,Map});
new vm.Script(order).runInContext(sorterContext);
const fixtures=[
 {id:"fallback",sport_id:"petanque",division:"10 ปี ชาย",source_match_no:1,source_pdf:{source_date_text:"12 พ.ย. 69",source_date_iso:"2026-11-12",source_time:"08:00"}},
 {id:"override",sport_id:"petanque",division:"10 ปี ชาย",source_match_no:2,planning_date_confirmation:"confirmed",planning_date:"2026-11-12",
  planning_time_confirmation:"confirmed",planning_time:"07:30",source_pdf:{source_date_text:"12 พ.ย. 69",source_date_iso:"2026-11-12",source_time:"13:00"}}
];
assert.equal(sorterContext.NongkumScheduleOrder.sortedFixtures(fixtures,latest.sports)[0].id,"override");
const page=read("index.html"),resultsPage=read("results.html");
assert.match(page,/js\/navigation\.js\?v=r17-tab1/);
assert.match(resultsPage,/js\/navigation\.js\?v=r17-tab1/);
assert.match(page,/js\/schedule-order\.js\?v=r17-sort1/);
assert.match(page,/js\/program\.js\?v=r17-tab1/);
assert.match(program,/from"\)==="results"/);
assert.match(program,/restoreTabListingAfterLoad\(\)/);
assert.match(program,/data\/program-from-pdf-2569-20261104-draft\.json/);
assert.match(program,/pdf-viewer\.html\?page=/);
console.log("R17 PASS: navigation round-trip, Safari scroll reset, chronological filter and 24 confirmed 12/13 Nov fixtures with PDF QA preserved");
