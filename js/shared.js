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
    if(/(?:8|10|12)\\s*ปี|ประถม/.test(text))return "primary";
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
  root.Nongkum=Object.freeze({escapeHtml,classifyLevel,schoolInStore,saveSchool,href});
})(globalThis);
