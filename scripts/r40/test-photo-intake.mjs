#!/usr/bin/env node
/* R40: photo intake/security and public approved-only UI regression. No live DB edits. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const html=read("photos.html"),client=read("js/photos-r40.js");
const sql=read("supabase/migrations/20261116073000_r40_activity_photos.sql");
const edge=read("supabase/functions/nongkum-activity-photos/index.ts");
const publicLoader=read("js/activity-media-r39.js");
const resultsPage=read("results.html");
for(const file of ["js/photos-r40.js","js/activity-media-r39.js","js/results-renderers.js","js/results.js"])
 new vm.Script(read(file),{filename:file});
for(const id of ["photoLogin","photoPin","photoEditor","photoReviewer","photoFixture",
 "photoFile","photoConsent","photoQueue","photoUploadForm"])
 assert.match(html,new RegExp('id="'+id+'"'));
assert.match(resultsPage,/href="\.\/photos\.html"/);
assert.match(resultsPage,/activity-media-r39\.js\?v=r40-1/);
assert.match(resultsPage,/results-renderers\.js\?v=r40-1/);
assert.match(client,/photoCall\("upload"/);
assert.match(client,/photoCall\("approve"/);
assert.match(client,/photoCall\("reject"/);
assert.match(client,/photoCall\("preview"/);
assert.match(client,/\.toBlob\(resolve,"image\/webp"/);
assert.match(client,/Uint8Array\(await blob\.arrayBuffer\(\)\)/);
assert.match(client,/\.fixtures\?\.length!==236/);
assert.match(client,/NongkumProgramCorrections/);
assert.match(client,/photoConsent/);
assert.doesNotMatch(client+html,/SUPABASE_SERVICE_ROLE_KEY|service_role|meeting-evidence/);
assert.doesNotMatch(client,/storage\/v1\/object\/nongkum-activity-intake/);
assert.match(sql,/create table if not exists nongkum_sports\.activity_photos/);
assert.match(sql,/alter table nongkum_sports\.activity_photos enable row level security/);
assert.match(sql,/revoke all on function public\.nongkum_activity_gateway\(text,jsonb\) from public,anon,authenticated/i);
assert.match(sql,/grant execute on function public\.nongkum_activity_gateway\(text,jsonb\) to service_role/i);
assert.match(sql,/nongkum_sports\.editor_sessions/);
assert.match(sql,/nongkum_sports\.reviewer_sessions/);
assert.match(sql,/status='approved' and public_path is not null/);
assert.match(sql,/source_key=f\.source_key/);
assert.match(sql,/consent_verified/);
assert.match(sql,/bucket_id='nongkum-activity-intake'/);
assert.match(sql,/bucket_id='nongkum-activity-public'/);
assert.doesNotMatch(sql,/update\s+nongkum_sports\.result_submissions/i);
assert.match(edge,/readWebp\(bytes\)/);
assert.match(edge,/tag==="EXIF"\|\|tag==="XMP "/);
assert.match(edge,/await rpc\("preflight"/);
assert.match(edge,/await rpc\("register"/);
assert.match(edge,/await rpc\("approve_prepare"/);
assert.match(edge,/await rpc\("approve_commit"/);
assert.match(edge,/await rpc\("approve_cancel"/);
assert.match(edge,/if\(!token\)return reply/);
assert.match(edge,/await remove\(PUBLIC,publicPath\)/);
// Public media never reveals unreviewed image URLs, staff names, private paths or service keys.
const uuid="00000000-0000-4000-8000-000000000001";
const url="https://zprxvpfkvforoxrboqiv.supabase.co/storage/v1/object/public/nongkum-activity-public/photos/"+uuid+".webp";
const ctx={globalThis:{},AbortController,setTimeout,clearTimeout,
 fetch:async u=>u.includes("public-activity-media.json")
 ? {ok:true,json:async()=>({schema_version:1,approved_only:true,entries:[]})}
 : {ok:true,json:async()=>({ok:true,approved_only:true,photos:[
 {event_id:"athletics-p25-011-m",sport_id:"athletics",division:"ปฐมวัย ชาย",
  caption:"ภาพการแข่งขันกรีฑา",revision:1,src:url}
 ]})}};
new vm.Script(publicLoader).runInNewContext(ctx);
const verified=ctx.globalThis.NongkumActivityMedia.verified;
assert.ok(verified({status:"approved",consent_checked:true,
 event_id:"athletics-p25-011-m",sport_id:"athletics",division:"ปฐมวัย ชาย",
 revision:1,src:url,caption:"ภาพการแข่งขันกรีฑา"}));
assert.ok(!verified({status:"review",consent_checked:false,
 event_id:"athletics-p25-011-m",sport_id:"athletics",division:"ปฐมวัย ชาย",
 revision:1,src:url,caption:"ภาพการแข่งขันกรีฑา"}));
const map=await ctx.globalThis.NongkumActivityMedia.load();
assert.equal(map.size,1);
assert.equal(map.get("athletics-p25-011-m").src,url);
const renderRoot={Nongkum:{escapeHtml:x=>String(x??"").replace(/[&<>"']/g,
 ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}};
new vm.Script(read("js/results-renderers.js")).runInNewContext({globalThis:renderRoot});
const base=JSON.parse(read("data/public-results.json"));
const result={id:"result-athletics-p25-011-m",event_id:"athletics-p25-011-m",
 sport_id:"athletics",division:"ปฐมวัย ชาย",status:"approved",result_type:"ranking",
 rankings:[{rank:1,school_id:"nongkrathum"}]};
const card=renderRoot.NongkumResultsRender.card(result,base.schools,base.sports,new Map(),map);
assert.ok(card.includes(url),"Approved photo appears on the matching result card");
assert.ok(!card.includes("./"+url),"External public image path must not be prefixed with ./");
const wrong=renderRoot.NongkumResultsRender.card({...result,division:"12 ปี ชาย"},base.schools,base.sports,new Map(),map);
assert.doesNotMatch(wrong,/result-activity-photo/);
assert.equal(renderRoot.NongkumResultsRender.card({...result,status:"review"},base.schools,base.sports,new Map(),map),"");
console.log("R40 PASS: staff-only upload, separate reviewer approval, private buckets, approved-only public photos");
