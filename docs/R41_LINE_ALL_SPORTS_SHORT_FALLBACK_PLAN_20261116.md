# R41 — ลิงก์แชร์ผลสั้น ครอบคลุมทุกชนิดกีฬา (LINE fallback)

วันที่: 16 พฤศจิกายน 2569  
แหล่งต้นทาง: GitHub `main` 16bd7ddd747e13b2fda1d691176ea11c520b4cdf; R36 #153/#154, R39 #157, R32 `public.nongkum_published_results`.  
สถานะ: **วางแผนแล้ว** (สาขา `fix/r41-line-sport-fallback-shortlinks-20261116`, ยังไม่ Merge, เผยแพร่ หรือทดสอบจริงใน LINE)

## ข้อเท็จจริงและปัญหา
- ภาพจากผู้จัด: ข้อความแชร์ `results.html?result=...` ที่มีรหัสภาษาไทยยาวและ LINE แสดงภาพถ้วยรางวัลทั่วไป แทนภาพที่ระบุกีฬา/รายการ
- ณ 16 พ.ย. 2569 เวลาไทยระหว่างตรวจ R32 มีผลรับรอง 41 รายการ (กรีฑา 36, เปตอง 5) แต่ `data/result-share-index.json` ใน main มี 23 รายการ
- R36 สร้างภาพรายผลผ่าน workflow รายชั่วโมงและเปิด PR ให้ผู้จัดทบทวนก่อน Merge; ระหว่างรอ PR `js/shared.js` fallback เป็น deep URL ยาว จึงกระทบทุกกีฬาที่มีผลใหม่ไม่ทันภาพ
- 9 กีฬาใน `data/public-results.json`: football, shootout, futsal, volleyball, takraw, petanque, tabletennis, tugofwar, athletics
- PR #159 ยังเปิด แต่เน้นรูปกิจกรรม; R41 ไม่แก้ส่วนอัปโหลดรูป ผล/สิทธิ์รับรอง สูจิบัตร หรือฐานข้อมูล

## ขอบเขตที่พัฒนา
1. รักษา `r/<hash>-v<revision>-p2/` เป็นตัวเลือกหลักเฉพาะรายการที่มี approved-only OG และ PNG จริงใน index และ revision ตรงกัน
2. หากยังไม่มีเพจผลล่าสุด สร้างลิงก์สั้น `s/<sport>/?ref=f<hash>` แทน URL ไทยยาว; เป็น **ภาพและคำอธิบายเฉพาะกีฬาแบบกลาง** ไม่ใส่ผู้ชนะ/คะแนน/รุ่นที่ยังไม่สร้างจากผลรับรอง เพื่อไม่หลอกว่าแสดงผลรายคู่แล้ว
3. หน้า `s/<sport>/` แสดง OG แยกแต่ละกีฬาที่กำหนดใน public catalog, ภาพการ์ด PNG จาก pictogram เดิม (ไม่ใช้ภาพนักเรียน); เมื่อเปิดจะพาไป `results.html?ref=f<hash>` ซึ่งตรวจรายการผล R32 `approved` สดก่อนแสดง
4. `results.html?ref=` ค้นจาก hash ของ ID ใน **approved-only** data; ถ้าหาไม่พบหรือ hash ชนหลาย ID ให้ fail closed ไม่เลือกผลหรือสร้างผู้ชนะเอง; รองรับ `?result=<legacy>` ที่ส่งไว้เดิม
5. หากกีฬาใหม่ยังไม่มีหน้ากลาง ใช้ `results.html?ref=f<hash>` โดยตรง ไม่สร้าง URL ปลอมหรือ 404
6. แยกรูปกลางออกจาก `r/` ไม่แก้การสร้างรายการรับรองหรือการเก็บ cache รุ่นการ์ด R36; ใช้ชื่อกีฬาและสถานะเปิดดูผลสดเท่านั้น

## ตรวจสอบก่อน PR
- ทดสอบสคริปต์ R36 (approved, revision, ภาพเก่า, กรีฑา ranking, เปตอง win_loss) และทุกกีฬา 9 ประเภท ทั้ง native share/clipboard
- ทดสอบ fallback เมื่อไม่มี index/รูป, deep link hash, invalid/colliding hash, legacy deep link, และการไม่เปิดผลร่าง
- ตรวจหน้า HTML OG + PNG 1200×630, ไม่มีคะแนน/ผู้ชนะสมมติ, ลิงก์ใช้งานใน LINE/Safari/Android
- ตรวจความเข้ากันกับ R34/R38/R39, แคช JS ใหม่, และไม่เผยข้อมูลส่วนบุคคล

## ผลกระทบ/ข้อจำกัด
- ภาพเฉพาะผลจริงจะยังไม่ทันทีจน R36 สร้างหน้าและ PR ได้ Merge; ช่วงนั้น LINE จะแสดงภาพ **เฉพาะกีฬา** (ไม่ใช่เฉพาะผล) พร้อมข้อความชื่อคู่จาก native share
- ต้องตรวจ GitHub Actions, เผยแพร่ Pages และ LINE จริงภายหลัง Merge ก่อนรายงานว่าตรวจรับ
- ไม่อัปเดต Supabase หรือเปลี่ยนสถานะผลการแข่งขันจากงาน R41

## หลักฐานการพัฒนาและการตรวจครั้งแรก
- PR: https://github.com/infobwd/nongkum-sports-hub/pull/163
- R36 build / render / validate / test จาก source ก่อน bot commit: https://github.com/infobwd/nongkum-sports-hub/actions/runs/43839657726 — success ทุกขั้น
- CI ได้เพิ่ม `s/<sport>/index.html` และ `card.png` ครบ 9 กีฬาใน branch โดยอัตโนมัติ; ไม่มีการเปลี่ยน `r/` หรือผลการแข่ง
- ตรวจไฟล์ตัวอย่าง `s/petanque/index.html`: มี OG ภาษาไทย, ชื่อเปตอง, PNG 1200×630 และเส้นทาง `results.html?ref=f<hash>`
- ยังรอ CI รอบสุดท้ายบน HEAD และตรวจเว็บไซต์จริงหลัง Merge; สถานะ **พัฒนาแล้ว / ยังไม่ Merge / ยังไม่เผยแพร่ / ยังไม่ตรวจรับ**
