# R25-E — ผลตรวจการแทนสูจิบัตร Design V2 ตารางล่าสุดบนเว็บไซต์

วันที่: 10 พฤศจิกายน 2569 Asia/Bangkok  
**สถานะ ณ จัดทำ:** CODE + PDF PARTS COMMITTED ON PR #133 / AUTOMATED CI 10 WORKFLOWS PASS / WAITING MERGE & LIVE CHECK / DEVICE ACCEPTANCE PENDING

## คำสั่งและหลักฐาน
- ผู้จัดสั่ง **Merge PR #132 และแทนที่ในเว็บไซต์**.
- PR #132 R25D full PDF plan/QA MERGED: `0d68c61daa04068bde6e715a7dd7d14aeba716ce`.
- PDF R25D3 ใน Drive: [Design V2 155 หน้า](https://drive.google.com/file/d/16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS/view), 4,229,122 bytes, SHA-256 `9da71db34f092a4a65a1ee2ea05984b343fc03097988854b1debe5251e2fae1a`, A4 155 หน้า, 175 bookmarks. เป็น **review only**.
- แผนก่อนพัฒนา: [R25-E release plan](R25E_PUBLIC_155PAGE_DESIGN_V2_SITE_RELEASE_PLAN_20261110.md).

## งานที่เปลี่ยนใน PR #133
- ไม่เปลี่ยน raw `data/program-from-pdf-2569-20261104-draft.json`, `js/program-corrections.js`, V2 41 หน้า หรือ V3 64 หน้า; ไม่เปลี่ยนผล/อันดับ/Sheets/Apps Script.
- ขึ้นข้อมูล PDF ใหม่ **byte-identical** ผ่าน blobs GitHub Git API เป็นไฟล์ `assets/r25d3-155pages/part-01.b64` ถึง `part-07.b64`. 6 ส่วนแรก base64 819,200 ตัวอักษรต่อส่วน, ส่วนสุดท้าย 723,632. Verified local blob SHA-1 of all seven parts matches the API's returned blob SHAs; total decoded PDF **4,229,122 bytes** with exact SHA-256 above.
- `js/booklet-unified-viewer.js` โหลดทั้ง 7 ส่วนจาก *same-origin GitHub Pages*, decode ด้วย `atob`, ตรวจขนาดและ `crypto.subtle.digest("SHA-256", bytes)` ก่อนส่งเข้า PDF.js; ลดความเสี่ยงอ่านผิดรุ่นและ CORS จาก Google Drive. ปุ่มเลือกหน้า/ซูม/ปัดยังใช้ตัวอ่านเดิม.
- `booklet-drive-viewer.html` ตั้งชื่อ Design V2 ฉบับล่าสุด, ลิงก์ PDF Google Drive สำรองและ PDF **เล่มเดิม** แบบแยกชัด.
- `data/booklet-versions.json`, `js/booklets.js`, `booklets.html` ทำให้การ์ดเล่มรวม 155 หน้าเปิดรุ่น R25D3 และแสดงว่าเป็นฉบับตรวจร่าง `approved_at:null`.
- **R24 486 anchors**: กรรมการ 250 + โปรแกรม 236 ยังคงเอกลักษณ์ ID เดิม แต่ไม่สามารถนำพิกัด old source PDF มาใช้บนเล่มที่ re-typeset 44 หน้าได้. จึงซ่อนแผนที่ private ในตัวอ่านใหม่และแสดงข้อความป้ายว่าเล่มล่าสุดยังไม่รองรับไฮไลต์ตำแหน่ง; มีลิงก์กลับไป V2/V3 ที่มีแผนที่เดิม. `js/booklet-comparison-model.js` หยุดสรุปพิกัดเล่มใหม่ว่าตรวจแล้ว (0 verified / 486 pending).
- `booklet-private-viewer.html` ยังเป็นตัวตรวจด้วยไฟล์ **เล่มก่อนปรับ** และ SHA/map เก่า; UI catalog แยกป้าย ไม่สื่อว่าเปิด R25D3 + map เก่าได้.
- เพิ่ม `scripts/booklets/r25e-pdf-bundle.mjs` ถอดส่วนไฟล์และยืนยัน hash แบบ offline CI และปรับ test R24 ให้รักษาข้อมูลเดิม พร้อมยืนยัน PDF ใหม่เป็น active.
- เก็บไฟล์เก่า `assets/souvenir-2569-v42i10-g2-155pages.pdf` ไว้ rollback ไม่เขียนทับ.

## ผลตรวจ CI บน head ก่อนบันทึกเอกสารนี้
GitHub Actions / PR #133 head `b3242e3b8146a41e080a617a591c7b46275d396b`: **10/10 workflows complete success**
1. R24-H Public 155-page PDF and Unified Reader QA — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368480)
2. R24-G Unified 155-page Reader — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368446)
3. R24-F Permissioned Reader — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368540)
4. R24-A/B Booklet Catalog — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368576)
5. R24-C Private Viewer — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368542)
6. R24-D Comparison — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368500)
7. R24-I Notes — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368257)
8. R24-K Notes Highlight — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368457)
9. R14 Field Ready — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368331)
10. Validate draft data — [run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42841368699)

**หมายเหตุ:** CI PASS ยืนยัน source contract/logic ของ mock/byte identity เท่านั้น ไม่ใช่ผลตรวจการโหลดตัวอ่านจริงใน Safari/Chrome/LINE หรือยืนยัน GitHub Pages CDN หลัง deploy.

## เกณฑ์สถานะ
- **Planned:** YES
- **Developed + source bundled:** YES
- **Automated CI:** PASS 10/10
- **Merged:** รอ PR #133
- **Live Published:** รอหลักฐาน GitHub Pages หลัง Merge
- **Organizer/Field accepted:** NOT YET; ต้องให้ผู้จัดตรวจคอร์ตเปตอง 12–13 พ.ย. ซ้ำ 12 กลุ่ม, การวางรายการ/พิมพ์ A4, Safari/LINE/Android, จุดไฮไลต์ 486 รายการใหม่ ก่อนฉบับรับรองทางการ.

## URL ตรวจหลัง Merge
- https://infobwd.github.io/nongkum-sports-hub/booklets.html
- https://infobwd.github.io/nongkum-sports-hub/booklet-drive-viewer.html?page=88
- https://infobwd.github.io/nongkum-sports-hub/booklet-drive-viewer.html?page=111
- https://infobwd.github.io/nongkum-sports-hub/pdf-viewer.html?page=7 (V2 41 หน้าเดิม)
- https://infobwd.github.io/nongkum-sports-hub/committee-pdf-viewer.html?page=1 (V3 เดิม)
