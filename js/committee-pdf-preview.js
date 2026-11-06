/* R19-G: preview source PDF, read-only. Google Drive controls sharing. */
(function(root){
"use strict";
const fileId="1WwyCXlJYU8Iqxv3-l1QGsJzVUTDD4CoQ";
const view="https://drive.google.com/file/d/"+fileId+"/view";
const preview="https://drive.google.com/file/d/"+fileId+"/preview";
function open(page){
 const n=Number(page);
 const pageNo=Number.isInteger(n)&&n>0?n:1;
 const dialog=document.getElementById("committeePdfDialog");
 const frame=document.getElementById("committeePdfFrame");
 const external=document.getElementById("committeePdfExternal");
 const url=view+"#page="+pageNo;
 if(external)external.href=url;
 if(!dialog||!frame||typeof dialog.showModal!=="function"){root.open(url,"_blank","noopener,noreferrer");return;}
 frame.src=preview+"#page="+pageNo;
 if(!dialog.open)dialog.showModal();
}
function close(){
 const dialog=document.getElementById("committeePdfDialog");
 const frame=document.getElementById("committeePdfFrame");
 if(dialog?.open)dialog.close();
 if(frame)frame.removeAttribute("src");
}
root.NongkumCommitteePdf=Object.freeze({open,close});
document.getElementById("committeePdfOpen")?.addEventListener("click",()=>open(1));
document.getElementById("committeePdfClose")?.addEventListener("click",close);
document.getElementById("committeePdfDialog")?.addEventListener("close",()=>document.getElementById("committeePdfFrame")?.removeAttribute("src"));
})(window);
