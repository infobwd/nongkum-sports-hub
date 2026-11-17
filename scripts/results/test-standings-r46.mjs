// R46: synthetic regression only. No fabricated scores are stored in public data.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const raw=JSON.parse(read("data/program-from-pdf-2569-20261104-draft.json"));
const rules=JSON.parse(read("data/standings-rules.json"));
const publicData=JSON.parse(read("data/public-results.json"));
const context=vm.createContext({Map,Set,console});
new vm.Script(read("js/program-corrections.js")).runInContext(context);
new vm.Script(read("js/standings-rosters-r38.js")).runInContext(context);
const program=context.NongkumProgramCorrections.apply(raw);
const build=results=>context.NongkumPreliminaryStandings.build(program,results,rules);
const football=results=>build(results).find(g=>g.sport_id==="football"&&g.division===rules.football_league.division);
const league=rules.football_league.phases.league;
const fixtures=program.fixtures.filter(f=>league.includes(f.id));
assert.equal(fixtures.length,15,"fixture mapping must be exactly 15 league matches");
assert.equal(rules.football_league.approval_status,"pending_rule_approval",
  "testing display ranks must never change official rules approval status");
const names=rules.football_league.team_ids;
function score(f,sa,sb,cards={team_a:{red:0,yellow:0},team_b:{red:0,yellow:0}}){
 return {id:"synthetic-"+f.id,fixture_id:f.id,sport_id:f.sport_id,division:f.division,
   status:"approved",result_type:"score",revision:1,
   team_a_id:f.team_a_id,team_b_id:f.team_b_id,score_a:sa,score_b:sb,
   winner_school_id:sa===sb?null:sa>sb?f.team_a_id:f.team_b_id,
   disciplinary_cards:cards};
}
function pair(a,b,sa,sb){
 const f=fixtures.find(x=>(x.team_a_id===a&&x.team_b_id===b)||
   (x.team_a_id===b&&x.team_b_id===a));
 assert.ok(f,"test requires an explicit scheduled match");
 return score(f,f.team_a_id===a?sa:sb,f.team_a_id===a?sb:sa);
}
const row=(g,id)=>g.rows.find(x=>x.team_id===id);
const empty=football([]);
assert.equal(empty.provisional,false);
assert.ok(empty.rows.every(x=>x.position===null&&x.provisional_position===undefined));
assert.equal(empty.approved_count,0);
const win=score(fixtures[0],2,0);
const first=football([win]);
assert.equal(first.approved_count,1);
assert.equal(first.provisional,true);
assert.equal(row(first,win.team_a_id).provisional_position,1);
assert.equal(row(first,win.team_a_id).points,3);
assert.ok(first.rows.every(x=>x.position===null),"official positions must remain null");
const tiedAtZero=first.rows.filter(x=>x.points===0);
assert.equal(tiedAtZero.length,5);
const unplayed=tiedAtZero.filter(x=>x.played===0);
assert.equal(unplayed.length,4);
assert.ok(unplayed.every(x=>x.provisional_position===2&&x.provisional_shared),
 "teams with zero points and zero GD share second until they play");
assert.equal(row(first,win.team_b_id).provisional_position,6,
 "a defeated team has worse GD than four unplayed zero-point teams");
assert.equal(football([{...win,status:"review"}]).provisional,false,
 "unapproved scores must not create a live rank");
assert.equal(football([{...win,winner_school_id:win.team_b_id}]).provisional,false,
 "wrong winner must not create a live rank");
assert.equal(football([win,{...win,id:"duplicated-result"}]).provisional,false,
 "two approved results on one fixture must not choose an arbitrary winner");
