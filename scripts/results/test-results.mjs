import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const path=(p)=>new URL("../../"+p,import.meta.url);
const read=(p)=>readFileSync(path(p),"utf8");
const source=JSON.parse(read("data/draft-schedule.json"));
const published=JSON.parse(read("data/public-results.json"));
const index=read("index.html"),resultsHtml=read("results.html");
const common=read("js/shared.js"),renderers=read("js/results-renderers.js"),program=read("js/program.js"),client=read("js/results.js");
const apps=read("apps-script/Results.gs");
assert.equal(source.metadata.event_display_name,"มิตรภาพเกม");
assert.equal(published.metadata.event_name,"มิตรภาพเกม");
assert.equal(published.results.length,0);
assert.equal(published.metadata.approved_results_count,0);
assert.equal(published.metadata.publication_status,"empty");
assert.equal(published.metadata.approved_only,true);
assert.equal(published.schools.length,8);
assert.equal(published.sports.length,9);
assert.ok(!JSON.stringify(published).includes("recorded_by"));
assert.ok(index.includes('href="./results.html"')||index.includes('id="resultsLink"'));
assert.ok(resultsHtml.includes("โปรแกรมการแข่งขัน")&&resultsHtml.includes("ผลการแข่งขัน"));
assert.ok(resultsHtml.includes('href="./css/results.css"'));
assert.ok(!index.includes("<style>")&&!index.includes("<script>"));
assert.ok(!resultsHtml.includes("<script>"));
for(const [name,code] of [["shared",common],["renderers",renderers],["program",program],["results",client],["apps",apps]]){
 new vm.Script(code,{filename:name});
}
function element(id){
 return {id,innerHTML:"",textContent:"",value:"",hidden:false,handlers:{},children:[],
  appendChild(x){this.children.push(x);},
  addEventListener(type,fn){this.handlers[type]=fn;},
  querySelectorAll(){
    return [...this.innerHTML.matchAll(/data-sport='([^']*)'/g)].map(m=>{
     const o={dataset:{sport:m[1]},handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},click(){this.handlers.click();}};
     return o;
    });
  }};
}
async function view(payload,query=""){
 const els=Object.fromEntries(["resultSchool","resultLevel","resultSports","resultsList","resultsCount","noResults","publishedAt","programLink","refreshResults","resultsRefreshStatus"].map(id=>[id,element(id)]));
 const location=new URL("https://example.org/nongkum-sports-hub/results.html"+query);
 const history={replaceState(a,b,v){this.url=v;}};
 const local=new Map();
 const ctx=vm.createContext({console,Date,URL,URLSearchParams,location,history,document:{
  getElementById(id){if(!els[id])throw Error("Missing "+id);return els[id];},
  createElement(tag){return element(tag);}
 },localStorage:{getItem:k=>local.get(k)||"",setItem:(k,v)=>local.set(k,v)},
 fetch:async()=>({ok:true,json:async()=>payload})});
 for(const code of [common,renderers,client])new vm.Script(code).runInContext(ctx);
 for(let i=0;i<12;i++)await Promise.resolve();
 return {els,history,ctx};
}
const empty=await view(published,"?school=wangdong&sport=petanque");
assert.equal(empty.els.noResults.hidden,false);
assert.equal(empty.els.resultsCount.textContent,"0 รายการ");
assert.match(empty.els.programLink.href,/school=wangdong/);
const schools=published.schools;
const sample={...published,metadata:{...published.metadata,publication_status:"published",approved_results_count:4,published_at:"2026-11-13T00:00:00Z"},results:[
 {id:"test-score",fixture_id:"fixture-score",sport_id:"football",division:"12 ปี ชาย",result_type:"score",team_a_id:schools[0].id,team_b_id:schools[1].id,score_a:2,score_b:1,winner_school_id:schools[0].id,status:"approved"},
 {id:"test-sets",fixture_id:"fixture-sets",sport_id:"petanque",division:"10 ปี หญิง",result_type:"sets",team_a_id:schools[1].id,team_b_id:schools[2].id,sets:[{a:11,b:6},{a:11,b:7}],winner_school_id:schools[1].id,status:"approved"},
 {id:"test-win",fixture_id:"fixture-win",sport_id:"tugofwar",division:"ปฐมวัย",result_type:"win_loss",team_a_id:schools[3].id,team_b_id:schools[4].id,winner_school_id:schools[3].id,status:"approved"},
 {id:"test-rank",event_id:"athletics-test",sport_id:"athletics",division:"12 ปี หญิง",name:"วิ่งผลัด",result_type:"ranking",rankings:[{rank:1,school_id:schools[5].id,mark:"12.4",unit:"วินาที"}],status:"approved"}
]};
const populated=await view(sample);
assert.equal(populated.els.resultsCount.textContent,"4 รายการ");
assert.equal(populated.els.noResults.hidden,true);
assert.match(populated.els.resultsList.innerHTML,/result-score/);
assert.match(populated.els.resultsList.innerHTML,/เซ็ต 1/);
assert.match(populated.els.resultsList.innerHTML,/ผู้ชนะ/);
assert.match(populated.els.resultsList.innerHTML,/อันดับ 1/);
const filtered=await view(sample,"?sport=petanque");
assert.equal(filtered.els.resultsCount.textContent,"1 รายการ");
const unapproved=structuredClone(sample);
unapproved.results[0].status="review";
const rejected=await view(unapproved);
assert.equal(rejected.els.resultsCount.textContent,"ตรวจข้อมูลไม่ได้");
assert.equal(rejected.els.noResults.hidden,false);
const injection=structuredClone(sample);
injection.results[3].name="<em>sample</em>";
const escaped=await view(injection);
assert.match(escaped.els.resultsList.innerHTML,/&lt;em&gt;sample&lt;\/em&gt;/);
assert.ok(!escaped.els.resultsList.innerHTML.includes("<em>sample</em>"));
console.log("PASS: R1 external assets; R2 empty approved results, 4 sport result renderers, filters, approval gate, safe HTML; R3 Apps Script syntax");
