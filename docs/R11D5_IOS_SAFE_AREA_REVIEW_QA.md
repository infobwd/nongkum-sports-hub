# R11D.5 — iOS Safe Area & Review Polish

**วันที่ดำเนินการ:** 5 พฤศจิกายน 2569  
**สถานะ:** Implementation / รอตรวจ CI + Merge (ปรับสถานะตามหลักฐาน PR)  
**ขอบเขต:** เฉพาะหน้า `review.html`, `css/review.css`, `js/review.js`, tests และ CI; **ไม่เปลี่ยน** กำหนดการแข่งขัน, PDF 41 หน้า, ผลการแข่งขัน, Google Sheets/Docs, R10–R12 หรือระบบ LINE

## 1. หลักฐานปัญหาจาก iPhone (ก่อนแก้)

- หน้า **ตรวจโปรแกรมแข่งขันฉบับใหม่** มีแถบสีเทาอ่อนปิดข้อความส่วนบนหลัง Scroll ตามภาพที่ผู้จัดส่งมา
- สาเหตุที่ตรวจพบใน `css/review.css` คือ `body[data-view="review"]:before` ภายใน `@supports (-webkit-touch-callout: none)` สร้าง pseudo-element แบบ `position:fixed`, ความสูง `max(44px, env(safe-area-inset-top))`, `z-index:120` ซึ่งอยู่เหนือเนื้อหาเมื่อเลื่อน และขัดกับข้อตกลงใน `css/base.css` ว่า **ไม่ให้มี fixed pseudo-element ทับ header**
- แถบสีเทาจาก pseudo-element แตกต่างจากพื้นที่ว่างใต้หน้า PDF A4 ในตัวอ่าน R11D.4; **ไม่จำเป็นต้องแก้ PDF viewer**

## 2. สิ่งที่เปลี่ยนจริง

1. **แก้ต้นเหตุ Safe Area:** ลบ block `@supports (-webkit-touch-callout: none)` ที่สร้าง `body[data-view=review]:before` และ style รองรับ `body.review-pdf-open:before` ออก ไม่ใช้ mask สีใหม่แทน ให้ `html/body` ใช้ `--safe-top: env(safe-area-inset-top)` และ `padding-top` จาก CSS ส่วนกลางตามเดิม
2. **เคารพ PDF เต็มจอ:** คง `body.review-pdf-open .review-pdf-preview {z-index:1300}`, ซ่อน mobile bottom navigation ชั่วคราว, และรักษาการเลื่อนสองฝั่งบนคอมตาม R11D.3
3. **ตัวกรองเพิ่มเติม:** คง native `<details>` และเพิ่มปุ่ม **ย่อตัวเลือกเพิ่มเติม** ที่ท้ายแผงสำหรับมือถือ; เมื่อต้องการย่อ **ไม่ล้างค่าเลือก**, แสดง `ใช้ 1/2/3 ตัวเลือก` เมื่อมีช่วงชั้น/ค้นหา/เฉพาะ QA ที่เปิดใช้งาน; ปุ่มล้างยังคืนค่าเริ่มต้นทั้งหมด
4. **การ์ดแข่งขัน:** คงวัน เวลา สนาม, หมายเหตุและปุ่ม PDF/แจ้งข้อผิดพลาดที่ระดับการ์ด; `review-card-details` และ `review-admin-codes` ยังพับเป็นค่าเริ่มต้น เพิ่ม style ยืนยันเนื้อหาของ details ที่ปิดไม่กินพื้นที่, แสดง focus-visible ขณะใช้แป้นพิมพ์
5. **แก้ cache เก่า:** หน้า Review อ้าง `css/review.css?v=r11d5` และ `js/review.js?v=r11d5` เพื่อไม่ให้ Safari/LINE ใช้ชุด CSS เดิมที่มีแถบสีเทา หลัง GitHub Pages เผยแพร่

## 3. Regression Gates

```bash
node scripts/ux/test-review-r11d5.mjs
node scripts/ux/test-review-r11d.mjs
node scripts/ux/test-review-r11d1.mjs
node scripts/ux/test-pdf-viewer-r11d2.mjs
node scripts/ux/test-review-r11d3.mjs
node scripts/ux/test-pdf-book-reader-r11d4.mjs
```

Workflow: `.github/workflows/r11d-review.yml`; ทดสอบด้วยข้อมูลร่างเดิม 237 รายการ ไม่เพิ่มข้อมูลรายบุคคล

## 4. Manual QA หลัง Deploy (ยังต้องตรวจบนอุปกรณ์จริง)

- [ ] iPhone Safari: ที่ `review.html` เลื่อนลงถึงตัวกรองและการ์ด QA; **ไม่มีแถบสีเทา fixed ปิดข้อความใน/ใต้ Status Bar**
- [ ] iPhone LINE WebView: เปิดลิงก์หน้า Review แล้วเลื่อนขึ้น/ลงหลายครั้งและเปิด/ปิด PDF, ไม่มีแถบสีเทาบังข้อความ
- [ ] เลือกช่วงชั้น + QA แล้วกด “ย่อตัวเลือกเพิ่มเติม”: แถบยังบอก **ใช้ 2 ตัวเลือก**, รายการยังถูกกรอง; กดขยายอีกครั้งค่าต้องไม่หาย; ล้างตัวกรองแล้วข้อความหาย
- [ ] รายละเอียดการ์ด: ปิดอยู่เป็นค่าเริ่มต้น, เปิดอ่านหมายเหตุ QA, รหัสผู้ดูแลยังไม่ปรากฏโดยไม่กดขยาย และปุ่มดูต้นฉบับ/แจ้งข้อมูลไม่ตรงยังใช้งานได้
- [ ] กด “ดูต้นฉบับ หน้า 7” แล้วปิด กลับสู่การ์ดเดิม; PDF Reader ยังปัดเปลี่ยนหน้า, ซูมและกดกลับได้ตาม R11D.4
- [ ] Chrome/Edge desktop: Split Scroll ไม่ผิดพลาด; การเปิด PDF ไม่ทับรายการซ้าย
- [ ] ตรวจว่าข้อมูล PDF/source JSON/ผล/LINE deep links ไม่เปลี่ยนและยังแสดงป้าย **ฉบับร่าง/ไม่ใช่ประกาศทางการ**

**หมายเหตุ:** Node/GitHub Actions ตรวจสัญญา DOM/CSS/JS และความถูกต้องข้อมูลได้ แต่ไม่ยืนยันภาพบน Safari/LINE จริงจนกว่าจะตรวจจากอุปกรณ์ของผู้ใช้
