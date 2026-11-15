// R33: deterministic schedule snapshot and safety contract, no network or DB credentials.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const sourceBlob="7ba60be1b36a2591768fc0350476edc8ff2c3ac1";
const correctionsBlob="fa3269b5b95ae3e3a8509b6f2c7d8d5040cbaed4";
const key="r33-20261116-7ba60be1-fa3269b5";
const gitBlob=s=>createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0").update(s).digest("hex");
assert.equal(gitBlob(read("data/program-from-pdf-2569-20261104-draft.json")),sourceBlob,
  "R33 alert: the GitHub program source changed; reconcile revisions before a new Supabase import");
assert.equal(gitBlob(read("js/program-corrections.js")),correctionsBlob,
  "R33 alert: confirmed correction logic changed; reconcile before reimport");

const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
assert.equal(raw.schema_version,3);
assert.equal(raw.fixtures.length,237);
const correction=read("js/program-corrections.js");
assert(correction.includes("football-p07-มัธยมหญิง-020-repeated-final"));
assert(correction.includes("2026-11-18"));
const corrected=raw.fixtures.filter(x=>x.id!=="football-p07-มัธยมหญิง-020-repeated-final");
assert.equal(corrected.length,236);

function fromSql(path) {
  const source=read(path);
  const match=source.match(/jsonb_to_recordset\('((?:''|[^'])*)'::jsonb\)/s);
  assert(match,"Seed SQL must hold a JSON array in "+path);
  return JSON.parse(match[1].replaceAll("''","'"));
}
const refs=read("supabase/seeds/r33_00_reference.sql");
assert(refs.includes(sourceBlob)&&refs.includes(correctionsBlob));
assert(refs.includes(key)&&refs.includes("'staged'"));
const schools=fromSql("supabase/seeds/r33_00_reference.sql");
assert.equal(schools.length,8);
assert(schools.some(s=>s.school_id==="wangdong"&&s.aliases.includes("วังด้ง")));
const sports=(()=>{
 const m=refs.matchAll(/jsonb_to_recordset\('((?:''|[^'])*)'::jsonb\)/gs);
 return [...m].map(x=>JSON.parse(x[1].replaceAll("''","'")));
})();
assert.equal(sports.length,2);
assert.equal(sports[1].length,9);
assert(sports[1].some(s=>s.sport_id==="petanque"&&s.aliases.includes("เปตอง")));
const fixtures=[1,2,3].flatMap(n=>fromSql("supabase/seeds/r33_0"+n+"_fixtures.sql"));
assert.equal(fixtures.length,236);
assert.equal(new Set(fixtures.map(x=>x.fixture_id)).size,236);
assert(fixtures.every(x=>x.source_key===key&&x.schedule_status==="draft"));
assert(fixtures.every(x=>x.venue_confirmed===true));
assert.equal(fixtures.filter(x=>x.date_confirmed&&x.time_confirmed).length,45);
assert.equal(fixtures.filter(x=>x.kind==="track_event").length,50);
assert.equal(fixtures.filter(x=>x.kind==="match").length,186);
assert(fixtures.every(x=>x.age_years===null||(Number.isInteger(x.age_years)&&x.age_years>0)));
assert(fixtures.every(x=>!Object.keys(x).some(k=>/score|athlete|approval|winner_school/i.test(k))));
const ids=new Set(corrected.map(x=>x.id));
assert(fixtures.every(f=>ids.has(f.fixture_id)));
const fromRaw=new Map(corrected.map(x=>[x.id,x]));
for(const f of fixtures){
 const src=fromRaw.get(f.fixture_id);
 assert.equal(f.sport_id,src.sport_id);
 assert.equal(f.division,src.division);
 assert.equal(f.team_a_id,src.team_a_id||null);
 assert.equal(f.team_b_id,src.team_b_id||null);
 assert.deepEqual(f.school_ids.slice().sort(),[...new Set([src.team_a_id,src.team_b_id,...(src.lanes||[]).map(x=>x.school_id)].filter(Boolean))].sort());
}
const wang=fixtures.find(x=>x.fixture_id==="petanque-p17-10-ปี-ชาย-012");
assert.equal(wang.source_pair_text,"วังด้ง – หนองกุ่ม");
assert.equal(wang.draft_date,"2026-11-12");
assert.equal(wang.draft_time,"09:00");
assert.equal(wang.date_confirmed,true);
assert.equal(wang.time_confirmed,true);
const conflict=fixtures.find(x=>x.fixture_id==="petanque-p17-10-ปี-ชาย-030");
assert.match(conflict.conflict_note,/PR #136/);
assert(!fixtures.some(x=>x.fixture_id==="football-p07-มัธยมหญิง-020-repeated-final"));
const final=fixtures.find(x=>x.fixture_id==="football-p07-มัธยมหญิง-007");
assert.equal(final.draft_date,"2026-11-18");
assert.equal(final.date_confirmed,true);
assert.equal(final.time_confirmed,false,"Do not guess final kickoff time");
const links=fromSql("supabase/seeds/r33_04_bracket_drafts.sql");
assert.equal(links.length,89);
assert(links.every(x=>["draft","conflict"].includes(x.link_status)));
assert.equal(links.filter(x=>x.link_status==="conflict").length,2);
assert(links.some(x=>x.upstream_fixture_id===wang.fixture_id&&x.link_status==="conflict"));
const activation=read("supabase/seeds/r33_05_activate_verified.sql");
assert(activation.includes("n <> 236")&&activation.includes("nc <> 45")&&activation.includes("ne <> 89"));
const ddl=read("supabase/migrations/20261116_r33_schedule_search.sql");
assert(ddl.includes("security invoker"));
assert(ddl.includes("enable row level security"));
assert(ddl.includes("grant execute on function public.search_nongkum_schedule"));
assert(!ddl.includes("service_role_key"));
assert.equal(JSON.parse(read("data/public-results.json")).metadata.approved_results_count,0);
console.log("R33 PASS — 236 source-consistent draft fixtures, 45 confirmed date/time, 89 draft links, no result changes, RLS and source-drift gate");
