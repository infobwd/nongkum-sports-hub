# R10 — ระยะที่ 2 ศูนย์ประกาศสนาม (Field Operations Console)

สถานะ: **IMPLEMENTATION PLAN / PLAN-FIRST** · 4 พฤศจิกายน 2569  
ฐานพัฒนา: `main` commit `958bb012`  
สาขา: `feat/r10-field-operations-console`  
เงื่อนไข: แผนนี้ต้องถูก commit **ก่อน** code implementation; UI จะทำงานภายใน Apps Script ที่เจ้าของบัญชีติดตั้งและ Deploy เท่านั้น ไม่ใช่ GitHub Pages

## เป้าหมายและผู้ใช้งาน
- **กองอำนวยการ / ผู้บรรยาย**: เห็นคิวประกาศ รับ/เตรียม/อ่านประกาศ และบันทึกเวลาอ่านจริง
- **ผู้ประสานงานสนาม**: สร้างคำขอเรียกทีม, ประสานกรรมการ, ประชาสัมพันธ์ โดยไม่อ้างว่ากำหนดการร่างเป็นข้อมูลทางการ
- **ผู้รับผิดชอบระบบ**: จำกัดสิทธิ์ตามอีเมล, ตรวจประวัติการดำเนินงาน, แยกสิทธิ์เผยแพร่สาธารณะออกจากการอ่านออกไมค์

## ภารกิจ MVP ที่อนุมัติ (Phase 2)
1. หน้าจอมือถือ/เดสก์ท็อป **ศูนย์ประกาศสนาม** ใน `apps-script/Announcer.html` ใช้เทมเพลตข้อความภาษาไทยชัดเจน ไม่ใช่ระบบ Text-to-Speech อัตโนมัติ และไม่มีข้อมูลส่วนบุคคลนักเรียน
2. ฟอร์ม **เรียกนักกีฬา**, **ติดตามกรรมการประจำสนาม**, **ประชาสัมพันธ์ทั่วไป** มีข้อมูลกีฬา/รุ่น/ทีม/สนามตามความเหมาะสม; เรียกทีม/กรรมการด้วยชื่อโรงเรียน/หน้าที่ ไม่เดารายชื่อกรรมการ
3. วงจรงานภายใน: `pending` → `ready` → `announced`, หรือ `pending/ready` → `cancelled`. แสดงคิว/ประวัติ, filter, ปุ่ม copy ข้อความ, ป้ายลำดับความเร่งด่วน, ผู้ทำรายการ/เวลา และบันทึกการเปลี่ยนสถานะทุกครั้ง
4. ข้อมูลอยู่ใน **Google Sheet ภายในที่แยกจาก P2** โดยเป็น Apps Script แบบ bound-script: `01_คิวประกาศ`, `02_ประวัติประกาศ`; สร้างแท็บผ่าน `nkOpsSetup()` หลังอนุญาตสิทธิ์. *อย่าแบ่งปันสิทธิ์ Editor ของ P2 ให้เจ้าหน้าที่เพียงเพื่อใช้ฟีเจอร์นี้*
5. เขียน backend `apps-script/Announcer.gs` บังคับ allowlist ทุก request ฝั่งเซิร์ฟเวอร์: `NONGKUM_COORDINATOR_EMAILS`, `NONGKUM_ANNOUNCER_EMAILS`; บัญชีไม่ยืนยัน / ค่า property ว่าง → ปิดกั้น; อ่านคิวเฉพาะเจ้าหน้าที่, การเปลี่ยนสถานะเฉพาะผู้บรรยาย. ผู้ดูแลตั้งค่าใน Script Properties และเรียก `nkOpsSetup()` ด้วยบัญชีเจ้าของ
6. ป้องกัน race conditions ด้วย `LockService`; มี version/status validation; จัดการการอัปเดตซ้ำและ optimistic status check; history ไม่มีข้อมูลลับ/เลขโทรศัพท์/ชื่อนักเรียนใน public GitHub
7. การอ่านข้อมูลทั้งหมดใช้ `google.script.run` และตรวจสิทธิ์ฝั่ง backend; UI ประกอบด้วย safe DOM `textContent` (ไม่ใช้ `innerHTML` กับข้อมูลจากผู้ใช้). ป้ายชัดเจนว่า **คิวภายใน ไม่ใช่ประกาศอย่างเป็นทางการ**.
8. รีเฟรชอัตโนมัติแบบไม่อ้าง Real-Time ทุก 20–30 วินาทีเมื่อหน้าอยู่ foreground; มีปุ่มรีเฟรชเอง, แสดง timestamp ล่าสุด/เชื่อมต่อไม่ได้, ไม่ล้างข้อความที่กำลังกรอก
9. เพิ่ม Node regression tests ฝั่ง backend แบบ Apps Script mocks และการทดสอบ HTML/static security พร้อม CI ใน `.github/workflows/validate.yml`. จัดทำคู่มือติดตั้ง/QA.

