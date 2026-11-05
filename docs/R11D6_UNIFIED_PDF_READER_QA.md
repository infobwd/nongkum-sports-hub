# R11D.6 — Unified PDF Reader: Header / Safe Area / Warning

**วันที่:** 5 พฤศจิกายน 2569  
**สถานะ:** Implementation & CI review (สถานะจริงให้ดู PR / Actions)  
**ต้นทางปัญหา:** ภาพ iPhone แสดงหัวสีน้ำเงินของ Review กับหัวสีขาวของ PDF Reader ซ้อนกัน เมื่อเปิด PDF จากการ์ดคู่แข่งขัน และแสดงคำเตือนฉบับร่างทั้งใน iframe กับ Review ซ้ำสองชุด

## หลักการที่ยืนยัน

- **เปิด PDF โดยตรง (standalone):** คง Header สีขาวของ R11D.4, ปุ่มกลับไปตรวจรายการ, เมนู Fit Width / Fit Page / Zoom, ปุ่มก่อนหน้า–ถัดไปด้านล่าง และข้อความฉบับร่างหนึ่งชุด
- **เปิดจากการ์ดคู่แข่งขัน (embedded in Review):** ให้หน้า Review เป็นเจ้าของ Header สีกรมท่า (ชื่อรายการ/เลขหน้า + กลับไปคู่แข่งขัน), คำเตือนฉบับร่างหนึ่งชุด และ Safe Area ของ iPhone; iframe เป็นเจ้าของ PDF canvas, เมนูซูม, ปุ่มเปลี่ยนหน้าและ gesture เท่านั้น
- **Desktop split view:** Header ของ Review ที่อยู่ด้านบนคอลัมน์ PDF เหมือนเดิม; iframe ไม่แสดง Header ซ้ำ ใช้ Scroll แยกสองฝั่งตาม R11D.3
- **ห้ามเปลี่ยน** ข้อมูล candidate 237 รายการ, ตารางเว็บเดิม 236 รายการ, ผล, Google Sheets/Docs, R10–R12, และ PDF ต้นฉบับ 41 หน้า

## สิ่งที่เปลี่ยนในโค้ด

1. เมื่อ `?embedded=1` **และ** ตัวอ่านอยู่ภายใน iframe จริง ให้เพิ่ม class `pdf-embedded` บน document root. ถ้าเปิด URL เดียวกันในแท็บเดี่ยว ไม่ปิด Header ของตัวอ่าน
2. ใน iframe ให้ย้าย `#pdfTools` เดิมไปอยู่ภายใน `#pdfBottomBar` ก่อนใช้งาน (ไม่ได้สร้างปุ่มหรือเมนูซ้ำ); ซ่อน `.pdf-book-header`, `.pdf-draft` และคำแนะนำปัดอีกหนึ่งบรรทัดเฉพาะโหมด embedded
3. เมนู `⋯` ในแถบล่างจะเปิด upward เพื่อคงการเข้าถึง Fit Width / Fit Page / Zoom และเปิดไฟล์เต็ม ขณะที่ปุ่มก่อนหน้า/ถัดไปยังอยู่จุดเดิม
4. หน้า Review กำหนด `padding-top:env(safe-area-inset-top,0px)` สำหรับ modal แทนการบังคับขั้นต่ำ 44px; พื้นที่ด้านล่างใช้ Safe Area ของ parent เท่านั้น โดย child embedded เลิกเผื่อด้านล่างซ้ำ
5. เพิ่ม version `r11d6` ที่ CSS/JS ของหน้า Review และ PDF Reader และลิงก์ iframe เพื่อลดการใช้ไฟล์แคชก่อนแก้บน Safari/LINE

## Automated QA

Workflow: `.github/workflows/r11d-review.yml`

```bash
node scripts/ux/test-unified-pdf-r11d6.mjs
node scripts/ux/test-review-r11d.mjs
node scripts/ux/test-review-r11d1.mjs
node scripts/ux/test-pdf-viewer-r11d2.mjs
node scripts/ux/test-review-r11d3.mjs
node scripts/ux/test-pdf-book-reader-r11d4.mjs
node scripts/ux/test-review-r11d5.mjs
```

ชุดทดสอบ R11D.6 แยก standalone / embedded / เปิด `?embedded=1` ในแท็บตรง ตรวจว่า options ใช้เมนูเดิมเพียงชุดเดียว ไม่มี Header/Warning ซ้ำใน embedded และยังเชื่อมกลับรายการ/หน้า PDF ได้ถูกต้อง

## Manual QA หลัง Deploy — ยังไม่ผ่านจนกว่าจะทดสอบจริง

- [ ] iPhone Safari เปิด PDF จากการ์ดฟุตบอลหน้า 7: เหลือ Header สีน้ำเงินชุดเดียว, ไม่มี Header สีขาวใน iframe
- [ ] ไม่มีแถบว่างจาก padding-top ขั้นต่ำ 44px แทรกใต้ Safe Area อีก และ Status Bar ไม่ทับ Header
- [ ] ไม่มีข้อความแจ้งว่า PDF เป็นฉบับร่างซ้ำใต้ปุ่มเปลี่ยนหน้าและแถวเตือนอีกชุด
- [ ] เมนู `⋯` ที่แถบล่างเปิดขึ้นด้านบน กด Fit Width / Fit Page / Zoom / เปิดไฟล์เต็มได้
- [ ] เลื่อนหน้ากระดาษ ปัดไปหน้า 8 กลับหน้า 7 และซูมสองนิ้ว; ขณะซูมไม่พลิกหน้าโดยไม่ตั้งใจ
- [ ] ปุ่ม “กลับไปคู่แข่งขัน” ปิด modal แล้วคืนตำแหน่ง Scroll/ตัวกรองของการ์ดเดิม
- [ ] เปิด `pdf-viewer.html?page=1` โดยตรง: ยังมี Header สีขาว ปุ่มกลับ เมนูด้านบน และคำเตือนหนึ่งชุด
- [ ] LINE WebView, Android Chrome, Desktop Chrome/Edge: ไม่มี overflow ซ้ายขวาหรือ tool panel ถูกตัด และ Desktop split scroll ยังปกติ
- [ ] ตรวจ PDF source hash และสถานะ Draft บน Review ไม่ถูกเปลี่ยนระหว่าง Merge

**ข้อจำกัด:** CI ตรวจ DOM/JavaScript contracts และ source invariants แต่ไม่ทดแทนการตรวจตำแหน่ง Safe Area และสัมผัสจริงบน Safari/LINE ของผู้จัด
