# มิตรภาพเกม 2569 — Data Contract ร่วมของ Master JSON / เว็บตรวจ / Google Sheets / Google Docs

สถานะ: **DESIGN CONTRACT / ยังไม่ implement** · 4 พฤศจิกายน 2569  
แผนแม่: [SPORTS_2569_PARALLEL_WORKSTREAMS_PLAN.md](SPORTS_2569_PARALLEL_WORKSTREAMS_PLAN.md)  
การอนุมัติและเผยแพร่ผลยังยึดข้อกำหนด [P2](P2_SHEETS_WORKFLOW.md) และ [R1–R3](RESULTS_IMPLEMENTATION_R1_R3.md); R10 ศูนย์ประกาศสนามเป็นคนละ workflow

## 1. สิ่งที่มีจริงขณะนี้ — ห้ามสับสน

| แหล่ง | ไฟล์/รูปแบบ | สถานะ |
|---|---|---|
| PDF ฉบับล่าสุด | `สูจิบัตรกีฬา 69(1).pdf` | หลักฐานต้นทาง; ยังมีข้อขัดแย้งที่ผู้จัดต้องตรวจ |
| Candidate master | `data/program-from-pdf-2569-20261104-draft.json` (`schema_version=3`) | 187 คู่ + 50 กรีฑา / 289 ลู่ = 237; ทุก event ยัง `draft`; `source_pdf` + `draft_*` เก็บรายละเอียดที่ถอดมา |
| Website active dataset | `data/draft-schedule.json` (`schema_version=2`) | 186 คู่ + 50 กรีฑา = 236; เว็บปัจจุบันอ่านไฟล์นี้ |
| Sheet P2 | `02_โรงเรียน`, `03_รายการ`, `04_คู่แข่งขัน`, `05_กรีฑา`, `06_ประกาศ`, `07_ผลประเภททีมคู่`, `08_ผลกรีฑา` (+ `01_ตั้งค่า`) | ทะเบียนคู่เริ่มจาก 186 และกรีฑา 289; ต้องตรวจข้อมูลจริงและประวัติรับรองก่อน reconcile |
| Google Docs | ร่างสูจิบัตร Google Docs ใน Shared Drive `ปี 2569` | เนื้อหาบางส่วนยังเป็นปี 2568; ไม่ใช่แหล่งข้อมูลปัจจุบันที่ให้ export โดยตรง |
| R10 Ops | `apps-script/Announcer.*` และ Sheet ภายในแยก | Workflow คิวเรียกนักกีฬา/กรรมการ ไม่ใช่ source ของกำหนดการแข่งขัน |

**ห้ามเก็บข้อมูลสองชุดที่ถูกเรียกว่า Master อย่างเท่าเทียม:** R11A จะออกเอกสาร reconciliation และกำหนดหมายเลข revision ของ candidate dataset; ก่อน R11E เว็บเดิมยัง active อยู่ตามจริง

## 2. Stable IDs และการเทียบข้อมูล

- ใช้ `fixture.id` เป็น key หลัก และ `sport_id`, `source_page`, `source_match_no`, `division`, `round` เป็นข้อมูลประกอบการตรวจ **ห้ามจับคู่ด้วยเลขคู่เพียงอย่างเดียว**
- ตาราง `source_match_no` อาจซ้ำ และต้นฉบับใหม่สลับลำดับคู่; การอ้างรอบต่อไป/ผู้ชนะต้องอ้าง event ID ที่แก้แล้วเท่านั้น
- Candidate มีรายการฟุตบอลหญิงเพิ่มมา 1 แถว และอาจต้องพิจารณาว่าเป็นการพิมพ์ซ้ำ ไม่ให้ลบหรือเพิ่มแข่งขันจริงโดยคาดเดา
- ต้องมี `legacy_id_mapping` แบบตรวจได้สำหรับลิงก์ `?fixture=` และ `m/fxxxxxxxx/` ที่แชร์ออกไปแล้ว
- เปลี่ยนชื่อ/รุ่น/ทีม/วันของ event ได้เมื่อบันทึก revision และหลักฐาน; `source_pdf` คงค่าต้นฉบับแบบไม่เปลี่ยน
- **กรีฑา** ใช้ event ID แยกชาย/หญิง แม้ source number 35 หรือ 48 ซ้ำ; lane ID และเลขลู่ไม่เพิ่มหรือลบเพื่อให้ครบ 8 ลู่ด้วยการเดา; `ศูนย์ฯ` ไม่เปลี่ยนเป็นโรงเรียน

