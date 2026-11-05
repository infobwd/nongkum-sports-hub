# R12C — Data Contract และคู่มือวิเคราะห์ตารางจากทะเบียนนักกีฬาส่วนตัว

**สถานะ ณ 5 พฤศจิกายน 2569: ENGINE + SYNTHETIC TESTS PREPARED; REAL ATHLETE VALIDATION NOT STARTED.**

อ้างอิง: [แผน R12](R12_ATHLETE_DOCUMENT_TO_JSON_SCHEDULE_CONFLICT_PLAN.md), [R12B private intake](R12B_PRIVATE_PAPER_ROSTER_INTAKE_CHECKLIST.md), [R12A screening](R12A_SCHOOL_TIME_RISK_REPORT_2569.md). ข้อมูลใน `scripts/r12/fixtures/r12c-synthetic-*.json` เป็นตัวอย่าง **สมมติทั้งหมด** ไม่ใช่รายชื่อนักเรียนจาก 8 โรงเรียน

## สถานะหลักฐานและสิ่งที่ห้ามสรุป

- R12A merged PR #28; คัดกรองเวลาเริ่มระดับโรงเรียนจาก PDF draft เท่านั้น (33 กลุ่มเวลาเท่ากัน, 96 คู่เวลาห่าง <=30 นาที) ไม่ได้ตรวจรายคน
- R12B พื้นที่เก็บ **My Drive ของเจ้าของ ไม่แชร์**, บันทึก owner-only; ตรวจซ้ำ 5 พ.ย. 2569 พบสิทธิ์ user/owner เพียงรายการเดียว, `shared=false`, ไม่ใช่ Shared Drive, โฟลเดอร์ว่าง. **ยังไม่ได้รับกระดาษจริง** และไม่มี private GitHub repository
- R12C ทำงานบนข้อมูลที่ผ่านเจ้าหน้าที่รับรองเท่านั้น; ข้อมูลใน candidate `data/program-from-pdf-2569-20261104-draft.json` มี 237 รายการ (187 match + 50 athletics events/289 lane entries) เป็น candidate ไม่ใช่ปฏิทินวันเวลา approved ทั้งหมด. หลายรายการกรีฑาไม่มีเวลา, 3 แถวไม่มีวันที่ draft ที่ใช้ได้, รอบถัดไปไม่ทราบโรงเรียน. ตรวจ source revision และ field-level confirmation ใหม่ก่อนวิเคราะห์จริง
- จาก `rules[]` ใน candidate พบ **เกณฑ์ถ้วยรวม 5/3/2 คะแนนตามอันดับ** และ **กติกาเปตองตามเซ็ต 11 แต้ม**; `divisions[]` ระบุจำนวนผู้เล่น/สำรองบางชนิดกีฬา แต่ **ไม่พบหลักฐานเกณฑ์จำนวนชนิดกีฬาหรือจำนวนรายการสูงสุดต่อคน** ในข้อมูลกติกาที่ถอดไว้. จึง **ไม่บังคับเพดานการลงแข่ง** และต้องให้กรรมการตรวจเอกสารต้นฉบับ/คำสั่งเพิ่มเติมก่อนเพิ่มข้อจำกัดใด ๆ
- ไม่มีเครื่องมือใดเขียนทับตารางแข่ง, source PDF, Google Docs, R15 results/standings หรือทะเบียนส่วนตัว

## กระบวนการกระดาษ → JSON (เฉพาะพื้นที่ส่วนตัว)

