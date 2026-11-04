# R11A — ข้อตกลงส่งต่องาน 3 แชท (4 พฤศจิกายน 2569)

> อ้างอิง [R11A Reconciliation](R11A_RECONCILIATION_2569.md) และ [แผนคู่ขนาน](SPORTS_2569_PARALLEL_WORKSTREAMS_PLAN.md)  
> **ก่อนเปิด PR/merge ทุกครั้ง ให้ตรวจ PR และไฟล์ที่อีกแชทเปลี่ยนล่าสุด; อย่า force-push branch ของกันและกัน**

## แชท 1 — R10 ศูนย์ประกาศสนาม (ดำเนินต่อจาก PR #18)
- เจ้าของไฟล์: `apps-script/Announcer.gs`, `apps-script/Announcer.html`, `scripts/ops/*`, `docs/R10_*` และ Google Sheet กองอำนวยการภายใน (ไม่ใช่ P2)
- ขั้นถัดไป: ติดตั้ง Google Apps Script Web App, ตรวจ allowlist/บัญชีผู้ประกาศจริง, mobile QA และบันทึกผล Deploy
- **ห้าม:** แก้ Master JSON, ทะเบียนคู่แข่งขัน P2, public fixtures, public results หรือขึ้นข้อมูลผู้บรรยายใน GitHub สาธารณะ
- ยังไม่มีหลักฐานยืนยัน live deployment ตามแผน ณ จุดตรวจ R11A

## แชท 2 — R11A / R11B / R11D (แชทหลักข้อมูลสูจิบัตร)
- เจ้าของไฟล์: `data/reconciliation/*`, `scripts/data/*`, `docs/R11A_*`, หลัง R11A จึงเปิดสาขาใหม่สำหรับ R11B backend รับข้อเสนอและ R11D review preview
- Candidate read-only: `data/program-from-pdf-2569-20261104-draft.json`; revision `pdf69-20261104-draft-r11a`
- เว็บ live ไม่เปลี่ยน: `data/draft-schedule.json` 236 รายการ; Candidate 237 รายการ; รหัสเดิม 236 ยังครบ
- ขั้นถัดไป: แยกข้อขัดแย้งเป็น checklist ให้โรงเรียน, ออกแบบการตรวจด้วย stable fixture ID, ไม่รับรองแทนกรรมการ
- **ห้าม:** แก้ไฟล์ R10, Google Docs ของอีกแชท, หรือเขียนทับ Sheet P2 186 คู่

## แชท 3 — R11C Google Docs (เริ่มแล้ว: PR #20 Merged)
- อีกแชท R11C ได้ทำสำเนา Google Docs ฉบับทำงานใหม่และ Merge แผนส่งต่อใน PR #20 แล้ว: [R11C Working Draft Handoff](R11C_GOOGLE_DOCS_WORKING_DRAFT_HANDOFF.md); ใช้ Shared Drive `งานกีฬากลุ่ม / ปี 2569` และไม่แตะต้นฉบับ
- **Google Docs เดิมมีข้อมูลปี 2568 หลายจุด**: ต้องทำสำเนา/สร้างเอกสารใหม่สำหรับ `มิตรภาพเกม ปี 2569`, ไม่แก้ทับต้นฉบับและไม่คัดลอกคำสั่งหรือชื่อกรรมการเก่าเป็นปี 2569 โดยไม่ได้ยืนยัน
- เริ่มจากออกแบบ A4 เนื้อหาขนาดเหมาะสม, ใช้ Heading และ native tables, แบ่งหน้าตารางกีฬา-รุ่น, กรีฑาและสารบัญ; สร้าง Google Docs **ฉบับร่างตรวจสอบ**
- เนื้อหาโปรแกรมให้ดึงจาก **Candidate JSON `data/program-from-pdf-2569-20261104-draft.json` เท่านั้น**; อ้างเลข revision `pdf69-20261104-draft-r11a`, ระบุจำนวน 187 คู่ + 50 กรีฑา/289 ลู่, แสดง `source_pdf`/`draft_*` เป็นข้อมูลตามเอกสารไม่ใช่ Approved
- ดูรายงาน [R11A](R11A_RECONCILIATION_2569.md) สำหรับรายการข้อขัดแย้ง: ฟุตบอล #20 ซ้ำ, วอลเลย์บอลรอบชิง, เปตอง 10 ปีชาย, ตะกร้อ #24, ปี 2568 ของเปตองสามแถว และวันกรีฑา
- ใช้สถานะ `ร่างเพื่อให้โรงเรียน/คณะกรรมการตรวจสอบ` ในหัว/ท้ายหน้า; อย่าใส่ตรา/คำว่า `รับรองแล้ว` จนมี approval revision จาก R11E
- **ห้าม:** แก้ JSON/เว็บ/Google Sheets P2; ห้ามทำ live 2-way sync หรือเผยแพร่ Google Docs ให้ anonymous โดยไม่ตรวจสิทธิ์
- บันทึก link Google Docs ฉบับใหม่และ revision ในแชท/PR ภายหลัง โดยไม่ใส่ private file ID, email, credential ใน repo public

## จุดรวมงาน (handoff gate)

- R11A ส่ง `r11a-program-diff-20261104.json` + source QA → R11B/R11D ใช้แสดงจุดแก้
- R11C ใช้ candidate revision เดียวกันเพื่อออก Google Docs draft; เมื่อ R11E ประกาศ revision ใหม่ **ค่อย regeneration** เอกสารพร้อมกันกับเว็บ
- R10 ไม่เข้าร่วมการแก้คู่แข่งขันและไม่เป็นตัวรับรองข้อมูล; หากต้องแสดงคู่แข่งขันในศูนย์ประกาศในอนาคต อ่าน snapshot ที่ผ่านรับรองเท่านั้น
- หากมีอีกแชทเปิด PR เปลี่ยนไฟล์ R11A หรือ candidate, เจ้าของงานต้องอ่าน diff และ reconcile ก่อนเพิ่ม commit ของตน
