/* R40-H: visible upload success and editor-session-only receipts. No private image URLs. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const ui={
 form:$("photoUploadForm"),success:$("photoSendSuccess"),activity:$("photoSuccessActivity"),
 receipt:$("photoSuccessReceipt"),sendAgain:$("photoSendAgain"),
 mineOpen:$("photoMineOpen"),mineFromSuccess:$("photoMineFromSuccess"),
 minePanel:$("photoMinePanel"),mineClose:$("photoMineClose"),
 mineRefresh:$("photoMineRefresh"),mineList:$("photoMineList"),
 mineStatus:$("photoMineStatus"),fixture:$("photoFixture"),sport:$("photoSport"),
 summary:$("photoFixtureSummary"),status:$("photoStatus"),progress:$("photoSendProgress"),
 file:$("photoFile"),camera:$("photoCamera"),submit:$("photoSubmit")
};
if(!ui.form||!ui.success||!ui.mineList)return;
const API="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-activity-photos";
const SESSION_KEY="nongkum-r34-editor-session-v1";
const sports={petanque:"เปตอง",football:"ฟุตบอล",futsal:"ฟุตซอล",athletics:"กรีฑา",
 volleyball:"วอลเลย์บอล",takraw:"ตะกร้อ",tabletennis:"เทเบิลเทนนิส",
 tugofwar:"ชักเย่อ",shootout:"ยิงประตู"};
const labelOf=x=>x?.publication_status==="published"?"เผยแพร่บนเว็บไซต์แล้ว":
 x?.publication_status==="revoked"?"นำภาพออกจากเว็บไซต์แล้ว":
 x?.publication_status==="publishing"?"กำลังเผยแพร่":
 x?.publication_status==="failed"?"เผยแพร่ไม่สำเร็จ รอผู้ตรวจ":
 x?.status==="rejected"?"ส่งกลับแก้ไข":
 x?.status==="approved"?"อนุญาตใช้ภายใน ยังไม่เผยแพร่":
 x?.status==="review"?"รอผู้ตรวจ":"กำลังรับภาพ";
function el(tag,cls,content){
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(content!==undefined)n.textContent=String(content);return n;
}
function fmt(s){
 const d=new Date(s||"");return Number.isFinite(d.getTime())?
 new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"numeric",month:"short",
   hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(d)+" น.":"ไม่ระบุเวลา";
}
function updateFixture(){
 const value=ui.fixture.value;
 const option=ui.fixture.selectedOptions?.[0];
 ui.summary.hidden=!value;
 ui.summary.textContent=value&&option?"รายการที่เลือก: "+option.textContent:"";
}
ui.fixture.addEventListener("change",updateFixture);
ui.sport.addEventListener("change",()=>{ui.summary.hidden=true;ui.summary.textContent="";});
document.addEventListener("nongkum:photo-uploaded",event=>{
 const d=event.detail||{};
 if(typeof d.id!=="string"||!/^[0-9a-f-]{36}$/.test(d.id))return;
 ui.form.hidden=true;ui.success.hidden=false;ui.minePanel.hidden=true;
 ui.activity.textContent=ui.summary.textContent||d.label||"ภาพกิจกรรมการแข่งขัน";
 ui.receipt.textContent="รหัสอ้างอิง: "+d.id.slice(0,8);
 ui.progress.textContent="";ui.status.textContent="";
 ui.success.focus({preventScroll:true});
 ui.success.scrollIntoView({behavior:"smooth",block:"start"});
});
ui.sendAgain.addEventListener("click",()=>{
 ui.success.hidden=true;ui.minePanel.hidden=true;ui.form.hidden=false;
 ui.progress.textContent="";ui.status.textContent="";
 ui.file.value="";ui.camera.value="";
 ui.submit.disabled=true;
 ui.form.scrollIntoView({behavior:"smooth",block:"start"});
});
function activeToken(){
 try{
  const data=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
  if(!data||!(/^[a-f0-9]{64}$/).test(data.token||"")||Date.parse(data.expires_at)<=Date.now())return "";
  return data.token;
 }catch(_){return "";}
}
async function loadMine(){
 const token=activeToken();
 if(!token){ui.mineStatus.textContent="สิทธิ์เข้าใช้งานหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";return;}
 ui.mineRefresh.disabled=true;ui.mineList.replaceChildren();
 ui.mineStatus.textContent="กำลังตรวจสถานะจากระบบ…";
 try{
  const response=await fetch(API,{method:"POST",cache:"no-store",
   headers:{"Content-Type":"application/json","Accept":"application/json","Authorization":"Bearer "+token},
   body:JSON.stringify({action:"mine"})});
  const data=await response.json();
  if(!data?.ok||!Array.isArray(data.items)||data.items.length>50){
    ui.mineStatus.textContent=data?.error==="expired"?"สิทธิ์หมดอายุ กรุณาเข้าระบบใหม่":
      "ยังตรวจสถานะไม่ได้ กรุณาลองใหม่";return;
  }
  for(const item of data.items){
    const card=el("article","photo-mine-item");
    const top=el("strong","",(sports[item.sport_id]||item.sport_id||"กีฬา")+" · "+(item.division||""));
    const status=el("p","photo-mine-state",labelOf(item));
    const detail=el("small","",(item.caption||"ภาพกิจกรรม")+" · ส่ง "+fmt(item.submitted_at));
    card.append(top,status,detail);
    if(item.status==="rejected"&&item.reject_reason){
       card.append(el("p","photo-mine-reason","เหตุผล: "+item.reject_reason));
    }
    ui.mineList.append(card);
  }
  ui.mineStatus.textContent=data.items.length?
     "พบ "+data.items.length+" ภาพจากการเข้าสู่ระบบครั้งนี้":
     "ยังไม่พบภาพที่ส่งในรอบการเข้าสู่ระบบนี้";
  document.dispatchEvent(new Event("nongkum:photo-status-checked"));
 }catch(_){ui.mineStatus.textContent="การเชื่อมต่อขัดข้อง กรุณาลองใหม่ก่อนส่งภาพซ้ำ";}
 finally{ui.mineRefresh.disabled=false;}
}
async function showMine(){
 ui.minePanel.hidden=false;
 await loadMine();
 ui.minePanel.scrollIntoView({behavior:"smooth",block:"start"});
}
ui.mineOpen.addEventListener("click",showMine);
ui.mineFromSuccess.addEventListener("click",showMine);
ui.mineRefresh.addEventListener("click",loadMine);
ui.mineClose.addEventListener("click",()=>{ui.minePanel.hidden=true;});
})();
