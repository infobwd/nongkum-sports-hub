# R24-I — ผลพัฒนาและตรวจสอบศูนย์ข้อสังเกตสูจิบัตร (8 พฤศจิกายน 2569)

**สถานะ ณ บันทึกนี้:** DEVELOPED / AUTOMATED QA PASS / รอ Merge และตรวจหน้าเว็บจริง; **ไม่ใช่การตรวจรับข้อมูลการแข่งขันหรือสูจิบัตรทางการ**

## ขอบเขตที่ทำเสร็จใน PR #128
- แผนบันทึกก่อนแก้โค้ด: `docs/R24I_BOOKLET_NOTES_PLAN_20261108.md` commit `36ac3e6541325a80222739f05098f663ba4cc79f`
- เพิ่ม `booklet-notes.html` ให้ดูเฉพาะข้อสังเกต ไม่ต้องเลื่อนรายการแข่งขัน 236 รายการ: ค้นหา, กรองความสำคัญ/กีฬา/สถานะ, สรุปประเด็น, ต้นทาง, ผลกระทบ, สิ่งที่ต้องขอมติ, เปิด V2 ตามหน้าต้นฉบับ, เปิดเล่ม 155 หน้า, คัดลอกข้อความพร้อมช่องหลักฐาน, ตัวเลือกอัปเดต/ดึงลง/กลับขึ้นบน
- เพิ่ม `data/booklet-observations-2569.json` เป็น **ทะเบียนกลุ่มประเด็นฉบับตรวจร่าง** 18 กลุ่ม ไม่ใช่ผลตรวจรับ: 2 เร่งด่วน, 12 ควรตรวจก่อนรับรอง, 4 ตรวจเพิ่มเติม. ในนี้ 11 `source_qa` ต้นฉบับถูกครอบคลุมโดย 10 กลุ่ม และเพิ่มกลุ่มจากแผน V42-H/R24-D/R24-E/R11A อีก 8 กลุ่ม
- ดึงคำอธิบาย 11 `source_qa` จาก JSON ต้นฉบับ **ตอนแสดงหน้า** โดยตรง ไม่คัดลอกแก้คำต้นฉบับ; ตรวจ source SHA / 237 raw, exclusion ฟุตบอลหญิงซ้ำ 1 → 236 active ตามมติเดิม. `qa_flags` 70 รายการและ 486 anchors ไม่ใช่จำนวนข้อผิดพลาด
- แยกฟุตบอลหญิงรอบชิงวันที่ 18 พ.ย. ซึ่งเว็บจัดการแถวซ้ำวันที่ 20 พ.ย. แล้วออกจากปัญหาคู่ใหม่; ยังคงให้ตรวจ PDF ฉบับสุดท้าย
- เพิ่มลิงก์จาก `booklets.html` และ `booklet-comparison.html`. ไม่แตะตัวอ่าน/ไฟล์ PDF เดิม, ตัวสร้าง PDF, ผัง, ปก, ตารางแข่งขัน/ผล/กรรมการ/Sheets

## Automated QA บน head b2cf70efad31b395740889ab790ea78636b64ffd
- [R24-I booklet observations QA](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42494855497) — **PASS**
- [R24-D reconciliation](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42494855484) — **PASS**
- [R24-A/B catalog](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42494855485) — **PASS**
- [R24-C private links](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42494855489) — **PASS**
- [R24-F reader](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42494855436) — **PASS**
- [R24-H public 155 PDF](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42494855430) — **PASS**
- [Validate draft data](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42494855488) — **PASS**
- [R14 schedule and LINE](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42494855445) — **PASS**

ชุด R24-I ตรวจความครบ 11 รหัสต้นฉบับ, 18 กลุ่มไม่ซ้ำ, สถานะเริ่มต้นไม่มีการรับรอง, 70 flagged rows เป็นจำนวนธงตรวจไม่ใช่ปัญหา, 236 active fixtures, เงื่อนไข fail-closed เมื่อ source revision เปลี่ยน, คำคัดลอกไม่ใช่มติ, ลิงก์/กล่องค้นหา, `approved_only`/ผลที่เผยแพร่ว่าง.

## แยก Gate ให้ถูกต้อง
- **PLAN RECORDED:** ผ่าน
- **CODE DEVELOPED:** ผ่าน
- **AUTOMATED QA:** ผ่านบน head ที่ระบุข้างต้น
- **MERGED:** รอทำหลัง commit QA นี้และตรวจ CI head ล่าสุด
- **GITHUB PAGES:** ต้องตรวจหลัง Merge; ไม่สรุปจาก CI อย่างเดียว
- **DEVICE ACCEPTED:** ยังไม่มีหลักฐาน Safari/LINE/Android เครื่องจริง; ให้ตรวจร่วม R24-E1
- **CONTENT APPROVED / R11E:** ยังไม่ผ่านและไม่เปลี่ยนสถานะเอกสารจากงานนี้

## งานส่งต่อผู้จัด
1. ก่อน 12–13 พ.ย.: ตรวจเปตอง 24 คู่ (เวลา/คอร์ต/ผัง 10 ปีชาย) พร้อมหลักฐานมติ
2. รับรองประเด็นอื่นรายข้อ; เก็บรหัสต้นฉบับ/รุ่น PDF/ผู้ตรวจ/เวลา/มติในระบบที่มีสิทธิ์เหมาะสม; หน้า R24-I สาธารณะอ่านอย่างเดียว
3. ทำ R24-D2 ตรวจข้อความ V2/V3/155 รายช่อง, R24-E เครื่องจริง, R11E รับรอง/เชื่อม Docs/Sheets/PDF/เว็บ; ห้ามคัดลอกเป็น 'ผ่านตรวจรับ' จาก CI
