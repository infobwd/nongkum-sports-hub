/* R38 — preliminary league roster from explicit schedule pairings only.
 * No official ranking or fabricated points are produced here. */
(function(root){
"use strict";
const leagueSports=new Set(["football","futsal","volleyball","takraw"]);
const zero=id=>({team_id:id,played:0,won:0,drawn:0,lost:0,
 goals_for:0,goals_against:0,goal_difference:0,points:0,position:null});
function groupOf(f){
 if(!f||f.kind!=="match"||!leagueSports.has(f.sport_id)||
    typeof f.id!=="string"||typeof f.division!=="string")return null;
 if(f.sport_id==="football"&&f.round==="พบกันหมด")
   return {key:"football|"+f.division,sport_id:"football",division:f.division,label:"พบกันหมด"};
 // In this source, the suffix is the source's *explicit* division label, not inferred bracket progression.
 const m=/^(.*?)\s+([A-B])$/.exec(f.division);
 if(!m||f.round!=="รอบแรก")return null;
 return {key:f.sport_id+"|"+f.division,sport_id:f.sport_id,
   division:f.division,label:"สาย "+m[2],base_division:m[1]};
}

/* R46: provisional DISPLAY rank only; official positions remain null. */
function verifiedScore(r,f){
 return !!r&&r.status==="approved"&&r.result_type==="score"&&r.sport_id==="football"&&
   r.division===f.division&&r.team_a_id===f.team_a_id&&r.team_b_id===f.team_b_id&&
   Number.isInteger(r.score_a)&&r.score_a>=0&&Number.isInteger(r.score_b)&&r.score_b>=0&&
   (r.winner_school_id??null)===(r.score_a===r.score_b?null:
     r.score_a>r.score_b?f.team_a_id:f.team_b_id);
}
function verifiedCards(r){
 return ["team_a","team_b"].every(side=>["red","yellow"].every(color=>
   Number.isInteger(r?.disciplinary_cards?.[side]?.[color])&&
   r.disciplinary_cards[side][color]>=0));
}
function rankFootball(rows,fixtures,approved,rule){
 if(!rule||rule.sport_id!=="football"||rule.division!==fixtures[0]?.division||
   rule.points?.win!==3||rule.points?.draw!==1||rule.points?.loss!==0||
   !Array.isArray(rule.phases?.league)||rule.phases.league.length!==fixtures.length||
   !fixtures.every(f=>rule.phases.league.includes(f.id)))return null;
 const ordered=rows.slice().sort((a,b)=>b.points-a.points||a.team_id.localeCompare(b.team_id,"en"));
 const h2hAllowed=rule.tie_break_status==="approved"&&
   JSON.stringify(rule.tie_breakers)===
   JSON.stringify(["head_to_head_goal_difference","fewest_red_cards","fewest_yellow_cards"]);
 const cards=rule.disciplinary_tie_break||{};
 const cardAllowed=h2hAllowed&&fixtures.every(f=>verifiedScore(approved.get(f.id),f)&&verifiedCards(approved.get(f.id)))&&
   cards.status==="approved"&&cards.ranking_method==="fewest_red_then_fewest_yellow"&&
   cards.scope==="all_approved_league_fixtures"&&cards.ranking_only_when_league_complete===true;
 const totals=new Map();
 if(cardAllowed)for(const row of ordered){
   const sum={red:0,yellow:0};
   for(const f of fixtures){
     if(f.team_a_id!==row.team_id&&f.team_b_id!==row.team_id)continue;
     const c=approved.get(f.id).disciplinary_cards[f.team_a_id===row.team_id?"team_a":"team_b"];
     sum.red+=c.red;sum.yellow+=c.yellow;
   }
   totals.set(row.team_id,sum);
 }
 for(let start=0;start<ordered.length;){
   let end=start+1;
   while(end<ordered.length&&ordered[end].points===ordered[start].points)end++;
   const tied=ordered.slice(start,end),members=new Set(tied.map(r=>r.team_id));
   const mutual=fixtures.filter(f=>members.has(f.team_a_id)&&members.has(f.team_b_id));
   const h2hComplete=tied.length>1&&h2hAllowed&&
     mutual.length===tied.length*(tied.length-1)/2&&
     mutual.every(f=>verifiedScore(approved.get(f.id),f));
   const diff=new Map(tied.map(r=>[r.team_id,0]));
   if(h2hComplete)for(const f of mutual){
     const r=approved.get(f.id),delta=r.score_a-r.score_b;
     diff.set(f.team_a_id,diff.get(f.team_a_id)+delta);
     diff.set(f.team_b_id,diff.get(f.team_b_id)-delta);
   }
   tied.sort((a,b)=>(h2hComplete?diff.get(b.team_id)-diff.get(a.team_id):0)||
     (cardAllowed?totals.get(a.team_id).red-totals.get(b.team_id).red||
       totals.get(a.team_id).yellow-totals.get(b.team_id).yellow:0)||
     a.team_id.localeCompare(b.team_id,"en"));
   const same=(a,b)=>(!h2hComplete||diff.get(a.team_id)===diff.get(b.team_id))&&
     (!cardAllowed||(totals.get(a.team_id).red===totals.get(b.team_id).red&&
       totals.get(a.team_id).yellow===totals.get(b.team_id).yellow));
   let rank=start+1;
   for(let i=0;i<tied.length;i++){
     if(i>0&&!same(tied[i],tied[i-1]))rank=start+i+1;
     tied[i].provisional_position=rank;
   }
   const counts=new Map();
   for(const r of tied)counts.set(r.provisional_position,(counts.get(r.provisional_position)||0)+1);
   for(const r of tied)r.provisional_shared=counts.get(r.provisional_position)>1;
   ordered.splice(start,tied.length,...tied);
   start=end;
 }
 return ordered;
}
function build(program,results,rules){
 if(!program||!Array.isArray(program.fixtures)||!Array.isArray(program.schools)||
    !Array.isArray(results)||program.fixtures.length!==236)return [];
 const schools=new Set(program.schools.map(s=>s.id));
 const groups=new Map();
 for(const f of program.fixtures){
   const g=groupOf(f);
   if(!g||!schools.has(f.team_a_id)||!schools.has(f.team_b_id)||
      f.team_a_id===f.team_b_id)continue;
   if(!groups.has(g.key))groups.set(g.key,{...g,fixtures:[],teams:new Set()});
   const bucket=groups.get(g.key);
   bucket.fixtures.push(f);
   bucket.teams.add(f.team_a_id);bucket.teams.add(f.team_b_id);
 }
 const approved=new Map(),duplicateIds=new Set();
 for(const r of results){
   if(!r||r.status!=="approved"||typeof r.fixture_id!=="string")continue;
   if(approved.has(r.fixture_id)){approved.delete(r.fixture_id);duplicateIds.add(r.fixture_id);}
   else if(!duplicateIds.has(r.fixture_id))approved.set(r.fixture_id,r);
 }
 const output=[];
 for(const g of groups.values()){
   const rows=new Map([...g.teams].map(id=>[id,zero(id)]));
   let counted=0;
   const league=rules?.football_league;
   const footballPoints=g.sport_id==="football"&&league?.division===g.division&&
     league?.format==="round_robin_then_playoff"&&league?.points?.win===3&&
     league?.points?.draw===1&&league?.points?.loss===0;
   for(const f of g.fixtures){
     const r=approved.get(f.id);
     if(!r||r.team_a_id!==f.team_a_id||r.team_b_id!==f.team_b_id||
        r.sport_id!==f.sport_id||
       (g.sport_id==="football"&&!verifiedScore(r,f)))continue;
     const a=rows.get(f.team_a_id),b=rows.get(f.team_b_id);
     const score=r.result_type==="score"&&Number.isInteger(r.score_a)&&r.score_a>=0&&
         Number.isInteger(r.score_b)&&r.score_b>=0;
     const winner=r.winner_school_id;
     if(!score&&!([a.team_id,b.team_id].includes(winner)))continue;
     a.played++;b.played++;counted++;
     if(score){
       a.goals_for+=r.score_a;a.goals_against+=r.score_b;
       b.goals_for+=r.score_b;b.goals_against+=r.score_a;
       a.goal_difference=a.goals_for-a.goals_against;
       b.goal_difference=b.goals_for-b.goals_against;
     }
     if(score&&r.score_a===r.score_b){a.drawn++;b.drawn++;
       if(footballPoints){a.points++;b.points++;}
     }else{
       const who=score?(r.score_a>r.score_b?a:b):(winner===a.team_id?a:b);
       const lose=who===a?b:a;
       who.won++;lose.lost++;
       if(footballPoints)who.points+=3;
     }
   }
   const provisional=footballPoints&&counted>0&&
     !g.fixtures.some(f=>duplicateIds.has(f.id))
     ?rankFootball([...rows.values()],g.fixtures,approved,league):null;
   // Real `position` stays null until the independent final snapshot.
   output.push({...g,teams:undefined,fixtures:undefined,
     match_count:g.fixtures.length,approved_count:counted,
     has_points:footballPoints,provisional:!!provisional,
     has_goals:["football","futsal"].includes(g.sport_id),
     rows:provisional||[...rows.values()]});
 }
 return output.sort((a,b)=>a.sport_id.localeCompare(b.sport_id)||
   a.division.localeCompare(b.division,"th"));
}
root.NongkumPreliminaryStandings=Object.freeze({build,groupOf});
})(globalThis);
