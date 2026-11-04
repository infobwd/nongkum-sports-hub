/**
 * R10 / Phase 2: PRIVATE field announcement queue (standalone Google Apps Script).
 * Install in a PRIVATE STANDALONE Apps Script project, backed by a SEPARATE PRIVATE Spreadsheet.
 * Deploy web app: execute as "User accessing the web app"; Google sign-in required.
 *
 * Script Properties (comma-separated exact Google account emails, lowercased internally):
 * NONGKUM_OPS_SPREADSHEET_ID = private operations spreadsheet ID (NOT public)
 * NONGKUM_OPS_ADMIN_EMAILS
 * NONGKUM_ANNOUNCER_EMAILS
 * NONGKUM_COORDINATOR_EMAILS
 *
 * No keys/tokens in public HTML. NEVER publish this queue to GitHub Pages.
 */
var NK_OPS_QUEUE = "01_คิวประกาศ";
var NK_OPS_HISTORY = "02_ประวัติประกาศ";
var NK_OPS_QUEUE_HEADERS = ["id","created_at","created_by","type","priority","sport","division","team_a","team_b","field","message","status","updated_at","updated_by","version","announced_at"];
var NK_OPS_HISTORY_HEADERS = ["log_id","occurred_at","actor","request_id","action","from_status","to_status","detail"];
var NK_OPS_MAX_RECORDS = 5000;

