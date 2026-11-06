/* R15-C: strict public-result validation. Synthetic tests only; never infer missing official scores. */
import {createRequire} from "node:module";
import {createHash} from "node:crypto";
const require=createRequire(import.meta.url);
const engine=require("../../js/standings-engine.js");
const isInt=v=>Number.isInteger(v)&&v>=0;
const string=v=>typeof v==="string"&&v.trim().length>0;
const digest=value=>createHash("sha256").update(engine.canonical(value),"utf8").digest("hex");
const SCORE_SPORTS=new Set(["football","shootout","futsal"]);
const SET_SPORTS=new Set(["volleyball","takraw","petanque","tabletennis"]);
const PERSON_FIELDS=new Set(["student_name","student_id","athlete_name","athlete_id","recorded_by","approved_by","evidence_link","evidence_url","approver_email","phone","email"]);
export function validatePublication(data,program,rules,{previous=null}={}){
  const issues=[],error=(code,message)=>issues.push({code,message});
  if(!data||data.schema_version!==1||!data.metadata||!Array.isArray(data.results)||!Array.isArray(data.schools)||!Array.isArray(data.sports)){
    return [{code:"SCHEMA",message:"public-results schema_version 1, metadata, schools, sports and results required"}];
  }
  const m=data.metadata;
  if(m.approved_only!==true)error("GATE","approved_only must be true");
  if(m.approved_results_count!==data.results.length)error("COUNT","approved_results_count differs from results length");
  if(!["published","empty"].includes(m.publication_status)||m.publication_status!==(data.results.length?"published":"empty"))error("PUBLICATION_STATUS","publication_status mismatch");
  if(data.results.length&&(!string(m.published_at)||Number.isNaN(Date.parse(m.published_at))))error("PUBLISHED_AT","published_at required for published results");
  if(!program||!Array.isArray(program.fixtures)||program.schema_version!==3)error("PROGRAM","verified program source required");
  if(!rules||rules.schema_version!==1||!string(rules.rules_version))error("RULES_VERSION","versioned rules required");
  if(rules?.source?.candidate_source_sha256!==program?.metadata?.source_sha256)error("SOURCE_DIGEST","rules point to a different candidate PDF source digest");
  if(rules?.football_league&&program?.fixtures){
    try{engine.assertFootballPhaseMapping(program.fixtures,rules.football_league);}
    catch(e){error("FOOTBALL_MAPPING",e.message);}
    const leagueRule=rules.football_league;
    if(leagueRule.tie_break_status==="approved"){
      if(!Array.isArray(leagueRule.tie_breakers)||leagueRule.tie_breakers.length!==1||
         leagueRule.tie_breakers[0]!=="head_to_head_goal_difference"||
         leagueRule.tie_break_scope!=="mutual_matches_among_equal_points_teams")
        error("FOOTBALL_TIE_BREAK","approved tie-break must be mutual head-to-head goal difference only");
      if(leagueRule.tie_break_source?.kind!=="organizer_instruction"||
         !string(leagueRule.tie_break_source.date)||!string(leagueRule.tie_break_source.source_ref))
        error("FOOTBALL_TIE_BREAK_SOURCE","approved head-to-head rule needs traceable organizer instruction");
    }
    if(leagueRule.approval_status==="approved"&&leagueRule.tie_break_status!=="approved")
      error("FOOTBALL_TIE_BREAK_PENDING","full football approval cannot bypass tie-break approval");
  }
  const petPolicy=(rules?.sport_policies||[]).find(p=>p.sport_id==="petanque");
  if(petPolicy?.elimination_status==="approved"){
    if(petPolicy.format!=="knockout"||petPolicy.advancement!=="winner_only"||
       petPolicy.eliminated!=="loser"||petPolicy.loser_reentry!==false)
      error("PETANQUE_ELIMINATION","petanque must eliminate loser, advance only winner, without re-entry");
    if(petPolicy.elimination_source?.kind!=="organizer_instruction"||
       !string(petPolicy.elimination_source.date)||!string(petPolicy.elimination_source.source_ref))
      error("PETANQUE_ELIMINATION_SOURCE","confirmed petanque knockout needs organizer provenance");
    const petFixtures=(program?.fixtures||[]).filter(f=>f.sport_id==="petanque");
    const byDivision=new Map();
    for(const f of petFixtures){
      const phases=byDivision.get(f.division)||{first:0,semi:0,final:0,invalid:0};
      if(f.round==="รอบแรก")phases.first++;
      else if(f.round==="รองชนะเลิศ")phases.semi++;
      else if(f.round==="ชิงชนะเลิศ")phases.final++;
      else phases.invalid++;
      byDivision.set(f.division,phases);
    }
    const expectedEight=["ปฐมวัยชาย","ปฐมวัยหญิง","8 ปี ชาย","8 ปี หญิง","10 ปี ชาย","10 ปี หญิง","12 ปี ชาย","12 ปี หญิง"];
    const secondary=["มัธยมชาย","มัธยมหญิง"];
    if(petFixtures.length!==58||byDivision.size!==10||
       expectedEight.some(id=>{const p=byDivision.get(id);return !p||p.first!==4||p.semi!==2||p.final!==1||p.invalid;})||
       secondary.some(id=>{const p=byDivision.get(id);return !p||p.first!==0||p.semi!==0||p.final!==1||p.invalid;}))
      error("PETANQUE_BRACKET","candidate petanque knockout phases must stay 8*(4+2+1)+2 finals");
  }
  const sourceMap=new Map((program?.fixtures||[]).map(f=>[f.id,f]));
  const schoolIds=new Set(data.schools.map(s=>s.id)),sportIds=new Set(data.sports.map(s=>s.id));
  const types=new Map((rules?.sport_policies||[]).map(p=>[p.sport_id,p.result_type]));
  if(schoolIds.size!==data.schools.length||sportIds.size!==data.sports.length)error("CATALOG_DUPLICATE","school/sport IDs not unique");
  const resultIds=new Set(),sourceIds=new Set();
  for(const [i,r] of data.results.entries()){
    const prefix="results["+i+"] ";
    if(!r||typeof r!=="object"){error("RESULT_SCHEMA",prefix+"not an object");continue;}
    for(const key of Object.keys(r))if(PERSON_FIELDS.has(key))error("PUBLIC_PII",prefix+"private field: "+key);
    if(!string(r.id)||resultIds.has(r.id))error("RESULT_ID",prefix+"missing/duplicate id");
    resultIds.add(r.id);
    if(r.status!=="approved")error("NOT_APPROVED",prefix+"status must be approved");
    if(!Number.isInteger(r.revision)||r.revision<1)error("REVISION",prefix+"integer revision >=1 required");
    if(!sportIds.has(r.sport_id))error("SPORT",prefix+"unknown sport_id");
    if(r.result_type!==types.get(r.sport_id))error("RESULT_TYPE",prefix+"wrong result_type for sport");
    const isTrack=r.sport_id==="athletics";
    const key=isTrack?r.event_id:r.fixture_id;
    if(!string(key)||sourceIds.has(key))error("FIXTURE_DUPLICATE",prefix+"missing/duplicate fixture_id or event_id");
    sourceIds.add(key);
    const f=sourceMap.get(key);
    if(!f||f.sport_id!==r.sport_id||f.kind!==(isTrack?"track_event":"match")){error("FIXTURE",prefix+"source ID/kind/sport mismatch");continue;}
    if(r.division!==f.division)error("DIVISION",prefix+"division must match source");
    if(isTrack){
      if(r.result_type!=="ranking"||r.event_complete!==true||!Array.isArray(r.rankings)||!r.rankings.length){
        error("RANKING_INCOMPLETE",prefix+"whole event approval required");continue;
      }
      const seenRank=new Set(),seenSchool=new Set();
      for(const x of r.rankings){
        if(!x||!Number.isInteger(x.rank)||x.rank<1||seenRank.has(x.rank)||!schoolIds.has(x.school_id)||seenSchool.has(x.school_id))
          error("RANKING_ROW",prefix+"invalid, duplicated or unrecognized rank/school");
        if(x){seenRank.add(x.rank);seenSchool.add(x.school_id);for(const k of Object.keys(x))if(PERSON_FIELDS.has(k))error("PUBLIC_PII",prefix+"private ranking field");}
      }
      continue;
    }
    if(!string(f.team_a_id)||!string(f.team_b_id))error("PLACEHOLDER","unresolved bracket team: "+key);
    if(r.team_a_id!==f.team_a_id||r.team_b_id!==f.team_b_id||r.team_a_id===r.team_b_id||
       !schoolIds.has(r.team_a_id)||!schoolIds.has(r.team_b_id))error("TEAMS",prefix+"team order/ID disagrees with fixture");
    const a=r.team_a_id,b=r.team_b_id;
    if(r.sport_id==="football"){
      const cards=r.disciplinary_cards;
      const keysOk=cards&&typeof cards==="object"&&
        Object.keys(cards).length===2&&["team_a","team_b"].every(side=>
          cards[side]&&typeof cards[side]==="object"&&
          Object.keys(cards[side]).length===2&&
          isInt(cards[side].yellow)&&isInt(cards[side].red));
      if(!keysOk)error("DISCIPLINARY_CARDS",prefix+"explicit nonnegative yellow/red counts required for each team; missing is not zero");
    }
    if(SCORE_SPORTS.has(r.sport_id)){
      if(!isInt(r.score_a)||!isInt(r.score_b)){error("SCORE",prefix+"nonnegative integer scores required");continue;}
      const expected=r.score_a===r.score_b?null:r.score_a>r.score_b?a:b;
      if((r.winner_school_id||null)!==expected)error("WINNER",prefix+"winner mismatch/draw winner supplied");
      if(r.sport_id==="football"&&r.division==="12 ปี ชาย"&&rules?.football_league){
        const phase=rules.football_league.phases;
        if(phase?.playoff?.includes(key)||phase?.final?.includes(key)){
          error("PLACEHOLDER",prefix+"football playoff needs official participant mapping");
        }
      }
    }else if(SET_SPORTS.has(r.sport_id)){
      if(!Array.isArray(r.sets)||!r.sets.length||r.sets.some(s=>!s||!isInt(s.a)||!isInt(s.b)||s.a===s.b)){
        error("SETS",prefix+"set scores must be nonnegative integers without tied sets");continue;
      }
      const winsA=r.sets.filter(s=>s.a>s.b).length,winsB=r.sets.length-winsA;
      if(winsA===winsB||(r.winner_school_id||null)!==(winsA>winsB?a:b))error("WINNER",prefix+"winner not supported by set wins");
    }else if(r.sport_id==="tugofwar"){
      if(![a,b].includes(r.winner_school_id))error("WINNER",prefix+"knockout winner required");
    }
  }
  if(previous){
    const old=new Map((previous.results||[]).map(r=>[r.id,r]));
    const now=new Map(data.results.map(r=>[r.id,r]));
    const corrections=m.corrections||[],withdrawals=m.withdrawals||[];
    for(const [id,prev] of old){
      const next=now.get(id);
      if(!next){
        if(!withdrawals.some(w=>w.id===id&&w.prior_revision===prev.revision&&string(w.reason)))
          error("SILENT_REMOVAL","missing withdrawal audit for "+id);
      }else if(engine.canonical(prev)!==engine.canonical(next)){
        if(!Number.isInteger(next.revision)||next.revision<=prev.revision||
           !corrections.some(c=>c.result_id===id&&c.from_revision===prev.revision&&c.to_revision===next.revision&&string(c.reason)))
          error("SILENT_CORRECTION","missing revision increment/correction note for "+id);
      }
    }
  }
  return issues;
}
export function buildSnapshot(data,program,rules){
  const problems=validatePublication(data,program,rules);
  if(problems.length)throw Error(problems.map(x=>x.code+": "+x.message).join("\n"));
  const standings=[];
  const rule=rules.football_league;
  const sport=rules.sport_policies.find(x=>x.sport_id==="football");
  const footballLeagueIds=new Set(rule.phases.league);
  const hasApprovedLeagueResult=data.results.some(r=>r.status==="approved"&&
    r.sport_id==="football"&&footballLeagueIds.has(r.fixture_id));
  if(hasApprovedLeagueResult&&rule.approval_status==="approved"&&rule.tie_break_status==="approved"&&
     sport?.status==="implemented"){
    const group=engine.calculateLeague(program.fixtures,data.results,rule);
    // Only approved fixtures/rules can produce public standings. No made-up placements.
    standings.push({sport_id:"football",division:rule.division,...group});
  }
  return {schema_version:1,snapshot_version:"r15-c.1",source_digest:"sha256:"+digest(data),
    rules_version:rules.rules_version,rules_digest:"sha256:"+digest(rules),
    program_source_digest:"sha256:"+program.metadata.source_sha256,
    published_at:data.metadata.published_at||null,
    publication_status:standings.length?"published":"pending_rule_approval",
    standings};
}
export function validateSnapshot(snapshot,data,program,rules){
  const expected=buildSnapshot(data,program,rules);
  return engine.canonical(expected)===engine.canonical(snapshot)?[]:
    [{code:"SNAPSHOT_STALE",message:"standings do not match approved source digest, rules_version/rules_digest or deterministic output"}];
}
export {digest};
