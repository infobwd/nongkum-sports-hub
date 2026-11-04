# มิตรภาพเกม 2569 — แผนงานคู่ขนาน เว็บตรวจสูจิบัตร / Master JSON / Google Sheets / Google Docs / ศูนย์ประกาศสนาม

> **สถานะ: PLAN ONLY / APPROVED AS DIRECTION, NOT DEPLOYED** — บันทึก 4 พฤศจิกายน 2569  
> **หลักการ:** JSON เป็นฐานกลางของกำหนดการแข่งขัน, เว็บไซต์เป็นช่องให้โรงเรียนทั้ง 8 แห่งและกรรมการตรวจ, Sheets รับข้อเสนอ/หลักฐาน/มติ, Docs สร้างสูจิบัตรอ่านง่ายจากข้อมูลเวอร์ชันเดียวกัน  
> **สำคัญ:** แผนนี้ไม่เปลี่ยนโปรแกรมการแข่งขันจริง ไม่รับรองผล ไม่ยืนยันข้อมูลแทนกรรมการ และไม่สั่งให้สาขาอื่นหยุดทำงาน

## ข้อตัดสินใจปรับใหม่ (4 พฤศจิกายน 2569 · R11D)

**ตามคำสั่งผู้จัด:** ทำ **R11D หน้าเว็บตรวจข้อมูลแบบ read-only** ก่อน/แทน R11B ในระยะนี้ ผู้จัดจะรับข้อเสนอแก้ไขผ่านแชทด้วยตนเอง โดยใช้ข้อความที่คัดลอกพร้อม fixture ID และหน้า PDF; การแก้ JSON ต้องมีหลักฐานและ PR ต่อเนื่อง ไม่ให้โรงเรียนกดอนุมัติหรือเขียน Google Sheets โดยตรง. **R11B พักไว้ / NOT IMPLEMENTED** จนกว่าจะสั่งใหม่. [ขอบเขต R11D ฉบับล่าสุด](R11D_PUBLIC_REVIEW_PREVIEW_PLAN.md)

- R11D ใช้ `review.html` บน GitHub Pages อ่าน **candidate PDF JSON 237 รายการ**; `index.html` ยังอ่าน active 236 รายการจน R11E ที่มีการตรวจรับ
- R10 และ R11C Google Docs ยังคงทำคู่ขนานได้ ไม่แตะไฟล์กัน
- ข้อความในแผนเดิมด้านล่างเกี่ยวกับ Gate 2–3 ที่มี R11B ให้ถือว่า **deferred option** ไม่ใช่งานที่ต้องดำเนินการในรอบปัจจุบัน

## 0. เหตุผลที่ต้องแยกแผนนี้

ขณะบันทึกแผนมีงานดำเนินพร้อมกันใน repo `infobwd/nongkum-sports-hub`:
- **R9 (Skeleton / retry)** รวมใน `main` แล้ว ผ่าน PR #16; ยังคงต้อง QA มือถือจริง
- **R10 Phase 2 ศูนย์ประกาศสนาม** **MERGED แล้วผ่าน PR #18** เมื่อ 4 พฤศจิกายน 2569 (สาขาเดิม `feat/r10-field-operations-console`); ส่วน **การติดตั้ง Google Apps Script และ QA ด้วยบัญชีจริงยังรอดำเนินการ**; ขอบเขตหลักคือ `apps-script/Announcer.gs`, `apps-script/Announcer.html`, `scripts/ops/test-field-console-r10.mjs`, `docs/R10_FIELD_OPERATIONS_PHASE2_PLAN.md` และ `docs/R10_FIELD_OPERATIONS_DEPLOY_QA.md`
- **ชุดข้อมูล PDF ใหม่** เข้า `main` ผ่าน PR #17: `data/program-from-pdf-2569-20261104-draft.json`, 187 คู่ + กรีฑา 50 รายการ / 289 ลู่ = 237 รายการ; เก็บสถานะ `draft`/QA
- **เว็บปัจจุบัน** ยังอ่าน `data/draft-schedule.json` จำนวน 186 คู่ + กรีฑา 50 รายการ = **236 รายการ**, และหน้าแชร์ LINE R8 ผูกกับชุดดังกล่าว
- **Google Sheets P2** มี 8 แท็บ; `04_คู่แข่งขัน` เริ่มจากทะเบียนเดิม 186 คู่, `05_กรีฑา` 289 ลู่; Apps Script `Code.gs` และ `Results.gs` เป็นกลไกรับรองที่ยังต้องตรวจสถานะการติดตั้งจริงก่อนเชื่อถือผลส่งออก
- **Google Docs** ใน Shared Drive เป็นเอกสารดัดแปลงจากปี 2568 (ในเนื้อหายังมีชื่อการแข่งขันและกำหนดการเก่า); ห้ามแก้ทับหรือนำรายละเอียดเก่าขึ้นเป็นข้อมูล 2569 โดยอัตโนมัติ

