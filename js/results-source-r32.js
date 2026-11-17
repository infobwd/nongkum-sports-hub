/* R32 — Public read-only approved result feed from Meeting Supabase.
   The publishable key is intentionally public; all writes and private rows are blocked by DB grants + RLS.
   Never put a service_role/secret key here. No intake/evidence APIs are called from a public page. */
(function (root) {
  "use strict";
  const url="https://zprxvpfkvforoxrboqiv.supabase.co/rest/v1/nongkum_published_results?select=result_id,result,revision,published_at&order=published_at.desc,result_id.asc&limit=500";
  const publishableKey="sb_publishable_HgMDg6IlCL0DV_WnjkK6Og_zLjnlXJY";
  const allowedFields=new Set([
    "id","status","sport_id","result_type","fixture_id","event_id",
    "team_a_id","team_b_id","score_a","score_b","sets",
    "winner_school_id","rankings","division","round","name","result_date",
    "team_a_cards","team_b_cards"
  ]);
  const allowedKinds=new Set(["score","sets","win_loss","ranking"]);
  const goodID=(x)=>typeof x==="string"&&x.length>0&&x.length<=160;
  const positiveRank=(x)=>Number.isInteger(x)&&x>0;
  const nonnegativeScore=(x)=>Number.isInteger(x)&&x>=0;
  function validBase(base) {
    return base&&base.schema_version===1&&base.metadata&&base.metadata.approved_only===true&&
      Array.isArray(base.schools)&&Array.isArray(base.sports)&&Array.isArray(base.results)&&
      base.results.every(r=>r&&r.status==="approved")&&
      base.metadata.approved_results_count===base.results.length;
  }
  function safeCards(cards) {
    return cards===undefined || (cards && typeof cards==="object" && !Array.isArray(cards) &&
      Object.keys(cards).every(k=>["red","yellow"].includes(k)&&nonnegativeScore(cards[k])));
  }
  function safeOptionalText(r) {
    return ["division","round","name","result_date"].every(k=>
      r[k]===undefined || (typeof r[k]==="string" && r[k].length<=200));
  }
  function validPublicResult(r, schools, sports) {
    if(!r||typeof r!=="object"||Array.isArray(r)||
      !Object.keys(r).every(k=>allowedFields.has(k))||
      r.status!=="approved"||!goodID(r.id)||!safeOptionalText(r)||
      !safeCards(r.team_a_cards)||!safeCards(r.team_b_cards)||
      !goodID(r.sport_id)||!sports.has(r.sport_id)||!allowedKinds.has(r.result_type))return false;
    if(r.result_type==="ranking") {
      return goodID(r.event_id)&&Array.isArray(r.rankings)&&r.rankings.length>0&&
        r.rankings.every(row=>row&&typeof row==="object"&&!Array.isArray(row)&&
          positiveRank(row.rank)&&schools.has(row.school_id)&&
          Object.keys(row).every(k=>["rank","school_id","mark","unit"].includes(k))&&
          (row.mark===undefined||["string","number"].includes(typeof row.mark))&&
          (row.unit===undefined||typeof row.unit==="string"));
    }
    if(!goodID(r.fixture_id)||!schools.has(r.team_a_id)||
      !schools.has(r.team_b_id)||r.team_a_id===r.team_b_id)return false;
    if(r.winner_school_id&&![r.team_a_id,r.team_b_id].includes(r.winner_school_id))return false;
    if(r.result_type==="score")return nonnegativeScore(r.score_a)&&nonnegativeScore(r.score_b);
    if(r.result_type==="sets")return Array.isArray(r.sets)&&r.sets.length>0&&
      r.sets.every(s=>s&&typeof s==="object"&&!Array.isArray(s)&&
        nonnegativeScore(s.a)&&nonnegativeScore(s.b)&&Object.keys(s).every(k=>["a","b"].includes(k)));
    return r.result_type==="win_loss"&&[r.team_a_id,r.team_b_id].includes(r.winner_school_id);
  }
  async function liveRows() {
    const ctrl=typeof AbortController!=="undefined"?new AbortController():null;
    const timer=ctrl&&typeof setTimeout==="function"?setTimeout(()=>ctrl.abort(),5000):null;
    try {
      const response=await fetch(url,{
        cache:"no-store",
        headers:{"apikey":publishableKey,"Accept":"application/json"},
        ...(ctrl?{signal:ctrl.signal}:{})
      });
      if(!response.ok)throw Error("Approved result feed unavailable");
      const rows=await response.json();
      if(!Array.isArray(rows)||rows.length>500)throw Error("Invalid published feed");
      return rows;
    }finally{if(timer!==null)clearTimeout(timer);}
  }
  async function staticCopy() {
    const response=await fetch("./data/public-results.json?refresh="+Date.now(),{cache:"no-store"});
    if(!response.ok)throw Error("Approved result backup unavailable");
    const base=await response.json();
    if(!validBase(base))throw Error("Invalid approved-only backup");
    return base;
  }
  async function load() {
    const online=liveRows().then(rows=>({rows})).catch(error=>({error}));
    const base=await staticCopy();
    const remote=await online;
    if(remote.error) return {data:base,source:"backup"};
    const schoolIDs=new Set(base.schools.map(s=>s.id));
    const sportIDs=new Set(base.sports.map(s=>s.id));
    const seen=new Set();
    const results=[];
    let newest="";
    for(const row of remote.rows){
      if(!row||!goodID(row.result_id)||!Number.isInteger(row.revision)||row.revision<1||
        !validPublicResult(row.result,schoolIDs,sportIDs)||row.result.id!==row.result_id||
        seen.has(row.result_id)||typeof row.published_at!=="string"||
        Number.isNaN(Date.parse(row.published_at)))
        throw Error("Invalid approved Supabase row");
      seen.add(row.result_id);
      // Share revision is public metadata from the reviewed published row, not part of the writable result payload.
      results.push({...row.result,share_revision:row.revision,published_at:row.published_at});
      if(row.published_at>newest)newest=row.published_at;
    }
    // Keep every approved sport and result type in one newest-publication-first feed.
    // Do not use the match date or the client refresh time for this order.
    results.sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at)||a.id.localeCompare(b.id));
    // Before the cut-over, preserve the existing approved snapshot if the DB is
    // unexpectedly empty; always label it as the backup, not as a live result.
    if(!results.length && base.results.length)return {data:base,source:"backup"};
    return {
      data:{
        ...base,
        metadata:{
          ...base.metadata,
          approved_only:true,
          publication_status:results.length?"published":"empty",
          approved_results_count:results.length,
          published_at:newest||null,
          source:"Meeting Supabase · confirmed published results"
        },
        results
      },
      source:"live"
    };
  }
  root.NongkumResultSource=Object.freeze({load});
})(globalThis);
