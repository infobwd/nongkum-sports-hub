/* R19-C: public, read-only committee preparation report.
   Historical 2568 role template is not a 2569 appointment. Never render personnel from unapproved data. */
(function(root){
  "use strict";
  const DATA_URL="./data/committee-roles-2569-planning.json";
  const PUBLIC_ROSTER_URL="./data/committee-2569-draft-public-review.json";
  const PROGRAM_URL="./data/program-from-pdf-2569-20261104-draft.json";
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
  function validPublicDraft(roster,plan){
    if(roster?.schema_version!==1||
       roster.publication_status!=="draft_names_for_school_verification_only_not_approved_appointments"||
       roster.source_sha256!==plan?.draft_source_review?.source_sha256||
       !Array.isArray(roster.entries)||roster.entries.length!==250||
       !Array.isArray(roster.schools)||roster.schools.length!==8||
       !Array.isArray(roster.sections)||roster.sections.length!==20)return false;
    if(new Set(roster.entries.map(x=>x.id)).size!==250)return false;
    const schoolIds=new Set(plan.school_crosswalk.map(s=>s.sports_school_id));
    return roster.entries.every(x=>x.id&&x.name&&typeof x.affiliation==="string"&&
      typeof x.role==="string"&&typeof x.section==="string"&&
      (x.school_id===null||schoolIds.has(x.school_id))&&
      x.pdf_page>=6&&x.pdf_page<=16&&Array.isArray(x.flags));
  }
  function personRows(roster,filters){
    const term=norm(filters.search||"");
    const sportNames={football:"ฟุตบอล",shootout:"ยิงจุดโทษ",futsal:"ฟุตซอล",
      volleyball:"วอลเลย์บอล",takraw:"เซปักตะกร้อ",petanque:"เปตอง",
      tabletennis:"เทเบิลเทนนิส",tugofwar:"ชักเย่อ",athletics:"กรีฑา"};
    return (roster?.entries||[]).filter(x=>{
      if(filters.school&&x.school_id!==filters.school)return false;
      if(filters.sport&&x.sport_id!==filters.sport)return false;
      if(filters.section&&x.section!==filters.section)return false;
      if(!term)return true;
      const heading=roster.sections.find(g=>g.id===x.section)?.title||"";
      return norm([x.name,x.affiliation,x.role,x.section,heading,x.subdivision||"",
        sportNames[x.sport_id]||""].join(" ")).includes(term);
    });
  }

  // R19-F: never infer identity from a matching name across different schools.
  function normalizeTeacher(value){
    return norm(value).replace(/\s+/g,"");
  }
  function teacherMatches(roster,schoolId,query){
    if(!schoolId||normalizeTeacher(query).length<2)return [];
    const names=new Map();
    for(const row of roster?.entries||[]){
      if(row.school_id!==schoolId||!normalizeTeacher(row.name).includes(normalizeTeacher(query)))continue;
      const key=normalizeTeacher(row.name);
      const found=names.get(key);
      if(found)found.count++;
      else names.set(key,{name:row.name,count:1});
    }
    return Array.from(names.values()).sort((a,b)=>a.name.localeCompare(b.name,"th"));
  }
  function teacherAssignments(roster,schoolId,name){
    const needle=normalizeTeacher(name);
    if(!schoolId||!needle)return [];
    return (roster?.entries||[]).filter(row=>row.school_id===schoolId&&normalizeTeacher(row.name)===needle);
  }
  function safeIsoDate(value){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
    if(!match)return null;
    const y=Number(match[1]),m=Number(match[2]),d=Number(match[3]);
    const dt=new Date(Date.UTC(y,m-1,d));
    return dt.getUTCFullYear()===y&&dt.getUTCMonth()+1===m&&dt.getUTCDate()===d?match[0]:null;
  }
  // Date groups describe SPORT fixtures, never the individual person's duty shift.
  function sportSchedule(program,sportId){
    if(!sportId||!Array.isArray(program?.fixtures))return null;
    const fixtures=program.fixtures.filter(x=>x.sport_id===sportId);
    const confirmed=new Map(),draft=new Map();
    let unknown=0;
    for(const fixture of fixtures){
      const confirmedDate=fixture.planning_date_confirmation==="confirmed"
        ?safeIsoDate(fixture.planning_date):null;
      if(confirmedDate){
        confirmed.set(confirmedDate,(confirmed.get(confirmedDate)||0)+1);
        continue;
      }
      // Some PDF rows retain an anomalous 2568 year: don't present that as 2569.
      const inconsistent=/(?:พ\.ย\.\s*68|2568)/.test(String(fixture.source_pdf?.source_date_text||""));
      const draftDate=inconsistent?null:safeIsoDate(fixture.draft_date||fixture.source_pdf?.source_date_iso);
      if(draftDate)draft.set(draftDate,(draft.get(draftDate)||0)+1);
      else unknown++;
    }
    function days(map){return Array.from(map,([date,count])=>({date,count})).sort((a,b)=>a.date.localeCompare(b.date));}
    return {confirmed:days(confirmed),draft:days(draft),unknown,total:fixtures.length};
  }
  function thaiDate(iso){
    const date=safeIsoDate(iso);
    if(!date)return "วันไม่ระบุ";
    const parts=date.split("-").map(Number);
    const months=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    return parts[2]+" "+months[parts[1]-1]+" "+(parts[0]+543);
  }
  root.NongkumCommitteeReport=Object.freeze({
    valid,approvedCount,filteredSports,safeVenue,validPublicDraft,personRows,
    normalizeTeacher,teacherMatches,teacherAssignments,safeIsoDate,sportSchedule,thaiDate
  });
  if(typeof document==="undefined"||!document.getElementById("committeeMain"))return;
  const el=id=>document.getElementById(id);
  const ui={
    loading:el("committeeLoading"),failure:el("committeeLoadFailure"),retry:el("committeeRetry"),
    refresh:el("committeeRefresh"),report:el("committeeReport"),
    metrics:el("committeeMetrics"),revision:el("committeeRevision"),approval:el("committeeApprovalHint"),
    venueName:el("committeeVenueName"),venueScope:el("committeeVenueScope"),
    draftPanel:el("committeeDraftSummary"),draftMetrics:el("committeeDraftMetrics"),draftFootnote:el("committeeDraftFootnote"),
    views:el("committeeViews"),school:el("committeeSchool"),sport:el("committeeSport"),division:el("committeeDivision"),
    search:el("committeeSearch"),cards:el("committeeCards"),count:el("committeeCount"),
    dutySchool:el("myDutySchool"),dutySearch:el("myDutySearch"),
    dutyHint:el("myDutyHint"),dutyMatches:el("myDutyMatches"),dutySelected:el("myDutySelected"),
    dutyName:el("myDutyPersonName"),dutySchoolName:el("myDutyPersonSchool"),
    dutySummary:el("myDutySummary"),dutyScheduleStatus:el("myDutyScheduleStatus"),
    dutyCards:el("myDutyCards")
  };
  let state={data:null,roster:null,mode:"sports",loading:false,schedule:null,scheduleStatus:"loading",scheduleRequest:0,selectedTeacher:""};
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
  function appendPersonNames(parent,rows){
    const area=make("div","committee-people");
    area.appendChild(make("p","committee-people-heading","รายชื่อจากร่างปี 2569 · "+rows.length+" รายการ"));
    if(!rows.length){
      line(area,"committee-card-meta","ไม่พบรายชื่อที่ตรงกับตัวกรอง (ไม่ได้หมายความว่าไม่มีกรรมการ)");
      parent.appendChild(area);return;
    }
    const allAtOnce=Boolean(norm(ui.search.value))||rows.length<=7;
    const firstCount=allAtOnce?rows.length:3;
    function appendList(target,people){
      const ol=make("ol","committee-person-list");
      for(const row of people){
        const li=make("li","committee-person");
        const body=make("div","committee-person-body");
        body.appendChild(make("strong","committee-person-name",row.name));
        body.appendChild(make("span","committee-person-role",row.role||"ไม่ระบุบทบาท"));
        line(body,"committee-person-affiliation",row.affiliation||"สังกัดรอตรวจ");
        if(row.subdivision)line(body,"committee-person-small",row.subdivision);
        if(row.flags?.length)line(body,"committee-person-warning","ข้อความจากต้นฉบับควรตรวจทานเพิ่มเติม");
        line(body,"committee-person-small","ข้อ "+(row.number||row.section)+" · PDF หน้า "+row.pdf_page);
        li.appendChild(body);ol.appendChild(li);
      }
      target.appendChild(ol);
    }
    appendList(area,rows.slice(0,firstCount));
    if(rows.length>firstCount){
      const details=make("details","committee-people-extra");
      details.appendChild(make("summary","","ดูรายชื่อเพิ่มเติม "+(rows.length-firstCount)+" รายการ"));
      appendList(details,rows.slice(firstCount));area.appendChild(details);
    }
    parent.appendChild(area);
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
    ui.school.replaceChildren();
    const everyone=make("option","","ทุกโรงเรียนและหน่วยงาน");
    everyone.value="";ui.school.appendChild(everyone);
    for(const s of state.data.school_crosswalk){
      const option=make("option","",s.name);
      option.value=s.sports_school_id;
      ui.school.appendChild(option);
    }
    const schoolParam=params.get("school");
    if(state.data.school_crosswalk.some(s=>s.sports_school_id===schoolParam))ui.school.value=schoolParam;
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
    ui.draftFootnote.textContent="รายชื่อจาก PDF ร่างปี "+draft.year_be+" หน้า "+draft.source_pdf_pages+
      " เปิดให้ทุกโรงเรียนค้นหาได้โดยตรง · ยังไม่ใช่คำสั่งแต่งตั้งที่รับรอง";
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
      ?"มีรายชื่อจากสูจิบัตรร่างปี 2569 ให้ตรวจสอบแล้ว แต่คำสั่งแต่งตั้งที่รับรองในฐานนี้ยังเป็น 0"
      :"ยอดรับรองแยกจากรายชื่อฉบับร่างที่เปิดให้โรงเรียนตรวจ";
    ui.revision.textContent="รายชื่อสำหรับตรวจทาน · "+(state.roster?.revision||"R19-E")+" · ยังไม่ใช่คำสั่งแต่งตั้งที่รับรอง";
  }
  function renderSports(){
    const term=norm(ui.search.value);
    const filtered=filteredSports(state.data,{
      sport:ui.sport.value,division:ui.division.value,query:""
    });
    let count=0;
    for(const {sport:s,divisions} of filtered){
      const people=personRows(state.roster,{
        school:ui.school.value,sport:s.sport_id,search:term
      });
      const titleMatch=norm([s.sport_name,s.sport_id,divisions.map(x=>x.label).join(" ")].join(" ")).includes(term);
      if(term&&!titleMatch&&!people.length)continue;
      const allPeople=personRows(state.roster,{school:ui.school.value,sport:s.sport_id});
      if(ui.school.value&&!allPeople.length)continue;
      const a=card(s.sport_name,"ชนิดกีฬา · "+divisions.length+" รุ่นที่แสดง");
      if(s.sport_id==="athletics"){
        detail(a,"กรีฑา "+(s.candidate_event_count||50)+" รายการในชุดแข่งขันที่กำลังตรวจ");
      }else if(divisions.length){
        const list=make("ul","committee-division-list");
        for(const d of divisions)list.appendChild(make("li","","รายการ "+d.catalog_no+" · "+d.label));
        a.appendChild(list);
      }
      if(s.sport_id==="shootout")
        detail(a,"คำสั่งร่างยังไม่มีหมวดรายชื่อกรรมการยิงจุดโทษโดยเฉพาะ");
      appendPersonNames(a,titleMatch?allPeople:people);
      if(ui.division.value)
        detail(a,"รายชื่อในร่างผูกระดับชนิดกีฬา ยังไม่ได้ยืนยันว่าคนใดทำหน้าที่ในรุ่นที่เลือก");
      stateNote(a,"รายชื่อฉบับร่างปี 2569 · กรุณาตรวจตัวสะกดและบทบาท");
      detail(a,"สนามหลัก: โรงเรียนบ้านหนองกระทุ่ม (ยืนยันเฉพาะสถานที่)");
      ui.cards.appendChild(a);count++;
    }
    return count;
  }
  function renderGroups(){
    const term=norm(ui.search.value);
    let count=0;
    for(const group of state.roster.sections){
      const all=personRows(state.roster,{school:ui.school.value,section:group.id});
      const matching=personRows(state.roster,{
        school:ui.school.value,section:group.id,search:term
      });
      const titleMatch=norm(group.title+" "+group.id).includes(term);
      if(term&&!titleMatch&&!matching.length)continue;
      if(ui.school.value&&!all.length)continue;
      const a=card(group.title,"ฝ่ายที่ "+group.id+" · ร่างสูจิบัตร 2569");
      appendPersonNames(a,titleMatch?all:matching);
      stateNote(a,"โรงเรียนควรตรวจรายชื่อก่อนผู้จัดรับรอง");
      ui.cards.appendChild(a);count++;
    }
    return count;
  }
  function renderSchools(){
    const term=norm(ui.search.value);
    let count=0;
    for(const school of state.data.school_crosswalk){
      if(ui.school.value&&school.sports_school_id!==ui.school.value)continue;
      const all=personRows(state.roster,{school:school.sports_school_id});
      const matching=personRows(state.roster,{
        school:school.sports_school_id,search:term
      });
      const titleMatch=norm(school.name).includes(term);
      if(term&&!titleMatch&&!matching.length)continue;
      const a=card(school.name,"โรงเรียนเครือข่าย · "+all.length+" รายการจากร่าง");
      appendPersonNames(a,titleMatch?all:matching);
      const link=make("a","committee-school-review-link","ไปตรวจและส่งผลยืนยันของโรงเรียน");
      link.href="./committee-review.html";
      a.appendChild(link);
      stateNote(a,"รายชื่อจากร่างปี 2569 ยังรอการตรวจจากโรงเรียน");
      ui.cards.appendChild(a);count++;
    }
    if(!ui.school.value){
      const outside=state.roster.entries.filter(x=>x.school_id===null);
      const matched=personRows(state.roster,{search:term}).filter(x=>x.school_id===null);
      const titleMatch=norm("ส่วนกลาง ภายนอก รอตรวจสังกัด").includes(term);
      if(outside.length&&(!term||titleMatch||matched.length)){
        const a=card("ส่วนกลาง / หน่วยงานภายนอก / รอตรวจสังกัด","ร่างปี 2569 · "+outside.length+" รายการ");
        appendPersonNames(a,titleMatch?outside:matched);
        stateNote(a,"ไม่โยนรายชื่อให้โรงเรียนใดโดยเดาสังกัด");
        ui.cards.appendChild(a);count++;
      }
    }
    return count;
  }
  function renderReview(){
    const term=norm(ui.search.value);
    let count=0;
    for(const flag of state.data.review_flags){
      if(term&&!norm(flag.code+" "+flag.detail).includes(term))continue;
      const a=card(flag.detail,"ประเด็นตรวจ · "+flag.code);
      stateNote(a,"ต้องตรวจต้นฉบับก่อนใช้อ้างอิงเป็นคำสั่งรับรอง");
      ui.cards.appendChild(a);count++;
    }
    const flagged=personRows(state.roster,{
      school:ui.school.value,search:term
    }).filter(r=>r.flags.length);
    if(flagged.length){
      const a=card("รายชื่อที่ควรตรวจข้อความจากร่างสูจิบัตร","รายการที่ติดเครื่องหมายตรวจ · "+flagged.length);
      appendPersonNames(a,flagged);
      stateNote(a,"ยังไม่ได้แก้ข้อมูลต้นฉบับเอง กรุณาแจ้งผู้จัด");
      ui.cards.appendChild(a);count++;
    }
    return count;
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
    const titles={sports:"ชนิดกีฬา",groups:"ฝ่ายกรรมการ",schools:"โรงเรียน/หน่วยงาน",review:"ประเด็นรอตรวจ"};
    ui.count.textContent="แสดง "+count+" "+titles[state.mode]+" · รายชื่อจากร่างปี 2569 เพื่อให้ตรวจ ไม่ใช่คำสั่งแต่งตั้งที่รับรอง";
    if(!count)empty("ไม่พบข้อมูลตามที่ค้นหา","ลองเปลี่ยนคำค้นหรือเลือกตัวกรองอื่น");
  }
  function updateDivisionChoicesKeepingSelection(){
    const previous=ui.division.value;
    updateDivisionChoices();
    if(Array.from(ui.division.options).some(o=>o.value===previous))ui.division.value=previous;
  }

  function buildDutySchools(){
    const previous=ui.dutySchool.value;
    ui.dutySchool.replaceChildren();
    const first=make("option","","เลือกโรงเรียนของฉัน");first.value="";
    ui.dutySchool.appendChild(first);
    for(const school of state.roster.schools){
      const option=make("option","",school.name);
      option.value=school.id;
      ui.dutySchool.appendChild(option);
    }
    const fromLink=params.get("school");
    if(state.roster.schools.some(x=>x.id===previous))ui.dutySchool.value=previous;
    else if(state.roster.schools.some(x=>x.id===fromLink))ui.dutySchool.value=fromLink;
  }
  function renderDutyDates(card,sportId){
    if(!sportId){
      line(card,"my-duty-small-note","ฝ่ายงานทั่วไป: ยังไม่มีการเชื่อมวันแข่งขันเฉพาะกีฬา");
      return;
    }
    const sport=state.data.sports.find(x=>x.sport_id===sportId);
    if(!sport){
      line(card,"my-duty-small-note","ยังไม่ได้ระบุชนิดกีฬาที่เชื่อมได้");
      return;
    }
    if(state.scheduleStatus!=="ready"){
      line(card,"my-duty-small-note",state.scheduleStatus==="failed"
        ?"โหลดกำหนดการแข่งขันไม่สำเร็จ · ตรวจโปรแกรมแข่งขันโดยตรง"
        :"กำลังตรวจข้อมูลวันแข่งขันของกีฬานี้…");
    }else{
      const days=sportSchedule(state.schedule,sportId);
      if(days?.confirmed.length){
        line(card,"my-duty-date-head","วันแข่งขันที่ผู้จัดยืนยัน (ระดับชนิดกีฬา)");
        const group=make("div","my-duty-date-list");
        for(const day of days.confirmed){
          const tag=make("span","my-duty-date confirmed","✓ "+thaiDate(day.date)+" · "+day.count+" รายการ");
          group.appendChild(tag);
        }
        card.appendChild(group);
      }
      if(days?.draft.length){
        line(card,"my-duty-date-head","วันที่แข่งขันตามร่าง · ยังไม่รับรอง");
        const group=make("div","my-duty-date-list");
        for(const day of days.draft){
          group.appendChild(make("span","my-duty-date draft",thaiDate(day.date)+" · "+day.count+" รายการ"));
        }
        card.appendChild(group);
      }
      if(!days||(!days.confirmed.length&&!days.draft.length))
        line(card,"my-duty-small-note","ยังไม่พบวันแข่งขันที่นำมาแสดงได้จากไฟล์ปัจจุบัน");
      if(days?.unknown)
        line(card,"my-duty-small-note","มีอีก "+days.unknown+" รายการที่ยังระบุวันไม่ได้อย่างน่าเชื่อถือ");
      line(card,"my-duty-small-note","วันที่ข้างต้นเป็นวันแข่งขันของชนิดกีฬา ไม่ใช่วัน/เวลาเข้าเวรของครู และยังไม่ได้ระบุคู่ที่รับผิดชอบ");
    }
    const link=make("a","my-duty-schedule-link","ดูตารางแข่งขัน"+sport.sport_name+" →");
    link.href="./index.html?sport="+encodeURIComponent(sportId);
    card.appendChild(link);
  }
  function renderDutyPerson(){
    const rows=teacherAssignments(state.roster,ui.dutySchool.value,state.selectedTeacher);
    if(!rows.length){
      state.selectedTeacher="";
      ui.dutySelected.hidden=true;
      return;
    }
    const school=state.roster.schools.find(x=>x.id===ui.dutySchool.value);
    ui.dutyName.textContent=state.selectedTeacher;
    ui.dutySchoolName.textContent=school?.name||"สังกัดรอตรวจ";
    const sports=new Set(rows.filter(x=>x.sport_id).map(x=>x.sport_id));
    ui.dutySummary.textContent="พบ "+rows.length+" บรรทัดหน้าที่ในร่าง · "+sports.size+" ชนิดกีฬาที่ระบุ";
    ui.dutyScheduleStatus.textContent=state.scheduleStatus==="ready"
      ?"เชื่อมวันแข่งขันจากสูจิบัตรฉบับร่างล่าสุด · วันปฏิบัติหน้าที่ของครูยังรอยืนยัน"
      :state.scheduleStatus==="failed"
      ?"ข้อมูลวันแข่งขันโหลดไม่สำเร็จ แต่รายชื่อและหน้าที่จากร่างยังตรวจได้"
      :"กำลังอ่านข้อมูลวันแข่งขันเพิ่มเติม…";
    ui.dutyCards.replaceChildren();
    for(const row of rows){
      const sport=state.data.sports.find(s=>s.sport_id===row.sport_id);
      const group=state.roster.sections.find(s=>s.id===row.section);
      const card=make("article","my-duty-card");
      line(card,"my-duty-kind",sport?"ชนิดกีฬา · "+sport.sport_name:"ฝ่ายงานทั่วไป · ร่างปี 2569");
      card.appendChild(make("h4","",group?.title||(sport?.sport_name||"ฝ่ายกรรมการ")));
      line(card,"my-duty-role","หน้าที่: "+(row.role||"รอตรวจข้อความ"));
      if(row.subdivision)line(card,"","ส่วนงาน/รุ่น: "+row.subdivision);
      line(card,"my-duty-small-note","ข้อ "+(row.number||row.section)+" · PDF หน้า "+row.pdf_page);
      if(row.flags?.length)line(card,"my-duty-warning","มีข้อความจากต้นฉบับที่ต้องตรวจเพิ่มเติม");
      line(card,"my-duty-date-unknown","วันและเวลาปฏิบัติหน้าที่ของครู: รอผู้จัดกำหนด/รับรอง");
      renderDutyDates(card,row.sport_id);
      ui.dutyCards.appendChild(card);
    }
    ui.dutySelected.hidden=false;
  }
  function renderMyDuty(){
    if(!state.roster||!state.data)return;
    ui.dutyMatches.replaceChildren();
    const schoolId=ui.dutySchool.value;
    const query=ui.dutySearch.value;
    const normalized=normalizeTeacher(query);
    if(!schoolId){
      state.selectedTeacher="";
      ui.dutySelected.hidden=true;
      ui.dutyHint.textContent="เลือกโรงเรียนก่อน แล้วพิมพ์ชื่อหรือสกุลอย่างน้อย 2 ตัวอักษร";
      return;
    }
    if(normalized.length<2){
      state.selectedTeacher="";
      ui.dutySelected.hidden=true;
      ui.dutyHint.textContent="พิมพ์ชื่อหรือสกุลอย่างน้อย 2 ตัวอักษรเพื่อค้นหาจากสูจิบัตรร่าง";
      return;
    }
    const choices=teacherMatches(state.roster,schoolId,query);
    if(state.selectedTeacher&&normalizeTeacher(state.selectedTeacher)===normalized){
      ui.dutyHint.textContent="แสดงหน้าที่ตามชื่อที่เลือกจากร่างปี 2569 · หากชื่อซ้ำให้โรงเรียนตรวจยืนยันตัวบุคคล";
      renderDutyPerson();
      return;
    }
    state.selectedTeacher="";
    ui.dutySelected.hidden=true;
    if(!choices.length){
      ui.dutyHint.textContent="ไม่พบชื่อนี้ในชุดร่างของโรงเรียนที่เลือก (ไม่ได้หมายความว่าไม่มีหน้าที่) · ตรวจตัวสะกดหรือแจ้งโรงเรียนตรวจ";
      return;
    }
    ui.dutyHint.textContent="พบ "+choices.length+" ชื่อที่ตรงกับคำค้น · แตะเลือกชื่อเพื่อดูทุกหน้าที่";
    for(const choice of choices.slice(0,15)){
      const button=make("button","","");
      button.type="button";
      button.appendChild(make("strong","",choice.name));
      button.appendChild(make("small","","พบ "+choice.count+" บรรทัดหน้าที่"));
      button.addEventListener("click",()=>{
        state.selectedTeacher=choice.name;
        ui.dutySearch.value=choice.name;
        renderMyDuty();
      });
      ui.dutyMatches.appendChild(button);
    }
    if(choices.length>15)
      line(ui.dutyMatches,"my-duty-small-note","มีชื่ออื่นอีก "+(choices.length-15)+" ชื่อ · พิมพ์ให้ละเอียดขึ้น");
  }
  async function loadDutySchedule(){
    const request=++state.scheduleRequest;
    state.schedule=null;
    state.scheduleStatus="loading";
    renderMyDuty();
    try{
      const response=await root.fetch(PROGRAM_URL,{cache:"no-store"});
      if(!response.ok)throw new Error("schedule_unavailable");
      const data=await response.json();
      if(data?.schema_version!==3||data?.metadata?.source_status!=="revised_pdf_draft"||
         data?.metadata?.all_data_approved!==false||!Array.isArray(data.fixtures))
        throw new Error("schedule_revision_mismatch");
      if(request!==state.scheduleRequest)return;
      state.schedule=data;
      state.scheduleStatus="ready";
    }catch(_error){
      if(request!==state.scheduleRequest)return;
      state.scheduleStatus="failed";
      state.schedule=null;
    }
    if(request===state.scheduleRequest)renderMyDuty();
  }
  async function load(){
    if(state.loading)return;
    state.loading=true;
    ui.failure.hidden=true;
    ui.loading.hidden=false;
    ui.refresh.disabled=true;
    if(!state.data)ui.report.hidden=true;
    try{
      const responses=await Promise.all([
        root.fetch(DATA_URL,{cache:"no-store"}),
        root.fetch(PUBLIC_ROSTER_URL,{cache:"no-store"})
      ]);
      if(responses.some(r=>!r.ok))throw new Error("Missing committee data");
      const [data,roster]=await Promise.all(responses.map(r=>r.json()));
      if(!valid(data)||!validPublicDraft(roster,data))throw new Error("Invalid source or roster revision");
      state.data=data;
      state.roster=roster;
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
      state.roster=null;
      ui.report.hidden=true;
      ui.failure.hidden=false;
    }finally{
      state.loading=false;
      ui.loading.hidden=true;
      ui.refresh.disabled=false;
    }
  }
  ui.dutySchool.addEventListener("change",()=>{
    state.selectedTeacher="";
    ui.dutySearch.value="";
    renderMyDuty();
  });
  ui.dutySearch.addEventListener("input",()=>{
    state.selectedTeacher="";
    renderMyDuty();
  });
  ui.school.addEventListener("change",redraw);
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
