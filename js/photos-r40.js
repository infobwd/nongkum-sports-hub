/* R40: staff photo intake from browser. Local PIN is never saved; session reuses R34/R37.
 * The browser never writes Supabase Storage directly or handles service credentials. */
(function(){
"use strict";
const API="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-activity-photos";
const EDITOR="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-editor";
const REVIEWER="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-reviewer";
const STORE={editor:"nongkum-r34-editor-session-v1",reviewer:"nongkum-r37-reviewer-session-v1"};
const $=id=>document.getElementById(id);
const view={login:$("photoLogin"),form:$("photoLoginForm"),pin:$("photoPin"),
 workspace:$("photoWorkspace"),session:$("photoSessionLabel"),editor:$("photoEditor"),
 reviewer:$("photoReviewer"),upload:$("photoUploadForm"),status:$("photoStatus"),
 sport:$("photoSport"),date:$("photoDate"),fixture:$("photoFixture"),
 file:$("photoFile"),preview:$("photoPreview"),submit:$("photoSubmit"),
 queue:$("photoQueue"),refresh:$("photoRefreshQueue")};
const state={role:"editor",session:null,program:null,selectedFile:null,busy:false};
const label=text=>String(text??"");
function announce(s,error=false){view.status.textContent=s;view.status.dataset.error=error?"true":"false";}
function saved(role){
 try{
  const obj=JSON.parse(localStorage.getItem(STORE[role])||"null");
  return obj&&/^[a-f0-9]{64}$/.test(obj.token||"")&&Date.parse(obj.expires_at)>Date.now()?obj:null;
 }catch(_){return null;}
}
function setRole(role){
 state.role=role;
 document.querySelectorAll("[data-photo-role]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.photoRole===role)));
 announce(role==="editor"?"ผู้ส่งภาพใช้รหัสบันทึกผลการแข่งขัน":"ผู้ตรวจภาพใช้รหัสยืนยันผลการแข่งขัน");
}
function makeSession(role,ans){
 const val={token:ans.token,expires_at:ans.expires_at};
 if(role==="reviewer")val.reviewer_name=ans.reviewer_name||"ผู้ตรวจ";
 return val;
}
async function authCall(role,action,extra={},token=""){
 const r=await fetch(role==="editor"?EDITOR:REVIEWER,{method:"POST",cache:"no-store",
  headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},
  body:JSON.stringify({action,...extra})});
 const out=await r.json();
 if(!out||typeof out.ok!=="boolean")throw Error("ตอบกลับจากระบบไม่สมบูรณ์");
 return out;
}
async function photoCall(action,extra={},token=state.session?.token){
 if(!token)throw Error("กรุณาเข้าสู่ระบบอีกครั้ง");
 const r=await fetch(API,{method:"POST",cache:"no-store",
  headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
  body:JSON.stringify({action,...extra})});
 const out=await r.json();
 if(!out||typeof out.ok!=="boolean")throw Error("ตอบกลับจากระบบไม่สมบูรณ์");
 if(!out.ok)throw Error(({expired:"สิทธิ์หมดอายุ กรุณาเข้าระบบใหม่",
  missing_fixture:"รายการแข่งขันไม่ตรงฐานข้อมูลล่าสุด กรุณาโหลดใหม่",
  limited:"จำนวนภาพที่ส่งถึงขีดจำกัด กรุณาติดต่อผู้ดูแล",
  consent_required:"กรุณาตรวจและยืนยันสิทธิ์การเผยแพร่ภาพ",
  reason_required:"กรุณาระบุเหตุผลส่งกลับอย่างน้อย 8 ตัวอักษร",
  upload_missing:"ส่งรูปไม่ครบ กรุณาลองใหม่",stale:"รายการนี้ถูกดำเนินการแล้ว กรุณาโหลดใหม่"})[out.error]||"ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลและลองใหม่");
 return out;
}
function lock(flag){state.busy=flag;document.querySelectorAll("button").forEach(b=>{if(!b.hasAttribute("data-photo-role"))b.disabled=flag;});}
function showWorkspace(){
 view.login.hidden=true;view.workspace.hidden=false;
 view.editor.hidden=state.role!=="editor";view.reviewer.hidden=state.role!=="reviewer";
 view.session.textContent=(state.role==="editor"?"ผู้ส่งภาพ":"ผู้ตรวจภาพ")+
  " · ใช้งานได้ถึง "+new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit"}).format(new Date(state.session.expires_at))+" น.";
 if(state.role==="editor")loadProgram().catch(()=>announce("ไม่สามารถเปิดรายการแข่งขันได้ กรุณาลองรีเฟรช",true));
 else loadQueue().catch(err=>announce(err.message,true));
}
async function enterSession(role,session){
 state.role=role;state.session=session;setRole(role);
 const status=await authCall(role,"status",{},session.token);
 if(!status.ok)throw Error("สิทธิ์เข้าใช้งานหมดอายุ");
 showWorkspace();announce("เข้าสู่ระบบสำเร็จ");
}
document.querySelectorAll("[data-photo-role]").forEach(btn=>btn.addEventListener("click",()=>setRole(btn.dataset.photoRole)));
view.form.addEventListener("submit",async e=>{
 e.preventDefault();
 const pin=view.pin.value;view.pin.value="";
 if(!/^\d{4,30}$/.test(pin)){announce("กรุณากรอกรหัสให้ถูกต้อง",true);return;}
 lock(true);announce("กำลังตรวจรหัส…");
 try{
  const answer=await authCall(state.role,"unlock",{pin});
  if(!answer.ok)throw Error(answer.error==="wrong_pin"?"รหัสไม่ถูกต้อง":"ไม่สามารถเข้าสู่ระบบได้");
  const session=makeSession(state.role,answer);
  try{localStorage.setItem(STORE[state.role],JSON.stringify(session));}catch(_){}
  await enterSession(state.role,session);
 }catch(err){announce(err.message,true);}
 finally{lock(false);}
});
$("photoLogout").addEventListener("click",async()=>{
 const role=state.role,token=state.session?.token;
 state.session=null;view.workspace.hidden=true;view.login.hidden=false;
 try{localStorage.removeItem(STORE[role]);}catch(_){}
 if(token)await authCall(role,"logout",{},token).catch(()=>{});
 announce("ออกจากระบบแล้ว");
});
function fixtureLabel(f,schoolMap){
 const teams=f.kind==="track_event"?f.name:
   [schoolMap.get(f.team_a_id)||f.source_team_a_label,
    schoolMap.get(f.team_b_id)||f.source_team_b_label].filter(Boolean).join(" พบ ");
 return [f.name||teams,f.kind==="track_event"?"":teams,f.division,
  f.round||f.round_name].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(" · ");
}
function addOption(select,value,title){
 const option=document.createElement("option");option.value=value;option.textContent=title;select.appendChild(option);
}
async function loadProgram(){
 if(state.program)return populate();
 const res=await fetch("./data/program-from-pdf-2569-20261104-draft.json?photo-intake=r40",{cache:"force-cache"});
 if(!res.ok)throw Error("โหลดตารางไม่ได้");
 const raw=await res.json();
 const p=globalThis.NongkumProgramCorrections?.apply(raw);
 if(p?.fixtures?.length!==236)throw Error("ตารางล่าสุดไม่ตรงกัน");
 state.program=p;populate();
}
function populate(){
 if(!state.program)return;
 const p=state.program;
 const selected=view.sport.value;
 const sports=new Map(p.sports.map(s=>[s.id,s.name]));
 view.sport.replaceChildren();addOption(view.sport,"","เลือกกีฬา");
 for(const [id,name] of sports)addOption(view.sport,id,name);
 if(sports.has(selected))view.sport.value=selected;
 populateDates();
}
function populateDates(){
 const sport=view.sport.value,prev=view.date.value;
 const fixtures=state.program.fixtures.filter(f=>!sport||f.sport_id===sport);
 const dates=[...new Set(fixtures.map(f=>f.planning_date||f.draft_date).filter(Boolean))].sort();
 view.date.replaceChildren();addOption(view.date,"","ทุกวัน");
 dates.forEach(d=>addOption(view.date,d,new Intl.DateTimeFormat("th-TH",{timeZone:"UTC",day:"numeric",month:"short",year:"numeric"}).format(new Date(d+"T00:00:00Z"))));
 if(dates.includes(prev))view.date.value=prev;
 populateFixtures();
}
function populateFixtures(){
 const sport=view.sport.value,date=view.date.value,old=view.fixture.value;
 const schoolMap=new Map(state.program.schools.map(s=>[s.id,s.short||s.name]));
 const fixtures=state.program.fixtures.filter(f=>(!sport||f.sport_id===sport)&&
  (!date||f.planning_date===date||(!f.planning_date&&f.draft_date===date)));
 view.fixture.replaceChildren();addOption(view.fixture,"","เลือกกิจกรรม");
 fixtures.forEach(f=>addOption(view.fixture,f.id,fixtureLabel(f,schoolMap)));
 if(fixtures.some(f=>f.id===old))view.fixture.value=old;
}
view.sport.addEventListener("change",populateDates);
view.date.addEventListener("change",populateFixtures);
let previewObject=null;
view.file.addEventListener("change",()=>{
 if(previewObject)URL.revokeObjectURL(previewObject);
 const file=view.file.files?.[0];
 if(!file){view.preview.hidden=true;return;}
 if(file.size>20*1024*1024){announce("ไฟล์ต้นฉบับใหญ่เกิน 20 MB กรุณาเลือกรูปใหม่",true);view.file.value="";return;}
 previewObject=URL.createObjectURL(file);view.preview.src=previewObject;view.preview.hidden=false;
});
function imageFromFile(file){
 return new Promise((resolve,reject)=>{
  const img=new Image(),url=URL.createObjectURL(file);
  img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error("ไม่สามารถอ่านรูปภาพนี้ได้"));};
  img.src=url;
 });
}
function webpBlob(canvas,q){
 return new Promise(resolve=>canvas.toBlob(resolve,"image/webp",q));
}
async function prepare(file){
 if(!file||!file.type.startsWith("image/")||file.size>20*1024*1024)throw Error("โปรดเลือกรูปภาพไม่เกิน 20 MB");
 const img=await imageFromFile(file);
 if(!img.naturalWidth||!img.naturalHeight)throw Error("ไม่สามารถอ่านขนาดรูป");
 const canvas=document.createElement("canvas");
 const ctx=canvas.getContext("2d",{alpha:false});
 if(!ctx)throw Error("เบราว์เซอร์ไม่รองรับการจัดการภาพ");
 for(const max of [1600,1280,1024,800]){
  const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const q of [.82,.72,.6,.45]){
   const blob=await webpBlob(canvas,q);
   if(!blob||blob.type!=="image/webp")throw Error("เบราว์เซอร์ไม่รองรับ WebP กรุณาใช้ Safari หรือ Chrome รุ่นใหม่");
   if(blob.size<=650000&&blob.size>=100)return blob;
  }
 }
 throw Error("รูปนี้มีรายละเอียดมากเกินไป กรุณาเลือกรูปอื่น");
}
function encode64(bytes){
 let str="";
 for(let i=0;i<bytes.length;i+=8192){
  const chunk=bytes.subarray(i,i+8192);
  str+=Array.from(chunk,x=>String.fromCharCode(x)).join("");
 }
 return btoa(str);
}
view.upload.addEventListener("submit",async e=>{
 e.preventDefault();if(state.busy)return;
 if(!state.session||state.role!=="editor"){announce("กรุณาเข้าสู่ระบบผู้ส่งภาพก่อน",true);return;}
 const f=view.file.files?.[0];
 if(!f||!view.fixture.value||!$("photoConsent").checked){announce("กรุณาเลือกรายการ รูป และยืนยันสิทธิ์ใช้ภาพ",true);return;}
 lock(true);announce("กำลังย่อและส่งรูปเข้าสู่พื้นที่ส่วนตัว…");
 try{
  const blob=await prepare(f),bytes=new Uint8Array(await blob.arrayBuffer());
  const ans=await photoCall("upload",{fixture_id:view.fixture.value,
    uploader_name:$("photoUploader").value.trim(),caption:$("photoCaption").value.trim(),
    consent_attested:true,data:encode64(bytes)});
  if(ans.status!=="pending")throw Error("ระบบยังไม่ยืนยันว่ารอผู้ตรวจ");
  announce("ส่งภาพเรียบร้อย · รอผู้ตรวจอนุมัติ ภาพยังไม่แสดงสาธารณะ");
  view.upload.reset();view.preview.hidden=true;view.sport.value="";populateDates();
 }catch(err){announce(err.message,true);}
 finally{lock(false);}
});
function elt(name,cls,textValue){
 const node=document.createElement(name);if(cls)node.className=cls;
 if(textValue!==undefined)node.textContent=label(textValue);
 return node;
}
function btn(labelValue,fn,cssClass=""){
 const button=elt("button",cssClass,labelValue);button.type="button";button.addEventListener("click",fn);return button;
}
async function loadQueue(){
 if(!state.session||state.role!=="reviewer")return;
 announce("กำลังเปิดรายการภาพรอตรวจ…");
 const ans=await photoCall("queue");
 view.queue.replaceChildren();
 const items=Array.isArray(ans.items)?ans.items:[];
 if(!items.length)view.queue.appendChild(elt("p","photo-hint","ไม่มีภาพรอตรวจในขณะนี้"));
 for(const item of items){
  const card=elt("article");
  card.appendChild(elt("h3","",item.sport_id+" · "+item.division));
  card.appendChild(elt("p","",item.caption+" · รหัสรายการ "+item.fixture_id));
  card.appendChild(elt("p","photo-hint","ส่งโดย "+item.uploader_name+" · "+new Intl.DateTimeFormat("th-TH",
   {timeZone:"Asia/Bangkok",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(item.submitted_at))+" น."));
  const image=elt("img","photo-hidden");image.alt="ภาพสำหรับผู้ตรวจ ใช้งานได้ชั่วคราว";image.hidden=true;card.appendChild(image);
  const rights=elt("label","photo-check");
  const checkbox=document.createElement("input");checkbox.type="checkbox";
  const description=elt("span","","ตรวจภาพและหลักฐานแล้ว ยืนยันว่าได้รับอนุญาตให้เผยแพร่");
  rights.append(checkbox,description);card.appendChild(rights);
  const actions=elt("div","photo-row");
  actions.appendChild(btn("เปิดรูปตรวจ",async()=>{
   lock(true);announce("กำลังเปิดภาพสำหรับตรวจ…");
   try{
    const ans=await photoCall("preview",{photo_id:item.photo_id});
    const url=String(ans.preview_url||"");
    if(!url.startsWith("https://zprxvpfkvforoxrboqiv.supabase.co/storage/v1/object/sign/nongkum-activity-intake/"))
     throw Error("ลิงก์รูปภาพไม่ถูกต้อง");
    image.src=url;image.hidden=false;announce("เปิดภาพได้ชั่วคราว กรุณาตรวจให้ครบก่อนอนุมัติ");
   }catch(err){announce(err.message,true);}finally{lock(false);}
  }));
  actions.appendChild(btn("อนุมัติและเผยแพร่",async()=>{
   if(!checkbox.checked||image.hidden){announce("กรุณาเปิดภาพ ตรวจและยืนยันสิทธิ์ใช้ภาพก่อน",true);return;}
   if(!confirm("ยืนยันเผยแพร่ภาพนี้ต่อสาธารณะหรือไม่?"))return;
   lock(true);announce("กำลังอนุมัติและเผยแพร่ภาพ…");
   try{await photoCall("approve",{photo_id:item.photo_id,consent_verified:true});announce("เผยแพร่ภาพสำเร็จแล้ว");await loadQueue();}
   catch(err){announce(err.message,true);}finally{lock(false);}
  },"photo-primary"));
  const reason=elt("textarea");reason.placeholder="ระบุเหตุผลส่งกลับอย่างน้อย 8 ตัวอักษร";reason.maxLength=500;
  const sendBack=btn("ส่งกลับแก้ไข",async()=>{
   if(reason.value.trim().length<8){announce("กรุณาระบุเหตุผลอย่างน้อย 8 ตัวอักษร",true);return;}
   lock(true);
   try{await photoCall("reject",{photo_id:item.photo_id,reason:reason.value.trim()});announce("ส่งภาพกลับให้ผู้รับผิดชอบแล้ว");await loadQueue();}
   catch(err){announce(err.message,true);}finally{lock(false);}
  },"photo-danger");
  card.append(actions,reason,sendBack);view.queue.appendChild(card);
 }
 announce("ภาพรอตรวจ "+items.length+" รายการ");
}
view.refresh.addEventListener("click",()=>loadQueue().catch(err=>announce(err.message,true)));
const fromEditor=saved("editor"),fromReviewer=saved("reviewer");
if(fromEditor||fromReviewer)enterSession(fromEditor?"editor":"reviewer",fromEditor||fromReviewer)
 .catch(()=>{state.session=null;view.login.hidden=false;view.workspace.hidden=true;announce("กรุณาเข้าระบบอีกครั้ง",true);});
else setRole("editor");
})();
