/**
 * R11 PUBLIC INTAKE ONLY — paste into its OWN standalone Apps Script project.
 * DO NOT co-deploy with private Announcer.gs; execute as Me; Who has access Anyone.
 * Properties: NONGKUM_OPS_SPREADSHEET_ID, NONGKUM_PUBLIC_INTAKE_ENABLED=true.
 * Every public RPC is potentially anonymous. Only nkPublicCreate is exposed.
 */
var NK_PUBLIC_SPORTS=["ฟุตบอล","ยิงจุดโทษ","ฟุตซอล","วอลเลย์บอล","เซปักตะกร้อ","เปตอง","เทเบิลเทนนิส","ชักเย่อ","กรีฑา"];
var NK_PUBLIC_SCHOOLS=["โรงเรียนบ้านหนองกุ่ม","โรงเรียนวัดทุ่งมะสัง (มิตรภาพที่ 9)","โรงเรียนบ้านรางขาม","โรงเรียนบ้านวังด้ง","โรงเรียนบ้านพุพรหม","โรงเรียนบ้านวังเขาแก้ว","โรงเรียนบ้านเสาหงส์","โรงเรียนบ้านหนองกระทุ่ม"];
var NK_PUBLIC_QUEUE_HEADERS=["id","created_at","created_by","type","priority","sport","division","team_a","team_b","field","message","status","updated_at","updated_by","version","announced_at"];
var NK_PUBLIC_AUDIT_HEADERS=["log_id","occurred_at","actor","request_id","action","from_status","to_status","detail"];
var NK_PUBLIC_MAX_15_MIN=60;
var NK_PUBLIC_DUPLICATE_SECONDS=180;

