// UX-P2.1 regression: render real P1 draft fixtures without a browser dependency.
// Checks search, school-specific athletics, sport/level controls, pagination and draft gate.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const page=readFileSync(new URL("../../index.html",import.meta.url),"utf8");
const shared=readFileSync(new URL("../../js/shared.js",import.meta.url),"utf8");
const program=readFileSync(new URL("../../js/program.js",import.meta.url),"utf8");
const sorter=readFileSync(new URL("../../js/schedule-order.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("../../css/base.css",import.meta.url),"utf8")+"\n"+readFileSync(new URL("../../css/program.css",import.meta.url),"utf8");
const html=page+"\n"+program+"\n"+styles;
const data=JSON.parse(readFileSync(new URL("../../data/draft-schedule.json",import.meta.url),"utf8"));
assert.equal(data.fixtures.length,236);
const proposed=data.fixtures.filter(m=>m.planning_date);
assert.equal(proposed.length,24,"exactly 24 petanque round-1/semi-final matches receive planning dates");
assert.ok(proposed.every(m=>m.sport_id==="petanque"&&/(10|12) ปี (ชาย|หญิง)/.test(m.division)));
assert.ok(proposed.every(m=>["รอบแรก","รองชนะเลิศ"].includes(m.round)));
assert.equal(proposed.filter(m=>m.planning_date==="2026-11-12").length,12);
assert.equal(proposed.filter(m=>m.planning_date==="2026-11-13").length,12);
assert.equal(data.metadata.event_display_name,"มิตรภาพเกม");
assert.ok(proposed.every(m=>m.planning_date_confirmation==="confirmed"));
assert.ok(proposed.every(m=>m.planning_venue==="โรงเรียนบ้านหนองกระทุ่ม"&&m.planning_venue_confirmation==="confirmed"));
assert.ok(proposed.every(m=>m.planning_status==="review"&&!m.time&&!m.field));
assert.equal(proposed.filter(m=>m.qa_flags?.includes("QA-06")).length,2);
assert.ok(proposed.every(m=>m.date===null&&m.status==="draft"&&m.review_status==="draft"),"P1 source date/draft status preserved");
assert.ok(!data.fixtures.some(m=>m.round==="ชิงชนะเลิศ"&&m.planning_date),"finals stay unscheduled");
new vm.Script(shared);
new vm.Script(sorter);
new vm.Script(program);

function mockElement(id){
  return {
    id,innerHTML:"",textContent:"",value:"",hidden:false,children:[],handlers:{},
    appendChild(el){this.children.push(el);},
    addEventListener(ev,fn){this.handlers[ev]=fn;},
    querySelectorAll(selector){
      if(selector!=="button")return [];
      if(this._lastButtonsHTML===this.innerHTML)return this._buttons||[];
      const attr=this.id==="sports"?"sport":"level";
      this._buttons=[...this.innerHTML.matchAll(new RegExp("data-"+attr+"='([^']*)'","g"))].map(x=>{
        const self={dataset:{[attr]:x[1]},handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},click(){this.handlers.click();}};
        return self;
      });
      this._lastButtonsHTML=this.innerHTML;
      return this._buttons;
    }
  };
}
async function mount(url,source=data){
  const ids=["school","search","sports","levels","cards","count","empty","more","advancedFilters","activeFiltersHint","resultsLink","refreshProgram","programRefreshStatus","sharedFixture","sharedFixtureCard","sharedFixtureStatus","programOverview","showFullSchedule"];
  const els=Object.fromEntries(ids.map(id=>[id,mockElement(id)]));
  const location=new URL(url);
  const history={latest:null,replaceState(_a,_b,href){this.latest=href;}};
  const localStore=new Map();
  const ctx=vm.createContext({
    console,URL,URLSearchParams,location,history,
    document:{getElementById(id){if(!els[id])throw Error("Missing "+id);return els[id];},createElement(tag){return mockElement(tag);}},
    localStorage:{getItem:k=>localStore.get(k)||null,setItem:(k,v)=>localStore.set(k,v)},
    fetch:async()=>({ok:true,json:async()=>source})
  });
  new vm.Script(shared).runInContext(ctx);
  new vm.Script(sorter).runInContext(ctx);
  new vm.Script(program).runInContext(ctx);
  for(let i=0;i<8;i++)await Promise.resolve();
  return {els,history,localStore};
}
function getButton(element,type,key){
  const hit=element.querySelectorAll("button").find(b=>b.dataset[type]===key);
  assert.ok(hit,"missing control "+key);
  return hit;
}

const school="wangdong";
const expected=data.fixtures.filter(m=>m.sport_id==="athletics"&&/(?:8|10|12)\s*ปี|ประถม/.test(m.division)&&
    m.lanes?.some(l=>l.school_id===school&&!l.vacant)).length;
assert.ok(expected>0,"expected athletics fixtures for school");
const t=await mount("https://example.org/nongkum-sports-hub/?school=wangdong&sport=athletics&level=primary");
const {els}=t;
assert.match(els.count.textContent,/ข้อมูลร่าง/);
assert.match(els.count.textContent,new RegExp("พบ "+expected+" รายการ"));
assert.equal((els.cards.innerHTML.match(/class='my-lane'/g)||[]).length,Math.min(expected,12),"school should see its own lane first");
assert.match(els.cards.innerHTML,/ดูทุกลู่/);
assert.match(els.cards.innerHTML,/source-details/,"source references should be behind expandable details");
assert.match(els.cards.innerHTML,/รายละเอียด · ข้อมูลร่าง/,"every card must offer details");
assert.ok(els.advancedFilters.open===true,"deep link with level must expand advanced filters");
assert.ok(!els.cards.innerHTML.includes("font-size:48px"));
assert.equal((els.cards.innerHTML.match(/class='schedule-day/g)||[]).length,1,"selected sport should have one unconfirmed-day group");
assert.match(els.cards.innerHTML,/PDF หน้า/);
assert.match(els.cards.innerHTML,/วัน · เวลา · สนาม รอยืนยัน/);
assert.ok(els.cards.innerHTML.includes("กรีฑา"));

const sportAll=await mount("https://example.org/nongkum-sports-hub/");
assert.match(sportAll.els.count.textContent,/พบ 236 รายการ/);
assert.ok(!sportAll.els.advancedFilters.open,"advanced options should start collapsed on ordinary visits");
assert.match(sportAll.els.sports.innerHTML,/chip-count/,"sport navigation must show counts");
const totalSportCounts=data.sports.reduce((o,s)=>(o[s.id]=data.fixtures.filter(f=>f.sport_id===s.id).length,o),{});
assert.equal(totalSportCounts.athletics,50);
assert.match(sportAll.els.sports.innerHTML,/>50<\/span>/,"sports navigation must show 50 athletics events");
assert.match(sportAll.els.cards.innerHTML,/day-count/,"date headers must show visible counts");
assert.match(sportAll.els.cards.innerHTML,/รายละเอียด · ข้อมูลร่าง/);
assert.ok(html.includes("safe-area-inset-top"));
assert.ok(!html.includes("body::before"),"R7 must not create fixed status-bar overlays");
assert.ok(html.includes('id="advancedFilters"'));
assert.match(sportAll.els.count.textContent,/แสดง 12/);
assert.equal(sportAll.els.more.hidden,false);
sportAll.els.more.handlers.click();
assert.match(sportAll.els.count.textContent,/แสดง 24/);
assert.ok(sportAll.els.cards.innerHTML.includes("schedule-day"));

getButton(sportAll.els.levels,"level","secondary").click();
assert.ok(sportAll.els.count.textContent.includes("พบ "),"level change must rerender");
assert.match(sportAll.history.latest,/level=secondary/);
assert.match(sportAll.els.activeFiltersHint.textContent,/มัธยม/,"expanded filter must describe active level");
assert.match(sportAll.els.sports.innerHTML,/chip-count/);
assert.doesNotMatch(sportAll.els.cards.innerHTML,/ก่อนเรียน \(ศูนย์ฯ\)/);
getButton(sportAll.els.sports,"sport","athletics").click();
assert.match(sportAll.history.latest,/sport=athletics/);
assert.doesNotMatch(sportAll.els.cards.innerHTML,/class='sport-name'>⚽/);
sportAll.els.search.value="ไม่มีชื่อนี้แน่นอน";
sportAll.els.search.handlers.input();
assert.match(sportAll.els.activeFiltersHint.textContent,/มีคำค้น/);
assert.match(sportAll.els.sports.innerHTML,/>0<\/span>/,"search should refresh sports navigation counts");
assert.equal(sportAll.els.empty.hidden,false);
assert.equal(sportAll.els.more.hidden,true);
assert.match(sportAll.els.count.textContent,/พบ 0 รายการ/);

const unknown=await mount("https://example.org/nongkum-sports-hub/?school=bad-id&level=unknown");
assert.match(unknown.els.count.textContent,/พบ 236 รายการ/,"unknown filters should not hide data");

const unsafe=structuredClone(data);
unsafe.fixtures[0].source_team_a_label="<em>sample</em>";
unsafe.fixtures[0].team_a_id=null;
const escaped=await mount("https://example.org/nongkum-sports-hub/?sport=football",unsafe);
assert.ok(!escaped.els.cards.innerHTML.includes("<em>sample"));
assert.match(escaped.els.cards.innerHTML,/&lt;em&gt;/,"source labels must be escaped");

const approved=structuredClone(data);
approved.metadata.all_data_approved=true;
const invalid=await mount("https://example.org/nongkum-sports-hub/",approved);
assert.match(invalid.els.count.textContent,/อ่านข้อมูลไม่ได้/,"only draft prototype must render");
assert.equal(invalid.els.empty.hidden,true,"invalid data is a loading error, not no matched fixture");

assert.ok(/@media\(max-width:690px\)/.test(html),"mobile breakpoint missing");
assert.ok(/.fields,.cards\{grid-template-columns:1fr\}/.test(html),"mobile single-column layout missing");
assert.ok(html.includes("สำหรับผู้จัดการแข่งขัน · ข้อมูลตรวจรับ P2"));
assert.ok(html.includes("ข้อมูลร่าง · ยังไม่เป็นทางการ"));
assert.ok(html.includes("ยังไม่ผ่านการรับรอง"));
const petanqueReview=await mount("https://example.org/nongkum-sports-hub/?sport=petanque");
petanqueReview.els.search.value="10 ปี";
petanqueReview.els.search.handlers.input();
assert.match(petanqueReview.els.cards.innerHTML,/แข่งนอกรอบ 12 พ.ย. 2569 · วันยืนยันแล้ว/);
assert.match(petanqueReview.els.cards.innerHTML,/สถานที่ โรงเรียนบ้านหนองกระทุ่ม · ยืนยันแล้ว/);
assert.match(petanqueReview.els.cards.innerHTML,/เวลาแข่งรอแจ้ง/);
assert.match(petanqueReview.els.cards.innerHTML,/วันที่ 4 พฤศจิกายน 2569/);
petanqueReview.els.search.value="12 ปี";
petanqueReview.els.search.handlers.input();
assert.match(petanqueReview.els.cards.innerHTML,/แข่งนอกรอบ 13 พ.ย. 2569 · วันยืนยันแล้ว/);
assert.ok(html.includes("เรียงตามวันที่และเวลาแข่งขัน"));
assert.ok(html.includes("มิตรภาพเกมส์"));
assert.ok(!html.includes("max(var(--safe-top),44px)"),"Safari must not force a fixed 44px mask");
console.log("PASS: UX-P2.1 236 draft records, school-specific athletics, collapsed all lanes, school/sport/level filters, pagination, XSS, mobile layout, draft gate");
