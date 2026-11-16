/* R39: public display catalog for organizer-reviewed activity photos only.
 * Never fetch original Drive URLs, evidence photographs or private upload APIs. */
(function(root){
 "use strict";
 let pending=null;
 const assetPattern=/^assets\/activity-approved\/[a-z0-9][a-z0-9-]*\.webp$/;
 function verified(item){
   return item&&item.status==="approved"&&item.consent_checked===true&&
     typeof item.event_id==="string"&&item.event_id.length>0&&item.event_id.length<=160&&
     typeof item.sport_id==="string"&&item.sport_id.length<40&&
     typeof item.division==="string"&&item.division.length<=160&&
     Number.isInteger(item.revision)&&item.revision>=1&&
     typeof item.src==="string"&&assetPattern.test(item.src)&&
     typeof item.caption==="string"&&item.caption.length<=120;
 }
 async function load(){
   if(pending)return pending;
   pending=(async()=>{
     const response=await fetch("./data/public-activity-media.json?v=r39-1",{cache:"no-store"});
     if(!response.ok)throw Error("Activity images unavailable");
     const data=await response.json();
     if(data?.schema_version!==1||data.approved_only!==true||!Array.isArray(data.entries))
       throw Error("Unverified activity image catalog");
     const map=new Map();
     for(const item of data.entries){
       if(!verified(item)||map.has(item.event_id))throw Error("Invalid or duplicate public activity image");
       map.set(item.event_id,{sport_id:item.sport_id,division:item.division,
         src:item.src,caption:item.caption,revision:item.revision});
     }
     return map;
   })().catch(err=>{pending=null;throw err;});
   return pending;
 }
 root.NongkumActivityMedia=Object.freeze({load,verified});
})(globalThis);
