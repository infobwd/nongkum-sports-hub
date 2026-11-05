// R16: deterministic chronology / source-data safety / mobile-bottom regression.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const data=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const source=read("js/schedule-order.js");
const context=vm.createContext({Date,Math,Number,Map});
new vm.Script(source,{filename:"js/schedule-order.js"}).runInContext(context);
const order=context.NongkumScheduleOrder;
assert.ok(order);
const before=JSON.stringify(data.fixtures);
const sorted=order.sortedFixtures(data.fixtures,data.sports);
assert.equal(sorted.length,237);
assert.equal(JSON.stringify(data.fixtures),before,"sorting must not mutate original fixture JSON");
assert.equal(new Set(sorted.map(x=>x.id)).size,237,"all original IDs retained once");
assert.equal(JSON.stringify(sorted.map(x=>x.id).sort()),JSON.stringify(data.fixtures.map(x=>x.id).sort()));
const known=sorted.filter(x=>order.effectiveDay(x));
const unknown=sorted.filter(x=>!order.effectiveDay(x));
assert.equal(known.length,234);
assert.equal(unknown.length,3,"three anomalous 2568 rows require manual confirmation");
assert.ok(unknown.every(x=>x.source_pdf.source_date_text==="17 พ.ย. 68"));
assert.ok(known.every(x=>x.source_pdf.source_date_text!=="17 พ.ย. 68"));
const days=known.map(x=>order.effectiveDay(x));
assert.equal(days[0],"2026-11-12");
assert.equal(days.at(-1),"2026-11-20");
for(let i=1;i<known.length;i++){
  const p=known[i-1],n=known[i];
  const pDay=order.effectiveDay(p),nDay=order.effectiveDay(n);
  assert.ok(pDay<=nDay,"all sports must be sorted by date");
  if(pDay===nDay)
    assert.ok(order.timeMinutes(p)<=order.timeMinutes(n),"same-date fixtures must be sorted by time");
}
const groups=order.groupVisible(sorted);
assert.equal(groups.length,8,"seven known dates plus unconfirmed-day group");
assert.equal(groups.at(-1).day,"");
assert.equal(groups.at(-1).fixtures.length,3);
assert.equal(groups.at(-1).label,"รอยืนยันวันแข่งขัน");
assert.equal(groups.map(x=>x.fixtures.length).reduce((a,b)=>a+b,0),237);
assert.match(groups.find(x=>x.day==="2026-11-18").label,/วันพุธที่ 18 พฤศจิกายน 2569/);
const first12=sorted.slice(0,12),first24=sorted.slice(0,24);
assert.equal(JSON.stringify(first24.slice(0,12).map(x=>x.id)),JSON.stringify(first12.map(x=>x.id)),
  "load-more must extend the same sequence, not reorder a sport group");
assert.equal(order.groupVisible(first24).flatMap(x=>x.fixtures).map(x=>x.id).join("|"),
  first24.map(x=>x.id).join("|"));
const synthetic=(id,date,time,extra={})=>({
  id,sport_id:"football",division:"12 ปี ชาย",source_match_no:1,
  source_pdf:{source_date_iso:date,source_date_text:"18 พ.ย. 69",source_time:time},...extra
});
const tie=order.sortedFixtures([
  synthetic("late","2026-11-18","13:00"),
  synthetic("no-time","2026-11-18",""),
  synthetic("early","2026-11-18","08:30")
],data.sports);
assert.equal(tie.map(x=>x.id).join(","),"early,late,no-time");
const anomaly=synthetic("anomaly","2025-11-17","08:30",{
  source_pdf:{source_date_iso:"2025-11-17",source_date_text:"17 พ.ย. 68",source_time:"08:30"}
});
assert.equal(order.effectiveDay(anomaly),"");
assert.equal(order.effectiveDay({...anomaly,planning_date:"2026-11-17",planning_date_confirmation:"confirmed"}),"2026-11-17");
assert.equal(order.effectiveDay({...anomaly,planning_date:"2026-11-17",planning_date_confirmation:"pending"}),"");
assert.equal(order.effectiveDay(synthetic("bad","2026-02-30","10:00")),"");
const program=read("js/program.js"),page=read("index.html"),css=read("css/program.css");
const base=read("css/base.css"),nav=read("js/navigation.js");
for(const [name,body] of [["program",program],["navigation",nav]])
  new vm.Script(body,{filename:name});
assert.ok(page.indexOf('js/schedule-order.js?v=r18-date1')<page.indexOf('js/program.js?v=r18-date1'));
assert.match(page,/เรียงตามวันที่และเวลาแข่งขัน/);
assert.match(program,/NongkumScheduleOrder\.sortedFixtures\(matched,state\.data\.sports\)/);
assert.match(program,/ordered\.slice\(0,state\.limit\)/);
assert.match(program,/NongkumScheduleOrder\.groupVisible\(visible\)/);
assert.match(program,/schedule-day/);
assert.match(program,/class='sport-name'/);
assert.match(css,/\.day-heading/);
assert.match(css,/\.schedule-day\.awaiting-date/);
assert.match(base,/--mobile-nav-occupied/);
assert.match(base,/body\{padding-bottom:calc\(var\(--mobile-nav-occupied\) \+ 16px\)\}/);
assert.match(nav,/ResizeObserver\(syncMobileNavSpace\)/);
assert.ok(!nav.includes('addEventListener("scroll"'));
assert.match(program,/pdf-viewer\.html\?page=/);
assert.match(program,/shareLatestCandidate/);
assert.match(program,/state\.limit\+=12/);
assert.equal(JSON.parse(read("data/public-results.json")).results.length,0);
console.log("R16 PASS: 237 fixtures sorted, 7 date headings, 3 date anomalies isolated, stable pagination and bottom safe-area contracts");
