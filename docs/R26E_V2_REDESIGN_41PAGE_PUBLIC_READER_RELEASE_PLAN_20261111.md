# R26-E — เปลี่ยนสูจิบัตร V2 41 หน้าให้ใช้แบบออกแบบใหม่ โดยเก็บแหล่งอ้างอิงเดิม

วันที่ 11 พฤศจิกายน 2569 • **สถานะเริ่ม: PLAN / NOT YET RELEASED**  
**คำสั่งผู้จัด:** “merge และเปลี่ยนที่เว็บไซต์”

## ตรวจหลักฐานก่อนดำเนินการ
- PR #134 ที่บันทึกแผน R26-B/C/D, QA, เครื่องมืออ้างอิง **MERGED ลง main** commit `5d6fabc5797a94c5039423cca4c4ab9913d5c2f3` (เฉพาะ docs/scripts).
- ไฟล์ที่จะนำขึ้นเว็บ: [R26-D V2 41 หน้า ฉบับผังใหม่](https://drive.google.com/file/d/1fnqC_AmfiPJ2MpW-2M6eBCN7A6ODs9c5/view); ไฟล์ในแชท 1,271,633 bytes, SHA256 `40d04daba7c1b7b5d655e6973989bec54c89c84a7b2832ba4700cd81f059b84f`; PDF 41 A4 (37 portrait, 4 landscape), 13 bookmarks, ฝัง V2 source evidence.
- V2 ต้นฉบับ 41 หน้า `assets/souvenir-2569-v2.pdf` SHA `1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf`, R23/R24-K พิกัดไฮไลต์ 236 รายการผูกกับไฟล์เก่า.
- PR #133 ที่เผยแพร่เล่มรวม Design V2 155 หน้า (คนละ document) MERGED; ไม่แตะ `booklet-drive-viewer.html` หรือ PDF 155 หน้า.
- `data/booklet-versions.json` ยังระบุ V2 PDF เดิมเพื่อรักษา `js/booklet-comparison-model.js`, `js/booklets.js` validators และพิกัดตรวจ; ห้ามเปลี่ยน hash ต้นฉบับจนกว่าจะสร้าง+รับรองพิกัดใหม่.

## แนวทางปลอดภัย
1. เพิ่ม PDF R26D ฉบับใหม่ลง repository ในชื่อ/พาธ **ใหม่** (ไม่เขียนทับ PDF เดิม), ส่งใน GitHub Pages แบบ same-origin ผ่าน base64 chunks และตรวจ SHA256 ทั้งไฟล์ก่อนเปิด. ใช้เวอร์ชันใน URL ป้องกัน cache ปะปน.
2. สร้างตัวอ่านสำหรับ **R26D 41 หน้า** ที่มีปุ่มก่อนหน้า/ถัดไป/ระบุหน้า/ซูม/แสดงเต็มหน้า/เปิด Google Drive สำรอง และป้าย `ฉบับตรวจร่าง`. UI มือถือแบบ V2/V3, Safari/LINE.
3. เปลี่ยน **ลิงก์เปิดอ่าน V2 ทั่วไป** ใน `booklets.html` และ `review.html` ให้เปิด R26D ใหม่เป็นค่าเริ่มต้น; เพิ่มลิงก์ `V2 ต้นฉบับ (พร้อมจุดไฮไลต์)` ที่ชัดเจน.
4. **เส้นทางจากคู่แข่งขัน/ข้อสังเกต** ที่มี `?fixture=...`, `?note=...` หรือ route `pdf-viewer.html?page=...` สำหรับอ้างอิงข้อมูลเดิม ยังเข้าตัวอ่าน **V2 source SHA เดิม** พร้อมไฮไลต์ตรงตำแหน่ง. ไม่กล่าวอ้างว่า PDF ดีไซน์ใหม่มีพิกัดที่ยืนยันแล้ว.
5. ห้ามแก้ข้อมูลแข่งขัน raw 236 รายการ, ข้อมูลกรรมการ, `public-results.json`, Google Sheets/Docs หรือหน้าการรับรอง. ไม่เปลี่ยนวัน เวลา ผล หรืออันดับ.
6. CI: ตรวจการประกอบ chunks exact SHA, 41 A4, metadata, reader fail closed, test existing R23/R24 and UI no regressions. เปิด PR และ merge ตามคำสั่งผู้จัดหลัง CI ผ่าน.
7. หลัง Merge ติดตาม GitHub Pages deployment; แยก **MERGED/BUILD/DEPLOYED/LIVE ACCESS VERIFIED/FIELD TESTED** ชัดเจน. หาก deploy ยังไม่เสร็จ ห้ามสรุปว่าเว็บแสดงไฟล์ใหม่แล้ว.

## ข้อสังเกตคงอยู่
- ยังมีผังบางหน้า **8/9/12/14 และ 1–6** ที่ไม่ได้ redraw ใหม่ทั้งหมด; R26D เป็นการออกแบบผังใหม่ **หน้า 10,15,16,19,21** พร้อมตาราง/กรีฑาที่จัดใหม่. อย่ากล่าวว่า redraw ครบทุกผัง.
- คอร์ตเปตอง 12–13 พฤศจิกายนซ้ำ 12 กลุ่ม, ชักเย่อ 12 ปีหญิงมีเพียง 7 ทีม, ปี/สายชิงบางรายการยังรอตรวจ; ฉบับใหม่ **review only**.
- พิมพ์ A4 จริง / Safari/LINE / Android field acceptance ยังไม่ทดสอบ.

**สถานะ:** วางแผน / รอพัฒนาเว็บไซต์
