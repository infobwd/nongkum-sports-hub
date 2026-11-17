/* R46: public, read-only schedule text for LINE, all schools and all sports.
 * Keep candidate field approvals distinct; never infer results or fixture confirmations.
 */
(function(root){
  "use strict";
  const ORDER=root.NongkumScheduleOrder;
  const MAX_ROWS=12,MAX_CHARS=2400;
  const MONTHS=["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  function clean(value){return String(value==null?"":value).replace(/[\r\n\t]+/g," ").trim();}
  function validDay(value){
    if(value==="unknown")return value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return "";
    const date=new Date(value+"T12:00:00Z");
    return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value?value:"";
  }
  function schoolInFixture(item,id){
    if(!id)return true;
    if(item.team_a_id===id||item.team_b_id===id)return true;
    return item.kind==="track_event"&&(item.lanes||[]).some(lane=>lane.school_id===id&&!lane.vacant);
  }
  function shortUrl(filters,baseHref){
    const u=new URL("t/",new URL("index.html",baseHref||"https://infobwd.github.io/nongkum-sports-hub/"));
    const code=root.NongkumScheduleLinkCodec?.encode(filters);
    if(code){u.searchParams.set("c",code);return u.toString();}
    // Legacy query remains available for arbitrary free-text searches or dates outside codec range.
    if(filters.school)u.searchParams.set("s",filters.school);
    if(filters.sport)u.searchParams.set("g",filters.sport);
    if(filters.level)u.searchParams.set("l",filters.level);
    if(filters.query)u.searchParams.set("q",filters.query);
    const day=validDay(filters.day);
    if(day==="unknown")u.searchParams.set("d","u");
    else if(day)u.searchParams.set("d",day.slice(2).replace(/-/g,""));
    else u.searchParams.set("a","1");
    if(filters.resultMode==="all")u.searchParams.set("r","a");
    return u.toString();
  }
  function getTime(item){
    const confirmed=item.planning_time_confirmation==="confirmed"&&!!item.planning_time;
    const raw=clean(confirmed?item.planning_time:(item.source_pdf?.source_time||item.time));
    const match=/^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(raw);
    if(!match||Number(match[1])>23||Number(match[2])>59)return "เวลารอยืนยัน";
    return String(Number(match[1])).padStart(2,"0")+"."+match[2]+" น.";
  }
  function dayLabel(day){
    if(!day)return "วันแข่งขันรอยืนยัน";
    return ORDER?.formatDayLabel(day)||day;
  }
  function description(item,schools,selectedSchool){
    if(item.kind==="track_event"){
      const name=clean(item.name||item.source_title)||"รายการกรีฑา";
      const lanes=(item.lanes||[]).filter(lane=>!lane.vacant&&(!selectedSchool||lane.school_id===selectedSchool));
      const notes=lanes.map(lane=>{
        const owner=schools.find(s=>s.id===lane.school_id);
        return "ลู่ "+clean(lane.lane)+(selectedSchool?"":" "+(owner?.short||clean(lane.source_school_label)||"ไม่ระบุโรงเรียน"));
      });
      return name+(notes.length?" · "+notes.join(", "):" · ตรวจรายละเอียดลู่ในแอป");
    }
    const team=id=>schools.find(s=>s.id===id);
    const a=team(item.team_a_id),b=team(item.team_b_id);
    const teamA=clean(a?.short||item.source_team_a_label)||"รอระบุทีม";
    const teamB=clean(b?.short||item.source_team_b_label)||"รอระบุทีม";
    return teamA+" พบ "+teamB;
  }
  function fieldNote(item){
    const main=clean(item.planning_venue_confirmation==="confirmed"?item.planning_venue:"");
    const child=clean(item.source_pdf?.source_field||item.field);
    if(!child||child===main)return "";
    return " · "+child;
  }
  function line(item,data,selectedSchool){
    const sport=data.sports.find(s=>s.id===item.sport_id);
    if(!sport)throw Error("Unknown sport");
    const label=clean(sport.name)+" "+clean(item.division);
    return getTime(item)+" | "+label+" · "+description(item,data.schools,selectedSchool)+
      fieldNote(item);
  }
  function makeParts(options){
    const data=options?.data;
    if(!data||!Array.isArray(data.schools)||!Array.isArray(data.sports)||!Array.isArray(options.fixtures))
      throw Error("Missing public schedule");
    const schoolId=options.school||"",sportId=options.sport||"";
    const selected=data.schools.find(s=>s.id===schoolId);
    if(schoolId&&!selected)throw Error("Unknown school");
    const sport=data.sports.find(s=>s.id===sportId);
    if(sportId&&!sport)throw Error("Unknown sport");
    const all=ORDER.sortedFixtures(options.fixtures.filter(f=>schoolInFixture(f,schoolId)),data.sports);
    if(!all.length)return {parts:[],count:0,url:""};
    const day=validDay(options.day||"");
    const link=shortUrl({school:schoolId,sport:sportId,level:options.level||"",query:options.query||"",
      day,resultMode:options.resultMode||"pending"},options.baseHref);
    const schoolTitle=selected?.name||"ทุกโรงเรียน";
    const filterInfo=(sport?sport.name:"ทุกกีฬา")+(options.level?" · "+({early:"ปฐมวัย",primary:"ประถม",secondary:"มัธยม"}[options.level]||""):"");
    const title="ตารางการแข่งขัน · มิตรภาพเกมส์ 2569";
    const hasUnconfirmed=all.some(f=>f.planning_date_confirmation!=="confirmed"||
      f.planning_time_confirmation!=="confirmed"||
      (f.source_pdf?.source_field&&f.planning_subvenue_confirmation!=="confirmed"));
    const notices=[
      ...(hasUnconfirmed?["หมายเหตุ: บางรายการยังมีข้อมูลกำหนดการแข่งขันที่รอตรวจสอบในระบบ"]:[]),
      "คู่แข่งขันตามตารางที่แสดง ไม่ใช่ผลการแข่งขัน",
      ...(options.resultMode==="pending"&&!options.resultsVerified?["ไม่สามารถตรวจผลรับรองล่าสุดได้ จึงยังแสดงรายการทั้งหมด"]:[]),
      "เปิดตารางล่าสุดในแอป:\n"+link
    ];
    // The common confirmed venue is shown once; draft subvenues remain per fixture.
    const venues=[...new Set(all.map(f=>f.planning_venue_confirmation==="confirmed"?clean(f.planning_venue):""))];
    const venue=venues.length===1&&venues[0]?"สนามหลัก: "+venues[0]:"ตรวจสนามแข่งขันของแต่ละรายการในแอป";
    const entries=all.map(f=>({day:ORDER.effectiveDay(f)||"",text:line(f,data,schoolId)}));
    const chunks=[];
    let current=[],size=0,previousDay=null;
    for(const entry of entries){
      const dayText=entry.day!==previousDay?"\n"+dayLabel(entry.day)+"\n":"";
      const segment=dayText+entry.text+"\n";
      if(current.length&&(current.length>=MAX_ROWS||size+segment.length>MAX_CHARS)){
        chunks.push(current);current=[];size=0;previousDay=null;
      }
      const dayPrefix=entry.day!==previousDay?"\n"+dayLabel(entry.day)+"\n":"";
      const txt=dayPrefix+entry.text;
      current.push({day:entry.day,text:txt});size+=txt.length+1;previousDay=entry.day;
    }
    if(current.length)chunks.push(current);
    const parts=chunks.map((chunk,i)=>{
      const head=[title,"โรงเรียน: "+schoolTitle,"กีฬา: "+filterInfo,
        "แสดง: "+(options.resultMode==="all"?"ทุกรายการ":"รายการที่ยังไม่มีผลรับรอง"),
        "จำนวนทั้งหมด "+all.length+" รายการ"+(chunks.length>1?" · ตอนที่ "+(i+1)+"/"+chunks.length:""),
        venue,""];
      return head.join("\n")+chunk.map(e=>e.text).join("\n")+"\n\n"+notices.join("\n");
    });
    return {parts,count:all.length,url:link,schoolTitle,filterInfo,partCount:parts.length,
      rowsPerPart:chunks.map(chunk=>chunk.length)};
  }
  async function send(text){
    if(typeof navigator!=="undefined"&&typeof navigator.share==="function"){
      try{await navigator.share({text});return "shared";}
      catch(error){if(error?.name==="AbortError")return "cancelled";}
    }
    if(typeof navigator!=="undefined"&&navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);return "copied";
    }
    return "unavailable";
  }
  root.NongkumScheduleBulkShare=Object.freeze({makeParts,shortUrl,validDay,schoolInFixture,send});
})(globalThis);
