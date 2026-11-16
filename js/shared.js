/* Shared no-build client helpers for มิตรภาพเกมส์; never stores credentials. */
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
  // Stable short public IDs for static per-fixture LINE preview pages.
  // Intentionally non-secret: the source schedule is already public.
  function fixtureShareCode(id){
    let hash=2166136261;
    const value=String(id);
    for(let i=0;i<value.length;i++){
      hash=Math.imul(hash^value.charCodeAt(i),16777619)>>>0;
    }
    return "f"+hash.toString(16).padStart(8,"0");
  }
  function fixtureShareUrl(id){
    return new URL("m/"+fixtureShareCode(id)+"/",new URL("index.html",location.href)).toString();
  }
  async function shareUrl(url,title,description,options){
    if(typeof navigator!=="undefined"&&typeof navigator.share==="function"){
      try{
        const payload={title:title||"มิตรภาพเกมส์ 2569",url};
        if(description)payload.text=description;
        await navigator.share(payload);
        return "shared";
      }catch(err){
        if(err&&err.name==="AbortError")return "cancelled";
      }
    }
    if(typeof navigator!=="undefined"&&navigator.clipboard&&typeof navigator.clipboard.writeText==="function"){
      const copied=options?.copyDescription?([title,description,url].filter(Boolean).join("\n")):url;
      await navigator.clipboard.writeText(copied);
      return "copied";
    }
    return "unavailable";
  }
  async function shareItem(page,key,id,title){
    return shareUrl(directItemUrl(page,key,id),title);
  }
  // A preview URL is usable only if the corresponding approved revision has a
  // generated static OG page. Never guess that a newly approved page exists.
  function resultShareCode(id,revision){
    if(typeof id!=="string"||!Number.isInteger(revision)||revision<1)return "";
    return "r"+fixtureShareCode(id).slice(1)+"-v"+revision+"-p2";
  }
  function resultShareUrl(result,index){
    if(!result||result.status!=="approved")return "";
    const revision=result.share_revision;
    const expected=resultShareCode(result.id,revision);
    const item=index?.approved_only===true&&index.schema_version===1?index.results?.[result.id]:null;
    if(expected&&item&&item.revision===revision&&item.slug===expected){
      return new URL("r/"+expected+"/",new URL("results.html",location.href)).toString();
    }
    return directItemUrl("results.html","result",result.id);
  }
  function shareApprovedResult(result,index,schools,sports){
    if(!result||result.status!=="approved")throw Error("Only approved results can be shared");
    const sport=sports?.find(s=>s.id===result.sport_id)?.name||"กีฬา";
    const school=id=>schools?.find(s=>s.id===id)?.short||"";
    const winner=school(result.winner_school_id);
    const a=school(result.team_a_id),b=school(result.team_b_id);
    const subject=result.result_type==="ranking"?
      (result.name||"รายการกรีฑา")+(result.division?" · "+result.division:""):
      (winner?winner+" ชนะ "+(winner===a?b:a):(a+" พบ "+b));
    const title=sport+(result.division?" "+result.division:"")+" — "+subject;
    const description="ผลการแข่งขัน · มิตรภาพเกมส์ 2569";
    return shareUrl(resultShareUrl(result,index),title,description,{copyDescription:true});
  }
  function shareFixture(fixture,sport,teamA,teamB){
    const title="มิตรภาพเกมส์ 2569 · "+sport+" · "+(fixture.division||"การแข่งขัน");
    const description=(teamA&&teamB?teamA+" พบ "+teamB+" · ":"")+
      "คู่/รายการ "+(fixture.source_match_no||"")+" · ข้อมูลร่าง โปรดตรวจประกาศทางการ";
    return shareUrl(fixtureShareUrl(fixture.id),title,description);
  }
  function formatCheckedAt(date){
    return "ตรวจล่าสุด "+new Intl.DateTimeFormat("th-TH",{
      day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"
    }).format(date||new Date())+" น.";
  }
  root.Nongkum=Object.freeze({
    escapeHtml,classifyLevel,schoolInStore,saveSchool,href,
    directItemUrl,shareItem,shareUrl,fixtureShareCode,fixtureShareUrl,shareFixture,
    resultShareCode,resultShareUrl,shareApprovedResult,formatCheckedAt
  });
})(globalThis);
