/* R43-C: private assignment inheritance preview.
   Only verified person IDs, never inferred identity from names. */
(function(root){
 "use strict";
 const RANK=Object.freeze({sport:1,division:2,fixture:3});
 function applies(a,fixture){
   if(!a||!fixture||a.status!=="approved"||a.person_verified!==true)return false;
   if(!/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(a.person_id||"")))return false;
   if(!(a.role&&RANK[a.scope]))return false;
   if(a.scope==="sport")return a.scope_key===fixture.sport_id;
   if(a.scope==="division")return a.scope_key===fixture.sport_id+"/"+fixture.division;
   return a.scope_key===fixture.id;
 }
 function forFixture(approved,fixture){
   if(!Array.isArray(approved))throw Error("invalid_assignments");
   const matched=approved.filter(a=>applies(a,fixture));
   const topRole=new Map();
   for(const a of matched){
     const last=topRole.get(a.role)||0;
     if(RANK[a.scope]>last)topRole.set(a.role,RANK[a.scope]);
   }
   // A fixture-scoped override replaces only the same role, not every other role.
   return matched.filter(a=>RANK[a.scope]===topRole.get(a.role))
     .sort((a,b)=>String(a.role).localeCompare(String(b.role),"th")||
       String(a.person_id).localeCompare(String(b.person_id)));
 }
 function overlaps(approved){
   if(!Array.isArray(approved))throw Error("invalid_assignments");
   const rows=approved.filter(x=>x.status==="approved"&&x.person_verified===true);
   const warnings=[];
   for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
     const a=rows[i],b=rows[j];
     if(a.id&&a.id===b.id)continue;
     if(a.person_id!==b.person_id||a.date!==b.date)continue;
     if(typeof a.start!=="string"||typeof a.end!=="string"||
       typeof b.start!=="string"||typeof b.end!=="string")continue;
     if(a.start<b.end&&b.start<a.end){
       // Same exact inherited sport/day assignment may be duplicated as a projection.
       if(a.scope===b.scope&&a.scope_key===b.scope_key&&a.role===b.role &&
          a.start===b.start&&a.end===b.end)continue;
       warnings.push({person_id:a.person_id,date:a.date,
         a:a.id||a.scope_key,b:b.id||b.scope_key,kind:"verified_person_overlap"});
     }
   }
   return warnings;
 }
 root.NongkumR43Assignments=Object.freeze({forFixture,overlaps,applies,RANK});
})(globalThis);
