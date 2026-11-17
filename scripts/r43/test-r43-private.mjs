#!/usr/bin/env node
// R43-B/C/D source and pure candidate verification. All examples are synthetic.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const ctx=vm.createContext({});
for(const path of ["js/program-corrections.js","js/r43-schedule-draft.js",
  "js/r43-release-preview.js","js/r43-committee-inheritance.js"]){
  new vm.Script(read(path),{filename:path}).runInContext(ctx);
}
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const program=ctx.NongkumProgramCorrections.apply(raw);
const contract=ctx.NongkumR43Draft.CONTRACT;
const R=ctx.NongkumR43Release,A=ctx.NongkumR43Assignments;
assert.equal(program.fixtures.length,236);
const fixture=program.fixtures.find(f=>f.kind==="match");
const fixture2=program.fixtures.find(f=>f.kind==="match"&&f.id!==fixture.id);
const uuid="00000000-0000-4000-8000-000000000001";
const request="00000000-0000-4000-8000-000000000002";
const sample={ok:true,status:"approved_not_published",source_key:contract.source_key,new_fixture_review_pending:0,
 schedule_changes:[{fixture_id:fixture.id,request_id:request,changes:{time:"10:30",field:"สนามทดสอบ"}}]};
const preview=R.prepare(program,sample,[],contract);
assert.equal(preview.total_source_fixtures,236);
assert.equal(preview.total_approved_schedule_changes,1);
assert.equal(preview.publication_status,"candidate_not_published");
assert.equal(preview.patches[0].fixture_id,fixture.id);
assert.ok(!JSON.stringify(preview).includes("person_name"),"no draft names in candidate");
assert.throws(()=>R.prepare(program,{...sample,new_fixture_review_pending:1},[],contract),
 /new_fixture_bracket_review_pending/);
assert.throws(()=>R.prepare(program,sample,[fixture.id],contract),/approved_result_lock/);
assert.throws(()=>R.prepare(program,{...sample,source_key:"older"},[],contract),/source_not_verified/);
assert.throws(()=>R.prepare(program,{...sample,schedule_changes:[
 ...sample.schedule_changes,...sample.schedule_changes]},[],contract),/unverified_fixture_or_duplicate/);
assert.throws(()=>R.validateChange({date:"2026-02-30"}),/invalid_date/);
assert.throws(()=>R.validateChange({winner_school_id:"wangdong"}),/invalid_fields/);
assert.throws(()=>R.validateChange({field:""}),/empty_venue/);
assert.throws(()=>R.prepare(program,sample,null,contract),/approved_result_lookup_missing/);
const staffId="00000000-0000-4000-8000-000000000003";
const base={person_id:staffId,person_verified:true,status:"approved",role:"ผู้ตัดสิน",
 date:"2026-11-17",start:"08:00",end:"10:00"};
const sport={...base,id:"s1",scope:"sport",scope_key:fixture.sport_id};
const division={...base,id:"d1",scope:"division",
 scope_key:fixture.sport_id+"/"+fixture.division};
const exact={...base,id:"f1",scope:"fixture",scope_key:fixture.id};
const out=A.forFixture([sport,division,exact],fixture);
assert.equal(out.length,1);
assert.equal(out[0].id,"f1","fixture-level override wins for this role");
const unverified={...exact,id:"x",person_verified:false};
assert.equal(A.forFixture([unverified],fixture).length,0);
const fixtureView=A.forFixture([sport,division,exact],fixture2);
assert.ok(fixtureView.every(x=>x.scope!=="fixture"||x.scope_key===fixture2.id));
assert.equal(A.overlaps([exact,{...exact,id:"f2",scope_key:fixture2.id,start:"09:00",end:"11:00"}]).length,1);
assert.equal(A.overlaps([exact,{...exact,id:"other",person_id:uuid,start:"09:00"}]).length,0);
const sql=read("supabase/proposals/r43_private_schedule_workflow.sql");
const edge=read("supabase/functions/nongkum-schedule-admin/index.ts");
assert.match(sql,/enable row level security/g);
assert.match(sql,/revoke all on function public\.nongkum_r43_gateway/);
assert.match(sql,/grant execute on function public\.nongkum_r43_gateway.*to service_role/);
assert.match(sql,/v_req\.submitted_by=p_uid/);
assert.match(sql,/approved_result_lock/);
assert.match(sql,/duty_overlap/);
assert.match(sql,/source_changed/);
assert.match(sql,/status='verified'/);
assert.match(edge,/const ALLOWED=new Set\(\["https:\/\/infobwd\.github\.io"\]\)/);
assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
const pinSql=read("supabase/proposals/r43_personal_pin_auth_rpc.sql");
const bridgeSql=read("supabase/proposals/r43_staff_actor_bridge.sql");
const pinEdge=read("supabase/functions/nongkum-r43-pin/index.ts");
const privateUi=read("js/r43-private-review.js");
const reviewHtml=read("schedule-review.html");
assert.match(pinSql,/nongkum_sports\.r43_roles/);
assert.match(pinSql,/r\.active=true/);
assert.match(pinSql,/r43_staff_sessions/);
assert.match(pinSql,/security invoker/i);
assert.match(pinSql,/revoke all on function public\.nongkum_r43_personal_pin_auth/);
assert.match(bridgeSql,/auth\.users/);
assert.match(bridgeSql,/r43_staff_identities/);
assert.match(bridgeSql,/manual history-safe plan required/);
assert.match(edge,/R43_STAFF_GATEWAY_ENABLED/);
assert.match(edge,/nongkum_r43_personal_pin_auth/);
assert.match(edge,/account\.staff_id/);
assert.match(edge,/p_session_hash:await sha256/);
assert.doesNotMatch(edge,/\/auth\/v1\/user|nongkum_r43_pin_session_valid/);
assert.match(pinEdge,/R43_PERSONAL_PIN_ENABLED/);
assert.match(pinEdge,/HMAC/);
assert.match(privateUi,/state\.personalToken/);
assert.match(privateUi,/Authorization":"Bearer "\+state\.personalToken/);
assert.match(reviewHtml,/id="r43PersonalPin"/);
assert.doesNotMatch(privateUi,/nongkum-r34-editor-session-v1|nongkum-r37-reviewer-session-v1|LEGACY_KIND/);
assert.doesNotMatch(reviewHtml,/r43EditorPinForm|r43ReviewerPinForm|type="email"/);
assert.doesNotMatch(privateUi,/SERVICE_ROLE_KEY|service_role/);
assert.doesNotMatch(edge,/activate|merge_branch|UPDATE\s+public\.nongkum_schedule_active/i,
 "intake/review endpoint must not publish");
assert.doesNotMatch(read("js/r43-manager.js"),/SUPABASE_SERVICE_ROLE_KEY|nongkum_r43_gateway/);
console.log("R43-F STATIC PASS: staff UUID roles, private PIN session validation, guarded gateway and no activation endpoint");
