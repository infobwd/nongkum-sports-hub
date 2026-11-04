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
    programLink:document.getElementById("programLink")
  };
  const state={data:null,school:"",sport:"",level:""};
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
  }
  function loaded(data){
    if(!validDataset(data))throw Error("ผลการแข่งขันไม่ผ่านการตรวจ Approved-only");
    state.data=data;
    data.schools.forEach(s=>{const o=document.createElement("option");o.value=s.id;o.textContent=s.name;els.school.appendChild(o);});
    const params=new URLSearchParams(location.search);
    const saved=globalThis.Nongkum.schoolInStore();
    const school=params.get("school")||saved;
    state.school=data.schools.some(s=>s.id===school)?school:"";
    state.sport=data.sports.some(s=>s.id===params.get("sport"))?params.get("sport"):"";
    state.level=["early","primary","secondary"].includes(params.get("level"))?params.get("level"):"";
    els.school.value=state.school;els.level.value=state.level;
    els.published.textContent=data.metadata.published_at?"อัปเดตผลรับรองล่าสุด: "+data.metadata.published_at:"ยังไม่มีผลรับรองเผยแพร่";
    makeSports();render();
    els.programLink.href=globalThis.Nongkum.href("index.html",state);
    els.school.addEventListener("change",()=>{state.school=els.school.value;globalThis.Nongkum.saveSchool(state.school);render();syncUrl();});
    els.level.addEventListener("change",()=>{state.level=els.level.value;render();syncUrl();});
  }
  fetch("./data/public-results.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("ไฟล์ผลการแข่งขันยังไม่พร้อม");return r.json();})
  .then(loaded).catch(e=>{
    els.count.textContent="ตรวจข้อมูลไม่ได้";els.empty.hidden=false;
    els.empty.innerHTML="<h2>ผลการแข่งขันยังไม่พร้อมเผยแพร่</h2><p>โปรดลองใหม่ภายหลัง และตรวจประกาศจากคณะกรรมการ</p>";
    console.error(e);
  });
})();
