/* Shared no-build client helpers for มิตรภาพเกม; never stores credentials. */
(function(root){
  "use strict";
  function escapeHtml(v){
    return String(v==null?"":v).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function classifyLevel(x){
    const text=(x.division||"")+" "+(x.name||"");
    if(/มัธยม/.test(text))return "secondary";
    if(/ก่อนเรียน|ปฐมวัย/.test(text))return "early";
    if(/(?:8|10|12)\s*ปี|ประถม/.test(text))return "primary";
    return "other";
  }
  function schoolInStore(){
    try {return localStorage.getItem("nongkum-school")||"";}catch(e){return "";}
  }
  function saveSchool(id){
    try {localStorage.setItem("nongkum-school",id);}catch(e){}
  }
  function href(page,filters){
    const params=new URLSearchParams();
    for(const key of ["school","sport","level"]){
      if(filters&&filters[key])params.set(key,filters[key]);
    }
    const query=params.toString();
    return "./"+page+(query?"?"+query:"");
  }
  function directItemUrl(page,key,id){
    const url=new URL(page,location.href);
    url.searchParams.set(key,id);
    return url.toString();
  }
  async function shareItem(page,key,id,title){
    const url=directItemUrl(page,key,id);
    if(typeof navigator!=="undefined"&&typeof navigator.share==="function"){
      try{
        await navigator.share({title:title||"มิตรภาพเกม 2569",url});
        return "shared";
      }catch(err){
        if(err&&err.name==="AbortError")return "cancelled";
      }
    }
    if(typeof navigator!=="undefined"&&navigator.clipboard&&typeof navigator.clipboard.writeText==="function"){
      await navigator.clipboard.writeText(url);
      return "copied";
    }
    return "unavailable";
  }
  function formatCheckedAt(date){
    return "ตรวจข้อมูลเมื่อ "+new Intl.DateTimeFormat("th-TH",{
      day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
    }).format(date||new Date())+" น.";
  }
  root.Nongkum=Object.freeze({
    escapeHtml,classifyLevel,schoolInStore,saveSchool,href,
    directItemUrl,shareItem,formatCheckedAt
  });
})(globalThis);
