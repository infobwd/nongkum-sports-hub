# R11D.1 — Mobile Teacher UX + PDF V2 link

วันที่ 4 พฤศจิกายน 2569 · แผนก่อนลงมือใน `feat/r11d1-mobile-teacher-ux-pdf-v2`

## ขอบเขตที่ผู้จัดสั่ง
- ลดอาการหน่วงบนมือถือ: ไม่ rebuild การ์ด 24 ใบทุกตัวอักษร, หน่วงค้นหา 280ms, รองรับ Thai IME, แสดงเริ่มต้น 8 ใบ, กดเพิ่มแบบ incremental, อย่าเปลี่ยน URL ทุกตัวอักษร
- ครูเลือก **โรงเรียน** และ **กีฬา** ก่อน; ช่วงชั้น, ค้นคำ, เฉพาะเรื่องควรตรวจ เป็นตัวกรองเพิ่มเติมที่พับไว้; ค่า URL/ลิงก์เดิมยังต้องใช้ได้
- การ์ดสั้น: คู่/ชื่อทีม + วัน/เวลา/สนาม + คำเตือนสั้น, รายละเอียด PDF/QA/diff/ID/ปุ่มแชร์อยู่ใน `details`; คงการแจ้งแก้ผ่านแชท ไม่มี approval/backend writes
- เปลี่ยนศัพท์เทคนิคในหน้าจอ เช่น `Revision`, `QA`, `Fixture ID`, `R11D` เป็นภาษาสำหรับครูโดย **ไม่เปลี่ยนชื่อ fields, ID หรือ revision ใน JSON**
- เพิ่มลิงก์เปิด/ดาวน์โหลดจาก Drive ไฟล์ที่ผู้จัดระบุจริง `ร่าง - สูจิบัตรกีฬากลุ่ม ปี 2569_V2.pdf` (ขนาด ~983KB) จาก ID ที่ยืนยันผ่าน Google Drive connector; ปุ่มเปิดไฟล์ใน Google Drive ให้ผู้ใช้ใช้คำสั่งดาวน์โหลดของ Drive; ไม่ย้ายไฟล์/เปลี่ยน sharing. **ไม่ยืนยันสิทธิ์ anyone** — แสดงข้อสังเกตว่าอาจต้องขอเข้าถึง
- แท็บล่างหน้า review รู้ว่ากำลังอยู่หน้าตรวจ โดยเพิ่มแท็บ review เฉพาะหน้า review, ไม่แก้ R6 program/results
- รักษา 237 source records, 70 QA flags, 24 petanque planning rows, 236 original web records + LINE share pages, Google Docs R11C, Google Sheets, R10.
- ตรวจ Safe Area โดยไม่สร้าง fixed overlay หรือ splash ที่ปิดทับ header

## Acceptance
- tests เดิม `node scripts/ux/test-review-r11d.mjs` ผ่าน พร้อม R11D.1 test สำหรับ debounce, pagination incremental, collapsed detail, copy-to-chat, exact Drive link, teacher text และ navigation
- CI เดิม R8/R9/R11A ไม่ถอย, ยืนยัน link Drive exists ก่อนคอมมิต
- manual QA บน iPhone Safari/LINE WebView และ Android ต้องทดสอบภายหลัง; ไม่อ้างว่าผ่านจาก automated test
- ไฟล์ PDF **อยู่ใน Google Drive ไม่ใช่ public GitHub repo**; ผู้ที่ไม่มีสิทธิ์อาจต้องขออนุญาต แม้จะเห็นลิงก์บนเว็บไซต์