## 3. รูปแบบข้อมูลเชิงตรรกะที่ใช้ร่วมกัน (ไม่ใช่การอ้างว่าโค้ดรองรับแล้ว)

| ฟิลด์/กลุ่มฟิลด์ | หน้าที่ | สถานะ/การป้องกัน |
|---|---|---|
| `id` / `kind` / `sport_id` / `division` | ระบุรายการถาวร | immutable โดยปกติ; เปลี่ยนต้องมี migration map |
| `source_pdf` / `source_pair_text` / `source_page` | หลักฐานที่ถอดจาก PDF | immutable provenance / ใช้เพื่อเทียบ |
| `draft_date`, `draft_time`, `draft_field` | วัน/เวลา/สนามตาม PDF ล่าสุดที่ยังไม่รับรอง | ไม่แปลงเป็น approved อัตโนมัติ |
| `planning_*` (กรณีมีหลักฐานจากผู้ประสาน) | กำหนดเฉพาะเรื่องที่ได้รับแจ้ง เช่น วัน/สถานที่เปตองนอกรอบ | แยก confirmation ต่อ field; ไม่หมายความว่า event approved |
| `review_state` (เสนอเพิ่ม) | `not_checked`, `school_verified`, `needs_correction`, `committee_review` | แยกจาก `status` เดิม ไม่เปลี่ยนความหมาย `draft` ของเว็บปัจจุบัน |
| `approval` (private metadata) | ผู้รับรอง, เวลา, note/reference, revision, digest | เก็บไว้ใน protected backend/Sheet; เผยแพร่เฉพาะสถานะและ revision ที่ไม่ระบุตัวบุคคล |
| `publication_state` (เสนอเพิ่ม) | `unpublished`, `review_preview`, `published` | เผยแพร่ได้เมื่อผ่าน gate; preview ไม่ใช่ approved |
| `revision` / `source_revision` | เลข revision และอ้างอิงต้นทาง | เว็บ/Docs/PDF แสดงอย่างสอดคล้อง |

หากมีการเปลี่ยน schema ให้ทำ schema migration/versioned validation ก่อน ไม่ยัดสถานะใหม่เข้าช่อง `status` แบบเดิมแล้วทำ regression เดิมพัง

## 4. บันทึกการตรวจสอบโรงเรียน (write model แยกจาก public JSON)

`review_request` 1 รายการควรมี:
- `request_id`, `fixture_id` หรือ `event_id`, `school_id`, `action=confirm|suggest_correction`
- `field_names` และ `proposed_values` เฉพาะเมื่อขอแก้, `reason`/หลักฐานอ้างอิง
- `submitted_at`, `review_state=pending|accepted|rejected`, `reviewed_at`, `decision_reference`
- **ข้อมูลระบุตัวตนผู้ส่งและผู้รับรองเก็บในระบบหลังบ้านที่จำกัดสิทธิ์เท่านั้น**, ไม่ serialize เข้า JSON สาธารณะ
- ต้องตรวจ actor/โรงเรียนที่สังกัดจาก backend และบันทึกเหตุการณ์; ปุ่ม client ที่ผู้ชมทั่วไปกดไม่ได้ถือเป็นการรับรอง
- ถ้ามีข้อเสนอหลายอันสำหรับ fixture เดียวกัน ให้เก็บประวัติ/สถานะไม่ overwrite หรือใช้ last-write-wins
- เมื่อ accepted จึงสร้าง **proposed change** ต่อ candidate JSON พร้อม diff และ PR; `committee_approved` ต้องมีผู้อนุมัติตามนโยบาย P2, ไม่อาศัย school confirm อย่างเดียว

## 5. การเคลื่อนข้อมูลและการป้องกันวงจรซิงก์

```text
Source PDF ใหม่ --> Candidate JSON (GitHub / revisioned, read only)
                               |                   |
                               v                   v
                     Website review preview   Google Docs draft generator
                               |                   |
            (school feedback via secured backend) | (read-only output)
                               v                   |
                    Google Sheets review ledger   |
                               |                   |
                 Committee decisions / approval   |
                               v                   |
                Approved change set -> GitHub PR --+
                               |
                 validated public snapshot (static)
                               |
               Website program + LINE share + Approved Docs/PDF
```

