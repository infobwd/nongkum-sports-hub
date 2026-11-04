/* R11D read-only 237-item PDF preview. Changes are sent in ChatGPT by the organizer, not written here. */
(function(){
  "use strict";
  const M=globalThis.NongkumReviewModel;
  const NK=globalThis.Nongkum;
  const PAGE_SIZE=24;
  const $=id=>document.getElementById(id);
  const ui={
    school:$("reviewSchool"),sport:$("reviewSport"),level:$("reviewLevel"),search:$("reviewSearch"),
    qaOnly:$("reviewQaOnly"),clear:$("clearFilters"),refresh:$("reviewRefresh"),
    count:$("reviewCount"),status:$("reviewStatus"),skeleton:$("reviewSkeleton"),
    failure:$("reviewLoadFailure"),retry:$("retryReview"),listing:$("reviewListing"),
    cards:$("reviewCards"),empty:$("reviewEmpty"),more:$("reviewMore"),
    direct:$("reviewDirect"),directCard:$("reviewDirectCard"),
    directError:$("reviewDirectError"),
    copyFallback:$("copyFallback"),copyFallbackText:$("copyFallbackText"),
    revision:$("revisionLabel"),statMatches:$("statMatches"),
    statTrack:$("statTrack"),statLanes:$("statLanes"),statQa:$("statQa")
  };
  let data=null,byId=new Map(),sportNames=new Map(),qaNotes=new Map();
  let changes=new Map(),filtered=[],shown=PAGE_SIZE;
  let loading=false,requestSerial=0;

  function make(tag,cls,text){
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined&&text!==null)el.textContent=String(text);
    return el;
  }
  function add(parent,tag,cls,text){
    const node=make(tag,cls,text);
    parent.appendChild(node);
    return node;
  }
  function addSource(parent,label,value){
    const div=add(parent,"div","review-source-box");
    add(div,"span","",label);
    add(div,"strong","",value==null||String(value).trim()===""?"ไม่ระบุ":value);
  }
  function getSport(f){return sportNames.get(f.sport_id)||f.sport_id;}
  function formatTeam(f,side){
    const label=side==="A"?f.source_team_a_label:f.source_team_b_label;
    return label||"รอผู้ชนะ / ดูข้อความตาม PDF";
  }
  function addLanes(card,f){
    const heading=add(card,"div","review-pdf-label","ลู่ตาม PDF · "+(f.lanes?.length||0)+" แถว");
    heading.setAttribute("data-review-lanes","true");
    const list=add(card,"ul","review-lane-list");
    for(const lane of f.lanes||[]){
      const li=add(list,"li");
      add(li,"b","","ลู่ "+lane.lane);
      add(li,"span","",lane.source_school_label|| (lane.vacant?"ว่าง":"ไม่ระบุโรงเรียน"));
    }
  }
  function addQa(card,f){
    if(!M.hasQa(f))return;
    const box=add(card,"div","review-qa-box");
    add(box,"strong","","มีจุดต้องตรวจเพิ่มเติม ("+f.qa_flags.length+" ธง)");
    const details=add(box,"details");
    add(details,"summary","","ดูประเด็นจาก PDF / QA");
    for(const flag of f.qa_flags){
      const p=add(details,"p");
      add(p,"span","review-qa-code",flag+" · ");
      add(p,"span","",qaNotes.get(flag)||"ธงตรวจรับจากระบบเดิม — ให้ผู้จัดตรวจต้นฉบับ");
    }
  }
  const DIFF_LABELS={
    time:"เวลา",field:"สนาม",source_match_no:"เลขคู่",source_page:"หน้า PDF",
    source_pair_text:"ข้อความคู่แข่งขัน",division:"รุ่น/ประเภท",
    team_a_id:"ทีม ก",team_b_id:"ทีม ข",round:"รอบแข่งขัน",
    source_team_a_label:"ชื่อทีม ก",source_team_b_label:"ชื่อทีม ข",
    date:"วันที่"
  };
  function addDiff(card,f){
    const item=changes.get(f.id);
    if(!item||!item.changes)return;
    const entries=Object.entries(item.changes).filter(([k])=>DIFF_LABELS[k]);
    if(!entries.length)return;
    const details=add(card,"details","review-compare");
    add(details,"summary","","เทียบกับเว็บเดิม · "+entries.length+" จุดเปลี่ยน");
    const ul=add(details,"ul");
    for(const [key,change] of entries){
      add(ul,"li","",DIFF_LABELS[key]+": เดิม "+String(change.active??"ไม่ระบุ")+
        " → PDF ล่าสุด "+String(change.candidate??"ไม่ระบุ"));
    }
  }
  function makeCard(f){
    const article=make("article","review-item"+(M.hasQa(f)?" is-qa":""));
    article.setAttribute("data-fixture-id",f.id);
    const head=add(article,"div","review-item-head");
    const left=add(head,"div");
    add(left,"div","review-sport",getSport(f));
    add(left,"div","review-division",f.division||"ไม่ระบุรุ่น");
    add(head,"span","review-number",(f.kind==="track_event"?"รายการ ":"คู่ ")+(f.source_match_no||"—"));
    if(f.kind==="track_event"){
      add(article,"h3","review-item-title",f.name||f.source_title||"รายการกรีฑา");
      addLanes(article,f);
    }else{
      const line=add(article,"div","review-match");
      add(line,"div","review-match-team",formatTeam(f,"A"));
      add(line,"span","review-match-vs","พบ");
      add(line,"div","review-match-team",formatTeam(f,"B"));
      if(f.source_pair_text){
        add(article,"p","review-division","ข้อความคู่ตาม PDF: "+f.source_pair_text);
      }
    }
    const source=add(article,"div","review-source-grid");
    addSource(source,"วันตาม PDF",M.sourceDate(f));
    addSource(source,"เวลาตาม PDF",M.sourceTime(f));
    addSource(source,"สนามตาม PDF",M.sourceField(f));
    addSource(source,"รอบ",f.round||"ไม่ระบุ");
    add(article,"p","review-pdf-label","ข้อมูลตาม PDF ยังไม่ได้รับรองวัน เวลา และสนามรายคู่");
    if(M.hasConfirmedPlanning(f)){
      const notice=add(article,"div","review-confirmed");
      add(notice,"strong","","ยืนยันเฉพาะวันและสถานที่นอกรอบ");
      add(notice,"span","",M.thaiDate(f.planning_date)+" · "+f.planning_venue);
      add(notice,"small","","เวลาเริ่มและสนามรายคู่ที่พิมพ์ใน PDF ยังรอการยืนยันแยกต่างหาก");
    }
    addQa(article,f);
    addDiff(article,f);
    add(article,"p","review-source-note","PDF หน้า "+(f.source_page||"?")+" · Fixture ID: "+f.id);
    const actions=add(article,"div","review-action-bar");
    const copy=add(actions,"button","review-action primary","คัดลอกข้อมูลแจ้งแก้ไข");
    copy.type="button";
    copy.setAttribute("aria-label","คัดลอกข้อความแจ้งแก้ไข "+getSport(f)+" "+(f.division||""));
    copy.addEventListener("click",()=>copyText(M.formatIssue(f,getSport(f)),"คัดลอกข้อความแจ้งแก้ไขแล้ว"));
    const link=add(actions,"button","review-action","คัดลอกลิงก์รายการ");
    link.type="button";
    link.addEventListener("click",()=>{
      const url=new URL("./review.html",location.href);
      url.searchParams.set("fixture",f.id);
      copyText(url.toString(),"คัดลอกลิงก์รายการแล้ว");
    });
    return article;
  }
  async function copyText(text,success){
    ui.copyFallback.hidden=true;
    try{
      if(!navigator.clipboard||typeof navigator.clipboard.writeText!=="function")throw Error("no clipboard");
      await navigator.clipboard.writeText(text);
      ui.status.textContent=success+" · นำไปส่งในแชทและระบุข้อมูลที่ถูกต้องได้เลย";
    }catch(_){
      ui.copyFallback.hidden=false;
      ui.copyFallbackText.value=text;
      ui.copyFallbackText.focus();
      ui.copyFallbackText.select();
      ui.status.textContent="เครื่องนี้ไม่รองรับการคัดลอกอัตโนมัติ เลือกและคัดลอกข้อความในกล่องด้านล่าง";
      ui.copyFallback.scrollIntoView({block:"nearest",behavior:"auto"});
    }
  }
  function filters(){
    return {school:ui.school.value,sport:ui.sport.value,level:ui.level.value,
      search:ui.search.value.trim(),qaOnly:ui.qaOnly.checked};
  }
  function syncUrl(clearFixture){
    const url=new URL(location.href);
    const f=filters();
    for(const [key,value] of Object.entries(f)){
      const queryKey=key==="search"?"q":key==="qaOnly"?"qa":key;
      if(value)url.searchParams.set(queryKey,value===true?"1":value);
      else url.searchParams.delete(queryKey);
    }
    if(clearFixture)url.searchParams.delete("fixture");
    history.replaceState(null,"",url.pathname+url.search+url.hash);
    renderDirect();
  }
  function populateOptions(){
    const schoolValue=ui.school.value,sportValue=ui.sport.value;
    for(const item of data.schools){
      const option=make("option","",item.short||item.name);
      option.value=item.id;
      ui.school.appendChild(option);
    }
    for(const item of data.sports){
      const option=make("option","",(item.emoji?item.emoji+" ":"")+item.name);
      option.value=item.id;
      ui.sport.appendChild(option);
    }
    ui.school.value=schoolValue;
    ui.sport.value=sportValue;
  }
  function renderDirect(){
    if(!data)return;
    const directId=new URLSearchParams(location.search).get("fixture");
    ui.direct.hidden=!directId;
    ui.directCard.replaceChildren();
    ui.directError.hidden=true;
    if(!directId)return;
    const item=byId.get(directId);
    if(item)ui.directCard.appendChild(makeCard(item));
    else ui.directError.hidden=false;
  }
  function render(){
    if(!data)return;
    filtered=M.filterItems(data.fixtures,filters(),NK.classifyLevel);
    const visible=filtered.slice(0,shown);
    const fragment=document.createDocumentFragment();
    for(const item of visible)fragment.appendChild(makeCard(item));
    ui.cards.replaceChildren(fragment);
    ui.count.textContent="แสดง "+visible.length+" จาก "+filtered.length+" รายการ";
    ui.empty.hidden=filtered.length!==0;
    ui.more.hidden=shown>=filtered.length;
    ui.more.textContent="แสดงเพิ่มอีก "+Math.min(PAGE_SIZE,Math.max(0,filtered.length-shown))+" รายการ";
    renderDirect();
  }
  function applyFilter(){
    shown=PAGE_SIZE;
    syncUrl(true);
    render();
  }
  function restoreFilters(){
    const qs=new URLSearchParams(location.search);
    ui.school.value=qs.get("school")||"";
    ui.sport.value=qs.get("sport")||"";
    ui.level.value=qs.get("level")||"";
    ui.search.value=qs.get("q")||"";
    ui.qaOnly.checked=qs.get("qa")==="1";
  }
  function updateSummary(){
    ui.statMatches.textContent=data.fixtures.filter(x=>x.kind==="match").length;
    ui.statTrack.textContent=data.fixtures.filter(x=>x.kind==="track_event").length;
    ui.statLanes.textContent=data.fixtures.filter(x=>x.kind==="track_event")
      .reduce((sum,x)=>sum+(x.lanes?.length||0),0);
    ui.statQa.textContent=data.fixtures.filter(M.hasQa).length;
    ui.revision.textContent="Revision: "+M.REVISION+" · 4 พ.ย. 2569 · ข้อมูลร่าง";
  }
  async function fetchJson(path,optional){
    const response=await fetch(path+"?v="+Date.now(),{cache:"no-store"});
    if(!response.ok)throw Error("HTTP "+response.status);
    return response.json();
  }
  async function load(){
    if(loading)return;
    loading=true;
    const serial=++requestSerial;
    const first=!data;
    ui.refresh.disabled=true;
    ui.listing.setAttribute("aria-busy","true");
    ui.failure.hidden=true;
    if(first)ui.skeleton.hidden=false;
    else ui.status.textContent="กำลังตรวจไฟล์ PDF ล่าสุด โดยคงรายการเดิมบนหน้าจอ…";
    try{
      const candidate=M.validate(await fetchJson(M.SOURCE_PATH));
      if(serial!==requestSerial)return;
      let diff=null;
      try{
        diff=await fetchJson(M.DIFF_PATH);
        if(diff?.references?.canonical_candidate_revision!==M.REVISION ||
           diff?.summary?.candidate_total!==candidate.fixtures.length)diff=null;
      }catch(_){ /* optional comparison; preview remains usable */ }
      if(serial!==requestSerial)return;
      data=candidate;
      byId=new Map(data.fixtures.map(x=>[x.id,x]));
      sportNames=new Map(data.sports.map(x=>[x.id,(x.emoji?x.emoji+" ":"")+x.name]));
      qaNotes=new Map((data.source_qa||[]).map(x=>[x.code,x.description]));
      changes=new Map((diff?.changes||[]).map(x=>[x.id,x]));
      if(first){
        populateOptions();
        restoreFilters();
      }
      ui.skeleton.hidden=true;
      ui.failure.hidden=true;
      ui.listing.setAttribute("aria-busy","false");
      updateSummary();
      shown=PAGE_SIZE;
      render();
      ui.status.textContent=NK.formatCheckedAt(new Date())+
        " · ข้อมูลร่างจาก PDF (ไม่ใช่ Google Sheets สด)"+
        (!diff?" · ข้อมูลเปรียบเทียบเว็บเดิมยังโหลดไม่ได้":"");
    }catch(err){
      ui.skeleton.hidden=true;
      ui.listing.setAttribute("aria-busy","false");
      if(first){
        ui.failure.hidden=false;
        ui.count.textContent="ยังโหลดรายการไม่ได้";
        ui.status.textContent="เชื่อมต่อข้อมูลร่างไม่สำเร็จ · ลองอีกครั้ง";
      }else{
        ui.status.textContent="รีเฟรชไม่สำเร็จ · ยังแสดงข้อมูลฉบับก่อนหน้าที่โหลดได้";
      }
      if(globalThis.console&&console.error)console.error("R11D read-only fetch failed",err);
    }finally{
      loading=false;
      ui.refresh.disabled=false;
    }
  }
  for(const element of [ui.school,ui.sport,ui.level,ui.qaOnly]){
    element.addEventListener("change",applyFilter);
  }
  ui.search.addEventListener("input",applyFilter);
  ui.more.addEventListener("click",()=>{shown+=PAGE_SIZE;render();});
  ui.clear.addEventListener("click",()=>{
    ui.school.value="";ui.sport.value="";ui.level.value="";ui.search.value="";
    ui.qaOnly.checked=false;applyFilter();
  });
  ui.refresh.addEventListener("click",load);
  ui.retry.addEventListener("click",load);
  load();
})();