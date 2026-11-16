/* R40: private reviewer queue, no automatic publication on approval. */
(function(){
"use strict";
const REVIEWER="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-reviewer";
const MEDIA="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-activity-photos";
const KEY="nongkum-r37-reviewer-session-v1";
const $=id=>document.getElementById(id);
const ui={unlock:$("photoReviewUnlock"),workspace:$("photoReviewWorkspace"),
 form:$("photoReviewLoginForm"),submit:$("photoReviewLoginButton"),
 info:$("photoReviewerInfo"),list:$("photoReviewList"),count:$("photoReviewCount"),
 empty:$("photoReviewEmpty"),status:$("photoReviewStatus"),
 refresh:$("photoReviewRefresh"),logout:$("photoReviewLogout")};
if(!ui.form)return;
let session=null,busy=false;
const fmt=s=>{const d=new Date(s||"");return Number.isNaN(d.getTime())?"ไม่ระบุเวลา":
 new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"numeric",month:"short",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(d)+" น.";};
function notice(s,bad=false){ui.status.textContent=s||"";ui.status.dataset.error=bad?"true":"false";}
function getSession(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");
 return x&&/^[a-f0-9]{64}$/.test(x.token||"")&&Date.parse(x.expires_at)>Date.now()?x:null;}catch(_){return null;}}
function save(x){session=x;try{localStorage.setItem(KEY,JSON.stringify(x));}catch(_){}}
function clear(){session=null;try{localStorage.removeItem(KEY);}catch(_){}}
function showLogin(){ui.unlock.hidden=false;ui.workspace.hidden=true;}
function showWorkspace(){ui.unlock.hidden=true;ui.workspace.hidden=false;
 ui.info.textContent="ผู้ตรวจ: "+(session?.reviewer_name||"")+" · ถึง "+fmt(session?.expires_at);}
async function request(endpoint,action,payload={},token=session?.token){
 const headers={"Content-Type":"application/json","Accept":"application/json"};
 if(token)headers.Authorization="Bearer "+token;
 const response=await fetch(endpoint,{method:"POST",cache:"no-store",headers,body:JSON.stringify({action,...payload})});
 let value;try{value=await response.json();}catch(_){throw Error("network");}
 if(!value||typeof value.ok!=="boolean")throw Error("network");
 return value;
}
const errors={
 expired:"สิทธิ์หมดอายุ กรุณาเข้าระบบใหม่",
 limited:"ลองรหัสผิดหลายครั้ง กรุณาลองภายหลัง",
 wrong_pin:"รหัสผู้ตรวจไม่ถูกต้อง",
 consent_required:"กรุณายืนยันสิทธิ์ใช้ภาพและระบุหลักฐานอย่างน้อย 8 ตัวอักษร",
 reason_required:"กรุณาระบุเหตุผลส่งกลับอย่างน้อย 8 ตัวอักษร",
 source_changed:"ข้อมูลรายการแข่งขันเปลี่ยน กรุณาติดต่อผู้จัด",
 stale:"ภาพนี้ได้รับการตรวจหรือแก้ไขแล้ว กรุณารีเฟรช",
 missing:"ไม่พบภาพนี้ในรายการรอตรวจ",unavailable:"ระบบตรวจภาพยังไม่พร้อม",
 network:"การเชื่อมต่อขัดข้อง กรุณาลองใหม่"
};
function errorText(s){return errors[s]||"ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง";}
const el=(tag,cl,txt)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;return n;};
async function preview(id,frame,button){
 if(!session)return;
 button.disabled=true;notice("กำลังโหลดภาพจากพื้นที่ส่วนตัว…");
 try{
   const r=await request(MEDIA,"preview",{id});
   if(!r.ok){if(r.error==="expired"){clear();showLogin();}notice(errorText(r.error),true);return;}
   if(!/^[-A-Za-z0-9+/=]+$/.test(r.image_b64||"")||r.image_b64.length>470000){
      notice("ข้อมูลภาพไม่ถูกต้อง",true);return;
   }
   const img=el("img");
   if(!["image/webp","image/jpeg"].includes(r.mime_type)){notice("ประเภทไฟล์ไม่ถูกต้อง",true);return;}
   img.src="data:"+r.mime_type+";base64,"+r.image_b64;
   img.alt="ภาพต้นฉบับสำหรับผู้ตรวจเท่านั้น";
   img.loading="lazy";img.decoding="async";
   frame.replaceChildren(img);frame.hidden=false;
   notice("เปิดดูภาพเฉพาะผู้ตรวจแล้ว");
 }catch(_){notice(errorText("network"),true);}
 finally{button.disabled=false;}
}
async function review(action,item,controls){
 if(busy||!session)return;
 let payload={id:item.id};
 if(action==="approve"){
   const box=controls.querySelector("[data-consent]"),note=controls.querySelector("[data-consent-note]");
   if(!box.checked||note.value.trim().length<8){
     notice(errorText("consent_required"),true);return;
   }
   if(!window.confirm("ยืนยันว่าได้รับอนุญาตให้ใช้ภาพตามหลักฐานแล้ว? ภาพจะยังไม่เผยแพร่สาธารณะ"))return;
   payload={...payload,consent_checked:true,consent_note:note.value.trim()};
 }else{
   const reason=controls.querySelector("[data-reason]").value.trim();
   if(reason.length<8){notice(errorText("reason_required"),true);return;}
   if(!window.confirm("ส่งภาพนี้กลับให้ผู้ส่งตรวจแก้ไขหรือไม่?"))return;
   payload.reason=reason;
 }
 busy=true;controls.querySelectorAll("button").forEach(b=>b.disabled=true);
 notice(action==="approve"?"กำลังบันทึกการอนุญาต (ยังไม่เผยแพร่)…":"กำลังส่งกลับแก้ไข…");
 try{
   const r=await request(MEDIA,action,payload);
   if(!r.ok){if(r.error==="expired"){clear();showLogin();}notice(errorText(r.error),true);return;}
   notice(action==="approve"?"อนุญาตใช้ภาพแล้ว · อยู่ในพื้นที่ส่วนตัวรอผู้จัดคัดเลือกเผยแพร่":"ส่งกลับแก้ไขแล้ว");
   await loadQueue(true);
 }catch(_){notice(errorText("network"),true);}
 finally{busy=false;controls.querySelectorAll("button").forEach(b=>b.disabled=false);}
}
function render(items){
 ui.list.replaceChildren();ui.empty.hidden=items.length!==0;ui.count.textContent="("+items.length+" รายการ)";
 for(const item of items){
   const card=el("article","photo-review-card"),header=el("div","photo-review-head");
   const h=el("h3","",String(item.sport_id||"กีฬา")+" · "+String(item.division||""));
   const time=el("span","photo-meta","ส่ง "+fmt(item.submitted_at));
   header.append(h,time);
   const detail=el("p","photo-meta","รหัสรายการ: "+item.event_id+" · ผู้ส่ง: "+item.uploaded_by);
   const caption=el("p","",item.caption||"ภาพกิจกรรมการแข่งขัน");
   const previewBox=el("div","photo-review-preview");previewBox.hidden=true;
   const controls=el("div","photo-review-controls");
   const show=el("button","","ดูภาพเพื่อพิจารณา");show.type="button";
   show.addEventListener("click",()=>preview(item.id,previewBox,show));
   const consent=el("label","photo-consent");
   const box=document.createElement("input");box.type="checkbox";box.dataset.consent="";
   consent.append(box,document.createTextNode(" ตรวจสิทธิ์ใช้ภาพและความเหมาะสมแล้ว"));
   const label=el("label","","หลักฐาน/เหตุผลการอนุญาต (บันทึกภายใน ไม่เผยแพร่)");
   const note=el("textarea","");note.dataset.consentNote="";note.maxLength=500;
   note.placeholder="เช่น ได้รับอนุญาตจากผู้รับผิดชอบกิจกรรมและตรวจภาพแล้ว";
   const approve=el("button","photo-primary","อนุญาตใช้ภาพ (ยังไม่เผยแพร่)");
   approve.type="button";approve.addEventListener("click",()=>review("approve",item,controls));
   const rejectLabel=el("label","","เหตุผลส่งกลับผู้ส่งภาพ");
   const reason=el("textarea","");reason.dataset.reason="";reason.maxLength=500;
   reason.placeholder="เช่น ขอภาพใหม่เนื่องจากยังไม่มีหลักฐานอนุญาต";
   const reject=el("button","","ส่งกลับแก้ไข");reject.type="button";
   reject.addEventListener("click",()=>review("reject",item,controls));
   controls.append(show,consent,label,note,approve,rejectLabel,reason,reject);
   card.append(header,detail,caption,previewBox,controls);ui.list.appendChild(card);
 }
}
async function loadQueue(silent=false){
 if(!session||busy)return;
 ui.refresh.disabled=true;ui.list.setAttribute("aria-busy","true");
 if(!silent)notice("กำลังโหลดภาพที่รอตรวจ…");
 try{
   const r=await request(MEDIA,"queue");
   if(!r.ok){if(r.error==="expired"){clear();showLogin();}notice(errorText(r.error),true);return;}
   render(Array.isArray(r.items)?r.items:[]);
   if(!silent)notice("ตรวจรายการล่าสุด "+fmt(new Date().toISOString()));
 }catch(_){if(!silent)notice(errorText("network"),true);}
 finally{ui.refresh.disabled=false;ui.list.setAttribute("aria-busy","false");}
}
ui.form.addEventListener("submit",async e=>{
 e.preventDefault();
 const name=ui.form.elements.reviewer_name.value.trim(),pin=ui.form.elements.pin.value.trim();
 if(name.length<2||!/^\d{8,30}$/.test(pin)){notice("กรุณากรอกชื่อและรหัสผู้ตรวจ",true);return;}
 ui.submit.disabled=true;notice("กำลังตรวจสิทธิ์ผู้ตรวจ…");
 try{
   const r=await request(REVIEWER,"unlock",{reviewer_name:name,pin},null);
   ui.form.elements.pin.value="";
   if(!r.ok){notice(errorText(r.error),true);return;}
   save({token:r.token,expires_at:r.expires_at,reviewer_name:r.reviewer_name});
   showWorkspace();await loadQueue();
 }catch(_){notice(errorText("network"),true);}
 finally{ui.submit.disabled=false;}
});
ui.refresh.addEventListener("click",()=>loadQueue());
ui.logout.addEventListener("click",async()=>{
 try{if(session)await request(REVIEWER,"logout");}catch(_){}
 clear();showLogin();ui.list.replaceChildren();notice("ออกจากระบบแล้ว");
});
(async()=>{
 session=getSession();
 if(!session){showLogin();return;}
 try{
   const r=await request(REVIEWER,"status");
   if(!r.ok){clear();showLogin();notice(errorText(r.error),true);return;}
   session.expires_at=r.expires_at||session.expires_at;save(session);
   showWorkspace();await loadQueue();
 }catch(_){clear();showLogin();notice(errorText("network"),true);}
})();
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState==="visible"&&session)loadQueue(true);
});
})(globalThis);