แหล่งอ้างอิงหลัก: [แผนนำเข้า PDF ฉบับใหม่](PDF_REVISION_2569_IMPORT_NOTES.md), [P2 Sheets Workflow](P2_SHEETS_WORKFLOW.md), [R9](R9_LOADING_UX_PHASE1_PLAN.md), [R10 ระยะที่ 2](R10_FIELD_OPERATIONS_PHASE2_PLAN.md), [R8](R8_LINE_DIRECT_LINKS_QA.md)

## 1. ตัดสินใจด้านสถาปัตยกรรม (Design Lock)

1. **Single schedule authority:** ชุด JSON ฉบับจัดระบบใน GitHub เป็นแหล่งข้อมูลหลักระดับกำหนดการแข่งขัน; Google Sheets **ไม่** เป็น master อีกอัน, Google Docs เป็นเอกสารผลลัพธ์, เว็บเป็นมุมมองและช่องแจ้งตรวจสอบ
2. **ปัจจุบันยังไม่มี Master ใหม่ที่ publish-ready:** ไฟล์ `data/program-from-pdf-2569-20261104-draft.json` เป็น **candidate master** ที่ต้อง reconcile ก่อน ห้ามเรียก 237 รายการว่า Approved หรือแทน `data/draft-schedule.json` แบบตรง ๆ. การยกระดับเป็น authoritative revision ต้องผ่าน gate ในข้อ 4 และ data contract แยก
3. **Audit-safe provenance:** ทุก event มี stable `fixture.id`, `source_page`, `source_match_no`, `source_pdf`, เวลา/สนามตาม PDF ที่แยกจากวัน–เวลา–สถานที่ที่อนุมัติ; การแก้ไขจาก Sheet ต้องผ่าน explicit change request, reviewer และ revision ไม่ overwrite source field เงียบ ๆ
4. **มีสองความหมายของ “ตรวจแล้ว”:** โรงเรียนตรวจเห็นว่าถูกต้อง = `school_verified` / ผู้จัดรับรองทางการ = `committee_approved`. การแจ้งว่า “เกือบ 100%” เป็นระดับความมั่นใจของผู้จัด **ไม่ใช่ค่าอนุมัติรายแถวที่ระบบสร้างเอง**
5. **แยกกำหนดการแข่งขันกับผล:** `data/public-results.json` ยังคง approved-only; ห้ามมีผลหรือคะแนนสมมติ และห้ามให้คำขอประกาศสนาม R10 ทำให้สถานะอนุมัติของโปรแกรมเปลี่ยน
6. **เว็บไม่รับการเขียนตรงลง public JSON:** GitHub Pages เป็น static/read-only. การยืนยัน/แจ้งแก้ไขต้องผ่าน Google Form หรือ Apps Script backend แบบตรวจสิทธิ์และบันทึกหลักฐาน ข้อเสนอทุกอันต้อง `pending` ก่อนผู้มีสิทธิ์นำเข้าชุดหลัก
7. **No PII public:** ห้ามนำชื่อ/วันเกิด/ภาพนักเรียน, อีเมลเจ้าหน้าที่/ผู้รับรอง, spreadsheet ID ภายใน, token, API secrets หรือข้อมูลคิวประกาศภายในลง public JSON/Docs ฉบับเผยแพร่
8. **รายงานสถานะที่อ่านตรงกัน:** หน้าเว็บและ Google Docs/PDF ต้องบอก `revision`, วันที่ออกรายงาน, สถานะข้อมูล และรายการที่ยังมี QA; ห้ามใช้ข้อความ “รับรองแล้ว” หากหลักฐานไม่มี
9. **R10 independent:** ศูนย์ประกาศสนามใช้ standalone Apps Script และ **Google Sheet ภายในแยก** ตาม R10 ไม่อ่านหรือเขียนชีท P2 โดยอัตโนมัติ และไม่เชื่อมประกาศสาธารณะในเฟสนี้

## 2. แบ่งความรับผิดชอบข้ามแชท / สาขา (No file collisions)