const other=build([win]).find(g=>g.sport_id==="futsal");
assert.ok(other&&!other.provisional);
assert.ok(other.rows.every(x=>x.provisional_position===undefined));
const [a,b,c,d,e]=names;
// R48: overall GD wins over H2H even if A beats B directly.
const gdFirst=football([pair(a,b,1,0),pair(b,c,9,0),pair(d,a,8,0),pair(d,e,1,0)]);
assert.equal(row(gdFirst,a).points,3);assert.equal(row(gdFirst,b).points,3);
assert.ok(row(gdFirst,a).goal_difference<row(gdFirst,b).goal_difference);
assert.ok(row(gdFirst,b).provisional_position<row(gdFirst,a).provisional_position);
assert.equal(gdFirst.provisional,true);
// When points AND overall GD are equal, a completed head-to-head match breaks the tie.
const h2h=football([pair(a,b,1,0),pair(b,c,1,0),pair(d,a,1,0),pair(d,e,1,0)]);
assert.equal(row(h2h,a).points,row(h2h,b).points);
assert.equal(row(h2h,a).goal_difference,row(h2h,b).goal_difference);
assert.ok(row(h2h,a).provisional_position<row(h2h,b).provisional_position);
// Multiple teams equal on points stay shared until every mutual fixture is approved.
const incomplete=football([pair(a,b,0,0),pair(a,c,0,0),pair(a,d,0,0)]);
assert.ok([b,c,d].every(id=>row(incomplete,id).provisional_position===2&&
 row(incomplete,id).provisional_shared));
const three=football([pair(a,b,2,0),pair(b,c,2,1),pair(c,a,1,0)]);
assert.deepEqual([row(three,a).provisional_position,row(three,c).provisional_position,
 row(three,b).provisional_position],[1,2,3]);
assert.ok([a,b,c].every(id=>!row(three,id).provisional_shared));
// Cards must not decide equal H2H until every league match and its cards are approved.
const drawn=pair(a,b,0,0);
drawn.disciplinary_cards.team_a.red=1;
const partialCards=football([drawn]);
assert.equal(row(partialCards,a).provisional_position,1);
assert.equal(row(partialCards,b).provisional_position,1);
assert.equal(row(partialCards,a).provisional_shared,true);
const allDraws=fixtures.map(f=>score(f,0,0));
const withRed=allDraws.find(r=>r.team_a_id===a||r.team_b_id===a);
withRed.disciplinary_cards[withRed.team_a_id===a?"team_a":"team_b"].red=1;
const full=football(allDraws);
assert.equal(full.approved_count,15);
assert.equal(row(full,a).provisional_position,6,"fewest red cards after league completion");
assert.ok(full.rows.filter(x=>x.team_id!==a).every(x=>x.provisional_position===1));
assert.ok(full.rows.every(x=>x.position===null),
 "no final position until committee-approved digest snapshot exists");
const noCards=allDraws.map(x=>structuredClone(x));
delete noCards[0].disciplinary_cards;
const missingCard=football(noCards);
assert.ok(missingCard.rows.every(x=>x.provisional_position===1),
 "missing card data cannot be interpreted as zero for a final tie break");
const badRule=structuredClone(rules);
badRule.football_league.points.win=99;
const notApplicable=context.NongkumPreliminaryStandings.build(program,[win],badRule)
 .find(g=>g.sport_id==="football");
assert.equal(notApplicable.provisional,false,"never assume unconfigured football point rules");
assert.equal(notApplicable.has_points,false);
// R48: futsal A/B apply exactly the same points/GD/H2H policy, by group only.
const futsalGroups=rules.futsal_league.groups;
assert.deepEqual(futsalGroups.map(g=>g.fixture_ids.length),[6,3]);
const futsalA=futsalGroups[0].fixture_ids.map(id=>program.fixtures.find(f=>f.id===id));
const futsalB=futsalGroups[1].fixture_ids.map(id=>program.fixtures.find(f=>f.id===id));
const futsalGroup=(results,division)=>build(results).find(g=>g.sport_id==="futsal"&&g.division===division);
const emptyFutsal=futsalGroup([],"10 ปี ชาย A");
assert.ok(emptyFutsal&&!emptyFutsal.provisional);
assert.ok(emptyFutsal.rows.every(x=>x.position===null&&x.provisional_position===undefined));
const fWinA=score(futsalA[0],2,0),fWinB=score(futsalA[1],5,0);
const fLive=futsalGroup([fWinA,fWinB],"10 ปี ชาย A");
assert.equal(fLive.approved_count,2);assert.equal(fLive.match_count,6);
assert.equal(fLive.provisional,true);
assert.equal(row(fLive,fWinB.team_a_id).points,3);
assert.equal(row(fLive,fWinA.team_a_id).points,3);
assert.ok(row(fLive,fWinB.team_a_id).goal_difference>row(fLive,fWinA.team_a_id).goal_difference);
assert.ok(row(fLive,fWinB.team_a_id).provisional_position<
 row(fLive,fWinA.team_a_id).provisional_position);
