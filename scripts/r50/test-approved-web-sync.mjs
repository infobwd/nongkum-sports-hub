#!/usr/bin/env node
/* R50-WEB regression: never turn a participant confirmation into a schedule confirmation. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=(p)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const record=JSON.parse(read("data/r50/approved_pair_sync_20261118.json"));
const context=vm.createContext({URL,URLSearchParams,console});
for(const path of [
  "js/program-corrections.js",
  "js/program-approved-pairs-r50.js",
  "js/schedule-order.js",
  "js/schedule-link-codec.js",
  "js/schedule-bulk-share.js"
]){
  vm.runInContext(read(path),context,{filename:path});
}
const original=context.NongkumProgramCorrections.apply(raw);
const updated=context.NongkumApprovedPairsR50.apply(original);
const fixtures=updated.fixtures;
const byId=new Map(fixtures.map(f=>[f.id,f]));
assert.equal(fixtures.length,236,"R33 must still have 236 program items");
assert.equal(fixtures.filter(f=>f.kind==="match").length,186);
assert.equal(fixtures.filter(f=>f.kind==="track_event").length,50);
assert.equal(record.updates.length,12);
assert.equal(updated.metadata.r50_approved_pair_count,12);
assert.equal(updated.metadata.r50_approved_pair_source_key,record.source_key);
assert.equal(updated.metadata.all_data_approved,false,"No global approval promotion");
assert.equal(original.fixtures.filter(f=>f.pair_confirmation).length,0,"Original is untouched");

const originalById=new Map(original.fixtures.map(f=>[f.id,f]));
const updates=new Set(record.updates.map(u=>u.fixture_id));
assert.equal(updates.size,12,"No duplicate target match");
assert.deepEqual(
  [...new Set(record.updates.map(u=>u.sport))].sort(),
  ["futsal","petanque","tabletennis","volleyball"]
);
for(const item of record.updates){
  const before=originalById.get(item.fixture_id),after=byId.get(item.fixture_id);
  assert.ok(before&&after,item.fixture_id+" exists");
  assert.equal(after.sport_id,item.sport);
  assert.equal(after.division,item.division);
  assert.equal(String(after.source_match_no),item.match_no);
  assert.equal(before.team_a_id,null);
  assert.equal(before.team_b_id,null);
  assert.equal(after.team_a_id,item.team_a);
  assert.equal(after.team_b_id,item.team_b);
  assert.equal(after.pair_confirmation,"approved_results");
  assert.equal(after.pair_confirmation_source_key,record.source_key);
  for(const field of ["source_pair_text","source_team_a_label","source_team_b_label",
    "source_pdf","qa_flags","draft_date","draft_time","draft_field","planning_venue",
    "planning_venue_confirmation","planning_date_confirmation","planning_time_confirmation",
    "status","review_status","round","source_page"]){
    assert.equal(JSON.stringify(after[field]),JSON.stringify(before[field]),
      item.fixture_id+" original field not changed: "+field);
  }
}
for(const before of original.fixtures){
  if(updates.has(before.id))continue;
  assert.equal(JSON.stringify(byId.get(before.id)),JSON.stringify(before),
    "R50 must not alter unrelated fixture "+before.id);
}
assert.throws(()=>context.NongkumApprovedPairsR50.apply({...original,metadata:{...original.metadata,source_sha256:"wrong"}}),
  /R50/,"mismatched source must fail closed");
const bad={...original,fixtures:original.fixtures.map(f=>f.id===record.updates[0].fixture_id?{...f,team_a_id:"someone"}:f)};
assert.throws(()=>context.NongkumApprovedPairsR50.apply(bad),/R50/,"don't overwrite existing participant");

const names=new Map(updated.schools.map(s=>[s.id,s.short]));
for(const item of record.updates){
  const f=byId.get(item.fixture_id);
  const expected=names.get(f.team_a_id)+" พบ "+names.get(f.team_b_id);
  const shared=context.NongkumScheduleBulkShare.makeParts({
    data:updated,fixtures:[f],school:"",sport:item.sport,level:"primary",
    query:"",day:"",resultMode:"all",resultsVerified:true,
    baseHref:"https://infobwd.github.io/nongkum-sports-hub/index.html"
  });
  assert.equal(shared.count,1);
  assert.ok(shared.parts[0].includes(expected),"LINE text has participants: "+item.fixture_id);
  assert.match(shared.url,/\/t\/\?c=/,"Short link keeps existing /t/ route");
}
for(const school of updated.schools){
  const own=fixtures.filter(f=>f.kind==="match"&&updates.has(f.id)&&
    (f.team_a_id===school.id||f.team_b_id===school.id));
  assert.ok(own.length>0,"Every school can find its R50 fixtures: "+school.id);
  const shared=context.NongkumScheduleBulkShare.makeParts({
    data:updated,fixtures:own,school:school.id,sport:"",level:"primary",
    query:"",day:"",resultMode:"all",resultsVerified:true,
    baseHref:"https://infobwd.github.io/nongkum-sports-hub/index.html"
  });
  assert.equal(shared.count,own.length,"School-filtered LINE share matches list: "+school.id);
}
const html=read("index.html"),program=read("js/program.js");
assert.ok(html.indexOf('program-corrections.js')<html.indexOf('program-approved-pairs-r50.js'));
assert.ok(html.indexOf('program-approved-pairs-r50.js')<html.indexOf('program.js?v=r50-1'));
assert.ok(program.includes("NongkumApprovedPairsR50.apply(corrected)"));
assert.ok(program.includes("pair_confirmation===\"approved_results\""));
assert.ok(!read("js/program-approved-pairs-r50.js").includes("service_role"),"Public page has no privileged key");
console.log("R50 WEB PASS: 236 fixtures preserved, 12 matches identified, 8 school filters, 12 LINE shares, no approval elevation");
