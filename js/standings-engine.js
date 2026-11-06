/* R15-B: pure, deterministic standings functions. No fetch, clock, storage or implicit official rules. */
(function(root){
  "use strict";
  function fail(message){ throw new Error(message); }
  function integer(value){return Number.isInteger(value)&&value>=0;}
  function unique(items){return new Set(items).size===items.length;}
  function canonical(value){
    if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
    if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
    return JSON.stringify(value);
  }
  function assertFootballPhaseMapping(fixtures,rule){
    if(!rule||rule.sport_id!=="football"||rule.division!=="12 ปี ชาย")fail("football division mapping missing");
    const phases=rule.phases||{};
    const league=phases.league||[],playoff=phases.playoff||[],final=phases.final||[];
    if(league.length!==15||playoff.length!==2||final.length!==1||!unique([...league,...playoff,...final]))fail("football phase mapping must be 15+2+1 unique ids");
    const lookup=new Map(fixtures.map(f=>[f.id,f]));
    const teams=rule.team_ids||[];
    if(teams.length!==6||!unique(teams))fail("football league must contain six distinct teams");
    const pairs=new Set();
    for(const id of league){
      const f=lookup.get(id);
      if(!f||f.kind!=="match"||f.sport_id!=="football"||f.division!==rule.division||!teams.includes(f.team_a_id)||!teams.includes(f.team_b_id)||f.team_a_id===f.team_b_id)fail("league fixture mismatch: "+id);
      const pair=[f.team_a_id,f.team_b_id].sort().join("|");
      if(pairs.has(pair))fail("duplicate football league pair "+pair);
      pairs.add(pair);
    }
    if(pairs.size!==15)fail("football round robin not complete");
    for(const id of [...playoff,...final]){
      const f=lookup.get(id);
      if(!f||f.sport_id!=="football"||f.division!==rule.division||f.team_a_id||f.team_b_id)fail("playoff/final source mapping mismatch: "+id);
    }
    return Object.freeze({league:league.slice(),playoff:playoff.slice(),final:final.slice(),team_ids:teams.slice()});
  }
  function calculateLeague(fixtures,results,rule){
    if(!rule||rule.format!=="round_robin_then_playoff")fail("explicit league rule required");
    const phase=assertFootballPhaseMapping(fixtures,rule);
    const pts=rule.points;
    if(!pts||![pts.win,pts.draw,pts.loss].every(integer))fail("league points missing");
    const fixtureMap=new Map(fixtures.map(f=>[f.id,f]));
    const leagueIds=new Set(phase.league);
    const byId=new Map();
    for(const result of results){
      if(!result||result.status!=="approved"||!leagueIds.has(result.fixture_id))continue;
      if(byId.has(result.fixture_id))fail("duplicate approved football fixture result");
      const f=fixtureMap.get(result.fixture_id);
      if(result.result_type!=="score"||result.team_a_id!==f.team_a_id||result.team_b_id!==f.team_b_id||
        !integer(result.score_a)||!integer(result.score_b))fail("invalid approved football score");
      if(result.score_a===result.score_b&&result.winner_school_id)fail("draw cannot have winner");
      if(result.score_a!==result.score_b&&result.winner_school_id!==(result.score_a>result.score_b?f.team_a_id:f.team_b_id))fail("winner mismatches score");
      const cards=result.disciplinary_cards;
      for(const side of ["team_a","team_b"]){
        if(!cards||!cards[side]||!integer(cards[side].yellow)||!integer(cards[side].red))
          fail("approved football result requires explicit yellow/red cards for both teams");
      }
      byId.set(result.fixture_id,result);
    }
    const table=phase.team_ids.map(team_id=>({team_id,played:0,won:0,drawn:0,lost:0,goals_for:0,goals_against:0,
      goal_difference:0,points:0,yellow_cards:0,red_cards:0,position:null,tied:false}));
    const rows=new Map(table.map(row=>[row.team_id,row]));
    for(const [id,r] of byId){
      const f=fixtureMap.get(id),a=rows.get(f.team_a_id),b=rows.get(f.team_b_id);
      a.played++;b.played++;
      a.goals_for+=r.score_a;a.goals_against+=r.score_b;
      b.goals_for+=r.score_b;b.goals_against+=r.score_a;
      a.yellow_cards+=r.disciplinary_cards.team_a.yellow;
      a.red_cards+=r.disciplinary_cards.team_a.red;
      b.yellow_cards+=r.disciplinary_cards.team_b.yellow;
      b.red_cards+=r.disciplinary_cards.team_b.red;
      if(r.score_a===r.score_b){a.drawn++;b.drawn++;a.points+=pts.draw;b.points+=pts.draw;}
      else if(r.score_a>r.score_b){a.won++;b.lost++;a.points+=pts.win;b.points+=pts.loss;}
      else {b.won++;a.lost++;b.points+=pts.win;a.points+=pts.loss;}
    }
    for(const row of table)row.goal_difference=row.goals_for-row.goals_against;
    // H2H applies ONLY inside each equal-points group, never to the whole-league GD.
    // A group needs every mutual league match approved before any H2H ordering is safe.
    const tieBreakers=rule.tie_breakers||[];
    const usable=rule.approval_status==="approved"&&rule.tie_break_status==="approved"&&
      Array.isArray(tieBreakers)&&tieBreakers.length===1&&tieBreakers[0]==="head_to_head_goal_difference";
    if(rule.approval_status==="approved"&&rule.tie_break_status==="approved"&&!usable)
      fail("unsupported official tie-break configuration");
    table.sort((a,b)=>b.points-a.points||a.team_id.localeCompare(b.team_id,"en"));
    const complete=byId.size===phase.league.length;
    const h2hGroups=[];
    if(usable&&byId.size){
      for(let from=0;from<table.length;){
        let to=from+1;
        while(to<table.length&&table[to].points===table[from].points)to++;
        const group=table.slice(from,to);
        if(group.length===1){
          group[0].position=from+1;
        }else{
          const members=new Set(group.map(r=>r.team_id));
          const mutual=phase.league.map(id=>fixtureMap.get(id)).filter(f=>
            members.has(f.team_a_id)&&members.has(f.team_b_id));
          const required=group.length*(group.length-1)/2;
          const headToHeadComplete=mutual.length===required&&mutual.every(f=>byId.has(f.id));
          if(headToHeadComplete){
            const difference=new Map(group.map(row=>[row.team_id,0]));
            for(const fixture of mutual){
              const result=byId.get(fixture.id),delta=result.score_a-result.score_b;
              difference.set(fixture.team_a_id,difference.get(fixture.team_a_id)+delta);
              difference.set(fixture.team_b_id,difference.get(fixture.team_b_id)-delta);
            }
            for(const row of group)row.head_to_head_goal_difference=difference.get(row.team_id);
            group.sort((a,b)=>b.head_to_head_goal_difference-a.head_to_head_goal_difference||
              a.team_id.localeCompare(b.team_id,"en"));
            for(let i=0;i<group.length;i++){
              const gd=group[i].head_to_head_goal_difference;
              const unresolved=(i>0&&group[i-1].head_to_head_goal_difference===gd)||
                (i<group.length-1&&group[i+1].head_to_head_goal_difference===gd);
              group[i].tied=unresolved;
              group[i].card_tie_break_unresolved=unresolved;
              group[i].position=unresolved?null:from+i+1;
            }
          }else{
            for(const row of group){row.tied=true;row.position=null;}
          }
          h2hGroups.push({points:group[0].points,teams:group.map(r=>r.team_id),
            match_count:mutual.filter(f=>byId.has(f.id)).length,required_matches:required,
            complete:headToHeadComplete,resolved:headToHeadComplete&&group.every(r=>!r.tied)});
          }
        table.splice(from,group.length,...group);
        from=to;
      }
    }else{
      for(const row of table)row.tied=table.filter(other=>other.points===row.points).length>1;
    }
    return {format:"league",division:rule.division,phase:"league",matches_approved:byId.size,matches_total:phase.league.length,
      complete,tie_breaker:"head_to_head_goal_difference",card_tie_break_status:"pending_count_method",head_to_head_groups:h2hGroups,ranking_status:byId.size===0?"prestart_roster":!usable?"pending_rule_approval":complete&&table.every(r=>!r.tied)?"final":"provisional",
      rows:table};
  }
  function calculateKnockout(fixtures,results){
    const byId=new Map(fixtures.map(f=>[f.id,f]));
    const matches=[];
    const seen=new Set();
    for(const r of results){
      if(!r||r.status!=="approved")continue;
      const f=byId.get(r.fixture_id);
      if(!f||f.kind!=="match")fail("unknown knockout fixture");
      if(seen.has(r.fixture_id))fail("duplicate knockout result");
      seen.add(r.fixture_id);
      if(!r.winner_school_id||![r.team_a_id,r.team_b_id].includes(r.winner_school_id))fail("knockout winner missing");
      if(f.team_a_id&&f.team_a_id!==r.team_a_id||f.team_b_id&&f.team_b_id!==r.team_b_id)fail("knockout teams mismatch");
      matches.push({fixture_id:r.fixture_id,round:f.round,winner_school_id:r.winner_school_id});
    }
    return {format:"knockout",matches:matches.sort((a,b)=>a.fixture_id.localeCompare(b.fixture_id,"en")),final_positions:null};
  }
  // Petanque is single-elimination, not a points table. Never infer placement or
  // future placeholder participants from the winner of an earlier fixture.
  function calculatePetanqueKnockout(fixtures,results,policy){
    if(!policy||policy.sport_id!=="petanque"||policy.format!=="knockout"||
       policy.elimination_status!=="approved"||policy.advancement!=="winner_only")
      fail("approved petanque elimination rule required");
    const fixtureMap=new Map(fixtures.filter(f=>f.sport_id==="petanque").map(f=>[f.id,f]));
    const seen=new Set(),matches=[];
    for(const r of results){
      if(!r||r.status!=="approved"||r.sport_id!=="petanque")continue;
      const f=fixtureMap.get(r.fixture_id);
      if(!f||f.kind!=="match")fail("unknown petanque fixture");
      if(seen.has(f.id))fail("duplicate approved petanque fixture result");
      seen.add(f.id);
      if(!f.team_a_id||!f.team_b_id)fail("petanque future bracket participants need approval");
      if(r.team_a_id!==f.team_a_id||r.team_b_id!==f.team_b_id)fail("petanque teams mismatch");
      if(r.result_type!=="sets"||!Array.isArray(r.sets)||r.sets.length===0||
         r.sets.some(set=>!set||!integer(set.a)||!integer(set.b)||set.a===set.b))
        fail("petanque requires approved non-drawn sets");
      const wa=r.sets.filter(set=>set.a>set.b).length,wb=r.sets.length-wa;
      if(wa===wb)fail("petanque cannot end tied");
      const winner=wa>wb?f.team_a_id:f.team_b_id;
      if(r.winner_school_id!==winner)fail("petanque winner mismatches sets");
      matches.push({fixture_id:f.id,division:f.division,round:f.round,
        winner_school_id:winner,eliminated_school_id:winner===f.team_a_id?f.team_b_id:f.team_a_id,
        advancement:"winner_only_pending_next_fixture_mapping"});
    }
    return {format:"knockout",sport_id:"petanque",elimination:"single_elimination",
      matches:matches.sort((a,b)=>a.fixture_id.localeCompare(b.fixture_id,"en")),final_positions:null};
  }
  function calculateRankingEvent(eventResult){
    if(!eventResult||eventResult.status!=="approved"||eventResult.result_type!=="ranking"||eventResult.event_complete!==true)fail("approved complete event required");
    const rows=eventResult.rankings;
    if(!Array.isArray(rows)||!rows.length||!unique(rows.map(x=>x.school_id))||!unique(rows.map(x=>x.rank))||
      rows.some(x=>!Number.isInteger(x.rank)||x.rank<1))fail("invalid ranking rows");
    return {format:"ranking",event_id:eventResult.event_id,rows:rows.map(x=>({...x})).sort((a,b)=>a.rank-b.rank)};
  }
  const api=Object.freeze({canonical,assertFootballPhaseMapping,calculateLeague,calculateKnockout,calculatePetanqueKnockout,calculateRankingEvent});
  root.NongkumStandingsEngine=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(globalThis);
