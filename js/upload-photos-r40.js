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
 fixture:$("photoFixture"),fixtureSearch:$("photoFixtureSearch"),uploader:$("photoUploader"),rememberUploader:$("photoRememberUploader"),
 forgetUploader:$("photoForgetUploader"),caption:$("photoCaption"),
 file:$("photoFile"),camera:$("photoCamera"),preview:$("photoPreview"),previewImage:$("photoPreviewImg"),
 previewInfo:$("photoPreviewInfo"),confirm:$("photoConfirm"),submit:$("photoSubmit"),
 selectedFixture:$("photoFixtureSelected"),inlineError:$("photoInlineError"),
 success:$("photoSendSuccess"),successFixture:$("photoSuccessFixture"),
 successReference:$("photoSuccessReference"),sendMore:$("photoSendMore"),viewMine:$("photoViewMine"),
 minePanel:$("photoMinePanel"),mineRefresh:$("photoMineRefresh"),
 mineCount:$("photoMineCount"),mineList:$("photoMineList"),mineStatus:$("photoMineStatus")};
if(!ui.loginForm)return;
let session=null,program=null,compressed=null,previewUrl="",loading=false,compressing=false,selectionId=0;
function notice(s,bad=false){ui.status.textContent=s||"";ui.status.dataset.error=bad?"true":"false";}
function errorAtForm(message){ui.inlineError.textContent=message||"";ui.inlineError.hidden=!message;}
function showSendForm(){
 ui.success.hidden=true;ui.form.hidden=false;errorAtForm("");
 ui.form.scrollIntoView({block:"start",behavior:"auto"});
}
function showSendSuccess(id,eventLabel){
 errorAtForm("");ui.form.hidden=true;
 ui.successFixture.textContent=eventLabel;
 ui.successReference.textContent="รหัสอ้างอิง: "+id;
 ui.success.hidden=false;
 ui.success.focus({preventScroll:true});
 ui.success.scrollIntoView({block:"start",behavior:"auto"});
}
function selectedEventLabel(){
 return fixtureChoices.find(x=>x.id===ui.fixture.value)?.label||"ไม่พบชื่อรายการที่เลือก";
}
function showFixtureLabel(){
 const choice=fixtureChoices.find(x=>x.id===ui.fixture.value);
 ui.selectedFixture.textContent=choice?"รายการที่เลือก: "+choice.label:"";
 ui.selectedFixture.hidden=!choice;
}
function sessionFromStorage(){
 try{const x=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");
 if(x&&/^[a-f0-9]{64}$/.test(x.token||"")&&Date.parse(x.expires_at)>Date.now())return x;
 }catch(_){}
 return null;
}
function saveSession(x){session=x;try{localStorage.setItem(SESSION_KEY,JSON.stringify(x));}catch(_){}}
function clearSession(){session=null;try{localStorage.removeItem(SESSION_KEY);}catch(_){}}
// R40-E: Only the uploader's name is remembered locally. Never store PIN, session or photos here.
const UPLOADER_NAME_KEY="nongkum-r40-uploader-name-v1";
const UPLOADER_OPT_OUT_KEY="nongkum-r40-uploader-name-optout-v1";
const UPLOADER_NAME_TTL_MS=30*24*60*60*1000;
function rememberedUploaderName(){
 try{
  const data=JSON.parse(localStorage.getItem(UPLOADER_NAME_KEY)||"null");
  if(!data)return "";
  const name=typeof data.name==="string"?data.name.trim():"";
  const saved=data.saved_at;
  if(name.length>=2&&name.length<=100&&typeof saved==="number"&&Number.isFinite(saved)&&
     saved<=Date.now()+60000&&Date.now()-saved<UPLOADER_NAME_TTL_MS)return name;
  localStorage.removeItem(UPLOADER_NAME_KEY);
 }catch(_){}
 return "";
}
function rememberUploaderName(name){
 const cleaned=String(name||"").trim();
 if(cleaned.length<2||cleaned.length>100)return;
 try{localStorage.setItem(UPLOADER_NAME_KEY,JSON.stringify({name:cleaned,saved_at:Date.now()}));}catch(_){}
}
function clearRememberedUploaderName(){
 try{localStorage.removeItem(UPLOADER_NAME_KEY);}catch(_){}
}
function isUploaderRememberEnabled(){
 try{return localStorage.getItem(UPLOADER_OPT_OUT_KEY)!=="1";}catch(_){return false;}
}
function setUploaderRememberEnabled(enabled){
 try{
  if(enabled)localStorage.removeItem(UPLOADER_OPT_OUT_KEY);
  else localStorage.setItem(UPLOADER_OPT_OUT_KEY,"1");
 }catch(_){}
}
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
 invalid_image:"ระบบตรวจไฟล์ภาพไม่ผ่าน แม้แสดงภาพตัวอย่างได้ กรุณาลองใหม่ หากยังพบปัญหาให้แจ้งผู้ดูแล",
 image:"ไม่สามารถเปิดรูปนี้บนโทรศัพท์ได้ กรุณาถ่ายใหม่หรือเปลี่ยนเป็น JPEG",
 webp:"เครื่องนี้ไม่สามารถย่อรูปได้ กรุณาลอง Chrome หรือรูปอื่น",
 too_large:"ไฟล์ใหญ่เกินไป กรุณาเลือกรูปใหม่",invalid:"กรุณาตรวจข้อมูลที่กรอก",
 upload_failed:"อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง",
 unavailable:"ระบบรับภาพยังไม่พร้อม กรุณาติดต่อผู้ดูแล"
 })[e]||"ไม่สามารถส่งรูปได้ กรุณาลองใหม่";}
