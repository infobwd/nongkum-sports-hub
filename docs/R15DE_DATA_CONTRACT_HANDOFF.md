# R15-D → R15-B/C — ข้อตกลงส่งต่อ Photo Intake / Data Contract (proposal, not engine)

สถานะ: **PROPOSED / awaiting R15-B/C sign-off**, 5 พ.ย. 2569. เอกสารนี้ไม่เปลี่ยน production JSON schema, `js/standings-engine.js`, `data/standings-rules.json` หรือ validator ใด ๆ

## แหล่งข้อเท็จจริง

- `data/public-results.json` schema_version=1 มี `metadata.approved_only=true`, `publication_status=empty`, `approved_results_count=0`, `results=[]`; หน้า results/standings ปฏิเสธผลที่ไม่ `approved`.
- `data/program-from-pdf-2569-20261104-draft.json` มี 237 รายการ (187 match, 50 track_event) โดย `metadata.all_data_approved=false`; fixture registry ไม่ใช่หลักฐานอนุมัติผล.
- `apps-script/Results.gs` จัดผลทีม/คู่เป็น `score/sets/win_loss` และกรีฑาเป็น `ranking`; export ไป Drive ส่วนตัวเท่านั้น. มี digest ของแถว, approver allowlist และอนุมัติซ้ำเมื่อแก้ข้อมูล แต่ยังไม่ใช่ source ที่ยืนยันว่าติดตั้งใช้งานจริง.
- R15-B/C ต้องตรึง rules และ release validator ก่อนผลจริง PR; R15-D ไม่เขียนฟังก์ชันตรวจคะแนนซ้ำ

## Proposed PRIVATE intake envelope v1 (ไม่ใช่ public JSON)

ตัวอย่างทั้งหมดในไฟล์ `tests/fixtures/r15-photo-intake.synthetic.json` เป็นข้อมูลสมมติ; field contract ที่เสนอ:

| field | type | ความหมาย / gate |
|---|---|---|
| `intake_id` | nonempty string | รหัสรับภาพภายใน ไม่ใช่ result ID |
| `fixture_id` หรือ `event_id` | string | ต้องจับคู่ใน latest registry; track_event ใช้ event_id |
| `sport_id`, `division` | string | เทียบ registry โดยตรง; ไม่เดา |
| `participant_order` | object/array | match: team_a_id/team_b_id ตรงฝั่ง; track: lane→school mapping ยืนยัน |
| `transcription` | object | score_a/score_b, sets, win_loss หรือ rankings; ช่องไม่ชัดเป็น null ไม่กรอก 0 |
| `image_review` | object | `quality` clear/recapture_required, `uncertain_fields` array |
| `evidence` | object | `private_evidence_id`, `sha256` (ถ้ามี), `pages`, `received_at`, `superseded_by` (ถ้าถ่ายใหม่); ไม่มี public URL |
| `audit` | object | recorded/checker/approver identities **private only**, status, checked_at, approved_at, revision, correction_note, approval_digest |
| `test_only` | boolean | test vectors ต้อง true; **ห้าม export** |

State transitions: `received → transcribed → crosschecked → pending_approval → approved → export_candidate`; branch fail `recapture_required | hold | corrected`. `approved` เป็นการตัดสินของมนุษย์พร้อม audit, ไม่ใช่ output ของ OCR.

## Public projection (คง v1 จน R15-C อนุมัติ migration)

ตัวอย่าง field ที่ `js/results.js` รองรับแล้ว:
- match score: `{id,fixture_id,sport_id,division,team_a_id,team_b_id,result_type:"score",score_a,score_b,winner_school_id,status:"approved"}`
- sets: เปลี่ยนเป็น `result_type:"sets", sets:[{a,b},...]`; win_loss: `result_type:"win_loss",winner_school_id`
- athletics: `{id,event_id,sport_id:"athletics",name,division,result_type:"ranking",rankings:[{rank,school_id,mark,unit}],status:"approved"}`
- wrapper: `schema_version:1`, `metadata: {event_name,publication_status:"published",approved_only:true,approved_results_count,published_at}`, `schools`, `sports`, `results`

