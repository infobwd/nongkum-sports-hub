/* R16: presentation-only chronological ordering for the published draft schedule.
   Never mutate source fixtures, approval flags, IDs, PDF references or share URLs. */
(function(root){
  "use strict";
  const MONTHS=["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const WEEKDAYS=["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
  function validIso(value){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
    if(!match)return "";
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    if(year<2000||year>2100||month<1||month>12||day<1||day>31)return "";
    const date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()+1===month&&date.getUTCDate()===day
      ? match[0] : "";
  }
  function sourceYearNeedsReview(fixture){
    const text=String(fixture.source_pdf?.source_date_text||"");
    return /(?:พ\.ย\.\s*68|2568)/.test(text);
  }
  function effectiveDay(fixture){
    // A committee-confirmed planning date takes priority. PDF text itself stays intact.
    if(fixture.planning_date_confirmation==="confirmed"){
      const approved=validIso(fixture.planning_date);
      if(approved)return approved;
    }
    // The three source rows labeled 2568 must not be silently converted to 2569.
    if(sourceYearNeedsReview(fixture))return "";
    return validIso(fixture.source_pdf?.source_date_iso||fixture.date||"");
  }
  function timeMinutes(fixture){
    const time=String((fixture.planning_time_confirmation==="confirmed"&&fixture.planning_time)||fixture.source_pdf?.source_time||fixture.time||"").trim();
    const match=/^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time);
    if(!match)return Number.POSITIVE_INFINITY;
    const hour=Number(match[1]),minute=Number(match[2]);
    return hour<=23&&minute<=59 ? hour*60+minute : Number.POSITIVE_INFINITY;
  }
  function compareFixtures(a,b,sportOrder){
    const aDay=effectiveDay(a),bDay=effectiveDay(b);
    if(!aDay)return bDay?1:0;
    if(!bDay)return -1;
    if(aDay!==bDay)return aDay<bDay?-1:1;
    const aTime=timeMinutes(a),bTime=timeMinutes(b);
    if(aTime!==bTime)return aTime-bTime;
    const aSport=sportOrder.get(a.sport_id)??Number.MAX_SAFE_INTEGER;
    const bSport=sportOrder.get(b.sport_id)??Number.MAX_SAFE_INTEGER;
    if(aSport!==bSport)return aSport-bSport;
    const aDivision=String(a.division||""),bDivision=String(b.division||"");
    const divisionCompare=aDivision.localeCompare(bDivision,"th");
    if(divisionCompare)return divisionCompare;
    const aNo=Number(a.source_match_no),bNo=Number(b.source_match_no);
    if(Number.isFinite(aNo)&&Number.isFinite(bNo)&&aNo!==bNo)return aNo-bNo;
    return String(a.id||"").localeCompare(String(b.id||""),"th");
  }
  function sortedFixtures(fixtures,sports){
    const sportOrder=new Map((sports||[]).map((sport,index)=>[sport.id,index]));
    return fixtures.map((fixture,index)=>({fixture,index}))
      .sort((a,b)=>compareFixtures(a.fixture,b.fixture,sportOrder)||a.index-b.index)
      .map(entry=>entry.fixture);
  }
  function formatDayLabel(day){
    if(!day)return "รอยืนยันวันแข่งขัน";
    const date=new Date(day+"T12:00:00Z");
    const parts=day.split("-").map(Number);
    return "วัน"+WEEKDAYS[date.getUTCDay()]+"ที่ "+parts[2]+" "+MONTHS[parts[1]]+" "+(parts[0]+543);
  }
  function groupVisible(fixtures){
    const groups=[];
    for(const fixture of fixtures){
      const day=effectiveDay(fixture);
      let group=groups[groups.length-1];
      if(!group||group.day!==day){
        group={day,label:formatDayLabel(day),fixtures:[]};
        groups.push(group);
      }
      group.fixtures.push(fixture);
    }
    return groups;
  }
  root.NongkumScheduleOrder=Object.freeze({
    effectiveDay,timeMinutes,sortedFixtures,groupVisible,formatDayLabel
  });
})(globalThis);
