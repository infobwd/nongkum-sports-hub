#!/usr/bin/env node
// R40-H static regression: no production account or student images.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const upload=read("js/upload-photos-r40.js"),review=read("js/review-photos-r40.js");
const uploadHtml=read("upload-photos.html"),reviewHtml=read("review-photos.html");
const css=read("css/activity-photos-r40h.css");
const edge=read("supabase/functions/nongkum-activity-photos/index.ts");
const sql=read("supabase/migrations/20261117063000_r40h_my_photo_status.sql");
for(const [path,source] of [["upload",upload],["review",review]]){
 new vm.Script(source,{filename:path+".js"});
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|service_role|meeting-evidence/i);
}
for(const id of ["photoSendSuccess","photoSuccessFixture","photoSuccessReference","photoSendMore",
  "photoViewMine","photoMinePanel","photoMineRefresh","photoMineList","photoMineStatus",
  "photoFixtureSelected","photoInlineError"]){
 assert.match(uploadHtml,new RegExp('id="'+id+'"'));
 assert.match(upload,new RegExp('\\$\\("'+id+'"\\)'));
}
for(const id of ["photoReviewTabs","photoReviewHeading"]){
 assert.match(reviewHtml,new RegExp('id="'+id+'"'));
}
assert.match(uploadHtml,/upload-photos-r40\.js\?v=r40h-1/);
assert.match(reviewHtml,/review-photos-r40\.js\?v=r40h-1/);
assert.match(upload,/showSendSuccess\(String\(ans\.id/);
assert.match(upload,/ui\.success\.focus/);
assert.match(upload,/ui\.form\.hidden=true/);
assert.match(upload,/loading\|\|compressing/);
assert.match(upload,/ui\.submit\.textContent="กำลังส่งภาพ/);
assert.match(upload,/ยังยืนยันไม่ได้ว่าส่งสำเร็จ/);
assert.match(upload,/const records=Array\.isArray\(answer\.items\)/);
assert.match(upload,/ui\.mineList\.replaceChildren\(\)/);
assert.match(upload,/await call\(PHOTOS,"mine"\)/);
assert.match(upload,/showFixtureLabel\(\)/);
assert.match(css,/text-overflow:ellipsis/);
assert.match(css,/#photoUploadForm\[hidden\]\{display:none!important\}/);
assert.match(css,/max-width:calc\(100vw - 40px\)/);
assert.match(review,/dataPhotoStatus|dataset\.photoStatus/);
assert.match(review,/categoryNames/);
assert.match(review,/errorInCard\(controls,errorText\("public_consent_required"\)/);
assert.match(review,/public_consent_checked:true/);
assert.match(review,/consent_checked:true/);
assert.match(review,/r\.image_b64/);
assert.match(review,/window\.confirm\(retryRemoval/);
assert.doesNotMatch(review,/window\.confirm\("ภาพนี้จะปรากฏต่อสาธารณะ/);
assert.match(edge,/if\(action==="mine"\)/);
assert.match(edge,/nongkum_activity_photo_my_submissions/);
assert.match(sql,/uploader_session_hash=v_hash/);
assert.match(sql,/editor_sessions/);
assert.match(sql,/expires_at>now\(\)/);
assert.match(sql,/revoke all on function public\.nongkum_activity_photo_my_submissions\(text\)/);
assert.match(sql,/to service_role/);
assert.doesNotMatch(sql,/storage_path|image_b64|uploaded_by|reviewed_by|consent_note/);
// All existing release gates continue: private upload, public release consent and revoke.
assert.match(read("supabase/migrations/20261116180000_r40g_public_activity_gallery.sql"),/public_consent_checked/);
assert.match(read("results.html"),/activity-media-r40g/);
console.log("R40-H PASS: receipt, mobile overflow, session status, reviewer UX, consent/privacy guards");
