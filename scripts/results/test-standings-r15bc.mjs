// R15-B/C synthetic data only. No example score is committed to public-results.json.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {validatePublication,buildSnapshot,validateSnapshot,digest} from "./standings-validation.mjs";
const require=createRequire(import.meta.url),engine=require("../../js/standings-engine.js");
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const data=read("data/public-results.json"),program=read("data/program-from-pdf-2569-20261104-draft.json");
const rules=read("data/standings-rules.json");
const clone=value=>structuredClone(value);
const league=rules.football_league,fixtures=program.fixtures;
function newResult(f,sa,sb,revision=1){
  return {id:"test-"+f.id,fixture_id:f.id,sport_id:f.sport_id,division:f.division,
    team_a_id:f.team_a_id,team_b_id:f.team_b_id,
    status:"approved",result_type:"score",score_a:sa,score_b:sb,
    winner_school_id:sa===sb?null:sa>sb?f.team_a_id:f.team_b_id,revision,
    ...(f.sport_id==="football"?{disciplinary_cards:{team_a:{yellow:0,red:0},team_b:{yellow:0,red:0}}}:{})};
}
function publish(rows){
  const d=clone(data);d.results=clone(rows);d.metadata.approved_results_count=rows.length;
  d.metadata.publication_status=rows.length?"published":"empty";
  d.metadata.published_at=rows.length?"2026-11-05T08:00:00Z":null;
  return d;
}
function codes(d,options={}){return validatePublication(d,program,rules,options).map(x=>x.code);}
const first=fixtures.find(f=>f.id===league.phases.league[0]);
const second=fixtures.find(f=>f.id===league.phases.league[1]);
const semi=fixtures.find(f=>f.id===league.phases.playoff[0]);
assert.equal(data.results.length,0,"live result file must still be empty");
assert.deepEqual(validatePublication(data,program,rules),[],"current empty publication valid");
assert.equal(league.phases.league.length,15);
assert.equal(league.phases.playoff.length,2);
assert.equal(league.phases.final.length,1);
assert.equal(league.team_ids.length,6);
assert.ok(league.phases.league.every(id=>!league.phases.playoff.includes(id)));
assert.ok(engine.assertFootballPhaseMapping(fixtures,league));
assert.throws(()=>engine.assertFootballPhaseMapping(fixtures,{...league,phases:{...league.phases,league:[...league.phases.league.slice(0,14),league.phases.playoff[0]]}}),/league fixture mismatch|15\+2\+1/);
const roster=engine.calculateLeague(fixtures,[],league);
assert.equal(roster.ranking_status,"prestart_roster");
assert.equal(roster.matches_total,15);assert.equal(roster.matches_approved,0);
assert.equal(roster.rows.length,6);
assert.ok(roster.rows.every(x=>x.played===0&&x.points===0&&x.goals_for===0&&x.goals_against===0&&x.position===null));
const win=newResult(first,2,0),draw=newResult(second,1,1);
const partial=engine.calculateLeague(fixtures,[win,draw],league);
assert.equal(partial.matches_approved,2);
assert.equal(partial.complete,false);
assert.equal(partial.ranking_status,"pending_rule_approval");
assert.equal(partial.rows.reduce((a,r)=>a+r.points,0),5,"3 win + 1 + 1 draw points");
assert.equal(partial.rows.reduce((a,r)=>a+r.goals_for,0),4,"all goals counted for");
assert.equal(partial.rows.reduce((a,r)=>a+r.goal_difference,0),0);
assert.ok(partial.rows.every(x=>x.position===null),"not official ranks before approval");
assert.equal(engine.calculateLeague(fixtures,[win,draw,{...newResult(semi,1,0),fixture_id:semi.id}],league).matches_approved,2,
  "playoff fixture excluded from league even when PDF round label says league");
