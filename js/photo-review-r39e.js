/* R39-E: reviewer-only image gallery with mandatory consent checks. */
(function(){
"use strict";
const e=id=>document.getElementById(id);
const API="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-sports-photos";
const REVIEW="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-reviewer";
const KEY="nongkum-r37-reviewer-session-v1";
const d={login:e("photoReviewLogin"),form:e("photoReviewLoginForm"),workspace:e("photoReviewWorkspace"),
 session:e("photoReviewerSession"),queue:e("photoReviewQueue"),published:e("photoPublishedQueue"),
 count:e("photoReviewCount"),status:e("photoReviewStatus"),refresh:e("photoReviewRefresh")};
let session=null,busy=false;
const msgs={expired:"สิทธิ์หมดเวลา กรุณาเข้าระบบใหม่",limited:"มีการเข้าใช้งานบ่อยเกินไป กรุณาลองภายหลัง",
 wrong_pin:"รหัสผู้ตรวจไม่ถูกต้อง",consent_required:"กรุณาตรวจและยืนยันสิทธิ์เผยแพร่ภาพ",
 missing:"รูปนี้ได้รับการดำเนินการไปแล้ว กรุณารีเฟรช",source_changed:"ตารางแข่งขันมีการเปลี่ยนแปลง ต้องตรวจความตรงกันก่อน",
 reason_required:"กรุณากรอกเหตุผลอย่างน้อย 8 ตัวอักษร",invalid:"กรุณาตรวจข้อมูลอีกครั้ง",
 unavailable:"เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง",network:"เครือข่ายขัดข้อง"};
function status(s,bad=false){d.status.textContent=s||"";d.status.dataset.error=String(bad);}
function valid(s){return s&&/^[0-9a-f]{64}$/.test(s.token||"")&&Date.parse(s.expires_at)>Date.now();}
function restore(){try{const s=JSON.parse(localStorage.getItem(KEY)||"null");if(valid(s))session=s;}catch(_){}}
function save(s){session=s;try{localStorage.setItem(KEY,JSON.stringify(s));}catch(_){}}
function clear(){session=null;try{localStorage.removeItem(KEY);}catch(_){}show();}
function show(){const yes=valid(session);d.login.hidden=yes;d.workspace.hidden=!yes;
 if(yes)d.session.textContent="ผู้ตรวจ: "+(session.reviewer_name||"")+
   " · สิทธิ์ถึง "+new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(session.expires_at))+" น.";
}
async function send(url,body,withAuth=true){
 const headers={"Content-Type":"application/json"};
 if(withAuth){if(!valid(session))throw Error("expired");headers.Authorization="Bearer "+session.token;}
 const response=await fetch(url,{method:"POST",headers,body:JSON.stringify(body),cache:"no-store"});
 let j;try{j=await response.json();}catch(_){throw Error("network");}
 if(!j||typeof j.ok!=="boolean")throw Error("network");
 if(!j.ok)throw Error(j.error||"unavailable");
 return j;
}
function format(iso){const x=new Date(iso||"");return Number.isFinite(x.getTime())?
 new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(x)+" น.":"ไม่ทราบเวลา";}
function node(tag,className,text){const x=document.createElement(tag);if(className)x.className=className;if(text!=null)x.textContent=String(text);return x;}
function button(text){const b=node("button","photos-small-button",text);b.type="button";return b;}
async function preview(card,id,buttonEl){
 if(busy)return;buttonEl.disabled=true;
 try{
 const r=await send(API,{action:"preview",id});
 const url=new URL(r.url);
 if(url.origin!=="https://zprxvpfkvforoxrboqiv.supabase.co"||
  !url.pathname.startsWith("/storage/v1/object/sign/nongkum-sports-photo-pending/pending/"))
    throw Error("invalid");
 let img=card.querySelector("img");
 if(!img){img=document.createElement("img");img.className="photos-review-image";img.alt="ภาพกิจกรรมที่รอการตรวจ";
    img.referrerPolicy="no-referrer";card.insertBefore(img,card.querySelector(".photos-review-controls"));}
 img.src=url.toString();img.hidden=false;
 status("เปิดรูปตัวอย่างแล้ว ลิงก์ส่วนตัวมีอายุสั้น กรุณาตรวจสิทธิ์ใช้ภาพก่อนอนุมัติ");
 }catch(err){status(msgs[err.message]||"ไม่สามารถเปิดรูปได้",true);}
 finally{buttonEl.disabled=false;}
}
function renderPending(item){
 const card=node("article","photos-panel photos-review-card");
 card.dataset.photoId=item.id;
 card.appendChild(node("h3","photos-card-title",(item.sport_id||"กีฬา")+" · "+(item.division||"")));
 card.appendChild(node("p","photos-help","รหัสรายการ: "+item.fixture_id+" · ส่ง "+format(item.uploaded_at)));
 card.appendChild(node("p","photos-caption",item.caption));
 const controls=node("div","photos-review-controls");
 const open=button("เปิดดูรูป");open.addEventListener("click",()=>preview(card,item.id,open));
 controls.appendChild(open);
 const label=node("label","photos-check");
 const check=document.createElement("input");check.type="checkbox";check.setAttribute("aria-label","ตรวจสิทธิ์เผยแพร่ภาพแล้ว");
 label.append(check,document.createTextNode(" ตรวจสิทธิ์ใช้ภาพและความยินยอมของบุคคลในภาพแล้ว"));
 controls.appendChild(label);
 const approve=button("อนุมัติและเผยแพร่รูป");approve.classList.add("photos-approve");
 approve.addEventListener("click",async()=>{
  if(busy)return;if(!check.checked){status(msgs.consent_required,true);return;}
  if(!window.confirm("ยืนยันว่าตรวจภาพและได้รับอนุญาตเผยแพร่แล้ว? รูปนี้จะปรากฏต่อสาธารณะ"))return;
  busy=true;approve.disabled=true;
  try{await send(API,{action:"approve",id:item.id,consent_checked:true});
    status("อนุมัติรูปแล้ว ภาพจะแสดงบนเว็บไซต์เมื่อข้อมูลอัปเดต");await refresh();}
  catch(err){if(err.message==="expired")clear();status(msgs[err.message]||"อนุมัติไม่สำเร็จ",true);}
  finally{busy=false;approve.disabled=false;}
 });
 controls.appendChild(approve);
 const reason=document.createElement("textarea");reason.rows=2;reason.maxLength=400;
 reason.placeholder="เหตุผลที่ไม่อนุมัติ อย่างน้อย 8 ตัวอักษร";
 reason.setAttribute("aria-label","เหตุผลส่งรูปกลับ");controls.appendChild(reason);
 const reject=button("ส่งกลับแก้ไข");reject.addEventListener("click",async()=>{
  if(busy)return;if(reason.value.trim().length<8){status(msgs.reason_required,true);return;}
  busy=true;reject.disabled=true;
  try{await send(API,{action:"reject",id:item.id,reason:reason.value.trim()});
      status("ส่งภาพกลับแล้ว");await refresh();}
  catch(err){if(err.message==="expired")clear();status(msgs[err.message]||"ส่งกลับไม่สำเร็จ",true);}
  finally{busy=false;reject.disabled=false;}
 });
 controls.appendChild(reject);card.appendChild(controls);
 return card;
}
function renderPublished(item){
 const card=node("article","photos-panel photos-review-card");
 card.appendChild(node("h3","photos-card-title",(item.sport_id||"กีฬา")+" · "+(item.division||"")));
 card.appendChild(node("p","photos-help","รหัสรายการ: "+item.fixture_id+" · เผยแพร่ฉบับ "+item.revision));
 card.appendChild(node("p","photos-caption",item.caption));
 const reason=document.createElement("textarea");reason.rows=2;reason.maxLength=400;
 reason.placeholder="เหตุผลถอนภาพอย่างน้อย 8 ตัวอักษร";reason.setAttribute("aria-label","เหตุผลถอนภาพ");
 card.appendChild(reason);
 const withdraw=button("ถอนเผยแพร่");withdraw.classList.add("photos-withdraw");
 withdraw.addEventListener("click",async()=>{
 if(busy)return;if(reason.value.trim().length<8){status(msgs.reason_required,true);return;}
 if(!window.confirm("ถอนรูปนี้จากเว็บไซต์สาธารณะหรือไม่?"))return;
 busy=true;withdraw.disabled=true;
 try{
 const ans=await send(API,{action:"withdraw",fixture_id:item.fixture_id,reason:reason.value.trim()});
 status(ans.file_deleted?"ถอนเผยแพร่และลบรูปแล้ว":"ถอนข้อมูลเผยแพร่แล้ว แต่ลบไฟล์ไม่สำเร็จ ต้องให้ผู้ดูแลตรวจต่อ",!ans.file_deleted);
 await refresh();
 }catch(err){if(err.message==="expired")clear();status(msgs[err.message]||"ถอนรูปไม่สำเร็จ",true);}
 finally{busy=false;withdraw.disabled=false;}
 });
 card.appendChild(withdraw);return card;
}
async function refresh(){
 if(!valid(session))return;
 d.refresh.disabled=true;
 try{
   const [pending,published]=await Promise.all([
     send(API,{action:"queue"}),send(API,{action:"published"})
   ]);
   const queue=(pending.items||[]).map(renderPending);
   const approved=(published.items||[]).map(renderPublished);
   d.queue.replaceChildren(...(queue.length?queue:[node("p","photos-help","ไม่มีรูปที่รอตรวจ")]));
   d.published.replaceChildren(...(approved.length?approved:[node("p","photos-help","ยังไม่มีภาพกิจกรรมที่เผยแพร่")]));
   d.count.textContent="("+queue.length+")";
 }catch(err){if(err.message==="expired")clear();status(msgs[err.message]||"โหลดรายการไม่สำเร็จ",true);}
 finally{d.refresh.disabled=false;}
}
restore();show();if(valid(session))refresh();
d.refresh.addEventListener("click",refresh);
e("photoReviewLogout").addEventListener("click",clear);
d.form.addEventListener("submit",async event=>{
 event.preventDefault();if(busy)return;busy=true;
 try{const ans=await send(REVIEW,{action:"unlock",reviewer_name:e("photoReviewerName").value.trim(),
       pin:e("photoReviewerPin").value.trim()},false);
     save({token:ans.token,reviewer_name:ans.reviewer_name,expires_at:ans.expires_at});
     e("photoReviewerPin").value="";show();status("เข้าสู่หน้าตรวจรูปแล้ว");await refresh();}
 catch(err){status(msgs[err.message]||"เข้าสู่ระบบไม่สำเร็จ",true);}
 finally{busy=false;}
});
})();
