/* Approved results only. No access to editor secrets or draft result rows. */
(function(){
  "use strict";
  function optionalElement(id){try{return document.getElementById(id);}catch(_){return null;}}
  const els={
    school:document.getElementById("resultSchool"),
    level:document.getElementById("resultLevel"),
    sports:document.getElementById("resultSports"),
    cards:document.getElementById("resultsList"),
    count:document.getElementById("resultsCount"),
    empty:document.getElementById("noResults"),
    published:document.getElementById("publishedAt"),
    standings:optionalElement("resultsSubStandings"),
    programLink:document.getElementById("programLink"),
    refresh:document.getElementById("refreshResults"),
    refreshStatus:document.getElementById("resultsRefreshStatus"),
    direct:document.getElementById("sharedResult"),
    directCard:document.getElementById("sharedResultCard"),
    directStatus:document.getElementById("sharedResultStatus"),
    all:document.getElementById("resultsOverview"),
    showAll:document.getElementById("showAllResults"),
    skeleton:optionalElement("resultsSkeleton"),
    listing:optionalElement("resultsListing"),
    failure:optionalElement("resultsLoadFailure"),
    retry:optionalElement("retryResults"),
    directFailure:optionalElement("sharedResultLoadFailure"),
    directRetry:optionalElement("retrySharedResult")
  };
  const requestedResult=new URLSearchParams(location.search).get("result");
  const state={data:null,school:"",sport:"",level:"",focusId:"",directMode:!!requestedResult};
  if(state.directMode&&els.direct&&els.all){
    els.direct.hidden=false;els.all.hidden=true;
  }
  let initialized=false;
  const safe=globalThis.Nongkum.escapeHtml;
  function validResult(r){
    if(!r||r.status!=="approved"||typeof r.id!=="string"||!r.id)return false;
    if(!["score","sets","win_loss","ranking"].includes(r.result_type))return false;
    if(r.result_type==="ranking"){
      return typeof r.event_id==="string"&&Array.isArray(r.rankings)&&r.rankings.length>0&&
        r.rankings.every(x=>Number.isInteger(x.rank)&&x.rank>0&&typeof x.school_id==="string");
    }
    if(!r.fixture_id||!r.team_a_id||!r.team_b_id)return false;
    if(r.result_type==="score"&&(!Number.isInteger(r.score_a)||!Number.isInteger(r.score_b)||r.score_a<0||r.score_b<0))return false;
    if(r.result_type==="sets"&&(!Array.isArray(r.sets)||!r.sets.length||!r.sets.every(x=>Number.isInteger(x.a)&&x.a>=0&&Number.isInteger(x.b)&&x.b>=0)))return false;
    if(r.result_type==="win_loss"&&!r.winner_school_id)return false;
    return true;
  }
  function validDataset(data){
    return data&&data.schema_version===1&&data.metadata&&data.metadata.approved_only===true&&
      ["empty","published"].includes(data.metadata.publication_status)&&
      Array.isArray(data.schools)&&Array.isArray(data.sports)&&Array.isArray(data.results)&&
      data.results.every(validResult)&&data.metadata.approved_results_count===data.results.length&&
      (data.results.length===0||data.metadata.publication_status==="published");
  }
  function syncUrl(){
    els.programLink.href=globalThis.Nongkum.href("index.html",state);
    globalThis.NongkumNavigation?.update?.(state);
    if(els.standings)els.standings.href=globalThis.Nongkum.href("standings.html",state);
    const url=new URL(location.href);
    for(const key of ["school","sport","level"]){
      if(state[key])url.searchParams.set(key,state[key]);else url.searchParams.delete(key);
    }
    url.searchParams.delete("result");state.focusId="";
    history.replaceState(null,"",url.pathname+url.search+url.hash);
  }
  function schoolMatch(r){
    if(!state.school)return true;
    if(r.result_type==="ranking")return (r.rankings||[]).some(x=>x.school_id===state.school);
    return r.team_a_id===state.school||r.team_b_id===state.school;
  }
  function matches(r){
    return (!state.sport||r.sport_id===state.sport)&&
      (!state.level||globalThis.Nongkum.classifyLevel(r)===state.level)&&schoolMatch(r);
  }
  function makeSports(){
    const options=[{id:"",name:"ทุกกีฬา",emoji:"📋"}].concat(state.data.sports);
    els.sports.innerHTML=options.map(s=>"<button type='button' class='result-chip' aria-pressed='"+
      (state.sport===s.id?"true":"false")+"' data-sport='"+safe(s.id)+"'>"+
      safe(s.emoji+" "+s.name)+"</button>").join("");
    els.sports.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
      state.sport=b.dataset.sport;makeSports();render();syncUrl();
    }));
  }
  function renderDirect(){
    const item=state.data.results.find(x=>x.id===state.focusId&&x.status==="approved");
    if(!item){
      els.directCard.innerHTML="<div class='direct-result-error'><strong>ยังไม่มีผลการแข่งขันที่ผ่านการรับรองสำหรับลิงก์นี้</strong>"+
        "<p>อาจเป็นรหัสไม่ถูกต้อง หรือผลยังไม่ผ่านการรับรองและเผยแพร่</p></div>";
      els.directStatus.textContent="ไม่พบผลที่รับรองแล้ว";
      return;
    }
    els.directCard.innerHTML=globalThis.NongkumResultsRender.card(item,state.data.schools,state.data.sports);
    els.directStatus.textContent="ผลรับรองแล้ว · "+(item.division||"")+" · "+(item.fixture_id||item.event_id||"");
  }
  function render(){
    const data=state.data;
    if(!data)return;
    if(state.directMode){renderDirect();return;}
    const found=data.results.filter(matches);
    els.count.textContent=found.length+" รายการ";
    els.empty.hidden=found.length!==0;
    els.cards.innerHTML=found.map(r=>globalThis.NongkumResultsRender.card(r,data.schools,data.sports)).join("");
    if(state.focusId&&typeof els.cards.querySelector==="function"){
      const target=els.cards.querySelector("[data-result-card='"+state.focusId.replace(/'/g,"")+"']");
      if(target&&typeof target.scrollIntoView==="function")target.scrollIntoView({block:"center"});
    }
  }
  function setupHandlers(){
    if(initialized)return;
    initialized=true;
    els.school.addEventListener("change",()=>{
      state.school=els.school.value;globalThis.Nongkum.saveSchool(state.school);render();syncUrl();
    });
    els.level.addEventListener("change",()=>{state.level=els.level.value;render();syncUrl();});
    async function handleShare(event){
      const btn=event.target.closest("[data-share-result]");
      if(!btn||!state.data)return;
      const item=state.data.results.find(x=>x.id===btn.dataset.shareResult&&x.status==="approved");
      if(!item)return;
      try{
        const answer=await globalThis.Nongkum.shareItem("results.html","result",item.id,"ผลการแข่งขันที่รับรองแล้ว · มิตรภาพเกมส์");
        if(answer==="copied"&&!globalThis.NongkumToast?.show("คัดลอกลิงก์ผลแข่งขันแล้ว","นำไปวางใน LINE เพื่อส่งต่อได้ทันที"))els.refreshStatus.textContent="คัดลอกลิงก์ผลแข่งขันที่รับรองแล้ว";
        if(answer==="unavailable"&&!globalThis.NongkumToast?.show("แชร์ไม่สำเร็จ","อุปกรณ์นี้ไม่รองรับการแชร์หรือคัดลอกลิงก์",true))els.refreshStatus.textContent="อุปกรณ์นี้ไม่รองรับการแชร์หรือคัดลอกลิงก์";
      }catch(e){if(!globalThis.NongkumToast?.show("แชร์ไม่สำเร็จ","กรุณาลองอีกครั้ง",true))els.refreshStatus.textContent="ไม่สามารถแชร์ลิงก์ผลแข่งขันได้";}
    }
    els.cards.addEventListener("click",handleShare);
    if(els.direct)els.direct.addEventListener("click",handleShare);
    if(els.showAll)els.showAll.addEventListener("click",function(){
      state.directMode=false;state.focusId="";state.school="";state.sport="";state.level="";
      els.direct.hidden=true;els.all.hidden=false;
      els.school.value="";els.level.value="";
      makeSports();render();syncUrl();
      if(typeof window!=="undefined"&&typeof window.scrollTo==="function")window.scrollTo({top:0,behavior:"auto"});
    });
  }
  function loaded(data){
    if(!validDataset(data))throw Error("ผลการแข่งขันไม่ผ่านการตรวจ Approved-only");
    state.data=data;
    if(!initialized){
      data.schools.forEach(s=>{
        const o=document.createElement("option");o.value=s.id;o.textContent=s.name;els.school.appendChild(o);
      });
      const params=new URLSearchParams(location.search);
      const requested=params.get("school")||globalThis.Nongkum.schoolInStore();
      state.school=data.schools.some(s=>s.id===requested)?requested:"";
      state.sport=data.sports.some(s=>s.id===params.get("sport"))?params.get("sport"):"";
      state.level=["early","primary","secondary"].includes(params.get("level"))?params.get("level"):"";
      const linked=requestedResult?data.results.find(x=>x.id===requestedResult&&x.status==="approved"):null;
      if(requestedResult){
        state.school="";state.level="";state.sport=linked?linked.sport_id:"";
        state.focusId=requestedResult;
      }
      els.school.value=state.school;els.level.value=state.level;
      setupHandlers();
    }
    els.published.textContent=data.metadata.published_at?
      "เผยแพร่ผลล่าสุด: "+data.metadata.published_at:"";
    makeSports();render();
    els.programLink.href=globalThis.Nongkum.href("index.html",state);
    globalThis.NongkumNavigation?.update?.(state);
    if(els.standings)els.standings.href=globalThis.Nongkum.href("standings.html",state);
  }
  function setInitialLoading(active){
    if(els.skeleton)els.skeleton.hidden=!active;
    if(els.listing&&typeof els.listing.setAttribute==="function")els.listing.setAttribute("aria-busy",String(active));
  }
  function setFailure(active){
    if(els.failure)els.failure.hidden=!active;
    if(els.directFailure)els.directFailure.hidden=!active;
  }
  async function loadResults(refresh){
    const initial=!state.data;
    if(initial){setInitialLoading(!state.directMode);setFailure(false);}
    els.refresh.disabled=true;
    els.refreshStatus.textContent=refresh&&state.data?"กำลังตรวจผลรับรองล่าสุด…":"กำลังอ่านผลการแข่งขัน…";
    try{
      const response=await fetch("./data/public-results.json?refresh="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw Error("ไฟล์ผลการแข่งขันยังไม่พร้อม");
      const payload=await response.json();
      loaded(payload);
      setFailure(false);
      els.refreshStatus.textContent=globalThis.Nongkum.formatCheckedAt(new Date())+
        " · ไฟล์เผยแพร่บนเว็บ";
    }catch(e){
      els.refreshStatus.textContent=state.data?"รีเฟรชไม่สำเร็จ · ยังคงผลล่าสุดที่โหลดไว้":"โหลดผลรับรองไม่สำเร็จ · ลองใหม่อีกครั้ง";
      if(!state.data){
        if(state.directMode&&els.directStatus)els.directStatus.textContent="ตรวจผลรับรองไม่ได้ โปรดลองอีกครั้ง";
        els.count.textContent="ตรวจข้อมูลไม่ได้";
        els.empty.hidden=true;
        setFailure(true);
      }
      console.error(e);
    }finally{setInitialLoading(false);els.refresh.disabled=false;}
  }
  els.refresh.addEventListener("click",()=>loadResults(true));
  if(els.retry)els.retry.addEventListener("click",()=>loadResults(false));
  if(els.directRetry)els.directRetry.addEventListener("click",()=>loadResults(false));
  loadResults(false);
  // Recheck the published JSON every 5 minutes while this page is visible.
  if(typeof setInterval==="function"){
    setInterval(function(){
      if(document.visibilityState==="visible"&&!els.refresh.disabled)loadResults(true);
    },300000);
  }
})();
