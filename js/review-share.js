/* R12: candidate-PDF share text and stable short route; never publish it as official. */
(function(root){
  "use strict";
  const ROOT="https://infobwd.github.io/nongkum-sports-hub/";
  function code(id){
    let hash=2166136261;
    for(let i=0;i<id.length;i++)hash=Math.imul(hash^id.charCodeAt(i),16777619)>>>0;
    return "f"+hash.toString(16).padStart(8,"0");
  }
  function link(id){return ROOT+"r/"+code(String(id))+"/";}
  function value(input){return String(input==null||String(input).trim()===""?"ไม่ระบุ":input);}
  function payload(f,sportName){
    const topic=value(sportName||f.sport_id)+(f.division?" "+f.division:"");
    const number=(f.kind==="track_event"?"รายการ ":"คู่ ")+value(f.source_match_no);
    const pairing=f.kind==="track_event"
      ? value(f.name||f.source_title)
      : value(f.source_team_a_label||"รอผลคู่ก่อนหน้า")+" พบ "+value(f.source_team_b_label||"รอผลคู่ก่อนหน้า");
    const date=value(f.source_pdf?.source_date_text);
    const time=value(f.source_pdf?.source_time);
    const field=value(f.source_pdf?.source_field);
    const page=value(f.source_pdf?.page||f.source_page);
    const url=link(f.id);
    const title=topic+" · "+number+" · "+pairing;
    const text=[
      "🏆 มิตรภาพเกม 2569 · ตรวจสูจิบัตรฉบับใหม่",
      topic+" | "+number,
      pairing,
      "📅 วันที่ตามสูจิบัตร: "+date,
      "🕒 เวลาในสูจิบัตร: "+time+(time==="ไม่ระบุ"?"":" น."),
      "📍 สนามตามสูจิบัตร: "+field,
      "📄 สูจิบัตรหน้า "+page,
      "⚠️ ข้อมูลร่างเพื่อการตรวจสอบ ไม่ใช่ประกาศการแข่งขันทางการ"
    ].join("\n");
    return {title,text,url,fullText:text+"\n🔗 เปิดดูคู่แข่งขัน: "+url};
  }
  root.NongkumReviewShare=Object.freeze({code,link,payload});
})(globalThis);
