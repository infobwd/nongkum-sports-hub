# R7 — Visual Consistency & Safe Area (มิตรภาพเกม 2569)

สถานะ: แก้ไข CSS และ regression tests / ต้องตรวจ Safari บน iPhone จริงหลัง Deploy

## หลักฐานก่อนแก้
จากภาพ iPhone ที่ผู้จัดส่งให้:
- หน้าโปรแกรมมีแถบสีเทาอ่อนคลุมส่วนหัวเมื่อเลื่อน
- หัวข้อหน้าและกล่องค้นหาของหน้าโปรแกรมมีขนาดแตกต่างจากหน้าผลการแข่งขัน
- หน้าผลมีข้อความ Footer ตัวใหญ่และระยะท้ายหน้ามาก
- Bottom Navigation สองแท็บของ R6 ใช้งานได้ดี ควรรักษาไว้

ตรวจพบในโค้ด:
- `css/base.css` สร้าง `body.is-scrolled::before` สูง `max(44px, var(--safe-top))` เมื่อเลื่อนหน้า
- `css/program.css` และ `css/results.css` สร้าง `body::before` แบบ `position:fixed` ทับบริเวณหัวด้วย `z-index:999`
- ทั้งสองไฟล์ยังตั้ง `--safe-top` / `padding-top` ซ้ำกัน
- หน้าโปรแกรมกำหนด `h1`, `panel h2`, `brand`, `logo` และ Footer เฉพาะหน้า; หน้าผลใช้ขนาดจาก `base.css` จึงไม่ตรงกัน
- R6 สำรองท้ายหน้าไว้ทั้ง `main` และ `footer` รวมเป็นช่องว่างเกินความจำเป็น

## งานแก้ไข

### R7.1 — เอาชั้นบังส่วนหัวออก
- **ลบ `body::before` แบบ fixed ทั้งหมด** ออกจาก CSS หน้าโปรแกรมและหน้าผล
- ลบ `body.is-scrolled::before` จาก CSS กลาง
- เอา scroll event ที่เคยสลับคลาส `is-scrolled` ใน `js/navigation.js` ออก
- ไม่แทนด้วย overlay ตำแหน่งอื่น ให้ Safari จัดการพื้นที่ viewport ปกติผ่าน Safe Area

### R7.2 — Safe Area แหล่งเดียว
- ใช้ `--safe-top:env(safe-area-inset-top,0px)` และ `--safe-bottom:env(safe-area-inset-bottom,0px)` เฉพาะใน `css/base.css`
- ให้ `html` และ `body` มีสีพื้น `#f5f7fb` และ `body` ใช้ `padding-top:var(--safe-top)` เพื่อรองรับ Standalone PWA
- Bottom Navigation R6 คง fixed สองแท็บ ความสูงอย่างน้อย 56px และ Bottom Safe Area ตามเดิม
- ลดช่องว่างท้ายหน้า: ไม่ให้ `main` สำรอง 104px **และ** `footer` สำรอง 100px พร้อมกัน แต่ใช้ `main` 28px และ `footer` 92px + Safe Area ในจอมือถือ

### R7.3 — มาตรฐานตัวอักษรและ spacing ร่วมกัน
- ทั้งสองหน้าใช้ `Noto Sans Thai` ตามเดิม
- กำหนด `--page-title-size` และ `--section-title-size` ใน `base.css`
- ใช้หัวข้อ `h1`, `h2`, `brand`, `logo`, `hero`, `panel / result-panel` และ `footer` จาก CSS กลาง
- `css/program.css` และ `css/results.css` เหลือเฉพาะรูปแบบตาราง/การ์ด/ตัวกรองที่ต่างกันตามหน้าที่
- ทำความกว้างขอบมือถือ `.shell` ให้เท่ากันที่ 14px
- Footer หน้าผลอ่านเป็นข้อความรอง ไม่ใหญ่เท่าหัวข้อหรือเนื้อหาหลัก

### R7.4 — สถานะรีเฟรช
- สองหน้าใช้ helper กลางแสดง `ตรวจล่าสุด ... น.`
- ข้อความต่อท้ายสั้นเป็น `ไฟล์เผยแพร่บนเว็บ` เพื่อแยกจากข้อมูลสดใน Google Sheets
- ไม่เปลี่ยนวิธีการโหลด approved-only JSON หรือสถานะข้อมูล

## การทดสอบ

เพิ่ม `scripts/ux/test-visual-consistency-r7.mjs` และปรับ `test-mobile-ui.mjs` / `test-mobile-navigation-r6.mjs` ให้ตรวจว่า **ไม่มี fixed overlay** แทนการคาดหวัง overlay เดิม

คำสั่งตรวจหลัก:

```bash
node scripts/validate-data.mjs
node scripts/p2/test-approval.mjs
node scripts/ux/test-mobile-ui.mjs
node scripts/results/test-results.mjs
node scripts/results/test-exporter.mjs
node scripts/ux/test-refresh-share-forms.mjs
node scripts/ux/test-score-sheet-r5.mjs
node scripts/ux/test-mobile-navigation-r6.mjs
node scripts/ux/test-visual-consistency-r7.mjs
```

## การตรวจรับบนอุปกรณ์จริง (ยังไม่ยืนยัน)

- [ ] iPhone Safari: เปิดหน้าโปรแกรมตั้งแต่ด้านบน เห็นโลโก้ครบ ไม่มีแถบทับ
- [ ] เลื่อนลง 20–30 การ์ด แล้วเลื่อนกลับขึ้นมา: แถบสถานะไม่บังข้อความ/หัวเรื่อง
- [ ] สลับไปหน้าผลการแข่งขัน: ขนาดโลโก้ หัวข้อ ส่วนค้นหา และระยะขอบเหมือนหน้าโปรแกรม
- [ ] หน้าไม่มีผล: Footer ตัวเล็กและไม่เว้นช่องว่างยาวผิดปกติ
- [ ] แถบล่างไม่บังการ์ดสุดท้าย และกดสลับแท็บด้วยการแตะหนึ่งครั้งได้เหมือน R6
- [ ] เปิดเป็นเว็บใน Safari และเพิ่มไปหน้าจอโฮม (Standalone): Safe Area ถูกต้องทั้งแนวตั้งและแนวนอน
- [ ] Android Chrome/จอแท็บเล็ต: ไม่เกิดแถบซ้อนหรือเนื้อหาล้นขอบ
- [ ] Desktop: เมนูบนคงอยู่ และไม่แสดงแถบล่างมือถือ

**ข้อจำกัด:** CI ตรวจโค้ดและสัญญาการแสดงผลได้ แต่ไม่แทนการตรวจภาพ Safari จริง
