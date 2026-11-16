#!/usr/bin/env node
// R38 regression: source-backed display, reviewer submission permissions, no fabricated ranking.
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const jsFiles=["js/program.js","js/standings.js","js/standings-rosters-r38.js",
 "js/r34-card-editor.js","js/results-catalog-r38.js","js/results-renderers.js","js/results.js"];
for(const p of jsFiles)new vm.Script(read(p),{filename:p});
const source=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const rules=JSON.parse(read("data/standings-rules.json"));
const root={};
new vm.Script(read("js/program-corrections.js")).runInNewContext({globalThis:root});
new vm.Script(read("js/standings-rosters-r38.js")).runInNewContext({globalThis:root});
const program=root.NongkumProgramCorrections.apply(source);
assert.equal(program.fixtures.length,236);
const groups=root.NongkumPreliminaryStandings.build(program,[],rules);
const football=groups.find(g=>g.sport_id==="football"&&g.division==="12 ปี ชาย");
assert.ok(football);
assert.equal(football.rows.length,6);
assert.equal(football.match_count,15);
assert.equal(groups.filter(g=>g.sport_id==="futsal").length,2);
assert.equal(groups.filter(g=>g.sport_id==="volleyball").length,4);
assert.equal(groups.filter(g=>g.sport_id==="takraw").length,4);
assert.ok(!groups.some(g=>g.sport_id==="petanque"),"knockout must not get league points");
assert.ok(groups.every(g=>g.rows.every(r=>r.position===null&&r.played===0&&r.points===0)));
const fixture=program.fixtures.find(f=>f.id===rules.football_league.phases.league[0]);
assert.ok(fixture?.team_a_id&&fixture.team_b_id);
const synthetic={id:"synthetic-r38-only",fixture_id:fixture.id,sport_id:"football",status:"approved",
 team_a_id:fixture.team_a_id,team_b_id:fixture.team_b_id,result_type:"score",score_a:2,score_b:1};
const changed=root.NongkumPreliminaryStandings.build(program,[synthetic],rules)
 .find(g=>g.sport_id==="football");
assert.equal(changed.approved_count,1);
assert.equal(changed.rows.find(r=>r.team_id===fixture.team_a_id).points,3);
assert.equal(changed.rows.find(r=>r.team_id===fixture.team_a_id).position,null);
const notApproved=root.NongkumPreliminaryStandings.build(program,[{...synthetic,status:"review"}],rules)
 .find(g=>g.sport_id==="football");
assert.equal(notApproved.approved_count,0,"review queue must never count as approved");
const wrongFixture=root.NongkumPreliminaryStandings.build(program,[{...synthetic,team_a_id:"not-the-team"}],rules)
 .find(g=>g.sport_id==="football");
assert.equal(wrongFixture.approved_count,0,"reject mismatched team IDs");
const stage=program.fixtures.find(f=>f.id==="athletics-p25-011-m");
assert.match(stage.name,/40 เมตร/);
const renderRoot={Nongkum:{escapeHtml:x=>String(x??"").replace(/[&<>"']/g,
 ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}};
new vm.Script(read("js/results-renderers.js")).runInNewContext({globalThis:renderRoot});
const publicSnapshot=JSON.parse(read("data/public-results.json"));
const published={id:"result-"+stage.id,status:"approved",sport_id:"athletics",result_type:"ranking",
 division:stage.division,event_id:stage.id,rankings:[{rank:1,school_id:"wangdong"}]};
const catalog=new Map([[stage.id,{sport_id:"athletics",division:stage.division,name:stage.name}]]);
const card=renderRoot.NongkumResultsRender.card(published,publicSnapshot.schools,publicSnapshot.sports,catalog);
assert.match(card,/40 เมตร/);
assert.match(card,/result-event-thumb/);
const wrongDivision=renderRoot.NongkumResultsRender.card({...published,division:"12 ปี ชาย"},
 publicSnapshot.schools,publicSnapshot.sports,catalog);
assert.doesNotMatch(wrongDivision,/40 เมตร/,"event title requires matching source division");
assert.equal(renderRoot.NongkumResultsRender.card({...published,status:"review"},
 publicSnapshot.schools,publicSnapshot.sports,catalog),"");
const page=read("index.html"),results=read("results.html"),schedule=read("js/program.js");
assert.match(page,/data-result-mode="pending"/);
assert.match(page,/data-result-mode="all"/);
assert.match(schedule,/resultFeed\?\.source==="live"/);
assert.match(schedule,/\.fixture_id\|\|r\.event_id/);
assert.match(schedule,/!state\.resultsVerified/);
assert.match(results,/results-catalog-r38\.js\?v=r38-1/);
for(const html of [page,results]){
 assert.match(html,/r34-card-editor\.js\?v=r38-1/);
}
const reviewer=read("js/r34-card-editor.js");
const edge=read("supabase/functions/nongkum-results-reviewer/index.ts");
const sql=read("supabase/migrations/20261116054000_r38_reviewer_editor_bridge.sql");
assert.match(reviewer,/reviewerSession\(\)/);
assert.match(reviewer,/REVIEW_API/);
assert.match(reviewer,/"edit_"\+action/);
assert.match(edge,/nongkum_reviewer_edit_gateway/);
assert.match(sql,/nongkum_sports\.reviewer_sessions/);
assert.match(sql,/nongkum_sports\.editor_sessions/);
assert.match(sql,/least\(v_session\.expires_at/);
assert.match(sql,/revoke all on function public\.nongkum_reviewer_edit_gateway\(text,jsonb\) from public,anon,authenticated/i);
assert.match(sql,/grant execute on function public\.nongkum_reviewer_edit_gateway\(text,jsonb\) to service_role/i);
assert.doesNotMatch(sql,/insert\s+into\s+public\.nongkum_published_results/i);
const icon=new URL("../../assets/results-sports-r38.webp",import.meta.url);
const bytes=readFileSync(icon);
assert.equal(bytes.subarray(0,4).toString(),"RIFF");
assert.equal(bytes.subarray(8,12).toString(),"WEBP");
assert.ok(statSync(icon).size<8192,"sprites should remain under 8KB");
const css=read("css/results.css");
for(const name of ["sprint","relay","football","petanque","futsal","volleyball","takraw","tabletennis","tugofwar"])
 assert.match(css,new RegExp("result-event-thumb--"+name));
console.log("R38 PASS: zero-state tables, real-fixture joins, approved-only cards, role separation and tiny WebP");
