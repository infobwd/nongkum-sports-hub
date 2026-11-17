/* R43-A: pure, LOCAL-ONLY schedule proposal contract.
   Nothing here publishes a fixture or confirms a committee appointment. */
(function (root) {
  "use strict";
  const CONTRACT=Object.freeze({
    schema:"nongkum-schedule-proposal-v1",
    source_key:"r33-20261116-7ba60be1-fa3269b5",
    candidate_blob_sha:"7ba60be1b36a2591768fc0350476edc8ff2c3ac1",
    corrections_blob_sha:"fa3269b5b95ae3e3a8509b6f2c7d8d5040cbaed4",
    record_status:"proposed_not_submitted",
    publication_status:"not_published"
  });
  const FIELDS=Object.freeze(["date","time","field","venue"]);
  const ROLES=Object.freeze(["ผู้ตัดสิน","ผู้ช่วยผู้ตัดสิน","ผู้บันทึกผล","ผู้จับเวลา","กรรมการสนาม","หัวหน้ากรรมการ","อื่น ๆ"]);
  function text(value,max=180){
    const x=String(value??"").trim();
    if(x.length>max || /[\x00-\x1f\x7f]/.test(x))throw Error("กรุณาตรวจความยาวและข้อความที่กรอก");
    return x;
  }
  function date(value){
    if(!value)return "";
    const s=text(value,10),m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if(!m)throw Error("รูปแบบวันที่ไม่ถูกต้อง");
    const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
    if(d.getUTCFullYear()!==+m[1] || d.getUTCMonth()+1!==+m[2] || d.getUTCDate()!==+m[3])
      throw Error("วันที่ไม่ถูกต้อง");
    return s;
  }
  function time(value){
    if(!value)return "";
    const s=text(value,5),m=/^(\d{2}):(\d{2})$/.exec(s);
    if(!m || +m[1]>23 || +m[2]>59)throw Error("เวลาไม่ถูกต้อง");
    return s;
  }
  function baseline(f){
    if(!f || typeof f.id!=="string" || !f.id || !["match","track_event"].includes(f.kind))
      throw Error("รายการแข่งขันไม่ถูกต้อง");
    return {
      date:String(f.planning_date_confirmation==="confirmed"?f.planning_date||"":f.draft_date||f.source_pdf?.source_date_iso||""),
      time:String(f.planning_time_confirmation==="confirmed"?f.planning_time||"":f.draft_time||f.source_pdf?.source_time||""),
      field:String(f.planning_field||f.draft_field||f.source_pdf?.source_field||""),
      venue:String(f.planning_venue||"")
    };
  }
  function cleanFields(v){
    return {date:date(v.date),time:time(v.time),field:text(v.field,160),venue:text(v.venue,200)};
  }
  function assignment(input,schools){
    const name=text(input.person_name,120);
    const schoolId=text(input.school_id,64);
    const role=text(input.role,48);
    if(name.length<3 || !schoolId || !schools.some(s=>s.id===schoolId) || !ROLES.includes(role))
      throw Error("กรุณาระบุชื่อ โรงเรียน และหน้าที่ของกรรมการร่าง");
    if(!input.starts_at || !input.ends_at)throw Error("ระบุช่วงเวลาปฏิบัติหน้าที่ให้ครบ เพื่อช่วยตรวจเวลาทับซ้อน");
    const start=time(input.starts_at),end=time(input.ends_at);
    if(end<=start)throw Error("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้นในวันเดียวกัน");
    return {person_name:name,school_id:schoolId,role,starts_at:start,ends_at:end,
      identity_status:"unverified_name_from_operator",
      appointment_status:"draft_not_appointed"};
  }
  function proposal(f,values,staff,note){
    const original=cleanFields(baseline(f)),updated=cleanFields(values);
    const changes={};
    FIELDS.forEach(k=>{if(original[k]!==updated[k])changes[k]=updated[k];});
    const assignments=(staff||[]).map(x=>({...x}));
    if(!Object.keys(changes).length&&!assignments.length)
      throw Error("ยังไม่มีรายการเปลี่ยนแปลงหรือกรรมการร่างที่จะเสนอ");
    const reason=text(note,500);
    if(reason.length<8)throw Error("โปรดระบุเหตุผลหรือที่มาของคำขออย่างน้อย 8 ตัวอักษร");
    return {
      fixture_id:f.id,kind:f.kind,sport_id:f.sport_id,
      division:String(f.division||""),source_match_no:String(f.source_match_no||""),
      source_pdf_page:f.source_pdf?.page||f.source_page||null,
      status:"proposed_not_submitted",
      original,changes,assignment_proposals:assignments,reason
    };
  }
  function conflicts(items){
    // This is a warning about matching NAME+SCHOOL strings, not proof of identity.
    // Only overlapping assignments with the same explicit date can be compared.
    const rows=[];
    for(const p of items){
      const d=p.changes.date!==undefined?p.changes.date:p.original.date;
      for(const a of p.assignment_proposals||[]){
        if(d && a.starts_at && a.ends_at)
          rows.push({fixture_id:p.fixture_id,date:d,...a});
      }
    }
    const warnings=[];
    for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
      const a=rows[i],b=rows[j];
      if(a.fixture_id===b.fixture_id || a.date!==b.date || a.school_id!==b.school_id)continue;
      if(a.person_name.trim().toLocaleLowerCase("th")!==b.person_name.trim().toLocaleLowerCase("th"))continue;
      if(a.starts_at<b.ends_at&&b.starts_at<a.ends_at)
        warnings.push({fixture_a:a.fixture_id,fixture_b:b.fixture_id,date:a.date,
          kind:"possible_same_name_time_overlap"});
    }
    return warnings;
  }
  function packageForReview(items){
    if(!Array.isArray(items)||!items.length)throw Error("ยังไม่มีคำขอแก้ไข");
    const unique=new Set();
    for(const p of items){
      if(!p.fixture_id||unique.has(p.fixture_id))throw Error("รายการแข่งขันซ้ำหรือไม่มีรหัส");
      unique.add(p.fixture_id);
    }
    return {...CONTRACT,
      evidence_note:"เอกสารร่างจากเบราว์เซอร์เท่านั้น ต้องตรวจ source key กับ R33 รุ่นใช้งาน, ข้อมูลกรรมการ, สิทธิ์และผลรับรองก่อนดำเนินการ",
      warning:"ไฟล์นี้มีข้อมูลกรรมการที่ยังไม่รับรอง เก็บและส่งผ่านช่องทางส่วนตัวเท่านั้น",
      requests:items.map(x=>JSON.parse(JSON.stringify(x))),
      warnings:conflicts(items)
    };
  }
  root.NongkumR43Draft=Object.freeze({
    CONTRACT,ROLES,FIELDS,text,date,time,baseline,cleanFields,assignment,proposal,conflicts,packageForReview
  });
})(globalThis);