assert.deepEqual(codes(publish([win,draw])),[]);
const wrongScore=publish([win]);wrongScore.results[0].score_a=-1;
assert.ok(codes(wrongScore).includes("SCORE"));
const wrongWinner=publish([win]);wrongWinner.results[0].winner_school_id=first.team_b_id;
assert.ok(codes(wrongWinner).includes("WINNER"));
const badDraw=publish([draw]);badDraw.results[0].winner_school_id=second.team_a_id;
assert.ok(codes(badDraw).includes("WINNER"));
const wrongSport=publish([win]);wrongSport.results[0].result_type="sets";
assert.ok(codes(wrongSport).includes("RESULT_TYPE"));
const unknownFixture=publish([win]);unknownFixture.results[0].fixture_id="unknown-test-only";
assert.ok(codes(unknownFixture).includes("FIXTURE"));
const changedTeams=publish([win]);changedTeams.results[0].team_a_id=first.team_b_id;
assert.ok(codes(changedTeams).includes("TEAMS"));
const nonApproved=publish([win]);nonApproved.results[0].status="review";
assert.ok(codes(nonApproved).includes("NOT_APPROVED"));
const invalidRevision=publish([win]);invalidRevision.results[0].revision=0;
assert.ok(codes(invalidRevision).includes("REVISION"));
const dup=publish([win,{...win,id:"test-extra"}]);
assert.ok(codes(dup).includes("FIXTURE_DUPLICATE"));
const unresolved=publish([{...win,id:"test-semi",fixture_id:semi.id,team_a_id:"nongkum",team_b_id:"wangdong"}]);
assert.ok(codes(unresolved).includes("PLACEHOLDER"));
const injected=publish([win]);injected.results[0].student_name="DO-NOT-PUBLISH";
assert.ok(codes(injected).includes("PUBLIC_PII"));
const wrongMetadata=publish([win]);wrongMetadata.metadata.approved_results_count=0;
assert.ok(codes(wrongMetadata).includes("COUNT"));
// Sets and score-specific validation remain generic until official points/sets are signed off.
const pet=fixtures.find(f=>f.sport_id==="petanque"&&f.team_a_id&&f.team_b_id);
const sets={id:"test-pet",fixture_id:pet.id,sport_id:"petanque",division:pet.division,team_a_id:pet.team_a_id,
  team_b_id:pet.team_b_id,status:"approved",result_type:"sets",sets:[{a:11,b:3}],
  winner_school_id:pet.team_a_id,revision:1};
assert.deepEqual(codes(publish([sets])),[]);
const badSet=publish([sets]);badSet.results[0].sets[0].b=11;
assert.ok(codes(badSet).includes("SETS"));
const wrongSetWinner=publish([sets]);wrongSetWinner.results[0].winner_school_id=pet.team_b_id;
assert.ok(codes(wrongSetWinner).includes("WINNER"));
const track=fixtures.find(f=>f.sport_id==="athletics");
const ranking={id:"test-track",event_id:track.id,sport_id:"athletics",division:track.division,
  result_type:"ranking",status:"approved",revision:1,event_complete:true,
  rankings:[{rank:1,school_id:"wangdong",mark:"12.6",unit:"s"},{rank:2,school_id:"nongkum",mark:"12.8",unit:"s"}]};
