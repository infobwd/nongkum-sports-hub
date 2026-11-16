#!/usr/bin/env node
// R40 — privacy/security contract, not a substitute for live permission testing.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const sql=read("supabase/migrations/20261116074000_r40_activity_upload_private.sql");
const edge=read("supabase/functions/nongkum-activity-photos/index.ts");
const upload=read("js/upload-photos-r40.js");
const review=read("js/review-photos-r40.js");
const uphtml=read("upload-photos.html");
const reviewHtml=read("review-photos.html");
const css=read("css/activity-photos.css");
for(const [name,source] of [["upload",upload],["review",review]])new vm.Script(source,{filename:name+".js"});
assert.equal((sql.match(/create or replace function public\.nongkum_activity_photo_gateway\(/g)||[]).length,1);
assert.equal((sql.match(/\$r40\$/g)||[]).length,2,"single complete plpgsql body");
assert.match(sql,/insert into storage\.buckets/);
assert.match(sql,/nongkum-activity-intake/);
assert.match(sql,/values \('nongkum-activity-intake','nongkum-activity-intake',false,350000/);
assert.ok(sql.includes("allowed_mime_types=array['image/webp','image/jpeg']"));
assert.match(sql,/alter table nongkum_sports\.activity_photo_submissions enable row level security/);
assert.match(sql,/revoke all on nongkum_sports\.activity_photo_submissions from public,anon,authenticated/);
assert.match(sql,/revoke all on function public\.nongkum_activity_photo_gateway\(text,jsonb\) from public,anon,authenticated/);
assert.match(sql,/grant execute on function public\.nongkum_activity_photo_gateway\(text,jsonb\) to service_role/);
assert.match(sql,/join public\.nongkum_schedule_active/);
assert.match(sql,/status in \('uploading','review','approved','rejected','cancelled'\)/);
assert.ok(sql.indexOf("if p_action='queue'")<sql.indexOf("if coalesce(p_data->>'id'"),
 "queue requests must not require a specific photo ID");
assert.match(sql,/uploader_session_hash=v_hash/);
assert.match(sql,/nongkum_sports\.editor_sessions/);
assert.match(sql,/nongkum_sports\.reviewer_sessions/);
assert.match(sql,/consent_checked=true,consent_note=v_reason/);
assert.match(sql,/private_awaiting_publication/);
assert.doesNotMatch(sql,/meeting-evidence|nongkum_published_results|insert into storage\.objects/i);
assert.match(edge,/ORIGINS=new Set\(\["https:\/\/infobwd\.github\.io"\]\)/);
assert.match(edge,/JSON_LIMIT=510000/);
assert.match(edge,/const LIMIT=350000/);
assert.match(edge,/fourcc\(bytes,0\)!=="RIFF"/);
assert.match(edge,/name==="VP8 "/);
assert.match(edge,/name==="VP8L"/);
assert.ok(edge.includes('mime:"image/jpeg"'));
assert.ok(sql.includes("mime_type in ('image/webp','image/jpeg')"));
assert.ok(upload.includes('toBlob(canvas,q,"image/jpeg")'));
assert.match(edge,/else throw Error\("invalid_image"\)/);
assert.match(edge,/nongkum_activity_photo_gateway/);
assert.match(edge,/Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
assert.match(edge,/\/storage\/v1\/object\/authenticated\//);
assert.match(edge,/return reply\(\{ok:true,id,status:"review"/);
assert.doesNotMatch(edge,/storage\/v1\/object\/public\//);
assert.match(upload,/nongkum-r34-editor-session-v1/);
assert.match(review,/nongkum-r37-reviewer-session-v1/);
assert.match(upload,/canvas\.toBlob/);
assert.match(upload,/file\.size>18000000/);
assert.ok(upload.includes('["image/webp","image/jpeg"].includes(blob.type)'));
assert.match(upload,/image_b64:b64/);
assert.match(review,/consent_checked:true/);
assert.match(review,/กำลังบันทึกการอนุญาต \(ยังไม่เผยแพร่\)/);
assert.ok(review.includes('img.src="data:"+r.mime_type'));
for(const source of [upload,review,uphtml,reviewHtml]){
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|service_role|meeting-evidence|\bpassword\s*:\s*["']/i);
}
for(const html of [uphtml,reviewHtml]){
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/activity-photos\.css\?v=r40-1/);
}
assert.match(uphtml,/accept="image\/jpeg,image\/png,image\/webp"/);
assert.match(reviewHtml,/review-photos-r40\.js/);
assert.match(css,/min-height:44px/);
assert.match(read("results.html"),/href="\.\/upload-photos\.html"/);
assert.match(read("review-results.html"),/href="\.\/review-photos\.html"/);
const media=JSON.parse(read("data/public-activity-media.json"));
assert.equal(media.approved_only,true);
assert.deepEqual(media.entries,[],"uploading must not change public approved photos");
console.log("R40 PASS: separate roles, private WebP upload, consent review, and no instant publication");
