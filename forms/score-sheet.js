/* A4 paper-only template. It NEVER submits results or writes to Google Sheets. */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const modes={
    football:"score",futsal:"score",shootout:"score",petanque:"score",
    volleyball:"sets",takraw:"sets",tabletennis:"sets",
    tugofwar:"win_loss",athletics:"ranking"
  };
  function put(id,value){if(value!==undefined&&value!==null)$(id).value=String(value);}
  function rows(lanes){
    const body=$("trackRows");body.textContent="";
    const n=Math.max(8,Array.isArray(lanes)?lanes.length:0);
    for(let i=0;i<n;i++){
      const source=Array.isArray(lanes)?lanes[i]:null;
      const row=document.createElement("tr");
      for(let col=0;col<6;col++){
        const td=document.createElement("td");
        const input=document.createElement("input");
        input.setAttribute("aria-label",["ลู่","โรงเรียน","สถิติ","หน่วย","อันดับ","หมายเหตุ"][col]+" แถว "+(i+1));
        if(col===0)input.value=source?source.lane:i+1;
        if(col===1&&source&&!source.vacant)input.value=source.source_school_label||"";
        td.appendChild(input);row.appendChild(td);
      }
      body.appendChild(row);
    }
  }
  function updateSport(){
    const kind=$("sportType").value;
    const mode=modes[kind]||"score";
    $("pairSection").hidden=mode==="ranking";
    $("scoreSection").hidden=mode!=="score";
    $("setsSection").hidden=mode!=="sets";
    $("winSection").hidden=mode!=="win_loss";
    $("trackSection").hidden=mode!=="ranking";
    put("sportName",$("sportType").selectedOptions[0].textContent);
  }
  $("sportType").addEventListener("change",()=>{updateSport();});
  $("print").addEventListener("click",()=>window.print());
  rows();
  updateSport();
  async function populateFromFixture(id){
    try{
      const res=await fetch("../data/draft-schedule.json?refresh="+Date.now(),{cache:"no-store"});
      if(!res.ok)throw Error("ไม่สามารถอ่านข้อมูลโปรแกรม");
      const data=await res.json();
      if(!data.metadata||data.metadata.all_data_approved!==false||!Array.isArray(data.fixtures))throw Error("ข้อมูลต้นทางไม่ถูกต้อง");
      const item=data.fixtures.find(x=>x.id===id);
      if(!item)throw Error("ไม่พบรหัสรายการในสูจิบัตร");
      const sport=data.sports.find(x=>x.id===item.sport_id);
      $("sportType").value=item.sport_id;
      updateSport();
      put("fixtureId",item.id);
      put("division",item.division);
      put("round",(item.round||"")+(item.source_match_no?" / "+(item.kind==="track_event"?"รายการ ":"คู่ที่ ")+item.source_match_no:""));
      put("sourcePage",item.source_page);
      const date=item.planning_date_confirmation==="confirmed"?item.planning_date:(item.date||"");
      put("date",date);
      const venue=item.planning_venue_confirmation==="confirmed"?item.planning_venue:(item.field||"");
      put("venue",venue);
      put("time",item.time?"ตาม PDF "+item.time+" น. (ยังรอยืนยัน)":"");
      if(item.kind==="track_event"){
        rows(item.lanes||[]);
      }else{
        const name=(sid,label)=>{
          const s=data.schools.find(x=>x.id===sid);
          return s?s.name:(label||"");
        };
        put("teamA",name(item.team_a_id,item.source_team_a_label));
        put("teamB",name(item.team_b_id,item.source_team_b_label));
      }
      $("loadNotice").textContent="เติมชื่อคู่/รายการตามสูจิบัตรแล้ว · กรุณาตรวจวัน เวลา สนาม และข้อมูลจริงก่อนพิมพ์ · แบบฟอร์มไม่บันทึกผลอัตโนมัติ";
    }catch(e){
      $("loadNotice").textContent="ไม่พบข้อมูลสำหรับรหัสนี้ · ใช้แบบว่างกรอกเองได้";
      console.error(e);
    }
  }
  const id=new URLSearchParams(location.search).get("fixture");
  if(id)populateFromFixture(id);
})();