assert.deepEqual(codes(publish([ranking])),[]);
const partialRank=publish([ranking]);partialRank.results[0].event_complete=false;
assert.ok(codes(partialRank).includes("RANKING_INCOMPLETE"));
const repeatedRank=publish([ranking]);repeatedRank.results[0].rankings[1].rank=1;
assert.ok(codes(repeatedRank).includes("RANKING_ROW"));
// Correction audit: changed approved records must increment revision and carry a reason, removals must be explained.
const previous=publish([win]);
const silent=publish([{...win,score_a:3}]);
assert.ok(codes(silent,{previous}).includes("SILENT_CORRECTION"));
const corrected=publish([{...win,score_a:3,revision:2}]);
corrected.metadata.corrections=[{result_id:win.id,from_revision:1,to_revision:2,reason:"synthetic test correction"}];
assert.deepEqual(codes(corrected,{previous}),[]);
const removed=publish([]);
assert.ok(codes(removed,{previous}).includes("SILENT_REMOVAL"));
removed.metadata.withdrawals=[{id:win.id,prior_revision:1,reason:"synthetic withdrawal"}];
assert.deepEqual(codes(removed,{previous}),[]);
// Reproducible snapshot; no live ranking while ALL policies are pending approval.
const snapshot=buildSnapshot(data,program,rules);
assert.equal(snapshot.standings.length,0);
assert.equal(snapshot.publication_status,"pending_rule_approval");
assert.match(snapshot.source_digest,/^sha256:[a-f0-9]{64}$/);
assert.equal(snapshot.rules_version,rules.rules_version);
assert.deepEqual(validateSnapshot(snapshot,data,program,rules),[]);
const stale=clone(snapshot);stale.source_digest="sha256:bad";
assert.ok(validateSnapshot(stale,data,program,rules).some(x=>x.code==="SNAPSHOT_STALE"));
const staleRules=clone(snapshot);staleRules.rules_version="wrong";
assert.ok(validateSnapshot(staleRules,data,program,rules).length);
assert.equal(digest(data),digest(clone(data)));
// Approved-rule branch exists only in synthetic memory. No real committee approval implied.
const simulatedRules=clone(rules);
simulatedRules.football_league.approval_status="approved";
simulatedRules.football_league.tie_break_status="approved";
simulatedRules.football_league.tie_breakers=["head_to_head_goal_difference"];
simulatedRules.sport_policies.find(p=>p.sport_id==="football").status="implemented";
const simulatedSnapshot=buildSnapshot(publish([win,draw]),program,simulatedRules);
assert.equal(simulatedSnapshot.standings.length,1);
assert.equal(simulatedSnapshot.standings[0].matches_approved,2);
assert.equal(simulatedSnapshot.standings[0].ranking_status,"provisional");
assert.equal(simulatedSnapshot.standings[0].complete,false);
const knockoutFixture=fixtures.find(f=>f.sport_id==="futsal"&&f.team_a_id&&f.team_b_id);
const knockout=engine.calculateKnockout([knockoutFixture],[{...newResult(knockoutFixture,1,0),fixture_id:knockoutFixture.id}]);
assert.equal(knockout.final_positions,null,"knockout must not invent medal positions");
assert.equal(knockout.matches.length,1);
assert.equal(engine.calculateRankingEvent(ranking).rows.length,2);
assert.throws(()=>engine.calculateRankingEvent({...ranking,event_complete:false}),/complete/);

// R15-B/C follow-up 2026-11-06: organizer-approved H2H goal difference.
// These scores exist exclusively in tests; never write to public results.
const [ha,hb,hc,hd,he]=league.team_ids;
const activeH2H={...league,approval_status:"approved"};
function headMatch(team1,team2,goals1,goals2){
  const fixture=fixtures.find(f=>league.phases.league.includes(f.id)&&
    ((f.team_a_id===team1&&f.team_b_id===team2)||(f.team_a_id===team2&&f.team_b_id===team1)));
  assert.ok(fixture,"must have explicit real league fixture for test pair");
  return newResult(fixture,fixture.team_a_id===team1?goals1:goals2,
    fixture.team_a_id===team1?goals2:goals1);
}
assert.deepEqual(league.tie_breakers,["head_to_head_goal_difference"]);
assert.equal(league.tie_break_status,"approved");
assert.equal(league.approval_status,"pending_rule_approval",
  "confirming the tie-break alone cannot publish official standings");
const h2hTwo=engine.calculateLeague(fixtures,[
  headMatch(ha,hb,1,0), // A defeats B directly
  headMatch(hb,hc,9,0), // B has much better total goal difference
  headMatch(hd,ha,8,0), // A has much worse total goal difference
  headMatch(hd,he,1,0)  // D leads points; A and B both have 3
],activeH2H);
const rowTwo=id=>h2hTwo.rows.find(r=>r.team_id===id);
assert.equal(rowTwo(ha).points,3);assert.equal(rowTwo(hb).points,3);
assert.ok(rowTwo(ha).goal_difference<rowTwo(hb).goal_difference,
  "global GD opposes head-to-head; do not use global GD to decide");
assert.equal(rowTwo(ha).head_to_head_goal_difference,1);
assert.equal(rowTwo(hb).head_to_head_goal_difference,-1);
assert.ok(rowTwo(ha).position<rowTwo(hb).position,"H2H directly wins tie");
assert.equal(h2hTwo.ranking_status,"provisional","not all 15 fixtures approved");
const h2hThree=engine.calculateLeague(fixtures,[
  headMatch(ha,hb,2,0),headMatch(hb,hc,2,1),headMatch(hc,ha,1,0)
],activeH2H);
const rowThree=id=>h2hThree.rows.find(r=>r.team_id===id);
assert.equal(rowThree(ha).points,3);assert.equal(rowThree(hb).points,3);assert.equal(rowThree(hc).points,3);
assert.deepEqual([rowThree(ha).head_to_head_goal_difference,
  rowThree(hc).head_to_head_goal_difference,rowThree(hb).head_to_head_goal_difference],[1,0,-1]);
