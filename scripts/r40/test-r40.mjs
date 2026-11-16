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
assert.ok(upload.includes('["image/webp","image/jpeg"].includes(candidate.type)'));
assert.match(upload,/image_b64:b64/);
assert.match(review,/consent_checked:true/);
assert.match(review,/กำลังบันทึกการอนุญาต \(ยังไม่เผยแพร่\)/);
assert.ok(review.includes('img.src="data:"+r.mime_type'));
for(const source of [upload,review,uphtml,reviewHtml]){
 assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|service_role|meeting-evidence|\bpassword\s*:\s*["']/i);
}
for(const html of [uphtml,reviewHtml]){
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/activity-photos\.css\?v=r40-3|activity-photos\.css\?v=r40-4/);
}
assert.match(uphtml,/upload-photos-r40\.js\?v=r40-4/);
assert.match(uphtml,/id="photoRememberUploader" type="checkbox" checked/);
assert.match(uphtml,/id="photoForgetUploader" type="button"/);
assert.match(uphtml,/จำชื่อในเครื่องนี้/);
assert.match(css,/\.photo-name-settings/);
assert.match(upload,/ui\.rememberUploader\.checked\)rememberUploaderName\(ui\.uploader\.value\)/);
assert.match(upload,/clearRememberedUploaderName\(\)/);
const prefBegin=upload.indexOf('const UPLOADER_NAME_KEY=');
const prefEnd=upload.indexOf('function showLogin()',prefBegin);
assert.ok(prefBegin>0&&prefEnd>prefBegin,"uploader-name helper not found");
const savedValues=new Map();
let now=1800000000000;
const store={
 getItem:k=>savedValues.has(k)?savedValues.get(k):null,
 setItem:(k,v)=>savedValues.set(k,String(v)),
 removeItem:k=>savedValues.delete(k)
};
const prefBindings="\nglobalThis.__pref={rememberedUploaderName,rememberUploaderName,clearRememberedUploaderName,isUploaderRememberEnabled,setUploaderRememberEnabled};";
const preferenceContext={localStorage:store,Date:{now:()=>now},Number,JSON,String};
vm.runInNewContext(upload.slice(prefBegin,prefEnd)+prefBindings,preferenceContext);
const pref=preferenceContext.__pref;
assert.equal(pref.isUploaderRememberEnabled(),true,"remember by default");
assert.equal(pref.rememberedUploaderName(),"","no previous name");
pref.rememberUploaderName("  ครูผู้ส่ง ทดสอบ  ");
assert.equal(pref.rememberedUploaderName(),"ครูผู้ส่ง ทดสอบ","stored name restored");
const saved=JSON.parse(savedValues.get("nongkum-r40-uploader-name-v1"));
assert.deepEqual(Object.keys(saved).sort(),["name","saved_at"],"only name and timestamp persisted");
now+=29*24*60*60*1000;
assert.equal(pref.rememberedUploaderName(),"ครูผู้ส่ง ทดสอบ","valid within 30 days");
now+=2*24*60*60*1000;
assert.equal(pref.rememberedUploaderName(),"","name expires after 30 days");
assert.equal(savedValues.has("nongkum-r40-uploader-name-v1"),false,"expired name deleted");
pref.rememberUploaderName("ชื่อทดสอบ");
pref.setUploaderRememberEnabled(false);
pref.clearRememberedUploaderName();
assert.equal(pref.isUploaderRememberEnabled(),false,"opt-out persisted");
assert.equal(pref.rememberedUploaderName(),"","name cleared on opt-out");
pref.setUploaderRememberEnabled(true);
assert.equal(pref.isUploaderRememberEnabled(),true,"can opt back in");
savedValues.set("nongkum-r40-uploader-name-v1","{invalid-json");
assert.equal(pref.rememberedUploaderName(),"","corrupt local data ignored");
const denyStorage={getItem(){throw Error("blocked");},setItem(){throw Error("blocked");},removeItem(){throw Error("blocked");}};
const deniedContext={localStorage:denyStorage,Date:{now:()=>now},Number,JSON,String};
vm.runInNewContext(upload.slice(prefBegin,prefEnd)+prefBindings,deniedContext);
assert.equal(deniedContext.__pref.isUploaderRememberEnabled(),false,"blocked storage opts out");
assert.doesNotThrow(()=>deniedContext.__pref.rememberUploaderName("ทดสอบ"));
assert.equal(deniedContext.__pref.rememberedUploaderName(),"");
assert.doesNotThrow(()=>deniedContext.__pref.clearRememberedUploaderName());

