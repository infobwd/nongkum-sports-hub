// UX-P2.1 regression: render real P1 draft fixtures without a browser dependency.
// Checks search, school-specific athletics, sport/level controls, pagination and draft gate.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync(new URL("../../index.html",import.meta.url),"utf8");
const data=JSON.parse(readFileSync(new URL("../../data/draft-schedule.json",import.meta.url),"utf8"));
assert.equal(data.fixtures.length,236);
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,"index.html must contain a script");
new vm.Script(match[1],{filename:"inline-ui.js"});

function mockElement(id){
  return {
    id,innerHTML:"",textContent:"",value:"",hidden:false,children:[],handlers:{},
    appendChild(el){this.children.push(el);},
    addEventListener(ev,fn){this.handlers[ev]=fn;},
    querySelectorAll(selector){
      if(selector!=="button")return [];
      const attr=this.id==="sports"?"sport":"level";
      return [...this.innerHTML.matchAll(new RegExp("data-"+attr+"='([^']*)'","g"))].map(x=>{
        const self={dataset:{[attr]:x[1]},handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},click(){this.handlers.click();}};
        return self;
      });
    }
  };
}
async function mount(url,source=data){
  const ids=["school","search","sports","levels","cards","count","empty","more"];
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
  new vm.Script(match[1],{filename:"inline-ui.js"}).runInContext(ctx);
  for(let i=0;i<8;i++)await Promise.resolve();
  return {els,history,localStore};
}
function getButton(element,type,key){
  const hit=element.querySelectorAll("button").find(b=>b.dataset[type]===key);
  assert.ok(hit,"missing control "+key);
  return hit;
}

const school="wangdong";
const expected=data.fixtures.filter(m=>m.sport_id==="athletics"&&/12\s*ปี/.test(m.division)&&
    m.lanes?.some(l=>l.school_id===school&&!l.vacant)).length;
assert.ok(expected>0,"expected athletics fixtures for school");
const t=await mount("https://example.org/nongkum-sports-hub/?school=wangdong&sport=athletics&level=primary");
const {els}=t;
assert.match(els.count.textContent,/ข้อมูลร่าง/);
assert.match(els.count.textContent,new RegExp("พบ "+expected+" รายการ"));
assert.equal((els.cards.innerHTML.match(/class='my-lane'/g)||[]).length,Math.min(expected,12),"school should see its own lane first");
assert.match(els.cards.innerHTML,/ดูทุกลู่/);
assert.ok(!els.cards.innerHTML.includes("font-size:48px"));
assert.equal((els.cards.innerHTML.match(/class='sport-group'/g)||[]).length,1,"selected sport must be only one group");
assert.match(els.cards.innerHTML,/PDF หน้า/);
assert.match(els.cards.innerHTML,/วัน · เวลา · สนาม รอยืนยัน/);
assert.ok(els.cards.innerHTML.includes("กรีฑา"));

const sportAll=await mount("https://example.org/nongkum-sports-hub/");
assert.match(sportAll.els.count.textContent,/พบ 236 รายการ/);
assert.match(sportAll.els.count.textContent,/แสดง 12/);
assert.equal(sportAll.els.more.hidden,false);
sportAll.els.more.handlers.click();
assert.match(sportAll.els.count.textContent,/แสดง 24/);
assert.ok(sportAll.els.cards.innerHTML.includes("sport-group"));

getButton(sportAll.els.levels,"level","secondary").click();
assert.ok(sportAll.els.count.textContent.includes("พบ "),"level change must rerender");
assert.match(sportAll.history.latest,/level=secondary/);
assert.doesNotMatch(sportAll.els.cards.innerHTML,/ก่อนเรียน \(ศูนย์ฯ\)/);
getButton(sportAll.els.sports,"sport","athletics").click();
assert.match(sportAll.history.latest,/sport=athletics/);
assert.doesNotMatch(sportAll.els.cards.innerHTML,/class='sport-name'>⚽/);
sportAll.els.search.value="ไม่มีชื่อนี้แน่นอน";
sportAll.els.search.handlers.input();
assert.equal(sportAll.els.empty.hidden,false);
assert.equal(sportAll.els.more.hidden,true);
assert.match(sportAll.els.count.textContent,/พบ 0 รายการ/);

const unknown=await mount("https://example.org/nongkum-sports-hub/?school=bad-id&level=unknown");
assert.match(unknown.els.count.textContent,/พบ 236 รายการ/,"unknown filters should not hide data");

const unsafe=structuredClone(data);
unsafe.fixtures[0].source_team_a_label="<script>alert('x')</script>";
unsafe.fixtures[0].team_a_id=null;
const escaped=await mount("https://example.org/nongkum-sports-hub/?sport=football",unsafe);
assert.ok(!escaped.els.cards.innerHTML.includes("<script>alert"));
assert.match(escaped.els.cards.innerHTML,/&lt;script&gt;/,"source labels must be escaped");

const approved=structuredClone(data);
approved.metadata.all_data_approved=true;
const invalid=await mount("https://example.org/nongkum-sports-hub/",approved);
assert.match(invalid.els.count.textContent,/อ่านข้อมูลไม่ได้/,"only draft prototype must render");

assert.ok(/@media\(max-width:690px\)/.test(html),"mobile breakpoint missing");
assert.ok(/.fields,.cards\{grid-template-columns:1fr\}/.test(html),"mobile single-column layout missing");
assert.ok(html.includes("สำหรับผู้จัดการแข่งขัน · ข้อมูลตรวจรับ P2"));
assert.ok(html.includes("ข้อมูลร่าง · ยังไม่เป็นทางการ"));
assert.ok(html.includes("เรียงตามสูจิบัตรต้นฉบับ"));
console.log("PASS: UX-P2.1 236 draft records, school-specific athletics, collapsed all lanes, school/sport/level filters, pagination, XSS, mobile layout, draft gate");