assert.ok(fLive.rows.every(x=>x.position===null));
assert.equal(futsalGroup([{...fWinA,status:"review"}],"10 ปี ชาย A").provisional,false);
assert.equal(futsalGroup([{...fWinA,winner_school_id:fWinA.team_b_id}],"10 ปี ชาย A").provisional,false);
assert.equal(futsalGroup([fWinA,{...fWinA,id:"duplicate-futsal"}],"10 ปี ชาย A").provisional,false);
// B is an independent 3-team group. Completed drawn fixtures allow red-card tie break
// only if every card count is explicitly present; no imaginary default zeros.
const bDraws=futsalB.map(f=>score(f,0,0));
const redTeam=futsalB[0].team_a_id;
bDraws[0].disciplinary_cards.team_a.red=1;
const fFull=futsalGroup(bDraws,"10 ปี ชาย B");
assert.equal(fFull.approved_count,3);assert.equal(fFull.match_count,3);
assert.equal(row(fFull,redTeam).provisional_position,3);
assert.ok(fFull.rows.filter(x=>x.team_id!==redTeam).every(x=>x.provisional_position===1));
const fNoCards=bDraws.map(x=>structuredClone(x));
delete fNoCards[0].disciplinary_cards;
assert.ok(futsalGroup(fNoCards,"10 ปี ชาย B").rows.every(x=>x.provisional_position===1));
const fOther=futsalGroup([score(futsalB[0],3,0)],"10 ปี ชาย A");
assert.equal(fOther.approved_count,0);assert.equal(fOther.provisional,false);

// Render a minimal phone DOM with approved-only source and show inline rank/points.
function node(id){
 return {id,textContent:"",innerHTML:"",value:"",hidden:true,disabled:false,href:"",
  children:[],handlers:{},attributes:{},
  setAttribute(k,v){this.attributes[k]=String(v);},
  appendChild(x){this.children.push(x);},
  addEventListener(k,cb){this.handlers[k]=cb;},
  querySelectorAll(){return [...this.innerHTML.matchAll(/data-sport='([^']*)'/g)]
     .map(m=>({dataset:{sport:m[1]},addEventListener(){}}));}};
}
const ids=["standingsSchool","standingsLevel","standingsSports","standingsCount",
 "standingsStatus","standingsPublishedAt","standingsEmpty","standingsPendingRules",
 "standingsPendingDetails","standingsSkeleton","standingsFailure","standingsListing",
 "standingsRoster","refreshStandings","retryStandings","resultsSubResults",
 "emptyResultsLink","pendingResultsLink"];
const els=Object.fromEntries(ids.map(id=>[id,node(id)]));
const published=structuredClone(publicData);
published.results=[win];
published.metadata.approved_results_count=1;
published.metadata.publication_status="published";
const contextUi=vm.createContext({Date,URL,URLSearchParams,Intl,console:{error(){}},
 location:new URL("https://example.org/nongkum-sports-hub/standings.html?sport=football&school=wangdong"),
 history:{replaceState(){}},localStorage:{getItem(){return "";},setItem(){}},
 document:{visibilityState:"visible",getElementById:id=>els[id]||null,createElement:tag=>node(tag)},
 fetch:async path=>({ok:true,json:async()=>path.includes("standings-rules.json")?rules:
   path.includes("program-from-pdf")?raw:published}),setInterval(){}});
for(const p of ["js/shared.js","js/standings-engine.js","js/program-corrections.js",
 "js/standings-rosters-r38.js"])new vm.Script(read(p)).runInContext(contextUi);
contextUi.NongkumNavigation={update(){}};
new vm.Script(read("js/standings.js")).runInContext(contextUi);
for(let i=0;i<40;i++)await Promise.resolve();
const rendered=els.standingsRoster.innerHTML;
assert.match(rendered,/อันดับชั่วคราว/);
assert.match(rendered,/ผลรับรอง 1\/15 คู่/);
assert.match(rendered,/standings-mobile-position/);
assert.match(rendered,/อันดับ 1/);
assert.match(rendered,/3 แต้ม/);
assert.match(rendered,/standings-mobile-details/);
assert.ok(!rendered.includes("อันดับสรุป"));
assert.match(read("standings.html"),/standings\.js\?v=r(?:48|49)-1/);
assert.match(read("css/standings.css"),/standings-mobile-points/);
console.log("R48 PASS: football and futsal GD-first, H2H, cards, approved-only, A/B, and phone display");
