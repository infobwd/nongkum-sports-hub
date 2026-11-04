/**
 * Nongkum Sports Hub P2 — manual approval and PRIVATE JSON snapshot.
 *
 * INSTALL: Google Sheet > Extensions > Apps Script > paste this file as Code.gs.
 * In Project Settings > Script properties, set:
 *    NONGKUM_APPROVER_EMAILS = email1@example.org,email2@example.org
 * Make sure those accounts also have spreadsheet permission to edit the
 * protected approval metadata columns. Do not deploy as a public web app.
 *
 * This NEVER pushes to GitHub or the public site. Exported JSON is PRIVATE
 * in the active user's Drive until intentionally reviewed/published in P3.
 */
var NK_TABS = Object.freeze({
  schools:"02_โรงเรียน",
  events:"03_รายการ",
  matches:"04_คู่แข่งขัน",
  track:"05_กรีฑา",
  notices:"06_ประกาศ"
});

var NK_COLS = Object.freeze({
  "02_โรงเรียน":{status:4,by:5,at:6,qa:-1,note:7,hash:8},
  "03_รายการ":{status:8,by:9,at:10,qa:11,note:12,hash:13},
  "04_คู่แข่งขัน":{status:13,by:14,at:15,qa:16,note:17,hash:20},
  "05_กรีฑา":{status:10,by:11,at:12,qa:13,note:14,hash:16},
  "06_ประกาศ":{status:6,by:7,at:8,qa:-1,note:9,hash:10}
});

function onOpen() {
  SpreadsheetApp.getUi().createMenu("กีฬาหนองกุ่ม P2")
    .addItem("ดูสถานะการตรวจข้อมูล", "nkShowReadiness")
    .addItem("รับรองแถวที่เลือก (ผู้มีสิทธิ์เท่านั้น)", "nkApproveSelection")
    .addSeparator()
    .addItem("สร้าง JSON เฉพาะ Approved ใน Drive ส่วนตัว", "nkExportApprovedToDrive")
    .addToUi();
}

function nkTrim_(v) { return String(v == null ? "" : v).trim(); }

function nkRows_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw Error("ไม่มีแท็บ " + name);
  var count = sheet.getLastRow();
  return count < 2 ? [] : sheet.getRange(2,1,count-1,sheet.getLastColumn()).getValues()
    .map(function(r,i){return {row:i+2,values:r};})
    .filter(function(x){return nkTrim_(x.values[0]) !== "";});
}

function nkAllowedEmails_() {
  var raw = PropertiesService.getScriptProperties().getProperty("NONGKUM_APPROVER_EMAILS") || "";
  var a = raw.split(",").map(function(x){return nkTrim_(x).toLowerCase();}).filter(Boolean);
  if (!a.length) throw Error("ยังไม่ได้ตั้ง Script property NONGKUM_APPROVER_EMAILS — ระบบปิดการอนุมัติไว้เพื่อความปลอดภัย");
  return a;
}

function nkApproverEmail_() {
  var active = nkTrim_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!active) throw Error("ไม่สามารถยืนยันอีเมลผู้รับรองได้ (บัญชีปัจจุบันไม่เปิดเผยอีเมล) — ปฏิเสธการอนุมัติ");
  if (nkAllowedEmails_().indexOf(active) < 0) throw Error("บัญชีนี้ไม่มีสิทธิ์รับรองหรือส่งออกข้อมูล");
  return active;
}

/** SHA-256 fingerprint of source/business fields, excluding approval metadata.
 *  Protected approval_digest column is owned by designated approver(s).
 *  Edits after approval trigger export failure until selection is approved again.
 */
function nkDigest_(name, r) {
  var c=NK_COLS[name],a=r.slice(0,c.hash);
  [c.status,c.by,c.at].forEach(function(i){a[i]="";});
  var normalized=a.map(function(v){
    if(v instanceof Date)return Utilities.formatDate(v,"Asia/Bangkok","yyyy-MM-dd'T'HH:mm:ss");
    return v==null?"":String(v);
  });
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(normalized),Utilities.Charset.UTF_8);
  return bytes.map(function(b){return ("0"+(b<0?b+256:b).toString(16)).slice(-2);}).join("");
}

