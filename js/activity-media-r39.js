/* R40: approved-only activity photos. Staff-uploaded photos are never fetched from private storage. */
(function(root){
"use strict";
let inFlight=null;
const PUBLIC="https://zprxvpfkvforoxrboqiv.supabase.co/storage/v1/object/public/nongkum-activity-public/";
const FEED="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-activity-photos?action=published";
const local=/^assets\/activity-approved\/[a-z0-9][a-z0-9-]*\.webp$/;
const remote=/^https:\/\/zprxvpfkvforoxrboqiv\.supabase\.co\/storage\/v1\/object\/public\/nongkum-activity-public\/photos\/[a-f0-9-]{36}\.webp$/;
function verified(item){
 return !!(item&&item.status==="approved"&&item.consent_checked===true&&
   typeof item.event_id==="string"&&item.event_id.length>0&&item.event_id.length<=160&&
   typeof item.sport_id==="string"&&item.sport_id.length<40&&
   typeof item.division==="string"&&item.division.length<=160&&
   Number.isInteger(item.revision)&&item.revision>=1&&
   typeof item.src==="string"&&(local.test(item.src)||remote.test(item.src))&&
   typeof item.caption==="string"&&item.caption.length<=120);
}
async function staticMedia(){
 const response=await fetch("./data/public-activity-media.json?v=r40-1",{cache:"no-store"});
 if(!response.ok)throw Error("Activity media manifest unavailable");
 const data=await response.json();
 if(data?.schema_version!==1||data.approved_only!==true||!Array.isArray(data.entries))
   throw Error("Unverified activity media manifest");
 const list=new Map();
 for(const item of data.entries){
   if(!verified(item)||!local.test(item.src)||list.has(item.event_id))throw Error("Invalid static activity media");
   list.set(item.event_id,{sport_id:item.sport_id,division:item.division,
     src:item.src,caption:item.caption,revision:item.revision});
 }
 return list;
}
async function liveMedia(){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),4200);
 try{
  const res=await fetch(FEED,{cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}});
  if(!res.ok)throw Error("Live activity photo feed unavailable");
  const data=await res.json();
  if(data?.ok!==true||data.approved_only!==true||!Array.isArray(data.photos)||data.photos.length>236)
    throw Error("Invalid live activity photo feed");
  const map=new Map();
  for(const raw of data.photos){
    const photo={...raw,status:"approved",consent_checked:true};
    if(!verified(photo)||!remote.test(photo.src)||map.has(photo.event_id))
      throw Error("Unverified live photo record");
    map.set(photo.event_id,{sport_id:photo.sport_id,division:photo.division,
      src:photo.src,caption:photo.caption,revision:photo.revision});
  }
  return map;
 }finally{clearTimeout(timeout);}
}
async function load(){
 if(inFlight)return inFlight;
 inFlight=(async()=>{
  // Local curated images remain a safe fallback when the API or network is unavailable.
  let selected=new Map();
  try{selected=await staticMedia();}catch(_){/* empty approved-only fallback */}
  try{for(const [id,item] of await liveMedia())selected.set(id,item);}
  catch(_){/* keep only previously curated images */}
  return selected;
 })().finally(()=>{inFlight=null;});
 return inFlight;
}
root.NongkumActivityMedia=Object.freeze({load,verified});
})(globalThis);