- **Sheets → JSON**: ไม่ import ทุกเซลล์แบบอัตโนมัติ; รับเฉพาะรายการเปลี่ยนแปลงที่ตัดสินแล้ว ตรวจ hash/diff, schema, QA และ approval ก่อนส่ง PR
- **JSON → Sheets**: ทำเป็น `sync proposal / diff review` เพื่อรักษาคอลัมน์อนุมัติ/หมายเหตุ/ผลเดิม ไม่ล้างทั้งชีท; ต้องจัดการ 186→187 และแถวที่ชื่อเปลี่ยนอย่างชัดเจน
- **JSON → Docs**: สร้างเอกสาร **ฉบับใหม่** ใน Shared Drive และเขียนด้วยตาราง/หัวข้อ native; re-generate เฉพาะเวอร์ชันที่ต้องการและบอก revision
- **JSON → Website**: preview อ่าน candidate snapshot พร้อมป้ายไม่ใช่ประกาศทางการ; public program อ่าน approved/public view ของ revision ที่ผ่าน gate แล้ว
- **OPS R10**: ไม่มีลูกศรเขียนไป candidate master หรือ review sheet; หากอนาคตจะโชว์คู่แข่งขันในคิวให้ใช้ read-only approved snapshot และยืนยันกับเจ้าหน้าที่ก่อนออกไมค์
- ห้ามเชื่อม OAuth token, secrets หรือ Apps Script script properties ลง static files ที่ browser ดาวน์โหลดได้

## 6. เงื่อนไข QA ที่ต้องผ่านก่อนเปิดให้โรงเรียนตรวจจริง

1. รายการและ event IDs ไม่ซ้ำ / มี source page / map กลับ PDF ได้; นับ 187 คู่ + 50 กรีฑา + 289 ลู่
2. รายการที่มี QA conflict ต้องเห็น flag และรายละเอียด ไม่ถูกทำให้ “ปกติ” ด้วยการ normalize อัตโนมัติ
3. วันปี 2568 ที่ปรากฏในเปตองสามแถวคงตาม source และไม่เผยแพร่เป็นวันแข่งขัน 2569 โดยไม่มีมติ
4. โรงเรียนเห็นเฉพาะ fixture/lane ของตน และการแยก `ศูนย์ฯ` ถูกต้อง
5. กด “แจ้งแก้ไข” แล้วไม่แก้ public JSON; ตรวจ backend denies unauthorized และบันทึกทุกรายการด้วย stable fixture ID
6. เลข revision ของ preview กับ Google Docs draft เดียวกัน; PDF ฝังข้อความสถานะร่าง
7. ทดสอบหน้าแชร์ LINE เดิม รวมกรณี ID ที่เลื่อนตำแหน่ง/เลขคู่ซ้ำ
8. ไม่เปลี่ยน `data/public-results.json` หรือ approved-only result gate

## 7. Acceptance สำหรับการเผยแพร่จริง (R11E)

- มี **committee-approved change set** พร้อมข้อยุติของ QA blocks ที่กระทบคู่จริงและวัน/สนาม
- มี deterministic generator/test ของ public JSON และ mapping ของ short URL; rollback ไป revision ก่อนหน้าได้
- เว็บไซต์และ Google Docs/PDF มาจาก revision เดียวกัน (ระบุเลขและวันเผยแพร่) ไม่ถือ Sheet หรือ Docs เป็น second source of truth
- รัน regression เดิมทั้ง R8/R9/score sheets/P2 + validation R11 เพิ่ม และ QA บนมือถือจริง
- ผู้ใช้เห็นชัดระหว่าง **ข้อมูลจาก PDF / โรงเรียนตรวจแล้ว / พบจุดต้องแก้ / รับรองโดยผู้จัด**; ไม่มีผลสมมติ
- ผู้จัดยืนยันวัน/สถานที่/เวลาโดยเฉพาะเปตอง 12–13 พฤศจิกายน 2569 ก่อนใช้แจ้งนักกีฬา

> เอกสารนี้เป็น **contract สำหรับการพัฒนา** ไม่ใช่ schema ที่ implement แล้ว. เปลี่ยนการออกแบบ contract ได้เฉพาะด้วย PR ที่บันทึกเหตุผลและ regression impact.