| สายงาน | ผู้ดำเนินการที่เสนอ | สิ่งที่ทำได้ทันที | ไฟล์/ขอบเขตที่เป็นเจ้าของ | ห้ามแตะข้ามสาย |
|---|---|---|---|---|
| **OPS / R10** | **อีกแชทที่กำลังทำอยู่** | หลัง PR #18 merge: ติดตั้ง Web App (โดยเจ้าของ), ทำ real-account QA/แก้เฉพาะ R10 ผ่าน branch ใหม่เมื่อจำเป็น | `apps-script/Announcer.*` / `scripts/ops/*` / `docs/R10_*` | ห้ามปรับ Master JSON, P2 Sheets, `index.html` หรือผล Approved โดยพลการ |
| **DATA / R11A** | แชทสายสูจิบัตร | audit PDF 237 vs เว็บ 236 vs Sheets 186, canonical IDs, source/review separation, change ledger | สาขาใหม่ `feat/r11a-master-json-audit`; `data/reconciliation/*`, `scripts/data/*`, `docs/R11A_*` | ไม่แก้ `data/draft-schedule.json` ใน gate นี้; ไม่แตะ `apps-script/Announcer.*` |
| **SCHOOL REVIEW / R11B** | แชทสายสูจิบัตร หลัง R11A contract lock | ออกแบบช่องตรวจโรงเรียน: ยืนยัน/แจ้งแก้/หลักฐาน/คณะกรรมการ review, เชื่อม Backend ที่ควบคุมสิทธิ์ | สาขา `feat/r11b-school-review`; backend เพิ่มเป็น `apps-script/Review.*` หรือโครงการแยก; `docs/R11B_*` | ไม่แก้โค้ด R10 หรือส่งข้อเสนอขึ้น public JSON อัตโนมัติ |
| **DOCS / R11C** | งาน Google Drive แบบแยก | สร้าง Google Docs **สำเนาฉบับใหม่** ใน Shared Drive ปี 2569, แม่แบบ A4 และตัวสร้างข้อมูลจาก revision | Google Docs ฉบับใหม่ใน Drive + `scripts/docs/*` / `docs/R11C_*` | ไม่แก้ทับ Docs ปีเก่า; ไม่ทำเอกสารสองชุดที่มีวัน/คู่แข่งขันขัดกัน |
| **WEB REVIEW / R11D** | แชทสายเว็บ/สูจิบัตร หลัง contract lock | สร้างหน้าสำหรับตรวจ PDF revision 237 รายการ (preview แยกก่อน), ตัวกรองโรงเรียน, QA flags, ปุ่มแจ้งแก้ไข | สาขา `feat/r11d-review-ui`; `review.html`, `js/review*.js`, `css/review*.css` | ห้ามแก้ `index.html`, `js/program.js`, `data/draft-schedule.json`, `m/` ใน gate preview |
| **RELEASE / R11E** | เจ้าของโครงการ/ผู้รับรอง + ผู้พัฒนาเว็บ | หลัง gate ครบ ค่อยรวม revision ไปหน้าโปรแกรมหลัก, rebuild share pages/CI, ส่งออก PDF | PR เฉพาะ release (มีการทบทวน) | ห้ามรวมพร้อมกับ R10 PR หากแตะไฟล์เดียวกันโดยไม่มี rebase และ regression |

**กฎ merge:** แต่ละ branch แยก PR; ก่อนแก้ไฟล์ร่วมต้องดึง `main` ล่าสุด, อ่าน changed files ของ PR อื่น, หยุดแก้ไฟล์ร่วมถ้าเห็น conflict. อย่าสั่ง force push ทับ branch ที่แชทอื่นเป็นเจ้าของ. ไม่แก้ `README.md` หรือ `.github/workflows/validate.yml` ใน PR แผนงานนี้ เพื่อลดชนกับ R10; ใส่ลิงก์จาก README เมื่อแต่ละ PR เสร็จแล้วเท่านั้น.

## 3. ลำดับเริ่มงาน (critical path) และงานที่ทำคู่กันได้

### Gate 0 — วันนี้: PLAN / NO CODE COLLISION
- [x] บันทึกแผนคู่ขนานและ data contract ลง `docs/` บนสาขาของแผนโดยเฉพาะ
- [x] ตรวจ R10 PR #18 ว่า merged แล้ว; **ยังไม่ถือว่า Web App live** จนผ่านขั้นติดตั้ง/QA จริง; ก่อนเริ่ม R11D ให้ตรวจ `main` และ PR ใหม่อีกครั้ง
- [ ] ส่งลิงก์แผนนี้ให้อีกแชทรับทราบ; งาน deploy/QA ของ R10 ทำต่อได้ โดยไม่เปลี่ยนขอบเขตเดิม

