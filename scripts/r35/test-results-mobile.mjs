#!/usr/bin/env node
// R35: read-only regression checks for mobile result filtering and score entry.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=(p)=>fs.readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const results=read("js/results.js");
const editor=read("js/r34-card-editor.js");
const nav=read("js/navigation.js");
const page=read("results.html");
const index=read("index.html");
const styles=read("css/results.css");

new vm.Script(results,{filename:"results.js"});
new vm.Script(editor,{filename:"r34-card-editor.js"});
new vm.Script(nav,{filename:"navigation.js"});
assert.match(page,/id="resultAllSports"/);
assert.match(page,/id="resultClearFilters"/);
assert.match(page,/id="resultCountSummary"/);
assert.match(page,/id="noResultsTitle"/);
assert.match(page,/id="resultFilterMore"/);
assert.match(styles,/result-sport-bar/);
assert.match(results,/ผลรับรองทั้งหมด/);
assert.match(results,/ไม่พบผลการแข่งขันตามตัวกรองที่เลือก/);
assert.match(results,/ข้อมูลสำรองยังไม่มีผลการแข่งขัน/);
assert.match(results,/const requested=params.get\("school"\)\|\|""/);
assert.match(results,/timeZone:"Asia\/Bangkok"/);
for(const html of [page,index]){
  assert.match(html,/navigation\.js\?v=r35-1/);
  assert.match(html,/r34-card-editor\.js\?v=r38-1/);
}
assert.match(page,/results\.js\?v=r(?:35|36|38|39|41)-1/);

const stampStart=results.indexOf("  function publicationTime(");
const stampEnd=results.indexOf("  function makeSports(){",stampStart);
assert.ok(stampStart>0&&stampEnd>stampStart);
const time=vm.runInNewContext(results.slice(stampStart,stampEnd)+"\npublicationTime",{Intl,Date});
const thai=time("2026-11-15T17:22:47.051095+00:00");
assert.match(thai,/16/);
assert.match(thai,/2569/);
assert.match(thai,/00:22/);
assert.ok(!thai.includes("2026-11"));
assert.equal(time(null),"");

const helpers=editor.slice(editor.indexOf("  function setRowHtml("),editor.indexOf("  function drawForm(){"));
assert.match(helpers,/data-r34-set-score/);
const fixture={fixture_id:"fixture-1",team_a_id:"wangdong",team_b_id:"saohong",sport_id:"volleyball"};
const state={fixture,approved:new Map([["fixture-1",{sets:[{a:15,b:10},{a:15,b:12}]}]])};
const {setRowHtml,resultTypeControls}=vm.runInNewContext(
  helpers+"\n({setRowHtml,resultTypeControls})",
  {state,school:id=>id,escapeHtml:x=>String(x),schoolsOptions:()=>""}
);
assert.match(setRowHtml({a:15,b:10},0),/value='15'/);
assert.match(setRowHtml({a:15,b:10},0),/value='10'/);
const saved=resultTypeControls("sets");
assert.equal((saved.match(/data-r34-set-row/g)||[]).length,2);
assert.ok(!saved.includes("<textarea"));
assert.match(saved,/id='r34AddSet'/);
state.approved.clear();
assert.equal((resultTypeControls("sets").match(/data-r34-set-row/g)||[]).length,1);
const expression=editor.match(/const defaultType=([^;]+);/);
assert.ok(expression,"per-sport default must remain explicit");
const choose=vm.runInNewContext("(f,current,rank)=>"+expression[1]);
assert.equal(choose({sport_id:"volleyball"},null,false),"sets");
assert.equal(choose({sport_id:"takraw"},null,false),"sets");
assert.equal(choose({sport_id:"football"},null,false),"score");
assert.equal(choose({sport_id:"petanque"},null,false),"win_loss");
assert.equal(choose({sport_id:"athletics"},null,true),"ranking");
assert.equal(choose({sport_id:"petanque"},{result_type:"win_loss"},false),"win_loss");
assert.match(editor,/state\.sports\.find/);
assert.match(editor,/rows\.length>=7/);
assert.match(editor,/p\.sets=scores\.map/);

// Execute actual navigation module with two native anchors. Schedule->results must
// not transfer sport=football; explicitly opened results URLs still keep filters.
function runNav(view,search){
  const links=[{dataset:{navView:"program"}},{dataset:{navView:"results"}}].map(x=>({
    ...x,classList:{add(){},remove(){}},addEventListener(){},href:""
  }));
  const context={URLSearchParams,location:{search},document:{
    body:{dataset:{view}},querySelectorAll(){return links;},getElementById(){return null;},
    documentElement:{style:{setProperty(){}}}
  },Nongkum:{
    schoolInStore(){return "wangdong";},
    href(file,filters){const p=new URLSearchParams();for(const k of ["school","sport","level"])if(filters[k])p.set(k,filters[k]);return "./"+file+(p.size?"?"+p:"");}
  }};
  vm.runInNewContext(nav,context);
  return links;
}
const a=runNav("program","?sport=football&school=wangdong");
assert.equal(a[1].href,"./results.html","tabs from program show all approved results");
assert.match(a[0].href,/sport=football/);
const b=runNav("results","?sport=petanque");
assert.match(b[1].href,/sport=petanque/,"direct result filters continue to work");

console.log("R35 navigation, result timestamps, filter contracts and set scoring passed");
