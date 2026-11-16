/* R40-G: reviewer-only private approval and distinct explicit public publication. */
(function(){
"use strict";
const REVIEWER="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-reviewer";
const MEDIA="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-activity-photos";
const KEY="nongkum-r37-reviewer-session-v1";
const $=id=>document.getElementById(id);
const ui={unlock:$("photoReviewUnlock"),workspace:$("photoReviewWorkspace"),
 form:$("photoReviewLoginForm"),submit:$("photoReviewLoginButton"),
 info:$("photoReviewerInfo"),list:$("photoReviewList"),count:$("photoReviewCount"),
 empty:$("photoReviewEmpty"),status:$("photoReviewStatus"),feedback:$("photoReviewFeedback"),
 refresh:$("photoReviewRefresh"),logout:$("photoReviewLogout")};
if(!ui.form)return;
let session=null,busy=false;
const reviewedImages=new Set();
const sportNames={athletics:"กรีฑา",football:"ฟุตบอล",futsal:"ฟุตซอล",petanque:"เปตอง",volleyball:"วอลเลย์บอล",takraw:"ตะกร้อ",tabletennis:"เทเบิลเทนนิส",tugofwar:"ชักเย่อ",shootout:"ยิงประตู"};
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
 public_consent_required:"ต้องยืนยันสิทธิ์เผยแพร่ภาพสาธารณะก่อน",
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
   if(typeof img.decode==="function"){try{await img.decode();}catch(_){notice("ไม่สามารถแสดงภาพได้ กรุณาลองใหม่",true);return;}}
   frame.replaceChildren(img);frame.hidden=false;
   reviewedImages.add(id);
   notice("เปิดดูภาพเฉพาะผู้ตรวจแล้ว");
 }catch(_){notice(errorText("network"),true);}
 finally{button.disabled=false;}
}
function showFeedback(message,bad=false){
 if(!ui.feedback)return;
 ui.feedback.hidden=false;ui.feedback.textContent=message;
 ui.feedback.dataset.error=bad?"true":"false";
}
function cardNotice(controls,message,bad=true){
 const n=controls.querySelector("[data-card-message]");
 if(n){n.textContent=message;n.dataset.error=bad?"true":"false";}
}
function resetCardNotice(controls){
 const n=controls.querySelector("[data-card-message]");
 if(n){n.textContent="";n.dataset.error="false";}
}
async function review(action,item,controls){
 if(busy||!session)return;
 resetCardNotice(controls);notice("");
 let payload={id:item.id};
 if(action==="approve"||action==="publish"){
   if(!reviewedImages.has(item.id)){
     cardNotice(controls,"กรุณากดเปิดดูภาพก่อนอนุมัติ");return;
   }
   const note=controls.querySelector("[data-consent-note]")?.value.trim()||"";
   if(note.length<8||note.length>500){
      cardNotice(controls,"กรุณาระบุหลักฐาน/ผู้รับผิดชอบที่ยืนยันสิทธิ์อย่างน้อย 8 ตัวอักษร");
      controls.querySelector("[data-consent-note]")?.focus();return;
   }
   if(action==="publish"){
      if(!controls.querySelector("[data-public-consent]")?.checked){
         cardNotice(controls,"กรุณายืนยันสิทธิ์เผยแพร่ภาพนักเรียนบนเว็บไซต์สาธารณะก่อน");
         return;
      }
      payload={...payload,public_consent_checked:true,public_consent_note:note};
   }else{
      if(!controls.querySelector("[data-internal-consent]")?.checked){
         cardNotice(controls,"กรุณายืนยันสิทธิ์ใช้ภาพภายในก่อน");return;
      }
      payload={...payload,consent_checked:true,consent_note:note};
   }
 }else{
   const retry=action==="revoke"&&item.publication_status==="revoked";
   const reason=controls.querySelector("[data-reason]")?.value.trim()||"";
   if(!retry&&reason.length<8){
     cardNotice(controls,"กรุณาระบุเหตุผลอย่างน้อย 8 ตัวอักษร");
     controls.querySelector("[data-reason]")?.focus();return;
   }
   if(action==="revoke"&&!window.confirm(retry?
     "ตรวจซ้ำว่าลบไฟล์ภาพออกจากเว็บไซต์แล้วหรือไม่?":
     "ยืนยันถอนภาพนี้จากเว็บไซต์สาธารณะหรือไม่?"))return;
   if(!retry)payload.reason=reason;
 }
 busy=true;controls.querySelectorAll("button").forEach(n=>n.disabled=true);
 cardNotice(controls,action==="publish"?"กำลังเผยแพร่ภาพ กรุณารอสักครู่…":
   action==="approve"?"กำลังอนุญาตใช้ภายใน…":
   action==="revoke"?"กำลังถอนภาพ…":"กำลังส่งกลับแก้ไข…",false);
 try{
   const r=await request(MEDIA,action,payload);
   if(!r.ok){
     if(r.error==="expired"){clear();showLogin();}
     cardNotice(controls,errorText(r.error));return;
   }
   const text={approve:"อนุญาตใช้ภาพภายในแล้ว ยังไม่เผยแพร่",
     publish:"อนุมัติและเผยแพร่ภาพสำเร็จแล้ว",
     reject:"ส่งภาพกลับให้แก้ไขแล้ว",
     revoke:"ถอนภาพจากรายการเผยแพร่แล้ว"}[action]||"สำเร็จแล้ว";
   await loadQueue(true);
   showFeedback(text+(r.cleanup_pending?" (ยังต้องตรวจการลบไฟล์จากที่เก็บภาพ)":""));
   ui.feedback?.scrollIntoView({behavior:"smooth",block:"center"});
 }catch(_){
   cardNotice(controls,"การเชื่อมต่อขัดข้อง ยังยืนยันผลไม่ได้ กรุณาตรวจสถานะก่อนกดซ้ำ");
 }finally{
   busy=false;controls.querySelectorAll("button").forEach(n=>n.disabled=false);
 }
}
function createCard(item){
 const published=item.publication_status==="published",reviewable=item.status==="review",
   revoked=item.publication_status==="revoked",publishing=item.publication_status==="publishing";
 const card=el("article","photo-review-card");
 const title=el("h3","",(sportNames[item.sport_id]||item.sport_id||"กีฬา")+" · "+(item.division||""));
 const state=published?"เผยแพร่แล้ว":revoked?"ถอนภาพแล้ว":publishing?"กำลังเผยแพร่":
   item.publication_status==="failed"?"เผยแพร่ไม่สำเร็จ":reviewable?"รอตรวจ":"อนุญาตใช้ภายในแล้ว";
 const meta=el("p","photo-meta",state+" · ส่ง "+fmt(item.submitted_at));
 const detail=el("p","photo-meta","รายการ: "+(item.event_id||"")+" · ผู้ส่ง: "+(item.uploaded_by||""));
 const caption=el("p","",item.caption||"ภาพกิจกรรมการแข่งขัน");
 const previewBox=el("div","photo-review-preview");previewBox.hidden=true;
 const controls=el("div","photo-review-controls");
 const show=el("button","photo-review-secondary","เปิดดูภาพเพื่อพิจารณา");show.type="button";
 show.addEventListener("click",()=>preview(item.id,previewBox,show));
 const message=el("p","photo-review-item-feedback","");message.dataset.cardMessage="";
 controls.append(show);
 if(!published&&!revoked&&!publishing){
   const label=el("label","","หลักฐานสิทธิ์ใช้ภาพ/เผยแพร่ (เก็บเฉพาะผู้ตรวจ)");
   const evidence=el("textarea","");
   evidence.maxLength=500;evidence.dataset.consentNote="";
   evidence.placeholder="ระบุแหล่งยืนยันสิทธิ์ เช่น ผู้รับผิดชอบและหลักฐานที่ผู้จัดตรวจแล้ว";
   const hint=el("small","photo-evidence-hint","กรุณาตรวจสอบว่ามีสิทธิ์เผยแพร่ภาพบุคคล โดยเฉพาะนักเรียน");
   const checkLabel=el("label","photo-consent");
   const checked=el("input");checked.type="checkbox";checked.dataset.publicConsent="";
   checkLabel.append(checked,document.createTextNode(
      " ยืนยันว่าตรวจภาพและมีสิทธิ์เผยแพร่ภาพบุคคล/นักเรียนบนเว็บไซต์สาธารณะ"));
   const publish=el("button","photo-primary","อนุมัติและเผยแพร่สู่เว็บไซต์");
   publish.type="button";publish.addEventListener("click",()=>review("publish",item,controls));
   controls.append(label,evidence,hint,checkLabel,publish);
   if(reviewable){
     const details=el("details","photo-review-disclosure");
     details.append(el("summary","","ตัวเลือกเพิ่มเติม: เก็บไว้ภายใน / ส่งกลับแก้ไข"));
     const internalLabel=el("label","photo-consent");
     const internalCheck=el("input");internalCheck.type="checkbox";internalCheck.dataset.internalConsent="";
     internalLabel.append(internalCheck,document.createTextNode(" ตรวจสิทธิ์และความเหมาะสมสำหรับเก็บไว้ใช้ภายใน"));
     const internal=el("button","photo-review-secondary","อนุญาตใช้ภายในเท่านั้น");
     internal.type="button";internal.addEventListener("click",()=>review("approve",item,controls));
     const reasonLabel=el("label","","เหตุผลส่งภาพกลับ");
     const reason=el("textarea");reason.dataset.reason="";reason.maxLength=500;
     reason.placeholder="เช่น ภาพไม่ชัดหรือยังไม่มีหลักฐานอนุญาต";
     const reject=el("button","photo-review-secondary","ส่งกลับแก้ไข");
     reject.type="button";reject.addEventListener("click",()=>review("reject",item,controls));
     details.append(internalLabel,internal,reasonLabel,reason,reject);
     controls.append(details);
   }
 }
 if(published){
   const details=el("details","photo-review-disclosure");
   details.append(el("summary","","นำภาพออกจากเว็บไซต์"));
   const reasonLabel=el("label","","เหตุผลถอนภาพ");
   const reason=el("textarea");reason.dataset.reason="";reason.maxLength=500;
   reason.placeholder="เช่น ถอนสิทธิ์เผยแพร่หรือภาพไม่เหมาะสม";
   const revoke=el("button","photo-review-secondary","ยืนยันถอนภาพ");
   revoke.type="button";revoke.addEventListener("click",()=>review("revoke",item,controls));
   details.append(reasonLabel,reason,revoke);controls.append(details);
 }
 if(revoked){
   const details=el("details","photo-review-disclosure");
   details.append(el("summary","","ตรวจการลบไฟล์ภาพเพิ่มเติม"));
   const retry=el("button","photo-review-secondary","ตรวจซ้ำว่าลบภาพจากเว็บไซต์แล้ว");
   retry.type="button";retry.addEventListener("click",()=>review("revoke",item,controls));
   details.append(retry);controls.append(details);
 }
 controls.append(message);
 controls.addEventListener("input",()=>resetCardNotice(controls));
 controls.addEventListener("change",()=>resetCardNotice(controls));
 card.append(title,meta,detail,caption,previewBox,controls);
 return card;
}
function render(items){
 ui.list.replaceChildren();
 ui.count.textContent="("+items.length+" รายการ)";
 ui.empty.hidden=items.length!==0;
 if(!items.length)return;
 const groups=[
  ["รอตรวจ",items.filter(x=>x.status==="review"&&x.publication_status==="private")],
  ["อนุญาตภายใน / รอเผยแพร่",items.filter(x=>
      (x.status==="approved"||x.status==="review")&&
      (x.publication_status==="failed"||x.publication_status==="private")&&
      !(x.status==="review"&&x.publication_status==="private"))],
  ["เผยแพร่แล้ว",items.filter(x=>x.publication_status==="published")],
  ["อื่น ๆ / ถอนภาพแล้ว",items.filter(x=>
     !["published","private","failed"].includes(x.publication_status))]
 ];
 for(const [title,group] of groups){
   if(!group.length)continue;
   const section=el("section","photo-review-group");
   const h=el("h3","",title+" ("+group.length+" ภาพ)");
   section.append(h);
   for(const item of group)section.append(createCard(item));
   ui.list.append(section);
 }
}
async function loadQueue(silent=false){
 if(!session||(busy&&!silent))return;
 ui.refresh.disabled=true;ui.list.setAttribute("aria-busy","true");
 if(!silent)notice("กำลังโหลดภาพรอตรวจและภาพที่เผยแพร่แล้ว…");
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