### Gate 1 — R11A: Lock schema + reconcile (ทำทันที, **ก่อน** ให้โรงเรียนกดตรวจจริง)
- [ ] อ่านและเทียบ `data/program-from-pdf-2569-20261104-draft.json`, `data/draft-schedule.json`, `data/competition-divisions-2569-draft.json` และ Google Sheets P2 ปัจจุบัน
- [ ] ตรวจ **187 คู่ vs 186 คู่**, **237 vs 236 รายการ**, 50 กรีฑา/289 ลู่, stable fixture IDs, สาย/รอบ/เลขคู่ซ้ำ, และเวลาใน PDF ใหม่ต่างจาก Sheets
- [ ] สร้าง **reconciliation report** แยก `unchanged`, `changed`, `added`, `conflict`, `needs_approval`; ห้ามลบข้อมูลตรวจรับเดิมด้วย bulk overwrite
- [ ] ตรวจข้อขัดแย้ง: ฟุตบอลคู่ชิงหญิงที่ซ้ำ, วอลเลย์บอลรอบชิงอ้างสายเพศกลับ, เปตอง PDF ปี 2568 ใน 3 แถว, เปตอง 10 ปีชาย, ตะกร้อคู่ 24, กรีฑาเลข 35/48 ซ้ำ
- [ ] รักษา **เปตองนอกรอบ 12–13 พ.ย. 2569 ที่ได้รับยืนยันวัน/สถานที่** จากงานเดิม แยกจากเวลาแข่งขันรายคู่ที่ยังต้องตรวจรับ
- [ ] นิยาม `revision`, `source_pdf`, `review`, `approval`, `publication`, `supersedes` ตาม data contract; มี fixture ID สำหรับแถวเพิ่มและ mapping legacy share code
- [ ] Validate deterministic JSON/schema; ไม่เปลี่ยน public-program paths ใน gate นี้

### Gate 2 — ทำพร้อมกันหลัง Gate 1 contract lock
**A. REVIEW PREVIEW**: สร้างหน้าอ่านข้อมูลใหม่ 237 รายการแบบ read-only และป้าย “ข้อมูลจากสูจิบัตรล่าสุด / เพื่อโรงเรียนตรวจสอบ”; กรองโรงเรียน–กีฬา–รุ่น, เปิด QA; คงหน้าโปรแกรมหลัก 236 รายการไว้จนได้รับอนุมัติ

**B. SHEETS WORKFLOW**: ทำ staged import/diff เข้า Sheet เฉพาะเมื่อสำรองข้อมูลและตรวจคอลัมน์แล้ว; เพิ่มทะเบียน `ข้อเสนอแก้ไข`/`ผลตรวจโรงเรียน` ตาม design (หรือชีทแยกที่ไม่รบกวน approved rows), กำหนดสิทธิ์และผู้รับรอง; ตรวจ Apps Script `Code.gs`/`Results.gs` ติดตั้งจริงก่อนเปิด approve flow

**C. DOCS TEMPLATE**: สร้าง **Google Docs ใหม่** สำหรับ 2569 (ไม่ทับต้นฉบับเก่าปี 68), หัวข้อและตาราง Google Docs แบบแก้ไขได้, A4; สร้างจาก JSON revision เดียวกัน, แสดงสถานะ Draft/review และเลข revision; รายชื่อคณะกรรมการ/คำสั่งที่ยังไม่ตรวจไม่ทำเหมือนรับรอง

**D. OPS R10**: อีกแชทติดตั้งและ QA ระบบที่ merge แล้วได้อย่างอิสระ; เฟสนี้ไม่มี data sync / ไม่ให้ระบบคำขอประกาศบันทึกโปรแกรมใหม่

