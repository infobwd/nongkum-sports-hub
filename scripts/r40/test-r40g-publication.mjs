#!/usr/bin/env node
/* R40-G: synthetic public-photo regression. Never uses student images, PINs or production data. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const source=read("js/activity-media-r40g.js");
const r39=read("js/activity-media-r39.js");
const renderer=read("js/results-renderers.js");
const gallery=read("js/activity-gallery-r40g.js");
const migration=read("supabase/migrations/20261116180000_r40g_public_activity_gallery.sql");
const edge=read("supabase/functions/nongkum-activity-photos/index.ts");
for(const [name,contents] of [["media",source],["r39",r39],["renderer",renderer],["gallery",gallery]])
  new vm.Script(contents,{filename:name+".js"});
const idA="11111111-2222-4333-8444-555555555555";
const idB="66666666-7777-4888-9999-aaaaaaaaaaaa";
const entries=[
 {id:idA,event_id:"test-fixture",sport_id:"petanque",division:"12 ปี ชาย",
  caption:"ภาพทดสอบที่ไม่ใช่บุคคลจริง",mime_type:"image/webp",
  object_path:"media/"+idA+".webp",event_date:"2026-11-16",published_at:"2026-11-16T07:00:00Z"},
 {id:idB,event_id:"test-fixture",sport_id:"petanque",division:"12 ปี ชาย",
  caption:"ภาพทดสอบอีกภาพ",mime_type:"image/jpeg",
  object_path:"media/"+idB+".jpg",event_date:"2026-11-16",published_at:"2026-11-16T08:00:00Z"}
];
const fakeStatic={schema_version:1,approved_only:true,entries:[]};
async function contextWithFeed(feed,ok=true){
  const calls=[];
  const context={Map,Set,Date,Number,Object,String,Array,console,
    fetch:async (url,opts)=>{
       calls.push({url,opts});
       if(String(url).includes("public-activity-media.json"))return {ok:true,json:async()=>fakeStatic};
       return {ok,json:async()=>feed};
    }};
  vm.createContext(context);
  new vm.Script(r39).runInContext(context);
  new vm.Script(source).runInContext(context);
  return {api:context.NongkumActivityMedia,calls};
}
{
 const {api,calls}=await contextWithFeed({ok:true,items:entries});
 const map=await api.load();
 assert.equal(map.size,1);
 assert.equal(map.get("test-fixture").photos.length,2,"multiple approved images per fixture");
 assert.equal(map.get("test-fixture").src.endsWith(idA+".webp"),true,"oldest published is cover");
 assert.equal((await api.list()).length,2,"daily album retains every approved photo");
 assert.ok(calls.every(c=>!c.opts?.headers?.Authorization),"public reads use no private reviewer token");
}
{
 const bad=[...entries,{...entries[1],id:"third",object_path:"uploads/private.jpg"}];
 const {api}=await contextWithFeed({ok:true,items:bad});
 assert.equal((await api.load()).size,0,"fail closed to R39 when feed contains private path");
 assert.equal((await api.list()).length,0,"invalid data never appears in gallery");
}
{
 const {api}=await contextWithFeed({ok:false,error:"unavailable"},false);
 assert.equal((await api.load()).size,0,"safe fallback when public API unavailable");
}
{
 const {api}=await contextWithFeed({ok:true,items:[{...entries[0],status:"review",
   object_path:"uploads/"+idA+".webp"}]});
 assert.equal((await api.load()).size,0,"no private intake images shown");
}
{
 const {api}=await contextWithFeed({ok:true,items:entries});
 const media=await api.load();
 const root={Nongkum:{escapeHtml: s=>String(s??"").replace(/[&<>"']/g,c=>(
   {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}};
 const ctx={globalThis:root,encodeURIComponent};
 vm.createContext(ctx);
 new vm.Script(renderer).runInContext(ctx);
 const r={id:"result-test",status:"approved",event_id:"test-fixture",sport_id:"petanque",
  division:"12 ปี ชาย",result_type:"ranking",rankings:[{rank:1,school_id:"school-test"}]};
 const html=root.NongkumResultsRender.card(r,[{id:"school-test",short:"ทดสอบ"}],
  [{id:"petanque",name:"เปตอง",emoji:""}],new Map(),media);
 assert.match(html,/nongkum-activity-public\/media/);
 assert.match(html,/ดูอีก 1 ภาพ/);
 assert.match(html,/activity-photos.html\?event=test-fixture/);
 assert.doesNotMatch(root.NongkumResultsRender.card({...r,status:"review"},[],[],new Map(),media),/result-activity-photo/);
 assert.doesNotMatch(root.NongkumResultsRender.card({...r,sport_id:"football"},[],[],new Map(),media),/result-activity-photo/);
}
assert.match(read("results.html"),/activity-media-r40g\.js\?v=/);
assert.match(read("activity-photos.html"),/id="photoDate"/);
assert.match(read("activity-photos.html"),/id="photoSport"/);
assert.match(read("activity-photos.html"),/galleryViewer/);
assert.match(gallery,/event_date/);
assert.match(gallery,/showModal\(\)/);
assert.match(migration,/publication_status text not null default 'private'/);
assert.match(migration,/public_consent_checked/);
assert.match(migration,/v_item\.publication_status not in \('private','failed'\)/);
assert.match(migration,/create policy r40g_published_read/);
assert.match(migration,/revoke all on function public\.nongkum_activity_photo_publication_gateway/);
assert.match(migration,/to service_role/);
assert.match(migration,/delete from public\.nongkum_public_activity_photos where id=v_id/);
assert.match(migration,/status='approved',reviewed_by=v_reviewer/);
assert.doesNotMatch(migration,/meeting-evidence|nongkum_published_results/);
assert.match(edge,/if\(req\.method==="GET"\)/);
assert.match(edge,/async function publishedFeed/);
assert.match(edge,/async function deletePublic/);
assert.match(edge,/publicationRpc\("prepare"/);
assert.match(edge,/publicationRpc\("finish"/);
assert.match(edge,/publicationRpc\("revoke"/);
assert.match(edge,/PUBLIC_BUCKET="nongkum-activity-public"/);
assert.doesNotMatch(source,/private_path|consent_note|reviewed_by|uploaded_by|SUPABASE_SERVICE_ROLE_KEY/);
console.log("R40-G PASS: 2-image gallery, cover card, private fail-closed, publish/revoke boundaries");