1. รับภาพหน้ากระดาษจาก **8 โรงเรียน** ใน Drive ที่ตรวจสิทธิ์ซ้ำและช่องทางที่ผู้จัดอนุญาต พร้อมรหัสเอกสาร/โรงเรียน/หน้า/วันที่รับ; ไม่ย้ายภาพหรือชื่อเด็กเข้าสู่ public repository
2. แยก **intake JSON แบบส่วนตัว** ออกจาก **analytic roster แบบรหัส**. บันทึก `name_raw`, `name_reviewed`, ภาพ/หน้า/แถว, การอ่านไม่ชัดและ revision เฉพาะใน intake JSON; ไม่มีข้อมูลชื่อนักเรียนใน input ที่จำเป็นของ engine
3. เจ้าหน้าที่ตรวจตัวสะกดและความครบทุกหน้า, ทบทวนคนที่ชื่อซ้ำ/คล้าย/หลายกีฬา โดยดูเอกสารจริง. **ห้ามรวมคนอัตโนมัติ**; เมื่อยืนยันแล้วจึงออก `athlete_id` ภายในที่ไม่ใช่เลขประจำตัวนักเรียน
4. จัดทำ `teams[]` ตามรุ่น/ชนิดกีฬา/รหัสโรงเรียนใน source fixture และ `lane_assignments[]` เฉพาะกรณีที่ยืนยันหลักฐานได้ (สำคัญสำหรับลู่ที่ต้นฉบับระบุ “ศูนย์ฯ” หรือ `school_id=null`)
5. ให้กรรมการรับรอง `config.timings[]` (วัน, เวลาเริ่ม, ระยะเวลา, นำรายงานตัว, สนามจริง, ช่วงเผื่อล่าช้า) และ `config.travel[]` แบบมีทิศทาง รวม `policy.minimum_rest_minutes`. **ตัวเลขใน synthetic fixture เป็นเพียงข้อมูลทดสอบ ไม่มีผลเป็นกติกาจริง**
6. ประมวลผลในเครื่อง/พื้นที่ส่วนตัวเท่านั้น. `result.details` และ `result.unresolved` มีรหัสภายในและห้ามเผยแพร่. ส่งสาธารณะได้เฉพาะ `publicSummary(result)` (จำนวนรวม ไม่แจกแจงนักกีฬา/โรงเรียน/คู่แข่งขัน) หลังตรวจความเสี่ยงระบุย้อนกลับ
7. ข้อมูลไม่ครบให้บันทึก `unknown` และ coverage คงค้าง. ไม่ใช้คำว่า “ไม่ชน” จนกว่าจะรู้ครบว่าข้อมูลชนิดใดตรวจได้จริงและมีหลักฐานอนุมัติ

## Data Contract `r12-private-roster-v1`

จัดเก็บเป็น **private JSON แยกไฟล์** ตาม schema ที่ engine อ่าน; ไม่ต้องมีหน้าเว็บไซต์ใหม่. ตัวอย่างตัวแปรและค่าที่ไม่ระบุตัวจริงอยู่ใน `scripts/r12/fixtures/r12c-synthetic-roster.json`.

| ฟิลด์ | รายละเอียด / เงื่อนไข |
|---|---|
| `schema_version` | `r12-private-roster-v1` |
| `synthetic` | `true` เฉพาะชุดทดสอบ, `false` เมื่อใช้ข้อมูลจริง; ต้องตรงกับ config |
| `school_coverage[]` | `school_id`, `status`, `expected_pages`, `received_pages`, `rows_verified` ครบทุกโรงเรียน จึงเปิด gate all-clear |
| `athletes[]` | `athlete_id` ที่ยืนยันตัวตนโดยเจ้าหน้าที่, `school_id`, `identity_verified`, `extraction_status=accepted_for_analysis`, `registrations[]`; ไม่ใช้ชื่อช่วย join |
| `registrations[]` | `sport_id`, `role` = player/substitute/relay_member, `division` + `team_ref` สำหรับทีม หรือ `event_id` + `lane` สำหรับกรีฑา; ใช้หลายรายการต่อคนได้ |
| `teams[]` | `team_ref`, `school_id`, `source_team_id`, `sport_id`, `division`, `review_status=accepted_for_analysis`; `possible_fixture_ids[]` สำหรับรอบยังไม่ทราบทีม/ผู้ชนะที่ตรวจความเป็นไปได้แล้ว |
| `lane_assignments[]` | ยืนยัน `fixture_id` + `lane` + `school_id` + `review_status` เมื่อข้อมูลลู่ใน candidate ยังไม่ผูกโรงเรียน; ไม่อนุมาน “ศูนย์ฯ” เป็นโรงเรียน |

**Data contract เวลา (`config`)**: `timings[]` ทุกแถวต้องมี `fixture_id`, `date` (ISO), `start` (HH:mm local), `duration_minutes` (>0), `check_in_lead_minutes`, `delay_buffer_minutes`, `venue_id`, `evidence_status`, `source_revision`. `travel[]` ระบุ `from_venue_id`, `to_venue_id`, `minutes`, evidence/source เช่นเดียวกัน และ `policy` มี `minimum_rest_minutes`, evidence/source. ใช้ `organizer_confirmed` สำหรับค่าจริงที่ผ่านการยืนยัน; `synthetic` ในชุดทดสอบเท่านั้น; `draft` ไม่ทำให้กลายเป็น approved.

