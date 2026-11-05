/* R15-A: standalone standings shell. Deliberately no scores/standings algorithm until R15-B. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const ui={
    school:$("standingsSchool"),level:$("standingsLevel"),sports:$("standingsSports"),
    count:$("standingsCount"),status:$("standingsStatus"),published:$("standingsPublishedAt"),
    empty:$("standingsEmpty"),pending:$("standingsPendingRules"),
    pendingDetails:$("standingsPendingDetails"),skeleton:$("standingsSkeleton"),
    failure:$("standingsFailure"),listing:$("standingsListing"),
    refresh:$("refreshStandings"),retry:$("retryStandings"),
    resultsLink:$("resultsSubResults"),emptyLink:$("emptyResultsLink"),
    pendingLink:$("pendingResultsLink")
  };
  const state={data:null,school:"",sport:"",level:""};
  let initialized=false,loading=false;
  const safe=globalThis.Nongkum.escapeHtml;
  function validPublicData(data){
    return !!(data&&data.schema_version===1&&data.metadata&&
      data.metadata.approved_only===true&&
      ["empty","published"].includes(data.metadata.publication_status)&&
      Array.isArray(data.schools)&&Array.isArray(data.sports)&&Array.isArray(data.results)&&
      data.metadata.approved_results_count===data.results.length&&
      data.results.every(r=>r&&r.status==="approved"&&typeof r.id==="string"&&
        ["score","sets","win_loss","ranking"].includes(r.result_type))&&
      (data.results.length===0||data.metadata.publication_status==="published"));
  }
  function matches(r){
    return (!state.sport||r.sport_id===state.sport)&&
      (!state.level||globalThis.Nongkum.classifyLevel(r)===state.level)&&
      (!state.school||(r.result_type==="ranking"
        ? (r.rankings||[]).some(row=>row.school_id===state.school)
        :r.team_a_id===state.school||r.team_b_id===state.school));
  }
  function syncLinks(){
    const toResults=globalThis.Nongkum.href("results.html",state);
    ui.resultsLink.href=toResults;
    ui.emptyLink.href=toResults;
    ui.pendingLink.href=toResults;
    globalThis.NongkumNavigation?.update?.(state);
  }
  function updateUrl(){
    syncLinks();
    const url=new URL(location.href);
    for(const key of ["school","sport","level"]){
      if(state[key])url.searchParams.set(key,state[key]);
      else url.searchParams.delete(key);
    }
    history.replaceState(null,"",url.pathname+url.search+url.hash);
  }
  function sports(){
    ui.sports.innerHTML=[{id:"",name:"ทุกกีฬา",emoji:"📋"},...state.data.sports].map(s=>
      "<button type='button' class='result-chip' data-sport='"+safe(s.id)+
      "' aria-pressed='"+(state.sport===s.id?"true":"false")+"'>"+safe(s.emoji+" "+s.name)+"</button>"
    ).join("");
    ui.sports.querySelectorAll("button").forEach(button=>
      button.addEventListener("click",()=>{
        state.sport=button.dataset.sport;
        sports();render();updateUrl();
      })
    );
  }
  function render(){
    if(!state.data)return;
    const approved=state.data.results.filter(matches);
    ui.count.textContent=approved.length+" ผลรับรอง";
    ui.empty.hidden=state.data.results.length!==0;
    ui.pending.hidden=state.data.results.length===0;
    if(state.data.results.length){
      ui.pendingDetails.textContent=approved.length
        ? "พบผลที่รับรอง "+approved.length+" รายการสำหรับตัวกรองนี้ แต่ยังไม่แสดงอันดับจนกว่ากติกาจะผ่านการตรวจรับ"
        : "ยังไม่มีผลที่รับรองตรงกับตัวกรองนี้ · เปลี่ยนโรงเรียน กีฬา หรือช่วงชั้นเพื่อตรวจรายการอื่น";
    }
  }
  function setup(){
    if(initialized)return;
    initialized=true;
    ui.school.addEventListener("change",()=>{
      state.school=ui.school.value;
      globalThis.Nongkum.saveSchool(state.school);
      render();updateUrl();
    });
    ui.level.addEventListener("change",()=>{
      state.level=ui.level.value;render();updateUrl();
    });
  }
  function loaded(data){
    if(!validPublicData(data))throw Error("ชุดผลที่รับรองไม่ตรง schema");
    state.data=data;
    if(!initialized){
      const params=new URLSearchParams(location.search);
      const school=params.get("school")||globalThis.Nongkum.schoolInStore();
      state.school=data.schools.some(s=>s.id===school)?school:"";
      state.sport=data.sports.some(s=>s.id===params.get("sport"))?params.get("sport"):"";
      state.level=["early","primary","secondary"].includes(params.get("level"))
        ?params.get("level"):"";
      data.schools.forEach(s=>{
        const option=document.createElement("option");
        option.value=s.id;option.textContent=s.name;
        ui.school.appendChild(option);
      });
      ui.school.value=state.school;ui.level.value=state.level;
      setup();
    }
    ui.published.textContent=data.metadata.published_at
      ?"เผยแพร่ผลล่าสุด: "+data.metadata.published_at:"";
    sports();render();syncLinks();
  }
  function setLoading(active){
    if(ui.skeleton)ui.skeleton.hidden=!active;
    if(ui.listing?.setAttribute)ui.listing.setAttribute("aria-busy",String(active));
  }
  async function load(refresh){
    if(loading)return;
    loading=true;
    const first=!state.data;
    if(first){setLoading(true);ui.failure.hidden=true;}
    ui.refresh.disabled=true;
    ui.status.textContent=refresh&&state.data?"กำลังตรวจผลที่รับรองล่าสุด…":"กำลังอ่านผลการแข่งขัน…";
    try{
      const response=await fetch("./data/public-results.json?refresh="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw Error("โหลดผลรับรองไม่ได้");
      loaded(await response.json());
      ui.failure.hidden=true;
      ui.status.textContent=globalThis.Nongkum.formatCheckedAt(new Date())+" · ผลรับรองจากไฟล์บนเว็บ";
    }catch(error){
      ui.status.textContent=state.data
        ?"รีเฟรชไม่สำเร็จ · ยังคงข้อมูลล่าสุดที่โหลดไว้"
        :"โหลดข้อมูลไม่ได้ · โปรดลองใหม่อีกครั้ง";
      if(!state.data){
        ui.count.textContent="ตรวจข้อมูลไม่ได้";
        ui.empty.hidden=true;ui.pending.hidden=true;ui.failure.hidden=false;
      }
      console.error(error);
    }finally{
      setLoading(false);ui.refresh.disabled=false;loading=false;
    }
  }
  ui.refresh.addEventListener("click",()=>load(true));
  ui.retry.addEventListener("click",()=>load(false));
  load(false);
  // Match the existing results page: check the approved JSON every five minutes if visible.
  if(typeof setInterval==="function")setInterval(()=>{
    if(document.visibilityState==="visible"&&!ui.refresh.disabled)load(true);
  },300000);
})();
