# R26-E — ผลตรวจการสลับหน้าอ่าน V2 ไปยังฉบับออกแบบใหม่ 41 หน้า

วันที่ 11 พฤศจิกายน 2569 (Asia/Bangkok)  
**สถานะ ณ บันทึก: PDF UPLOADED TO REPO / READER DEVELOPED / PR #135 CI PASS 13/13 / MERGE PENDING / LIVE PENDING / FIELD ACCEPTANCE PENDING**

## คำสั่งและแหล่งข้อมูลจริง
- ผู้จัดสั่ง “merge และเปลี่ยนที่เว็บไซต์”.
- PR #134 (R26-B/C/D plans+QA+scripts) **merged** `5d6fabc5797a94c5039423cca4c4ab9913d5c2f3`.
- R26D PDF [Drive](https://drive.google.com/file/d/1fnqC_AmfiPJ2MpW-2M6eBCN7A6ODs9c5/view) ที่ตรวจผ่าน 41 หน้า A4 (37 portrait, 4 landscape), 13 bookmarks, แนบต้นฉบับ V2 ภายใน PDF, 1,271,633 bytes, SHA-256 `40d04daba7c1b7b5d655e6973989bec54c89c84a7b2832ba4700cd81f059b84f`.
- V2 source เดิม SHA `1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf` ต้องไม่ถูกเขียนทับ เพราะเป็น reference สำหรับไฮไลต์รายการ 236 และข้อสังเกต.
- แผน R26-E บันทึกไว้ **ก่อนแก้ไฟล์เว็บไซต์**: [R26E release plan](R26E_V2_REDESIGN_41PAGE_PUBLIC_READER_RELEASE_PLAN_20261111.md).

## ส่วนที่พัฒนา
- เก็บ PDF ใหม่ใน `assets/r26d-v2-41pages/part-01.b64` ถึง `part-03.b64` แบบ **same-origin GitHub Pages**, แบ่ง 450,000 / 450,000 / 371,633 decoded bytes; textual Git blob SHA:
  - 01 `898e01c04e9dfdcd83e4b978421d7bbcd2f56df5`
  - 02 `66e3493f21c8167b56ab2b8e767652c2a2aebb60`
  - 03 `982d0dadae7939a33613445d1f590ac1a48e1d40`
- `js/pdf-v2-design-viewer.js` ประกอบ 3 ส่วน + ตรวจความยาว/หัว `%PDF-` และ `SHA-256` ตรงก่อนเปิด PDF.js. ถ้าไม่ตรง/โหลดไม่ได้ **ไม่แสดง PDF ผิดรุ่น**, มีข้อความพร้อมลิงก์สำรอง.
- เพิ่ม `pdf-v2-design-viewer.html`: ปุ่มเลื่อนหน้า, เลือกหมายเลขหน้า, ซูม/ทั้งหน้า, swipe, ดาวน์โหลด PDF จาก bytes ที่ตรวจแล้ว, ลิงก์ Drive สำรองและ V2 ต้นฉบับ.
- `booklets.html` + `js/booklets.js`: ปุ่มเปิด V2 ทั่วไปเป็น **V2 ฉบับออกแบบใหม่**, เพิ่มปุ่มรอง **ต้นฉบับพร้อมไฮไลต์**. ไม่เปลี่ยน `data/booklet-versions.json` ซึ่งเก็บ source metadata ของ V2 เดิม; ห้ามตีความว่ารุ่นใหม่มีพิกัดใหม่.
- `review.html`: ปุ่มเปิด PDF ทั่วไปเป็นรูปแบบใหม่; เพิ่มปุ่มดู/ดาวน์โหลดต้นฉบับและลิงก์ต้นฉบับ Drive เดิม. **เส้นทางเปิดรายการเฉพาะคู่/หมายเหตุ** ยังคงใช้ `pdf-viewer.html` + `js/pdf-viewer.js` SHA-pinned ต้นฉบับและ R23/R24-K highlight 236 จุด ไม่แก้ไขตัวอ่านเดิม.
- `js/program.js`, raw 236 source, `public-results.json`, V3/กรรมการ, เล่มรวม 155 หน้า, Sheets, Docs, Apps Script **ไม่เปลี่ยน**.

## QA
- **PASS** exact file byte length 1,271,633 + SHA256 ใหม่; GitHub 3 blobs เทียบ SHA-1 ที่คำนวณจากไฟล์ชิ้นจริงและตรวจ bytes CI.
- **PASS** 41 A4 pages, 37 portrait/4 landscape (Python pypdf ใน GitHub Actions).
- **PASS** เวอร์ชันเว็บใหม่ยังบังคับ hash ก่อนเปิด หน้าอ่านครบ 41 หน้า; source V2 เดิม/hi-light SHA และเล่ม 155 หน้าเดิม unchanged.
- **PASS** GitHub Actions head `21bbde2f35744b661650099044974f6dad153f32` ของ PR #135 รอบแก้ไขสุดท้าย **13/13 workflows success**:
  1. [R26-E full PDF + viewer QA](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487260)
  2. [R11D existing review preview](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487051)
  3. [R12 review share and LINE](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487331)
  4. [R24-A/B source catalog](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487433)
  5. [R24-F Drive reader](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487360)
  6. [R24-H Design V2 155 PDF](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487218)
  7. [R24-D comparison](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487039)
  8. [R24-C private links](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487097)
  9. [R24-I notes](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487359)
  10. [R13 latest program UI](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487378)
  11. [R13 program candidate/mobile](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487194)
  12. [R14 mobile field readiness](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487089)
  13. [Validate draft data](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42863487121).
- **FAILURES FIXED BEFORE MERGE**: การสลับลิงก์เว็บรอบแรกทำให้ R11D.1 ต้องการลิงก์ Drive V2 original ไม่พบ → เพิ่มข้อความ+href เดิมกลับใน `review.html` และรัน CI ซ้ำผ่าน. ไม่ตัด test มาตรฐานเดิมทิ้ง.

## ขอบเขตที่ยังต้องตรวจรับ
- R26D ออกแบบผังใหม่ 5 หน้า **10, 15, 16, 19, 21** เท่านั้น; หน้า 8/9/12/14 และ 1–6 ยังไม่ถูกวาดผังใหม่ทั้งหมด.
- คอร์ตเปตอง 12–13 พ.ย. มีหมายเลขซ้ำ 12 กลุ่ม; ชักเย่อ 12 ปีหญิงมี 7 ทีมตามต้นฉบับ; ยังไม่แก้ด้วยการคาดเดา.
- Safari/Chrome/LINE ของกรรมการและการพิมพ์จริง **NOT FIELD TESTED**. GitHub Actions PASS ไม่ใช่หลักฐานว่าผู้ใช้ทุกคนโหลด PDF ใหม่สำเร็จใน production.
- V2 ใหม่นี้ยังเป็น **ฉบับตรวจร่าง** ไม่ใช่ประกาศผล/ข้อมูลวันเวลา/สนามที่รับรองทั้งหมด.

## URL หลัง Merge
- https://infobwd.github.io/nongkum-sports-hub/pdf-v2-design-viewer.html?page=1
- https://infobwd.github.io/nongkum-sports-hub/pdf-v2-design-viewer.html?page=15
- https://infobwd.github.io/nongkum-sports-hub/booklets.html
- https://infobwd.github.io/nongkum-sports-hub/review.html
- https://infobwd.github.io/nongkum-sports-hub/pdf-viewer.html?page=15 — **source original for highlight**, not redesigned R26D.

**สถานะก่อน merge: PLANNED / DEVELOPED / CI PASS / MERGE + PAGES DEPLOY PENDING / FIELD ACCEPTANCE PENDING.**
