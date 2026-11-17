/* R43-A local-only manager. Does NOT send proposed schedule or committee names to a server. */
(function(root){
  "use strict";
  const draft=root.NongkumR43Draft;
  const applied=root.NongkumProgramCorrections;
  if(!draft||!applied)return;
  const el=id=>document.getElementById(id);
  const ui={
    sport:el("r43Sport"),school:el("r43School"),search:el("r43Search"),
    status:el("r43Status"),matches:el("r43Matches"),listHint:el("r43ListHint"),
    editor:el("r43EditorPanel"),title:el("r43SelectedTitle"),
    detail:el("r43SelectedDetail"),originalState:el("r43OriginalState"),
    link:el("r43OpenPublic"),form:el("r43ScheduleForm"),day:el("r43Date"),
    time:el("r43Time"),field:el("r43Field"),venue:el("r43Venue"),
    person:el("r43Person"),personSchool:el("r43PersonSchool"),
    role:el("r43Role"),start:el("r43DutyStart"),end:el("r43DutyEnd"),
    addPerson:el("r43AddPerson"),staffList:el("r43StaffDraft"),
    reason:el("r43Reason"),reset:el("r43Reset"),
    count:el("r43Count"),pending:el("r43Pending"),warnings:el("r43Warnings"),
    download:el("r43Download"),clear:el("r43Clear")
  };
  const state={data:null,selected:null,pending:new Map(),staff:new Map()};
  function node(tag,cls,txt){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(txt!==undefined)n.textContent=txt;
    return n;
  }
  function option(list,value,label){
    const o=document.createElement("option");o.value=value;o.textContent=label;list.appendChild(o);
  }
  function school(id){
    return state.data?.schools.find(x=>x.id===id)?.short||id||"ไม่ระบุโรงเรียน";
  }
  function sport(id){
    return state.data?.sports.find(x=>x.id===id)?.name||id||"ไม่ระบุกีฬา";
  }
  function name(f){
    const type=f.kind==="track_event"?"รายการ ":"คู่ที่ ";
    return sport(f.sport_id)+" · "+String(f.division||"")+" · "+type+String(f.source_match_no||"");
  }
  function teams(f){
    if(f.kind==="track_event")return (f.name||"กรีฑา")+" · "+String((f.lanes||[]).length)+" ลู่";
    return (f.source_team_a_label||school(f.team_a_id))+" — "+(f.source_team_b_label||school(f.team_b_id));
  }
  function formValues(){
    return {date:ui.day.value,time:ui.time.value,field:ui.field.value,venue:ui.venue.value};
  }
  function staffFor(id){return state.staff.get(id)||[];}
  function select(id){
    const f=state.data?.fixtures.find(x=>x.id===id);
    if(!f)return;
    state.selected=f;
    const older=state.pending.get(id);
    const original=draft.baseline(f);
    const values=older?{...original,...older.changes}:original;
    ui.day.value=values.date||"";
    ui.time.value=values.time||"";
    ui.field.value=values.field||"";
    ui.venue.value=values.venue||"";
    ui.reason.value=older?.reason||"";
    ui.title.textContent=name(f);
    ui.detail.textContent=teams(f)+" · รหัสรายการ "+f.id;
    const confirmed=[
      f.planning_date_confirmation==="confirmed"?"วันยืนยันแล้ว":"วันจากร่าง/รอตรวจ",
      f.planning_time_confirmation==="confirmed"?"เวลายืนยันแล้ว":"เวลาจากร่าง/รอตรวจ",
      f.planning_venue_confirmation==="confirmed"?"สนามหลักยืนยันแล้ว":"สนามหลักรอตรวจ"
    ];
    ui.originalState.textContent=confirmed.join(" · ");
    ui.link.href="./index.html?fixture="+encodeURIComponent(f.id);
    if(older)state.staff.set(id,(older.assignment_proposals||[]).map(x=>({...x})));
    else if(!state.staff.has(id))state.staff.set(id,[]);
    ui.person.value="";ui.personSchool.value="";ui.role.value="";ui.start.value="";ui.end.value="";
    ui.editor.hidden=false;
    paintStaff();
    ui.matches.querySelectorAll(".r43-match").forEach(b=>{
      b.setAttribute("aria-pressed",String(b.dataset.id===id));
    });
    ui.editor.scrollIntoView({block:"start",behavior:"auto"});
  }
  function paintStaff(){
    ui.staffList.replaceChildren();
    if(!state.selected)return;
    const rows=staffFor(state.selected.id);
    if(!rows.length){ui.staffList.appendChild(node("li","r43-small","ยังไม่มีกรรมการในร่างรายการนี้"));return;}
    rows.forEach((a,i)=>{
      const li=node("li"),body=node("div");
      body.append(node("strong","",a.person_name+" · "+school(a.school_id)));
      body.append(node("small","",a.role+" · "+a.starts_at+"–"+a.ends_at+" น. · ร่างไม่ใช่การแต่งตั้ง"));
      const b=node("button","","นำออก");b.type="button";b.dataset.removeStaff=String(i);
      li.append(body,b);ui.staffList.appendChild(li);
    });
  }
  function showMatches(){
    if(!state.data)return;
    const s=ui.sport.value,schoolId=ui.school.value,q=ui.search.value.trim().toLocaleLowerCase("th");
    const filtered=state.data.fixtures.filter(f=>{
      if(s&&f.sport_id!==s)return false;
      if(schoolId&&![f.team_a_id,f.team_b_id,...(f.lanes||[]).map(x=>x.school_id)].includes(schoolId))return false;
      const content=[f.id,name(f),teams(f),f.round,f.source_pair_text,f.source_team_a_label,f.source_team_b_label]
        .join(" ").toLocaleLowerCase("th");
      return !q||content.includes(q);
    });
    ui.matches.replaceChildren();
    filtered.slice(0,30).forEach(f=>{
      const b=node("button","r43-match");b.type="button";b.dataset.id=f.id;
      b.setAttribute("aria-pressed",String(state.selected?.id===f.id));
      b.append(node("strong","",name(f)));
      b.append(node("small","",teams(f)));
      ui.matches.appendChild(b);
    });
    ui.status.textContent="พบ "+filtered.length+" รายการ · เลือกคู่หรือรายการเพื่อเตรียมแก้ไข";
    ui.listHint.textContent=filtered.length>30?"แสดง 30 รายการแรก · กรุณาใช้ตัวกรองเพื่อค้นหาเพิ่มเติม":"ข้อมูลจากชุดตารางเดิม ไม่ใช่ผลแข่งขัน";
  }
  function paintPending(){
    const rows=[...state.pending.values()];
    ui.pending.replaceChildren();
    ui.count.textContent=rows.length?"มี "+rows.length+" คำขอรอส่งให้ผู้จัดตรวจ (ยังไม่บันทึกเข้าระบบ)":"ยังไม่มีคำขอแก้ไข";
    for(const p of rows){
      const article=node("article"),body=node("div");
      body.append(node("strong","",p.sport_id+" · "+p.division+" · "+p.source_match_no));
      body.append(node("small","",
        "แก้ "+Object.keys(p.changes).length+" ช่อง · กรรมการร่าง "+p.assignment_proposals.length+" คน · ยังไม่รับรอง"));
      const b=node("button","","นำออก");b.type="button";b.dataset.removeRequest=p.fixture_id;
      article.append(body,b);ui.pending.appendChild(article);
    }
    const warnings=draft.conflicts(rows);
    ui.warnings.textContent=warnings.length
      ?"พบความเสี่ยงเวลาปฏิบัติหน้าที่ซ้ำ "+warnings.length+" จุด (ชื่อและโรงเรียนที่ตรงกันยังไม่ยืนยันว่าเป็นบุคคลเดียวกัน) กรุณาตรวจสอบ"
      :"";
    ui.download.disabled=!rows.length;
  }
  function say(message,bad){
    ui.status.textContent=message;
    ui.status.style.color=bad?"#98431c":"";
  }
  function addStaff(){
    if(!state.selected){say("กรุณาเลือกรายการแข่งขันก่อน",true);return;}
    try{
      const a=draft.assignment({
        person_name:ui.person.value,school_id:ui.personSchool.value,
        role:ui.role.value,starts_at:ui.start.value,ends_at:ui.end.value
      },state.data.schools);
      const rows=staffFor(state.selected.id);
      if(rows.some(x=>x.person_name===a.person_name&&x.school_id===a.school_id&&x.role===a.role))
        throw Error("มีชื่อและหน้าที่นี้อยู่ในร่างรายการเดียวกันแล้ว");
      rows.push(a);state.staff.set(state.selected.id,rows);
      ui.person.value="";ui.personSchool.value="";ui.role.value="";ui.start.value="";ui.end.value="";
      paintStaff();say("เพิ่มกรรมการลงร่างในเครื่องแล้ว · ยังไม่บันทึกเข้าระบบ",false);
    }catch(e){say(e.message||"ข้อมูลกรรมการไม่ถูกต้อง",true);}
  }
  function save(e){
    e.preventDefault();
    if(!state.selected)return;
    try{
      const p=draft.proposal(state.selected,formValues(),staffFor(state.selected.id),ui.reason.value);
      state.pending.set(p.fixture_id,p);
      paintPending();say("เพิ่มคำขอเข้าชุดตรวจแล้ว · ยังไม่เปลี่ยนข้อมูลการแข่งขัน",false);
    }catch(e){say(e.message||"ไม่สามารถเพิ่มคำขอ",true);}
  }
  function download(){
    try{
      const pkg=draft.packageForReview([...state.pending.values()]);
      const bytes=JSON.stringify(pkg,null,2);
      const url=URL.createObjectURL(new Blob([bytes],{type:"application/json;charset=utf-8"}));
      const link=document.createElement("a");
      link.href=url;link.download="R43-private-proposals-for-review.json";
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      say("ดาวน์โหลดร่างแล้ว · ยังไม่ส่งหรือเผยแพร่ กรุณาเก็บไฟล์เป็นส่วนตัว",false);
    }catch(e){say(e.message||"ดาวน์โหลดไม่สำเร็จ",true);}
  }
  function setup(){
    ui.sport.addEventListener("change",showMatches);
    ui.school.addEventListener("change",showMatches);
    ui.search.addEventListener("input",showMatches);
    ui.matches.addEventListener("click",e=>{
      const b=e.target.closest("[data-id]");if(b)select(b.dataset.id);
    });
    ui.staffList.addEventListener("click",e=>{
      const b=e.target.closest("[data-remove-staff]");
      if(!b||!state.selected)return;
      staffFor(state.selected.id).splice(Number(b.dataset.removeStaff),1);
      paintStaff();
    });
    ui.addPerson.addEventListener("click",addStaff);
    ui.form.addEventListener("submit",save);
    ui.reset.addEventListener("click",()=>{
      if(state.selected){state.pending.delete(state.selected.id);state.staff.delete(state.selected.id);select(state.selected.id);paintPending();}
    });
    ui.pending.addEventListener("click",e=>{
      const b=e.target.closest("[data-remove-request]");
      if(!b)return;
      state.pending.delete(b.dataset.removeRequest);
      state.staff.delete(b.dataset.removeRequest);
      if(state.selected?.id===b.dataset.removeRequest)select(b.dataset.removeRequest);
      paintPending();
    });
    ui.download.addEventListener("click",download);
    ui.clear.addEventListener("click",()=>{
      state.pending.clear();state.staff.clear();
      if(state.selected)select(state.selected.id);
      paintPending();say("ล้างร่างในเครื่องแล้ว",false);
    });
  }
  async function initialize(){
    setup();
    try{
      const r=await fetch("./data/program-from-pdf-2569-20261104-draft.json?cache=r43a-1",
        {cache:"no-store"});
      if(!r.ok)throw Error("อ่านตารางแข่งขันไม่ได้");
      const raw=await r.json();
      const data=applied.apply(raw);
      if(data.schema_version!==3||data.fixtures?.length!==236||
        data.metadata?.source_status!=="revised_pdf_draft"||
        data.metadata?.all_data_approved!==false)
        throw Error("รุ่นข้อมูลตารางไม่ตรงกับรุ่นที่ผ่านการตรวจ");
      if(new Set(data.fixtures.map(f=>f.id)).size!==236)throw Error("พบรหัสรายการซ้ำ");
      state.data=data;
      data.sports.forEach(s=>option(ui.sport,s.id,s.name));
      data.schools.forEach(s=>{option(ui.school,s.id,s.name);option(ui.personSchool,s.id,s.name);});
      draft.ROLES.forEach(x=>option(ui.role,x,x));
      showMatches();
      const id=new URLSearchParams(location.search).get("fixture");
      if(id){
        const match=data.fixtures.find(f=>f.id===id);
        if(match){ui.sport.value=match.sport_id;showMatches();select(match.id);}
        else say("ไม่พบรหัสรายการที่เปิดจากลิงก์ กรุณาค้นหาอีกครั้ง",true);
      }
    }catch(e){
      say("เปิดข้อมูลตารางไม่ได้ จึงปิดการเตรียมคำขอเพื่อป้องกันการใช้ข้อมูลผิดรุ่น",true);
      ui.matches.replaceChildren();
      ui.listHint.textContent="โปรดตรวจการเชื่อมต่อและโหลดหน้านี้ใหม่";
      console.error("R43: cannot load or validate schedule source");
    }
  }
  initialize();
})(globalThis);