**ไม่ใส่** `evidence`, `audit`, `recorded_by`, `approved_by`, รูป/ชื่อเด็ก หรือ private Drive URL ลง public result. เก็บ mapping จาก result ID ↔ private intake ID ในทะเบียนปิด. การใส่ `revision` ใน public result ต้องตกลงกับ R15-C และอัปเดต schema test ก่อน ไม่ควรเพิ่มลำพัง

## Interface ที่ R15-C ต้องให้บริการ (สัญญาที่เสนอ ไม่ implement ใน R15-D)

```text
validatePublication({
  candidatePublicJson, previousPublicJson,
  approvedFixtureRegistry, privateApprovalAttestations,
  committeeRules, phaseMap
}) -> { ok:boolean, diagnostics:[{ code, result_id?, fixture_id?, message }] }
```

ต้องเป็น fail-closed; production validator อ่าน private attestation ผ่านช่องทางปลอดภัยที่ไม่ส่งลง GitHub public และไม่ commit secret. ทางเลือกคือ reviewer ตรวจใบรับรองที่เก็บปิดแล้วออก signed attestation/PR approval ที่ผูก digest และ result ID อย่างตรวจสอบได้. **ห้ามตีความ field status=approved เพียงช่องเดียวเป็นหลักฐานการเซ็น**.

### Negative vectors / diagnostic codes ขอให้ R15-C รับรอง

| Code | ทดสอบที่ต้อง REJECT |
|---|---|
| `DUPLICATE_RESULT` | result_id ซ้ำ หรือผล active มากกว่า 1 รายการต่อ fixture/event โดยไม่มี correction |
| `FIXTURE_NOT_FOUND` | fixture/event ไม่อยู่ registry 237 รายการที่ตรวจรับ |
| `SPORT_TEAM_MISMATCH` | sport/division/team A-B ไม่ตรงทะเบียนหรือกลับฝั่งคะแนน |
| `SCORE_RULE_CONFLICT` | คะแนนลบ/ไม่เต็ม, winner ขัดคะแนน, เซ็ต/กีฬาไม่ตรงกติกา |
| `APPROVAL_PROOF_MISSING` | ไม่มี evidence/private approval หรือ digest ไม่ตรงข้อมูลที่อนุมัติ |
| `IMAGE_UNREADABLE` | มี uncertain fields / require recapture ไม่เป็น candidate approved |
| `REVISION_CONFLICT` | แก้ approved โดยไม่มี revision + เหตุผล + การรับรองใหม่ |
| `PHASE_UNRESOLVED` | fixture football league vs playoff (2 คู่ข้อความ placeholder) ยังไม่ยืนยัน |
| `RANKING_INCOMPLETE` | กรีฑาผลไม่ครบหรือ lane→school ยังไม่ resolve |

ต้องรองรับ duplicate ด้าน `fixture_id` **แยกจาก** duplicate `result_id`. กรีฑา event เดียวมีหลายแถวอันดับแต่ต้องรวบเป็น **ผล ranking ทั้งชุด**, ไม่บล็อกหลายอันดับภายใน event เดียวด้วยกฎ duplicate ผลทีม. เงื่อนไขการเสมอ, ยิงจุดโทษ, walkover, เปตองแบบ score/sets ต้องรับรอง representation จากกรรมการก่อนบังคับ validation

## จุดรอและการเชื่อม R15-B/C

1. R15-B: `rules_version`, phase classification สำหรับฟุตบอล 12 ปี ชาย (ลีก 15 คู่ + คู่จัดอันดับ 2 คู่), tie-break, walkover/draw, กติกาชุด/เซ็ต, เกณฑ์รวมถ้วย
2. R15-C: canonical fixture map, publication validator, revision policy, approval attestation mechanism และ derived standings digest/stale check
3. R15-D: หลัง B/C ตกลง contract ให้เชื่อม exporter → validator เดียวกัน; ห้ามมี rules engine ภายใน intake
4. R15-E: หลังมีผลรับรองจริงจึงตรวจ deep link, share, refresh และ standings consistency end-to-end. ขณะนี้ทดสอบด้วย payload สมมติใน isolated harness ได้เท่านั้น

ข้อมูลทดสอบอยู่เฉพาะ `tests/fixtures/` และ `scripts/results/`; ไม่แตะข้อมูลสาธารณะ
