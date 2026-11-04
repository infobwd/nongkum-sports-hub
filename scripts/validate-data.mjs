// P1 data contract and regression checks; no external dependencies.
// This validates completeness of rows extracted from the source PDF, NOT organizer approval.
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const data = JSON.parse(readFileSync(new URL("../data/draft-schedule.json", import.meta.url), "utf8"));
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const shared = readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");
const program = readFileSync(new URL("../js/program.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../css/base.css", import.meta.url), "utf8")+
  readFileSync(new URL("../css/program.css", import.meta.url), "utf8");
const sourceDivisions = JSON.parse(readFileSync(new URL("../data/competition-divisions-2569-draft.json", import.meta.url), "utf8"));
const issues = [];
const check = (condition, reason) => { if (!condition) issues.push(reason); };

const count = (arr, key) => arr.reduce((acc, x) => (acc[x[key]] = (acc[x[key]] || 0) + 1, acc), {});
const matches = data.fixtures.filter((x) => x.kind === "match");
const athletics = data.fixtures.filter((x) => x.kind === "track_event");
const lanes = athletics.flatMap((x) => x.lanes || []);
const sportTotals = count(matches, "sport_id");
const expectedSports = {football:20,shootout:7,futsal:14,volleyball:20,takraw:29,petanque:58,tabletennis:16,tugofwar:22};
const matchPageTotals = count(matches, "source_page");
const expectedMatchPages = {7:20,8:7,9:14,11:20,12:10,13:19,14:14,17:32,18:12,20:16,22:22};
const athleticPageTotals = count(athletics, "source_page");
const expectedAthleticPages = {23:6,24:4,25:3,26:3,27:3,28:3,29:3,30:3,31:5,32:5,33:3,34:5,35:4};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

check(data.schema_version === 2, "wrong P1 schema version");
check(data.metadata.source_pages === 40, "source pages must equal 40");
check(data.metadata.partial_import === false, "P1 rows must not still claim partial import");
check(data.metadata.status === "prototype" && data.metadata.all_data_approved === false, "public draft safety labels missing");
check(data.metadata.last_approved_at === null, "draft dataset cannot have approval timestamp");
check(data.schools.length === 8 && data.sports.length === 9, "school or sport navigation count changed");
check(matches.length === 186 && athletics.length === 50 && lanes.length === 289, "PDF source counts mismatch");
check(data.fixtures.length === 236 && data.metadata.source_item_count === 236, "total events mismatch");
check(data.metadata.count_matches === matches.length && data.metadata.count_athletics_events === athletics.length && data.metadata.count_athletics_lanes === lanes.length, "metadata counts mismatch");
check(same(sportTotals, expectedSports), "matches per sport no longer match source PDF");
check(same(matchPageTotals, expectedMatchPages), "match rows per page no longer match source PDF");
check(same(athleticPageTotals, expectedAthleticPages), "athletics events per page no longer match source PDF");
check(data.page_inventory.length === 40 && data.page_inventory.every((r,i)=>r.page===i+1), "all 40 source pages must be cataloged");
check(data.page_inventory.every(r=>r.match_count===(matchPageTotals[r.page]||0)&&r.athletics_event_count===(athleticPageTotals[r.page]||0)), "page inventory counts inconsistent");
const uniqueIds = data.fixtures.map(x=>x.id);
check(new Set(uniqueIds).size===uniqueIds.length,"duplicate stable event IDs");
const schools = new Set(data.schools.map(x=>x.id));
const sports = new Set(data.sports.map(x=>x.id));
for(const e of data.fixtures){
  check(e.status === "draft" && e.review_status === "draft",e.id+": event must remain draft");
  check(e.date === null,e.id+": unverified date cannot be published");
  check(Number.isInteger(e.source_page) && e.source_page>=1 && e.source_page<=40,e.id+": source_page invalid");
  check(sports.has(e.sport_id),e.id+": unrecognized sport");
  check(/^\d+$/.test(e.source_match_no),e.id+": original number absent");
  if(e.time)check(/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time),e.id+": malformed time");
  if(e.kind==="match"){
    check(typeof e.source_pair_text==="string" && !!e.source_pair_text.trim(),e.id+": original pair text missing");
    for(const side of ["a","b"])if(e["team_"+side+"_id"])check(schools.has(e["team_"+side+"_id"]),e.id+": invalid school "+side);
  } else {
    check(e.sport_id==="athletics" && Array.isArray(e.lanes) && e.lanes.length>0,e.id+": invalid athletics lanes");
    check(new Set(e.lanes.map(l=>l.lane)).size===e.lanes.length,e.id+": duplicate lane");
    for(const lane of e.lanes){
      if(lane.school_id)check(schools.has(lane.school_id),e.id+": invalid lane school");
      if(lane.source_school_label.startsWith("ศูนย์"))check(lane.school_id===null,e.id+": center must not be mistaken for a school");
      if(lane.vacant)check(lane.source_school_label==="-",e.id+": blank lane must keep original dash");
    }
  }
}
const duplicatedTrackNums=Object.entries(count(athletics,"source_match_no")).filter(([number,total])=>total>1).map(([number])=>number).sort();
check(same(duplicatedTrackNums,["35","48"]),"source athletics duplicate numbers 35/48 must remain visible until reviewed");
check(matches.filter(x=>x.sport_id==="football"&&x.source_match_no==="18").length===2,"football pair 18 double reference missing");
check(matches.find(x=>x.sport_id==="takraw"&&x.source_match_no==="24")?.qa_flags?.includes("QA-05"),"takraw match 24 QA warning missing");
check(matches.some(x=>x.sport_id==="petanque"&&x.qa_flags?.includes("QA-06")),"petanque conflict warning missing");
check(athletics.filter(x=>x.source_match_no==="35").every(x=>x.qa_flags?.includes("QA-07")),"athletics duplicate 35 warning missing");
check(athletics.filter(x=>x.source_match_no==="48").every(x=>x.qa_flags?.includes("QA-08")),"athletics duplicate 48 warning missing");
check(!data.fixtures.some(x=>Object.hasOwn(x,"athlete_name")||Object.hasOwn(x,"birth_date")),"no student PII in public draft JSON");

