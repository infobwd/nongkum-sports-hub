/* R5: score sheet is print-only. Never writes to Sheets or a public API. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const modes={
    football:"score",futsal:"score",shootout:"shootout",petanque:"petanque",
    volleyball:"sets",takraw:"sets",tabletennis:"sets",
    tugofwar:"win_loss",athletics:"ranking"
  };
  const sourceFields=["fixtureId","division","round","sourcePage","teamA","teamB"];
  let source=null;
  let status="blank"; // blank, loading, valid, invalid
  function text(id,value){$(id).value=value==null?"":String(value);}
  function sportLabel(){
    const selected=$("sportType").selectedOptions[0];
    return selected?selected.textContent:"";
  }
  function setStatus(next,message){
    status=next;
    document.body.dataset.formState=next;
    $("print").disabled=next==="loading"||next==="invalid";
    $("printGuard").hidden=next!=="loading"&&next!=="invalid";
    if(message)$("loadNotice").textContent=message;
  }
  function makeLanes(lanes){
    const tbody=$("trackRows");
    tbody.textContent="";
    const count=Math.max(8,Array.isArray(lanes)?lanes.length:0);
    for(let rowIndex=0;rowIndex<count;rowIndex++){
      const lane=Array.isArray(lanes)?lanes[rowIndex]:null;
      const tr=document.createElement("tr");
      for(let col=0;col<6;col++){
        const td=document.createElement("td"),input=document.createElement("input");
        input.setAttribute("aria-label",["ลู่","โรงเรียน","สถิติ","หน่วย","อันดับ","หมายเหตุ"][col]+" แถว "+(rowIndex+1));
        if(col===0)input.value=lane?lane.lane:rowIndex+1;
        if(col===1&&lane&&!lane.vacant)input.value=lane.source_school_label||"";
        if(col<=1&&source)input.readOnly=true;
        td.appendChild(input);tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
  function updateSport(){
    const sport=$("sportType").value,mode=modes[sport];
    if(!mode)throw Error("ชนิดกีฬาที่เลือกไม่รองรับ");
    $("pairSection").hidden=mode==="ranking";
    $("scoreSection").hidden=mode!=="score";
    $("petanqueSection").hidden=mode!=="petanque";
    $("shootoutSection").hidden=mode!=="shootout";
    $("setsSection").hidden=mode!=="sets";
    $("winSection").hidden=mode!=="win_loss";
    $("trackSection").hidden=mode!=="ranking";
    text("sportName",sportLabel());
  }
  function verifyBoundSource(){
    if(!source)return status==="blank"&&!$("fixtureId").value;
    if(status!=="valid"||$("sportType").value!==source.sport_id||
       $("fixtureId").value!==source.id||$("sportName").value!==sportLabel())return false;
    for(const key of ["division","round","sourcePage","teamA","teamB"]){
      if($(key).value!==source.fields[key])return false;
    }
    return true;
  }
  function blank(){
    source=null;
    $("sportType").disabled=false;
    for(const el of document.querySelectorAll(".paper input")){
      el.value="";
      el.readOnly=false;
    }
    // ID is always generated only from source data. Blank sheets get a handwritten ID.
    $("fixtureId").readOnly=true;
    $("sportName").readOnly=true;
    makeLanes();
    updateSport();
    setStatus("blank","แบบฟอร์มเปล่า — เลือกชนิดกีฬาได้ และเขียนรหัสคู่ที่ตรวจสอบแล้วบนกระดาษ หากต้องการรหัสอัตโนมัติให้เปิดจากหน้าโปรแกรม");
  }
  function printSheet(){
    if(!verifyBoundSource()){
      setStatus("invalid","ไม่สามารถพิมพ์ได้: ชนิดกีฬา รหัสคู่ หรือข้อมูลอ้างอิงไม่ตรงกับรายการต้นทาง กรุณาเปิดใหม่หรือเริ่มแบบเปล่า");
      return;
    }
    window.print();
  }
  $("blankNew").addEventListener("click",function(){
    // Explicit reset prevents a newly chosen sport from carrying old fixture details.
    blank();
    if(location.search&&typeof history!=="undefined"&&history.replaceState){
      history.replaceState(null,"",location.pathname);
    }
  });
  $("sportType").addEventListener("change",function(){
    if(source){
      $("sportType").value=source.sport_id;
      setStatus("valid","ชนิดกีฬาถูกล็อกจากคู่แข่งขัน หากต้องการเปลี่ยนกีฬาให้กด 'เริ่มแบบเปล่าใหม่'");
      return;
    }
    // When changing blank form sport, remove all previous entry fields.
    blank();
  });
  $("print").addEventListener("click",printSheet);
  window.addEventListener("beforeprint",function(){
    const ok=verifyBoundSource();
    document.body.dataset.formState=ok?(source?"valid":"blank"):"invalid";
    $("printGuard").hidden=ok;
  });
  function school(data,id,label){
    const record=data.schools.find(x=>x.id===id);
    return record?record.name:(label||"");
  }
  async function loadFixture(id){
    setStatus("loading","กำลังตรวจรหัสรายการจากสูจิบัตรฉบับร่าง…");
    try{
      const response=await fetch("../data/draft-schedule.json?refresh="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw Error("ไม่สามารถอ่านข้อมูลต้นทาง");
      const data=await response.json();
      if(!data.metadata||data.metadata.all_data_approved!==false||
         !Array.isArray(data.fixtures)||!Array.isArray(data.sports)||!Array.isArray(data.schools))
        throw Error("ข้อมูลต้นทางไม่ผ่านการตรวจสอบ");
      const item=data.fixtures.find(x=>x.id===id);
      if(!item||!modes[item.sport_id]||(item.kind==="track_event")!==(item.sport_id==="athletics"))
        throw Error("ไม่พบรหัสคู่หรือชนิดกีฬาของรายการ");
      if(!data.sports.some(x=>x.id===item.sport_id))throw Error("ไม่พบชนิดกีฬาในทะเบียน");
      // All linked fields derive from this single verified fixture id, never from manual sport selection.
      const round=(item.round||"")+(item.source_match_no?
        " / "+(item.kind==="track_event"?"รายการ ":"คู่ที่ ")+item.source_match_no:"");
      const fields={
        division:item.division||"",round,sourcePage:String(item.source_page||""),
        teamA:item.kind==="track_event"?"":school(data,item.team_a_id,item.source_team_a_label),
        teamB:item.kind==="track_event"?"":school(data,item.team_b_id,item.source_team_b_label)
      };
      source={id:item.id,sport_id:item.sport_id,fields};
      $("sportType").value=item.sport_id;
      $("sportType").disabled=true;
      for(const key of sourceFields)$(key).readOnly=true;
      text("fixtureId",item.id);
      for(const key of Object.keys(fields))text(key,fields[key]);
      const date=item.planning_date_confirmation==="confirmed"?item.planning_date:item.date;
      const venue=item.planning_venue_confirmation==="confirmed"?item.planning_venue:item.field;
      text("date",date);
      text("venue",venue);
      text("time",item.time?"ตาม PDF "+item.time+" น. (ยังรอยืนยัน)":"");
      updateSport();
      makeLanes(item.kind==="track_event"?(item.lanes||[]):[]);
      setStatus("valid","โหลดรายการ "+item.id+" แล้ว · ล็อกชนิดกีฬาและข้อมูลคู่ไว้ · กรุณาตรวจวัน เวลา สนามก่อนพิมพ์; หากจะเปลี่ยนกีฬาให้เริ่มแบบเปล่าใหม่");
      if(!verifyBoundSource())throw Error("การตรวจทานชนิดกีฬาและรหัสรายการไม่ผ่าน");
    }catch(e){
      source=null;
      $("sportType").disabled=true;
      setStatus("invalid","ไม่พบ/ตรวจรหัสรายการไม่ได้ จึงระงับการพิมพ์ กรุณาเปิดใหม่จากหน้าโปรแกรมหรือกด 'เริ่มแบบเปล่าใหม่'");
      console.error(e);
    }
  }
  blank();
  const id=new URLSearchParams(location.search).get("fixture");
  if(id)loadFixture(id);
})();