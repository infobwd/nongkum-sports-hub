/* R40 — photo intake only, NEVER immediate publication of students' photographs. */
(function(){
"use strict";
const EDITOR="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-editor";
const PHOTOS="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-activity-photos";
const SESSION_KEY="nongkum-r34-editor-session-v1";
const $=id=>document.getElementById(id);
const ui={login:$("photoUnlock"),workspace:$("photoWorkspace"),loginForm:$("photoLoginForm"),
 loginButton:$("photoLoginButton"),status:$("photoStatus"),session:$("photoSessionInfo"),
 logout:$("photoLogout"),form:$("photoUploadForm"),sport:$("photoSport"),
 fixture:$("photoFixture"),uploader:$("photoUploader"),caption:$("photoCaption"),
 file:$("photoFile"),preview:$("photoPreview"),previewImage:$("photoPreviewImg"),
 previewInfo:$("photoPreviewInfo"),confirm:$("photoConfirm"),submit:$("photoSubmit")};
if(!ui.loginForm)return;
let session=null,program=null,compressed=null,previewUrl="",loading=false;
function notice(s,bad=false){ui.status.textContent=s||"";ui.status.dataset.error=bad?"true":"false";}
function sessionFromStorage(){
 try{const x=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
 if(x&&/^[a-f0-9]{64}$/.test(x.token||"")&&Date.parse(x.expires_at)>Date.now())return x;
 }catch(_){}
 return null;
}
function saveSession(x){session=x;try{localStorage.setItem(SESSION_KEY,JSON.stringify(x));}catch(_){}}
function clearSession(){session=null;try{localStorage.removeItem(SESSION_KEY);}catch(_){}}
function showLogin(){ui.login.hidden=false;ui.workspace.hidden=true;}
function showWorkspace(){
 ui.login.hidden=true;ui.workspace.hidden=false;
 const until=new Date(session?.expires_at||"");
 ui.session.textContent="เข้าใช้งานแล้ว · สิทธิ์หมดอายุ "+(Number.isNaN(until.getTime())?"":new Intl.DateTimeFormat("th-TH",{
 timeZone:"Asia/Bangkok",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"
 }).format(until)+" น.");
}
async function call(endpoint,action,payload={},token=session?.token){
 const headers={"Content-Type":"application/json","Accept":"application/json"};
 if(token)headers.Authorization="Bearer "+token;
 const response=await fetch(endpoint,{method:"POST",headers,cache:"no-store",body:JSON.stringify({action,...payload})});
 let answer;try{answer=await response.json();}catch(_){throw Error("network");}
 if(!answer||typeof answer.ok!=="boolean")throw Error("network");
 return answer;
}
function errorText(e){return ({
 expired:"สิทธิ์หมดอายุ กรุณาเข้าระบบใหม่",wrong_pin:"รหัสไม่ถูกต้อง",limited:"ส่งภาพบ่อยเกินไป กรุณาตรวจจำนวนภาพ",
 source_changed:"ไม่พบรหัสรายการในตารางที่ใช้งาน กรุณาเลือกใหม่",
 invalid_image:"ภาพไม่ใช่ WebP ที่ระบบยอมรับ กรุณาเลือกรูปใหม่",
 too_large:"ไฟล์ใหญ่เกินไป กรุณาเลือกรูปใหม่",invalid:"กรุณาตรวจข้อมูลที่กรอก",
 upload_failed:"อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง",
 unavailable:"ระบบรับภาพยังไม่พร้อม กรุณาติดต่อผู้ดูแล"
 })[e]||"ไม่สามารถส่งรูปได้ กรุณาลองใหม่";}
function option(select,value,label){
 const x=document.createElement("option");x.value=value;x.textContent=label;select.appendChild(x);
}
async function fetchProgram(){
 const response=await fetch("./data/program-from-pdf-2569-20261104-draft.json?photo=r40",{cache:"force-cache"});
 if(!response.ok)throw Error("program");
 const raw=await response.json();
 const corrected=globalThis.NongkumProgramCorrections?.apply(raw);
 if(corrected?.fixtures?.length!==236)throw Error("program");
 program=corrected;
 const sports=new Map(corrected.sports.map(x=>[x.id,x.name]));
 const used=[...new Set(corrected.fixtures.map(x=>x.sport_id))].sort((a,b)=>
  String(sports.get(a)||a).localeCompare(String(sports.get(b)||b),"th"));
 used.forEach(id=>option(ui.sport,id,sports.get(id)||id));
}
function updateFixtures(){
 ui.fixture.replaceChildren();option(ui.fixture,"","เลือกกิจกรรม");
 if(!program)return;
 const schools=new Map(program.schools.map(x=>[x.id,x.short||x.name]));
 for(const f of program.fixtures.filter(x=>x.sport_id===ui.sport.value)){
  const teams=f.team_a_id&&f.team_b_id?
   " · "+(schools.get(f.team_a_id)||"ทีม A")+" – "+(schools.get(f.team_b_id)||"ทีม B"):"";
  const label=(f.name||f.source_pair_text||f.round||"รายการแข่งขัน")+" · "+f.division+teams;
  option(ui.fixture,f.id,label.slice(0,180));
 }
}
async function fileBitmap(file){
 if(typeof createImageBitmap==="function"){
  try{return await createImageBitmap(file,{imageOrientation:"from-image"});}
  catch(_){try{return await createImageBitmap(file);}catch(__){}}
 }
 return await new Promise((resolve,reject)=>{
  const image=new Image(),url=URL.createObjectURL(file);
  image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
  image.onerror=()=>{URL.revokeObjectURL(url);reject(Error("image"));};
  image.src=url;
 });
}
const toBlob=(canvas,quality,type="image/webp")=>new Promise((resolve,reject)=>
 canvas.toBlob(x=>x?resolve(x):reject(Error("image")), type,quality));
async function sanitizePhoto(file){
 if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>18000000)
   throw Error("invalid_image");
 const bitmap=await fileBitmap(file);
 const width=bitmap.width||bitmap.naturalWidth,height=bitmap.height||bitmap.naturalHeight;
 if(!width||!height||width>15000||height>15000)throw Error("invalid_image");
 const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:false});
 if(!ctx)throw Error("webp");
 const aspect=Math.min(1,1280/width,960/height);
 let w=Math.max(80,Math.floor(width*aspect)),h=Math.max(80,Math.floor(height*aspect));
 if(w<80||h<80)throw Error("invalid_image");
 let blob=null;
 for(let step=0;step<12;step++){
   canvas.width=w;canvas.height=h;
   ctx.fillStyle="#ffffff";ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);
   const q=Math.max(0.54,0.82-(step%4)*0.08);
   const webp=await toBlob(canvas,q,"image/webp");
   blob=webp.type==="image/webp"?webp:await toBlob(canvas,q,"image/jpeg");
   if(!["image/webp","image/jpeg"].includes(blob.type))throw Error("image");
   if(blob.size<=340000&&blob.size>=1000)break;
   if(step%4===3){w=Math.max(80,Math.floor(w*0.82));h=Math.max(80,Math.floor(h*0.82));}
 }
 if(bitmap.close)bitmap.close();
 if(!blob||blob.size>350000||blob.size<1000)throw Error("too_large");
 return blob;
}
const blobBase64=blob=>new Promise((resolve,reject)=>{
 const reader=new FileReader();
 reader.onload=()=>resolve(String(reader.result||"").split(",")[1]||"");
 reader.onerror=()=>reject(Error("image"));
 reader.readAsDataURL(blob);
});
function clearPreview(){
 compressed=null;ui.preview.hidden=true;ui.previewImage.removeAttribute("src");
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl="";}
}
ui.file.addEventListener("change",async()=>{
 clearPreview();
 const file=ui.file.files?.[0];if(!file)return;
 ui.submit.disabled=true;notice("กำลังย่อรูปและตรวจไฟล์…");
 try{
   compressed=await sanitizePhoto(file);
   previewUrl=URL.createObjectURL(compressed);
   ui.previewImage.src=previewUrl;ui.previewInfo.textContent="ไฟล์สำหรับส่ง "+Math.ceil(compressed.size/1024)+" KB ("+(compressed.type==="image/jpeg"?"JPEG":"WebP")+") · รอผู้ตรวจอนุญาต";
   ui.preview.hidden=false;notice("รูปพร้อมส่ง (ยังไม่เผยแพร่)");
 }catch(e){notice(errorText(e.message),true);ui.file.value="";}
 finally{ui.submit.disabled=false;}
});
ui.sport.addEventListener("change",updateFixtures);
ui.loginForm.addEventListener("submit",async e=>{
 e.preventDefault();const pin=ui.loginForm.elements.pin.value.trim();
 if(!/^\d{4,30}$/.test(pin)){notice("กรุณาตรวจรหัส",true);return;}
 ui.loginButton.disabled=true;notice("กำลังตรวจสิทธิ์…");
 try{
  const a=await call(EDITOR,"unlock",{pin},null);
  ui.loginForm.elements.pin.value="";
  if(!a.ok){notice(errorText(a.error),true);return;}
  saveSession({token:a.token,expires_at:a.expires_at});
  showWorkspace();notice("พร้อมส่งภาพการแข่งขัน");
 }catch(_){notice("เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง",true);}
 finally{ui.loginButton.disabled=false;}
});
ui.logout.addEventListener("click",async()=>{
 try{if(session)await call(EDITOR,"logout");}catch(_){}
 clearSession();showLogin();clearPreview();notice("ออกจากระบบแล้ว");
});
ui.form.addEventListener("submit",async e=>{
 e.preventDefault();
 if(loading||!session||!compressed||!ui.confirm.checked||!ui.fixture.value||!ui.uploader.value.trim()){
   notice("กรุณาเลือกรายการ ตรวจรูป และยืนยันก่อนส่ง",true);return;
 }
 loading=true;ui.submit.disabled=true;notice("กำลังส่งภาพเข้าพื้นที่ส่วนตัว…");
 try{
   const b64=await blobBase64(compressed);
   const ans=await call(PHOTOS,"upload",{event_id:ui.fixture.value,uploaded_by:ui.uploader.value.trim(),
     caption:ui.caption.value.trim(),image_b64:b64});
   if(!ans.ok){
     if(ans.error==="expired"){clearSession();showLogin();}
     notice(errorText(ans.error),true);return;
   }
   notice("ส่งภาพเรียบร้อย · รอผู้ตรวจ · ภาพยังไม่แสดงบนเว็บไซต์");
   ui.file.value="";ui.confirm.checked=false;clearPreview();
 }catch(_){notice("เครือข่ายขัดข้อง ภาพอาจยังไม่ถูกส่ง กรุณาตรวจผู้ตรวจอีกครั้ง",true);}
 finally{loading=false;ui.submit.disabled=false;}
});
(async()=>{
 session=sessionFromStorage();
 try{await fetchProgram();}catch(_){notice("ยังโหลดตารางรายการแข่งขันไม่ได้ กรุณารีเฟรช",true);ui.submit.disabled=true;}
 if(!session){showLogin();return;}
 try{
  const status=await call(EDITOR,"status");
  if(!status.ok){clearSession();showLogin();notice(errorText(status.error),true);return;}
  session.expires_at=status.expires_at||session.expires_at;
  saveSession(session);showWorkspace();
 }catch(_){clearSession();showLogin();notice("ยังตรวจสิทธิ์ไม่ได้ กรุณาลองใหม่",true);}
})();
})(globalThis);
