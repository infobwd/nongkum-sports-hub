#!/usr/bin/env node
// R38: read-only regressions; synthetic results only, no production mutations.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const rules=JSON.parse(read("data/standings-rules.json"));
const context=vm.createContext({console,Map,Set});
new vm.Script(read("js/program-corrections.js"),{filename:"program-corrections.js"}).runInContext(context);
const program=context.NongkumProgramCorrections.apply(raw);
assert.equal(program.fixtures.length,236,"do not silently change official schedule coverage");
new vm.Script(read("js/standings-rosters-r38.js"),{filename:"standings-rosters-r38.js"}).runInContext(context);
const groups=context.NongkumPreliminaryStandings.build(program,[],rules);
const football=groups.find(g=>g.sport_id==="football"&&g.division==="12 ปี ชาย");
assert.equal(football.match_count,15,"football league excludes playoff fixtures");
assert.equal(football.rows.length,6,"six confirmed names from explicit pairings");
assert.ok(groups.some(g=>g.sport_id==="futsal"&&g.label==="สาย A"));
assert.ok(groups.some(g=>g.sport_id==="futsal"&&g.label==="สาย B"));
assert.ok(groups.every(g=>g.rows.every(r=>r.position===null&&r.played===0)),
 "unplayed teams have no assigned rank or fabricated result");
assert.equal(context.NongkumPreliminaryStandings.build(program,[{
 fixture_id:football.rows[0].team_id,status:"review",sport_id:"football",
 team_a_id:"a",team_b_id:"b",score_a:9,score_b:9
}],rules).find(g=>g.sport_id==="football").approved_count,0);

const html=read("results.html"),css=read("css/results.css");
const catalogCode=read("js/results-catalog-r38.js"),rendererCode=read("js/results-renderers.js");
const resultsCode=read("js/results.js"),programCode=read("js/program.js");
for(const [name,code] of [["results-catalog-r38.js",catalogCode],
 ["results-renderers.js",rendererCode],["results.js",resultsCode],["program.js",programCode],
 ["standings.js",read("js/standings.js")],["r34-card-editor.js",read("js/r34-card-editor.js")]])
 new vm.Script(code,{filename:name});
assert.match(html,/program-corrections\.js\?v=/);
assert.match(html,/results-catalog-r38\.js\?v=/);
assert.match(html,/results-renderers\.js\?v=(?:r(?:38|39)-1|r40g-1)/);
assert.match(html,/results\.js\?v=r(?:38|39|41)-1/);
assert.match(read("index.html"),/id="scheduleResultSwitch"/);
assert.match(programCode,/NongkumResultSource\?\.load/);
assert.match(programCode,/resultFeed\?\.source==="live"/);
assert.match(programCode,/resultVisible\(m\)/);
assert.match(programCode,/resultMode:"pending"/);
assert.match(css,/assets\/results-sports-r38\.webp/);
const image=readFileSync(new URL("../../assets/results-sports-r38.webp",import.meta.url));
assert.ok(image.length>1000&&image.length<12000,"WebP sprite stays small");
assert.equal(image.toString("ascii",0,4),"RIFF");
assert.equal(image.toString("ascii",8,12),"WEBP");
const safe=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
context.Nongkum={escapeHtml:safe};
new vm.Script(rendererCode).runInContext(context);
const sourceFixture=program.fixtures.find(f=>f.id==="athletics-p26-015-m");
assert.match(sourceFixture.name,/วิ่งผลัด/);
const synthetic={id:"result-"+sourceFixture.id,status:"approved",sport_id:"athletics",
 result_type:"ranking",event_id:sourceFixture.id,division:sourceFixture.division,
 rankings:[{rank:1,school_id:"wangdong"}]};
const cat=new Map([[sourceFixture.id,{sport_id:sourceFixture.sport_id,division:sourceFixture.division,name:sourceFixture.name}]]);
const rendered=context.NongkumResultsRender.card(synthetic,raw.schools,raw.sports,cat);
assert.ok(rendered.includes(safe(sourceFixture.name)),"specific athletics title must appear");
assert.match(rendered,/result-event-thumb--relay/);
assert.match(rendered,/data-result-card/);
assert.doesNotMatch(context.NongkumResultsRender.card({...synthetic,status:"review"},raw.schools,raw.sports,cat),/result-card/);
const missing=context.NongkumResultsRender.card({...synthetic,event_id:"not-in-source"},raw.schools,raw.sports,cat);
assert.match(missing,/ยังไม่พบชื่อรายการกรีฑา/);
const bridge=read("supabase/migrations/20261116054000_r38_reviewer_editor_bridge.sql"),
 edge=read("supabase/functions/nongkum-results-reviewer/index.ts"),
 editor=read("js/r34-card-editor.js");
assert.match(bridge,/revoke all on function public\.nongkum_reviewer_edit_gateway.*from public,anon,authenticated/i);
assert.match(bridge,/grant execute on function public\.nongkum_reviewer_edit_gateway.*to service_role/i);
assert.match(bridge,/revoked_at=now\(\)/);
assert.match(edge,/nongkum_reviewer_edit_gateway/);
assert.match(editor,/REVIEW_STORAGE/);
assert.match(editor,/reviewerSession\(\)/);
assert.doesNotMatch(editor,/SUPABASE_SERVICE_ROLE_KEY|PIN_HASH/);
console.log("R38 PASS: 236 items, 15 football league matches, zero-state groups, approved-only cards, exact athletics labels, WebP size and reviewer gateway.");