function nkOpsText_(value, max, label, required) {
  var text = String(value == null ? "" : value).trim().replace(/\s+/g," ");
  if (required && !text) throw Error("กรุณาระบุ " + label);
  if (text.length > max) throw Error(label + " ยาวเกิน " + max + " ตัวอักษร");
  if (/[\u0000-\u001f\u007f]/.test(text)) throw Error(label + " มีอักขระไม่รองรับ");
  // Reject spreadsheet formula injection, URLs/emails/phone numbers in private announcements.
  if (/^[=+@-]/.test(text) || /(?:https?:\/\/|www\.)/i.test(text) || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) ||
      /(?:^|\D)0\d{8,9}(?:\D|$)/.test(text)) {
    throw Error(label + " มีรูปแบบที่ไม่อนุญาต (สูตร ลิงก์ อีเมล หรือเบอร์โทร)");
  }
  return text;
}
function nkOpsEmailList_(name) {
  var raw = PropertiesService.getScriptProperties().getProperty(name) || "";
  return raw.split(",").map(function(v){return String(v).trim().toLowerCase();}).filter(function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);});
}
function nkOpsSession_() {
  var email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  if (!email) throw Error("ไม่สามารถยืนยันบัญชี Google ได้ โปรดเปิดด้วยบัญชีเจ้าหน้าที่ที่ได้รับสิทธิ์");
  var admin = nkOpsEmailList_("NONGKUM_OPS_ADMIN_EMAILS").indexOf(email) !== -1;
  var announcer = admin || nkOpsEmailList_("NONGKUM_ANNOUNCER_EMAILS").indexOf(email) !== -1;
  var coordinator = announcer || nkOpsEmailList_("NONGKUM_COORDINATOR_EMAILS").indexOf(email) !== -1;
  if (!coordinator) throw Error("บัญชีนี้ไม่ได้รับสิทธิ์ใช้ศูนย์ประกาศสนาม");
  return {email:email,role:admin?"admin":announcer?"announcer":"coordinator"};
}
function nkOpsRequireAnnouncer_() {
  var user = nkOpsSession_();
  if (user.role === "coordinator") throw Error("เฉพาะผู้บรรยายหรือผู้ดูแลเท่านั้นที่เปลี่ยนสถานะประกาศได้");
  return user;
}
function nkOpsSpreadsheet_() {
  var id = String(PropertiesService.getScriptProperties().getProperty("NONGKUM_OPS_SPREADSHEET_ID")||"").trim();
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(id)) throw Error("ยังไม่ได้ตั้ง NONGKUM_OPS_SPREADSHEET_ID ให้ถูกต้อง");
  return SpreadsheetApp.openById(id);
}
function nkOpsLock_() {
  var lock = LockService.getDocumentLock() || LockService.getScriptLock();
  if (!lock) throw Error("ไม่สามารถล็อกคิวประกาศได้");
  lock.waitLock(10000);
  return lock;
}
function nkOpsSheet_(ss,name,headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw Error("ยังไม่พบแท็บ " + name + " กรุณาให้ผู้ดูแลรัน nkOpsSetup ก่อน");
  var actual = sheet.getRange(1,1,1,headers.length).getValues()[0];
  if (!headers.every(function(h,i){return String(actual[i]) === h;})) throw Error("โครงสร้างแท็บ "+name+" ไม่ตรงเวอร์ชัน R10 ห้ามเขียนทับ");
  return sheet;
}
function nkOpsSetup() {
  var user = nkOpsSession_();
  if (user.role !== "admin") throw Error("เฉพาะผู้ดูแลที่อยู่ใน NONGKUM_OPS_ADMIN_EMAILS เท่านั้น");
  var lock = nkOpsLock_();
  try {
    var ss = nkOpsSpreadsheet_();
    [[NK_OPS_QUEUE,NK_OPS_QUEUE_HEADERS],[NK_OPS_HISTORY,NK_OPS_HISTORY_HEADERS]].forEach(function(pair){
      var sheet = ss.getSheetByName(pair[0]);
      if (!sheet) sheet = ss.insertSheet(pair[0]);
      var last = sheet.getLastRow();
      if (last === 0) {
        sheet.getRange(1,1,1,pair[1].length).setValues([pair[1]]);
        sheet.setFrozenRows(1);
      }
      nkOpsSheet_(ss,pair[0],pair[1]);
    });
    return {ok:true,created:true,message:"เตรียมแท็บคิวประกาศและประวัติเรียบร้อย"};
  } finally { lock.releaseLock(); }
}
function nkOpsReadAll_(ss) {
  var q = nkOpsSheet_(ss,NK_OPS_QUEUE,NK_OPS_QUEUE_HEADERS);
  var h = nkOpsSheet_(ss,NK_OPS_HISTORY,NK_OPS_HISTORY_HEADERS);
  var count = q.getLastRow()-1;
  if (count > NK_OPS_MAX_RECORDS) throw Error("รายการสะสมเกินขีดจำกัด กรุณาให้ผู้ดูแลสำรองและเก็บเข้าคลัง");
  var values = count > 0 ? q.getRange(2,1,count,NK_OPS_QUEUE_HEADERS.length).getValues() : [];
  var rows = values.map(function(v,i){
    var result = {sheet_row:i+2};
    NK_OPS_QUEUE_HEADERS.forEach(function(k,j){result[k]=v[j] instanceof Date ? v[j].toISOString() : v[j];});
    return result;
  }).filter(function(v){return v.id;});
  return {sheet:q,history:h,rows:rows};
}
function nkOpsPublicRow_(row) {
  var out={};
  NK_OPS_QUEUE_HEADERS.forEach(function(k){out[k]=row[k]==null?"":row[k];});
  return out;
}
function nkOpsRecentHistory_(sheet) {
  var count = Math.max(0,sheet.getLastRow()-1),n=Math.min(count,100);
  if (!n) return [];
  return sheet.getRange(count-n+2,1,n,NK_OPS_HISTORY_HEADERS.length).getValues().map(function(r){
    var e={};
    NK_OPS_HISTORY_HEADERS.forEach(function(k,j){e[k]=r[j] instanceof Date?r[j].toISOString():r[j];});
    return e;
  }).reverse();
}
function nkOpsBootstrap() {
  var user = nkOpsSession_(),data=nkOpsReadAll_(nkOpsSpreadsheet_());
  var open=data.rows.filter(function(r){return r.status==="pending"||r.status==="ready";});
  var closed=data.rows.filter(function(r){return r.status!=="pending"&&r.status!=="ready";});
  var queue=open.slice(-200).reverse().concat(closed.slice(-40).reverse()).map(nkOpsPublicRow_);
  return {user:user,queue:queue,history:nkOpsRecentHistory_(data.history),
    open_total:open.length,total:data.rows.length,checked_at:new Date().toISOString(),
    partial:open.length>200};
}
function nkOpsCompose_(type,input) {
  var sport=nkOpsText_(input.sport,80,"กีฬา",type!=="general");
  var division=nkOpsText_(input.division,70,"รุ่นอายุ",false);
  var teamA=nkOpsText_(input.team_a,90,"โรงเรียนหรือทีมแรก",type==="athlete");
  var teamB=nkOpsText_(input.team_b,90,"โรงเรียนหรือทีมที่สอง",false);
  var field=nkOpsText_(input.field,80,"สนาม/จุดนัดหมาย",type!=="general");
  var general=nkOpsText_(input.message,400,"ข้อความประชาสัมพันธ์",type==="general");
  var message;
  if (type==="athlete"){
    message="ขอเชิญผู้ควบคุมทีม"+sport+(division?" "+division:"")+" ของ"+teamA+
      (teamB?" และ"+teamB:"")+" กรุณารายงานตัวที่ "+field+" และตรวจสอบกำหนดการกับเจ้าหน้าที่สนาม";
  } else if (type==="referee"){
    message="ขอให้กรรมการผู้รับผิดชอบการแข่งขัน"+sport+(division?" "+division:"")+
      " ประจำ "+field+" ติดต่อกองอำนวยการเพื่อประสานงาน";
  } else {
    message=general;
  }
  return {sport:sport,division:division,team_a:teamA,team_b:teamB,field:field,message:message};
}
function nkOpsCreate(input) {
  var user = nkOpsSession_();
  if (!input || typeof input!=="object" || Array.isArray(input)) throw Error("รูปแบบคำขอไม่ถูกต้อง");
  var type=String(input.type||""),priority=String(input.priority||"normal");
  if (["athlete","referee","general"].indexOf(type)<0) throw Error("ประเภทการประกาศไม่รองรับ");
  if (["normal","urgent"].indexOf(priority)<0) throw Error("ระดับความสำคัญไม่ถูกต้อง");
  var c=nkOpsCompose_(type,input);
  var lock=nkOpsLock_();
  try{
    var data=nkOpsReadAll_(nkOpsSpreadsheet_());
    if (data.rows.length>=NK_OPS_MAX_RECORDS) throw Error("คิวเต็ม กรุณาติดต่อผู้ดูแล");
    var now=new Date().toISOString(),id="ops-"+Utilities.getUuid();
    var row=[id,now,user.email,type,priority,c.sport,c.division,c.team_a,c.team_b,c.field,
      c.message,"pending",now,user.email,1,""];
    data.sheet.appendRow(row);
    data.history.appendRow(["evt-"+Utilities.getUuid(),now,user.email,id,"created","","pending","สร้างคำขอภายใน"]);
    return {ok:true,id:id,status:"pending",version:1};
  } finally {lock.releaseLock();}
}
function nkOpsTransition(payload) {
  var user = nkOpsRequireAnnouncer_();
  if (!payload || typeof payload!=="object" || Array.isArray(payload)) throw Error("ข้อมูลเปลี่ยนสถานะไม่ถูกต้อง");
  var id=String(payload.id||""),to=String(payload.to||""),version=Number(payload.expected_version);
  if (!/^ops-[0-9a-f-]{32,36}$/i.test(id)) throw Error("รหัสคิวประกาศไม่ถูกต้อง");
  if (!Number.isInteger(version)||version<1) throw Error("เวอร์ชันคิวไม่ถูกต้อง");
  var allowed={pending:["ready","cancelled"],ready:["announced","cancelled"]};
  if (["ready","announced","cancelled"].indexOf(to)<0) throw Error("สถานะเป้าหมายไม่ถูกต้อง");
  var lock=nkOpsLock_();
  try{
    var data=nkOpsReadAll_(nkOpsSpreadsheet_()),row=data.rows.filter(function(r){return r.id===id;})[0];
    if (!row) throw Error("ไม่พบคิวที่ต้องการ");
    if (Number(row.version)!==version) throw Error("คิวนี้ถูกแก้จากอีกเครื่องแล้ว กรุณารีเฟรชก่อนดำเนินการ");
    if (!allowed[row.status]||allowed[row.status].indexOf(to)<0) throw Error("ไม่อนุญาตให้เปลี่ยนสถานะจาก "+row.status+" เป็น "+to);
    var now=new Date().toISOString();
    data.sheet.getRange(row.sheet_row,12,1,5).setValues([[to,now,user.email,version+1,to==="announced"?now:row.announced_at||""]]);
    data.history.appendRow(["evt-"+Utilities.getUuid(),now,user.email,id,"status_changed",row.status,to,"เปลี่ยนสถานะในคิวภายใน"]);
    return {ok:true,id:id,status:to,version:version+1};
  } finally {lock.releaseLock();}
}
function doGet() {
  try {
    nkOpsSession_();
    return HtmlService.createHtmlOutputFromFile("Announcer").setTitle("มิตรภาพเกม · ศูนย์ประกาศสนาม")
      .addMetaTag("viewport","width=device-width, initial-scale=1, viewport-fit=cover");
  } catch(e) {
    return HtmlService.createHtmlOutput("<!doctype html><html lang='th'><meta charset='utf-8'><title>ไม่สามารถเข้าถึงระบบ</title><main style='font:16px sans-serif;padding:24px'><h1>ไม่สามารถเปิดศูนย์ประกาศสนาม</h1><p>โปรดใช้บัญชี Google ที่ได้รับสิทธิ์จากกองอำนวยการ</p></main></html>");
  }
}