function option(select,value,label){
 const x=document.createElement("option");x.value=value;x.textContent=label;select.appendChild(x);return x;
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
let fixtureChoices=[],fixtureEnhanced=false;
function fixtureMatches(haystack,query){
 const tokens=String(query||"").toLocaleLowerCase("th").trim().split(/\s+/).filter(Boolean);
 const source=String(haystack||"").toLocaleLowerCase("th");
 return tokens.every(token=>source.includes(token));
}
function populateFixtureOptions(query=""){
 const old=ui.fixture.value;
 ui.fixture.replaceChildren();
 option(ui.fixture,"","เลือกกิจกรรม");
 for(const item of fixtureChoices){
   if(!fixtureMatches(item.search,query))continue;
   const entry=option(ui.fixture,item.id,item.label);
   entry.dataset.search=item.search;
 }
 if(old && [...ui.fixture.options].some(x=>x.value===old))ui.fixture.value=old;
 else ui.fixture.value="";
 if(fixtureEnhanced)globalThis.jQuery(ui.fixture).trigger("change.select2");
 showFixtureLabel();
}
function updateFixtures(){
 fixtureChoices=[];
 if(ui.fixtureSearch)ui.fixtureSearch.value="";
 if(program&&ui.sport.value){
   const schools=new Map(program.schools.map(x=>[x.id,x]));
   for(const f of program.fixtures.filter(x=>x.sport_id===ui.sport.value)){
     const a=schools.get(f.team_a_id),b=schools.get(f.team_b_id);
     const teamText=a&&b?" · "+(a.short||a.name)+" – "+(b.short||b.name):"";
     const label=[f.name||f.source_pair_text||f.round||"รายการแข่งขัน",f.division].filter(Boolean).join(" · ")+teamText;
     const search=[f.id,f.name,f.source_pair_text,f.round,f.division,
       a?.name,a?.short,b?.name,b?.short].filter(Boolean).join(" ");
     fixtureChoices.push({id:f.id,label:label.slice(0,240),search});
   }
 }
 populateFixtureOptions();
}
function setupFixtureSearch(){
 const jq=globalThis.jQuery;
 if(jq&&jq.fn&&typeof jq.fn.select2==="function"){
   try{
     jq(ui.fixture).select2({
       width:"100%",dropdownParent:jq(ui.form),minimumResultsForSearch:0,
       placeholder:"แตะเพื่อค้นหารายการแข่งขัน",
       language:{noResults:()=>"ไม่พบรายการแข่งขัน",searching:()=>"กำลังค้นหา…"},
       matcher:(params,data)=>{
         if(!data.id)return data;
         const search=data.element?.dataset?.search||data.text;
         return fixtureMatches(search,params.term)?data:null;
       }
     });
     fixtureEnhanced=true;
     return;
   }catch(_){/* Keep native select usable if enhancement fails. */}
 }
 // Offline/CDN-blocked fallback still supports typing, without Select2.
 if(ui.fixtureSearch){
   ui.fixtureSearch.hidden=false;
   ui.fixtureSearch.addEventListener("input",()=>populateFixtureOptions(ui.fixtureSearch.value));
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
const TARGET_IMAGE_BYTES=250000,MAX_IMAGE_BYTES=350000;
const toBlob=(canvas,quality,type="image/webp")=>new Promise((resolve,reject)=>
 canvas.toBlob(x=>x?resolve(x):reject(Error("image")), type,quality));
async function sanitizePhoto(file){
 if(!file||!["image/jpeg","image/png","image/webp","image/heic","image/heif",""].includes((file.type||"").toLowerCase())||file.size>18000000)
   throw Error("invalid_image");
 const bitmap=await fileBitmap(file);
 const width=bitmap.width||bitmap.naturalWidth,height=bitmap.height||bitmap.naturalHeight;
 if(!width||!height||width>15000||height>15000)throw Error("invalid_image");
 const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:false});
 if(!ctx)throw Error("webp");
 const aspect=Math.min(1,1280/width,960/height);
 let w=Math.max(80,Math.floor(width*aspect)),h=Math.max(80,Math.floor(height*aspect));
 if(w<80||h<80)throw Error("invalid_image");
 let blob=null,bestFallback=null;
 // Prefer WebP at <=250 KB; keep at most 350 KB if a detail-heavy photo resists compression.
 // Re-encoding through an opaque canvas strips the original file's metadata/location.
 const qualities=[0.84,0.76,0.68,0.60,0.52];
 for(let step=0;step<20;step++){
   canvas.width=w;canvas.height=h;
   ctx.fillStyle="#ffffff";ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);
   const q=qualities[step%qualities.length];
   const webp=await toBlob(canvas,q,"image/webp");
   const candidate=webp.type==="image/webp"?webp:await toBlob(canvas,q,"image/jpeg");
   if(!["image/webp","image/jpeg"].includes(candidate.type))throw Error("image");
   if(candidate.size>=1000&&candidate.size<=MAX_IMAGE_BYTES){
     // Keep an acceptable fallback without giving up too much sharpness if 250 KB is unattainable.
     if(!bestFallback||candidate.size>bestFallback.size)bestFallback=candidate;
   }
   if(candidate.size>=1000&&candidate.size<=TARGET_IMAGE_BYTES){blob=candidate;break;}
   if(step%qualities.length===qualities.length-1){
     w=Math.max(80,Math.floor(w*0.82));h=Math.max(80,Math.floor(h*0.82));
   }
 }
 blob=blob||bestFallback;
 if(bitmap.close)bitmap.close();
 if(!blob||blob.size>MAX_IMAGE_BYTES||blob.size<1000)throw Error("too_large");
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
// Status is checked server-side for this session only; private image bytes never returned.
function photoState(item){
 if(item.publication_status==="published")return "เผยแพร่บนเว็บไซต์แล้ว";
 if(item.publication_status==="revoked")return "ถอนภาพจากเว็บไซต์แล้ว";
 if(item.publication_status==="publishing")return "กำลังเผยแพร่";
 if(item.publication_status==="failed")return "เผยแพร่ขัดข้อง · รอผู้ตรวจ";
 if(item.status==="rejected")return "ส่งกลับแก้ไข · ติดต่อผู้ตรวจ";
 if(item.status==="approved")return "อนุญาตใช้ภายใน · ยังไม่เผยแพร่";
 return "ส่งแล้ว · รอผู้ตรวจ";
}
async function refreshMine(){
 if(!session){ui.mineStatus.textContent="กรุณาเข้าสู่ระบบก่อน";return;}
 ui.mineRefresh.disabled=true;ui.mineStatus.textContent="กำลังตรวจสถานะภาพที่ส่งในรอบนี้…";
 try{
  const answer=await call(PHOTOS,"mine");
  if(!answer.ok){
   if(answer.error==="expired"){clearSession();showLogin();}
   ui.mineStatus.textContent=errorText(answer.error);return;
  }
  const records=Array.isArray(answer.items)?answer.items:[];
  ui.mineCount.textContent="("+records.length+")";ui.mineList.replaceChildren();
  for(const item of records){
   const box=document.createElement("article");box.className="photo-mine-entry";
   const head=document.createElement("strong");
   head.textContent=(item.sport_id||"กีฬา")+" · "+(item.division||"");
   const state=document.createElement("span");state.textContent=photoState(item);
   const detail=document.createElement("small");
   detail.textContent=(item.caption||"ภาพกิจกรรม")+" · รหัส "+String(item.id||"").slice(0,8);
   box.append(head,state,detail);ui.mineList.append(box);
  }
  ui.mineStatus.textContent=records.length?
   "อัปเดตสถานะแล้ว · เฉพาะภาพในรอบที่เข้าใช้งานนี้":
   "ยังไม่มีภาพที่ส่งด้วยสิทธิ์รอบนี้";
 }catch(_){ui.mineStatus.textContent="ยังตรวจสถานะไม่ได้ กรุณาลองใหม่เมื่ออินเทอร์เน็ตพร้อม";}
 finally{ui.mineRefresh.disabled=false;}
}
async function choosePhoto(input){
 errorAtForm("");
 if(loading)return;
 const current=++selectionId;
 if(input===ui.file)ui.camera.value="";else ui.file.value="";
 clearPreview();
 const file=input.files?.[0];
 ui.submit.disabled=true;
 if(!file){compressing=false;notice("ยังไม่ได้เลือกรูป");return;}
 compressing=true;
 notice("กำลังย่อรูปและตรวจไฟล์…");
 try{
   const result=await sanitizePhoto(file);
   if(current!==selectionId)return;
   compressed=result;
   previewUrl=URL.createObjectURL(compressed);
   ui.previewImage.src=previewUrl;
   ui.previewInfo.textContent="ไฟล์สำหรับส่ง "+Math.ceil(compressed.size/1024)+" KB ("+(compressed.type==="image/jpeg"?"JPEG":"WebP")+") · รอผู้ตรวจอนุญาต";
   ui.preview.hidden=false;
   notice("รูปพร้อมส่ง (ยังไม่เผยแพร่)");
 }catch(e){
   if(current!==selectionId)return;
   notice(errorText(e?.message),true);input.value="";
 }finally{
   if(current===selectionId){compressing=false;ui.submit.disabled=!compressed;}
 }
}
for(const source of [ui.camera,ui.file]){
 source.addEventListener("change",()=>choosePhoto(source));
}
ui.rememberUploader.checked=isUploaderRememberEnabled();
if(ui.rememberUploader.checked)ui.uploader.value=rememberedUploaderName();
ui.rememberUploader.addEventListener("change",()=>{
 setUploaderRememberEnabled(ui.rememberUploader.checked);
 if(!ui.rememberUploader.checked)clearRememberedUploaderName();
 notice(ui.rememberUploader.checked?"จะจำชื่อไว้หลังส่งภาพสำเร็จ":"จะไม่จำชื่อในเครื่องนี้");
});
ui.forgetUploader.addEventListener("click",()=>{
 clearRememberedUploaderName();
 setUploaderRememberEnabled(false);
 ui.rememberUploader.checked=false;
 ui.uploader.value="";
 ui.uploader.focus();
 notice("ลบชื่อที่จำไว้ในเครื่องนี้แล้ว");
});
setupFixtureSearch();
ui.sport.addEventListener("change",updateFixtures);
ui.fixture.addEventListener("change",showFixtureLabel);
ui.sendMore.addEventListener("click",showSendForm);
ui.viewMine.addEventListener("click",()=>{
 ui.minePanel.open=true;
 ui.minePanel.scrollIntoView({block:"start",behavior:"auto"});
 refreshMine();
});
ui.mineRefresh.addEventListener("click",refreshMine);
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
 if(loading||compressing||!session||!compressed||!ui.confirm.checked||!ui.fixture.value||!ui.uploader.value.trim()){
   const msg="กรุณาเลือกรายการแข่งขัน เลือกภาพ และยืนยันก่อนส่ง";
   errorAtForm(msg);notice(msg,true);return;
 }
 loading=true;ui.submit.disabled=true;ui.camera.disabled=true;ui.file.disabled=true;
 errorAtForm("");ui.submit.textContent="กำลังส่งภาพ… กรุณารอ";
 notice("กำลังส่งภาพเข้าพื้นที่ส่วนตัว… ห้ามกดส่งซ้ำ");
 try{
   const b64=await blobBase64(compressed);
   const ans=await call(PHOTOS,"upload",{event_id:ui.fixture.value,uploaded_by:ui.uploader.value.trim(),
     caption:ui.caption.value.trim(),image_b64:b64});
   if(!ans.ok){
     if(ans.error==="expired"){clearSession();showLogin();}
     errorAtForm(errorText(ans.error));notice(errorText(ans.error),true);return;
   }
   if(ui.rememberUploader.checked)rememberUploaderName(ui.uploader.value);
   else clearRememberedUploaderName();
   const eventLabel=selectedEventLabel();
   ui.file.value="";ui.camera.value="";ui.confirm.checked=false;clearPreview();
   showSendSuccess(String(ans.id||"ไม่ระบุ"),eventLabel);
   notice("ส่งภาพสำเร็จแล้ว · รอผู้ตรวจ");
   if(ui.minePanel.open)refreshMine();
 }catch(_){
   const msg="เครือข่ายขัดข้อง ยังยืนยันไม่ได้ว่าส่งสำเร็จหรือไม่ โปรดตรวจสถานะก่อน ไม่ต้องกดส่งซ้ำทันที";
   errorAtForm(msg);notice(msg,true);
 }
 finally{loading=false;ui.camera.disabled=false;ui.file.disabled=false;ui.submit.textContent="ส่งภาพให้ผู้ตรวจ";ui.submit.disabled=!compressed;}
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
