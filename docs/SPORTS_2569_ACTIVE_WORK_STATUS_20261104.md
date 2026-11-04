# มิตรภาพเกม 2569 — สถานะงานคู่ขนานและจุดส่งต่องาน (snapshot)

**วันที่ตรวจ:** 4 พฤศจิกายน 2569 · **แหล่งตรวจ:** GitHub `infobwd/nongkum-sports-hub` branch `main`, PR list, action runs และเอกสารแผนใน repo  
**ลักษณะเอกสาร:** Snapshot / ตรวจเฉพาะหลักฐานที่เข้าถึงได้ — ไม่ใช่การยืนยัน Deploy หรือผลกรรมการตรวจรับ  
**แผนใหม่:** [R12 Document-to-JSON conflict analysis](R12_ATHLETE_DOCUMENT_TO_JSON_SCHEDULE_CONFLICT_PLAN.md)

## 1. สถานะ GitHub และข้อควรระวัง

- ตรวจ `main` อีกครั้งหลัง R11D.2 และ R12 docs merge: commit `a16a843d9153cd3f701ad591833c473e20c14737` (snapshot ก่อนการอัปเดตไฟล์นี้).
- **PR เปิดอยู่ 0 รายการ** ณ การตรวจซ้ำ; [#25 R11D.2](https://github.com/infobwd/nongkum-sports-hub/pull/25) **MERGED 4 พ.ย. 2569 เวลา 16:15 UTC** และ [#26 แผน R12](https://github.com/infobwd/nongkum-sports-hub/pull/26) **MERGED**. งาน R12 จะไม่แก้ไฟล์หน้า PDF viewer ในรอบเอกสารนี้.
- GitHub Actions ของ PR #25 ที่อ่านในการตรวจครั้งแรกยัง `queued` หลายรายการ; การ Merge **ไม่ได้ยืนยันผล CI หรือการทดสอบมือถือจริง**. ต้องตรวจผล run ปลายทางและ QA หลัง deploy เพิ่ม.
- PR #1–#24 ปิดแล้วและ `merged_at` มีค่า; คำว่า merged **ไม่ใช่หลักฐานว่า Web App/PDF/Google Docs ได้ Deploy หรือกรรมการอนุมัติแล้ว**.
- Repository นี้ **Public**; ห้ามนำภาพรายชื่อนักเรียนหรือทะเบียนรายบุคคลมา commit.

## 2. ความคืบหน้าแต่ละสายงาน

| สาย | หลักฐานที่ตรวจ | สถานะจริง/งานถัดไป |
|---|---|---|
| R1–R9 โปรแกรม, ผล, UX, LINE links | PR #10–#16 merged, README/R8/R9 | โค้ดอยู่ `main`; เว็บเดิม 236 รายการ, ผลเผยแพร่ approved-only ยังไม่มีผลรับรอง; ตรวจ iPhone/Android/LINE จริงตาม QA |
| P2 Google Sheets โปรแกรม/ผล | [P2 workflow](P2_SHEETS_WORKFLOW.md) | มี 8 แท็บและ Apps Script ใน repo; เอกสารระบุ **ยังต้องติดตั้ง script/allowlist/QA ด้วยบัญชีเจ้าของ**. ยังไม่มีหลักฐาน approved-only publication |
| R10 ศูนย์ประกาศสนาม private | [R10 deploy QA](R10_FIELD_OPERATIONS_DEPLOY_QA.md), PR #18 merged | Code ready; **ยังไม่มีหลักฐาน Live Web App / real-account QA**; ทำต่อในสาย R10 โดยไม่แตะโปรแกรม |
| R11 public request + mobile console | [R11 deploy QA](R11_PUBLIC_REQUEST_DEPLOY_AND_QA.md), PR #22 merged | Code ready; **ลิงก์ public Apps Script ยังไม่มีหลักฐาน deploy**, Project A / Project B ต้องแยกกันจริงและ QA; ไม่สรุปว่าเปิดรับได้แล้ว |
| R11A PDF→JSON reconciliation | [R11A audit](R11A_RECONCILIATION_2569.md), PR #21 merged | ตรวจชุด 236 เว็บเดิมเทียบ 237 candidate เสร็จ; 187 คู่ + 50 กรีฑา, 70 QA flags; **candidate ยัง draft, ยังไม่เผยแพร่แทนเว็บ** |
| R11B ระบบ login/ยืนยันโรงเรียน | [R11D plan](R11D_PUBLIC_REVIEW_PREVIEW_PLAN.md) | **พักตามการตัดสินใจ**; โรงเรียนอ่าน preview และแจ้งแก้ไขในแชท, ผู้ดูแลแก้ข้อมูลผ่าน PR พร้อมหลักฐาน |
| R11C Google Docs ฉบับใหม่ | [R11C handoff](R11C_GOOGLE_DOCS_WORKING_DRAFT_HANDOFF.md), PR #20 merged | **สำเนา Google Docs ฉบับทำงานใหม่สร้างแล้ว ไม่ทับต้นฉบับ**; ยังต้องจัดตาราง native/A4, แทนเนื้อหาปี 2568 ที่ใช้เป็นแม่แบบ, QA เอกสารก่อนเผยแพร่ |
| R11D หน้า review 237 รายการ | PR #23 / #24 merged; [review QA](R11D_PUBLIC_REVIEW_QA.md) | โค้ดหน้า `review.html` + UX มือถืออยู่ `main`; รับข้อผิดพลาดผ่านแชท ไม่ approve จากหน้าเว็บ; ต้องตรวจ GitHub Pages/อุปกรณ์จริง |
| R11D.2 PDF viewer เทียบหน้า | [PR #25](https://github.com/infobwd/nongkum-sports-hub/pull/25) | **MERGED**, ต้องตรวจผล CI และ UI บน Safari/LINE/Android จริงหลังเผยแพร่ |
| R11E ออกสูจิบัตร/เว็บฉบับรับรอง | [parallel plan](SPORTS_2569_PARALLEL_WORKSTREAMS_PLAN.md) | **ยังไม่เข้า gate**: ต้องเคลียร์รายการขัดแย้ง, อนุมัติ revision, Sheets/Docs/เว็บ/ลิงก์ LINE ตรงกันก่อน |
| R12 เอกสารรายชื่อนักกีฬา→JSON→ตรวจตาราง | [แผน R12](R12_ATHLETE_DOCUMENT_TO_JSON_SCHEDULE_CONFLICT_PLAN.md) | **PLAN ONLY**; ไม่มีหน้าลงทะเบียนนักกีฬา และยังไม่มีทะเบียนข้อมูลเด็กใน repo public |

## 3. ความเสี่ยงก่อนวันแข่งขันที่ต้องทำก่อน (ไม่ใช่ตารางรับรอง)

1. **12–13 พ.ย. 2569 — เปตองนอกรอบ:** ยืนยันวันและสถานที่ (บ้านหนองกระทุ่ม) สำหรับ 24 คู่แล้ว แต่ **เวลา/คอร์ต/approval ยังไม่ครบ**; [PETANQUE_OFFROUND_2569_11.md](PETANQUE_OFFROUND_2569_11.md)
2. **16 พ.ย. 2569 — กรีฑา:** candidate มี 50 รายการ / 289 ลู่, แต่เวลาเริ่มแยกรายการยังว่าง; ตรวจวันจริง, รายการศูนย์ฯ, เวลาเรียกตัวและเว้นช่วงตามประชุม
3. **17–20 พ.ย. 2569 — กีฬาหลายชนิด:** มีตารางร่างพร้อมกันหลายสนาม; ต้องตรวจ roster ก่อนสรุปว่าเด็กคนเดียวกันชน. ให้ R12A เริ่มจาก school-level screening และแสดงสถานะ unknown
4. **QA ต้นฉบับ:** ฟุตบอลหญิงรอบชิงมีแถวอาจซ้ำ, วอลเลย์บอลอ้างสายผิดเพศ, เปตอง 10 ปีชายและปี 2568 บางแถว, ตะกร้อคู่ 24, หมายเลขกรีฑาซ้ำ — **ต้องให้ผู้จัดตัดสิน ไม่แก้อัตโนมัติ**

## 4. ลำดับส่งต่องานที่ไม่แย่งไฟล์กัน

1. **R11D.2:** PR #25 Merge แล้ว; เจ้าของงานตรวจ CI สุดท้ายและ mobile PDF preview หลัง GitHub Pages deploy พร้อมเก็บหลักฐาน QA
2. **R10/R11 deployment:** เจ้าของงาน deploy Apps Script 2 projects ตามคู่มือ, ทดสอบบัญชีจริง และเก็บหลักฐาน (ไม่มีผลต่อ candidate schedule)
3. **R11A/R11D:** รับข้อแก้ไขจาก 8 โรงเรียน/กรรมการผ่าน preview/chat, ตัดสินข้อผิดพลาดใน PDF/JSON, เก็บ revision; ห้ามอัปเดต public program ก่อน R11E
4. **R11C:** ทำสูจิบัตร Google Docs ฉบับทำงานแยกให้ครบ พร้อม A4 visual QA และคงต้นฉบับเดิม
5. **R12A → R12B:** สร้างรายงาน school-level risk จาก candidate ก่อนโดยไม่มี PII; เตรียม private storage ก่อนรับภาพจริงและถอดข้อมูลเด็ก
6. **R11E:** หลังข้อมูล, การตรวจตารางและกรรมการรับรองครบ จึง release program/Docs/PDF/LINE จาก revision เดียว

## 5. จุดที่ยังไม่มีหลักฐานยืนยัน (ห้ามแสดงว่าเสร็จ)

- ไม่มีการตรวจ Deploy ล่าสุดบน Apps Script / URL จริงของ R10 และ R11 ด้วยบัญชีเจ้าหน้าที่
- ไม่ได้อ่าน Google Sheets สดซ้ำใน snapshot นี้; ใช้ R11A observed Sheet ณ 4 พ.ย. เดิม (คู่ 186: draft 162, review 24, approved 0 ณ ตอนนั้น)
- ไม่มีหลักฐานว่าทุกรายการและวันเวลา candidate ผ่านมติกรรมการหรือเผยแพร่แล้ว
- ไม่มีรายชื่อนักกีฬาจริงใน repo และไม่มีข้อมูลครบให้พิสูจน์ว่าไม่มีการชนกันระดับบุคคล
- ยังไม่ได้ทดสอบมือถือจริง/LINE WebView และการพิมพ์ A4 ในการตรวจ snapshot นี้

**หมายเหตุ:** สถานะข้างต้นเป็นหลักฐาน ณ เวลาตรวจ ก่อนงานอื่น merge เพิ่ม; ทุกแชทควรตรวจ `main` และ PR เปิดใหม่อีกครั้งก่อนลงมือ.
