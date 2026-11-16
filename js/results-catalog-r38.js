/* R38: non-authoritative display labels joined by exact source fixture/event id.
 * Results remain R32 approved-only; this module never modifies or publishes results. */
(function(root){
 "use strict";
 let promise=null;
 async function load(){
   if(promise)return promise;
   promise=(async()=>{
     const response=await fetch("./data/program-from-pdf-2569-20261104-draft.json?result-catalog=r38",{cache:"force-cache"});
     if(!response.ok)throw Error("Competition source unavailable");
     const raw=await response.json();
     const corrected=root.NongkumProgramCorrections?.apply(raw);
     if(!corrected||corrected.fixtures?.length!==236||corrected.metadata?.all_data_approved!==false)
       throw Error("Competition source not validated");
     const catalog=new Map();
     for(const f of corrected.fixtures){
       if(!f||typeof f.id!=="string"||typeof f.sport_id!=="string")continue;
       if(f.kind!=="track_event"||typeof f.name!=="string"||!f.name.trim())continue;
       if(catalog.has(f.id))throw Error("Duplicate event ID in competition source");
       catalog.set(f.id,{sport_id:f.sport_id,division:f.division||"",name:f.name.trim()});
     }
     return catalog;
   })().catch(err=>{promise=null;throw err;});
   return promise;
 }
 root.NongkumResultsCatalog=Object.freeze({load});
})(globalThis);