check(data.metadata.event_display_name==="มิตรภาพเกม","event name must be corrected to มิตรภาพเกม");
check(html.includes('src="./js/program.js"') && html.includes('href="./css/program.css"'),"external program assets missing");
for(const [name,source] of [["shared.js",shared],["program.js",program]]){
  try{new Script(source,{filename:name});}catch(e){issues.push("JavaScript syntax "+name+": "+e.message);}
}
check((html+program).includes("ยังไม่ผ่านการรับรอง"),"draft warning must remain prominent");
check(program.includes("m.lanes") && program.includes("source_team_a_label"),"athletics and bracket support missing");
check(css.includes("@media") && css.includes("safe-area-inset-top"),"mobile CSS or iPhone safe area missing");
const listedDivisions=sourceDivisions.divisions;
check(listedDivisions.length===33 && sourceDivisions.metadata.catalog_count===33,"all 33 numbered sport categories required");
check(sourceDivisions.metadata.status==="draft" && sourceDivisions.metadata.all_data_approved===false,"division list cannot be approved");
check(listedDivisions.every((d,i)=>d.source_catalog_no===i+1&&d.source_page>=1&&d.source_page<=6),"division numbering/page mapping mismatch");
const expectedEntrants=[6,2,2,8,7,2,6,6,2,2,8,7,2,2,8,8,8,8,8,8,8,8,2,2,8,8,2,2,8,8,7,2,2];
check(listedDivisions.every((d,i)=>d.participants.length===expectedEntrants[i]),"division entrant rows mismatch source");
check(listedDivisions.reduce((n,d)=>n+d.participants.length,0)===177,"division entrants must total 177");
check(listedDivisions.every(d=>d.review_status==="draft"&&sports.has(d.sport_id)),"division approval/sport invalid");
for(const d of listedDivisions){
  for(const p of d.participants){
    check(p.school_id&&schools.has(p.school_id),"unmapped entrant in numbered division "+d.source_catalog_no);
    check(p.source_position>=1&&p.source_position<=8, "seed position out of range");
  }
}
const groupedNumbers=listedDivisions.filter(d=>d.entry_type==="แบ่งสาย").map(d=>d.source_catalog_no);
check(same(groupedNumbers,[5,7,8,11,12]),"group A/B source division list missing");
check(listedDivisions.find(d=>d.source_catalog_no===19)?.participants.filter(p=>p.school_id==="phuphrom").length===2,"petanque duplicate team in source must stay visible");

if(issues.length){console.error("FAIL ("+issues.length+"):\n"+issues.join("\n"));process.exitCode=1;}
else console.log("PASS: 40 PDF pages | 33 sport divisions, 177 entries | 186 matches | 50 athletics events | 289 lanes | 236 draft program records | HTML syntax/draft checks");
