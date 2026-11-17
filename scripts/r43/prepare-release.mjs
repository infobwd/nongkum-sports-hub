#!/usr/bin/env node
/* R43-D: NEVER publishes. Only writes a PRIVATE candidate outside the repository.
   Operator must first export approved_preview and independently verify R32 results. */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve,dirname,sep} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
import vm from "node:vm";
const root=new URL("../../",import.meta.url);
const read=p=>readFileSync(new URL(p,root),"utf8");
const args=process.argv.slice(2);
function arg(k){const n=args.indexOf(k);return n<0?"":String(args[n+1]||"");}
const input=arg("--approved-preview"),resultsPath=arg("--verified-results");
const output=resolve(arg("--out")||tmpdir()+"/R43-schedule-review-candidate.json");
if(!input||!resultsPath){
 console.error("Usage: node scripts/r43/prepare-release.mjs --approved-preview <private.json> --verified-results <current-R32.json> [--out /tmp/R43-preview.json]");
 process.exit(2);
}
const cwd=resolve(process.cwd());
if(output===cwd||output.startsWith(cwd+sep))
 throw Error("refusing_to_write_release_candidate_into_public_repository");
const ctx=vm.createContext({});
for(const source of ["js/program-corrections.js","js/r43-schedule-draft.js","js/r43-release-preview.js"])
 new vm.Script(read(source)).runInContext(ctx);
const sourceText=read("data/program-from-pdf-2569-20261104-draft.json");
const correctionsText=read("js/program-corrections.js");
function sha(s){
 const data=Buffer.from(s,"utf8");
 return createHash("sha1").update("blob "+data.length+"\0").update(data).digest("hex");
}
const contract=ctx.NongkumR43Draft.CONTRACT;
if(sha(sourceText)!==contract.candidate_blob_sha||sha(correctionsText)!==contract.corrections_blob_sha)
 throw Error("source_sha_changed_requires_new_review");
const approved=JSON.parse(readFileSync(input,"utf8"));
const results=JSON.parse(readFileSync(resultsPath,"utf8"));
if(results.source!=="R32-approved-only-verified"||!Array.isArray(results.results)||
 !Number.isFinite(Date.parse(results.retrieved_at))||
 Math.abs(Date.now()-Date.parse(results.retrieved_at))>60*60*1000)
 throw Error("R32_recent_verified_snapshot_required");
if(results.results.some(r=>r.status!=="approved"||!(r.fixture_id||r.event_id)))
 throw Error("non_approved_or_missing_result_id");
const approvedIds=results.results.map(r=>r.fixture_id||r.event_id);
const program=ctx.NongkumProgramCorrections.apply(JSON.parse(sourceText));
const preview=ctx.NongkumR43Release.prepare(program,approved,approvedIds,contract);
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify({...preview,r32_verified_at:results.retrieved_at},null,2),{encoding:"utf8",flag:"wx",mode:0o600});
console.log("R43 CANDIDATE ONLY: "+preview.total_approved_schedule_changes+
 " approved schedule changes; "+approvedIds.length+" approved-result locks checked; written outside repo to "+output);
