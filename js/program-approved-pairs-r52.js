/* R52: photo-confirmed petanque schedule pair overlay (read-only GitHub-static).
 * R32 approved results: 54 petanque, including 44 verified from 19 Nov organizer photo.
 * R33 source: r33-20261119-r52-petanque-54approved. Preserve original PDF JSON & R50 overlay.
 * Only two corrected original bracket labels; dates/times/venues not promoted.
 */
(function(root){
  "use strict";
  const SOURCE_KEY="r33-20261119-r52-petanque-54approved";
  const PREVIOUS="r33-20261118-r50-12pairs-r32-100";
  const SOURCE_SHA256="1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf";
  const ROWS=Object.freeze([
  {
    "fixture_id": "petanque-p14-ปฐมวัยชาย-009",
    "sport": "petanque",
    "division": "ปฐมวัยชาย",
    "match_no": "9",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "wangkhaokaew",
    "team_b": "thungmasang",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 1 – ผู้ชนะคู่ที่ 2 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 1 – ผู้ชนะคู่ที่ 2 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p14-ปฐมวัยชาย-010",
    "sport": "petanque",
    "division": "ปฐมวัยชาย",
    "match_no": "10",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "wangdong",
    "team_b": "phuphrom",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p14-ปฐมวัยชาย-013",
    "sport": "petanque",
    "division": "ปฐมวัยชาย",
    "match_no": "13",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "wangkhaokaew",
    "team_b": "wangdong",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 9 – ผู้ชนะคู่ที่ 10    (ชิง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 9 – ผู้ชนะคู่ที่ 10    (ชิง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p14-ปฐมวัยหญิง-011",
    "sport": "petanque",
    "division": "ปฐมวัยหญิง",
    "match_no": "11",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "saohong",
    "team_b": "wangkhaokaew",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 5 – ผู้ชนะคู่ที่ 6 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 5 – ผู้ชนะคู่ที่ 6 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p14-ปฐมวัยหญิง-012",
    "sport": "petanque",
    "division": "ปฐมวัยหญิง",
    "match_no": "12",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "rangkham",
    "team_b": "wangdong",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 7 – ผู้ชนะคู่ที่ 8 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 7 – ผู้ชนะคู่ที่ 8 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p14-ปฐมวัยหญิง-014",
    "sport": "petanque",
    "division": "ปฐมวัยหญิง",
    "match_no": "14",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "wangkhaokaew",
    "team_b": "wangdong",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 11 – ผู้ชนะคู่ที่ 12   (ชิง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 11 – ผู้ชนะคู่ที่ 12   (ชิง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p17-10-ปี-ชาย-010",
    "sport": "petanque",
    "division": "10 ปี ชาย",
    "match_no": "2",
    "expected_team_a": "rangkham",
    "expected_team_b": "nongkrathum",
    "team_a": "rangkham",
    "team_b": "thungmasang",
    "expected_source_pair_text": "รางขาม – หนองกระทุ่ม",
    "source_pair_text": "รางขาม – ทุ่งมะสังฯ",
    "basis": "organizer_photo_corrected_fixture"
  },
  {
    "fixture_id": "petanque-p17-10-ปี-ชาย-030",
    "sport": "petanque",
    "division": "10 ปี ชาย",
    "match_no": "10",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "wangkhaokaew",
    "team_b": "nongkum",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 2 – ผู้ชนะคู่ที่ 4 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 3 – ผู้ชนะคู่ที่ 4 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p17-10-ปี-หญิง-031",
    "sport": "petanque",
    "division": "10 ปี หญิง",
    "match_no": "11",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "wangdong",
    "team_b": "rangkham",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 5 – ผู้ชนะคู่ที่ 6 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 5 – ผู้ชนะคู่ที่ 6 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p17-10-ปี-หญิง-032",
    "sport": "petanque",
    "division": "10 ปี หญิง",
    "match_no": "12",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "phuphrom",
    "team_b": "nongkum",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 7 – ผู้ชนะคู่ที่ 8 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 7 – ผู้ชนะคู่ที่ 8 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p17-8-ปี-ชาย-025",
    "sport": "petanque",
    "division": "8 ปี ชาย",
    "match_no": "35",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "saohong",
    "team_b": "phuphrom",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 27 – ผู้ชนะคู่ที่ 28 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 27 – ผู้ชนะคู่ที่ 28 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p17-8-ปี-ชาย-026",
    "sport": "petanque",
    "division": "8 ปี ชาย",
    "match_no": "36",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "nongkum",
    "team_b": "nongkrathum",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 29 – ผู้ชนะคู่ที่ 30 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 29 – ผู้ชนะคู่ที่ 30 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p18-10-ปี-หญิง-040",
    "sport": "petanque",
    "division": "10 ปี หญิง",
    "match_no": "42",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "wangdong",
    "team_b": "nongkum",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 11 – ผู้ชนะคู่ที่ 12 (ชิง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 11 – ผู้ชนะคู่ที่ 12 (ชิง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p18-12-ปี-ชาย-033",
    "sport": "petanque",
    "division": "12 ปี ชาย",
    "match_no": "21",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "nongkrathum",
    "team_b": "rangkham",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 13 – ผู้ชนะคู่ที่ 14 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 13 – ผู้ชนะคู่ที่ 14 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p18-12-ปี-ชาย-034",
    "sport": "petanque",
    "division": "12 ปี ชาย",
    "match_no": "22",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "nongkum",
    "team_b": "wangdong",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 15 – ผู้ชนะคู่ที่ 16 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 15 – ผู้ชนะคู่ที่ 16 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p18-12-ปี-ชาย-041",
    "sport": "petanque",
    "division": "12 ปี ชาย",
    "match_no": "43",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "nongkrathum",
    "team_b": "wangdong",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 21 – ผู้ชนะคู่ที่ 22 (ชิง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 21 – ผู้ชนะคู่ที่ 22 (ชิง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p18-12-ปี-หญิง-035",
    "sport": "petanque",
    "division": "12 ปี หญิง",
    "match_no": "23",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "saohong",
    "team_b": "nongkum",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 17 – ผู้ชนะคู่ที่ 18 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 17 – ผู้ชนะคู่ที่ 18 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p18-12-ปี-หญิง-036",
    "sport": "petanque",
    "division": "12 ปี หญิง",
    "match_no": "24",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "phuphrom",
    "team_b": "wangdong",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 19 – ผู้ชนะคู่ที่ 20 (รอบรอง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 19 – ผู้ชนะคู่ที่ 20 (รอบรอง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p18-12-ปี-หญิง-042",
    "sport": "petanque",
    "division": "12 ปี หญิง",
    "match_no": "44",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "saohong",
    "team_b": "wangdong",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 23 – ผู้ชนะคู่ที่ 24 (ชิง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 23 – ผู้ชนะคู่ที่ 24 (ชิง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p18-8-ปี-ชาย-037",
    "sport": "petanque",
    "division": "8 ปี ชาย",
    "match_no": "39",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "phuphrom",
    "team_b": "nongkrathum",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 35 – ผู้ชนะคู่ที่ 36 (ชิง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 35 – ผู้ชนะคู่ที่ 36 (ชิง)",
    "basis": "approved_feeder_results"
  },
  {
    "fixture_id": "petanque-p18-8-ปี-หญิง-038",
    "sport": "petanque",
    "division": "8 ปี หญิง",
    "match_no": "40",
    "expected_team_a": null,
    "expected_team_b": null,
    "team_a": "nongkum",
    "team_b": "wangdong",
    "expected_source_pair_text": "ผู้ชนะคู่ที่ 37 – ผู้ชนะคู่ที่ 38 (ชิง)",
    "source_pair_text": "ผู้ชนะคู่ที่ 37 – ผู้ชนะคู่ที่ 38 (ชิง)",
    "basis": "approved_feeder_results"
  }
].map(r=>Object.freeze(r)));
  const BY_ID=new Map(ROWS.map(r=>[r.fixture_id,r]));
  function apply(data){
    if(!data||data.schema_version!==3||!Array.isArray(data.fixtures)||
       data.fixtures.length!==236||data.metadata?.source_sha256!==SOURCE_SHA256||
       data.metadata?.all_data_approved!==false||
       data.metadata?.source_status!=="revised_pdf_draft"||
       data.metadata?.football_women_duplicate_excluded!=="football-p07-มัธยมหญิง-020-repeated-final"||
       data.metadata?.r50_approved_pair_count!==12||
       data.metadata?.r50_approved_pair_source_key!==PREVIOUS)
      throw Error("R52: ตารางต้นฉบับ/R50 ไม่ตรงกับรุ่นที่ตรวจรับ");
    const schools=new Set((data.schools||[]).map(s=>s.id));
    const seen=new Set();
    let matched=0;
    for(const f of data.fixtures){
      if(seen.has(f.id))throw Error("R52: รหัสรายการซ้ำ");
      seen.add(f.id);
      const r=BY_ID.get(f.id);
      if(!r)continue;
      matched++;
      if(f.kind!=="match"||f.sport_id!==r.sport||
         f.division!==r.division||String(f.source_match_no)!==r.match_no||
         f.team_a_id!==r.expected_team_a||f.team_b_id!==r.expected_team_b||
         f.source_pair_text!==r.expected_source_pair_text||
         !schools.has(r.team_a)||!schools.has(r.team_b)||r.team_a===r.team_b)
        throw Error("R52: ไม่สามารถซิงก์คู่แข่งขัน รายการไม่ตรงกับต้นฉบับ "+f.id);
    }
    if(matched!==ROWS.length)throw Error("R52: จับคู่รายการไม่ครบ 21");
    const names=new Map((data.schools||[]).map(s=>[s.id,s.short]));
    const fixtures=data.fixtures.map(f=>{
      const r=BY_ID.get(f.id);
      if(!r)return f;
      const direct=r.basis==="organizer_photo_corrected_fixture";
      const revised={...f,
        team_a_id:r.team_a,team_b_id:r.team_b,
        source_pair_text:r.source_pair_text,
        source_pair_corrected:r.source_pair_text!==r.expected_source_pair_text,
        pair_confirmation:direct?"organizer_photo":"approved_results",
        pair_confirmation_source_key:SOURCE_KEY,
        pair_confirmation_note:direct
          ?"แก้ชื่อคู่แข่งขันตามภาพจากสนามที่ผู้จัดยืนยัน; วันเวลาและสนามตรวจแยก"
          :"คู่แข่งขันยืนยันจากผลรับรองแล้ว; วันเวลาและสนามตรวจแยก"};
      if(direct){
        revised.source_team_a_label=names.get(r.team_a);
        revised.source_team_b_label=names.get(r.team_b);
      }else if(f.id==="petanque-p17-10-ปี-ชาย-030"){
        revised.source_team_a_label="ผู้ชนะคู่ที่ 3";
        revised.source_team_b_label="ผู้ชนะคู่ที่ 4";
      }
      return revised;
    });
    return {...data,fixtures,metadata:{...data.metadata,
      r52_updated_pair_count:matched,r52_schedule_source_key:SOURCE_KEY}};
  }
  root.NongkumApprovedPairsR52=Object.freeze({
    apply,sourceKey:SOURCE_KEY,pairCount:ROWS.length,
    rows:()=>ROWS.map(r=>({...r}))
  });
})(globalThis);
