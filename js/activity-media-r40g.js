/* R40-G: read only media the organizer explicitly published.
 * Private R40 submissions and reviewer audit never enter this module. */
(function(root){
"use strict";
const previous=root.NongkumActivityMedia;
const endpoint="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-activity-photos";
const prefix="https://zprxvpfkvforoxrboqiv.supabase.co/storage/v1/object/public/nongkum-activity-public/";
const validPath=/^media\/[0-9a-f-]{36}\.(webp|jpg)$/;
let latest=[];
const validText=(x,max)=>typeof x==="string"&&x.length>0&&x.length<=max;
function checked(row){
 if(!row||!validText(row.id,40)||!validText(row.event_id,160)||
   !validText(row.sport_id,40)||!validText(row.division,160)||
   !validText(row.caption,120)||!validPath.test(row.object_path)||
   !["image/webp","image/jpeg"].includes(row.mime_type)||
   (row.mime_type==="image/webp"&&!row.object_path.endsWith(".webp"))||
   (row.mime_type==="image/jpeg"&&!row.object_path.endsWith(".jpg"))||
   (row.event_date!==null && row.event_date!==undefined &&
     (typeof row.event_date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(row.event_date)))||
   !validText(row.published_at,40)||!Number.isFinite(Date.parse(row.published_at)))return false;
 return true;
}
async function fetchPublic(){
 const r=await fetch(endpoint,{method:"GET",cache:"no-store",mode:"cors"});
 if(!r.ok)throw Error("public media unavailable");
 const data=await r.json();
 if(!data||data.ok!==true||!Array.isArray(data.items)||data.items.length>500)
   throw Error("invalid public media");
 const seen=new Set();
 const items=[];
 for(const entry of data.items){
   if(!checked(entry)||seen.has(entry.id))throw Error("invalid published photo");
   seen.add(entry.id);
   items.push(Object.freeze({
      id:entry.id,event_id:entry.event_id,sport_id:entry.sport_id,
      division:entry.division,caption:entry.caption,
      event_date:entry.event_date||null,published_at:entry.published_at,
      src:prefix+entry.object_path
   }));
 }
 // Stable cover choice: earliest published image for the fixture.
 items.sort((a,b)=>Date.parse(a.published_at)-Date.parse(b.published_at)||a.id.localeCompare(b.id));
 return items;
}
function group(items){
 const map=new Map();
 for(const image of items){
   const bucket=map.get(image.event_id);
   if(bucket){
     if(bucket.sport_id!==image.sport_id||bucket.division!==image.division)
       continue; // Reject cross-fixture mismatches rather than showing the wrong image.
     bucket.photos.push(image);
   }else{
     map.set(image.event_id,{
       sport_id:image.sport_id,division:image.division,src:image.src,
       caption:image.caption,photos:[image]
     });
   }
 }
 return map;
}
async function load(){
 try{
   latest=await fetchPublic();
   return group(latest);
 }catch(_){
   // R39's static, organizer-reviewed manifest remains as fail-safe fallback.
   const fallback=await previous.load();
   latest=[];
   for(const [event_id,image] of fallback){
     latest.push({event_id,sport_id:image.sport_id,division:image.division,
       caption:image.caption,src:"./"+image.src,event_date:null,
       published_at:"",id:event_id});
   }
   return fallback;
 }
}
async function list(){await load();return latest.slice();}
root.NongkumActivityMedia=Object.freeze({
 load,list,verified:previous.verified,checked
});
})(globalThis);
