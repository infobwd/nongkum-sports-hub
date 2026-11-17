/* R43-D: deterministic, private REVIEW preview. Never activates R33 or publishes names.
   Do not infer any schedule confirmation from bracket links or a published result. */
(function(root){
 "use strict";
 const SCHEMA="nongkum-r43-release-preview-v1";
 const ALLOWED=new Set(["date","time","field","venue"]);
 function date(s){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
   const [y,m,d]=s.split("-").map(Number);
   const v=new Date(Date.UTC(y,m-1,d));
   return v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d;
 }
 function validateChange(changes){
   if(!changes||typeof changes!=="object"||Array.isArray(changes))throw Error("invalid_changes");
   const keys=Object.keys(changes);
   if(!keys.length||keys.some(k=>!ALLOWED.has(k)))throw Error("invalid_fields");
   for(const [k,v] of Object.entries(changes)){
     if(typeof v!=="string"||v.length>200||/[\x00-\x1f\x7f]/.test(v))
       throw Error("invalid_value");
     if(k==="date"&&!date(v))throw Error("invalid_date");
     if(k==="time"&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))throw Error("invalid_time");
     if((k==="field"||k==="venue")&&!v.trim())throw Error("empty_venue");
   }
   return changes;
 }
 function prepare(program,review,approvedIds,contract){
   if(!program||program.fixtures?.length!==236||!review||
       review.ok!==true||review.status!=="approved_not_published"||
       review.source_key!==contract.source_key||!Array.isArray(review.schedule_changes))
     throw Error("source_not_verified");
   if(!Array.isArray(approvedIds)||approvedIds.some(x=>typeof x!=="string"))
     throw Error("approved_result_lookup_missing");
   const protectedIds=new Set(approvedIds);
   const fixtures=new Map(program.fixtures.map(f=>[f.id,f]));
   if(fixtures.size!==236)throw Error("fixture_ids_changed");
   const seen=new Set(),patches=[];
   for(const p of review.schedule_changes){
     if(!p||typeof p.fixture_id!=="string"||!fixtures.has(p.fixture_id)||
        seen.has(p.fixture_id)||!/^[0-9a-f-]{36}$/i.test(String(p.request_id||"")))
       throw Error("unverified_fixture_or_duplicate");
     seen.add(p.fixture_id);
     if(protectedIds.has(p.fixture_id))throw Error("approved_result_lock");
     const changes=validateChange(p.changes);
     const original=fixtures.get(p.fixture_id);
     const before={
       date:original.planning_date_confirmation==="confirmed"?(original.planning_date||""):
          (original.draft_date||original.source_pdf?.source_date_iso||""),
       time:original.planning_time_confirmation==="confirmed"?(original.planning_time||""):
          (original.draft_time||original.source_pdf?.source_time||""),
       field:original.planning_field_confirmation==="confirmed"?(original.planning_field||""):
          (original.draft_field||original.source_pdf?.source_field||""),
       venue:original.planning_venue||""
     };
     if(Object.keys(changes).every(k=>before[k]===changes[k]))throw Error("no_effect");
     patches.push({
       fixture_id:p.fixture_id,source_sport_id:original.sport_id,
       source_kind:original.kind,approval_request_id:p.request_id,
       before,approved_changes:{...changes}
     });
   }
   return {
     schema:SCHEMA,publication_status:"candidate_not_published",
     base_source_key:contract.source_key,
     candidate_blob_sha:contract.candidate_blob_sha,
     corrections_blob_sha:contract.corrections_blob_sha,
     total_source_fixtures:236,total_approved_schedule_changes:patches.length,
     requires:["independent_source_approval","R32_result_reconciliation",
       "R33_versioned_import","GitHub_PR_review_and_merge","Pages_live_check",
       "booklet_reconciliation","mobile_acceptance"],
     warning:"ห้ามเผยแพร่ไฟล์นี้โดยตรง; ต้องตรวจสูจิบัตร ผัง และผล R32 ก่อนเปิดรุ่นจริง",
     patches
   };
 }
 root.NongkumR43Release=Object.freeze({prepare,validateChange,SCHEMA});
})(globalThis);
