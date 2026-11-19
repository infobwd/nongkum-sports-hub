#!/usr/bin/env node
/* R43-A static and contract QA. No private roster, no production writes. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import vm from "node:vm";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
const contract=vm.createContext({});
new vm.Script(read("js/r43-schedule-draft.js")).runInContext(contract);
const D=contract.NongkumR43Draft;
const corrections=vm.createContext({});
new vm.Script(read("js/program-corrections.js")).runInContext(corrections);
const rawText=read("data/program-from-pdf-2569-20261104-draft.json");
const corrected=corrections.NongkumProgramCorrections.apply(JSON.parse(rawText));
// R53: R43 display and public schedule must resolve the same pinned R50→R52 overlays.
for(const p of ["js/program-approved-pairs-r50.js","js/program-approved-pairs-r52.js"])
 new vm.Script(read(p),{filename:p}).runInContext(corrections);
const withR50=corrections.NongkumApprovedPairsR50.apply(corrected);
const withR52=corrections.NongkumApprovedPairsR52.apply(withR50);
assert.equal(withR50.metadata.r50_approved_pair_count,12);
assert.equal(withR52.metadata.r52_updated_pair_count,21);
assert.equal(withR52.metadata.r52_schedule_source_key,"r33-20261119-r52-petanque-54approved");
assert.equal(withR52.fixtures.length,236);
assert.equal(withR52.fixtures.filter(f=>f.kind==="match").length,186);
assert.equal(withR52.fixtures.filter(f=>f.kind==="track_event").length,50);
assert.equal(new Set(withR52.fixtures.map(f=>f.id)).size,236);
const oldById=new Map(corrected.fixtures.map(f=>[f.id,f]));
for(const f of withR52.fixtures){
 const old=oldById.get(f.id);
 assert.ok(old,"all IDs preserved");
 for(const k of ["draft_date","draft_time","draft_field","planning_venue","planning_date_confirmation",
  "planning_time_confirmation","planning_venue_confirmation","status","review_status","source_page"]){
  assert.equal(JSON.stringify(f[k]),JSON.stringify(old[k]),"R53 must not promote date/time/venue: "+f.id+" "+k);
 }
}
const byId=new Map(withR52.fixtures.map(f=>[f.id,f]));
const male10First=byId.get("petanque-p17-10-ปี-ชาย-010");
assert.equal(male10First.team_a_id,"rangkham");
assert.equal(male10First.team_b_id,"thungmasang");
const male10Semi=byId.get("petanque-p17-10-ปี-ชาย-030");
assert.equal(male10Semi.team_a_id,"wangkhaokaew");
assert.equal(male10Semi.team_b_id,"nongkum");
assert.ok(male10Semi.source_pair_text.includes("คู่ที่ 3")&&male10Semi.source_pair_text.includes("คู่ที่ 4"),"male10 semifinal feeders 3 and 4");
const female12Final=byId.get("petanque-p18-12-ปี-หญิง-042");
assert.equal(female12Final.team_a_id,"saohong");
assert.equal(female12Final.team_b_id,"wangdong");
const female8R50=byId.get("petanque-p17-8-ปี-หญิง-027");
assert.equal(female8R50.team_a_id,"nongkum");
assert.equal(female8R50.team_b_id,"nongkrathum");
const unverified=byId.get("petanque-p18-10-ปี-ชาย-039");
assert.equal(unverified.team_a_id,null,"unapproved male10 final remains unresolved");
assert.equal(unverified.team_b_id,null);
assert.throws(()=>corrections.NongkumApprovedPairsR52.apply(corrected),/R52/,"missing R50 fails closed");
assert.throws(()=>corrections.NongkumApprovedPairsR52.apply({...withR50,metadata:{...withR50.metadata,source_sha256:"changed"}}),/R52/);

assert.equal(corrected.fixtures.length,236,"exactly 236, preserving R20B duplicate exclusion");
assert.equal(new Set(corrected.fixtures.map(x=>x.id)).size,236,"stable unique fixture IDs");
assert.equal(corrected.fixtures.filter(x=>x.kind==="track_event").length,50);
assert.equal(corrected.fixtures.filter(x=>x.kind==="match").length,186);
assert.equal(D.CONTRACT.source_key,"r33-20261116-7ba60be1-fa3269b5");
function blobSha(content){
 const data=Buffer.from(content,"utf8");
 return createHash("sha1").update("blob "+data.length+"\0").update(data).digest("hex");
}
assert.equal(blobSha(rawText),D.CONTRACT.candidate_blob_sha,"R33 base candidate changed: update contract before use");
assert.equal(blobSha(read("js/program-corrections.js")),D.CONTRACT.corrections_blob_sha,"R33 correction source changed");
for(const f of corrected.fixtures){
 assert.ok(D.baseline(f),"all fixtures may be proposed");
 const fields=D.cleanFields(D.baseline(f));
 assert.equal(typeof fields.date,"string");
}
const f=corrected.fixtures.find(x=>x.sport_id==="volleyball"&&x.kind==="match");
const f2=corrected.fixtures.find(x=>x.sport_id==="takraw"&&x.kind==="match");
assert.ok(f && f2,"sports examples present");
const original=D.baseline(f);
const changed={...original,date:"2026-11-19",time:"10:30",field:"สนาม 2"};
const school=corrected.schools[0].id;
const person=D.assignment({
 person_name:"ครูตัวอย่างข้อมูลทดสอบ",school_id:school,role:"ผู้ตัดสิน",
 starts_at:"10:30",ends_at:"11:30"
},corrected.schools);
assert.equal(person.identity_status,"unverified_name_from_operator");
assert.equal(person.appointment_status,"draft_not_appointed");
const p1=D.proposal(f,changed,[person],"ผู้จัดเสนอแก้ตามเอกสารทดสอบ");
assert.equal(p1.status,"proposed_not_submitted");
assert.equal(p1.changes.date,"2026-11-19");
assert.equal(p1.changes.field,"สนาม 2");
assert.equal(p1.assignment_proposals.length,1);
assert.equal(p1.original.date,original.date);
assert.notEqual(p1.changes.date,original.date);
assert.throws(()=>D.date("2026-02-30"),/วันที่ไม่ถูกต้อง/);
assert.throws(()=>D.time("24:20"),/เวลาไม่ถูกต้อง/);
assert.throws(()=>D.proposal(f,original,[],"ไม่มีการแก้ไขใด"),/ยังไม่มีรายการ/);
assert.throws(()=>D.proposal(f,changed,[],"สั้น"),/อย่างน้อย 8/);
assert.throws(()=>D.assignment({person_name:"ทดสอบชื่อ",school_id:"invalid",role:"ผู้ตัดสิน",
  starts_at:"10:00",ends_at:"11:00"},corrected.schools),/กรุณาระบุชื่อ/);
assert.throws(()=>D.assignment({person_name:"ทดสอบชื่อ",school_id:school,role:"ผู้ตัดสิน",
  starts_at:"12:00",ends_at:"11:00"},corrected.schools),/เวลาสิ้นสุด/);
const p2=D.proposal(f2,{...D.baseline(f2),date:"2026-11-19",time:"10:35"},
 [{...person,role:"ผู้บันทึกผล",starts_at:"11:00",ends_at:"11:45"}],
 "ผู้จัดเสนอแก้ตามเอกสารทดสอบ");
assert.equal(D.conflicts([p1,p2]).length,1,"same school+name overlapping explicit duty windows");
const other={...p2,assignment_proposals:[{...person,school_id:corrected.schools[1].id}]};
assert.equal(D.conflicts([p1,other]).length,0,"same name different school not treated as same person");
const pkg=D.packageForReview([p1,p2]);
assert.equal(pkg.publication_status,"not_published");
assert.equal(pkg.record_status,"proposed_not_submitted");
assert.equal(pkg.requests.length,2);
assert.equal(pkg.warnings.length,1);
assert.equal(pkg.requests[0].source_pdf_page,p1.source_pdf_page);
assert.throws(()=>D.packageForReview([p1,p1]),/ซ้ำ/);
const html=read("schedule-manager.html");
const ui=read("js/r43-manager.js");
const styles=read("css/r43-manager.css");
const more=read("more.html");
const program=read("js/program.js");
for(const source of [ui,read("js/r43-schedule-draft.js"),program])
 assert.doesNotThrow(()=>new vm.Script(source),"JavaScript syntax");
for(const id of ["r43Sport","r43School","r43Matches","r43EditorPanel","r43ScheduleForm",
 "r43AddPerson","r43Download","r43Clear","mobileTabNav"])
 assert.ok(html.includes('id="'+id+'"'),"operator UI must include "+id);
assert.match(html,/r43-schedule-draft\.js/);
assert.match(html,/program-corrections\\.js/);
const hR20=html.indexOf("program-corrections.js"),hR50=html.indexOf("program-approved-pairs-r50.js"),
 hR52=html.indexOf("program-approved-pairs-r52.js"),hR43=html.indexOf("r43-manager.js");
assert.ok(hR20>=0&&hR20<hR50&&hR50<hR52&&hR52<hR43,"R43 must use R20→R50→R52 before loading manager");
assert.match(html,/id="r43SourceInfo"/);
assert.ok(ui.includes("NongkumApprovedPairsR50.apply(corrected)"));
assert.ok(ui.includes("NongkumApprovedPairsR52.apply(r50)"));
assert.ok(ui.includes("f.team_a_id?school(f.team_a_id)"),"resolved teams override old source placeholders");
assert.match(ui,/ไฟล์คำขอยังอ้างอิงรุ่นข้อมูลเดิม/);
assert.match(ui,/ยังไม่ผ่านการตรวจรุ่น R52/);

assert.match(html,/ยังไม่เปลี่ยนตารางแข่งขันจริง/);
assert.match(html,/ไม่บันทึกเข้าสู่ระบบ/);
assert.match(more,/href="\.\/schedule-manager\.html"/);
assert.match(program,/\.\/schedule-manager\.html\?fixture=/,"details link to draft, R34 card still handles results");
assert.match(ui,/state=\{data:null,selected:null,pending:new Map\(\),staff:new Map\(\)\}/);
assert.doesNotMatch(ui,/localStorage|sessionStorage|indexedDB|service_role|\.supabase\.co/i,
 "no persistence to browser storage or private API URLs in R43-A");
assert.doesNotMatch(ui,/method\s*:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i,
 "no write HTTP methods in R43-A");
assert.match(styles,/@media\(max-width:690px\)/);
assert.match(html,/aria-current="page"/);
assert.equal((html.match(/<a id="mobile(?:Program|Results|Gallery|More)Link"/g)||[]).length,4);
console.log("R53/R43-A PASS: 236 stable IDs, 21 R52 updates, original export contract/SHAs, no write API, mobile nav");
