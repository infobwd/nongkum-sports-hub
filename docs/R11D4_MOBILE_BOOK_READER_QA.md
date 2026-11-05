# R11D.4 — Mobile Book Reader UX · สูจิบัตร PDF

**สถานะ:** IMPLEMENTED IN PR / รอตรวจ CI และทดสอบเครื่องจริง · 5 พฤศจิกายน 2569  
**ฐานเดิม:** [R11D.3](R11D3_SPLIT_SCROLL_MOBILE_REVIEW_QA.md) — desktop two-pane, mobile fullscreen source-preview  
**ขอบเขต:** เปลี่ยนเฉพาะ `pdf-viewer.html`, `css/pdf-viewer.css`, `js/pdf-viewer.js`, `js/review.js`, tests และ CI; ไม่แก้ PDF ต้นฉบับ, ข้อมูลกีฬา/ตาราง/ผล, R10–R12, Google Docs/Sheets หรือ LINE shortlinks

## สิ่งที่ปรับจริง

1. **ปุ่มกลับชัดเจน:** ตัวอ่าน standalone แสดง `← กลับไปตรวจรายการ` ที่ header เชื่อมเฉพาะ `./review.html` และใส่ `?fixture=...` ได้เมื่อ ID ตรวจรูปแบบผ่านเท่านั้น; ป้องกัน external redirect/query URL ไม่เชื่อถือ
2. **เปิดจากการ์ดใน Review:** `review.js` ส่ง `page`, `fixture`, `embedded=1` ให้ iframe ตาม source PDF; ปุ่มกลับใน iframe ส่ง `postMessage` ไปยังต้นทางโดยใช้ same-origin และหน้า parent ตรวจ `event.origin`, `event.source`, `event.data.type` ก่อนปิด; คืนตัวกรอง/Scroll และโฟกัสที่รายการเดิมผ่านขั้นตอน R11D.3
3. **อ่านเหมือนหนังสือบนมือถือ:** ปุ่มก่อนหน้า/เลขหน้า/ถัดไปย้ายไปแถบล่าง รองรับ safe-area-inset-bottom (ปุ่มสัมผัสไม่น้อยกว่า ~44px), ลด header เหลือปุ่มกลับ ชื่อย่อ และ `⋯ ตัวเลือก` แบบเปิด/ปิด
4. **ปัดนิ้วเปลี่ยนหน้า:** จับเฉพาะ swipe แนวนอนในพื้นที่อ่าน (ระยะอย่างน้อย 65px, ต้องมากกว่าแนวตั้ง 1.35 เท่า, ภายใน 850ms); แค่ zoom=1 เท่านั้น, การเลื่อนแนวตั้งปกติและการปัดใกล้ขอบไม่เปลี่ยนหน้าเกิน 1–41
5. **ซูม:** แตะสองครั้งสลับ zoom 1 ↔ 1.8, pinch สองนิ้วแสดง preview ระหว่างขยาย/ย่อแล้ว PDF.js render หลังปล่อยนิ้ว, clamp 0.8–2 เท่า; **ขณะซูมไม่เปลี่ยนหน้าจาก swipe**, มีปุ่ม fit width/fit page และ +/− ในเมนูเป็นทางเลือก
6. **อ่านได้แม้โหลด PDF ไม่สำเร็จ:** fallback เปิดไฟล์ V2 same-origin ตรง, และกลับ Review ผ่านปุ่มในตัวอ่าน; PDF ต้นฉบับยังเป็น 41 หน้า ไม่ถือเป็นกำหนดการแข่งขันทางการ
7. **Desktop:** ฝั่ง PDF ยังเป็น iframe ที่เลื่อนได้อิสระจากรายการตาม R11D.3; เมนูและปุ่มเปลี่ยนหน้าใหม่ปรากฏในตัวอ่าน แต่ไม่เปลี่ยนระบบ split layout ฝั่งซ้าย

## QA ที่รันอัตโนมัติ

- `node scripts/ux/test-pdf-book-reader-r11d4.mjs` (swipe ก่อน/หลัง, vertical vs horizontal, double tap, pinch zoom, ห้าม swipe ตอน zoom, back route, ID validation, postMessage embedded)
- `node scripts/ux/test-review-r11d.mjs`, `test-review-r11d1.mjs`, `test-pdf-viewer-r11d2.mjs`, `test-review-r11d3.mjs`
- `.github/workflows/r11d-review.yml` พร้อม validate source PDF/metadata/old LINE behavior

## จุดที่ต้องทดสอบจริงบนเครื่อง (ยังไม่ใช่ PASS)

- [ ] iPhone Safari: กดปุ่มกลับ header standalone ได้, เปิดจากการ์ด→ปิดแล้วกลับรายการเดิม, กด bottom nav ขณะถือมือเดียว
- [ ] iPhone LINE WebView: ลิงก์ PDF ในแท็บใหม่และ embed; หน้าต่าง/แท็บที่เปิดโดย LINE จะยังกลับไป `review.html` ได้เมื่อใช้ปุ่มภายในตัวอ่าน
- [ ] iPhone Safari: ปัดซ้ายหน้า 1→2, ปัดขวา 2→1; เลื่อนแนวตั้งอ่านหน้า A4 ไม่พลิก; ทดสอบหน้า 41 ไม่ล้น
- [ ] iPhone Safari: double-tap, pinch zoom, เลื่อน PDF ที่ขยายแล้วไม่เปลี่ยนหน้า, Fit Page/Width reset zoom
- [ ] iPhone/Android: เมื่อเปิดเมนู `⋯ ตัวเลือก` ปุ่มซูมและไฟล์เต็มกดได้, ไม่ถูก Status Bar/Home Indicator หรือ bottom menu ของเว็บไซต์ทับ
- [ ] Android Chrome: ปิด PDF จากทั้งหน้า standalone และภายใน Preview แล้วกลับไปยังรายการเดิม
- [ ] Desktop Chrome/Edge: PDF ฝั่งขวา scroll อิสระ, กดกลับใน iframe แล้วคืน scroll เดิม, กดหน้าถัดไป/เลขหน้าไม่ค้าง
- [ ] หาก Safari ของ LINE ปิดการจับ pinch gesture ให้ยืนยันว่าเมนู +/- ยังใช้ได้ (fallback)
- [ ] ภาพ PDF รายหน้า, SHA, วันที่/ผลจากร่าง และลิงก์ LINE เดิมไม่เปลี่ยน

**ข้อจำกัด:** เป็นการอ่านทีละหน้าแบบ WD Books-style **ไม่ใช่** page-curl 3D หนักหรือโค้ดที่ยืนยันว่าโคลนมาจาก Repository WD Books เดิม. ยังไม่ใช่การตรวจบนอุปกรณ์จริงจนกว่าจะบันทึกผล QA ตามเช็กลิสต์.
