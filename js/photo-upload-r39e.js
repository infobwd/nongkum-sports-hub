/* R39-E: authorized editor uploads WebP derivatives, never raw originals.
 * The reviewer must separately approve before any image appears publicly. */
(function(){
"use strict";
const el=id=>document.getElementById(id);
const API="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-sports-photos";
const EDITOR="https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-results-editor";
const KEY="nongkum-r34-editor-session-v1";
const d={login:el("photoLogin"),loginForm:el("photoLoginForm"),workspace:el("photoWorkspace"),
  form:el("photoUploadForm"),search:el("photoSearch"),list:el("photoFixtureList"),
  count:el("photoChoiceCount"),selected:el("photoSelected"),file:el("photoFile"),
  preview:el("photoPreview"),caption:el("photoCaption"),rights:el("photoRights"),
  send:el("photoSend"),status:el("photoStatus"),session:el("photoSessionInfo")};
let token=null,fixtures=[],schools=new Map(),sports=new Map(),selected=null,previewURL=null,busy=false;
const errorText={expired:"สิทธิ์หมดเวลา กรุณาเข้าระบบใหม่",limited:"ส่งรูปถี่เกินไป กรุณาลองใหม่ภายหลัง",
  invalid:"ข้อมูลไม่ครบ กรุณาตรวจอีกครั้ง",too_large:"ภาพใหญ่เกินกำหนด",
  invalid_image:"รูปแบบภาพไม่รองรับ กรุณาเลือกรูปอื่น",fixture_missing:"ไม่พบรายการแข่งขันที่เลือก",
  wrong_pin:"รหัสเจ้าหน้าที่ไม่ถูกต้อง",stale:"กรุณารีเฟรชหน้าแล้วลองอีกครั้ง",
  unavailable:"เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง",forbidden:"ไม่มีสิทธิ์ใช้งานระบบ",
  network:"เครือข่ายขัดข้อง กรุณาลองอีกครั้ง"};
function notice(value,err=false){d.status.textContent=value||"";d.status.dataset.error=String(err);}
function validToken(v){return v&&/^[a-f0-9]{64}$/.test(v.token||"")&&Date.parse(v.expires_at)>Date.now();}
function restore(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(validToken(v))token=v;}catch(_){}}
function save(v){token=v;try{localStorage.setItem(KEY,JSON.stringify(v));}catch(_){}}
function clear(){token=null;try{localStorage.removeItem(KEY);}catch(_){}showAuth();}
function showAuth(){
 const logged=validToken(token);
 d.login.hidden=logged;d.workspace.hidden=!logged;
 if(logged)d.session.textContent="เข้าสู่ระบบแล้ว · ใช้ได้ถึง "+new Intl.DateTimeFormat("th-TH",
   {timeZone:"Asia/Bangkok",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(token.expires_at))+" น.";
}
async function send(url,data,withToken=true){
 const h={};
 if(!(data instanceof FormData))h["Content-Type"]="application/json";
 if(withToken){if(!validToken(token))throw Error("expired");h.Authorization="Bearer "+token.token;}
 const r=await fetch(url,{method:"POST",headers:h,body:data instanceof FormData?data:JSON.stringify(data),cache:"no-store"});
 let ans;try{ans=await r.json();}catch(_){throw Error("network");}
 if(!ans||typeof ans.ok!=="boolean")throw Error("network");
 if(!ans.ok)throw Error(ans.error||"unavailable");
 return ans;
}
function title(f){
 const sport=sports.get(f.sport_id)||f.sport_id,div=f.division||"";
 const a=schools.get(f.team_a_id)||"",b=schools.get(f.team_b_id)||"";
 return sport+" · "+div+" · "+(f.name||((a&&b)?a+" พบ "+b:(f.source_pair_text||"รหัส "+f.id)));
}
function selectedText(){
 d.selected.textContent=selected?"รายการที่เลือก: "+title(selected):"ยังไม่ได้เลือกรายการแข่งขัน";
}
function renderList(){
 const search=d.search.value.trim().toLocaleLowerCase("th");
 let found=0;const frag=document.createDocumentFragment();
 for(const f of fixtures){
   const name=title(f);
   if(search&&!name.toLocaleLowerCase("th").includes(search)&&
     !f.id.toLocaleLowerCase("th").includes(search))continue;
   found++;
   if(frag.childElementCount>=35)continue;
   const b=document.createElement("button");b.type="button";
   b.textContent=name;b.dataset.fixtureId=f.id;b.setAttribute("aria-pressed",String(selected?.id===f.id));
   b.addEventListener("click",()=>{selected=f;selectedText();renderList();});
   frag.appendChild(b);
 }
 d.list.replaceChildren(frag);
 d.count.textContent=found?"พบ "+found+" รายการ · แสดงสูงสุด 35 รายการ กรุณาพิมพ์ค้นหาเพิ่ม":"ไม่พบรายการที่ค้นหา";
}
async function program(){
 const response=await fetch("./data/program-from-pdf-2569-20261104-draft.json?photo=r39e",{cache:"force-cache"});
 if(!response.ok)throw Error("unavailable");
 const raw=await response.json();
 const data=globalThis.NongkumProgramCorrections?.apply(raw);
 if(!data||data.fixtures?.length!==236)throw Error("unavailable");
 fixtures=data.fixtures;
 schools=new Map((data.schools||[]).map(s=>[s.id,s.short||s.name||s.id]));
 sports=new Map((data.sports||[]).map(s=>[s.id,s.name||s.id]));
 const requested=new URLSearchParams(location.search).get("fixture");
 if(requested)selected=fixtures.find(f=>f.id===requested)||null;
 renderList();selectedText();
}
async function compress(file){
 if(!file||!file.type.startsWith("image/")||file.size>12*1024*1024)throw Error("invalid_image");
 const url=URL.createObjectURL(file);const img=new Image();
 try{
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
   if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>45000000)
     throw Error("invalid_image");
   const scale=Math.min(1,1600/img.naturalWidth,1200/img.naturalHeight);
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.floor(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.floor(img.naturalHeight*scale));
   const ctx=canvas.getContext("2d",{alpha:false});if(!ctx)throw Error("invalid_image");
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   // Re-encoding strips source EXIF, geolocation and filename.
   for(const quality of [.82,.72,.62,.52,.42,.32]){
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",quality));
     if(blob&&blob.type==="image/webp"&&blob.size>=100&&blob.size<=350000)return blob;
   }
   throw Error("too_large");
 }finally{URL.revokeObjectURL(url);}
}
function preview(file){
 if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}
 d.preview.hidden=true;
 if(file){previewURL=URL.createObjectURL(file);d.preview.src=previewURL;d.preview.hidden=false;}
}
async function submit(event){
 event.preventDefault();if(busy)return;
 if(!selected){notice("กรุณาเลือกรายการแข่งขันก่อน",true);return;}
 if(!d.rights.checked){notice("กรุณายืนยันสิทธิ์ในการส่งภาพ",true);return;}
 busy=true;d.send.disabled=true;notice("กำลังย่อภาพและส่งให้ผู้ตรวจ…");
 try{
   const blob=await compress(d.file.files?.[0]);
   preview(blob);
   const form=new FormData();form.set("action","upload");form.set("fixture_id",selected.id);
   form.set("caption",d.caption.value.trim());form.set("image",blob,"activity.webp");
   await send(API,form);
   d.file.value="";d.caption.value="";d.rights.checked=false;
   notice("ส่งรูปเรียบร้อยแล้ว · อยู่ระหว่างรอผู้ตรวจอนุมัติ ยังไม่แสดงบนเว็บไซต์");
 }catch(error){
   if(error.message==="expired")clear();
   notice(errorText[error.message]||"ส่งรูปไม่สำเร็จ กรุณาลองอีกครั้ง",true);
 }finally{busy=false;d.send.disabled=false;}
}
restore();showAuth();program().catch(()=>notice("ยังโหลดรายการแข่งขันไม่ได้ กรุณาเปิดหน้าใหม่อีกครั้ง",true));
d.search.addEventListener("input",renderList);
d.file.addEventListener("change",()=>preview(d.file.files?.[0]));
d.form.addEventListener("submit",submit);
d.loginForm.addEventListener("submit",async e=>{
 e.preventDefault();if(busy)return;busy=true;
 try{
   const pin=el("photoPin").value.trim();
   const v=await send(EDITOR,{action:"unlock",pin},false);
   save({token:v.token,expires_at:v.expires_at});
   el("photoPin").value="";showAuth();notice("เข้าระบบส่งรูปได้แล้ว");
 }catch(error){notice(errorText[error.message]||"เข้าสู่ระบบไม่สำเร็จ",true);}
 finally{busy=false;}
});
el("photoLogout").addEventListener("click",clear);
})();
