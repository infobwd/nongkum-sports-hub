# มิตรภาพเกมส์ 2569 — งานค้างที่ต้องติดตาม (Snapshot 6 พฤศจิกายน 2569)

> **Evidence-first / ไม่ใช่สถานะ Deploy หรืออนุมัติ**. อ้างอิง `main` ที่รวม R19 PR #45–#46 และ R12C/R15 #42–#44 ณ ตรวจ 6 พ.ย. ก่อน R18-B merge; อ่าน PR และ JSON ล่าสุดทุกครั้งก่อนรายงานรายวัน.
> Repository: `infobwd/nongkum-sports-hub` (Public) · ห้ามนำรายชื่อนักเรียน/ครูจากทะเบียนจำกัดสิทธิ์ขึ้น GitHub

## สถานะที่ตรวจได้แล้ว
- **R13–R18: โค้ดเว็บ Merge แล้ว** โปรแกรมอ่าน candidate JSON 237 รายการ, เรียงวัน/เวลา, โหมดวันนี้/ถัดไป + ทุกวัน, แสดงเพิ่มทีละ 12 และกลับจากแท็บผลได้ (R16 #38, R17 #40, R18 #41); ยังต้องตรวจเครื่องจริง.
- **R19 สถานที่และเวลา #45 Merge**: ผู้จัดยืนยันสถานที่หลักทุกชนิดกีฬาเป็น **โรงเรียนบ้านหนองกระทุ่ม** (237 รายการ); ข้อมูลวัน/เวลา/สนามที่ยืนยันครบ **45 รายการ** = เปตอง 12–13 พ.ย. 24 รายการ + 16 พ.ย. 21 รายการ; อีก **192 รายการ** ยังมีรายละเอียดวันเวลาต้องตรวจรับ (ไม่ได้แปลว่าไม่มีวัน/เวลาที่พิมพ์ใน PDF).
- **วันในโปรแกรม**: 12 พ.ย. 12, 13 พ.ย. 12, 16 พ.ย. 73, 17 พ.ย. 38, 18 พ.ย. 33, 19 พ.ย. 37, 20 พ.ย. 29; อีก 3 รายการขึ้นปี 2568 ใน PDF ต้องไม่แก้เอง. รวม 237 รายการ. วัน/เวลาใน PDF ไม่เท่ากับยืนยันทุกคู่.
- **R19 กรรมการ #46 Merge เฉพาะ plan/data contract**: `docs/R19_COMMITTEE_ASSIGNMENT_REPORT_PLAN.md` และ JSON แม่แบบ 9 กีฬา 33 รุ่น, ยัง **0 รายชื่อกรรมการปี 2569 ที่ยืนยันจากหลักฐานในการตรวจรอบนั้น**. ห้ามใช้รายชื่อคำสั่งปี 2568 เป็นแต่งตั้งปีนี้.
- **R12C #44 Merge**: เครื่องมือคัดความเสี่ยงนักกีฬาเวลาแข่งหลายรายการพร้อม synthetic tests แต่ยังไม่ได้รายชื่อนักกีฬาจริงจาก 8 โรงเรียนและตารางเวลาเต็ม.
- **R15-A/B/C/D/E #39,#43,#42 Merge**: หน้าอันดับ, engine/validator และคู่มือรับผลจากภาพ/QA จำลองพร้อม; ยังไม่มีผลเผยแพร่ที่รับรองใน `data/public-results.json`, กติกาใน `data/standings-rules.json` ยัง pending/needs mapping ห้ามประกาศอันดับสมมติ.

## Backlog ใช้ทบทวนทุกวัน (เจ้าของเรื่อง/หลักฐาน/Next action)

| ความเร่งด่วน | สาย/สถานะ | ยังต้องทำ/เกณฑ์ปิด |
|---|---|---|
| P0 ก่อน 12–13 พ.ย. | **DATA R11E** / กำหนดสนามยืนยันบางส่วน | ตรวจเปตอง 24 คู่ให้ครบคอร์ต/เจ้าหน้าที่/ป้ายสนามและคู่แข่งจริง; 3 แถวปี 2568 ให้ผู้จัดมีมติ; อีก 192 รายการตรวจวันเวลาและสนามย่อยจากหลักฐาน, ห้ามตัด `source_pdf` |
| P0 | **R18-B** / plan-first + coding/CI | เปิดโหมดเลือกวันที่ 7 วันและกลุ่มรอวัน; วันกลับจากผล/ตัวกรอง/ยอดรายวันต้องถูก; QA Safari/LINE/Android และตรวจ GitHub Pages; เมื่อ Merge ให้ปรับสถานะเป็น merged ไม่ใช่ device-accepted |
| P0 | **R15-D/E** / code/static พร้อม, device QA pending | ซ้อมสนามด้วยใบ A4 จริง, ภาพถ่ายอ่านชัด, ถอด–ตรวจสองรอบ–รับรองโดยผู้มีสิทธิ์–approved-only export ผ่าน R15-C; ทดสอบบน iPhone/LINE/Android; ไม่มีผลจริงห้ามทดสอบขึ้นเว็บ public |
| P1 | **OPS R10/R11 + P2** / code Merge, deploy ยังไม่มีหลักฐาน | ติดตั้ง Apps Script สองโครงการ public/private แยกบัญชี/สิทธิ์, ตั้ง allowlist, รับคำขอ `pending` และออกประกาศด้วยกรรมการจริง, ทดสอบ URL /exec และ Google Sheets owner |
| P1 | **R12B/C** / engine จำลองพร้อม | รับภาพรายชื่อนักกีฬาจาก 8 โรงเรียนใน Drive owner-only, ตรวจ identity และ mapping สนาม/วัน/เวลาตามจริง, วิเคราะห์ hard/near/potential/unknown โดยไม่เผยแพร่ PII |
| P1 | **R15-B/C** / engine/validator Merge, rule gate BLOCKED | รับรองกติกาตัดสินคะแนนเสมอ ฟุตบอล/ฟุตซอล/เปตอง/ยิงจุดโทษ/กีฬาเซ็ต/กรีฑา; แยกคะแนนถ้วยรวม 5/3/2 จากแต้มฟุตบอล 3/1/0; อนุมัติ rule version ก่อน snapshot อันดับ |
| P1 | **R11C Docs/PDF** / สำเนาทำงานสร้างแล้ว | จัด Google Docs native 2569 ให้ครบ, ตัดข้อมูลปี 2568 ที่เป็นแม่แบบออกจากฉบับพิมพ์จริงหลังตรวจ, ตรวจ A4, revision เดียวกับ JSON/เว็บและมติ |
| P2 | **R19 รายงานกรรมการ** / plan + no-PII JSON Merge | รอคำสั่ง/รายชื่อกรรมการปี 2569 จริง, ยืนยันกับทะเบียนครู private, ตรวจงานกรรมการซ้ำและเวลา, ออก approved public projection และ UI ใน PR ใหม่ |
| P2 | **Web/device acceptance** / CI ≠ device PASS | Safari standalone, LINE WebView iOS/Android, PDF viewer, print A4, share deep link, โหลดข้อมูล/รีเฟรช/กลับหน้า และ Safe Area; บันทึกเครื่อง/เวลา/screenshot/commit |
| P2 | **R11E Release gate** / ยังไม่รับรองโปรแกรมทั้ง 237 รายการ | reconcile เวอร์ชันเดียวกับ Docs, Sheets, PDF, หน้าเว็บและ LINE OG; PR diff, rollback, ตัวเลข/ผู้รับรอง ตรวจผลบน host ก่อนประกาศเป็นทางการ |

## เงื่อนไขแจ้งเตือนรายวัน
ตรวจ PR และ commit ล่าสุดเทียบ snapshot นี้ พร้อมสถานะ deploy/QA/กติกาจริงใน docs; รายงาน (1) งานที่เปลี่ยนจากเมื่อวาน (2) ค้างและติดใคร (3) 3 งานด่วนที่สุด (4) หลักฐานลิงก์. ถ้าไม่พบหลักฐานให้ใช้ `ยังไม่ยืนยัน` ไม่สรุป PASS. รักษาตารางงานฉบับนี้เป็น **snapshot**; ห้ามยึดสถานะเก่ามาแทน main ใหม่.

## แหล่งแผนที่ใช้
- `docs/R18B_DATE_SELECTION_AND_ACTIVE_BACKLOG_PLAN.md`
- `docs/R18_DATE_AWARE_PROGRAM_STATUS_UX_QA.md`
- `docs/R12C_PRIVATE_ROSTER_CONFLICT_ENGINE.md`
- `docs/R15BC_RULES_ENGINE_JSON_VALIDATION_QA.md`, `docs/R15E_MOBILE_ACCEPTANCE_QA.md`
- `docs/R19_COMMITTEE_ASSIGNMENT_REPORT_PLAN.md`
- `docs/R10_FIELD_OPERATIONS_DEPLOY_QA.md`, `docs/R11_PUBLIC_REQUEST_DEPLOY_AND_QA.md`
- `docs/R11C_GOOGLE_DOCS_WORKING_DRAFT_HANDOFF.md`, `docs/SPORTS_2569_PARALLEL_WORKSTREAMS_PLAN.md`
