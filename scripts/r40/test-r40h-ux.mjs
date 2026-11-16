#!/usr/bin/env node
// R40-H: source-level privacy, semantics and syntax regression. Never connects to production.
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const upload=read("js/upload-photos-r40.js");
const enhancer=read("js/upload-photos-r40h-ui.js");
const review=read("js/review-photos-r40.js");
const edge=read("supabase/functions/nongkum-activity-photos/index.ts");
const sql=read("supabase/migrations/20261116210000_r40h_my_photo_submissions.sql");
const uphtml=read("upload-photos.html"),revhtml=read("review-photos.html");
const css=read("css/activity-photos.css");
for(const [filename,source] of [["upload.js",upload],["r40h.js",enhancer],["review.js",review]])
 new vm.Script(source,{filename});
for(const id of ["photoSendSuccess","photoSuccessReceipt","photoSendAgain","photoMinePanel",
 "photoMineRefresh","photoMineList","photoFixtureSummary","photoSendProgress"])
 assert.match(uphtml,new RegExp('id="'+id+'"'),id+" required");
assert.match(uphtml,/role="status" aria-live="polite"/);
assert.match(uphtml,/upload-photos-r40h-ui\.js\?v=r40h-1/);
assert.doesNotMatch(uphtml,/id="photoConfirm"/,"Uploader consent cannot pretend to replace reviewer rights approval");
assert.match(upload,/new CustomEvent\("nongkum:photo-uploaded"/);
assert.match(upload,/needsStatusCheck=true/);
assert.match(upload,/ui\.submit\.disabled=!compressed\|\|needsStatusCheck/);
assert.doesNotMatch(upload,/ui\.confirm\.checked/);
assert.match(enhancer,/r\.items|data\.items/);
assert.match(enhancer,/Authorization:"Bearer "\+token/);
assert.match(enhancer,/nongkum:photo-status-checked/);
assert.match(enhancer,/ui\.form\.hidden=true/);
assert.match(enhancer,/ui\.success\.hidden=false/);
assert.match(enhancer,/ui\.success\.focus/);
assert.match(sql,/where uploader_session_hash=v_hash and status <> 'cancelled'/);
assert.match(sql,/nongkum_sports\.editor_sessions/);
assert.match(sql,/revoked_at is null and expires_at>now\(\)/);
assert.match(sql,/revoke all on function public\.nongkum_activity_photo_my_uploads_gateway\(jsonb\)/);
assert.match(sql,/grant execute on function public\.nongkum_activity_photo_my_uploads_gateway\(jsonb\)/);
assert.match(sql,/to service_role/);
assert.doesNotMatch(sql,/storage_path|public_object_path|public_consent_note|reviewed_by/);
assert.match(edge,/async function mySubmissions/);
assert.match(edge,/if\(action==="mine"\)/);
assert.match(edge,/\/rpc\/nongkum_activity_photo_my_uploads_gateway/);
assert.match(revhtml,/id="photoReviewFeedback"/);
assert.match(review,/reviewedImages\.has\(item\.id\)/,"Reviewer must preview before approving");
assert.match(review,/public_consent_checked:true/);
assert.match(review,/consent_checked:true/);
assert.match(review,/showFeedback/);
assert.doesNotMatch(review,/window\.confirm\("ภาพนี้จะปรากฏต่อสาธารณะ/);
assert.match(review,/เผยแพร่แล้ว/);
assert.match(css,/text-overflow:ellipsis/);
assert.match(css,/\.photo-send-success/);
assert.match(css,/\.photo-review-group/);
for(const source of [uphtml,revhtml,enhancer,upload,review]){
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|service_role|meeting-evidence|\bPIN_HASH\b/);
}
console.log("R40-H PASS: clear server-confirmed receipt, scoped-status rights, simplified reviewer and iOS-safe selection");
