/**
 * มิตรภาพเกม — Results approval and PRIVATE export (install alongside Code.gs).
 * No public endpoint, no auto-publish. Requires NONGKUM_APPROVER_EMAILS.
 * Tabs: 07_ผลประเภททีมคู่ and 08_ผลกรีฑา.
 */
var NK_RESULT_TABS={
  pair:{name:"07_ผลประเภททีมคู่",status:10,by:13,at:14,hash:18},
  track:{name:"08_ผลกรีฑา",status:6,by:9,at:10,hash:14}
};
function nkResultFingerprint_(kind,r){
  var c=NK_RESULT_TABS[kind],a=r.slice(0,c.hash);
  [c.status,c.by,c.at].forEach(function(i){a[i]="";});
  var serialized=a.map(function(v){
    if(v instanceof Date)return Utilities.formatDate(v,"Asia/Bangkok","yyyy-MM-dd'T'HH:mm:ss");
    return v==null?"":String(v);
  });
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(serialized),Utilities.Charset.UTF_8)
    .map(function(b){return ("0"+(b<0?b+256:b).toString(16)).slice(-2);}).join("");
}
function nkResultRows_(ss,kind){
  var s=ss.getSheetByName(NK_RESULT_TABS[kind].name);
  if(!s)throw Error("ไม่พบแท็บ "+NK_RESULT_TABS[kind].name);
  var n=s.getLastRow();
  return n<2?[]:s.getRange(2,1,n-1,s.getLastColumn()).getValues()
    .map(function(values,i){return {row:i+2,values:values};}).filter(function(x){return nkTrim_(x.values[0]);});
}
function nkNonnegInt_(v){
  return v!==""&&v!==null&&v!==undefined&&Number.isInteger(Number(v))&&Number(v)>=0;
}
function nkResultType_(sport,scoreA,scoreB,setsJson){
  if(["football","futsal","shootout"].indexOf(sport)>=0)return "score";
  // Petanque regulations may use a single point-score game or multi-game match.
  // Select the actual reported shape; do not invent a mandatory set count.
  if(sport==="petanque")return nkTrim_(setsJson)!==""?"sets":"score";
  if(["volleyball","takraw","tabletennis"].indexOf(sport)>=0)return "sets";
  if(sport==="tugofwar")return "win_loss";
  throw Error("ชนิดกีฬาไม่รองรับ: "+sport);
}
function nkCheckResultRow_(kind,r){
  if(!nkTrim_(r[0])||!nkTrim_(r[1]))throw Error("ต้องมีรหัสผลและรหัสคู่/รายการ");
  if(kind==="pair"){
    var type=nkResultType_(nkTrim_(r[2]),r[6],r[7],r[8]),a=nkTrim_(r[4]),b=nkTrim_(r[5]),winner=nkTrim_(r[9]);
    if(!a||!b||a===b)throw Error("กรุณาระบุรหัสโรงเรียนสองฝ่ายที่ต่างกัน");
    if(winner&&winner!==a&&winner!==b)throw Error("ผู้ชนะไม่ตรงทีมสองฝ่าย");
    if(type==="score"){
      if(!nkNonnegInt_(r[6])||!nkNonnegInt_(r[7]))throw Error("คะแนนสองฝ่ายต้องเป็นจำนวนเต็มไม่ติดลบ");
      if(Number(r[6])===Number(r[7])&&winner)throw Error("คะแนนเสมอแต่มีผู้ชนะ");
      if(Number(r[6])!==Number(r[7])&&winner!==(Number(r[6])>Number(r[7])?a:b))throw Error("ผลคะแนนไม่ตรงผู้ชนะ");
    }
    if(type==="sets"){
      var sets;try{sets=JSON.parse(nkTrim_(r[8]));}catch(e){throw Error("กรุณากรอก sets_json เป็น JSON array");}
      if(!Array.isArray(sets)||!sets.length||!sets.every(function(x){return nkNonnegInt_(x.a)&&nkNonnegInt_(x.b)&&Number(x.a)!==Number(x.b);}))throw Error("คะแนนแต่ละเซ็ตไม่ถูกต้อง");
      var winsA=sets.filter(function(x){return Number(x.a)>Number(x.b);}).length;
      var winsB=sets.length-winsA;
      if(winsA===winsB||winner!==(winsA>winsB?a:b))throw Error("จำนวนเซ็ตที่ชนะไม่ตรงผู้ชนะ");
    }
    if(type==="win_loss"&&!winner)throw Error("ชักเย่อต้องระบุผู้ชนะ");
  }else{
    if(!nkTrim_(r[2])||!nkNonnegInt_(r[3])||Number(r[3])<1||!nkTrim_(r[4])||!nkTrim_(r[5]))
      throw Error("กรีฑาต้องมีโรงเรียน อันดับ (≥1) สถิติ และหน่วย");
  }
  if(!nkTrim_(r[11])&&kind==="pair")throw Error("กรุณาระบุผู้บันทึกผล");
  if(kind==="track"&&!nkTrim_(r[7]))throw Error("กรุณาระบุผู้บันทึกผล");
}
function nkApproveResultsSelection(){
  var email=nkApproverEmail_(),ss=SpreadsheetApp.getActiveSpreadsheet(),s=ss.getActiveSheet();
  var kind=Object.keys(NK_RESULT_TABS).filter(function(k){return NK_RESULT_TABS[k].name===s.getName();})[0];
  if(!kind)throw Error("กรุณาเลือกแถวในแท็บผลการแข่งขัน 07 หรือ 08");
  var selected=s.getActiveRange();
  if(!selected||selected.getRow()<2||selected.getNumRows()>40)throw Error("เลือกได้ครั้งละ 1–40 แถว ไม่รวมส่วนหัว");
  var c=NK_RESULT_TABS[kind],start=selected.getRow(),n=selected.getNumRows();
  var rows=s.getRange(start,1,n,s.getLastColumn()).getValues();
  rows.forEach(function(r,i){try{nkCheckResultRow_(kind,r);}catch(e){throw Error("แถว "+(start+i)+": "+e.message);}});
  var now=new Date();
  s.getRange(start,c.status+1,n,1).setValues(rows.map(function(){return ["approved"]; }));
  s.getRange(start,c.by+1,n,2).setValues(rows.map(function(){return [email,now];}));
  s.getRange(start,c.hash+1,n,1).setValues(rows.map(function(r){return [nkResultFingerprint_(kind,r)];}));
  SpreadsheetApp.getUi().alert("รับรองผล "+n+" แถวแล้ว ยังไม่ได้เผยแพร่เว็บไซต์");
}
function nkResultsApproved_(kind,obj,allow,issues){
  var c=NK_RESULT_TABS[kind],r=obj.values;
  if(nkTrim_(r[c.status])!=="approved")return false;
  var label=c.name+" แถว "+obj.row;
  try{nkCheckResultRow_(kind,r);}catch(e){issues.push(label+": "+e.message);}
  if(allow.indexOf(nkTrim_(r[c.by]).toLowerCase())<0)issues.push(label+": ผู้รับรองไม่มีสิทธิ์");
  if(!(r[c.at] instanceof Date))issues.push(label+": ไม่มีเวลารับรองที่ตรวจสอบได้");
  if(nkTrim_(r[c.hash])!==nkResultFingerprint_(kind,r))issues.push(label+": ข้อมูลเปลี่ยนหลังรับรอง ต้องรับรองใหม่");
  return true;
}
function nkBuildPublicResults_(ss){
  var allow=nkAllowedEmails_(),issues=[],fixtureRows=nkRows_(ss,"04_คู่แข่งขัน");
  var eventRows=nkRows_(ss,"03_รายการ"),schoolRows=nkRows_(ss,"02_โรงเรียน");
  var fixtureIndex={},eventIndex={},schoolIndex={};
  fixtureRows.forEach(function(x){fixtureIndex[nkTrim_(x.values[0])]=x.values;});
  eventRows.forEach(function(x){eventIndex[nkTrim_(x.values[0])]=x.values;});
  schoolRows.forEach(function(x){schoolIndex[nkTrim_(x.values[0])]=x.values;});
  var results=[],seen={},groups={};
  nkResultRows_(ss,"pair").forEach(function(x){
    var r=x.values;
    if(!nkResultsApproved_("pair",x,allow,issues))return;
    if(seen[nkTrim_(r[0])])issues.push("result_id ซ้ำ: "+r[0]);seen[nkTrim_(r[0])]=true;
    var f=fixtureIndex[nkTrim_(r[1])],type;
    try{type=nkResultType_(nkTrim_(r[2]),r[6],r[7],r[8]);}catch(e){issues.push(e.message);return;}
    if(!f||f[13]!=="approved"||nkTrim_(f[2])!==nkTrim_(r[2])||
        nkTrim_(f[7])!==nkTrim_(r[4])||nkTrim_(f[8])!==nkTrim_(r[5]))
       issues.push("คู่ "+r[1]+": ข้อมูลคู่แม่ยังไม่รับรองหรือทีมไม่ตรง");
    if(f&&f[13]==="approved")nkValidApproval_(f,NK_COLS["04_คู่แข่งขัน"],allow,"คู่แม่ "+r[1],issues);
    var item={id:nkTrim_(r[0]),fixture_id:nkTrim_(r[1]),sport_id:nkTrim_(r[2]),
      division:f?nkTrim_(f[3]):"",team_a_id:nkTrim_(r[4]),team_b_id:nkTrim_(r[5]),
      result_type:type,winner_school_id:nkTrim_(r[9])||null,status:"approved"};
    if(type==="score"){item.score_a=Number(r[6]);item.score_b=Number(r[7]);}
    if(type==="sets"){try{item.sets=JSON.parse(nkTrim_(r[8])).map(function(s){return {a:Number(s.a),b:Number(s.b)};});}catch(e){issues.push("เซ็ตไม่ถูกต้อง "+r[0]);}}
    results.push(item);
  });
  nkResultRows_(ss,"track").forEach(function(x){
    var r=x.values,eventId=nkTrim_(r[1]);
    if(!groups[eventId])groups[eventId]=[];
    groups[eventId].push(x);
  });
  Object.keys(groups).forEach(function(eventId){
    var rows=groups[eventId],approved=rows.filter(function(x){return nkTrim_(x.values[6])==="approved";});
    if(!approved.length)return;
    if(approved.length!==rows.length){issues.push("กรีฑา "+eventId+" มีผลยังไม่รับรองบางอันดับ");return;}
    var event=eventIndex[eventId];
    if(!event||event[8]!=="approved"||event[1]!=="athletics")issues.push("รายการกรีฑา "+eventId+" ยังไม่รับรอง");
    if(event&&event[8]==="approved")nkValidApproval_(event,NK_COLS["03_รายการ"],allow,"รายการแม่ "+eventId,issues);
    var ranks={},schoolsInRace={},rankings=[];
    approved.forEach(function(x){
      var r=x.values;
      nkResultsApproved_("track",x,allow,issues);
      var rank=Number(r[3]),schoolId=nkTrim_(r[2]);
      if(ranks[rank]||schoolsInRace[schoolId]||!schoolIndex[schoolId])issues.push("ผลกรีฑาอันดับหรือโรงเรียนซ้ำ/ไม่รู้จัก "+eventId);
      ranks[rank]=true;schoolsInRace[schoolId]=true;
      rankings.push({rank:rank,school_id:schoolId,mark:nkTrim_(r[4]),unit:nkTrim_(r[5])});
    });
    results.push({id:"ranking-"+eventId,event_id:eventId,sport_id:"athletics",
      name:event?nkTrim_(event[2]):"",division:event?nkTrim_(event[3]):"",
      result_type:"ranking",rankings:rankings,status:"approved"});
  });
  if(!results.length)throw Error("ยังไม่มีผลการแข่งขัน Approved — ไม่ส่งออกไฟล์ว่างจากระบบกรรมการ");
  if(issues.length)throw Error("ไม่พร้อมเผยแพร่ผล ("+issues.length+" จุด):\n"+issues.slice(0,12).join("\n"));
  var sports=[
    ["football","ฟุตบอล","⚽"],["shootout","ยิงจุดโทษ","🥅"],["futsal","ฟุตซอล","⚽"],
    ["volleyball","วอลเลย์บอล","🏐"],["takraw","เซปักตะกร้อ","🏐"],
    ["petanque","เปตอง","🎯"],["tabletennis","เทเบิลเทนนิส","🏓"],
    ["tugofwar","ชักเย่อ","🪢"],["athletics","กรีฑา","🏃"]
  ].map(function(x){return {id:x[0],name:x[1],emoji:x[2]};});
  var schools=schoolRows.map(function(x){return {id:nkTrim_(x.values[0]),name:nkTrim_(x.values[1]),short:nkTrim_(x.values[2])};});
  return {schema_version:1,metadata:{event_name:"มิตรภาพเกม",publication_status:"published",approved_only:true,
       approved_results_count:results.length,published_at:new Date().toISOString()},
       schools:schools,sports:sports,results:results};
}
function nkExportApprovedResultsToDrive(){
  nkApproverEmail_();
  var payload=nkBuildPublicResults_(SpreadsheetApp.getActiveSpreadsheet());
  var stamp=Utilities.formatDate(new Date(),"Asia/Bangkok","yyyyMMdd-HHmmss");
  var file=DriveApp.createFile("friendship-results-approved-"+stamp+".json",
    JSON.stringify(payload,null,2),MimeType.PLAIN_TEXT);
  file.setDescription("PRIVATE REVIEW ONLY. Needs independent QA and manual publish in P3.");
  SpreadsheetApp.getUi().alert("สร้างไฟล์ผลรับรองใน Drive ส่วนตัวแล้ว ("+payload.results.length+
     " รายการ)\n"+file.getUrl()+"\nยังไม่ได้เผยแพร่ GitHub Pages");
}
