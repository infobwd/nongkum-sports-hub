# R25-E — เผยแพร่สูจิบัตร Design V2 ตารางจาก V2 บน GitHub Pages (10 พ.ย. 2569)

**สถานะเริ่มต้น: PLAN-FIRST / ไม่ถือว่า LIVE จนกว่าจะตรวจหลัง Merge**
**คำสั่งผู้จัด:** “merge และแทนที่ในเว็บไซต์ได้เลย” — อนุญาต PR #132 merge และให้เล่ม Design V2 R25D3 155 หน้าเป็นเล่มรวมหลักในหน้าเว็บ แยกการ **เผยแพร่ให้อ่านฉบับตรวจร่าง** ออกจาก **การรับรองผล/กำหนดการอย่างเป็นทางการ**.

## หลักฐานก่อนทำ
- PR #132 R25D plan + QA **MERGED** commit `0d68c61daa04068bde6e715a7dd7d14aeba716ce`.
- PDF ใหม่ R25D3 [Google Drive](https://drive.google.com/file/d/16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS/view), **155 หน้า A4**, 4,229,122 bytes, SHA-256 `9da71db34f092a4a65a1ee2ea05984b343fc03097988854b1debe5251e2fae1a`; คงเล่มเดิมไว้เสมอ.
- บน `main` ตัวอ่าน `booklet-drive-viewer.html` + `js/booklet-unified-viewer.js` **เปิด same-origin** `assets/souvenir-2569-v42i10-g2-155pages.pdf` ที่ SHA `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d`, ตรวจ SHA ก่อนเปิด PDF และมี private coordinate map SHA ที่ผูกกับ PDF รุ่นเก่า.
- `js/booklets.js` ตรวจ catalog แบบเข้ม: `data/booklet-versions.json` ที่ `integrated-v42i10-g2` ต้องเป็น `source_path` รุ่นเดิม, `page_count=155`, `audit_155.anchor_count=486`, `approved_at=null`.
- V2 41 หน้า `assets/souvenir-2569-v2.pdf` + R23/R24-K ไฮไลท์ 236 รายการยังคงเป็นแหล่งต้นฉบับ; V3 64 หน้า/แผนที่กรรมการ 250 รายการยังต้องทำงานเดิม. ห้ามแก้ไขตำแหน่งอ้างอิงเดิมหรือสร้างการไฮไลท์ปลอมใน R25D3.

## กลยุทธ์เผยแพร่
1. **ทางเลือก A ที่ต้องการ:** ฝาก PDF byte-identical R25D3 เป็นไฟล์ใหม่ใน `assets/` (ไม่เขียนทับ PDF baseline) ด้วย GitHub Git blob/base64; อัปเดต `js/booklet-unified-viewer.js` พาธและ SHA, `data/booklet-versions.json` พาธ/revision/SHA/status, `js/booklets.js` validator, `booklet-drive-viewer.html` ลิงก์ดาวน์โหลด; คง GitHub Pages same-origin pdf.js. ตรวจขนาด/รหัส/155 หน้า. **ต้องสร้างพิกัดใหม่ก่อนเปิด highlight map ส่วนตัว 486 จุด** หรือปิดไฮไลท์นั้นอย่างชัดเจนสำหรับ PDF ใหม่; ไม่ใช้ hash/pixel positions เดิม.
2. **ทางเลือก B หากไม่สามารถส่ง binary ไป GitHub ได้:** แสดง R25D3 Google Drive เป็นทางเลือกหลักในเว็บ โดยใส่ Drive iframe/ลิงก์และข้อความเตือนเรื่องสิทธิ์ พร้อมเส้นทางกลับไปอ่าน baseline same-origin ที่ระบุว่าเป็นฉบับเดิมเท่านั้น. การแทนที่แบบนี้ไม่ถือว่า “same-origin reader” และต้องไม่กล่าวว่าทดสอบ Safari/LINE หรือผู้ไม่ลงชื่อ Google แล้ว. **หากไม่ทราบสิทธิ์การแชร์สาธารณะ**, ห้ามแสดงว่าผู้ใช้ทุกคนเข้าถึงได้แน่นอน.
3. หาก A/B ไม่ผ่านเงื่อนไขการใช้งานจริง ให้คง PDF เดิมและลิงก์ใหม่ชัดเจนเป็นเพียง preview ไม่สลับผู้อ่านเดิมที่ใช้ทำงานอยู่.

## QA/gates
- ตรวจ GitHub main/PR ล่าสุดก่อนแก้, สร้าง PR แยกไฟล์เว็บ, ตรวจ GitHub Actions; อย่า merge เมื่อบิลด์เสีย.
- PDF SHA ใหม่ `9da71...`, ขนาด 4,229,122, 155 หน้า, 175 bookmarks, ตารางเปลี่ยน 44 หน้า 186 คู่+50 กรีฑา 289 ลู่; ภาคอื่น 111 หน้าไม่แก้เทียบ source.
- ห้ามเปลี่ยน V2/V3, program JSON 236, public results approved-only, กรรมการ, Google Sheets/Apps Script.
- UI ใช้ภาษาไทยทั่วไป: “สูจิบัตรฉบับล่าสุด (ตรวจร่าง)”; ชัดเจนว่าไม่ใช่ประกาศผลหรือรับรองวันเวลา; มีลิงก์ฉบับก่อนและเส้นทางย้อนกลับ.
- ลิงก์จากตารางและข้อสังเกตที่เคยใช้ V2 41 หน้า ยังเปิด V2 พร้อมไฮไลท์เดิม; 486 anchors ของฉบับรวมที่ขยับหน้าไม่ใช้พิกัดเก่า.
- Test automatable JS syntax, catalog, links, SHA gating; ตรวจ deploy URL/มือถือจริงแยกจาก merge. Rollback ผ่าน revert PR หากลิงก์หรือสิทธิ์ผิด.

## สถานะ
- **Plan recorded**, website changes/merge/deploy/field acceptance pending.
