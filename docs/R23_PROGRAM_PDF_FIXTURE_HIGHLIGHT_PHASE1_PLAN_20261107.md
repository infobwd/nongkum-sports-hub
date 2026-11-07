# R23 Phase 1 — ไฮไลท์รายการแข่งขันใน PDF ต้นฉบับ 41 หน้า (7 พฤศจิกายน 2569)

**สถานะเริ่ม: PLAN RECORDED BEFORE EDIT / NOT MERGED / NOT DEPLOYED**

## หลักฐานที่ตรวจจริง
- main @ `b023d466fcce0456e7a3808a4c857006861185f9`; PDF เดิม `assets/souvenir-2569-v2.pdf` 41 หน้า SHA256 `1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf` (ตรวจต้นฉบับ PDF ที่เข้าถึงได้).
- โปรแกรมเว็บ `js/program.js` สร้างลิงก์ `pdf-viewer.html?page=N&from=program&fixture=ID` อยู่แล้ว; `js/review.js` ส่ง `fixture=ID` เช่นเดียวกัน แต่ `js/pdf-viewer.js` ปัจจุบันใช้รหัสนี้เพื่อกลับการ์ดเท่านั้น
- `js/committee-pdf-highlight.js`, `data/committee-pdf-positions-v3.json`, `js/pdf-viewer.js` ฝั่งกรรมการใช้พิกัดที่ตรวจแล้ว, ตรวจ SHA/revision/page/row ก่อนแสดง ไม่เดาชื่อจากการสกัด text layer ในมือถือ
- JSON ตารางแข่งต้นฉบับเก็บ 237 รายการ (`program-from-pdf...`), ใช้ `program-corrections.js` ตัดฟุตบอลหญิงรอบชิงซ้ำ 20 พ.ย. เป็น 236: 186 คู่ + 50 กรีฑา
- PDF 155 หน้า V42-I10 กับ PR #116, #118 เป็นคนละสาย ยัง Draft; PR #117 เป็นหลักฐานปกที่ไม่ผ่าน; ไม่แตะในรอบนี้

## วิธีดำเนินการ
1. สร้าง `data/program-pdf-positions-v2.json` แผนที่ `fixture.id -> {page,rect,number,kind}` โดยอ่าน **PDF V2 ที่ทราบ SHA** และข้อมูล active 236 รายการจากต้นฉบับ JSON; ยืนยันด้วยข้อความ/เลขคู่/รุ่น/ลำดับบนหน้า, ไม่จับด้วยเลขคู่เพียงอย่างเดียว
2. สร้างสคริปต์สกัดและตรวจตำแหน่งใน `scripts/program/` พร้อม test audit coverage: 236 IDs, ไม่มีคู่ตัดออก, ไม่ซ้ำ, ตำแหน่ง 0..1, หน้า PDF 1..41 และตรวจความไม่กำกวม
3. เพิ่ม `js/program-pdf-highlight.js` เพื่อแสดง highlight overlay แบบเดียวกับกรรมการ โดยต้องตรวจ revision, SHA จาก index, page และ fixture id ที่อยู่ในชุด active 236 เสมอ; หากพิกัดยังไม่ผ่าน ให้คงการเปิดหน้าเดิมแต่ไม่ไฮไลท์ผิดคู่
4. เพิ่ม overlay ใน `pdf-viewer.html` โดยไม่กระทบ `committee-pdf-viewer.html`; เพิ่มโหมด program ใน `js/pdf-viewer.js` เฉพาะ `?fixture=ID`; แสดงป้าย "เน้นรายการที่เลือก" และ scroll-to-row, ย่อ/ขยาย/หมุนจอวาดใหม่, เปลี่ยนหน้าแล้วซ่อน
5. ทดสอบหน้าตาราง, หน้า review, ย้อนกลับ, PDF ไม่มี fixture, 41 หน้า, ผล/Sheets/JSON เดิม, PDF กรรมการ 64 หน้าและไฮไลท์ 250 รายการ; iPhone Safari/Chrome/LINE ต้องตรวจจริงก่อนการรับรองเผยแพร่
6. เปิด PR แยกจากสายเล่ม/ผัง; **ไม่ Merge หรือเปลี่ยน GitHub Pages จนกว่าจะได้รับอนุญาต**

## หลักความปลอดภัย/คุณภาพ
- ไม่สร้างคู่หรือวันเวลาเอง; สถานะไฮไลท์หมายถึง **รายการที่เลือก** ไม่ใช่ผล/ตารางได้รับรอง
- ไม่คาดเดาพิกัดจาก text layer อุปกรณ์ผู้ใช้งานหรือจากชื่อทีมอย่างเดียว
- ยึด PDF 41 หน้าใน GitHub เท่านั้น; PDF revision ใหม่ต้องสร้าง map ใหม่ ไม่ใช้ตำแหน่ง V2 กับเล่ม 155 หน้า
- จำกัดไฟล์แก้ที่ฝั่ง viewer/index/test/docs ไม่เปลี่ยนข้อมูลรายการ/กรรมการ/คะแนน/แผน V42-I ของ PR อื่น

## เกณฑ์ก่อน Merge
- ทุก row ที่ไฮไลท์มีพิกัดที่พิสูจน์จาก PDF ว่าเป็นตัวเลือกจริง, พร้อมรายงาน coverage/missing
- เปิดตรงหน้าก่อน แล้วแสดงไฮไลท์เท่านั้นเมื่อ revision ตรง; ไม่มี highlight ที่ผิดคู่แม้ query ถูกแก้ไข
- ผังแสดงไม่กระโดดเมื่อเปลี่ยน page/zoom/resize, ฟังก์ชันกรรมการเดิมไม่ถดถอย
- Source tests/CI ผ่าน; manual iPhone/LINE ระบุค้างจนตรวจจริง
