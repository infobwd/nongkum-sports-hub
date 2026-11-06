/**
 * R20-B — Optional result-entry helpers for authorized Google Sheets editors.
 * Install alongside Code.gs and Results.gs. No HTTP endpoint; no auto-publication.
 * Recorder accounts must be listed in script property NONGKUM_RECORDER_EMAILS.
 */
var NK_ENTRY_PAIR_SHEET="07_ผลประเภททีมคู่";
var NK_ENTRY_TRACK_SHEET="08_ผลกรีฑา";

function nkRecorderEmail_(){
  var email=nkTrim_(Session.getActiveUser().getEmail()).toLowerCase();
  if(!email)throw Error("ไม่สามารถยืนยันบัญชีผู้บันทึกได้ โปรดลงชื่อเข้าใช้บัญชีที่ผู้จัดอนุญาต");
  var prop=PropertiesService.getScriptProperties().getProperty("NONGKUM_RECORDER_EMAILS")||"";
  var allow=prop.split(",").map(function(x){return nkTrim_(x).toLowerCase();}).filter(Boolean);
  if(!allow.length||allow.indexOf(email)<0)
    throw Error("บัญชีนี้ยังไม่ได้รับสิทธิ์บันทึกผล กรุณาติดต่อผู้ดูแล");
  return email;
}
function nkEntrySelectedRow_(sheet,expectedName){
  if(!sheet||sheet.getName()!==expectedName)throw Error("กรุณาเลือกแถวในแท็บ "+expectedName);
  var selection=sheet.getActiveRange();
  if(!selection||selection.getRow()<2||selection.getNumRows()!==1)
    throw Error("กรุณาเลือกข้อมูลครั้งละ 1 แถว โดยไม่เลือกหัวตาราง");
  return {row:selection.getRow(),values:sheet.getRange(selection.getRow(),1,1,sheet.getLastColumn()).getValues()[0]};
}
function nkEntryLock_(fn){
  var lock=LockService.getDocumentLock();
  if(!lock||!lock.tryLock(10000))throw Error("กำลังมีผู้บันทึกผลอยู่ กรุณาลองอีกครั้ง");
  try{return fn();}finally{lock.releaseLock();}
}
function nkEntryHasPair_(ss,fixtureId){
  return nkResultRows_(ss,"pair").some(function(x){return nkTrim_(x.values[1])===fixtureId;});
}
function nkEntryHasAthlete_(ss,eventId,schoolId){
  return nkResultRows_(ss,"track").some(function(x){
    return nkTrim_(x.values[1])===eventId&&nkTrim_(x.values[2])===schoolId;
  });
}
function nkStartPairResultFromSelectedFixture(){
  var email=nkRecorderEmail_(),ss=SpreadsheetApp.getActiveSpreadsheet();
  var item=nkEntrySelectedRow_(ss.getActiveSheet(),"04_คู่แข่งขัน"),f=item.values;
  if(!nkTrim_(f[0])||!nkTrim_(f[2])||nkTrim_(f[2])==="athletics"||
     !nkTrim_(f[7])||!nkTrim_(f[8])||nkTrim_(f[7])===nkTrim_(f[8]))
    throw Error("รายการนี้ยังระบุคู่แข่งขันไม่ครบ กรุณาแจ้งผู้ดูแล");
  if(["football","futsal","shootout","petanque","volleyball","takraw","tabletennis","tugofwar"].indexOf(nkTrim_(f[2]))<0)
    throw Error("ชนิดกีฬานี้ยังไม่พร้อมบันทึกผล");
  return nkEntryLock_(function(){
    var id=nkTrim_(f[0]),target=ss.getSheetByName(NK_ENTRY_PAIR_SHEET);
    if(!target)throw Error("ยังไม่มีแท็บบันทึกผลการแข่งขัน");
    if(nkEntryHasPair_(ss,id))throw Error("มีการบันทึกผลคู่นี้ไว้แล้ว กรุณาเปิดรายการเดิมเพื่อตรวจสอบ");
    var row=Array(19).fill("");
    row[0]="result-"+id;row[1]=id;row[2]=nkTrim_(f[2]);row[3]=nkTrim_(f[9]);
    row[4]=nkTrim_(f[7]);row[5]=nkTrim_(f[8]);
    row[10]="draft";row[11]=email;row[12]=new Date();row[16]=1;
    var next=target.getLastRow()+1;
    target.getRange(next,1,1,19).setValues([row]);
    ss.setActiveSheet(target);
    ss.setActiveRange(target.getRange(next,1,1,19));
    SpreadsheetApp.getUi().alert("เตรียมรายการแล้ว กรุณากรอกคะแนนและผู้ชนะ จากนั้นเลือก ‘ส่งผลให้ตรวจ’");
    return next;
  });
}
function nkStartTrackResultFromSelectedLane(){
  var email=nkRecorderEmail_(),ss=SpreadsheetApp.getActiveSpreadsheet();
  var selected=nkEntrySelectedRow_(ss.getActiveSheet(),"05_กรีฑา"),lane=selected.values;
  var eventId=nkTrim_(lane[1]),schoolId=nkTrim_(lane[6]);
  if(!eventId||!schoolId||nkTrim_(lane[5])==="-")
    throw Error("ลู่นี้ยังไม่มีโรงเรียนที่ระบุชัดเจน กรุณาตรวจรายการก่อน");
  var ev=nkRows_(ss,"03_รายการ").find(function(x){return nkTrim_(x.values[0])===eventId;});
  if(!ev||nkTrim_(ev.values[1])!=="athletics")
    throw Error("ไม่พบรายการกรีฑาที่ตรงกัน");
  return nkEntryLock_(function(){
    var target=ss.getSheetByName(NK_ENTRY_TRACK_SHEET);
    if(!target)throw Error("ยังไม่มีแท็บบันทึกผลกรีฑา");
    if(nkEntryHasAthlete_(ss,eventId,schoolId))
      throw Error("มีผลของโรงเรียนนี้ในรายการกรีฑาแล้ว กรุณาตรวจรายการเดิม");
    var row=Array(15).fill("");
    row[0]="result-"+eventId+"-"+schoolId;row[1]=eventId;row[2]=schoolId;
    row[6]="draft";row[7]=email;row[8]=new Date();row[12]=1;
    var next=target.getLastRow()+1;
    target.getRange(next,1,1,15).setValues([row]);
    ss.setActiveSheet(target);
    ss.setActiveRange(target.getRange(next,1,1,15));
    SpreadsheetApp.getUi().alert("เตรียมรายการกรีฑาแล้ว กรุณากรอกอันดับ สถิติ และหน่วย ก่อนส่งผลให้ตรวจ");
    return next;
  });
}
function nkEntryCheckSource_(ss,kind,r){
  if(kind==="pair"){
    var id=nkTrim_(r[1]);
    var fixture=nkRows_(ss,"04_คู่แข่งขัน").find(function(x){return nkTrim_(x.values[0])===id;});
    if(!fixture||nkTrim_(fixture.values[2])!==nkTrim_(r[2])||
       nkTrim_(fixture.values[7])!==nkTrim_(r[4])||
       nkTrim_(fixture.values[8])!==nkTrim_(r[5]))
      throw Error("คู่แข่งขันหรือชื่อโรงเรียนไม่ตรงกับตาราง กรุณาตรวจสอบก่อนส่ง");
  }else{
    var eventId=nkTrim_(r[1]),schoolId=nkTrim_(r[2]);
    var ev=nkRows_(ss,"03_รายการ").some(function(x){
      return nkTrim_(x.values[0])===eventId&&nkTrim_(x.values[1])==="athletics";
    });
    var school=nkRows_(ss,"02_โรงเรียน").some(function(x){return nkTrim_(x.values[0])===schoolId;});
    if(!ev||!school)throw Error("รายการกรีฑาหรือโรงเรียนไม่ตรงกับทะเบียน กรุณาตรวจสอบ");
  }
}
function nkEntryCheckDuplicate_(ss,kind,selected){
  var all=nkResultRows_(ss,kind),seenId={},seenKey={};
  all.forEach(function(x){
    var r=x.values,id=nkTrim_(r[0]),key=kind==="pair"?nkTrim_(r[1]):nkTrim_(r[1])+":"+nkTrim_(r[2]);
    if(seenId[id]||seenKey[key])throw Error("มีรายการบันทึกซ้ำ กรุณาให้ผู้ดูแลตรวจสอบ");
    seenId[id]=true;seenKey[key]=true;
  });
}
function nkSubmitResultsForReview(){
  var email=nkRecorderEmail_(),ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getActiveSheet();
  var kind=sheet.getName()===NK_ENTRY_PAIR_SHEET?"pair":
           sheet.getName()===NK_ENTRY_TRACK_SHEET?"track":null;
  if(!kind)throw Error("กรุณาเลือกผลที่ต้องการส่งในแท็บผลการแข่งขัน");
  var selection=sheet.getActiveRange();
  if(!selection||selection.getRow()<2||selection.getNumRows()<1||selection.getNumRows()>40)
    throw Error("กรุณาเลือกแถวผลการแข่งขันครั้งละไม่เกิน 40 รายการ");
  var start=selection.getRow(),count=selection.getNumRows(),c=NK_RESULT_TABS[kind];
  return nkEntryLock_(function(){
    var input=sheet.getRange(start,1,count,sheet.getLastColumn()).getValues(),now=new Date();
    nkEntryCheckDuplicate_(ss,kind,input);
    input.forEach(function(original,i){
      var r=original.slice(),st=nkTrim_(r[c.status]);
      if(st!=="draft"&&st!=="review")throw Error("แถว "+(start+i)+" ยืนยันหรือปิดผลแล้ว ไม่สามารถส่งทับได้");
      nkEntryCheckSource_(ss,kind,r);
      r[kind==="pair"?11:7]=email;r[kind==="pair"?12:8]=now;
      try{nkCheckResultRow_(kind,r);}catch(e){
        if(/JSON|sets_json/.test(e.message))throw Error("แถว "+(start+i)+": กรุณาตรวจคะแนนรายเซ็ต");
        throw Error("แถว "+(start+i)+": "+e.message);
      }
    });
    sheet.getRange(start,c.status+1,count,1).setValues(input.map(function(){return ["review"]; }));
    sheet.getRange(start,kind==="pair"?12:8,count,2).setValues(input.map(function(){return [email,now];}));
    SpreadsheetApp.getUi().alert("ส่งผล "+count+" รายการให้ตรวจสอบแล้ว ยังไม่ได้แสดงผลบนเว็บไซต์");
    return count;
  });
}
