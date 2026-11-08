# R24-H — เผยแพร่ PDF ฉบับรวม 155 หน้าในเว็บและเปิดอ่านตรงแบบ V2/V3

วันที่ 8 พฤศจิกายน 2569 · ผู้จัดยืนยันว่าไฟล์นี้อนุญาตให้เผยแพร่แล้ว และได้แชร์ให้ทุกคนอ่าน
สถานะเริ่ม: PLAN RECORDED BEFORE IMPLEMENTATION

## ข้อมูลตรวจสอบก่อนเริ่ม
- `main` @ `cea50b3df83830facbbf33449f136502b25096a1`; PR #126 R24-G Merge แล้ว มีตัวอ่านแบบ V2/V3 แต่เริ่มที่ไฟล์ในเครื่องหรือ Drive Preview/OAuth ที่ยังไม่ตั้งค่า
- PR #124 R24-E1 ยัง Draft; แก้ `js/pdf-viewer.js` และ `js/booklet-private-viewer.js`; งาน R24-H ห้ามแก้สองไฟล์นี้
- PDF ต้นฉบับ Google Drive `1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF`; metadata เคยยืนยัน 4,067,611 ไบต์, MIME application/pdf
- SHA-256 ที่ยึดเป็นรุ่นต้นฉบับ: `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d`; คาด 155 หน้า; 486 reference anchors (236 fixture + 250 committee) ยังไม่ใช่การรับรองข้อมูล
- V2 41 หน้า `assets/souvenir-2569-v2.pdf` และ V3 64 หน้า `assets/souvenir-committee-2569-v3.pdf` ต้องคงเดิม

## ขอบเขตที่ผู้จัดอนุญาต
ผู้จัดอนุญาต **เผยแพร่สำเนา PDF 155 หน้าแบบสาธารณะบน GitHub Pages** เพื่อให้ผู้เข้าเว็บเปิดอ่านได้โดยไม่ต้องเข้าสู่ระบบ Google/เลือกไฟล์. การเผยแพร่ไฟล์เพื่ออ่านไม่เท่ากับรับรองความถูกต้องเนื้อหา/ผล/กรรมการหรือประกาศสูจิบัตรเป็นฉบับทางการ; สถานะเอกสารยังเป็น “ฉบับตรวจร่าง” จนมีการตรวจรับ R11E.

## ขั้นตอนหลัก
1. รับ **ไฟล์ PDF จริง** จาก Drive (ไม่ใช้ลิงก์หลอก/ไฟล์เปล่า) และตรวจ byte size, `%PDF-`, SHA256 ตรงค่า, 155 หน้า. หากไม่ตรง **หยุด ไม่เผยแพร่ไฟล์ผิดฉบับ**.
2. เพิ่มไฟล์ `assets/souvenir-2569-v42i10-g2-155pages.pdf` ใน GitHub branch โดยไม่เขียนทับ V2/V3
3. ปรับ `booklet-drive-viewer.html` / `js/booklet-unified-viewer.js` เป็น **auto-load PDF จาก same-origin** และแสดงปุ่มหน้า/ซูม/พอดีกว้างแบบเดียว V2/V3 ทันที; drive iframe/เปิด Drive เป็น fallback สำหรับเครือข่ายหรือ PDF.js ล้มเหลว; ไม่ต้อง OAuth
4. ปรับ `data/booklet-versions.json`, `js/booklets.js`, หน้าเลือกฉบับและคำอธิบายสถานะเป็น `public_source_review_pdf` พร้อม `source_path`; `document_status=draft_review_not_approved`, `approved_at=null`, `audit_155.publication_approved=false` ต้องคงค่าไว้
5. คงกลไก private map SHA + 486 token **ในพื้นที่ที่ได้รับสิทธิ์เท่านั้น**; ไม่นำแผนที่ JSON private มาเผยแพร่. ไม่แก้ผล/คะแนน/อันดับ
6. ปรับ automated tests R24-A/B/C/D/F/G และเพิ่ม R24-H ตามการเปลี่ยนจาก `Google Drive permissioned preview` เป็น `same-origin reader` อย่างถูกต้อง และ CI ตรวจ SHA/PDF pages (ห้ามเฉพาะ string tests)
7. PR + CI PASS → Merge เมื่อผู้จัดอนุญาต → Pages deployment → QA มือถือจริง แยกสถานะ

## ข้อจำกัดด้านหลักฐาน
- หากเครื่องมือ Github หรือ Drive ไม่สามารถโอนไฟล์ไบนารีได้ ต้องรายงาน **ไม่อ้างว่าเผยแพร่สำเร็จ**. รักษา fallback Drive ปัจจุบันไว้
- ไม่เปลี่ยน Google Drive sharing/permission ด้วยโค้ด
- ผู้จัดอนุญาตเผยแพร่ไฟล์สำหรับอ่านแล้ว แต่ไม่ได้อนุมัติรายการกรรมการ/โปรแกรมทั้งหมดอย่างเป็นทางการ
- เคสต้องทดสอบ: Safari iPhone, LINE iOS, Android Chrome, หน้า 1/99/100/155, zoom, fit, swipe, SHA/404 fallback, เปิด PDF ตรง, 236/250/486 คงเดิม
