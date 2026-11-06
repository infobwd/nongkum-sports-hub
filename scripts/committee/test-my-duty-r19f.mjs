// R19-F: public draft-only teacher lookup + fixture date context; no appointment inference.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const html=read("committee.html"),css=read("css/committee.css"),js=read("js/committee.js");
const roster=JSON.parse(read("data/committee-2569-draft-public-review.json"));
const planning=JSON.parse(read("data/committee-roles-2569-planning.json"));
const program=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
for(const id of ["myDuty","myDutySchool","myDutySearch","myDutyHint","myDutyMatches",
  "myDutySelected","myDutyPersonName","myDutyPersonSchool","myDutySummary","myDutyScheduleStatus","myDutyCards"]){
  assert.ok(html.includes('id="'+id+'"'),"missing My Duty "+id);
}
assert.ok(html.indexOf('id="myDuty"')<html.indexOf('id="committeeOverviewTitle"'),"teacher lookup must come before overview");
assert.ok(html.includes('href="./committee-review.html"'),"school review flow preserved");
for(const mode of ["sports","groups","schools","review"])assert.ok(html.includes('data-report-mode="'+mode+'"'));
assert.match(css,/\.my-duty-fields/);
assert.match(css,/min-height:50px/);
new vm.Script(js);

const pure={};
vm.runInNewContext(js,pure);
const h=pure.NongkumCommitteeReport;
assert.ok(h.valid(planning)&&h.validPublicDraft(roster,planning),"source gates unchanged");
assert.equal(h.approvedCount(planning),0,"don't grant committee approval from draft");
const school="wangdong";
const example=roster.entries.filter(x=>x.school_id===school).reduce((m,r)=>{
  m.set(r.name,(m.get(r.name)||0)+1);return m;
},new Map());
const [name,count]=[...example].sort((a,b)=>b[1]-a[1])[0];
assert.ok(count>=2,"real fixture contains multiple-role name");
assert.equal(h.teacherAssignments(roster,school,name).length,count,"all separate role rows remain");
assert.ok(h.teacherMatches(roster,school,name.slice(0,4)).some(x=>x.name===name));
assert.equal(h.teacherAssignments(roster,"saohong",name).some(x=>x.school_id===school),false,"no cross-school joins");
assert.equal(h.sportSchedule(program,"petanque").confirmed.map(x=>x.date).join(","),
  "2026-11-12,2026-11-13,2026-11-16");
assert.equal(h.sportSchedule(program,"petanque").confirmed.reduce((n,x)=>n+x.count,0),38);
assert.equal(h.sportSchedule(program,"football").confirmed.length,0,"PDF dates must not become confirmed");
assert.equal(h.sportSchedule(program,"shootout").confirmed[0].date,"2026-11-16");
assert.equal(h.sportSchedule(program,null),null,"no schedule mapping for general committee");
assert.equal(h.safeIsoDate("2026-02-30"),null);
assert.equal(h.thaiDate("2026-11-16"),"16 พ.ย. 2569");

class El {
  constructor(id=""){this.id=id;this.tag=id;this.hidden=false;this.value="";this._text="";this.children=[];this.handlers={};this.attrs={};this.disabled=false;this.dataset={};}
  set textContent(v){this._text=String(v);this.children=[];}
  get textContent(){return this._text;}
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=[...children];this._text="";}
  addEventListener(name,fn){this.handlers[name]=fn;}
  setAttribute(k,v){this.attrs[k]=v;}
  querySelectorAll(selector){return selector==="[data-report-mode]"?this.children:[];}
  get options(){return this.children.filter(x=>x.tag==="option");}
}
function harness(failSchedule=false){
  const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
  const nodes=Object.fromEntries(ids.map(id=>[id,new El(id)]));
  const document={
    getElementById(id){return nodes[id]||null;},
    createElement(tag){return new El(tag);}
  };
  nodes.committeeViews.children=["sports","groups","schools","review"].map(mode=>{
    const n=new El("button");n.dataset.reportMode=mode;return n;
  });
  nodes.committeeReport.hidden=true;
  const context={document,location:{search:""},URLSearchParams,console,
    fetch:async url=>{
      if(url.includes("committee-roles"))return {ok:true,json:async()=>planning};
      if(url.includes("committee-2569-draft"))return {ok:true,json:async()=>roster};
      if(url.includes("program-from-pdf")){
        if(failSchedule)throw new Error("offline");
        return {ok:true,json:async()=>program};
      }
      throw new Error("unknown fetch "+url);
    }};
  vm.runInNewContext(js,context);
  return nodes;
}
const flush=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};
for(const failSchedule of [false,true]){
  const nodes=harness(failSchedule);
  await flush();
  assert.equal(nodes.committeeReport.hidden,false,"report still loads when schedule "+(failSchedule?"fails":"loads"));
  nodes.myDutySchool.value=school;
  nodes.myDutySchool.handlers.change();
  nodes.myDutySearch.value=name.slice(0,4);
  nodes.myDutySearch.handlers.input();
  const btn=nodes.myDutyMatches.children.find(x=>x.children[0]?.textContent===name);
  assert.ok(btn,"autocomplete shows teacher in selected school");
  btn.handlers.click();
  assert.equal(nodes.myDutySelected.hidden,false);
  assert.equal(nodes.myDutyCards.children.length,count,"UI renders each role row without loss");
  assert.equal(nodes.myDutyPersonName.textContent,name);
  assert.match(nodes.myDutySummary.textContent,/บรรทัดหน้าที่ในร่าง/);
  assert.match(nodes.myDutyScheduleStatus.textContent,failSchedule?/โหลดไม่สำเร็จ/:/วันปฏิบัติหน้าที่ของครูยังรอยืนยัน/);
  nodes.myDutySchool.value="saohong";
  nodes.myDutySchool.handlers.change();
  assert.equal(nodes.myDutySelected.hidden,true,"change school clears selected identity");
}
console.log("PASS R19-F: 250-row draft person lookup, complete duties, confirmed/draft fixtures, safe fallback and existing report");
