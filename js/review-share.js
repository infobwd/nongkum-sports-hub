/* R12: candidate-PDF share text and stable short route; never publish it as official. */
(function(root){
  "use strict";
  const ROOT="https://infobwd.github.io/nongkum-sports-hub/";
  function code(id){
    let hash=2166136261;
    for(let i=0;i<id.length;i++)hash=Math.imul(hash^id.charCodeAt(i),16777619)>>>0;
    return "f"+hash.toString(16).padStart(8,"0");
  }
  function link(id){return ROOT+"r/"+code(String(id))+"/?v=14";}
  function value(input){return String(input==null||String(input).trim()===""?"ไม่ระบุ":input);}
  const MONTHS=["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  function scheduleDate(f){
    const raw=String(f.source_pdf?.source_date_text||"");
    if(/(?:พ\.ย\.\s*68|2568)/.test(raw))return "รอยืนยัน (ปีในสูจิบัตรไม่ตรง)";
    const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(f.source_pdf?.source_date_iso||""));
    return iso ? Number(iso[3])+" "+MONTHS[Number(iso[2])]+" "+(Number(iso[1])+543) : raw||"รอกำหนด";
  }
  function payload(f,sportName){
    const topic=value(sportName||f.sport_id).trim()+(f.division?" "+f.division:"");
    const number=(f.kind==="track_event"?"รายการที่ ":"คู่ที่ ")+value(f.source_match_no);
    const pairing=f.kind==="track_event"
      ? value(f.name||f.source_title)
      : value(f.source_team_a_label||"รอคู่แข่งขัน")+" พบ "+value(f.source_team_b_label||"รอคู่แข่งขัน");
    const date=scheduleDate(f),time=value(f.source_pdf?.source_time),field=value(f.source_pdf?.source_field);
    const page=value(f.source_pdf?.page||f.source_page),url=link(f.id);
    const title=topic+" · "+number;
    const text=[
      "🏆 มิตรภาพเกมส์ 2569",
      topic+" | "+number,
      pairing,
      "",
      "วันแข่งขัน: "+date,
      "เวลา: "+(time==="ไม่ระบุ"?"รอกำหนด":time+" น."),
      "สนาม: "+(field==="ไม่ระบุ"?"รอกำหนด":field),
      "สูจิบัตร หน้า "+page,
      "",
      "โปรดตรวจสอบการเปลี่ยนแปลงล่าสุดจากลิงก์"
    ].join("\n");
    return {title,text,url,fullText:text+"\n"+url};
  }
  root.NongkumReviewShare=Object.freeze({code,link,payload});
})(globalThis);
