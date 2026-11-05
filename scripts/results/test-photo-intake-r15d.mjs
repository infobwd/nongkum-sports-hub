// R15-D: contract/guard tests only; NOT the R15-C production publication validator.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const sample=JSON.parse(read("tests/fixtures/r15-photo-intake.synthetic.json"));
const publicData=JSON.parse(read("data/public-results.json"));
const registry=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const form=read("forms/score-sheet.html");
const source=read("forms/score-sheet.js");
const css=read("forms/score-sheet.css");
const resultsGS=read("apps-script/Results.gs");
assert.equal(sample.schema_version,"r15de-private-intake-test-v1");
assert.equal(sample.test_only,true);
assert.equal(sample.never_publish,true);
assert.ok(sample.notice.includes("SYNTHETIC"));
const registryIds=new Set(registry.fixtures.map(f=>f.id));
assert.equal(registry.fixtures.length,237,"latest paper registry must be checked, not legacy 236");
assert.equal(registryIds.size,registry.fixtures.length,"each registry ID unique");
assert.equal(registry.fixtures.filter(f=>f.kind==="match").length,187);
assert.equal(registry.fixtures.filter(f=>f.kind==="track_event").length,50);
assert.equal(registry.metadata.all_data_approved,false,"draft schedule is not result approval");
const idPattern=/^TEST-[A-Z0-9-]+$/;
for(const fixture of sample.synthetic_fixture_registry){
  assert.match(fixture.id,idPattern);
  assert.equal(registryIds.has(fixture.id),false,"synthetic ID must never overlap real fixture");
}
const intake=sample.sample_private_intake;
assert.match(intake.intake_id,idPattern);
assert.match(intake.fixture_id,idPattern);
assert.match(intake.transcription.result_id,idPattern);
assert.match(intake.evidence.private_evidence_id,idPattern);
assert.deepEqual(intake.image_review.uncertain_fields,[]);
assert.equal(intake.image_review.quality,"clear");
assert.equal(intake.audit.status,"approved");
for(const k of ["recorded_by","checked_by","checked_at","approved_by","approved_at","approval_digest"]){
  assert.ok(intake.audit[k],k+" must be explicitly present in private approval example");
}
assert.notEqual(intake.audit.recorded_by,intake.audit.checked_by);
assert.ok(intake.audit.revision>=1);
assert.equal(sample.synthetic_fixture_registry.find(x=>x.id===intake.fixture_id).sport_id,intake.sport_id);
assert.equal(sample.synthetic_fixture_registry.find(x=>x.id===intake.fixture_id).team_a_id,intake.participant_order.team_a_id);
assert.equal(sample.synthetic_fixture_registry.find(x=>x.id===intake.fixture_id).team_b_id,intake.participant_order.team_b_id);
const diagnostics=new Set(["DUPLICATE_RESULT","FIXTURE_NOT_FOUND","SPORT_TEAM_MISMATCH","SCORE_RULE_CONFLICT","APPROVAL_PROOF_MISSING","IMAGE_UNREADABLE","REVISION_CONFLICT","PHASE_UNRESOLVED","RANKING_INCOMPLETE"]);
assert.ok(sample.negative_cases.length>=9);
assert.equal(new Set(sample.negative_cases.map(c=>c.id)).size,sample.negative_cases.length);
for(const c of sample.negative_cases){
  assert.match(c.id,idPattern);
  assert.ok(diagnostics.has(c.expected_diagnostic),"R15-C handoff diagnostic must be recognized");
  assert.ok(c.scenario.length>=12);
}
for(const d of diagnostics)assert.ok(sample.negative_cases.some(c=>c.expected_diagnostic===d),"missing negative vector: "+d);
// Production-public isolation: do not assert results length==0 forever (real approved results may eventually exist).
assert.equal(publicData.schema_version,1);
assert.equal(publicData.metadata.approved_only,true);
assert.equal(publicData.metadata.approved_results_count,publicData.results.length);
assert.ok(publicData.results.every(r=>r.status==="approved"));
assert.ok(!JSON.stringify(publicData).includes("TEST-"),"synthetic IDs must never reach public results");
for(const r of publicData.results){
  assert.ok(!("evidence" in r||"audit" in r||"approved_by" in r||"private_evidence_id" in r),
    "private attestation never appears in public JSON");
}
// A4 binding: only linked IDs are generated from registry; blank form MUST require handwritten verification.
new vm.Script(source,{filename:"forms/score-sheet.js"});
assert.match(source,/source=\{id:item\.id,sport_id:item\.sport_id,fields\}/);
assert.match(source,/data\/program-from-pdf-2569-20261104-draft\.json/);
assert.match(source,/function verifyBoundSource/);
assert.match(source,/function printSheet/);
assert.match(source,/source=null/);
assert.match(source,/fixtureId"\)\.readOnly=true/);
assert.match(form,/id="fixtureId"[^>]*readonly/);
assert.match(form,/id="sportName"[^>]*readonly/);
for(const x of ["division","round","date","time","venue","sourcePage","formNumber",
  "teamA","teamB","winner","note","trackRows"]){
  assert.ok(form.includes('id="'+x+'"'),"score-sheet field missing: "+x);
}
for(const x of ["ผู้บันทึกผล","กรรมการผู้ตรวจ","ผู้รับรองผล"])assert.ok(form.includes(x),"signature role missing: "+x);
for(const x of ["petanqueSection","shootoutSection","setsSection","winSection","trackSection"])assert.ok(form.includes('id="'+x+'"'));
assert.match(css,/@page\{size:A4 portrait/);
assert.match(resultsGS,/nkResultFingerprint_/);
assert.match(resultsGS,/nkResultsApproved_/);
assert.match(resultsGS,/nkExportApprovedResultsToDrive/);
assert.match(resultsGS,/DriveApp\.createFile/);
assert.ok(!resultsGS.includes("Github token"));
for(const p of ["docs/R15D_PHOTO_RESULTS_INTAKE_SOP.md","docs/R15DE_DATA_CONTRACT_HANDOFF.md"]){
  const doc=read(p);
  assert.ok(doc.includes("R15-C"));
  assert.ok(doc.includes("fixture"));
}
console.log("R15-D PASS: 237 unique IDs, A4 fixture guard, private approval SOP and synthetic-only negative vectors; NO production validator was implemented");
