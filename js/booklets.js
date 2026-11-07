/* R24-A: read-only catalog for approved-to-view source references; no private Drive URLs. */
(function() {
"use strict";
const LIST = document.getElementById("bookletsList");
const STATUS = document.getElementById("bookletsStatus");
const allowedRoutes = {
 "program-v2":"./pdf-viewer.html?page=1",
 "committee-v3":"./committee-pdf-viewer.html?page=1"
};
const icons = {"program-v2":"📅","committee-v3":"👥","integrated-v42i10-g2":"📘"};
const expected = {"program-v2":41,"committee-v3":64,"integrated-v42i10-g2":155};
function el(tag,cls,text) {
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;
 return n;
}
function validDoc(doc) {
 if(!doc || !Object.prototype.hasOwnProperty.call(expected,doc.version_id) ||
   doc.page_count!==expected[doc.version_id] ||
   typeof doc.display_name!=="string" || typeof doc.purpose!=="string" ||
   !/^[a-f0-9]{64}$/.test(doc.pdf_revision_sha256 || "") ||
   doc.approved_at!==null) return false;
 if(doc.version_id==="integrated-v42i10-g2")
   return doc.document_status==="draft_review_not_approved" &&
     doc.access_mode==="restricted_review_pending_permission" &&
     doc.viewer_route===null && doc.source_path===null && doc.availability==="pending_permission";
 return doc.access_mode==="same_origin_reader" &&
   doc.viewer_route===allowedRoutes[doc.version_id] && doc.availability==="available";
}
function card(doc) {
 const restricted=doc.access_mode!=="same_origin_reader";
 const article=el("article","document-card");
 article.dataset.restricted=String(restricted);
 const top=el("div","document-top");
 const icon=el("div","document-icon",icons[doc.version_id]||"📄");
 icon.setAttribute("aria-hidden","true");
 const info=el("div","document-info");
 const title=el("h3","document-title",doc.display_name);
 const meta=el("p","document-meta",doc.page_count+" หน้า · "+(restricted?"ฉบับรวมสำหรับตรวจร่าง":"เอกสารอ้างอิงเดิม"));
 info.append(title,meta);top.append(icon,info);
 const purpose=el("p","document-description",doc.purpose);
 const status=el("span","document-status"+(restricted?" is-restricted":""),
   restricted?"รอตรวจสิทธิ์เปิดเอกสาร":"เอกสารสำหรับตรวจสอบ");
 const actions=el("div","document-actions");
 if(!restricted){
   const link=el("a","document-link","เปิดอ่าน PDF");
   link.href=allowedRoutes[doc.version_id];
   link.setAttribute("aria-label","เปิดอ่าน "+doc.display_name+" "+doc.page_count+" หน้า");
   actions.append(link);
 }else{
   actions.append(el("p","restricted-note",
     "ยังไม่เปิดไฟล์ 155 หน้าจาก Google Drive โดยตรง ผู้มีสิทธิ์สามารถเลือกไฟล์จากอุปกรณ์เพื่อตรวจในหน้าเว็บได้"));
   const local = el("a","document-link","ตรวจจากไฟล์ในเครื่อง");
   local.href = "./booklet-private-viewer.html";
   local.setAttribute("aria-label","ตรวจสูจิบัตร 155 หน้าที่ได้รับอนุญาตจากไฟล์ในเครื่อง");
   actions.append(local);
 }
 article.append(top,purpose,status,actions);
 return article;
}
function validCatalog(payload) {
 if(!payload || payload.schema_version!==1 || !Array.isArray(payload.documents) ||
    payload.documents.length!==3 ||
    new Set(payload.documents.map(d=>d.version_id)).size!==3 ||
    !payload.documents.every(validDoc))return false;
 return expected["integrated-v42i10-g2"]===payload.audit_155?.page_count &&
        payload.audit_155?.anchor_count===486 &&
        payload.audit_155?.publication_approved===false;
}
async function start() {
 try {
   const response=await fetch("./data/booklet-versions.json?v=r24a1",{cache:"no-store"});
   if(!response.ok)throw Error("source_not_available");
   const payload=await response.json();
   if(!validCatalog(payload))throw Error("invalid_document_revision");
   const cards=payload.documents.map(card);
   LIST.replaceChildren(...cards);
   STATUS.hidden=true;
 }catch(err){
   STATUS.textContent="ยังโหลดรายการเอกสารไม่สำเร็จ — สามารถใช้หน้าเดิมเพื่อตรวจตารางแข่งและกรรมการได้";
 }
}
if(LIST && STATUS)start();
window.NongkumBookletCatalog=Object.freeze({validDoc,validCatalog});
})();
