/* Approved results only. No access to editor secrets or draft result rows. */
(function(){
  "use strict";
  const els={
    school:document.getElementById("resultSchool"),
    level:document.getElementById("resultLevel"),
    sports:document.getElementById("resultSports"),
    cards:document.getElementById("resultsList"),
    count:document.getElementById("resultsCount"),
    empty:document.getElementById("noResults"),
    published:document.getElementById("publishedAt"),
    programLink:document.getElementById("programLink"),
    refresh:document.getElementById("refreshResults"),
    refreshStatus:document.getElementById("resultsRefreshStatus")
  };
  const state={data:null,school:"",sport:"",level:"",focusId:""};
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
  function render(){
    const data=state.data;
    if(!data)return;
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
    els.cards.addEventListener("click",async function(event){
      const btn=event.target.closest("[data-share-result]");
      if(!btn||!state.data)return;
      const item=state.data.results.find(x=>x.id===btn.dataset.shareResult&&x.status==="approved");
      if(!item)return;
      try{
        const answer=await globalThis.Nongkum.shareItem("results.html","result",item.id,"ผลการแข่งขัน · มิตรภาพเกม");
        if(answer==="copied")els.refreshStatus.textContent="คัดลอกลิงก์ผลแข่งขันที่รับรองแล้ว";
        if(answer==="unavailable")els.refreshStatus.textContent="อุปกรณ์นี้ไม่รองรับการแชร์หรือคัดลอกลิงก์";
      }catch(e){els.refreshStatus.textContent="ไม่สามารถแชร์ลิงก์ผลแข่งขันได้";}
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
      const linked=data.results.find(x=>x.id===params.get("result")&&x.status==="approved");
      if(linked){
        state.school="";state.level="";state.sport=linked.sport_id;state.focusId=linked.id;
      }
      els.school.value=state.school;els.level.value=state.level;
      setupHandlers();
    }
    els.published.textContent=data.metadata.published_at?
      "เผยแพร่ผลรับรองล่าสุด: "+data.metadata.published_at:
      "ยังไม่มีผลแข่งขันที่ผ่านการรับรองเผยแพร่";
    makeSports();render();
    els.programLink.href=globalThis.Nongkum.href("index.html",state);
  }
  async function loadResults(refresh){
    els.refresh.disabled=true;
    els.refreshStatus.textContent=refresh?"กำลังตรวจผลรับรองล่าสุด…":"กำลังอ่านผลการแข่งขัน…";
    try{
      const response=await fetch("./data/public-results.json?refresh="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw Error("ไฟล์ผลการแข่งขันยังไม่พร้อม");
      const payload=await response.json();
      loaded(payload);
      els.refreshStatus.textContent=globalThis.Nongkum.formatCheckedAt(new Date())+
        " · ข้อมูลที่เผยแพร่แล้วบนเว็บไซต์ ไม่ใช่ Google Sheets แบบเรียลไทม์";
    }catch(e){
      els.refreshStatus.textContent="รีเฟรชไม่สำเร็จ · "+(state.data?"ยังคงผลล่าสุดที่โหลดไว้":"ยังไม่สามารถอ่านข้อมูลผล");
      if(!state.data){
        els.count.textContent="ตรวจข้อมูลไม่ได้";els.empty.hidden=false;
        els.empty.innerHTML="<h2>ผลการแข่งขันยังไม่พร้อมเผยแพร่</h2><p>โปรดลองใหม่ภายหลัง</p>";
      }
      console.error(e);
    }finally{els.refresh.disabled=false;}
  }
  els.refresh.addEventListener("click",()=>loadResults(true));
  loadResults(false);
  // Recheck the published JSON every 5 minutes while this page is visible.
  if(typeof setInterval==="function"){
    setInterval(function(){
      if(document.visibilityState==="visible"&&!els.refresh.disabled)loadResults(true);
    },300000);
  }
})();