assert.deepEqual([rowThree(ha).position,rowThree(hc).position,rowThree(hb).position],[1,2,3],
  "three tied teams mini-table H2H GD only");
const incompleteH2H=engine.calculateLeague(fixtures,[
  headMatch(ha,hb,0,0),headMatch(ha,hc,0,0),headMatch(ha,hd,0,0)
],activeH2H);
const missingGroup=incompleteH2H.head_to_head_groups.find(g=>g.teams.length===3&&g.points===1);
assert.ok(missingGroup&&!missingGroup.complete&&missingGroup.required_matches===3);
assert.ok([hb,hc,hd].every(id=>incompleteH2H.rows.find(r=>r.team_id===id).position===null),
  "do not resolve multi-way tie before all mutual meetings");
const drawnH2H=engine.calculateLeague(fixtures,[headMatch(ha,hb,0,0)],activeH2H);
assert.ok([ha,hb].every(id=>drawnH2H.rows.find(r=>r.team_id===id).position===null),
  "a drawn direct match stays unresolved, not decided by overall GD or alphabet");
assert.throws(()=>engine.calculateLeague(fixtures,[headMatch(ha,hb,2,0)],
  {...activeH2H,tie_breakers:["goal_difference"]}),/unsupported official tie-break/);
const missingResultH2H=engine.calculateLeague(fixtures,[
  headMatch(ha,hb,1,0),headMatch(hb,hc,9,0),headMatch(hd,ha,8,0),headMatch(hd,he,1,0)
],league);
assert.ok(missingResultH2H.rows.every(r=>r.position===null),
  "production publication remains blocked when football approval is incomplete");

const badOfficialH2H=clone(rules);badOfficialH2H.football_league.tie_breakers=["goal_difference"];
assert.ok(validatePublication(data,program,badOfficialH2H).some(x=>x.code==="FOOTBALL_TIE_BREAK"),
  "a rules-only regression must fail CI before any results are published");
const noProvenanceH2H=clone(rules);delete noProvenanceH2H.football_league.tie_break_source;
assert.ok(validatePublication(data,program,noProvenanceH2H).some(x=>x.code==="FOOTBALL_TIE_BREAK_SOURCE"),
  "traceable organizer rule decision is required");
assert.equal(buildSnapshot(data,program,simulatedRules).standings.length,0,
  "never publish zero-result standings even if a future rule is fully approved");

// Organizer follow-up 2026-11-06: count yellow/red as separate auditable
// statistics without inventing a conversion/sort order. Petanque loser out.
assert.equal(rules.football_league.disciplinary_tie_break.status,
  "approved_count_cards_pending_method");
assert.equal(rules.football_league.disciplinary_tie_break.ranking_method,
  "pending_organizer_confirmation");
const recordedCards=newResult(first,2,0);
recordedCards.disciplinary_cards={team_a:{yellow:2,red:1},team_b:{yellow:1,red:0}};
assert.deepEqual(codes(publish([recordedCards])),[]);
const cardsLeague=engine.calculateLeague(fixtures,[recordedCards],league);
assert.equal(cardsLeague.rows.find(x=>x.team_id===first.team_a_id).yellow_cards,2);
assert.equal(cardsLeague.rows.find(x=>x.team_id===first.team_a_id).red_cards,1);
assert.equal(cardsLeague.rows.find(x=>x.team_id===first.team_b_id).yellow_cards,1);
assert.equal(cardsLeague.rows.find(x=>x.team_id===first.team_b_id).red_cards,0);
assert.equal(cardsLeague.card_tie_break_status,"pending_count_method");
const missingCards=publish([newResult(first,1,0)]);
delete missingCards.results[0].disciplinary_cards;
assert.ok(codes(missingCards).includes("DISCIPLINARY_CARDS"),
  "missing cards must never be silently treated as zero");
