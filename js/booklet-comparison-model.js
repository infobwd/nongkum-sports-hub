/* R24-D: immutable evidence-only comparison model. No inferred approvals. */
(function(root) {
"use strict";
const EXCLUDED = "football-p07-มัธยมหญิง-020-repeated-final";
const reviewStates = Object.freeze(["MATCHED","DIFFERENT","NEEDS_REVIEW","UNAVAILABLE"]);
const originalDocs = Object.freeze({
  v2:"program-v2",v3:"committee-v3",integrated:"integrated-v42i10-g2"
});
function validRect(r){
 return Array.isArray(r)&&r.length===4&&r.every(n=>Number.isFinite(n)) &&
     r[0]>=0&&r[0]<r[2]&&r[2]<=1&&r[1]>=0&&r[1]<r[3]&&r[3]<=1;
}
function validSource(catalog,raw,roster,programMap,committeeMap){
 if(!catalog||catalog.schema_version!==1||!Array.isArray(catalog.documents)||catalog.documents.length!==3)return false;
 const docs=Object.fromEntries(catalog.documents.map(d=>[d.version_id,d]));
 const a=docs[originalDocs.v2],b=docs[originalDocs.v3],c=docs[originalDocs.integrated];
 if(!a||!b||!c||a.page_count!==41||b.page_count!==64||c.page_count!==155||
    (c.access_mode!=="same_origin_reader"||c.viewer_route!=="./booklet-drive-viewer.html"||c.source_path!=="assets/souvenir-2569-v42i10-g2-155pages.pdf")||c.approved_at!==null||
    catalog.audit_155?.anchor_count!==486||catalog.audit_155?.position_parity_against_baseline!==486||
    catalog.audit_155?.publication_approved!==false||
    raw?.schema_version!==3||raw?.metadata?.source_status!=="revised_pdf_draft"||
    !Array.isArray(raw.fixtures)||raw.fixtures.length!==237||
    roster?.entries?.length!==250||roster?.revision!==committeeMap?.roster_revision||
    roster?.publication_status!=="draft_names_for_school_verification_only_not_approved_appointments"||
    programMap?.source_pdf_pages!==41||programMap?.source_sha256!==a.pdf_revision_sha256||
    programMap?.qa?.active_total!==236||programMap?.qa?.unresolved!==0||
    committeeMap?.source_pdf_pages!==64||committeeMap?.source_sha256!==b.pdf_revision_sha256||
    committeeMap?.qa?.total!==250||committeeMap?.qa?.unresolved!==0)return false;
 const fixtures=raw.fixtures.filter(f=>f.id!==EXCLUDED);
 if(fixtures.length!==236||!programMap.entries||!committeeMap.entries||
    Object.keys(programMap.entries).length!==236||Object.keys(committeeMap.entries).length!==250)return false;
 const keys=new Set();
 for(const row of fixtures) {
   const anchor=programMap.entries[row.id];
   const pg=Number(row.source_pdf?.page||row.source_page);
   if(!anchor||anchor.page!==pg||anchor.number!==String(row.source_match_no)||
      anchor.sport_id!==row.sport_id||anchor.kind!==row.kind||
      anchor.division!==row.division||!validRect(anchor.rect)||keys.has(row.id))return false;
   keys.add(row.id);
 }
 for(const row of roster.entries) {
   const anchor=committeeMap.entries[row.id];
   if(!anchor||anchor.page!==row.pdf_page||anchor.number!==row.number||
      anchor.name!==row.name||!validRect(anchor.rect)||keys.has(row.id))return false;
   keys.add(row.id);
 }
 return keys.size===486;
}
function build(catalog,raw,roster,programMap,committeeMap){
 if(!validSource(catalog,raw,roster,programMap,committeeMap))throw Error("source_revision_or_anchor_mismatch");
 const active=raw.fixtures.filter(f=>f.id!==EXCLUDED);
 const issues=active.map(f=>({
   id:f.id,kind:f.kind,sport_id:f.sport_id,division:f.division,
   number:String(f.source_match_no),
   pair:String(f.source_pair_text||""),
   v2_page:programMap.entries[f.id].page,
   qa_count:Array.isArray(f.qa_flags)?f.qa_flags.length:0,
   date_source:String(f.source_pdf?.source_date_text||""),
   time_source:String(f.source_pdf?.source_time||""),
   date_confirmation:f.planning_date_confirmation==="confirmed"?"confirmed":"pending",
   time_confirmation:f.planning_time_confirmation==="confirmed"?"confirmed":"pending",
   content_state:"NEEDS_REVIEW",
   anchor_state:"ANCHOR_VERIFIED",
   note:"ตรวจคู่/รายการกับเอกสารทั้งสองฉบับก่อนแจ้งผู้จัด"
 }));
 const bySport={};
 for(const r of issues){
   const s=bySport[r.sport_id]||(bySport[r.sport_id]={total:0,qa:0,pending:0});
   s.total++;
   if(r.qa_count)s.qa++;
   if(r.content_state==="NEEDS_REVIEW")s.pending++;
 }
 const committeeFlagRows=roster.entries.filter(r=>Array.isArray(r.flags)&&r.flags.length).length;
 return Object.freeze({
   revision:catalog.revision,
   total_records:issues.length+roster.entries.length,
   counts:Object.freeze({
     fixtures:issues.length,committee:roster.entries.length,
     v2_anchors:issues.length,v3_anchors:roster.entries.length,
     integrated_anchors:catalog.audit_155.anchor_count,
     matched:0,different:0,needs_review:issues.length+roster.entries.length,
     unavailable:0,committee_flag_rows:committeeFlagRows
   }),
   bySport,issues,
   source_note:"ตรวจพบตำแหน่งอ้างอิง ไม่ได้ตรวจยืนยันว่าข้อความระหว่างเอกสารทุกช่องตรงกัน"
 });
}
function issueText(item){
 if(!item||item.content_state!=="NEEDS_REVIEW")throw Error("not_a_review_item");
 return ["มิตรภาพเกมส์ 2569 · แจ้งตรวจเทียบเอกสาร (ยังไม่รับรอง)",
  "รหัสรายการ: "+item.id,
  "กีฬา/รุ่น: "+item.sport_id+" / "+item.division,
  "คู่/รายการ: "+item.number,
  "เอกสาร V2 หน้า: "+item.v2_page,
  "เอกสารฉบับรวม 155 หน้า: กรุณาตรวจจากไฟล์ของผู้มีสิทธิ์",
  "สถานะ: ยังไม่ได้ตรวจเทียบข้อความรายช่องหรือรับรองโดยผู้จัด",
  "โปรดระบุรายการข้อความที่ต่างและแนบหลักฐานให้ผู้รับผิดชอบตรวจรับแยก"].join("\n");
}
root.NongkumBookletReconcile=Object.freeze({validSource,build,issueText,reviewStates});
})(typeof globalThis!=="undefined"?globalThis:window);
