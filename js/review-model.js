/* R11D read-only model for revised PDF preview. No storage or approval action. */
(function(root){
  "use strict";
  const SOURCE_PATH="./data/program-from-pdf-2569-20261104-draft.json";
  const DIFF_PATH="./data/reconciliation/r11a-program-diff-20261104.json";
  const REVISION="pdf69-20261104-draft-r11a";
  const THAI_MONTHS=["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  function hasQa(f){return Array.isArray(f.qa_flags)&&f.qa_flags.length>0;}
  function schoolMatches(f,id){
    if(!id)return true;
    if(f.kind==="track_event")return Array.isArray(f.lanes)&&f.lanes.some(l=>l.school_id===id);
    return f.team_a_id===id||f.team_b_id===id;
  }
  function searchMatches(f,q){
    const term=String(q||"").trim().toLocaleLowerCase();
    if(!term)return true;
    const fields=[
      f.id,f.source_match_no,f.sport_id,f.division,f.source_pair_text,
      f.source_team_a_label,f.source_team_b_label,f.name,f.source_title,f.round,
      f.draft_field,f.source_pdf&&f.source_pdf.source_date_text,
      ...(Array.isArray(f.lanes)?f.lanes.map(l=>l.source_school_label):[])
    ];
    return fields.some(x=>String(x??"").toLocaleLowerCase().includes(term));
  }
  function filterItems(data,filters,levelClassifier){
    const f=filters||{};
    return data.filter(x=>
      schoolMatches(x,f.school||"")&&
      (!f.sport||x.sport_id===f.sport)&&
      (!f.level||levelClassifier(x)===f.level)&&
      (!f.qaOnly||hasQa(x))&&
      searchMatches(x,f.search)
    );
  }
  function thaiDate(iso){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||""));
    if(!m)return String(iso||"");
    const month=Number(m[2]),day=Number(m[3]);
    if(month<1||month>12||day<1||day>31)return String(iso||"");
    return day+" "+THAI_MONTHS[month]+" "+(Number(m[1])+543);
  }
  function sourceDate(f){return f.source_pdf?.source_date_text||"ไม่ระบุ";}
  function sourceTime(f){return f.source_pdf?.source_time||"ไม่ระบุ";}
  function sourceField(f){return f.source_pdf?.source_field||"ไม่ระบุ";}
  function hasConfirmedPlanning(f){
    return f.planning_date_confirmation==="confirmed"&&
      f.planning_venue_confirmation==="confirmed"&&
      !!f.planning_date&&!!f.planning_venue;
  }
  function formatIssue(f,sportName){
    const lines=[
      "ขอแจ้งแก้ข้อมูลสูจิบัตรมิตรภาพเกม 2569 (R11D)",
      "Revision: "+REVISION,
      "Fixture ID: "+f.id,
      "กีฬา/รายการ: "+String(sportName||f.sport_id)+" / "+String(f.division||""),
      "เลขคู่/รายการ PDF: "+String(f.source_match_no||"ไม่ระบุ"),
      "หน้า PDF: "+String(f.source_page||"ไม่ระบุ"),
      "คู่/รายการตาม PDF: "+String(f.kind==="track_event"?(f.name||f.source_title):f.source_pair_text||"ไม่ระบุ"),
      "วันตาม PDF: "+sourceDate(f),
      "เวลาตาม PDF: "+sourceTime(f),
      "สนามตาม PDF: "+sourceField(f),
      "QA: "+(hasQa(f)?f.qa_flags.join(", "):"ไม่มีธงเฉพาะรายการ"),
      "จุดที่พบว่าผิด: ",
      "ข้อมูลที่ถูกต้อง: ",
      "หลักฐาน/คำยืนยันจากผู้จัด: "
    ];
    return lines.join("\n");
  }
  function validate(data){
    if(!data||data.schema_version!==3||!Array.isArray(data.fixtures)||
        !Array.isArray(data.schools)||!Array.isArray(data.sports))throw Error("รูปแบบข้อมูลสูจิบัตรไม่ถูกต้อง");
    const meta=data.metadata||{};
    if(meta.website_publication_status==="released"||meta.all_data_approved!==false)
      throw Error("หน้า R11D รองรับเฉพาะชุด PDF ร่างที่ยังไม่เผยแพร่");
    const ids=new Set();
    for(const f of data.fixtures){
      if(!f.id||ids.has(f.id)||f.status!=="draft"||f.date!==null||!f.source_pdf)
        throw Error("ตรวจรายการหรือสถานะไม่ผ่าน");
      ids.add(f.id);
    }
    if(data.fixtures.length!==237||data.fixtures.filter(x=>x.kind==="match").length!==187||
       data.fixtures.filter(x=>x.kind==="track_event").length!==50||
       data.fixtures.filter(x=>x.kind==="track_event").reduce((n,x)=>n+(x.lanes?.length||0),0)!==289)
      throw Error("จำนวนรายการไม่ตรงกับ PDF revision นี้");
    return data;
  }
  root.NongkumReviewModel=Object.freeze({
    SOURCE_PATH,DIFF_PATH,REVISION,hasQa,schoolMatches,searchMatches,filterItems,
    thaiDate,sourceDate,sourceTime,sourceField,hasConfirmedPlanning,formatIssue,validate
  });
})(globalThis);
