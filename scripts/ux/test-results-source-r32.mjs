/* Run: node scripts/ux/test-results-source-r32.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=(name)=>readFileSync(new URL("../../"+name,import.meta.url),"utf8");
const base=JSON.parse(read("data/public-results.json"));
const src=read("js/results-source-r32.js");
new vm.Script(src);
assert.equal(base.metadata.approved_results_count,0,"R32 migration must not fabricate scores");
assert.match(src,/sb_publishable_/,"Only a public publishable key is allowed");
assert.doesNotMatch(src,/const publishableKey\s*=\s*["\x27](?:eyJ|sb_secret_)/,"Never expose privileged credentials");
assert.doesNotMatch(src,/\b(?:POST|PATCH|DELETE|INSERT)\b/,"Public reader should only read");

async function run(remote,local=base) {
  const calls=[];
  const context={
    Date, Set, AbortController, setTimeout, clearTimeout,
    fetch:async (url,opts)=>{
      calls.push({url,opts});
      if(String(url).includes("supabase.co/")){
        if(remote instanceof Error)throw remote;
        if(remote&&remote.httpError)return {ok:false,status:503};
        return {ok:true,json:async()=>remote};
      }
      return {ok:true,json:async()=>local};
    }
  };
  context.globalThis=context;
  vm.runInNewContext(src,context);
  return {value:await context.NongkumResultSource.load(),calls};
}
const empty=await run([]);
assert.equal(empty.value.source,"live");
assert.equal(empty.value.data.results.length,0);
assert.equal(empty.value.data.metadata.publication_status,"empty");
assert.equal(empty.value.data.metadata.approved_only,true);
assert(empty.calls.some(c=>String(c.url).includes("/rest/v1/nongkum_published_results")&&
    c.opts.headers.apikey.startsWith("sb_publishable_")));
assert(empty.calls.every(c=>c.opts?.method===undefined||c.opts.method==="GET"));

const approved={
  id:"test_result_001",status:"approved",sport_id:"football",result_type:"score",
  fixture_id:"test_fixture_001",team_a_id:base.schools[0].id,team_b_id:base.schools[1].id,
  score_a:1,score_b:0
};
const rows=[{result_id:approved.id,result:approved,revision:1,published_at:"2026-11-15T12:00:00Z"}];
const live=await run(rows);
assert.equal(live.value.source,"live");
assert.equal(live.value.data.metadata.approved_results_count,1);
assert.equal(live.value.data.metadata.publication_status,"published");
assert.equal(live.value.data.results[0].id,approved.id);
assert.equal(live.value.data.metadata.published_at,"2026-11-15T12:00:00Z");

const backup=await run(new Error("connection failed"));
assert.equal(backup.value.source,"backup");
assert.equal(backup.value.data.results.length,0);
assert.equal((await run({httpError:true})).value.source,"backup");

const beforeCutover={...base,metadata:{...base.metadata,approved_results_count:1,publication_status:"published"},results:[approved]};
assert.equal((await run([],beforeCutover)).value.source,"backup","Do not hide legacy approved results before reconciliation");

for(const bad of [
  [{...rows[0],result:{...approved,status:"review"}}],
  [{...rows[0],result:{...approved,recorded_by:"PRIVATE DATA"}}],
  [{...rows[0],result:{...approved,score_a:-1}}],
  [{...rows[0],result_id:"different"}],
  [{...rows[0],revision:0}],
  [rows[0],rows[0]]
]){
  await assert.rejects(()=>run(bad),"Unsafe or malformed published data must fail closed");
}

for(const page of ["results.html","standings.html"]){
  const html=read(page);
  assert.match(html,/results-source-r32\.js/);
  const pos=html.indexOf("results-source-r32.js");
  assert(pos>=0&&pos<html.lastIndexOf(page==="results.html"?"js/results.js":"js/standings.js"),
    "Read-only source must load before page reader");
}
for(const js of ["js/results.js","js/standings.js"]){
  const content=read(js);
  assert.match(content,/NongkumResultSource\.load\(\)/);
  assert.match(content,/สำเนาผลที่รับรอง/,"Source fallback must be labeled plainly");
  assert.match(content,/\},60000\);/,"Refresh while visible once per minute");
}
const sw=read("sw.js");
assert(!sw.includes("results-source-r32"),"PWA must not cache live results");
assert(!sw.includes("nongkum_published_results"),"PWA must not cache DB feed");
console.log("R32 PASS — verified public-only source, safe fallback, 0 real scores, and UI contracts");
