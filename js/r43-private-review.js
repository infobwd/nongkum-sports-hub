/* R43-B/C: authenticated private staging console. No token/password persistence.
   Fail CLOSED unless separately provisioned public Auth configuration is present. */
(function(root){
 "use strict";
 const el=id=>document.getElementById(id),D=root.NongkumR43Draft;
 const status=el("r43PrivateStatus");
 const state={cfg:null,accessToken:"",roles:null,program:null,people:[],assignments:[]};
 const ROLES=D?.ROLES||[];
 const ID_RE=/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 const note=(value,bad=false)=>{status.textContent=value;status.style.color=bad?"#98431c":"";};
 function add(parent,tag,text,klass=""){
   const n=document.createElement(tag);if(text!==undefined)n.textContent=text;
   if(klass)n.className=klass;parent.appendChild(n);return n;
 }
 function btn(parent,label,onClick){
   const b=add(parent,"button",label,"r43-secondary");b.type="button";b.addEventListener("click",onClick);return b;
 }
 function option(select,value,label){
   const o=document.createElement("option");o.value=value;o.textContent=label;select.appendChild(o);
 }
 function goodConfig(c){
   return c&&c.enabled===true&&
     c.supabase_url==="https://zprxvpfkvforoxrboqiv.supabase.co"&&
     c.edge_url===c.supabase_url+"/functions/v1/nongkum-schedule-admin"&&
     typeof c.publishable_key==="string"&&c.publishable_key.startsWith("sb_publishable_")&&
     c.publishable_key.length>=24;
 }
 async function api(action,data={}){
   if(!state.cfg||!state.accessToken)throw Error("กรุณาเข้าสู่ระบบก่อน");
   const r=await fetch(state.cfg.edge_url,{method:"POST",cache:"no-store",headers:{
     "Content-Type":"application/json","Authorization":"Bearer "+state.accessToken
   },body:JSON.stringify({action,...data})});
   const v=await r.json().catch(()=>null);
   if(!v||typeof v.ok!=="boolean")throw Error("ติดต่อระบบตรวจสิทธิ์ไม่ได้");
   if(!v.ok)throw Error({
     forbidden:"ไม่มีสิทธิ์ดำเนินการ",invalid_or_forbidden:"ไม่มีสิทธิ์หรือข้อมูลไม่ถูกต้อง",
     unauthenticated:"สิทธิ์หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",stale:"ข้อมูลถูกเปลี่ยน กรุณารีเฟรช",
     source_changed:"ข้อมูลตารางเปลี่ยนรุ่น กรุณาหยุดแก้และตรวจสอบ",
     approved_result_lock:"รายการนี้มีผลรับรองแล้ว ต้องตรวจผลกระทบก่อน",
     duty_overlap:"มีกรรมการคนเดียวกันทำหน้าที่เวลาทับซ้อน",
     duty_overlap_within_request:"มีกรรมการคนเดียวกันทำหน้าที่เวลาทับซ้อนในคำขอนี้",
     self_review:"ผู้เสนอไม่สามารถรับรองคำขอของตนเอง",
     unverified_person:"ชื่อกรรมการยังไม่ผ่านการตรวจ",
     setup_required:"ระบบยังไม่ได้กำหนดสิทธิ์",
     already_approved:"รายการนี้มีคำขอรับรองแล้ว"
   }[v.error]||"ดำเนินการไม่สำเร็จ: "+String(v.error||"ไม่ทราบสาเหตุ"));
   return v;
 }
 function wipe(){
   state.accessToken="";state.roles=null;state.people=[];state.assignments=[];
   el("r43PrivateWorkspace").hidden=true;
   el("r43PrivateLogin").hidden=!state.cfg;
   el("r43Password").value="";
 }
 async function login(e){
   e.preventDefault();
   note("กำลังตรวจบัญชีผู้จัด…");
   const pass=el("r43Password").value;
   try{
     const r=await fetch(state.cfg.supabase_url+"/auth/v1/token?grant_type=password",{
       method:"POST",cache:"no-store",headers:{
         "apikey":state.cfg.publishable_key,"Content-Type":"application/json"
       },body:JSON.stringify({email:el("r43Email").value.trim(),password:pass})});
     const v=await r.json().catch(()=>null);
     if(!r.ok||!v||typeof v.access_token!=="string")
       throw Error("บัญชีหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้รับสิทธิ์");
     state.accessToken=v.access_token;
     const roles=await api("status");
     state.roles=roles;
     el("r43PrivateLogin").hidden=true;
     el("r43PrivateWorkspace").hidden=false;
     el("r43RoleSummary").textContent="เข้าสู่ระบบแล้ว · "+
       [roles.can_propose?"เสนอแก้ไข":"",roles.can_assign?"จัดกรรมการ":"",roles.can_review?"ผู้ตรวจรับ":""]
         .filter(Boolean).join(" / ");
     el("r43PrivateSubmit").hidden=!roles.can_propose;
     el("r43PrivateNew").hidden=!roles.can_propose;
     el("r43PrivateAssignArea").hidden=!roles.can_assign;
     el("r43PrivatePeoplePanel").hidden=!roles.can_assign;
     el("r43PrivateReview").hidden=!roles.can_review;
     await loadData();
     note("เข้าสู่ระบบสำหรับจัดทำคำขอแล้ว · ยังไม่ใช่การเผยแพร่");
   }catch(err){wipe();note(err.message||"เข้าสู่ระบบไม่สำเร็จ",true);}
   finally{el("r43Password").value="";}
 }
 async function loadData(){
   // Original source is public; private people and review queue require authenticated API.
   const response=await fetch("./data/program-from-pdf-2569-20261104-draft.json?cache=r43bc-1",
     {cache:"no-store"});
   const raw=await response.json();
   const program=root.NongkumProgramCorrections?.apply(raw);
   if(!response.ok||program?.fixtures?.length!==236||
       program.metadata?.source_status!=="revised_pdf_draft")throw Error("ต้นฉบับตารางไม่ตรงรุ่น");
   state.program=program;
   const fixtures=el("r43PrivateFixture");
   fixtures.length=1;
   for(const f of program.fixtures){
     option(fixtures,f.id,program.sports.find(s=>s.id===f.sport_id)?.name+" · "+f.division+" · "+(f.kind==="track_event"?"รายการ ":"คู่ที่ ")+f.source_match_no);
   }
   const newSports=el("r43NewSport");newSports.length=1;
   program.sports.forEach(s=>option(newSports,s.id,s.name));
   for(const id of ["r43NewTeamA","r43NewTeamB"]){
     const select=el(id);select.length=1;
     program.schools.forEach(s=>option(select,s.id,s.name));
   }
   const schools=el("r43PersonSchoolId");schools.length=1;
   program.schools.forEach(s=>option(schools,s.id,s.name));
   const roles=el("r43PrivateRole");roles.length=1;
   ROLES.forEach(x=>option(roles,x,x));
   const linked=new URLSearchParams(location.search).get("fixture");
   if(linked&&program.fixtures.some(f=>f.id===linked))fixtures.value=linked;
   if(state.roles.can_assign)await refreshPeople();
   if(state.roles.can_review)await refreshReview();
 }
 async function refreshPeople(){
   const v=await api("people");state.people=v.people||[];
   const select=el("r43PrivatePerson");select.length=1;
   for(const p of state.people)option(select,p.id,p.full_name+" · "+(state.program.schools.find(s=>s.id===p.school_id)?.short||p.school_id));
 }
 function addDuty(){
   try{
     const f=state.program.fixtures.find(x=>x.id===el("r43PrivateFixture").value);
     if(!f)throw Error("กรุณาเลือกรายการแข่งขัน");
     const id=el("r43PrivatePerson").value;
     if(!ID_RE.test(id)||!state.people.some(p=>p.id===id))throw Error("เลือกกรรมการที่ตรวจตัวตนแล้ว");
     const scope=el("r43PrivateScope").value;
     const key=scope==="sport"?f.sport_id:scope==="division"?
       f.sport_id+"/"+f.division:f.id;
     const duty={person_id:id,scope,scope_key:key,role:el("r43PrivateRole").value,
       date:el("r43PrivateDutyDate").value,
       start:el("r43PrivateDutyStart").value,end:el("r43PrivateDutyEnd").value};
     if(!duty.role||!D.date(duty.date)||!D.time(duty.start)||!D.time(duty.end)
        ||duty.end<=duty.start)throw Error("กรอกหน้าที่ วันที่ และช่วงเวลาให้ถูกต้อง");
     state.assignments.push(duty);
     renderDuties();
     note("เพิ่มกรรมการในร่างคำขอแล้ว ยังไม่ได้ส่งระบบ");
   }catch(e){note(e.message,true);}
 }
 function renderDuties(){
   const host=el("r43PrivateDuties");host.replaceChildren();
   state.assignments.forEach((a,i)=>{
     const card=add(host,"article","","r43-list-card");
     add(card,"strong",(state.people.find(p=>p.id===a.person_id)?.full_name||"รหัสกรรมการ")+
       " · "+a.role);
     add(card,"p",a.date+" · "+a.start+"–"+a.end+" · "+a.scope);
     btn(card,"นำออก",()=>{state.assignments.splice(i,1);renderDuties();});
   });
 }
 async function submit(e){
   e.preventDefault();
   try{
     const f=state.program.fixtures.find(x=>x.id===el("r43PrivateFixture").value);
     if(!f)throw Error("ยังไม่เลือกรายการแข่งขัน");
     const changes={};
     for(const [key,id] of Object.entries({
       date:"r43PrivateDate",time:"r43PrivateTime",
       field:"r43PrivateField",venue:"r43PrivateVenue"})){
       if(el(id).value.trim())changes[key]=el(id).value.trim();
     }
     if(!Object.keys(changes).length&&!state.assignments.length)
       throw Error("ยังไม่มีการแก้ไขหรือมอบหมายกรรมการ");
     if(state.assignments.some(a=>a.scope_key!==(
       a.scope==="sport"?f.sport_id:a.scope==="division"?f.sport_id+"/"+f.division:f.id)))
       throw Error("เปลี่ยนรายการแข่งขันแล้ว กรุณาลบและเพิ่มกรรมการใหม่");
     if(state.assignments.length&&!state.roles.can_assign)
       throw Error("ไม่มีสิทธิ์มอบหมายกรรมการ");
     const v=await api("submit",{
       source_key:D.CONTRACT.source_key,fixture_id:f.id,changes,
       assignments:state.assignments,reason:el("r43PrivateReason").value,
       evidence_ref:el("r43PrivateEvidence").value
     });
     state.assignments=[];renderDuties();
     el("r43SubmitForm").reset();
     note("ส่งคำขอรอตรวจแล้ว (เลขคำขอ "+v.id+") · ยังไม่เผยแพร่");
   }catch(err){note(err.message||"ส่งคำขอไม่สำเร็จ",true);}
 }
 async function submitNew(e){
   e.preventDefault();
   try{
     if(!state.roles?.can_propose)throw Error("ไม่มีสิทธิ์เสนอเพิ่มรายการ");
     const kind=el("r43NewKind").value;
     const payload={
       source_key:D.CONTRACT.source_key,kind,
       sport_id:el("r43NewSport").value,
       division:el("r43NewDivision").value.trim(),
       team_a_id:kind==="match"?el("r43NewTeamA").value:"",
       team_b_id:kind==="match"?el("r43NewTeamB").value:"",
       date:el("r43NewDate").value,time:el("r43NewTime").value,
       field:el("r43NewField").value.trim(),venue:el("r43NewVenue").value.trim(),
       round:el("r43NewRound").value.trim(),
       reason:el("r43NewReason").value,
       evidence_ref:el("r43NewEvidence").value
     };
     const ans=await api("new_submit",payload);
     el("r43NewForm").reset();
     note("รับคำขอเลขชั่วคราว "+ans.id+" แล้ว · ยังไม่เพิ่มในตารางแข่งขัน");
   }catch(err){note(err.message||"ส่งคำขอเพิ่มรายการไม่สำเร็จ",true);}
 }
 async function reviewNew(q,decision,review_note){
   try{
     await api("new_review",{id:q.id,revision:q.revision,decision,review_note});
     await refreshReview();
     note("บันทึกสถานะคำขอรายการใหม่แล้ว · ยังต้องตรวจผังและออกเลขรายการทางการ");
   }catch(err){note(err.message,true);}
 }
 async function proposePerson(e){
   e.preventDefault();
   try{
     const v=await api("person_propose",{
       full_name:el("r43PersonName").value,
       school_id:el("r43PersonSchoolId").value,
       evidence_ref:el("r43PersonEvidence").value
     });
     note("ส่งชื่อกรรมการรอตรวจตัวตนแล้ว · ยังไม่แต่งตั้ง");
     el("r43PersonForm").reset();
   }catch(err){note(err.message,true);}
 }
 async function refreshReview(){
   const [queue,people,newQueue]=await Promise.all([api("queue"),api("people_pending"),api("new_queue")]);
   const box=el("r43PrivateQueue");box.replaceChildren();
   const pbox=el("r43PrivatePendingPeople");pbox.replaceChildren();
   const newBox=el("r43PrivateNewQueue");newBox.replaceChildren();
   (newQueue.candidates||[]).forEach(q=>{
     const card=add(newBox,"article","","r43-list-card");
     add(card,"strong",q.sport_id+" · "+q.division+" · "+q.kind);
     add(card,"p",[q.team_a_id,q.team_b_id,q.scheduled_date,q.scheduled_time]
       .filter(Boolean).join(" / "));
     add(card,"small","หลักฐาน: "+q.evidence_ref+" · "+q.reason);
     const reason=add(card,"textarea");reason.rows=2;reason.maxLength=500;
     reason.placeholder="เหตุผลพิจารณาผังหรือส่งกลับแก้ไข";
     const actions=add(card,"div","","r43-actions");
     btn(actions,"ส่งต่อให้ตรวจผัง (ยังไม่เผยแพร่)",
       ()=>reviewNew(q,"ready_for_bracket_check",reason.value));
     btn(actions,"ส่งกลับแก้ไข",()=>reviewNew(q,"returned",reason.value));
   });
   if(!(newQueue.candidates||[]).length)add(newBox,"p","ยังไม่มีคำขอเพิ่มรายการรอตรวจ");
   (people.people||[]).forEach(p=>{
     const card=add(pbox,"article","","r43-list-card");
     add(card,"strong",p.full_name+" · "+p.school_id);
     add(card,"p","หลักฐาน: "+p.evidence_ref);
     const actions=add(card,"div","","r43-actions");
     btn(actions,"ยืนยันตัวตน",()=>reviewPerson(p.id,"verified"));
     btn(actions,"ไม่รับรอง",()=>reviewPerson(p.id,"rejected"));
   });
   (queue.requests||[]).forEach(q=>{
     const card=add(box,"article","","r43-list-card");
     add(card,"strong",q.sport_id+" · "+q.division+" · "+q.fixture_id);
     add(card,"p","เสนอแก้: "+Object.entries(q.changes||{}).map(([k,v])=>k+" "+v).join(" / "));
     add(card,"p","กรรมการร่าง "+(q.assignments||[]).length+" คน · หลักฐาน: "+q.evidence_ref);
     add(card,"small","เหตุผล: "+q.reason);
     const reason=add(card,"textarea");reason.rows=2;reason.maxLength=500;
     reason.placeholder="เหตุผลการตรวจรับ (ไม่น้อยกว่า 8 ตัวอักษร)";
     const actions=add(card,"div","","r43-actions");
     btn(actions,"รับรองคำขอ",()=>reviewRequest(q,"approved",reason.value));
     btn(actions,"ส่งกลับแก้ไข",()=>reviewRequest(q,"returned",reason.value));
   });
   if(!(queue.requests||[]).length)add(box,"p","ยังไม่มีคำขอรอตรวจ");
   if(!(people.people||[]).length)add(pbox,"p","ยังไม่มีรายชื่อรอตรวจตัวตน");
 }
 async function reviewPerson(id,decision){
   try{await api("person_review",{id,decision});await refreshReview();await refreshPeople();
     note("บันทึกการตรวจตัวตนแล้ว · ยังไม่ประกาศรายชื่อ");}
   catch(e){note(e.message,true);}
 }
 async function reviewRequest(q,decision,review_note){
   try{await api("review",{id:q.id,revision:q.revision,decision,review_note});
     await refreshReview();note("บันทึกคำตัดสินแล้ว · ไม่ได้เผยแพร่ตาราง");}
   catch(e){note(e.message,true);}
 }
 function download(data,name){
   const link=document.createElement("a");
   const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],
     {type:"application/json;charset=utf-8"}));
   link.href=url;link.download=name;document.body.appendChild(link);
   link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function preview(){
   try{const v=await api("approved_preview");
     download(v,"R43-approved-only-review-preview.json");
     note("ดาวน์โหลดชุดเตรียมเผยแพร่แล้ว · ต้องตรวจ R33/R32 และ PR ก่อนเผยแพร่");}
   catch(e){note(e.message,true);}
 }
 async function logout(){
   if(state.accessToken&&state.cfg){
     await fetch(state.cfg.supabase_url+"/auth/v1/logout",{
       method:"POST",headers:{apikey:state.cfg.publishable_key,
       Authorization:"Bearer "+state.accessToken}}).catch(()=>{});
   }
   wipe();note("ออกจากระบบแล้ว");
 }
 async function init(){
   try{
     const r=await fetch("./data/r43-public-auth-config.json",{cache:"no-store"});
     const config=r.ok?await r.json():null;
     if(!goodConfig(config)){note("ส่วนรับคำขอและตรวจรับยังไม่ได้เปิดใช้งาน · สามารถเตรียมคำขอร่างในหน้าเดิมได้");return;}
     state.cfg=config;
     el("r43PrivateLogin").hidden=false;
     note("พร้อมให้เจ้าหน้าที่ที่ได้รับสิทธิ์เข้าสู่ระบบ");
     el("r43LoginForm").addEventListener("submit",login);
     el("r43Logout").addEventListener("click",logout);
     el("r43SubmitForm").addEventListener("submit",submit);
     el("r43PersonForm").addEventListener("submit",proposePerson);
     el("r43NewForm").addEventListener("submit",submitNew);
     el("r43PrivateAddDuty").addEventListener("click",addDuty);
     el("r43PrivateRefresh").addEventListener("click",async()=>{
       try{await refreshReview();note("ตรวจคิวล่าสุดแล้ว");}catch(e){note(e.message,true);}
     });
     el("r43PrivatePreview").addEventListener("click",preview);
   }catch(_){note("ยังไม่พร้อมเปิดระบบเจ้าหน้าที่ กรุณาใช้หน้าร่างคำขอตามเดิม");}
 }
 init();
})(globalThis);
