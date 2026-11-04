
(function(){
  "use strict";
  const els={
    school:document.getElementById("school"),
    search:document.getElementById("search"),
    sports:document.getElementById("sports"),
    levels:document.getElementById("levels"),
    cards:document.getElementById("cards"),
    count:document.getElementById("count"),
    empty:document.getElementById("empty"),
    more:document.getElementById("more"),
    advanced:document.getElementById("advancedFilters"),
    activeFiltersHint:document.getElementById("activeFiltersHint"),
    refresh:document.getElementById("refreshProgram"),
    refreshStatus:document.getElementById("programRefreshStatus")
  };
  const state={data:null,school:"",sport:"",level:"",query:"",limit:12,focusId:""};
  let initialized=false;
  const LEVELS=[
    {id:"",name:"ทุกช่วงชั้น"},
    {id:"early",name:"ก่อนเรียน / ปฐมวัย"},
    {id:"primary",name:"ประถม"},
    {id:"secondary",name:"มัธยม"}
  ];
  const safe=globalThis.Nongkum.escapeHtml;
  function getSchool(id){return state.data.schools.find(function(s){return s.id===id;});}
  function getSport(id){return state.data.sports.find(function(s){return s.id===id;});}
  function resetLimit(){state.limit=12;}
  const classifyLevel=globalThis.Nongkum.classifyLevel;
  function laneLine(l){
    return "<div class='lane'><span class='lane-num'>ลู่ "+safe(l.lane)+"</span><span>"+safe(l.source_school_label)+"</span></div>";
  }
  function trackContent(m){
    const all=(m.lanes||[]).filter(function(l){return !l.vacant;});
    const own=state.school?all.filter(function(l){return l.school_id===state.school;}):[];
    const intro=state.school
      ? own.map(function(l){return "<div class='my-lane'><span class='lane-badge'>ลู่ "+safe(l.lane)+"</span><strong>"+safe(l.source_school_label)+"</strong></div>";}).join("")
      : "<p class='lane-overview'>มีโรงเรียน/ศูนย์ที่ระบุในต้นฉบับ "+all.length+" ลู่</p>";
    const blanks=(m.lanes||[]).filter(function(l){return l.vacant;}).length;
    const others="<details class='lane-details'><summary>ดูทุกลู่ ("+all.length+")</summary><div class='lanes'>"
      +all.map(laneLine).join("")
      +(blanks?"<p class='subtle'>ต้นฉบับเว้นว่างอีก "+blanks+" ลู่</p>":"")
      +"</div></details>";
    return "<div class='eventname'>"+safe(m.name)+"</div>"+intro+others;
  }
  function matchContent(m){
    const a=m.team_a_id?getSchool(m.team_a_id):null;
    const b=m.team_b_id?getSchool(m.team_b_id):null;
    return "<div class='match'><span class='team'>"+safe(a?a.short:(m.source_team_a_label||"รอระบุทีม"))+
      "</span><span class='vs'>VS</span><span class='team'>"+
      safe(b?b.short:(m.source_team_b_label||"รอระบุทีม"))+"</span></div>";
  }
  function scheduleTags(m){
    if(m.planning_date){
      const parts=m.planning_date.split("-");
      const day=Number(parts[2]),month=Number(parts[1]),year=Number(parts[0])+543;
      const monthNames=["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
      const dateText=day+" "+(monthNames[month]||"")+" "+year;
      const confirmedDate=m.planning_date_confirmation==="confirmed";
      const confirmedVenue=m.planning_venue_confirmation==="confirmed"&&!!m.planning_venue;
      const tags=["<span class='tag "+(confirmedDate?"verified":"unconfirmed")+"'>แข่งนอกรอบ "+safe(dateText)+
        (confirmedDate?" · วันยืนยันแล้ว":" · รอตรวจรับ")+"</span>"];
      if(confirmedVenue)tags.push("<span class='tag verified'>สถานที่ "+safe(m.planning_venue)+" · ยืนยันแล้ว</span>");
      else if(m.field)tags.push("<span class='tag'>"+safe(m.field)+" (ตาม PDF)</span>");
      else tags.push("<span class='tag unconfirmed'>สนามรอยืนยัน</span>");
      if(m.time)tags.push("<span class='tag'>เวลาใน PDF "+safe(m.time)+" น.</span>");
      else tags.push("<span class='tag unconfirmed'>เวลาแข่งรอแจ้ง</span>");
      return tags.join("");
    }
    const missing=!m.time&&!m.field;
    if(missing)return "<span class='tag unconfirmed'>วัน · เวลา · สนาม รอยืนยัน</span>";
    const tags=["<span class='tag unconfirmed'>วันรอยืนยัน</span>"];
    if(m.time)tags.push("<span class='tag'>เวลาใน PDF "+safe(m.time)+" น.</span>");
    else tags.push("<span class='tag unconfirmed'>เวลารอยืนยัน</span>");
    if(m.field)tags.push("<span class='tag'>"+safe(m.field)+" (ตาม PDF)</span>");
    else tags.push("<span class='tag unconfirmed'>สนามรอยืนยัน</span>");
    return tags.join("");
  }
  function card(m){
    const sport=getSport(m.sport_id),track=m.kind==="track_event";
    const heading="<div class='fixture-head'><div class='sport-label'><span class='sport-name'>"+
      safe(sport?sport.emoji+" "+sport.name:m.sport_id)+"</span><span class='division'>"+
      safe(m.division||"")+"</span></div><span class='pairnum'>"+
      (track?"รายการ ":"คู่ที่ ")+safe(m.source_match_no)+"</span></div>";
    const content=track?trackContent(m):matchContent(m);
    const original=!track&&m.source_pair_text
      ? "<div class='source'>คู่แข่งขันในต้นฉบับ: "+safe(m.source_pair_text)+"</div>":"";
    const flags=m.qa_flags&&m.qa_flags.length
      ? "<p class='qa-note'>รอกรรมการตรวจจุดอ้างอิง: "+safe(m.qa_flags.join(", "))+"</p>":"";
    const detail="<details class='source-details'><summary>รายละเอียด · ข้อมูลร่าง</summary>"+
      "<div class='details'><span class='tag'>"+safe(m.round||"รายการแข่งขัน")+"</span></div>"+
      original+flags+(m.planning_date?"<p class='qa-note'>"+safe(m.planning_source||"วันที่แข่งนอกรอบรอกรรมการตรวจรับ")+"</p>":"")+
      "<div class='source'><a class='scorecard-link' href='./forms/score-sheet.html?fixture="+
      encodeURIComponent(m.id)+"'>พิมพ์ใบบันทึกผล A4 สำหรับกรรมการ</a></div>"+
      "<div class='source'>อ้างอิง PDF หน้า "+safe(m.source_page)+
      " · ยังไม่ผ่านการรับรอง</div></details>";
    return "<article class='fixture"+(m.id===state.focusId?" shared-target":"")+
      "' data-fixture-card='"+safe(m.id)+"'>"+heading+content+
      "<div class='details quick-status'>"+scheduleTags(m)+"</div>"+detail+
      "<div class='share-line'><button type='button' class='share-button' data-share-fixture='"+
      safe(m.id)+"'>↗ แชร์คู่แข่งขัน</button></div></article>";
  }
  function updateFilterHint(){
    const active=[];
    if(state.level)active.push(LEVELS.find(function(l){return l.id===state.level;})?.name||"ช่วงชั้น");
    if(state.query.trim())active.push("มีคำค้น");
    els.activeFiltersHint.textContent=active.length?active.join(" · "):"";
  }
  function makeChips(){
    const q=state.query.trim().toLocaleLowerCase("th");
    // Counts deliberately ignore the selected sport so every other sport stays one tap away.
    const base=state.data.fixtures.filter(function(m){return matchesFilters(m,q,true);});
    const counts=base.reduce(function(o,m){o[m.sport_id]=(o[m.sport_id]||0)+1;return o;},{});
    const options=[{id:"",name:"ทุกกีฬา",emoji:"📋"}].concat(state.data.sports);
    els.sports.innerHTML=options.map(function(s){
      const total=s.id?(counts[s.id]||0):base.length;
      return "<button type='button' class='chip' data-sport='"+safe(s.id)+"' aria-pressed='"+
        (state.sport===s.id?"true":"false")+"'>"+safe(s.emoji+" "+s.name)+
        " <span class='chip-count'>"+total+"</span></button>";
    }).join("");
    els.sports.querySelectorAll("button").forEach(function(btn){
      btn.addEventListener("click",function(){state.sport=btn.dataset.sport;resetLimit();makeChips();render();syncUrl();});
    });
  }
  function makeLevels(){
    els.levels.innerHTML=LEVELS.map(function(l){
      return "<button type='button' class='level-chip' data-level='"+safe(l.id)+"' aria-pressed='"+
        (state.level===l.id?"true":"false")+"'>"+safe(l.name)+"</button>";
    }).join("");
    els.levels.querySelectorAll("button").forEach(function(btn){
      btn.addEventListener("click",function(){state.level=btn.dataset.level;resetLimit();makeLevels();updateFilterHint();makeChips();render();syncUrl();});
    });
  }
  function syncNav(){
    const link=document.getElementById("resultsLink");
    if(link)link.href=globalThis.Nongkum.href("results.html",state);
  }
  function syncUrl(){
    const url=new URL(location.href);
    [["school",state.school],["sport",state.sport],["level",state.level]].forEach(function(pair){
      if(pair[1])url.searchParams.set(pair[0],pair[1]);else url.searchParams.delete(pair[0]);
    });
    url.searchParams.delete("fixture");
    state.focusId="";
    history.replaceState(null,"",url.pathname+url.search+url.hash);
    syncNav();
  }
  function matchesFilters(m,q,ignoreSport){
    if(!ignoreSport&&state.sport&&m.sport_id!==state.sport)return false;
    if(state.level&&classifyLevel(m)!==state.level)return false;
    if(state.school){
      const hasLane=m.kind==="track_event"&&(m.lanes||[]).some(function(l){return l.school_id===state.school&&!l.vacant;});
      if(m.team_a_id!==state.school&&m.team_b_id!==state.school&&!hasLane)return false;
    }
    if(!q)return true;
    const sport=getSport(m.sport_id),a=m.team_a_id?getSchool(m.team_a_id):null,b=m.team_b_id?getSchool(m.team_b_id):null;
    return [sport&&sport.name,m.division,m.name,m.source_match_no,
      m.source_team_a_label,m.source_team_b_label,a&&a.name,a&&a.short,b&&b.name,b&&b.short,
      ...(m.lanes||[]).map(function(l){return l.source_school_label;})]
      .filter(Boolean).join(" ").toLocaleLowerCase("th").includes(q);
  }
  function render(){
    if(!state.data)return;
    const q=state.query.trim().toLocaleLowerCase("th");
    const matched=state.data.fixtures.filter(function(m){return matchesFilters(m,q);});
    const visible=matched.slice(0,state.limit);
    const groups=state.data.sports.map(function(s){
      return {sport:s,total:matched.filter(function(m){return m.sport_id===s.id;}).length,
        fixtures:visible.filter(function(m){return m.sport_id===s.id;})};
    }).filter(function(g){return g.fixtures.length>0;});
    els.cards.innerHTML=groups.map(function(g){
      return "<section class='sport-group' aria-label='"+safe(g.sport.name)+"'><div class='group-heading'><h3>"+
        safe(g.sport.emoji+" "+g.sport.name)+"</h3><span class='group-count'>"+
        g.total+" รายการ · แสดง "+g.fixtures.length+"</span></div><div class='cards'>"+
        g.fixtures.map(card).join("")+"</div></section>";
    }).join("");
    els.count.textContent="พบ "+matched.length+" รายการ · แสดง "+visible.length+" (ข้อมูลร่าง)";
    els.empty.hidden=matched.length!==0;
    els.more.hidden=matched.length<=state.limit;
    const remaining=matched.length-state.limit;
    els.more.textContent=remaining>0?"แสดงเพิ่มอีก "+Math.min(12,remaining)+" รายการ":"";
    if(state.focusId&&typeof els.cards.querySelector==="function"){
      const target=els.cards.querySelector("[data-fixture-card='"+state.focusId.replace(/'/g,"") +"']");
      if(target&&typeof target.scrollIntoView==="function")target.scrollIntoView({block:"center"});
    }
  }
  function setupHandlers(){
    if(initialized)return;
    initialized=true;
    els.school.addEventListener("change",function(){
      state.school=els.school.value;globalThis.Nongkum.saveSchool(state.school);
      resetLimit();makeChips();render();syncUrl();
    });
    els.search.addEventListener("input",function(){
      state.query=els.search.value;resetLimit();updateFilterHint();makeChips();render();
    });
    els.more.addEventListener("click",function(){state.limit+=12;render();});
    els.cards.addEventListener("click",async function(event){
      const btn=event.target.closest("[data-share-fixture]");
      if(!btn||!state.data)return;
      const item=state.data.fixtures.find(x=>x.id===btn.dataset.shareFixture);
      if(!item)return;
      try{
        const result=await globalThis.Nongkum.shareItem("index.html","fixture",item.id,
          "มิตรภาพเกม · "+(item.name||item.division||"คู่แข่งขัน"));
        if(result==="copied")els.refreshStatus.textContent="คัดลอกลิงก์คู่แข่งขันแล้ว";
        if(result==="unavailable")els.refreshStatus.textContent="อุปกรณ์นี้ยังไม่รองรับการแชร์หรือคัดลอกลิงก์";
      }catch(e){els.refreshStatus.textContent="ไม่สามารถแชร์ลิงก์ได้ โปรดลองอีกครั้ง";}
    });
  }
  async function loadProgram(refresh){
    els.refresh.disabled=true;
    els.refreshStatus.textContent=refresh?"กำลังตรวจไฟล์โปรแกรมล่าสุด…":"กำลังอ่านโปรแกรมการแข่งขัน…";
    try{
      const path="./data/draft-schedule.json?refresh="+Date.now();
      const response=await fetch(path,{cache:"no-store"});
      if(!response.ok)throw Error("ไม่สามารถอ่านไฟล์ข้อมูล");
      const data=await response.json();
      if(!data.metadata||data.metadata.status!=="prototype"||
         data.metadata.all_data_approved!==false||!Array.isArray(data.fixtures))
        throw Error("ชุดข้อมูลร่างไม่ถูกต้อง");
      state.data=data;
      if(!initialized){
        data.schools.forEach(function(s){
          const op=document.createElement("option");op.value=s.id;op.textContent=s.name;els.school.appendChild(op);
        });
        const params=new URLSearchParams(location.search);
        const saved=globalThis.Nongkum.schoolInStore();
        const requested=params.get("school")||saved;
        state.school=data.schools.some(x=>x.id===requested)?requested:"";
        state.sport=data.sports.some(x=>x.id===params.get("sport"))?params.get("sport"):"";
        state.level=LEVELS.some(x=>x.id&&x.id===params.get("level"))?params.get("level"):"";
        const linked=data.fixtures.find(x=>x.id===params.get("fixture"));
        if(linked){
          state.focusId=linked.id;state.school="";state.sport=linked.sport_id;state.level="";
          state.query="";state.limit=12;
        }
        els.school.value=state.school;els.advanced.open=!!state.level;
        setupHandlers();
      }
      updateFilterHint();makeChips();makeLevels();render();syncNav();
      els.refreshStatus.textContent=globalThis.Nongkum.formatCheckedAt(new Date())+
        " · ข้อมูลจากไฟล์ที่เผยแพร่บนเว็บ ไม่ได้ดึงจาก Google Sheets โดยตรง";
    }catch(e){
      els.refreshStatus.textContent="รีเฟรชไม่สำเร็จ · ยังคงข้อมูลเดิมถ้ามี";
      if(!state.data){
        els.count.textContent="อ่านข้อมูลไม่ได้";els.empty.hidden=false;
        els.empty.innerHTML="<strong>ไม่สามารถโหลดโปรแกรมฉบับร่างได้</strong><p>กรุณาลองอีกครั้ง</p>";
      }
      console.error(e);
    }finally{els.refresh.disabled=false;}
  }
  els.refresh.addEventListener("click",function(){loadProgram(true);});
  loadProgram(false);
})();