**ข้อสำคัญ:** ไฟล์ engine ไม่แปลง `draft_time` ของ candidate เป็นเวลารับรองเอง. หากไม่รู้ `duration`, `travel`, `rest`, mapping ลู่ หรือหลักฐานการอนุมัติ ต้องแสดง unknown/potential ตามความเหมาะสม. การตีความเช็กอินทำก่อนเวลาลงแข่ง, เวลาพัก/เผื่อความล่าช้าคิดเพิ่มจากเวลาเดินทาง. ถ้าช่วงเช็กอิน/แข่งขันทับกันหรือเดินทางไม่ทัน จัดเป็น hard เมื่อข้อมูลรับรองแล้ว; ถ้าเดินทางทันแต่พัก/เผื่อไม่พอเป็น near; ตัวสำรอง/รอบมีเงื่อนไข/เวลา draft เป็น potential แม้จำลองแล้วชน; ถ้าข้อมูลไม่พอเป็น unknown. `checked_no_conflict` เป็นผลเฉพาะคู่ที่มีข้อมูลครบ ไม่ใช่รับรองทั้งรายการ

## วิธีรัน (local/private เท่านั้น)

```bash
# ชุดทดสอบ ใช้ข้อมูลสมมติอย่างเดียว และไม่อาศัย GitHub Secrets
node scripts/r12/test-analyze-roster-conflicts.mjs

# ตัวอย่าง CLI: แสดงเฉพาะ summary ไม่มี athlete_id/ชื่อ/fixture pair
node scripts/r12/analyze-roster-conflicts.mjs \
  --program scripts/r12/fixtures/r12c-synthetic-program.json \
  --roster scripts/r12/fixtures/r12c-synthetic-roster.json \
  --config scripts/r12/fixtures/r12c-synthetic-config.json

# งานจริง: ใช้ --roster และ --config ที่อยู่นอก repo ในเครื่องที่จำกัดสิทธิ์
# ห้ามแนบ private input / private result.details เข้าสู่ PR, Actions, browser หรือ LINE
```

`analyzeRosterConflicts(program, roster, config)` คืน `{ public_summary, details, unresolved }`. เฉพาะ `public_summary` เท่านั้นที่ CLI เขียนออก stdout หรือ `--public-summary`; ข้อผิดพลาด CLI ไม่พิมพ์เนื้อหาไฟล์หรือรหัสนักกีฬา. Automated tests/CI อ่าน **synthetic files ใน repo เท่านั้น**.

## ผลตรวจรับที่ยังต้องดำเนินการ

- [x] Engine รับหลายกีฬา/หลายรายการ, ขยายรายการทีมตาม stable `fixture.id`, ไม่ dedupe คนจากชื่อ
- [x] Synthetic regression สำหรับ hard/near/potential/unknown/checked-no-conflict, ตัวสำรอง, relay, centre lane, finalist conditional, travel, rest, time source, coverage, public redaction
- [x] Read-only CI รันเฉพาะข้อมูลสมมติ
- [ ] รอเอกสารจาก 8 โรงเรียนและลงทะเบียน/ตรวจรับเฉพาะ private workspace
- [ ] ยืนยัน mapping โรงเรียน–ทีม–รุ่น–กรีฑาลู่, เวลาแข่งขัน/รายงานตัว/ระยะเวลา/เดินทาง/พัก/เผื่อทั้งหมดโดยกรรมการ
- [ ] เช็กข้อจำกัดลงหลายกีฬา/หลายรายการจากเอกสาร/มติจริงก่อนใช้เป็นเกณฑ์
- [ ] ตรวจรับ private analysis กับเจ้าหน้าที่โดยไม่เผยแพร่ชื่อ และพิจารณา R12D/E แยก PR หลังมีหลักฐาน

**Gate:** R12C engine/test readiness ไม่เท่ากับผ่านการตรวจชนของนักกีฬาจริง. ขณะนี้ R12B ยังรอรายชื่อจริง.
