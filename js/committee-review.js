/* R19-D: schools review encrypted, draft-only roster. No backend writes, no local storage.
 * Codes/rosters are never stored in URLs, cookies or browser storage.
 * LINE opens a draft; organizer acknowledgment is needed for a true confirmation. */
(function(root){
"use strict";
const URL_DATA="./data/committee-school-rosters-2569.encrypted.json";
const sports={football:"ฟุตบอล",futsal:"ฟุตซอล",volleyball:"วอลเลย์บอล",takraw:"เซปักตะกร้อ",petanque:"เปตอง",tabletennis:"เทเบิลเทนนิส",tugofwar:"ชักเย่อ",athletics:"กรีฑา"};
const statuses={correct:"ถูกต้อง",change:"ขอแก้ไข",unsure:"ไม่แน่ใจ"};
const codeNormal=s=>String(s||"").toUpperCase().replace(/[\s-]/g,"");
function b64bytes(s){return Uint8Array.from(root.atob(s),c=>c.charCodeAt(0));}
async function unlockBundle(manifest,schoolId,code){
 if(!manifest||manifest.schema_version!==1||manifest.cipher!=="AES-256-GCM"||
    manifest.kdf!=="PBKDF2-SHA256"||manifest.compression!=="gzip"||
    !Number.isInteger(manifest.rounds)||manifest.rounds<150000)return null;
 const item=manifest.schools?.find(s=>s.id===schoolId);
 if(!item||!codeNormal(code)||!root.crypto?.subtle)throw Error("no_browser_crypto_or_school");
 const encoder=new TextEncoder();
 const raw=await root.crypto.subtle.importKey("raw",encoder.encode(codeNormal(code)),{name:"PBKDF2"},false,["deriveKey"]);
 const key=await root.crypto.subtle.deriveKey({name:"PBKDF2",salt:b64bytes(item.salt),iterations:manifest.rounds,hash:"SHA-256"},raw,{name:"AES-GCM",length:256},false,["decrypt"]);
 const bytes=await root.crypto.subtle.decrypt({name:"AES-GCM",iv:b64bytes(item.iv),additionalData:encoder.encode(manifest.revision+"|"+schoolId)},key,b64bytes(item.ct));
 if(typeof DecompressionStream!=="function")throw Error("gzip_not_supported");
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
 const plain=await new Response(stream).text();
 const payload=JSON.parse(plain);
 if(payload.v!==1||payload.school_id!==schoolId||payload.revision!==manifest.revision||
    payload.source_sha256!==manifest.source_sha256||!Array.isArray(payload.rows)||
    payload.rows.length!==item.count||payload.rows.some(row=>!Array.isArray(row)||row.length!==9))throw Error("invalid_or_stale_payload");
 return payload;
}
function buildConfirmation(payload,selections,reviewer,note){
 if(!payload||!reviewer?.trim()||!Array.isArray(payload.rows))throw Error("missing_reviewer");
 const total=payload.rows.length,changes=[],unconfirmed=[];
 const c={correct:0,change:0,unsure:0};
 for(const row of payload.rows){
  const entry=selections[row[0]];
  if(!entry||!statuses[entry.status]){unconfirmed.push(row[0]);continue;}
  if(entry.status==="change"&&!String(entry.note||"").trim())throw Error("missing_note:"+row[0]);
  c[entry.status]++;
  if(entry.status!=="correct"){
   changes.push(row[0]+" "+statuses[entry.status]+(entry.note?" — "+entry.note.trim():""));
  }
 }
 if(unconfirmed.length)throw Error("incomplete:"+unconfirmed.length);
 const conclusion=c.change||c.unsure?"ขอแก้ไข/ตรวจเพิ่มเติม":"ตรวจแล้วถูกต้องตามร่าง";
 return [
 "มิตรภาพเกมส์ 2569 — ส่งผลตรวจรายชื่อกรรมการ (ร่าง)",
 "โรงเรียน: "+payload.name,
 "ผู้ตรวจ: "+reviewer.trim(),
 "รุ่นข้อมูล: "+payload.revision,
 "รหัสโรงเรียน: "+payload.school_id,
 "ผลตรวจ: "+conclusion,
 "รายการ: "+total+" | ถูกต้อง "+c.correct+" | ขอแก้ไข "+c.change+" | ไม่แน่ใจ "+c.unsure,
 ...(note?.trim()?["หมายเหตุ: "+note.trim()]:[]),
 ...(changes.length?["รายการขอแก้ไข/ตรวจเพิ่ม:",...changes]:[]),
 "หมายเหตุ: เป็นการยืนยันข้อมูลร่าง ไม่ใช่การแต่งตั้งหรือรับรองโดยอัตโนมัติ",
 "กรุณาผู้จัดตรวจสอบผู้ส่งและตอบรับข้อความนี้"
 ].join("\n");
}
root.NongkumSchoolCommittee=Object.freeze({unlockBundle,buildConfirmation,codeNormal});
if(!root.document||!root.document.getElementById("schoolReviewRoot"))return;
const doc=root.document,el=id=>doc.getElementById(id);
const ui=Object.fromEntries(["crSchool","crCode","crShowCode","crUnlock","crLock","crUnlockStatus","crPrivate","crListTitle","crProgress","crSourceNote","crSearch","crBulkCorrect","crEntries","crNoMatch","crReviewer","crOverallNote","crConfirmReviewed","crShareLine","crCopy","crSendStatus"].map(id=>[id,el(id)]));
let manifest=null,payload=null,selections=Object.create(null),busy=false;
function make(tag,klass,text){
 const e=doc.createElement(tag);
 if(klass)e.className=klass;
 if(text!==undefined)e.textContent=String(text);
 return e;
}
function status(element,message,kind){
 element.textContent=message;
 if(kind)element.dataset.kind=kind;else delete element.dataset.kind;
}
function reset(privateOnly){
 payload=null;selections=Object.create(null);
 ui.crPrivate.hidden=true;ui.crLock.hidden=true;ui.crEntries.replaceChildren();
 ui.crCode.value="";
 ui.crSearch.value="";
 ui.crReviewer.value="";
 ui.crOverallNote.value="";
 ui.crConfirmReviewed.checked=false;
 ui.crSendStatus.textContent="";
 if(!privateOnly)ui.crSchool.value="";
}
function updateProgress(){
 const total=payload?.rows.length||0;
 const checked=Object.values(selections).filter(s=>statuses[s?.status]).length;
 ui.crProgress.textContent=checked+"/"+total+" ตรวจแล้ว";
}
function mark(id,value){
 if(!payload)return;
 const old=selections[id]||{};
 selections[id]={status:value,note:value==="change"?(old.note||""):""};
 updateProgress();
}
function render(){
 if(!payload)return;
 const q=ui.crSearch.value.trim().toLocaleLowerCase("th");
 ui.crEntries.replaceChildren();
 let found=0;
 for(const row of payload.rows){
  const [id,number,name,aff,role,section,sport,page,flags]=row;
  const sectionName=payload.sections?.[section]||("ฝ่าย "+section);
  if(q&&!([name,aff,role,sectionName,sports[sport]||""].join(" ").toLocaleLowerCase("th").includes(q)))continue;
  found++;
  const card=make("article","cr-entry");
  card.dataset.status=selections[id]?.status||"";
  const top=make("div","cr-entry-head");
  const title=make("h3","",name);
  top.appendChild(title);
  top.appendChild(make("span","cr-entry-number","ข้อ "+number));
  card.appendChild(top);
  card.appendChild(make("p","cr-entry-meta",role+" · "+aff));
  card.appendChild(make("p","cr-entry-meta",sectionName+(sport?" · "+(sports[sport]||sport):"")+" · PDF หน้า "+page));
  for(const flag of flags||[])card.appendChild(make("span","cr-entry-tag","ควรตรวจ: "+flag));
  const radios=make("div","cr-entry-state");
  for(const [value,label] of Object.entries(statuses)){
   const item=make("label","");
   const radio=make("input");
   radio.type="radio";radio.name="r-"+id;radio.value=value;
   radio.checked=selections[id]?.status===value;
   radio.addEventListener("change",()=>{
    mark(id,value);
    card.dataset.status=value;
    note.hidden=value!=="change";
    if(value==="change")note.value=selections[id]?.note||"";
   });
   item.appendChild(radio);item.appendChild(make("span","",label));radios.appendChild(item);
  }
  card.appendChild(radios);
  const note=make("textarea","cr-note");
  note.rows=2;note.maxLength=240;
  note.placeholder="ระบุข้อความที่ต้องแก้ เช่น ชื่อสะกดผิด / หน้าที่ไม่ตรง";
  note.setAttribute("aria-label","ข้อเสนอแก้ไขของ "+number);
  note.hidden=selections[id]?.status!=="change";
  note.value=selections[id]?.note||"";
  note.addEventListener("input",()=>{if(selections[id])selections[id].note=note.value;});
  card.appendChild(note);
  ui.crEntries.appendChild(card);
 }
 ui.crNoMatch.hidden=found!==0;
 updateProgress();
}
function messageFromForm(){
 if(!payload)throw Error("not_open");
 if(!ui.crConfirmReviewed.checked)throw Error("not_confirmed");
 return buildConfirmation(payload,selections,ui.crReviewer.value,ui.crOverallNote.value);
}
function validationError(e){
 const s=e?.message||"";
 if(s.startsWith("incomplete:"))return "กรุณาตรวจทุกบรรทัดก่อนส่ง ยังไม่ได้ตรวจ "+s.split(":")[1]+" รายการ";
 if(s.startsWith("missing_note:"))return "รายการที่ขอแก้ไขต้องระบุรายละเอียดให้ผู้จัดตรวจ";
 if(s==="missing_reviewer")return "กรุณาระบุชื่อผู้ตรวจของโรงเรียน";
 if(s==="not_confirmed")return "กรุณาทำเครื่องหมายว่าตรวจข้อมูลและเข้าใจสถานะร่างแล้ว";
 return "ยังเตรียมข้อความไม่ได้ กรุณาตรวจข้อมูลและลองอีกครั้ง";
}
async function loadManifest(){
 try{
  const r=await root.fetch(URL_DATA,{cache:"no-store"});
  if(!r.ok)throw Error("HTTP "+r.status);
  const d=await r.json();
  if(d.schema_version!==1||d.publication_scope!=="encrypted_school_draft_only"||
      !Array.isArray(d.schools)||d.schools.length!==8||
      new Set(d.schools.map(s=>s.id)).size!==8)throw Error("schema");
  manifest=d;
  ui.crSchool.replaceChildren();
  const first=make("option","","เลือกโรงเรียน");first.value="";ui.crSchool.appendChild(first);
  for(const s of d.schools){const opt=make("option","",s.name+" ("+s.count+" รายการ)");opt.value=s.id;ui.crSchool.appendChild(opt);}
  const p=new URLSearchParams(root.location?.search||"");
  const requested=p.get("school");
  if(d.schools.some(s=>s.id===requested))ui.crSchool.value=requested;
  status(ui.crUnlockStatus,"เลือกโรงเรียนแล้วกรอกรหัสที่ผู้จัดส่งให้","ok");
 }catch(_e){
  status(ui.crUnlockStatus,"เปิดรายการโรงเรียนไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วโหลดหน้าใหม่","error");
 }
}
ui.crShowCode.addEventListener("click",()=>{
 const show=ui.crCode.type==="password";
 ui.crCode.type=show?"text":"password";
 ui.crShowCode.textContent=show?"ซ่อน":"แสดง";
 ui.crShowCode.setAttribute("aria-pressed",String(show));
});
ui.crSchool.addEventListener("change",()=>{reset(true);status(ui.crUnlockStatus,"กรอกรหัสเฉพาะของโรงเรียนที่เลือก","");});
ui.crLock.addEventListener("click",()=>{reset(true);status(ui.crUnlockStatus,"ปิดข้อมูลรายชื่อแล้ว","ok");});
ui.crUnlock.addEventListener("click",async()=>{
 if(busy||!manifest)return;
 const school=ui.crSchool.value,pass=ui.crCode.value;
 if(!school||!pass.trim()){status(ui.crUnlockStatus,"กรุณาเลือกโรงเรียนและใส่รหัสก่อน","error");return;}
 busy=true;ui.crUnlock.disabled=true;
 status(ui.crUnlockStatus,"กำลังตรวจรหัสและเปิดข้อมูล…","");
 try{
  payload=await unlockBundle(manifest,school,pass);
  if(!payload)throw Error("failed");
  ui.crCode.value="";
  selections=Object.create(null);
  ui.crListTitle.textContent="2. ตรวจรายชื่อ — "+payload.name;
  ui.crSourceNote.textContent="ฉบับร่างปี 2569 · "+payload.rows.length+" รายการ · รุ่น "+payload.revision;
  ui.crPrivate.hidden=false;ui.crLock.hidden=false;
  status(ui.crUnlockStatus,"เปิดข้อมูลเฉพาะโรงเรียนสำเร็จ ไม่ได้ส่งข้อมูลขึ้นเซิร์ฟเวอร์","ok");
  render();
 }catch(e){
  reset(true);
  status(ui.crUnlockStatus,e?.message==="gzip_not_supported"?"เบราว์เซอร์นี้ไม่รองรับการเปิดข้อมูล กรุณาใช้ Safari หรือ Chrome รุ่นล่าสุด":"รหัสไม่ถูกต้อง หรือข้อมูลโรงเรียนไม่ตรง กรุณาตรวจรหัสอีกครั้ง","error");
 }finally{busy=false;ui.crUnlock.disabled=false;}
});
ui.crSearch.addEventListener("input",render);
ui.crBulkCorrect.addEventListener("click",()=>{
 if(!payload)return;
 for(const row of payload.rows)selections[row[0]]={status:"correct",note:""};
 render();
 status(ui.crSendStatus,"ทำเครื่องหมายถูกต้องทุกรายการแล้ว กรุณาตรวจทานก่อนส่งให้ผู้จัด","");
});
ui.crCopy.addEventListener("click",async()=>{
 try{
  const msg=messageFromForm();
  await root.navigator.clipboard.writeText(msg);
  status(ui.crSendStatus,"คัดลอกข้อความแล้ว โปรดวางและส่งให้ผู้จัดทาง LINE จากนั้นรอตรวจรับ","ok");
 }catch(e){status(ui.crSendStatus,validationError(e),"error");}
});
ui.crShareLine.addEventListener("click",()=>{
 try{
  const msg=messageFromForm();
  // LINE fills the compose window; the user must still choose the organizer and press Send.
  root.location.href="https://line.me/R/msg/text/?"+encodeURIComponent(msg);
  status(ui.crSendStatus,"กำลังเปิด LINE เพื่อให้ส่งข้อความ โปรดรอผู้จัดตอบรับ ไม่ได้บันทึกอัตโนมัติ","");
 }catch(e){status(ui.crSendStatus,validationError(e),"error");}
});
loadManifest();
})(globalThis);
