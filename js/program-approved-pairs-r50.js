/* R50: read-only, version-pinned R33 participant-pair overlay.
 * Website schedule remains GitHub-static; do not expose privileged Supabase keys.
 * Approval is for the two participating schools only, never for date/time, score or venue.
 * Source: active R33 r33-20261118-r50-12pairs-r32-100; evidence R32 approved results.
 * Preserve original PDF fixture labels, validation flags, and date/time confirmation fields.
 */
(function(root){
  "use strict";
  const SOURCE_KEY="r33-20261118-r50-12pairs-r32-100";
  const SOURCE_SHA256="1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf";
  const PAIRS=Object.freeze([
    ["tabletennis-p20-12-ปี-ชาย-009","tabletennis","12 ปี ชาย","9","phuphrom","nongkrathum"],
    ["tabletennis-p20-12-ปี-ชาย-010","tabletennis","12 ปี ชาย","10","saohong","rangkham"],
    ["tabletennis-p20-12-ปี-หญิง-011","tabletennis","12 ปี หญิง","11","nongkum","rangkham"],
    ["tabletennis-p20-12-ปี-หญิง-012","tabletennis","12 ปี หญิง","12","saohong","phuphrom"],
    ["petanque-p17-8-ปี-หญิง-027","petanque","8 ปี หญิง","37","nongkum","nongkrathum"],
    ["petanque-p17-8-ปี-หญิง-028","petanque","8 ปี หญิง","38","saohong","wangdong"],
    ["futsal-p09-10-ปี-ชาย-010","futsal","10 ปี ชาย","10","wangkhaokaew","thungmasang"],
    ["futsal-p09-10-ปี-ชาย-011","futsal","10 ปี ชาย","11","saohong","phuphrom"],
    ["volleyball-p11-12-ปี-ชาย-013","volleyball","12 ปี ชาย","15","thungmasang","phuphrom"],
    ["volleyball-p11-12-ปี-ชาย-014","volleyball","12 ปี ชาย","16","nongkrathum","nongkum"],
    ["volleyball-p11-12-ปี-หญิง-015","volleyball","12 ปี หญิง","13","thungmasang","nongkum"],
    ["volleyball-p11-12-ปี-หญิง-016","volleyball","12 ปี หญิง","14","saohong","wangdong"]
  ].map(row=>Object.freeze(row)));
  const BY_ID=new Map(PAIRS.map(row=>[row[0],row]));
  function apply(data){
    if(!data||data.schema_version!==3||!Array.isArray(data.fixtures)||
       data.fixtures.length!==236||data.metadata?.source_sha256!==SOURCE_SHA256||
       data.metadata?.all_data_approved!==false||
       data.metadata?.source_status!=="revised_pdf_draft"||
       data.metadata?.football_women_duplicate_excluded!=="football-p07-มัธยมหญิง-020-repeated-final")
      throw Error("R50: ข้อมูลตารางต้นฉบับไม่ตรงกับรุ่นที่ตรวจรับ");
    const schools=new Set((data.schools||[]).map(s=>s.id));
    const ids=new Set();
    let matched=0;
    for(const f of data.fixtures){
      if(ids.has(f.id))throw Error("R50: duplicated fixture ID");
      ids.add(f.id);
      const row=BY_ID.get(f.id);
      if(!row)continue;
      matched++;
      if(f.kind!=="match"||f.round!=="รองชนะเลิศ"||
         f.sport_id!==row[1]||f.division!==row[2]||String(f.source_match_no)!==row[3]||
         f.team_a_id!=null||f.team_b_id!=null||
         !f.source_pair_text||!schools.has(row[4])||!schools.has(row[5]))
        throw Error("R50: แหล่งข้อมูลคู่แข่งขันไม่ตรงกัน: "+row[0]);
    }
    if(matched!==PAIRS.length)throw Error("R50: fixture coverage mismatch");
    const fixtures=data.fixtures.map(f=>{
      const row=BY_ID.get(f.id);
      return row?{...f,team_a_id:row[4],team_b_id:row[5],
        pair_confirmation:"approved_results",
        pair_confirmation_source_key:SOURCE_KEY,
        pair_confirmation_note:"คู่แข่งขันยืนยันจากผลรับรองแล้ว; วันและเวลาตรวจแยก"}:f;
    });
    return {...data,fixtures,metadata:{...data.metadata,
      r50_approved_pair_count:matched,r50_approved_pair_source_key:SOURCE_KEY}};
  }
  root.NongkumApprovedPairsR50=Object.freeze({apply,sourceKey:SOURCE_KEY,pairCount:PAIRS.length,
    rows:()=>PAIRS.map(row=>row.slice())});
})(globalThis);