assert.throws(()=>engine.calculateLeague(fixtures,missingCards.results,league),/explicit yellow\/red/);
const invalidCards=publish([newResult(first,1,0)]);
invalidCards.results[0].disciplinary_cards.team_a.yellow=-1;
assert.ok(codes(invalidCards).includes("DISCIPLINARY_CARDS"));
const invalidFraction=publish([newResult(first,1,0)]);
invalidFraction.results[0].disciplinary_cards.team_b.red=0.5;
assert.ok(codes(invalidFraction).includes("DISCIPLINARY_CARDS"));
const invalidExtra=publish([newResult(first,1,0)]);
invalidExtra.results[0].disciplinary_cards.student_name="PRIVATE";
assert.ok(codes(invalidExtra).includes("DISCIPLINARY_CARDS"),
  "public disciplinary cards must only have anonymous totals by side");
const cardCorrected=publish([newResult(first,2,0)]);
cardCorrected.results[0].disciplinary_cards.team_a.yellow=1;
assert.ok(codes(cardCorrected,{previous:publish([newResult(first,2,0)])}).includes("SILENT_CORRECTION"),
  "post-publication card corrections require revision and a reason");
const approvedCardTie=engine.calculateLeague(fixtures,[
  headMatch(ha,hb,0,0)],activeH2H);
assert.equal(approvedCardTie.rows.find(x=>x.team_id===ha).card_tie_break_unresolved,true);
assert.ok([ha,hb].every(id=>approvedCardTie.rows.find(x=>x.team_id===id).position===null),
  "do not fabricate a fair-play weighting while method is not approved");
const petPolicy=rules.sport_policies.find(x=>x.sport_id==="petanque");
assert.equal(petPolicy.format,"knockout");
assert.equal(petPolicy.elimination_status,"approved");
assert.equal(petPolicy.advancement,"winner_only");
assert.equal(petPolicy.loser_reentry,false);
assert.deepEqual(codes(publish([sets])),[]);
const petKnockout=engine.calculatePetanqueKnockout(fixtures,[sets],petPolicy);
assert.equal(petKnockout.elimination,"single_elimination");
assert.equal(petKnockout.matches.length,1);
assert.equal(petKnockout.matches[0].winner_school_id,pet.team_a_id);
assert.equal(petKnockout.matches[0].eliminated_school_id,pet.team_b_id);
assert.equal(petKnockout.final_positions,null,"no automatic third place or future bracket guess");
assert.equal(engine.calculatePetanqueKnockout(fixtures,[],petPolicy).matches.length,0);
assert.throws(()=>engine.calculatePetanqueKnockout(fixtures,[sets,sets],petPolicy),/duplicate approved/);
assert.throws(()=>engine.calculatePetanqueKnockout(fixtures,[{...sets,winner_school_id:pet.team_b_id}],petPolicy),/winner mismatches/);
const unapprovedPet=structuredClone(petPolicy);unapprovedPet.elimination_status="pending_rule_approval";
assert.throws(()=>engine.calculatePetanqueKnockout(fixtures,[sets],unapprovedPet),/approved petanque/);
const petNext=fixtures.find(f=>f.sport_id==="petanque"&&(!f.team_a_id||!f.team_b_id));
assert.ok(petNext);
assert.throws(()=>engine.calculatePetanqueKnockout(fixtures,[{...sets,fixture_id:petNext.id}],petPolicy),
  /future bracket participants need approval/);
const badPetRule=clone(rules);badPetRule.sport_policies.find(x=>x.sport_id==="petanque").advancement="winner_and_loser";
assert.ok(validatePublication(data,program,badPetRule).some(x=>x.code==="PETANQUE_ELIMINATION"));
const noPetSource=clone(rules);delete noPetSource.sport_policies.find(x=>x.sport_id==="petanque").elimination_source;
assert.ok(validatePublication(data,program,noPetSource).some(x=>x.code==="PETANQUE_ELIMINATION_SOURCE"));
console.log("R15-B/C PASS: 15+2+1 phase, 3/1/0, H2H GD two/three-way, cards audited/no guessed weighting, petanque knockout, unresolved ties, prestart zeros, partial/KO/athletics, invalid JSON, revision/digest");
