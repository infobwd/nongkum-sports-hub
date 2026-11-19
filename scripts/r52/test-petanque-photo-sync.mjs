#!/usr/bin/env node
/* R52 QA: 54 published petanque results -> organizer confirmed pair schedule overlay.
 * Verify against baseline R20-B+R50 without changing dates/times/venues.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=(p)=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const snapshot=JSON.parse(read("data/r52/approved_schedule_pairs_20261119.json"));
const board=JSON.parse(read("data/r52/petanque_board_transcription_20261119.json"));
const context=vm.createContext({URL,URLSearchParams,console});
for(const path of [
 "js/program-corrections.js",
 "js/program-approved-pairs-r50.js",
 "js/program-approved-pairs-r52.js",
 "js/schedule-order.js",
 "js/schedule-link-codec.js",
 "js/schedule-bulk-share.js"
]) vm.runInContext(read(path),context,{filename:path});
const before=context.NongkumApprovedPairsR50.apply(context.NongkumProgramCorrections.apply(raw));
const after=context.NongkumApprovedPairsR52.apply(before);
const byId=new Map(after.fixtures.map(f=>[f.id,f]));
const baseById=new Map(before.fixtures.map(f=>[f.id,f]));
assert.equal(after.fixtures.length,236);
assert.equal(after.fixtures.filter(f=>f.kind==="match").length,186);
assert.equal(after.fixtures.filter(f=>f.kind==="track_event").length,50);
assert.equal(after.metadata.all_data_approved,false);
assert.equal(after.metadata.r52_updated_pair_count,21);
assert.equal(after.metadata.r50_approved_pair_count,12);
assert.equal(after.metadata.r52_schedule_source_key,snapshot.active_r33_source_key);
assert.equal(snapshot.rows.length,21);
assert.equal(board.rows.length,58);
assert.equal(board.rows.filter(r=>r.blocked_reason).length,4);
const ids=new Set(snapshot.rows.map(r=>r.fixture_id));
assert.equal(ids.size,21);
const corrected=snapshot.rows.filter(r=>r.expected_source_pair_text!==r.source_pair_text);
assert.equal(corrected.length,2);
assert.deepEqual(corrected.map(r=>r.match_no).sort(),["10","2"]);
for(const item of snapshot.rows){
 const f=byId.get(item.fixture_id),old=baseById.get(item.fixture_id);
 assert.ok(f&&old,"Fixture exists: "+item.fixture_id);
 assert.equal(old.team_a_id,item.expected_team_a);
 assert.equal(old.team_b_id,item.expected_team_b);
 assert.equal(old.source_pair_text,item.expected_source_pair_text);
 assert.equal(f.sport_id,"petanque");
 assert.equal(f.division,item.division);
 assert.equal(String(f.source_match_no),item.match_no);
 assert.equal(f.team_a_id,item.team_a);
 assert.equal(f.team_b_id,item.team_b);
 assert.equal(f.source_pair_text,item.source_pair_text);
 assert.equal(f.pair_confirmation,item.basis==="organizer_photo_corrected_fixture"?"organizer_photo":"approved_results");
 assert.equal(f.source_pair_corrected,item.expected_source_pair_text!==item.source_pair_text);
 assert.equal(f.pair_confirmation_source_key,snapshot.active_r33_source_key);
 for(const field of ["draft_date","draft_time","draft_field","planning_venue","planning_venue_confirmation",
 "planning_date_confirmation","planning_time_confirmation","planning_status","status","review_status",
 "source_pdf","qa_flags","round","source_page"]){
  assert.equal(JSON.stringify(f[field]),JSON.stringify(old[field]),"Unchanged baseline: "+field+" / "+item.fixture_id);
 }
}
for(const f of before.fixtures){
 if(!ids.has(f.id)) assert.equal(JSON.stringify(byId.get(f.id)),JSON.stringify(f),"Non-target unchanged: "+f.id);
}
assert.throws(()=>context.NongkumApprovedPairsR52.apply({...before,metadata:{...before.metadata,source_sha256:"wrong"}}),/R52/);
assert.throws(()=>context.NongkumApprovedPairsR52.apply(context.NongkumProgramCorrections.apply(raw)),/R52/);
const tampered={...before,fixtures:before.fixtures.map(f=>f.id===snapshot.rows[0].fixture_id?{...f,team_a_id:"phuphrom"}:f)};
assert.throws(()=>context.NongkumApprovedPairsR52.apply(tampered),/R52/);
const names=new Map(after.schools.map(s=>[s.id,s.short]));
for(const item of snapshot.rows){
 const f=byId.get(item.fixture_id);
 const expected=names.get(f.team_a_id)+" พบ "+names.get(f.team_b_id);
 const shared=context.NongkumScheduleBulkShare.makeParts({
 data:after,fixtures:[f],school:"",sport:"petanque",level:"primary",
 query:"",day:"",resultMode:"all",resultsVerified:true,
 baseHref:"https://infobwd.github.io/nongkum-sports-hub/index.html"
 });
 assert.equal(shared.count,1);
 assert.ok(shared.parts[0].includes(expected),"LINE copy: "+item.fixture_id);
 assert.match(shared.url,/\/t\/\?c=/);
}
for(const school of after.schools){
 const own=snapshot.rows.filter(x=>x.team_a===school.id||x.team_b===school.id).map(x=>byId.get(x.fixture_id));
 assert.ok(own.length>0,"School coverage: "+school.id);
 const shared=context.NongkumScheduleBulkShare.makeParts({
 data:after,fixtures:own,school:school.id,sport:"petanque",level:"primary",
 query:"",day:"",resultMode:"all",resultsVerified:true,
 baseHref:"https://infobwd.github.io/nongkum-sports-hub/index.html"
 });
 assert.equal(shared.count,own.length,"School share: "+school.id);
}
const html=read("index.html"),program=read("js/program.js");
assert.ok(html.indexOf("program-approved-pairs-r50.js")<html.indexOf("program-approved-pairs-r52.js"));
assert.ok(html.indexOf("program-approved-pairs-r52.js")<html.indexOf("program.js?v=r52-1"));
assert.ok(program.includes("NongkumApprovedPairsR50.apply(corrected)"));
assert.ok(program.includes("NongkumApprovedPairsR52.apply(r50)"));
assert.ok(program.includes("organizer_photo"));
assert.ok(!read("js/program-approved-pairs-r52.js").includes("service_role"));
console.log("R52 PASS: 236 items, 21 verified updates (2 corrected bracket labels), 8 schools/LINE, fail-closed source guard");
