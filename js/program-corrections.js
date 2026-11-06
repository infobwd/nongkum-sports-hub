/* R20-B: approved corrections on top of the archived PDF extraction.
 * Do not discard the original source fixture: its ambiguity remains auditable in git.
 * Keep this pure and idempotent so UI, printable forms and committee views agree.
 */
(function(root){
  "use strict";
  const EXCLUDED_ID="football-p07-มัธยมหญิง-020-repeated-final";
  const CONFIRMED_ID="football-p07-มัธยมหญิง-007";
  const DATE="2026-11-18";
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
    const count=fixtures.length;
    if(count!==236)throw Error("corrected_program_count_unexpected");
    const inventory=(input.page_inventory||[]).map(x=>x.page===7?{...x,match_count:20}:x);
    const sourceQa=(input.source_qa||[]).map(x=>x.code==="PDF69-R01"?{
      ...x,status:"resolved",description:"ผู้จัดยืนยัน 6 พฤศจิกายน 2569: ฟุตบอลมัธยมหญิงรอบชิงแข่ง 18 พ.ย. เพียงคู่เดียว ตัดบรรทัด 20 พ.ย. ที่ซ้ำ; เวลา/สนามยังรอตรวจ"
    }:x);
    return {...input,fixtures,page_inventory:inventory,source_qa:sourceQa,metadata:{
      ...input.metadata,count_matches:186,source_item_count:236,count_confirmed_venues:236,
      football_women_final_confirmation:"2026-11-18",
      football_women_duplicate_excluded:EXCLUDED_ID,
      corrections_source:"ผู้จัดยืนยัน 6 พฤศจิกายน 2569",
      venue_confirmation:String(input.metadata.venue_confirmation||"").replace("237 รายการ","236 รายการ")
    }};
  }
  root.NongkumProgramCorrections=Object.freeze({apply});
})(globalThis);
