/* Public results presentation, 4 result shapes; only renders approved rows. */
(function(root){
  "use strict";
  const safe=root.Nongkum.escapeHtml;
  function school(id,schools){
    const s=schools.find(x=>x.id===id);
    return s?s.short:"ไม่ทราบโรงเรียน";
  }
  function pairNames(r,schools){
    return "<div class='result-team-row'><strong>"+safe(school(r.team_a_id,schools))+
      "</strong><span class='result-vs'>VS</span><strong>"+safe(school(r.team_b_id,schools))+"</strong></div>";
  }
  function winner(r,schools){
    return r.winner_school_id?"<p class='result-winner'>🏆 ผู้ชนะ: "+safe(school(r.winner_school_id,schools))+"</p>":
      "<p class='result-neutral'>ไม่มีข้อมูลผู้ชนะหรือผลเสมอ</p>";
  }
  function score(r,schools){
    return pairNames(r,schools)+"<div class='result-score'>"+
      "<span>"+safe(r.score_a)+"</span><span class='result-colon'>:</span><span>"+safe(r.score_b)+"</span></div>"+winner(r,schools);
  }
  function sets(r,schools){
    const rows=(r.sets||[]).map(function(s,i){
      return "<div class='set-row'><span>เซ็ต "+(i+1)+"</span><span>"+
        safe(s.a)+" – "+safe(s.b)+"</span></div>";
    }).join("");
    return pairNames(r,schools)+"<div class='set-results'>"+rows+"</div>"+winner(r,schools);
  }
  function winLoss(r,schools){
    return pairNames(r,schools)+winner(r,schools);
  }
  function ranking(r,schools){
    const rows=(r.rankings||[]).slice().sort((a,b)=>a.rank-b.rank).map(x=>
      "<div class='rank-row'><span class='rank-number'>อันดับ "+safe(x.rank)+"</span><strong>"+
      safe(school(x.school_id,schools))+"</strong>"+
      (x.mark?"<span>"+safe(x.mark)+(x.unit?" "+safe(x.unit):"")+"</span>":"")+"</div>"
    ).join("");
    return "<div class='rank-results'>"+rows+"</div>";
  }
  function card(r,schools,sports){
    if(r.status!=="approved")return "";
    const kind=r.result_type;
    const sport=sports.find(x=>x.id===r.sport_id);
    let body="";
    if(kind==="score")body=score(r,schools);
    else if(kind==="sets")body=sets(r,schools);
    else if(kind==="win_loss")body=winLoss(r,schools);
    else if(kind==="ranking")body=ranking(r,schools);
    else return "";
    const title=r.name||(r.sport_id==="athletics"?"กรีฑา":"ผลการแข่งขัน");
    return "<article class='fixture result-card' data-result-card='"+safe(r.id)+"'><div class='fixture-head'><div class='sport-label'><strong class='sport-name'>"+
      safe(sport?(sport.emoji+" "+sport.name):r.sport_id)+
      "</strong><span class='division'>"+safe(r.division||"")+"</span></div>"+
      "<div class='fixture-actions'><span class='tag verified'>รับรองแล้ว</span>"+
      "<button type='button' class='share-icon' data-share-result='"+safe(r.id)+
      "' aria-label='แชร์ผลการแข่งขันที่ผ่านการรับรอง "+safe(sport?sport.name:"")+
      "' title='แชร์ผลการแข่งขัน'>↗</button></div></div>"+
      (r.result_type==="ranking"?"<h3 class='result-title'>"+safe(title)+"</h3>":"")+
      body+"<p class='source'>"+
      (r.result_date?"แข่งขัน "+safe(r.result_date)+" · ":"")+
      "อ้างอิงรหัส "+safe(r.fixture_id||r.event_id||r.id)+
      "</p></article>";
  }
  root.NongkumResultsRender=Object.freeze({card});
})(globalThis);
