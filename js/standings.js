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
  const state={data:null,rules:null,snapshot:null,program:null,school:"",sport:"",level:""};
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
  function selectedGroups(){
    const groups=globalThis.NongkumPreliminaryStandings?.build(
      state.program,state.data?.results||[],state.rules)||[];
    return groups.filter(g=>(!state.sport||g.sport_id===state.sport)&&
      (!state.level||globalThis.Nongkum.classifyLevel(g)===state.level)&&
      (!state.school||g.rows.some(row=>row.team_id===state.school)));
  }
  function renderRoster(){
    if(!ui.roster||!state.data)return 0;
    const groups=selectedGroups();
    ui.roster.hidden=!groups.length;
    if(!groups.length){ui.roster.innerHTML="";return 0;}
    const schoolById=new Map(state.data.schools.map(s=>[s.id,s]));
    const sportById=new Map(state.data.sports.map(s=>[s.id,s]));
    ui.roster.innerHTML=groups.map(g=>{
      const snapshot=state.snapshot?.standings?.find(x=>x.sport_id===g.sport_id&&x.division===g.division);
      const official=snapshot?.ranking_status==="final";
      const rows=(official?snapshot.rows:g.rows)
        .slice().sort((a,b)=>official
          ?((a.position??999)-(b.position??999))
          :g.provisional
            ?((a.provisional_position??999)-(b.provisional_position??999)||
              String(schoolById.get(a.team_id)?.short||a.team_id)
                .localeCompare(String(schoolById.get(b.team_id)?.short||b.team_id),"th"))
            :String(schoolById.get(a.team_id)?.short||a.team_id)
              .localeCompare(String(schoolById.get(b.team_id)?.short||b.team_id),"th"));
      const rankLabel=row=>official&&row.position!=null?String(row.position):
        g.provisional&&row.provisional_position!=null
          ?String(row.provisional_position)+(row.provisional_shared?" ร่วม":""):"—";
      const heading=(sportById.get(g.sport_id)?.name||g.sport_id)+" · "+
        (g.base_division||g.division)+(g.label==="พบกันหมด"?" · พบกันหมด":" · "+g.label);
      const cols=g.has_goals?"<th>ได้</th><th>เสีย</th><th>ผลต่าง</th>":"";
      const pointHeader=g.has_points||official?"<th>คะแนน</th>":"<th>คะแนน*</th>";
      const body=rows.map(row=>"<tr"+(state.school===row.team_id?" class='standings-my-school'":"")+"><td>"+safe(rankLabel(row))+
        "</td><th scope='row'>"+safe(schoolById.get(row.team_id)?.short||row.team_id)+"</th>"+
        ["played","won","drawn","lost"].map(k=>"<td>"+safe(row[k]??0)+"</td>").join("")+
        (g.has_goals?["goals_for","goals_against","goal_difference"].map(k=>"<td>"+safe(row[k]??0)+"</td>").join(""):"")+
        "<td>"+(g.has_points||official?safe(row.points??0):"—")+"</td></tr>").join("");
      const note=official?"ตารางอันดับจากผลและกติกาที่ผ่านการรับรองแล้ว":
        g.provisional
          ?"อันดับชั่วคราว · ผลรับรอง "+g.approved_count+"/"+g.match_count+
            " คู่ · เรียงคะแนน → ผลต่างประตูรวม → ผลพบกันเอง · หากยังแยกไม่ได้เป็นอันดับร่วม · ยังไม่ใช้ตัดสินเข้ารอบ"
          :g.approved_count
            ?"สถิติจากผลรับรอง "+g.approved_count+"/"+g.match_count+
              " คู่ · ยังไม่จัดอันดับจนกว่าเกณฑ์กีฬานี้จะได้รับการรับรอง"
            :"ยังไม่มีผลการแข่งขันในกลุ่มนี้ · แสดงรายชื่อและค่าเริ่มต้น 0 · ยังไม่จัดอันดับ";
      // On phones, show all opponents in the selected group, not just the chosen school.
      const compact=rows.map(row=>{
        const mine=state.school===row.team_id;
        const name=safe(schoolById.get(row.team_id)?.short||row.team_id);
        const order=(official||g.provisional)
          ?"<span class='standings-mobile-position'>อันดับ "+safe(rankLabel(row))+"</span>":"";
        const points=(g.has_points||official)
          ?"<strong class='standings-mobile-points'>"+safe(row.points??0)+" แต้ม</strong>":"";
        return "<div class='standings-mobile-team"+(mine?" standings-my-school":"")+"'>"+
          "<div class='standings-mobile-name'>"+order+"<strong>"+name+"</strong>"+
          (mine?"<span class='standings-mine-label'>โรงเรียนของฉัน</span>":"")+"</div>"+
          "<div class='standings-mobile-summary'>"+
          "<span class='standings-mobile-stats'>แข่ง "+safe(row.played??0)+
          " · ชนะ "+safe(row.won??0)+
          (g.has_goals?" · ผลต่าง "+(row.goal_difference>0?"+":"")+safe(row.goal_difference??0):"")+
          "</span>"+points+"</div></div>";
      }).join("");
      const table="<div class='standings-table-scroll' tabindex='0' role='region' aria-label='ตารางรายละเอียด "+safe(heading)+"'>"+
        "<table class='standings-table'><thead><tr>"+
        "<th scope='col'>อันดับ</th><th scope='col'>ทีม</th><th scope='col'>แข่ง</th>"+
        "<th scope='col'>ชนะ</th><th scope='col'>เสมอ</th><th scope='col'>แพ้</th>"+
        cols+pointHeader+"</tr></thead><tbody>"+body+"</tbody></table></div>";
      return "<section class='standings-group' aria-label='"+safe(heading)+"'>"+
        "<h3>"+safe(heading)+"</h3><p class='standings-provenance'>"+safe(note)+
        (!g.has_points&&!official?" · คะแนนรอรับรองหลักเกณฑ์":"")+"</p>"+
        "<div class='standings-mobile-rows' aria-label='รายชื่อทีมในสาย'>"+compact+"</div>"+
        "<div class='standings-desktop-table'>"+table+"</div>"+
        "<details class='standings-mobile-details'><summary>ดูตารางละเอียด <span aria-hidden='true'>›</span></summary>"+
        table+"</details></section>";
    }).join("");
    return groups.length;
  }
  async function loadGroupProgram(){
    // Same corrected 236-item source as the schedule page; never infer group from bracket progression.
    const res=await fetch("./data/program-from-pdf-2569-20261104-draft.json?refresh="+Date.now(),
      {cache:"no-store"});
    if(!res.ok)throw Error("โหลดรายชื่อทีมไม่ได้");
    const raw=await res.json();
    const program=globalThis.NongkumProgramCorrections?.apply(raw);
    if(!program||program.fixtures?.length!==236||program.metadata?.all_data_approved!==false)
      throw Error("โปรแกรมไม่ผ่านการตรวจแหล่ง");
    state.program=program;
    render();
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
    const groupCount=renderRoster();
    ui.count.textContent=groupCount+" ตารางทีม · "+approved.length+" ผลรับรอง";
    ui.empty.hidden=state.data.results.length!==0||groupCount>0;
    ui.pending.hidden=state.data.results.length===0||groupCount>0||!!state.snapshot?.standings?.length;
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
    const publishedDate=data.metadata.published_at?new Date(data.metadata.published_at):null;
    ui.published.textContent=publishedDate&&!Number.isNaN(publishedDate.getTime())
      ?"เผยแพร่ผลล่าสุด: "+new Intl.DateTimeFormat("th-TH",{
        timeZone:"Asia/Bangkok",day:"numeric",month:"short",year:"numeric",
        hour:"2-digit",minute:"2-digit",hourCycle:"h23"
      }).format(publishedDate)+" น.":"";
    sports();render();syncLinks();
  }
  function setLoading(active){
    if(ui.skeleton)ui.skeleton.hidden=!active;
    if(ui.listing?.setAttribute)ui.listing.setAttribute("aria-busy",String(active));
  }
  async function load(refresh){
    if(loading)return false;
    loading=true;
    const first=!state.data;
    if(first){setLoading(true);ui.failure.hidden=true;}
    ui.refresh.disabled=true;
    ui.status.textContent=refresh&&state.data?"กำลังตรวจผลที่รับรองล่าสุด…":"กำลังอ่านผลการแข่งขัน…";
    try{
      const source=globalThis.NongkumResultSource
        ?await globalThis.NongkumResultSource.load():null;
      let data=source?.data;
      if(!data){
        const response=await fetch("./data/public-results.json?refresh="+Date.now(),{cache:"no-store"});
        if(!response.ok)throw Error("โหลดผลรับรองไม่ได้");
        data=await response.json();
      }
      loaded(data);
      try{await loadGroupProgram();}catch(programError){state.program=null;render();console.error(programError);}
      try{await loadRules(data);}catch(ruleError){state.snapshot=null;render();console.error(ruleError);}
      ui.failure.hidden=true;
      ui.status.textContent=globalThis.Nongkum.formatCheckedAt(new Date())+(source?.source==="live"?" · ผลที่รับรองจากระบบล่าสุด":" · สำเนาผลที่รับรอง · ตรวจข้อมูลล่าสุดไม่ได้");
      return true;
    }catch(error){
      ui.status.textContent=state.data
        ?"รีเฟรชไม่สำเร็จ · ยังคงข้อมูลล่าสุดที่โหลดไว้"
        :"โหลดข้อมูลไม่ได้ · โปรดลองใหม่อีกครั้ง";
      if(!state.data){
        ui.count.textContent="ตรวจข้อมูลไม่ได้";
        ui.empty.hidden=true;ui.pending.hidden=true;ui.failure.hidden=false;
      }
      console.error(error);
      return false;
    }finally{
      setLoading(false);ui.refresh.disabled=false;loading=false;
    }
  }
  globalThis.NongkumPageRefresh=()=>load(true);
  ui.refresh.addEventListener("click",()=>load(true));
  ui.retry.addEventListener("click",()=>load(false));
  load(false);
  // Match results page: recheck approved-only source every minute while visible.
  if(typeof setInterval==="function")setInterval(()=>{
    if(document.visibilityState==="visible"&&!ui.refresh.disabled)load(true);
  },60000);
})();
