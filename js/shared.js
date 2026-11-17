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
  // An index update may lag a newly approved R32 result. Use a compact,
  // sport-specific neutral preview, never a guessed or missing /r/ page.
  function resultShareUrl(result,index,sports){
    if(!result||result.status!=="approved"||typeof result.id!=="string"||!result.id)return "";
    const revision=result.share_revision;
    const expected=resultShareCode(result.id,revision);
    const item=index?.approved_only===true&&index.schema_version===1?index.results?.[result.id]:null;
    if(expected&&item&&item.revision===revision&&item.slug===expected){
      return new URL("r/"+expected+"/",new URL("results.html",location.href)).toString();
    }
    const ref=fixtureShareCode(result.id);
    if(Array.isArray(sports)&&sports.some(s=>s.id===result.sport_id)&&
       /^[a-z][a-z0-9-]{0,39}$/.test(result.sport_id)){
      return new URL("s/"+result.sport_id+"/?ref="+ref,new URL("results.html",location.href)).toString();
    }
    return directItemUrl("results.html","ref",ref);
  }
  // A short reference must resolve uniquely against the latest approved-only feed.
  // A collision, missing result or unapproved entry is never guessed.
  function findApprovedResultByRef(results,ref){
    if(!/^f[0-9a-f]{8}$/.test(ref||"")||!Array.isArray(results))return null;
    const matches=results.filter(r=>r&&r.status==="approved"&&
      typeof r.id==="string"&&fixtureShareCode(r.id)===ref);
    return matches.length===1?matches[0]:null;
  }
  // R44: format only published, reviewed public results as readable LINE messages.
  // Never infer missing scores, wins, ranks or athletics disciplines from the schedule.
  function formatApprovedResultShareText(result,schools,sports,catalog){
    if(!result||result.status!=="approved")throw Error("Only approved results can be shared");
    const plain=value=>String(value??"").replace(/[\r\n\t]+/g," ").trim();
    const sport=sports?.find(s=>s.id===result.sport_id);
    if(!sport)throw Error("Sport not found in public catalog");
    const school=id=>{
      const item=schools?.find(s=>s.id===id);
      if(!item)throw Error("School not found in public catalog");
      return plain(item.short||item.name);
    };
    const lines=["ผลการแข่งขัน · มิตรภาพเกมส์ 2569","กีฬา: "+plain(sport.name)];
    if(result.division)lines.push("รุ่น: "+plain(result.division));
    if(result.round)lines.push("รอบ: "+plain(result.round));
    const event=catalog?.get(result.event_id||result.fixture_id);
    const exactName=event?.sport_id===result.sport_id&&event.division===result.division?event.name:"";
    const eventName=plain(result.name||exactName);
    if(eventName)lines.push("รายการ: "+eventName);
    if(result.result_date)lines.push("วันที่แข่งขัน: "+plain(result.result_date));
    if(result.result_type==="ranking"){
      if(!Array.isArray(result.rankings)||!result.rankings.length)throw Error("Missing approved rankings");
      const rankings=result.rankings.slice().sort((a,b)=>a.rank-b.rank);
      for(const row of rankings){
        if(!Number.isInteger(row.rank)||row.rank<1)throw Error("Invalid approved rank");
        const hasMark=row.mark!==undefined&&row.mark!==null&&plain(row.mark)!=="";
        const mark=hasMark?" · "+plain(row.mark)+(row.unit?" "+plain(row.unit):""):"";
        lines.push("อันดับ "+row.rank+": "+school(row.school_id)+mark);
      }
    }else if(["score","sets","win_loss"].includes(result.result_type)){
      const a=school(result.team_a_id),b=school(result.team_b_id);
      if(result.team_a_id===result.team_b_id)throw Error("Invalid approved opponents");
      lines.push(a+" พบ "+b);
      if(result.result_type==="score"){
        if(!Number.isInteger(result.score_a)||result.score_a<0||
           !Number.isInteger(result.score_b)||result.score_b<0)throw Error("Invalid approved score");
        lines.push("คะแนน: "+a+" "+result.score_a+" – "+result.score_b+" "+b);
      }else if(result.result_type==="sets"){
        if(!Array.isArray(result.sets)||!result.sets.length)throw Error("Missing approved sets");
        result.sets.forEach((set,i)=>{
          if(!Number.isInteger(set.a)||set.a<0||!Number.isInteger(set.b)||set.b<0)
            throw Error("Invalid approved set score");
          lines.push("เซต "+(i+1)+": "+set.a+" – "+set.b);
        });
      }else if(!result.winner_school_id)throw Error("Missing approved winner");
      if(result.winner_school_id){
        if(![result.team_a_id,result.team_b_id].includes(result.winner_school_id))
          throw Error("Winner does not match approved teams");
        lines.push("ผู้ชนะ: "+school(result.winner_school_id));
      }else if(result.result_type==="score"&&result.score_a===result.score_b){
        lines.push("ผลเสมอ");
      }
    }else throw Error("Unsupported approved result type");
    return lines.join("\n");
  }
  // Use ONE text field with the approved summary and URL. Some mobile share
  // targets (including LINE) discard text when a separate URL is supplied.
  async function shareApprovedResult(result,index,schools,sports,catalog){
    const message=formatApprovedResultShareText(result,schools,sports,catalog);
    const url=resultShareUrl(result,index,sports);
    if(!url)throw Error("No approved result link");
    const fullText=message+"\n\nดูรายละเอียดและผลล่าสุด:\n"+url;
    if(typeof navigator!=="undefined"&&typeof navigator.share==="function"){
      try{
        await navigator.share({text:fullText});
        return "shared";
      }catch(err){
        if(err&&err.name==="AbortError")return "cancelled";
      }
    }
    if(typeof navigator!=="undefined"&&navigator.clipboard&&typeof navigator.clipboard.writeText==="function"){
      await navigator.clipboard.writeText(fullText);
      return "copied";
    }
    return "unavailable";
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
    resultShareCode,resultShareUrl,findApprovedResultByRef,formatApprovedResultShareText,shareApprovedResult,formatCheckedAt
  });
})(globalThis);
