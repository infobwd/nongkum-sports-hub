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
 const m=/^(.*?)\\s+([A-B])$/.exec(f.division);
 if(!m||f.round!=="รอบแรก")return null;
 return {key:f.sport_id+"|"+f.division,sport_id:f.sport_id,
   division:f.division,label:"สาย "+m[2],base_division:m[1]};
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
 const approved=new Map(results.filter(r=>r&&r.status==="approved"&&typeof r.fixture_id==="string")
   .map(r=>[r.fixture_id,r]));
 const output=[];
 for(const g of groups.values()){
   const rows=new Map([...g.teams].map(id=>[id,zero(id)]));
   let counted=0;
   const footballPoints=g.sport_id==="football"&&rules?.football_league?.points?.win===3&&
       rules?.football_league?.points?.draw===1&&rules?.football_league?.points?.loss===0;
   for(const f of g.fixtures){
     const r=approved.get(f.id);
     if(!r||r.team_a_id!==f.team_a_id||r.team_b_id!==f.team_b_id||
        r.sport_id!==f.sport_id)continue;
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
   // Alphabetic school short-name order belongs to the view, never to a competition position.
   output.push({...g,teams:undefined,fixtures:undefined,
     match_count:g.fixtures.length,approved_count:counted,
     has_points:footballPoints,
     has_goals:["football","futsal"].includes(g.sport_id),
     rows:[...rows.values()]});
 }
 return output.sort((a,b)=>a.sport_id.localeCompare(b.sport_id)||
   a.division.localeCompare(b.division,"th"));
}
root.NongkumPreliminaryStandings=Object.freeze({build,groupOf});
})(globalThis);