function nkValidApproval_(r, cols, allow, label, issues) {
  if (nkTrim_(r[cols.status]) !== "approved") return false;
  var by = nkTrim_(r[cols.by]).toLowerCase();
  if (!by || allow.indexOf(by)<0) issues.push(label + ": ผู้รับรองไม่อยู่ในรายชื่ออนุญาต");
  if (!(r[cols.at] instanceof Date)) issues.push(label + ": ยังไม่มีเวลารับรองจากเมนูระบบ");
  if (!nkTrim_(r[cols.hash]) || nkTrim_(r[cols.hash]) !== nkDigest_(Object.keys(NK_COLS).filter(function(name){return NK_COLS[name]===cols;})[0],r)) {
    issues.push(label + ": ข้อมูลถูกแก้หลังรับรอง/ไม่มี approval_digest — ต้องรับรองใหม่");
  }
  if (cols.qa >= 0 && nkTrim_(r[cols.qa]) && !nkTrim_(r[cols.note])) {
    issues.push(label + ": มี QA flag แต่ยังไม่มีบันทึกมติ/หลักฐานในช่องหมายเหตุ");
  }
  return true;
}

function nkDate_(x) {
  if (x instanceof Date) return Utilities.formatDate(x,"Asia/Bangkok","yyyy-MM-dd");
  var t = nkTrim_(x);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function nkTime_(x) {
  if (x instanceof Date) return Utilities.formatDate(x,"Asia/Bangkok","HH:mm");
  var t = nkTrim_(x);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null;
}

function nkValidateSelection_(name,r) {
  var c=NK_COLS[name];
  if (!c) throw Error("เลือกแถวในแท็บ โรงเรียน/รายการ/คู่แข่งขัน/กรีฑา/ประกาศ เท่านั้น");
  if (!nkTrim_(r[0])) throw Error("ไม่มีรหัสในคอลัมน์ A");
  if(c.qa>=0 && nkTrim_(r[c.qa]) && !nkTrim_(r[c.note]))throw Error("แถวนี้มี QA flag กรุณาระบุมติ/หลักฐานในหมายเหตุก่อนรับรอง");
  if(name===NK_TABS.schools && (!nkTrim_(r[1]) || !nkTrim_(r[2])))throw Error("ชื่อโรงเรียน/ชื่อย่อยังว่าง");
  if(name===NK_TABS.events && !nkTrim_(r[2]))throw Error("ชื่อรายการยังว่าง");
  if(name===NK_TABS.matches && (!nkTrim_(r[5]) || !nkTrim_(r[6]) || !nkDate_(r[10]) || !nkTime_(r[11]) || !nkTrim_(r[12]))) {
    throw Error("คู่แข่งขันต้องมีทีมต้นฉบับ 2 ฝั่ง วันแบบ YYYY-MM-DD เวลา HH:mm และสนาม");
  }
  if(name===NK_TABS.track && (nkTrim_(r[5])==="-" || !nkDate_(r[7]) || !nkTime_(r[8]) || !nkTrim_(r[9]))) {
    throw Error("ลู่ว่างหรือยังไม่ได้ระบุวัน/เวลา/สนาม");
  }
  if(name===NK_TABS.notices && (!nkTrim_(r[1]) || !nkTrim_(r[2]) || !nkDate_(r[3]))) {
    throw Error("ประกาศต้องมีประเภท ข้อความ และวันเริ่ม");
  }
}

function nkShowReadiness() {
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var lines=["สถานะข้อมูลสูจิบัตร — P2 (ข้อมูลร่าง ไม่เผยแพร่อัตโนมัติ)"];
  Object.keys(NK_COLS).forEach(function(name){
    var c=NK_COLS[name],rows=nkRows_(ss,name),counts={draft:0,review:0,approved:0,rejected:0,other:0};
    rows.forEach(function(x){var s=nkTrim_(x.values[c.status]);if(Object.prototype.hasOwnProperty.call(counts,s))counts[s]++;else counts.other++;});
    lines.push(name+": "+rows.length+" แถว | ร่าง "+counts.draft+" | ตรวจ "+counts.review+" | อนุมัติ "+counts.approved+" | ปฏิเสธ "+counts.rejected);
  });
  SpreadsheetApp.getUi().alert(lines.join("\n"));
}

function nkApproveSelection() {
  var email=nkApproverEmail_();
  var ss=SpreadsheetApp.getActiveSpreadsheet(),s=ss.getActiveSheet(),name=s.getName(),cols=NK_COLS[name];
  if(!cols)throw Error("กรุณาเลือกแถวในหนึ่งใน 5 แท็บข้อมูล");
  var selection=s.getActiveRange();
  if(!selection||selection.getRow()<2||selection.getNumRows()>50)throw Error("เลือกแถวข้อมูล (ไม่รวมแถวหัวตาราง) ได้ครั้งละ 1–50 แถว");
  var start=selection.getRow(),count=selection.getNumRows(),width=s.getLastColumn();
  var values=s.getRange(start,1,count,width).getValues();
  for(var i=0;i<values.length;i++){
    try {nkValidateSelection_(name,values[i]);}
    catch(e){throw Error("แถว "+(start+i)+": "+e.message);}
  }
  var now=new Date();
  var updates=values.map(function(){return ["approved",email,now];});
  var hashes=values.map(function(r){return [nkDigest_(name,r)];});
  s.getRange(start,cols.status+1,count,3).setValues(updates);
  s.getRange(start,cols.hash+1,count,1).setValues(hashes);
  SpreadsheetApp.getUi().alert("รับรอง "+count+" แถวแล้ว โดย "+email+"\n(ยังไม่ใช่การเผยแพร่เว็บไซต์)");
}

function nkBuildApproved_(ss) {
  var allow=nkAllowedEmails_();
  var issues=[];
  var schoolRows=nkRows_(ss,NK_TABS.schools),eventRows=nkRows_(ss,NK_TABS.events);
  var schools={},events={};
  schoolRows.forEach(function(obj){
    var r=obj.values,id=nkTrim_(r[0]);
    if(nkValidApproval_(r,NK_COLS[NK_TABS.schools],allow,"โรงเรียนแถว "+obj.row,issues)){
      schools[id]={id:id,name:nkTrim_(r[1]),short:nkTrim_(r[2])};
    }
  });
  eventRows.forEach(function(obj){
    var r=obj.values,id=nkTrim_(r[0]);
    if(nkValidApproval_(r,NK_COLS[NK_TABS.events],allow,"รายการแถว "+obj.row,issues)){
      events[id]={id:id,sport_id:nkTrim_(r[1]),name:nkTrim_(r[2]),division:nkTrim_(r[3]),gender:nkTrim_(r[4]),group:nkTrim_(r[5]),source_no:nkTrim_(r[6]),source_page:Number(r[7])};
    }
  });

  var matches=[];
  nkRows_(ss,NK_TABS.matches).forEach(function(obj){
    var r=obj.values,label="คู่แข่งขันแถว "+obj.row;
    if(!nkValidApproval_(r,NK_COLS[NK_TABS.matches],allow,label,issues))return;
    var eventId=nkTrim_(r[1]),a=nkTrim_(r[7]),b=nkTrim_(r[8]),date=nkDate_(r[10]),time=nkTime_(r[11]),venue=nkTrim_(r[12]);
    if(!events[eventId])issues.push(label+": รายการแม่ "+eventId+" ยังไม่ Approved");
    if(a&&!schools[a])issues.push(label+": โรงเรียน A ยังไม่ Approved");
    if(b&&!schools[b])issues.push(label+": โรงเรียน B ยังไม่ Approved");
    if(!date||!time||!venue)issues.push(label+": วัน เวลา หรือสนามยังไม่ครบ");
    if(!nkTrim_(r[5])||!nkTrim_(r[6]))issues.push(label+": ชื่อทีม/เงื่อนไขทั้งสองฝั่งว่าง");
    matches.push({id:nkTrim_(r[0]),event_id:eventId,sport_id:nkTrim_(r[2]),division:nkTrim_(r[3]),
      source_match_no:nkTrim_(r[4]),team_a_label:nkTrim_(r[5]),team_b_label:nkTrim_(r[6]),
      team_a_id:a||null,team_b_id:b||null,round:nkTrim_(r[9]),date:date,time:time,field:venue,source_page:Number(r[18])});
  });

  var group={};
  nkRows_(ss,NK_TABS.track).forEach(function(obj){
    var r=obj.values,id=nkTrim_(r[1]);
    if(!group[id])group[id]=[];
    group[id].push(obj);
  });
  var athletics=[];
  Object.keys(group).forEach(function(eventId){
    var items=group[eventId],active=items.filter(function(x){return nkTrim_(x.values[5])!=="-";});
    var approved=active.filter(function(x){return nkTrim_(x.values[10])==="approved";});
    if(!approved.length)return;
    if(approved.length!==active.length) {
      issues.push("กรีฑา "+eventId+": ห้ามส่งออกบางลู่ ต้องรับรองทุกลู่ที่มีผู้เข้าแข่งขัน");return;
    }
    if(!events[eventId])issues.push("กรีฑา "+eventId+": รายการแม่ยังไม่ Approved");
    var date=null,time=null,venue=null,lanes=[];
    active.forEach(function(item){
      var r=item.values,label="กรีฑาแถว "+item.row;
      nkValidApproval_(r,NK_COLS[NK_TABS.track],allow,label,issues);
      var rowDate=nkDate_(r[7]),rowTime=nkTime_(r[8]),rowVenue=nkTrim_(r[9]),schoolId=nkTrim_(r[6]);
      if(!rowDate||!rowTime||!rowVenue)issues.push(label+": วัน เวลา สนามยังไม่ครบ");
      if(schoolId&&!schools[schoolId])issues.push(label+": โรงเรียนยังไม่ Approved");
      if(date && (date!==rowDate||time!==rowTime||venue!==rowVenue))issues.push(label+": เวลา/สนามไม่ตรงลู่อื่นในรายการเดียวกัน");
      date=rowDate;time=rowTime;venue=rowVenue;
      lanes.push({lane:Number(r[4]),school_id:schoolId||null,school_label:nkTrim_(r[5])});
    });
    var ev=events[eventId]||{};
    athletics.push({id:eventId,event_id:eventId,sport_id:"athletics",name:ev.name||nkTrim_(items[0].values[2]),
      division:ev.division||nkTrim_(items[0].values[3]),date:date,time:time,field:venue,source_page:ev.source_page||Number(items[0].values[15]),lanes:lanes});
  });

  var notices=[];
  nkRows_(ss,NK_TABS.notices).forEach(function(obj){
    var r=obj.values,label="ประกาศแถว "+obj.row;
    if(!nkValidApproval_(r,NK_COLS[NK_TABS.notices],allow,label,issues))return;
    var start=nkDate_(r[3]);
    if(!nkTrim_(r[1])||!nkTrim_(r[2])||!start)issues.push(label+": ข้อความหรือวันเริ่มยังไม่ครบ");
    notices.push({id:nkTrim_(r[0]),type:nkTrim_(r[1]),message:nkTrim_(r[2]),
      start_date:start,end_date:nkDate_(r[4]),priority:nkTrim_(r[5])||"normal"});
  });
  if(issues.length) throw Error("ไม่สามารถส่งออกได้ ("+issues.length+" รายการ)\n"+issues.slice(0,16).join("\n")+
      (issues.length>16?"\n...ดูและแก้จุดที่เหลือก่อนส่งออก":""));
  if(!matches.length&&!athletics.length&&!notices.length)throw Error("ยังไม่มีรายการหรือประกาศ Approved ที่มีข้อมูลครบสำหรับส่งออก");
  return {
    schema_version:1,
    metadata:{status:"approved_snapshot",source:"Google Sheets P2",generated_at:new Date().toISOString(),
      draft_excluded:true,approved_only:true,approved_matches:matches.length,approved_athletics_events:athletics.length},
    schools:Object.keys(schools).map(function(id){return schools[id];}),
    events:Object.keys(events).map(function(id){return events[id];}),
    matches:matches,athletics:athletics,notices:notices
  };
}

function nkExportApprovedToDrive() {
  nkApproverEmail_();
  var snapshot=nkBuildApproved_(SpreadsheetApp.getActiveSpreadsheet());
  var stamp=Utilities.formatDate(new Date(),"Asia/Bangkok","yyyyMMdd-HHmmss");
  var file=DriveApp.createFile("nongkum-approved-snapshot-"+stamp+".json",JSON.stringify(snapshot,null,2),MimeType.PLAIN_TEXT);
  file.setDescription("ข้อมูล Approved สำหรับตรวจซ้ำก่อนเผยแพร่ใน P3; ไฟล์ส่วนตัว ไม่เผยแพร่ GitHub อัตโนมัติ");
  SpreadsheetApp.getUi().alert("สร้างไฟล์ส่วนตัวเรียบร้อย\nคู่ "+snapshot.matches.length+
   " | กรีฑา "+snapshot.athletics.length+" | ประกาศ "+snapshot.notices.length+
   "\n\n"+file.getUrl()+"\n\nยังไม่ได้นำขึ้นเว็บไซต์สาธารณะ");
}
