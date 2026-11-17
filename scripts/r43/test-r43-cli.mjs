#!/usr/bin/env node
// R43-D preview CLI synthetic tests; never touches actual R32 or publishes.
import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync,spawnSync} from "node:child_process";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const ctx=vm.createContext({});
new vm.Script(read("js/program-corrections.js")).runInContext(ctx);
new vm.Script(read("js/r43-schedule-draft.js")).runInContext(ctx);
const fixture=ctx.NongkumProgramCorrections.apply(JSON.parse(
 read("data/program-from-pdf-2569-20261104-draft.json"))).fixtures[0];
const dir=mkdtempSync(join(tmpdir(),"r43-preview-"));
const input=join(dir,"approved.json"),results=join(dir,"results.json"),out=join(dir,"candidate.json");
try{
 writeFileSync(input,JSON.stringify({
   ok:true,status:"approved_not_published",
   source_key:ctx.NongkumR43Draft.CONTRACT.source_key,
   new_fixture_review_pending:0,
   schedule_changes:[{fixture_id:fixture.id,request_id:"00000000-0000-4000-8000-000000000009",
     changes:{time:"12:30"}}]
 }));
 writeFileSync(results,JSON.stringify({
   source:"R32-approved-only-verified",
   retrieved_at:new Date().toISOString(),results:[]
 }));
 const cli=new URL("./prepare-release.mjs",import.meta.url).pathname;
 execFileSync(process.execPath,[cli,"--approved-preview",input,"--verified-results",results,"--out",out]);
 const review=JSON.parse(readFileSync(out,"utf8"));
 assert.equal(review.publication_status,"candidate_not_published");
 assert.equal(review.total_approved_schedule_changes,1);
 assert.equal(review.total_source_fixtures,236);
 assert.ok(!review.patches[0].approved_changes.winner_school_id);
 writeFileSync(results,JSON.stringify({
  source:"R32-approved-only-verified",retrieved_at:new Date().toISOString(),
  results:[{status:"approved",fixture_id:fixture.id}]
 }));
 const blocked=spawnSync(process.execPath,[cli,"--approved-preview",input,
   "--verified-results",results,"--out",join(dir,"blocked.json")],{encoding:"utf8"});
 assert.notEqual(blocked.status,0,"approved result lock blocks release candidate");
 assert.match(blocked.stderr,/approved_result_lock/);
}finally{rmSync(dir,{recursive:true,force:true});}
console.log("R43-D PREVIEW PASS: no publish, 236 stable IDs, verified result snapshot and R32 lock");
