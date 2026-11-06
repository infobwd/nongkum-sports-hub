/* R19-C: public, read-only committee preparation report.
   Historical 2568 role template is not a 2569 appointment. Never render personnel from unapproved data. */
(function(root){
  "use strict";
  const DATA_URL="./data/committee-roles-2569-planning.json";
  const MODES=["sports","groups","schools","review"];
  function valid(data){
    if(!data||data.schema_version!==1||!Array.isArray(data.sports)||!Array.isArray(data.divisions)||
      !Array.isArray(data.legacy_committee_groups)||!Array.isArray(data.school_crosswalk)||
      !Array.isArray(data.proposed_role_catalog)||!Array.isArray(data.review_flags))return false;
    if(data.sports.length!==9||data.divisions.length!==33||data.legacy_committee_groups.length!==20||data.school_crosswalk.length!==8)return false;
    if(new Set(data.sports.map(s=>s.sport_id)).size!==9||
       new Set(data.divisions.map(d=>d.catalog_no)).size!==33||
       new Set(data.school_crosswalk.map(s=>s.sillapa_school_id)).size!==8)return false;
    const schoolIds=new Set(data.school_crosswalk.map(s=>s.sports_school_id));
    const sportsIds=new Set(data.sports.map(s=>s.sport_id));
    if(!schoolIds.has("nongkrathum")||data.divisions.some(d=>!sportsIds.has(d.sport_id)))return false;
    // This report intentionally remains planning-only. New appointment data needs R19-D.
    return data.sports.every(s=>s.appointment_status_2569==="not_verified" &&
      Array.isArray(s.assignments_2569) && s.assignments_2569.length===0 &&
      s.legacy_venue_is_current===false &&
      s.current_2569_venue?.school_id==="nongkrathum" &&
      s.current_2569_venue?.confirmation_state==="confirmed_main_school_venue");
  }
  function approvedCount(data){
    // No implicit approval from historical names, a school check, or one approval flag.
    return data.sports.reduce((n,s)=>n+(s.assignments_2569||[]).filter(a=>
      a?.assignment_state==="committee_approved" &&
      a?.publication_state==="published" &&
      a?.public_release_approved===true).length,0);
  }
  function norm(v){return String(v??"").trim().toLocaleLowerCase("th");}
  function sportDivisions(data,sport){
    return data.divisions.filter(d=>d.sport_id===sport.sport_id);
  }
  function filteredSports(data,filters){
    const sportId=filters.sport||"",division=filters.division||"",term=norm(filters.query);
    return data.sports.reduce((out,s)=>{
      if(sportId&&s.sport_id!==sportId)return out;
      const divisions=sportDivisions(data,s);
      if(division&&!divisions.some(d=>String(d.catalog_no)===String(division)))return out;
      const labels=(s.proposed_role_keys||[]).map(k=>data.proposed_role_catalog.find(r=>r.role===k)?.label||"").join(" ");
      const broad=norm([s.sport_name,s.sport_id,labels].join(" ")).includes(term);
      const showing=divisions.filter(d=>(!division||String(d.catalog_no)===String(division))&&
        (!term||broad||norm(d.label).includes(term)));
      if(term&&!broad&&!showing.length)return out;
      out.push({sport:s,divisions:showing});
      return out;
    },[]);
  }
  function safeVenue(data){
    const venue=data.metadata?.primary_venue_2569;
    if(!venue||venue.school_id!=="nongkrathum"||venue.confirmation_state!=="confirmed_for_all_sports")
      return {name:"รอตรวจสนามหลัก",scope:"ยังไม่มีหลักฐานยืนยัน"};
    return {name:venue.name,scope:venue.confirmation_scope};
  }
  root.NongkumCommitteeReport=Object.freeze({valid,approvedCount,filteredSports,safeVenue});
  if(typeof document==="undefined"||!document.getElementById("committeeMain"))return;
  const el=id=>document.getElementById(id);
  const ui={
    loading:el("committeeLoading"),failure:el("committeeLoadFailure"),retry:el("committeeRetry"),
    refresh:el("committeeRefresh"),report:el("committeeReport"),
    metrics:el("committeeMetrics"),revision:el("committeeRevision"),approval:el("committeeApprovalHint"),
    venueName:el("committeeVenueName"),venueScope:el("committeeVenueScope"),
    draftPanel:el("committeeDraftSummary"),draftMetrics:el("committeeDraftMetrics"),draftFootnote:el("committeeDraftFootnote"),
    views:el("committeeViews"),sport:el("committeeSport"),division:el("committeeDivision"),
    search:el("committeeSearch"),cards:el("committeeCards"),count:el("committeeCount")
  };
  let state={data:null,mode:"sports",loading:false};
  const params=new URLSearchParams(root.location?.search||"");
  function make(tag,klass,txt){
    const n=document.createElement(tag);
    if(klass)n.className=klass;
    if(txt!==undefined&&txt!==null)n.textContent=String(txt);
    return n;
  }
  function line(container,klass,txt){const p=make("p",klass,txt);container.appendChild(p);return p;}
  function detail(container,txt){line(container,"committee-card-meta",txt);}
  function stateNote(container,txt){line(container,"committee-card-state",txt);}
  function empty(title,subtitle){
    const box=make("div","committee-empty");
    box.appendChild(make("h3","",title));
    line(box,"",subtitle);
    ui.cards.appendChild(box);
  }
  function card(title,kicker){
    const article=make("article","committee-card");
    article.appendChild(make("p","committee-card-kicker",kicker));
    article.appendChild(make("h3","",title));
    return article;
  }
  function updateDivisionChoices(){
    ui.division.textContent="";
    const first=make("option","","ทุกรุ่นแข่งขัน");
    first.value="";
    ui.division.appendChild(first);
    if(!state.data||!ui.sport.value){
      ui.division.disabled=true;
      return;
    }
    const sport=state.data.sports.find(s=>s.sport_id===ui.sport.value);
    if(!sport){ui.division.disabled=true;return;}
    for(const d of sportDivisions(state.data,sport)){
      const o=make("option","",d.label);
      o.value=String(d.catalog_no);
      ui.division.appendChild(o);
    }
    ui.division.disabled=false;
  }
  function buildSelectors(){
    ui.sport.textContent="";
    const all=make("option","","ทุกชนิดกีฬา");all.value="";
    ui.sport.appendChild(all);
    for(const s of state.data.sports){
      const o=make("option","",s.sport_name);
      o.value=s.sport_id;
      ui.sport.appendChild(o);
    }
    const sportParam=params.get("sport");
    if(state.data.sports.some(s=>s.sport_id===sportParam))ui.sport.value=sportParam;
    updateDivisionChoices();
  }
  function renderDraftSummary(){
    const draft=state.data?.draft_source_review;
    if(!draft || draft.publication_scope!=="aggregate_only_no_names"){ui.draftPanel.hidden=true;return;}
    ui.draftMetrics.replaceChildren();
    for(const [number,label] of [
      [draft.person_role_rows_observed,"บรรทัดมอบหมายในร่าง"],
      [draft.normalized_distinct_name_strings_observed,"ชื่อที่ต่างกันเบื้องต้น"],
      [draft.name_strings_with_multiple_role_rows,"ชื่อที่มีหลายหน้าที่"],
      [draft.rows_needing_text_review,"บรรทัดต้องตรวจข้อความ"]
    ]){
      const box=make("div","committee-metric");
      box.appendChild(make("strong","",number));
      box.appendChild(make("span","",label));
      ui.draftMetrics.appendChild(box);
    }
    ui.draftFootnote.textContent="ถอดจาก PDF ร่างปี "+draft.year_be+" หน้า "+draft.source_pdf_pages+
      " · ไม่ใช่คำสั่งที่รับรองและไม่ได้เผยแพร่รายชื่อบุคคลในเว็บนี้";
    ui.draftPanel.hidden=false;
  }
  function metrics(){
    ui.metrics.replaceChildren();
    const d=state.data;
    for(const [value,label] of [
      [d.sports.length,"ชนิดกีฬา"],
      [d.divisions.length,"รุ่นแข่งขัน"],
      [d.legacy_committee_groups.length,"ฝ่ายตามแม่แบบเก่า"],
      [approvedCount(d),"ข้อมูลมอบหมายที่รับรอง"]
    ]){
      const box=make("div","committee-metric");
      box.appendChild(make("strong","",value));
      box.appendChild(make("span","",label));
      ui.metrics.appendChild(box);
    }
    const released=approvedCount(d);
    ui.approval.textContent=released===0
      ?"ยังไม่มีข้อมูลรายชื่อกรรมการปี 2569 ที่ผ่านการรับรองและอนุญาตเผยแพร่ในชุดข้อมูลนี้ (ไม่ใช่ข้อสรุปว่าไม่มีกรรมการ)"
      :"แสดงเฉพาะจำนวนข้อมูลที่มีสถานะรับรองและอนุญาตเผยแพร่; ชื่อบุคคลยังไม่แสดงบนหน้านี้";
    ui.revision.textContent="ข้อมูลสำหรับวางแผน · "+(d.report_metadata?.report_revision||"R19")+" · แม่แบบกรรมการปี 2568";
  }
  function renderSports(){
    const items=filteredSports(state.data,{sport:ui.sport.value,division:ui.division.value,query:ui.search.value});
    for(const {sport:s,divisions} of items){
      const a=card(s.sport_name,s.sport_id==="athletics"?"กรีฑา · รายการแยกจากรุ่นกีฬา":"ชนิดกีฬา · "+divisions.length+" รุ่นที่แสดง");
      if(s.sport_id==="athletics"){
        detail(a,"กรีฑา "+(s.candidate_event_count||state.data.report_metadata?.total_athletics_events_in_candidate||0)+" รายการในชุดแข่งขันที่กำลังตรวจ");
      }else if(divisions.length){
        const list=make("ul","committee-division-list");
        divisions.forEach(d=>list.appendChild(make("li","","รายการ "+d.catalog_no+" · "+d.label)));
        a.appendChild(list);
      }
      const found=s.draft_2569_named_role_rows_observed;
      if(Number.isInteger(found))
        detail(a,found>0?"พบ "+found+" บรรทัดชื่อกรรมการในสูจิบัตรร่างปี 2569 (รอรับรอง)":
          "ยังไม่พบหมวดรายชื่อกรรมการเฉพาะชนิดนี้ในร่างคำสั่ง");
      a.appendChild(make("h4","","บทบาทที่เสนอสำหรับวางแผน"));
      const roles=make("div","committee-roles");
      for(const k of s.proposed_role_keys||[]){
        const label=state.data.proposed_role_catalog.find(r=>r.role===k)?.label;
        if(label)roles.appendChild(make("span","committee-role",label));
      }
      a.appendChild(roles);
      stateNote(a,"ข้อมูลกรรมการปี 2569: รอการแต่งตั้งและรับรอง");
      detail(a,"สนามหลัก: โรงเรียนบ้านหนองกระทุ่ม (ยืนยันเฉพาะโรงเรียน)");
      if(s.legacy_2568_section)detail(a,"แม่แบบหน้าที่: ข้อ "+s.legacy_2568_section+" จากคำสั่งปี 2568");
      else detail(a,"ไม่มีฝ่ายเฉพาะในคำสั่งเก่าที่ใช้เป็นแม่แบบ");
      ui.cards.appendChild(a);
    }
    return items.length;
  }
  function renderGroups(){
    const term=norm(ui.search.value);
    const groups=state.data.legacy_committee_groups.filter(g=>!term||norm(g.name+" "+g.section).includes(term));
    for(const g of groups){
      const a=card(g.name,"ฝ่ายที่ "+g.section+" · คำสั่งปี 2568");
      const draftN=state.data.draft_source_review?.by_committee_section?.[g.section];
      if(Number.isInteger(draftN))detail(a,"พบ "+draftN+" บรรทัดชื่อในสูจิบัตรร่างปี 2569");
      stateNote(a,"เป็นหมวดสำหรับวางแผน; ชื่อจากคำสั่งร่างปี 2569 ยังไม่ผ่านการรับรอง");
      ui.cards.appendChild(a);
    }
    return groups.length;
  }
  function renderSchools(){
    const term=norm(ui.search.value);
    const schools=state.data.school_crosswalk.filter(s=>!term||norm(s.name).includes(term));
    for(const s of schools){
      const a=card(s.name,"โรงเรียนในเครือข่ายหนองกุ่ม");
      detail(a,"รหัสโรงเรียนอ้างอิงตรงกับทะเบียนสาธารณะ Sillapa");
      stateNote(a,"ยังไม่มีข้อมูลการมอบหมายกรรมการปี 2569 ที่รับรองในชุดนี้");
      ui.cards.appendChild(a);
    }
    return schools.length;
  }
  function renderReview(){
    const term=norm(ui.search.value);
    const flags=state.data.review_flags.filter(f=>!term||norm(f.code+" "+f.detail).includes(term));
    for(const f of flags){
      const a=card(f.detail,"ประเด็นตรวจ · "+f.code);
      stateNote(a,"ต้องตรวจหลักฐาน/รับรองก่อนนำข้อมูลไปใช้เป็นคำสั่งจริง");
      ui.cards.appendChild(a);
    }
    return flags.length;
  }
  function redraw(){
    if(!state.data)return;
    for(const button of ui.views.querySelectorAll("[data-report-mode]")){
      button.setAttribute("aria-pressed",String(button.dataset.reportMode===state.mode));
    }
    const isSports=state.mode==="sports";
    ui.sport.disabled=!isSports;
    if(!isSports)ui.division.disabled=true;
    else updateDivisionChoicesKeepingSelection();
    ui.cards.replaceChildren();
    const count=state.mode==="sports"?renderSports():state.mode==="groups"?renderGroups():
      state.mode==="schools"?renderSchools():renderReview();
    const titles={sports:"ชนิดกีฬา",groups:"ฝ่ายกรรมการจากแม่แบบเดิม",schools:"โรงเรียน",review:"ประเด็นรอตรวจ"};
    ui.count.textContent="แสดง "+count+" "+titles[state.mode]+" · ไม่ใช่ข้อมูลแต่งตั้งกรรมการปี 2569";
    if(!count)empty("ไม่พบข้อมูลตามที่ค้นหา","ลองเปลี่ยนคำค้นหรือเลือกตัวกรองอื่น");
  }
  function updateDivisionChoicesKeepingSelection(){
    const previous=ui.division.value;
    updateDivisionChoices();
    if(Array.from(ui.division.options).some(o=>o.value===previous))ui.division.value=previous;
  }
  async function load(){
    if(state.loading)return;
    state.loading=true;
    ui.failure.hidden=true;
    ui.loading.hidden=false;
    ui.refresh.disabled=true;
    if(!state.data)ui.report.hidden=true;
    try{
      const response=await root.fetch(DATA_URL,{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const data=await response.json();
      if(!valid(data))throw new Error("Invalid committee planning data");
      state.data=data;
      buildSelectors();
      metrics();
      renderDraftSummary();
      const venue=safeVenue(data);
      ui.venueName.textContent=venue.name;
      ui.venueScope.textContent=venue.scope;
      ui.report.hidden=false;
      redraw();
    }catch(_error){
      // Do not show historical people, stale appointments or invented placeholder data.
      state.data=null;
      ui.report.hidden=true;
      ui.failure.hidden=false;
    }finally{
      state.loading=false;
      ui.loading.hidden=true;
      ui.refresh.disabled=false;
    }
  }
  ui.sport.addEventListener("change",()=>{updateDivisionChoices();redraw();});
  ui.division.addEventListener("change",redraw);
  ui.search.addEventListener("input",redraw);
  ui.views.querySelectorAll("[data-report-mode]").forEach(button=>{
    button.addEventListener("click",()=>{
      if(!MODES.includes(button.dataset.reportMode))return;
      state.mode=button.dataset.reportMode;
      redraw();
    });
  });
  ui.retry.addEventListener("click",load);
  ui.refresh.addEventListener("click",load);
  load();
})(globalThis);