## สิ่งที่ **ไม่** ทำระยะนี้
- ไม่เปิด public write API, ไม่วาง token/secret ใน GitHub Pages, ไม่เปิด Web App ให้ anonymous
- ไม่แก้ `06_ประกาศ` ของฐาน P2 และไม่เผยแพร่ประกาศขึ้นเว็บประชาชน (ระยะที่ 3)
- ไม่เปลี่ยนวัน เวลา สนาม ผลการแข่งขัน และไม่เชื่อมข้อมูลร่างไปสร้างประกาศโดยอัตโนมัติ
- ไม่เดาชื่อนักกีฬา/กรรมการ ไม่ทำทะเบียนกรรมการที่ไม่ผ่านการตรวจสอบ ไม่ส่ง LINE หรือเล่นเสียงอัตโนมัติ
- ไม่บังคับให้ระบบนี้ออนไลน์จาก GitHub Pages ก่อนติดตั้ง Web App ด้วยบัญชีที่มีสิทธิ์

## สถาปัตยกรรม/สิทธิ์
```text
บัญชีเจ้าหน้าที่ (ต้องอยู่ใน allowlist และมีสิทธิ์เข้าถึง Sheet ภายใน)
   ↓ Google Apps Script Web App (Execute as: User accessing / Google sign-in)
   ↓ doGet + google.script.run (server-side allowlist ทุกคำขอ)
Announcer.gs (LockService + validate + audit)
   ↓
Google Sheet ภายในแยก: 01_คิวประกาศ | 02_ประวัติประกาศ
   ↳ ไม่ sync ข้อมูลนี้เข้า GitHub Pages / P2 06_ประกาศ
```
ข้อจำกัดที่ต้องระบุ: ผู้ใช้ Web App ที่ execute as user ต้องมีสิทธิ์เข้าถึง Spreadsheet ภายในสำหรับการอ่าน/เขียน ผู้ใช้ที่เป็น Editor สามารถแก้ชีทได้โดยตรง (version history ไม่ใช่หลักฐาน audit ที่แก้ไม่ได้) ดังนั้นให้แชร์เฉพาะเจ้าหน้าที่ที่ไว้วางใจ และห้ามถือว่า log เป็นหลักฐานพิสูจน์ตัวตนเชิงกฎหมาย

## ตารางข้อมูล
`01_คิวประกาศ`: id, created_at, created_by, type, priority, sport, division, team_a, team_b, field, message, status, updated_at, updated_by, version, announced_at

`02_ประวัติประกาศ`: log_id, occurred_at, actor, request_id, action, from_status, to_status, detail
จำกัดจำนวนแถวที่อ่านในหน้าจอ (ล่าสุด 100) เพื่อไม่ให้แอปหน่วง; ไม่รับข้อมูล personal identifiers จากนักเรียน/บุคคล, ไม่นำ log ไปเผยแพร่สาธารณะ

## Acceptance gates
- [ ] Commit plan-first ก่อนแก้โค้ด
- [ ] Initial empty queue, create athlete/referee/general, status pending→ready→announced, cancelled, invalid transition, permission denied, concurrent stale update (version mismatch) ผ่าน regression
- [ ] Client ที่ไม่มี allowlist ไม่เห็นรายการหรือเปิดฟอร์มเขียนได้
- [ ] No XSS: เซิร์ฟเวอร์สร้างข้อความ template แบบ plain text; client ไม่ใส่ข้อความ user-origin ด้วย `innerHTML`
- [ ] ไม่มีการแสดงวัน/เวลา/สนามที่ไม่ได้รับรองว่าเป็นตารางทางการ
- [ ] Queue และ history จำกัดการแสดงผล, refresh แสดงข้อความเมื่อโหลดผิดพลาด, UI responsive, safe area
- [ ] CI ของ branch + PR ผ่าน ก่อน merge
- [ ] คง R6–R9/ผล Approved-only / LINE deep links ผ่าน
- [ ] Deploy Web App ด้วยบัญชีผู้ดูแลและทดสอบด้วย user จริง **ยังไม่ถือว่า PASS จนกว่าเจ้าของจะติดตั้ง/อนุญาตสิทธิ์ใน Google Apps Script UI**

## Implementation/rollout
1. commit เอกสารนี้บนสาขาทดลอง
2. พัฒนา `Announcer.gs`, `Announcer.html`, tests, guide, README, CI
3. ทดสอบ PR → merge เมื่อผ่าน ไม่เปิด public link ไป console ที่ยังไม่ deploy
4. ผู้ดูแลสร้าง Google Sheet แยก, ติดตั้งไฟล์ .gs/.html ตามคู่มือ, ตั้ง Script Properties, Deploy Web App แบบ execute as user accessing; ทดสอบสองสิทธิ์และบันทึกหลักฐานก่อน GO LIVE
