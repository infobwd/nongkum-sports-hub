/* R15-A: standalone standings shell. Deliberately no scores/standings algorithm until R15-B. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const ui={
    school:$("standingsSchool"),level:$("standingsLevel"),sports:$("standingsSports"),
    count:$("standingsCount"),status:$("standingsStatus"),published:$("standingsPublishedAt"),
    empty:$("standingsEmpty"),pending:$("standingsPendingRules"),
    pendingDetails:$("standingsPendingDetails"),roster:$("standingsRoster"),skeleton:$("standingsSkeleton"),
    failure:$("standingsFailure"),listing:$("standingsListing"),
    refresh:$("refreshStandings"),retry:$("retryStandings"),
    resultsLink:$("resultsSubResults"),emptyLink:$("emptyResultsLink"),
    pendingLink:$("pendingResultsLink")
  };
  const state={data:null,rules:null,snapshot:null,school:"",sport:"",level:""};
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
  function renderRoster(){
    if(!ui.roster)return;
    const rule=state.rules?.football_league;
    const eligible=rule&&rule.mapping_status==="source_verified_not_approved"&&
      Array.isArray(rule.team_ids)&&rule.team_ids.length===6&&
      (!state.sport||state.sport==="football")&&(!state.level||state.level==="primary");
    const snapshot=state.snapshot?.standings?.find(x=>x.sport_id==="football"&&x.division==="12 ปี ชาย");
    const prestart=eligible&&state.data.results.length===0;
    const shown=eligible&&(prestart||snapshot);
    ui.roster.hidden=!shown;
    if(!shown){ui.roster.innerHTML="";return;}
    const schoolById=new Map(state.data.schools.map(s=>[s.id,s]));
    const rows=prestart
      ?rule.team_ids.map(id=>({team_id:id,played:0,won:0,drawn:0,lost:0,goals_for:0,goals_against:0,
        goal_difference:0,points:0,position:null}))
      :snapshot.rows;
    const filtered=rows.filter(x=>!state.school||x.team_id===state.school);
    const before=prestart?"รายชื่อทีมเบื้องต้น · ยังไม่จัดอันดับ":
      snapshot.ranking_status==="final"?"ตารางคะแนนตามผลรับรองครบทุกคู่":"ตารางคะแนนระหว่างการแข่งขัน · ยังไม่ใช่อันดับสุดท้าย";
    const header="<h3>"+safe(before)+"</h3><p class='standings-provenance'>"+
      (prestart?"ข้อมูลทีมจากสูจิบัตรฉบับร่าง · ค่า 0 หมายถึงยังไม่เริ่มบันทึกผล ไม่ใช่ผลตัดสิน":
      "คำนวณเฉพาะผลที่รับรองแล้ว "+snapshot.matches_approved+"/"+snapshot.matches_total+" คู่")+"</p>";
    const table="<div class='standings-table-scroll'><table class='standings-table'><thead><tr>"+
      "<th scope='col'>อันดับ</th><th scope='col'>ทีม</th><th scope='col'>แข่ง</th><th scope='col'>ชนะ</th>"+
      "<th scope='col'>เสมอ</th><th scope='col'>แพ้</th><th scope='col'>ได้</th><th scope='col'>เสีย</th>"+
      "<th scope='col'>ผลต่าง</th><th scope='col'>คะแนน</th></tr></thead><tbody>"+
      filtered.map(row=>"<tr><td>"+(row.position??"—")+"</td><th scope='row'>"+
      safe(schoolById.get(row.team_id)?.short||row.team_id)+"</th>"+
      ["played","won","drawn","lost","goals_for","goals_against","goal_difference","points"].
      map(k=>"<td>"+safe(String(row[k]))+"</td>").join("")+"</tr>").join("")+
      "</tbody></table></div>";
    ui.roster.innerHTML=header+(filtered.length?table:"<p>ไม่มีทีมตรงกับตัวกรอง</p>");
  }
  async function checkedDigest(value){
    if(!globalThis.crypto?.subtle||!globalThis.TextEncoder)return null;
    const bytes=new TextEncoder().encode(globalThis.NongkumStandingsEngine.canonical(value));
    const hash=await globalThis.crypto.subtle.digest("SHA-256",bytes);
    return "sha256:"+Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("");
  }
  async function loadRules(data){
    const response=await fetch("./data/standings-rules.json?refresh="+Date.now(),{cache:"no-store"});
    if(!response.ok)throw Error("ไม่สามารถโหลดกติกา");
    const rules=await response.json();
    if(rules.schema_version!==1||typeof rules.rules_version!=="string"||!rules.football_league)
      throw Error("กติกาไม่ผ่านรูปแบบ");
    state.rules=rules;state.snapshot=null;
    const football=rules.sport_policies?.find(x=>x.sport_id==="football");
    if(data.results.length&&rules.football_league.approval_status==="approved"&&
       rules.football_league.tie_break_status==="approved"&&football?.status==="implemented"){
      const res=await fetch("./data/public-standings.json?refresh="+Date.now(),{cache:"no-store"});
      if(!res.ok)throw Error("ยังไม่เผยแพร่ snapshot ที่ตรวจรับ");
      const snap=await res.json();
      const [resultsHash,rulesHash]=await Promise.all([checkedDigest(data),checkedDigest(rules)]);
      if(!resultsHash||!rulesHash||snap.source_digest!==resultsHash||
         snap.rules_version!==rules.rules_version||snap.rules_digest!==rulesHash||
         snap.program_source_digest!=="sha256:"+rules.source.candidate_source_sha256||
         snap.publication_status!=="published"||!Array.isArray(snap.standings))
        throw Error("snapshot ไม่ตรงแหล่งผล/กติกาที่ตรวจรับ");
      state.snapshot=snap;
    }
    render();
  }
  function render(){
    if(!state.data)return;
    const approved=state.data.results.filter(matches);
    ui.count.textContent=approved.length+" ผลรับรอง";
    ui.empty.hidden=state.data.results.length!==0;
    ui.pending.hidden=state.data.results.length===0||!!state.snapshot?.standings?.length;
    if(state.data.results.length){
      ui.pendingDetails.textContent=approved.length
        ? "พบผลที่รับรอง "+approved.length+" รายการสำหรับตัวกรองนี้ แต่ยังไม่แสดงอันดับจนกว่ากติกาจะผ่านการตรวจรับ"
        : "ยังไม่มีผลที่รับรองตรงกับตัวกรองนี้ · เปลี่ยนโรงเรียน กีฬา หรือช่วงชั้นเพื่อตรวจรายการอื่น";
    }
    renderRoster();
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
      const data=await response.json();
      loaded(data);
      try{await loadRules(data);}catch(ruleError){state.snapshot=null;render();console.error(ruleError);}
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