### Gate 3 — ให้โรงเรียนตรวจจริง
- [ ] มีบัญชี/ผู้ตรวจที่เชื่อถือได้ตามแต่ละโรงเรียน: เปิดหน้า preview → เลือกโรงเรียน → กด `ข้อมูลถูกต้อง` หรือ `แจ้งแก้ไข` (พร้อมหมายเหตุและ event ID) → backend ลงทะเบียน `pending` ใน Sheets ที่จำกัดสิทธิ์
- [ ] แยก `school_verified` ออกจาก `committee_approved` และแสดง `needs_correction` เฉพาะรายการ; โรงเรียนหนึ่งไม่สามารถรับรองแทนอีกโรงเรียน
- [ ] ตรวจว่าการกดจากผู้ชมทั่วไป/ผู้ไม่มีสิทธิ์ไม่สามารถเปลี่ยนสถานะ Approved ได้
- [ ] ฝ่ายกรรมการพิจารณาตามหลักฐานและสร้าง approved revision; เก็บ `approved_by` ภายใน ไม่ export ชื่อ/อีเมลลง GitHub public

### Gate 4 — ค่อยเผยแพร่ / จัดทำ Docs ฉบับพิมพ์
- [ ] ตรวจ Diff + QA + สิทธิ์อนุมัติ + version ก่อนปล่อย Master revision และ public snapshot
- [ ] อัปเดต `data/draft-schedule.json` และหน้าโปรแกรมหลัก **ใน PR release ที่แยก**, หรือจัด migration ไป public read-only snapshot โดยมี rollback; ห้ามสลับโดยไม่มี tests
- [ ] Regenerate `m/` LINE previews / `data/share-index.json`, ทดสอบลิงก์สั้น 236 เดิมไม่เสีย และคู่เพิ่มมีลิงก์ใหม่
- [ ] ทดสอบ `node scripts/validate-data.mjs`, `node scripts/validate-pdf-revision-2569.mjs`, `node scripts/share/build-match-pages.mjs --check`, `node scripts/ux/test-direct-share-r8.mjs`, `node scripts/ux/test-loading-r9.mjs` และงาน R10 ของอีกสาขาตามขอบเขต
- [ ] สร้าง Google Docs/PDF จาก revision เดียวกับเว็บ; ตรวจ A4 หน้าเบี้ยว, สถานะข้อมูล, สารบัญ, ตารางหน้าและลู่; รอบเผยแพร่ต้องระบุ `revision` และวันที่ตรวจ
- [ ] ตรวจ LINE iOS/Android, Safari iPhone, Chrome, เครือข่ายช้า/ออฟไลน์, ว่าหน้า preview และหน้าหลักไม่ปะปนกัน

## 4. ลำดับความเร่งด่วนที่ควรตัดสินก่อนออกสนาม

1. **ด่วน:** เปตองนอกรอบ 12–13 พ.ย. 2569 — เทียบวัน/สถานที่ที่รับรองแล้ว vs เวลารายคู่/คอร์ตที่ยังขาด, ระวังปี 2568 จาก PDF
2. **สูง:** กรีฑาวันที่ 16 พ.ย. 2569 — ตรวจว่าเวลา/ลู่และคำเรียกเด็กก่อนเรียน (ศูนย์ฯ) ถูกต้องและไม่เดาชื่อโรงเรียน
3. **สูง:** นัด/รอบที่มีเลขซ้ำหรืออ้างทีมผิดเพศ; ผู้จัดทำรายการแก้ไขเป็นจุด ๆ โดยไม่โยกทีมอัตโนมัติ
4. **หลังข้อมูลนิ่ง:** ปรับ UX หน้าโปรแกรมหลัก / LINE OG / สูจิบัตรฉบับทางการพร้อมกัน

## 5. Handoff checklist สำหรับสองแชท

เมื่อจบแต่ละรอบ ให้บันทึกใน PR หรือรายงานสั้น ๆ:
- branch, PR, commit SHA, source JSON revision ที่ใช้
- files changed, tests/CI + manual QA ที่ผ่าน/ยังไม่ผ่าน
- ข้อมูลที่รอกรรมการยืนยัน และสิ่งที่ **ไม่ได้** เปลี่ยน
- ความสัมพันธ์กับ R10/R11A–E และขั้นตอนถัดไป

**ขอบเขตชัด:** อีกแชท R10 ไม่ต้องหยุดงานติดตั้งและ QA หลัง PR #18 merge; แชทข้อมูลสูจิบัตรเริ่ม R11A ได้ทันทีหลังแผนนี้อยู่บน `main`. หากงานอื่นเปลี่ยน `main` ก่อน ให้อัปเดต/rebase งาน R11 ตามจริง. ห้ามตีความแผนนี้เป็นคำสั่งเริ่มติดตั้ง Google Apps Script, แก้ Google Sheets จริง หรือเผยแพร่เว็บโดยไม่ผ่าน gate.
