/* Approved results only. No access to editor secrets or draft result rows. */
(function(){
  "use strict";
  function optionalElement(id){try{return document.getElementById(id);}catch(_){return null;}}
  const els={
    school:document.getElementById("resultSchool"),
    level:document.getElementById("resultLevel"),
    sports:document.getElementById("resultSports"),
    allSports:document.getElementById("resultAllSports"),
    activeFilters:document.getElementById("resultActiveFilters"),
    clearFilters:document.getElementById("resultClearFilters"),
    emptyClear:document.getElementById("resultEmptyClear"),
    more:document.getElementById("resultFilterMore"),
    moreCount:document.getElementById("resultMoreCount"),
    countSummary:document.getElementById("resultCountSummary"),
    emptyTitle:document.getElementById("noResultsTitle"),
    emptyDescription:document.getElementById("noResultsDescription"),
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
  const linkParams=new URLSearchParams(location.search);
  const requestedResult=linkParams.get("result");
  const requestedRef=linkParams.get("ref");
  const state={data:null,school:"",sport:"",level:"",source:"",shareIndex:null,catalog:new Map(),media:new Map(),focusId:"",directMode:!!(requestedResult||requestedRef)};
  if(state.directMode&&els.direct&&els.all){
    els.direct.hidden=false;els.all.hidden=true;
  }
  let initialized=false;
  const safe=globalThis.Nongkum.escapeHtml;
  // Manifest is generated from verified published-result revisions by R36.
  // If unavailable/stale, sharing uses a compact neutral sport preview.
  async function loadShareIndex(){
    try{
      const response=await fetch("./data/result-share-index.json?refresh="+Date.now(),{cache:"no-store"});
      if(!response.ok)return;
      const index=await response.json();
      if(index&&index.schema_version===1&&index.approved_only===true&&
         index.results&&typeof index.results==="object"&&!Array.isArray(index.results)){
        state.shareIndex=index;
      }
    }catch(_){ /* Legacy deep result URL remains safe. */ }
  }
  loadShareIndex();
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
    url.searchParams.delete("result");url.searchParams.delete("ref");state.focusId="";
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
  function hasFilters(){return Boolean(state.school||state.level||state.sport);}
  function clearFilters(){
    state.school="";state.sport="";state.level="";
    els.school.value="";els.level.value="";
    makeSports();render();syncUrl();
  }
  function publicationTime(value){
    if(!value)return "";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return "";
    return new Intl.DateTimeFormat("th-TH",{
      timeZone:"Asia/Bangkok",day:"numeric",month:"short",year:"numeric",
      hour:"2-digit",minute:"2-digit",hourCycle:"h23"
    }).format(date)+" น.";
  }
  function makeSports(){
    els.allSports.setAttribute("aria-pressed",String(!state.sport));
    els.sports.innerHTML=state.data.sports.map(s=>"<button type='button' class='result-chip' aria-pressed='"+
      (state.sport===s.id?"true":"false")+"' data-sport='"+safe(s.id)+"'>"+
      safe(s.emoji+" "+s.name)+"</button>").join("");
    els.sports.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
      state.sport=b.dataset.sport;makeSports();render();syncUrl();
    }));
  }
  function renderDirect(){
    const item=state.data.results.find(x=>x.id===state.focusId&&x.status==="approved");
    if(!item){
      const backup=state.source!=="live";
      els.directCard.innerHTML=backup?
        "<div class='direct-result-error'><strong>ยังตรวจผลรับรองล่าสุดไม่ได้</strong><p>ขณะนี้ใช้ข้อมูลสำรอง อาจไม่มีผลรายการที่เผยแพร่ล่าสุด กรุณารีเฟรชเมื่อเชื่อมต่อได้</p></div>":
        "<div class='direct-result-error'><strong>ยังไม่มีผลการแข่งขันที่ผ่านการรับรองสำหรับลิงก์นี้</strong><p>อาจเป็นรหัสไม่ถูกต้อง หรือผลยังไม่ผ่านการรับรองและเผยแพร่</p></div>";
      els.directStatus.textContent=backup?"ข้อมูลสำรอง · ยังตรวจผลล่าสุดไม่ได้":"ไม่พบผลที่รับรองแล้ว";
      return;
    }
    els.directCard.innerHTML=globalThis.NongkumResultsRender.card(item,state.data.schools,state.data.sports,state.catalog,state.media);
    els.directStatus.textContent="ผลรับรองแล้ว · "+(item.division||"")+" · "+(item.fixture_id||item.event_id||"");
  }
  function render(){
    const data=state.data;
    if(!data)return;
    if(state.directMode){renderDirect();return;}
    const found=data.results.filter(matches);
    const total=data.results.length;
    const selectedSport=state.data.sports.find(s=>s.id===state.sport);
    const selectedSchool=state.data.schools.find(s=>s.id===state.school);
    const levelLabels={early:"ปฐมวัย",primary:"ประถม",secondary:"มัธยม"};
    const used=[selectedSport?.name,selectedSchool?.short||selectedSchool?.name,levelLabels[state.level]].filter(Boolean);
    const filtered=hasFilters();
    const stale=state.source!=="live";
    els.count.textContent=found.length+" รายการ";
    els.countSummary.textContent="ผลรับรองทั้งหมด "+total+" รายการ · แสดง "+found.length+" รายการ"+(stale?" · ข้อมูลสำรอง อาจไม่ใช่ผลล่าสุด":"");
    els.activeFilters.textContent=filtered?"กำลังกรอง: "+used.join(" · "):"กำลังแสดงผลรับรองทุกกีฬาและทุกโรงเรียน";
    els.clearFilters.hidden=!filtered;
    els.moreCount.textContent=[state.school,state.level].filter(Boolean).length?"(เลือกแล้ว "+[state.school,state.level].filter(Boolean).length+")":"";
    els.empty.hidden=found.length!==0;
    if(!found.length){
      els.emptyTitle.textContent=stale?"ข้อมูลสำรองยังไม่มีผลการแข่งขัน":total===0?"ยังไม่มีผลการแข่งขันที่ผ่านการรับรอง":"ไม่พบผลการแข่งขันตามตัวกรองที่เลือก";
      els.emptyDescription.textContent=stale?"ยังตรวจผลรับรองล่าสุดจากระบบไม่ได้ กรุณารีเฟรชอีกครั้งเพื่อดูผลปัจจุบัน":total===0?"ผลจะปรากฏเมื่อคณะกรรมการรับรองและเผยแพร่แล้ว":"มีผลรับรอง "+total+" รายการ แต่ไม่ตรงกับตัวกรองนี้ ล้างตัวกรองเพื่อดูผลทั้งหมด";
      els.emptyClear.hidden=!filtered;
    }
    els.cards.innerHTML=found.map(r=>globalThis.NongkumResultsRender.card(r,data.schools,data.sports,state.catalog,state.media)).join("");
    if(state.focusId&&typeof els.cards.querySelector==="function"){
      const target=els.cards.querySelector("[data-result-card='"+state.focusId.replace(/'/g,"")+"']");
      if(target&&typeof target.scrollIntoView==="function")target.scrollIntoView({block:"center"});
    }
  }
  function setupHandlers(){
    if(initialized)return;
    initialized=true;
    els.allSports.addEventListener("click",()=>{state.sport="";makeSports();render();syncUrl();});
    els.clearFilters.addEventListener("click",clearFilters);
    els.emptyClear.addEventListener("click",clearFilters);
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
        const answer=await globalThis.Nongkum.shareApprovedResult(item,state.shareIndex,state.data.schools,state.data.sports,state.catalog);
        if(answer==="copied"&&!globalThis.NongkumToast?.show("คัดลอกลิงก์ผลแข่งขันแล้ว","คัดลอกข้อความผลรับรองและลิงก์แล้ว นำไปวางใน LINE ได้เลย"))els.refreshStatus.textContent="คัดลอกลิงก์ผลแข่งขันที่รับรองแล้ว";
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
     // Re-resolve on every refresh: offline snapshots may miss newly approved rows.
     if(state.directMode){
       const linked=requestedResult?
         data.results.find(x=>x.id===requestedResult&&x.status==="approved"):
         (requestedRef?globalThis.Nongkum.findApprovedResultByRef(data.results,requestedRef):null);
       state.focusId=linked?.id||"";
       state.sport=linked?.sport_id||"";
     }
     if(!initialized){
      data.schools.forEach(s=>{
        const o=document.createElement("option");o.value=s.id;o.textContent=s.name;els.school.appendChild(o);
      });
      const params=new URLSearchParams(location.search);
      // A results visit starts unfiltered unless a caller explicitly provided a filter.
      const requested=params.get("school")||"";
      state.school=data.schools.some(s=>s.id===requested)?requested:"";
      state.sport=data.sports.some(s=>s.id===params.get("sport"))?params.get("sport"):"";
      state.level=["early","primary","secondary"].includes(params.get("level"))?params.get("level"):"";
       if(requestedResult||requestedRef){
         state.school="";state.level="";
       }
      els.school.value=state.school;els.level.value=state.level;
      if(state.school||state.level)els.more.open=true;
      setupHandlers();
    }
    const announced=publicationTime(data.metadata.published_at);
    els.published.textContent=announced?"เผยแพร่ผลล่าสุด: "+announced:"";
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
    if(els.refresh.disabled)return false;
    const initial=!state.data;
    if(initial){setInitialLoading(!state.directMode);setFailure(false);}
    els.refresh.disabled=true;
    els.refreshStatus.textContent=refresh&&state.data?"กำลังตรวจผลรับรองล่าสุด…":"กำลังอ่านผลการแข่งขัน…";
    try{
      loadShareIndex();
      const source=globalThis.NongkumResultSource
        ?await globalThis.NongkumResultSource.load():null;
      let payload=source?.data;
      if(!payload){
        const response=await fetch("./data/public-results.json?refresh="+Date.now(),{cache:"no-store"});
        if(!response.ok)throw Error("ไฟล์ผลการแข่งขันยังไม่พร้อม");
        payload=await response.json();
      }
      state.source=source?.source||"backup";
      try{state.catalog=await globalThis.NongkumResultsCatalog?.load()||new Map();}
      catch(_){state.catalog=new Map();}
      try{state.media=await globalThis.NongkumActivityMedia?.load()||new Map();}
      catch(_){state.media=new Map();} // No private or unreviewed photos.
      loaded(payload);
      setFailure(false);
      els.refreshStatus.textContent=globalThis.Nongkum.formatCheckedAt(new Date())+
        (source?.source==="live"?" · ผลที่รับรองจากระบบล่าสุด":" · สำเนาผลที่รับรอง · ตรวจข้อมูลล่าสุดไม่ได้");
      return true;
    }catch(e){
      els.refreshStatus.textContent=state.data?"รีเฟรชไม่สำเร็จ · ยังคงผลล่าสุดที่โหลดไว้":"โหลดผลรับรองไม่สำเร็จ · ลองใหม่อีกครั้ง";
      if(!state.data){
        if(state.directMode&&els.directStatus)els.directStatus.textContent="ตรวจผลรับรองไม่ได้ โปรดลองอีกครั้ง";
        els.count.textContent="ตรวจข้อมูลไม่ได้";
        els.empty.hidden=true;
        setFailure(true);
      }
      console.error(e);
      return false;
    }finally{setInitialLoading(false);els.refresh.disabled=false;}
  }
  globalThis.NongkumPageRefresh=()=>loadResults(true);
  els.refresh.addEventListener("click",()=>loadResults(true));
  if(els.retry)els.retry.addEventListener("click",()=>loadResults(false));
  if(els.directRetry)els.directRetry.addEventListener("click",()=>loadResults(false));
  loadResults(false);
  // Recheck the approved-only source every minute while visible (no background polling).
  if(typeof setInterval==="function"){
    setInterval(function(){
      if(document.visibilityState==="visible"&&!els.refresh.disabled)loadResults(true);
    },60000);
  }
})();
