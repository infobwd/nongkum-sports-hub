/* R20-B: approved corrections on top of the archived PDF extraction.
 * Do not discard the original source fixture: its ambiguity remains auditable in git.
 * Keep this pure and idempotent so UI, printable forms and committee views agree.
 */
(function(root){
  "use strict";
  const EXCLUDED_ID="football-p07-มัธยมหญิง-020-repeated-final";
  const CONFIRMED_ID="football-p07-มัธยมหญิง-007";
  const DATE="2026-11-18";
  // R47: explicit 17 Nov organizer confirmation applies only to five named
  // fixtures shown on 18 Nov. Keep archived PDF source and unresolved bracket
  // approval distinct. Do not use this for any other date or school.
  const R47_CONFIRMED=Object.freeze({
    "football-p07-12-ปี-ชาย-009":["football","nongkrathum","wangdong","09:30"],
    "volleyball-p11-12-ปี-ชาย-B-006":["volleyball","wangdong","nongkrathum","09:30"],
    "football-p07-12-ปี-ชาย-011":["football","thungmasang","wangdong","11:00"],
    "futsal-p09-10-ปี-ชาย-B-009":["futsal","wangdong","thungmasang","13:30"],
    "takraw-p13-12-ปี-ชาย-A-015":["takraw","wangdong","nongkrathum","14:00"]
  });
  const R47_NOTE="ผู้จัดยืนยันทางแชต 17 พฤศจิกายน 2569 สำหรับ 5 รายการบ้านวังด้ง วันที่ 18 พฤศจิกายน 2569";

  function apply(input){
    if(!input||input.schema_version!==3||input.metadata?.source_status!=="revised_pdf_draft"||
       !Array.isArray(input.fixtures))return input;
    const original=input.fixtures;
    const dated=original.find(x=>x.id===CONFIRMED_ID);
    if(!dated||dated.kind!=="match"||dated.sport_id!=="football"||
       dated.draft_date!==DATE)throw Error("football_women_correction_source_changed");
    const excluded=original.find(x=>x.id===EXCLUDED_ID);
    if(excluded&&(excluded.sport_id!=="football"||excluded.draft_date!=="2026-11-20"||
       excluded.source_pair_text!==dated.source_pair_text))
      throw Error("football_women_duplicate_mismatch");
    const fixtures=original.filter(x=>x.id!==EXCLUDED_ID).map(x=>x.id!==CONFIRMED_ID?x:{
      ...x,
      planning_date:DATE,
      planning_date_confirmation:"confirmed",
      planning_status:"review",
      planning_source:"ผู้จัดยืนยัน 6 พฤศจิกายน 2569: ฟุตบอลมัธยมหญิงรอบชิงแข่งขัน 18 พ.ย. เท่านั้น",
      planning_schedule_confirmation_note:"ตัดรายการซ้ำ 20 พ.ย. ออกจากโปรแกรมใช้งาน; ยังไม่ยืนยันเวลาและสนามย่อย",
      qa_flags:(x.qa_flags||[]).filter(flag=>flag!=="PDF69-R01")
    });
    const confirmedFive=fixtures.map(x=>{
      const expected=R47_CONFIRMED[x.id];
      if(!expected)return x;
      const [sport,a,b,time]=expected;
      const sourceTime=String(x.source_pdf?.source_time||x.draft_time||x.time||"").slice(0,5);
      if(x.draft_date!==DATE||x.sport_id!==sport||x.team_a_id!==a||
        x.team_b_id!==b||sourceTime!==time)
        throw Error("r47_organizer_confirmation_source_changed");
      return {...x,
        planning_date:DATE,planning_date_confirmation:"confirmed",
        planning_time:time,planning_time_confirmation:"confirmed",
        planning_subvenue_confirmation:x.source_pdf?.source_field?"confirmed":x.planning_subvenue_confirmation,
        planning_source:R47_NOTE,planning_time_source:R47_NOTE,
        planning_schedule_confirmation_note:"ผู้จัดยืนยันวัน/เวลาและสนามตามรายการที่ส่ง; ไม่ยืนยันผล ผัง หรือคู่รอบถัดไป",
        planning_status:"review"
      };
    });
    if(confirmedFive.filter(x=>R47_CONFIRMED[x.id]&&x.planning_time_confirmation==="confirmed").length!==5)
      throw Error("r47_organizer_confirmation_count");
    const count=confirmedFive.length;
    if(count!==236)throw Error("corrected_program_count_unexpected");
    const inventory=(input.page_inventory||[]).map(x=>x.page===7?{...x,match_count:20}:x);
    const sourceQa=(input.source_qa||[]).map(x=>x.code==="PDF69-R01"?{
      ...x,status:"resolved",description:"ผู้จัดยืนยัน 6 พฤศจิกายน 2569: ฟุตบอลมัธยมหญิงรอบชิงแข่ง 18 พ.ย. เพียงคู่เดียว ตัดบรรทัด 20 พ.ย. ที่ซ้ำ; เวลา/สนามยังรอตรวจ"
    }:x);
    return {...input,fixtures:confirmedFive,page_inventory:inventory,source_qa:sourceQa,metadata:{
      ...input.metadata,count_matches:186,source_item_count:236,count_confirmed_venues:236,
      count_confirmed_schedule_rows:50,r47_confirmation_count:5,
      r47_confirmation_note:R47_NOTE,
      football_women_final_confirmation:"2026-11-18",
      football_women_duplicate_excluded:EXCLUDED_ID,
      corrections_source:"ผู้จัดยืนยัน 6 พฤศจิกายน 2569",
      venue_confirmation:String(input.metadata.venue_confirmation||"").replace("237 รายการ","236 รายการ")
    }};
  }
  root.NongkumProgramCorrections=Object.freeze({apply});
})(globalThis);
