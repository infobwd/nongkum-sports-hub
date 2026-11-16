#!/usr/bin/env node
/* R39 regression for mobile tables, share titles and privacy-safe optional pictures. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
for(const p of ["js/standings.js","js/results.js","js/results-renderers.js","js/activity-media-r39.js","js/shared.js"])
 new vm.Script(read(p),{filename:p});
const standings=read("js/standings.js");
const css=read("css/standings.css");
const html=read("standings.html");
assert.match(standings,/standings-mobile-rows/);
assert.match(standings,/standings-mobile-details/);
assert.match(standings,/standings-my-school/);
assert.doesNotMatch(standings,/\(official\?snapshot\.rows:g\.rows\)\.filter\(x=>!state\.school/,"keep opponents visible");
assert.match(standings,/timeZone:"Asia\/Bangkok"/);
assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
assert.match(css,/overflow-x:auto/);
assert.match(css,/standings-mobile-details\[open\]/);
assert.match(html,/standings\.js\?v=r39-1/);
const obj={};
new vm.Script(read("js/program-corrections.js")).runInNewContext({globalThis:obj});
new vm.Script(read("js/standings-rosters-r38.js")).runInNewContext({globalThis:obj});
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const rule=JSON.parse(read("data/standings-rules.json"));
const program=obj.NongkumProgramCorrections.apply(raw);
assert.equal(program.fixtures.length,236);
const groups=obj.NongkumPreliminaryStandings.build(program,[],rule);
const football=groups.find(g=>g.sport_id==="football"&&g.division==="12 ปี ชาย");
assert.ok(football);
assert.equal(football.rows.length,6);
assert.ok(football.rows.some(row=>row.team_id==="wangdong"));
assert.ok(groups.every(g=>g.rows.every(row=>row.position==null&&row.played===0)));
// Test one approved photo and strict result ID/sport/division gating, with synthetic data only.
const root={Nongkum:{escapeHtml:x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}};
new vm.Script(read("js/results-renderers.js")).runInNewContext({globalThis:root});
const event=program.fixtures.find(f=>f.id==="athletics-p25-011-m");
const schools=JSON.parse(read("data/public-results.json")).schools;
const sports=JSON.parse(read("data/public-results.json")).sports;
const ranking={id:"synthetic-r39-qa",event_id:event.id,status:"approved",sport_id:"athletics",
 division:event.division,result_type:"ranking",rankings:[{rank:1,school_id:"wangdong"}]};
const map=new Map([[event.id,{sport_id:"athletics",division:event.division,name:event.name}]]);
const media=new Map([[event.id,{sport_id:"athletics",division:event.division,src:"assets/activity-approved/test-approved.webp",caption:"ภาพแข่งขัน"}]]);
const card=root.NongkumResultsRender.card(ranking,schools,sports,map,media);
assert.match(card,/result-activity-photo/);
assert.match(card,/assets\/activity-approved\/test-approved.webp/);
assert.match(card,/40 เมตร/);
assert.doesNotMatch(root.NongkumResultsRender.card({...ranking,division:"12 ปี ชาย"},schools,sports,map,media),/result-activity-photo/);
assert.doesNotMatch(root.NongkumResultsRender.card(ranking,schools,sports,map,new Map()),/result-activity-photo/);
assert.equal(root.NongkumResultsRender.card({...ranking,status:"review"},schools,sports,map,media),"");
const resultsPage=read("results.html");
for(const expected of ["activity-media-r39.js?v=r40-1","results.js?v=r39-1","results-renderers.js?v=r40-1"])
 assert.ok(resultsPage.includes(expected));
console.log("R39 PASS: mobile grouped rosters, Thai publication time and reviewed picture gating");