assert.match(uphtml,/activity-photos\.css\?v=r40-4/);
assert.match(uphtml,/select2\.min\.js/);
assert.match(uphtml,/jquery\.min\.js/);
assert.match(uphtml,/sha512-2ImtlRlf2VVmiGZsjm9bEyhjGW4dU7B6/);
assert.match(uphtml,/id="photoFixtureSearch" type="search"/);
assert.match(upload,/function setupFixtureSearch\(\)/);
assert.match(upload,/typeof jq\.fn\.select2==="function"/);
assert.match(upload,/ui\.fixtureSearch\.hidden=false/);
assert.match(upload,/const entry=option\(ui\.fixture,item\.id,item\.label\)/);
assert.match(upload,/entry\.dataset\.search=item\.search/);
assert.match(upload,/f\.source_pair_text,f\.round,f\.division/);
assert.match(edge,/cleanJpegMetadata\(bytes\)/);
assert.match(edge,/import \{cleanJpegMetadata\} from "\.\/jpeg-clean\.ts"/);
assert.match(read(".github/workflows/r40-private-photo-qa.yml"),/deno test supabase\/functions\/nongkum-activity-photos\/jpeg-clean\.test\.ts/);
// Search matching must accept multiple terms in any order.
const mStart=upload.indexOf("function fixtureMatches(haystack,query){");
const mEnd=upload.indexOf("function populateFixtureOptions(",mStart);
assert.ok(mStart>0&&mEnd>mStart);
const matchCtx={String};
vm.runInNewContext(upload.slice(mStart,mEnd)+"\nglobalThis.match=fixtureMatches;",matchCtx);
const sample="วังด้ง รางขาม · ปฐมวัยชาย · วิ่ง 40 เมตร";
assert.equal(matchCtx.match(sample,"รางขาม วังด้ง"),true);
assert.equal(matchCtx.match(sample,"40 ชาย"),true);
assert.equal(matchCtx.match(sample,"80 หญิง"),false);

assert.match(uphtml,/WebP เป็นหลัก/);
assert.match(upload,/TARGET_IMAGE_BYTES=250000,MAX_IMAGE_BYTES=350000/);
assert.match(upload,/const qualities=\[0\.84,0\.76,0\.68,0\.60,0\.52\]/);
assert.match(upload,/webp\.type==="image\/webp"\?webp:await toBlob\(canvas,q,"image\/jpeg"\)/);
assert.match(uphtml,/id="photoCamera"[^>]*capture="environment"/);
assert.match(uphtml,/id="photoFile"[^>]*accept="image\/jpeg,image\/png,image\/webp,image\/heic,image\/heif"/);
assert.match(upload,/selectionId=0/);
assert.match(upload,/loading\|\|compressing/);
assert.match(upload,/ui\.camera\.disabled=true/);
assert.match(upload,/image\/heic/);
const fnConfig=read("supabase/config.toml");
for(const name of ["nongkum-results-editor","nongkum-results-reviewer","nongkum-activity-photos"]){
 assert.match(fnConfig,new RegExp("\\[functions\\."+name+"\\]\\s*verify_jwt\\s*=\\s*false"));
}
const privateUpload=read("supabase/functions/nongkum-activity-photos/private-upload.ts");
assert.match(edge,/import \{putPrivateImage\} from "\.\/private-upload\.ts"/);
assert.match(edge,/await putPrivateImage\(/);
assert.match(privateUpload,/body=new Uint8Array\(bytes\)\.buffer/);
assert.match(privateUpload,/bucket!=="nongkum-activity-intake"/);
assert.match(read(".github/workflows/r40-private-photo-qa.yml"),/deno test supabase\/functions\/nongkum-activity-photos\/private-upload\.test\.ts/);
assert.match(reviewHtml,/review-photos-r40\.js/);
assert.match(css,/min-height:44px/);
assert.match(read("results.html"),/href="\.\/upload-photos\.html"/);
assert.match(read("review-results.html"),/href="\.\/review-photos\.html"/);
const media=JSON.parse(read("data/public-activity-media.json"));
assert.equal(media.approved_only,true);
assert.deepEqual(media.entries,[],"uploading must not change public approved photos");
console.log("R40 PASS: separate roles, private WebP upload, consent review, and no instant publication");