function nkPublicProp_(key){return String(PropertiesService.getScriptProperties().getProperty(key)||"").trim();}
function nkPublicEnabled_(){
  if(nkPublicProp_("NONGKUM_PUBLIC_INTAKE_ENABLED")!=="true")throw Error("ขณะนี้ปิดรับคำขอผ่านลิงก์สาธารณะ");
}
function nkPublicClean_(value,max,label,required){
  var s=String(value==null?"":value).trim().replace(/\s+/g," ");
  if(required&&!s)throw Error("กรุณาระบุ "+label);
  if(s.length>max)throw Error(label+" ยาวเกินที่กำหนด");
  if(/[\u0000-\u001f\u007f<>]/.test(s)||/^[=+@-]/.test(s)||
      /(?:https?:\/\/|www\.)/i.test(s)||
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(s)||
      /(?:^|\D)0\d{8,9}(?:\D|$)/.test(s)){
    throw Error(label+" มีรูปแบบที่ไม่อนุญาต กรุณาไม่ใส่สูตร ลิงก์ อีเมล หรือเบอร์โทร");
  }
  return s;
}
function nkPublicValidate_(input){
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("คำขอไม่ถูกต้อง");
  if(input.website||input.fax)throw Error("ไม่สามารถรับคำขอนี้ได้");
  var type=String(input.type||""),priority=String(input.priority||"normal");
  if(["athlete","referee","general"].indexOf(type)<0)throw Error("กรุณาเลือกประเภทประกาศ");
  if(["normal","urgent"].indexOf(priority)<0)throw Error("ลำดับความสำคัญไม่ถูกต้อง");
  var sport=nkPublicClean_(input.sport,80,"กีฬา",type!=="general"),
      division=nkPublicClean_(input.division,70,"รุ่น/ประเภท",false),
      teamA=nkPublicClean_(input.team_a,90,"โรงเรียนแรก",type==="athlete"),
      teamB=nkPublicClean_(input.team_b,90,"โรงเรียนที่สอง",false),
      field=nkPublicClean_(input.field,80,"สนาม",type!=="general"),
      general=nkPublicClean_(input.message,240,"ข้อความประชาสัมพันธ์",type==="general");
  if(type!=="general"&&NK_PUBLIC_SPORTS.indexOf(sport)<0)throw Error("กรุณาเลือกชนิดกีฬาจากรายการ");
  if(type==="athlete"&&NK_PUBLIC_SCHOOLS.indexOf(teamA)<0)throw Error("กรุณาเลือกโรงเรียนจากรายการ");
  if(teamB&&NK_PUBLIC_SCHOOLS.indexOf(teamB)<0)throw Error("โรงเรียนที่สองไม่อยู่ในรายการ");
  if(type==="athlete"&&teamA===teamB)throw Error("ไม่ต้องเลือกโรงเรียนเดียวกันซ้ำ");
  if(type!=="general"&&!field)throw Error("กรุณาระบุสนามหรือจุดรายงานตัว");
  var msg=type==="athlete"?
    "ขอเชิญผู้ควบคุมทีม"+sport+(division?" "+division:"")+" ของ"+teamA+
      (teamB?" และ"+teamB:"")+" กรุณารายงานตัวที่ "+field+" และตรวจสอบกำหนดการกับเจ้าหน้าที่สนาม":
    type==="referee"?"ขอให้กรรมการผู้รับผิดชอบการแข่งขัน"+sport+(division?" "+division:"")+
      " ประจำ "+field+" ติดต่อกองอำนวยการเพื่อประสานงาน":general;
  // Never trust optional fields carried over when switching form modes.
  if(type==="general"){sport="";division="";teamA="";teamB="";field="";}
  if(type==="referee"){teamA="";teamB="";}
  return {type:type,priority:priority,sport:sport,division:division,team_a:teamA,team_b:teamB,field:field,message:msg};
}
function nkPublicSheet_(ss,name,headers){
  var sheet=ss.getSheetByName(name);
  if(!sheet)throw Error("ผู้ดูแลยังไม่ได้เตรียมฐานข้อมูลรับคำขอ");
  var got=sheet.getRange(1,1,1,headers.length).getValues()[0];
  if(!headers.every(function(h,i){return h===String(got[i]);}))throw Error("โครงสร้างฐานข้อมูลไม่ตรงรุ่น โปรดติดต่อผู้ดูแล");
  return sheet;
}
function nkPublicFingerprint_(obj){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    [obj.type,obj.priority,obj.sport,obj.division,obj.team_a,obj.team_b,obj.field,obj.message].join("|"),
    Utilities.Charset.UTF_8);
  return bytes.map(function(b){return ("0"+((b+256)%256).toString(16)).slice(-2);}).join("");
}
function nkPublicCreate(input){
  nkPublicEnabled_();
  var r=nkPublicValidate_(input);
  var lock=LockService.getScriptLock();
  if(!lock)throw Error("ระบบคิวไม่พร้อมให้บริการ");
  lock.waitLock(10000);
  try{
    // Feature flag is checked again while serialized to support immediate shutdown.
    nkPublicEnabled_();
    var properties=PropertiesService.getScriptProperties(),
        id=nkPublicProp_("NONGKUM_OPS_SPREADSHEET_ID");
    if(!/^[A-Za-z0-9_-]{20,}$/.test(id))throw Error("ผู้ดูแลยังไม่ได้เชื่อมฐานข้อมูล");
    var cache=CacheService.getScriptCache(),hash=nkPublicFingerprint_(r);
    if(cache.get("nk-r11-duplicate-"+hash))throw Error("มีคำขอเดียวกันเข้าคิวแล้ว กรุณารอสักครู่ก่อนส่งซ้ำ");
    var now=new Date(),bucket=Math.floor(now.getTime()/900000),
        limitKey="NONGKUM_PUBLIC_RATE_15MIN",stored=String(properties.getProperty(limitKey)||""),
        parts=stored.split("|"),count=Number(parts[0])===bucket?Number(parts[1])||0:0;
    if(count>=NK_PUBLIC_MAX_15_MIN)throw Error("ขณะนี้มีคำขอจำนวนมาก กรุณาติดต่อกองอำนวยการโดยตรง");
    var ss=SpreadsheetApp.openById(id),
        queue=nkPublicSheet_(ss,"01_คิวประกาศ",NK_PUBLIC_QUEUE_HEADERS),
        history=nkPublicSheet_(ss,"02_ประวัติประกาศ",NK_PUBLIC_AUDIT_HEADERS);
    if(queue.getLastRow()>5000)throw Error("คิวเต็ม กรุณาติดต่อกองอำนวยการ");
    var uuid=Utilities.getUuid(),rowId="ops-"+uuid,timestamp=now.toISOString();
    queue.appendRow([rowId,timestamp,"public-link",r.type,r.priority,r.sport,r.division,
      r.team_a,r.team_b,r.field,r.message,"pending",timestamp,"public-link",1,""]);
    history.appendRow(["evt-"+Utilities.getUuid(),timestamp,"public-link",rowId,"created","","pending","public request"]);
    properties.setProperty(limitKey,String(bucket)+"|"+String(count+1));
    cache.put("nk-r11-duplicate-"+hash,"1",NK_PUBLIC_DUPLICATE_SECONDS);
    // Return a receipt for this submission only. Never return queue rows or staff identities.
    return {ok:true,status:"pending",reference:"REQ-"+uuid.slice(0,8).toUpperCase()};
  } finally{lock.releaseLock();}
}
function doGet(){
  return HtmlService.createHtmlOutputFromFile("PublicRequest")
    .setTitle("มิตรภาพเกม · ส่งคำขอประกาศ")
    .addMetaTag("viewport","width=device-width,initial-scale=1,viewport-fit=cover");
}
