
(function(){
  "use strict";
  function optionalElement(id){try{return document.getElementById(id);}catch(_){return null;}}
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
    refreshStatus:document.getElementById("programRefreshStatus"),
    direct:document.getElementById("sharedFixture"),
    directCard:document.getElementById("sharedFixtureCard"),
    directStatus:document.getElementById("sharedFixtureStatus"),
    overview:document.getElementById("programOverview"),
    fullSchedule:document.getElementById("showFullSchedule"),
    skeleton:optionalElement("programSkeleton"),
    listing:optionalElement("programListing"),
    failure:optionalElement("programLoadFailure"),
    retry:optionalElement("retryProgram"),
    directFailure:optionalElement("sharedFixtureLoadFailure"),
    directRetry:optionalElement("retrySharedFixture")
  };
  const requestedFixture=new URLSearchParams(location.search).get("fixture");
  const state={data:null,school:"",sport:"",level:"",query:"",limit:12,focusId:"",directMode:!!requestedFixture};
  if(state.directMode&&els.direct&&els.overview){
    els.direct.hidden=false;els.overview.hidden=true;
  }
  let initialized=false;
  const LEVELS=[
    {id:"",name:"ทุกช่วงชั้น"},
    {id:"early",name:"ก่อนเรียน / ปฐมวัย"},
    {id:"primary",name:"ประถม"},
    {id:"secondary",name:"มัธยม"}
  ];
  const safe=globalThis.Nongkum.escapeHtml;
  const SHARE_ICON="<svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'><circle cx='18' cy='5' r='2.2'/><circle cx='6' cy='12' r='2.2'/><circle cx='18' cy='19' r='2.2'/><path d='M8 11l8-5M8 13l8 5'/></svg>";
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
  function pdfDateLabel(m){
    const pdf=m.source_pdf||{},raw=String(pdf.source_date_text||"").trim();
    if(/(?:พ\.ย\.\s*68|2568)/.test(raw))return raw;
    const hit=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(pdf.source_date_iso||""));
    if(hit){const months=["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
      return Number(hit[3])+" "+months[Number(hit[2])]+" "+(Number(hit[1])+543);}
    return raw||"ไม่ระบุวัน";
  }
  const CAL_ICON="<svg class='inline-date-icon' viewBox='0 0 24 24' aria-hidden='true' focusable='false'><rect x='3' y='5' width='18' height='16' rx='2'/><path d='M7 3v4M17 3v4M3 10h18'/></svg>";
  function scheduleTags(m){
    if(m.source_pdf){
      const pdf=m.source_pdf;
      const date=pdfDateLabel(m),time=pdf.source_time||m.time||"",field=pdf.source_field||m.field||"";
      const anomaly=/(?:พ\\.ย\\.\\s*68|2568)/.test(String(pdf.source_date_text||""));
      const verifiedDate=m.planning_date_confirmation==="confirmed"&&!!m.planning_date;
      const verifiedField=m.planning_venue_confirmation==="confirmed"&&!!m.planning_venue;
      const dateText=anomaly?"วันรอยืนยัน":date;
      const dateBadge="<span class='fixture-meta-item fixture-meta-date "+(anomaly?"unconfirmed":verifiedDate?"verified":"")+"'>"+
        CAL_ICON+"<span><small>วันที่แข่งขัน</small><strong>"+safe(dateText)+"</strong></span></span>";
      const timeBadge="<span class='fixture-meta-item fixture-meta-time'><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9'/><path d='M12 7v5l3.5 2'/></svg><span><small>เวลาแข่งขัน</small><strong>"+(time?safe(time)+" น.":"รอกำหนด")+"</strong></span></span>";
      const venue=verifiedField?m.planning_venue:field;
      const venueBadge="<span class='fixture-meta-item fixture-meta-venue "+(verifiedField?"verified":"")+"'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 21s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12Z'/><circle cx='12' cy='9' r='2.5'/></svg><span><small>สนามแข่งขัน</small><strong>"+safe(venue||"รอกำหนด")+"</strong></span></span>";
      const flags=[];
      if((m.qa_flags||[]).length)flags.push("<span class='tag unconfirmed'>⚠ ควรตรวจเพิ่ม "+m.qa_flags.length+" จุด</span>");
      if(anomaly)flags.push("<span class='tag unconfirmed'>⚠ ปีในสูจิบัตรไม่ตรง ต้องยืนยันวัน</span>");
      return "<div class='fixture-meta-grid'>"+dateBadge+timeBadge+venueBadge+"</div>"+
        (flags.length?"<div class='fixture-meta-warnings'>"+flags.join("")+"</div>":"");
    }
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
    const shareName=track?"แชร์รายการกรีฑา":"แชร์คู่แข่งขัน";
    const heading="<div class='fixture-head'><div class='sport-label'><span class='sport-cue' role='img' aria-label='กีฬา "+
      safe(sport?sport.name:m.sport_id)+"'>"+safe(sport?sport.emoji:"🏅")+"</span><span class='division'>"+
      safe(m.division||"")+"</span></div><div class='fixture-actions'><span class='pairnum'>"+
      (track?"รายการ ":"คู่ที่ ")+safe(m.source_match_no)+"</span>"+
      "<button type='button' class='share-icon' data-share-fixture='"+safe(m.id)+
      "' aria-label='"+safe(shareName+" "+(sport?sport.name:"")+" "+(m.division||"")+
        " หมายเลข "+m.source_match_no)+"' title='"+shareName+"'>"+SHARE_ICON+"</button></div></div>";
    const content=track?trackContent(m):matchContent(m);
    const original=!track&&m.source_pair_text
      ? "<div class='source'>คู่แข่งขันในต้นฉบับ: "+safe(m.source_pair_text)+"</div>":"";
    const flags=m.qa_flags&&m.qa_flags.length
      ? "<p class='qa-note'>⚠ จุดที่ควรตรวจจาก PDF: "+safe(m.qa_flags.join(", "))+"</p>":"";
    const detail="<details class='source-details'><summary>รายละเอียด · ข้อมูลร่าง</summary>"+
      "<div class='details'><span class='tag'>"+safe(m.round||"รายการแข่งขัน")+"</span></div>"+
      original+flags+(m.planning_date?"<p class='qa-note'>"+safe(m.planning_source||"วันที่แข่งนอกรอบรอกรรมการตรวจรับ")+"</p>":"")+
      "<div class='source'><a class='scorecard-link' href='./forms/score-sheet.html?fixture="+
      encodeURIComponent(m.id)+"'>พิมพ์ใบบันทึกผล A4 สำหรับกรรมการ</a></div>"+
      "<div class='source'>อ้างอิง PDF หน้า "+safe(m.source_pdf?.page||m.source_page)+
      " · ยังไม่ผ่านการรับรอง</div></details>";
    const page=Number(m.source_pdf?.page||m.source_page);
    const sourceButton=Number.isInteger(page)&&page>=1&&page<=41
      ? "<a class='fixture-pdf-link' href='./pdf-viewer.html?page="+page+
        "&amp;from=program&amp;fixture="+encodeURIComponent(m.id)+
        "' aria-label='เปิดสูจิบัตร PDF หน้า "+page+" ของคู่แข่งขันนี้'>"+
        "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3h8l5 5v13H6z'/><path d='M14 3v6h5M9 13h7M9 17h7'/></svg>"+
        "ดูสูจิบัตร หน้า "+page+"</a>" : "";
    return "<article class='fixture"+(m.id===state.focusId?" shared-target":"")+
      "' data-fixture-card='"+safe(m.id)+"'>"+heading+content+
      "<div class='details quick-status'>"+scheduleTags(m)+"</div>"+
      "<div class='fixture-source-actions'>"+sourceButton+"</div>"+detail+"</article>";
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
    globalThis.NongkumNavigation?.update?.(state);
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
    function renderDirect(){
    if(!state.data||!els.directCard)return;
    const item=state.data.fixtures.find(x=>x.id===state.focusId);
    if(!item){
      els.directCard.innerHTML="<div class='direct-error'><strong>ไม่พบคู่แข่งขันที่แชร์มา</strong>"+
        "<p>ลิงก์นี้อาจมีรหัสผิดหรือไม่อยู่ในสูจิบัตรฉบับที่เผยแพร่ โปรดเปิดตารางทั้งหมดเพื่อค้นหา</p></div>";
      els.directStatus.textContent="ไม่พบรหัสรายการในข้อมูลเผยแพร่";
      return;
    }
    const sport=getSport(item.sport_id);
    els.directCard.innerHTML=card(item);
    els.directStatus.textContent=(sport?sport.name:"กีฬา")+" · "+(item.division||"")+
      " · "+(item.kind==="track_event"?"รายการ ":"คู่ที่ ")+item.source_match_no;
    const details=els.directCard.querySelector("details.source-details");
    if(details)details.open=true;
  }

  function render(){
    if(!state.data)return;
    if(state.directMode){renderDirect();return;}
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
    async function shareLatestCandidate(item){
      const sport=getSport(item.sport_id);
      const payload=globalThis.NongkumReviewShare?.payload(item,(sport?.emoji||"")+" "+(sport?.name||item.sport_id));
      if(!payload)return "unavailable";
      if(typeof navigator!=="undefined"&&typeof navigator.share==="function"){
        try{await navigator.share({title:payload.title,text:payload.text,url:payload.url});return "shared";}
        catch(e){if(e?.name==="AbortError")return "cancelled";}
      }
      if(typeof navigator!=="undefined"&&navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(payload.fullText);return "copied";
      }
      return "unavailable";
    }
    function showShareFeedback(result){
      if(result==="cancelled")return;
      const info=result==="copied"?["คัดลอกข้อความพร้อมลิงก์แล้ว","นำไปวางใน LINE เพื่อส่งต่อได้ทันที"]:
        result==="shared"?["แชร์รายการผ่านแอปแล้ว","ข้อมูลที่แชร์ยังเป็นฉบับร่างจากสูจิบัตร"]:
        ["แชร์ไม่สำเร็จ","ลองอีกครั้งหรือคัดลอกลิงก์ด้วยเบราว์เซอร์"];
      if(!globalThis.NongkumToast?.show(info[0],info[1],result==="unavailable"))
        els.refreshStatus.textContent=info[0];
    }
    async function handleShare(event){
      const btn=event.target.closest("[data-share-fixture]");
      if(!btn||!state.data)return;
      const item=state.data.fixtures.find(x=>x.id===btn.dataset.shareFixture);
      if(!item)return;
      try{
        const sport=getSport(item.sport_id);
        const a=item.team_a_id?getSchool(item.team_a_id):null;
        const b=item.team_b_id?getSchool(item.team_b_id):null;
        const result=item.source_pdf
          ? await shareLatestCandidate(item)
          : await globalThis.Nongkum.shareFixture(item,
            sport?sport.name:item.sport_id,
            a?a.short:(item.source_team_a_label||""),
            b?b.short:(item.source_team_b_label||""));
        showShareFeedback(result);
      }catch(e){showShareFeedback("unavailable");}
    }
    els.cards.addEventListener("click",handleShare);
    if(els.direct)els.direct.addEventListener("click",handleShare);
    if(els.fullSchedule)els.fullSchedule.addEventListener("click",function(){
      state.directMode=false;state.focusId="";state.school="";state.sport="";state.level="";
      if(els.direct)els.direct.hidden=true;
      if(els.overview)els.overview.hidden=false;
      els.school.value="";els.search.value="";
      resetLimit();makeChips();makeLevels();render();syncUrl();
      if(typeof window!=="undefined"&&typeof window.scrollTo==="function")window.scrollTo({top:0,behavior:"auto"});
    });
  }
  function setInitialLoading(active){
    if(els.skeleton)els.skeleton.hidden=!active;
    if(els.listing&&typeof els.listing.setAttribute==="function")els.listing.setAttribute("aria-busy",String(active));
  }
  function setFailure(active){
    if(els.failure)els.failure.hidden=!active;
    if(els.directFailure)els.directFailure.hidden=!active;
  }
  async function loadProgram(refresh){
    const initial=!state.data;
    if(initial){setInitialLoading(!state.directMode);setFailure(false);}
    els.refresh.disabled=true;
    els.refreshStatus.textContent=refresh&&state.data?"กำลังตรวจไฟล์โปรแกรมล่าสุด…":"กำลังอ่านโปรแกรมการแข่งขัน…";
    try{
      const path="./data/program-from-pdf-2569-20261104-draft.json?refresh="+Date.now();
      const response=await fetch(path,{cache:"no-store"});
      if(!response.ok)throw Error("ไม่สามารถอ่านไฟล์ข้อมูล");
      const data=await response.json();
      const candidate=data.metadata?.source_status==="revised_pdf_draft"&&
        data.schema_version===3&&data.fixtures?.length===237&&
        data.metadata.website_publication_status==="not_released";
      const legacy=data.metadata?.status==="prototype";
      if(!data.metadata||data.metadata.all_data_approved!==false||
        !Array.isArray(data.fixtures)||(!candidate&&!legacy))
        throw Error("ชุดข้อมูลสูจิบัตรร่างไม่ผ่านการตรวจสอบ");
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
        const linked=requestedFixture?data.fixtures.find(x=>x.id===requestedFixture):null;
        if(requestedFixture){
          state.focusId=linked?linked.id:requestedFixture;
          state.school="";state.sport=linked?linked.sport_id:"";state.level="";
          state.query="";state.limit=12;
        }
        els.school.value=state.school;els.advanced.open=!!state.level;
        setupHandlers();
      }
      updateFilterHint();makeChips();makeLevels();render();syncNav();
      setFailure(false);
      els.refreshStatus.textContent=globalThis.Nongkum.formatCheckedAt(new Date())+
        (candidate?" · สูจิบัตรล่าสุด 237 รายการ (ข้อมูลร่าง)":" · ข้อมูลร่างชุดเดิม")+
        " · ไฟล์เผยแพร่บนเว็บ";
    }catch(e){
      els.refreshStatus.textContent=state.data?"รีเฟรชไม่สำเร็จ · ยังคงข้อมูลล่าสุดที่โหลดไว้":"โหลดโปรแกรมไม่สำเร็จ · ลองใหม่อีกครั้ง";
      if(!state.data){
        if(state.directMode&&els.directStatus)els.directStatus.textContent="ยังเปิดคู่แข่งขันไม่ได้ โปรดลองอีกครั้ง";
        els.count.textContent="อ่านข้อมูลไม่ได้";
        els.empty.hidden=true;
        setFailure(true);
      }
      console.error(e);
    }finally{setInitialLoading(false);els.refresh.disabled=false;}
  }
  els.refresh.addEventListener("click",function(){loadProgram(true);});
  if(els.retry)els.retry.addEventListener("click",function(){loadProgram(false);});
  if(els.directRetry)els.directRetry.addEventListener("click",function(){loadProgram(false);});
  loadProgram(false);
  // Recheck the published draft program every five minutes while the page is visible.
  if(typeof setInterval==="function"){
    setInterval(function(){
      if(document.visibilityState==="visible"&&!els.refresh.disabled)loadProgram(true);
    },300000);
  }
})();
