# R30-E — สูจิบัตรฉบับสมบูรณ์: คืนพิธีการ สีโรงเรียน ประกาศและกรรมการ (ต่อจาก R30-D)

วันที่ 15 พฤศจิกายน 2569 — **PLAN RECORDED / DRAFT / REVIEW ONLY**. งานนี้อยู่ใน branch และ PR #139 เดิม ไม่เปิด PR ใหม่และไม่เปลี่ยน main/Pages/Sheets/JSON.

## หลักฐานและขอบเขตที่ตรวจ
- [R25D3 ฉบับเต็ม 155 หน้า (10 พ.ย.)](https://drive.google.com/file/d/16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS/view): พิธีเปิดหน้า 3–4, พิธีปิดหน้า 5, สีโรงเรียนหน้า 6, ปฏิญาณหน้า 7, ประกาศหน้า 8–18, รายชื่อกรรมการฉบับร่างหน้า 19–40.
- [R30-D ฉบับย่อ 94 หน้า](https://drive.google.com/file/d/12v17jaDL1t9SyakT39beUd0ES8b1Gv7b/view): ปก 1, executive summary 2, TOC 3, กติกา/ผัง/ตารางหน้า 4–93, review notes 94; คงตารางเปตองที่ซ่อมแล้วโดยไม่ดัดแปลง.
- PR ที่ต้องไม่ตัดสินแทนผู้จัด: [#136 R27](https://github.com/infobwd/nongkum-sports-hub/pull/136), [#137 R28](https://github.com/infobwd/nongkum-sports-hub/pull/137), [#138 R29](https://github.com/infobwd/nongkum-sports-hub/pull/138), [#139 R30](https://github.com/infobwd/nongkum-sports-hub/pull/139). **สีเฉดในต้นฉบับเป็นตัวอย่าง ไม่ใช่รหัสสีที่รับรอง** และประกาศ/กรรมการยังไม่ลงนามรับรอง.

## แนวทางสร้าง
1. แยก output เป็น R30-E ไม่เขียนทับ R30-D หรือ R25D3. เล่มสมบูรณ์ 132 หน้า = R30-D 94 หน้า + คืนหน้า 3–40 จาก R25D3 อีก 38 หน้า.
2. ลำดับ: ปก → บทสรุป → สารบัญและ QR → พิธี/สี/ปฏิญาณ (R25D3 หน้า 3–7) → ประกาศกลุ่ม (หน้า 8–18) → กติกา, ผัง 44 กลุ่ม, ตารางกีฬาและกรีฑา (R30-D หน้า 4–93) → บัญชีกรรมการฉบับร่าง (R25D3 หน้า 19–40) → ข้อสังเกตท้ายเล่ม (R30-D หน้า 94).
3. สร้างสารบัญหน้า 3 ใหม่ให้ตรงเลขหน้าจริง มีลิงก์ภายใน, PDF bookmarks, QR Code เว็บไซต์ https://infobwd.github.io/nongkum-sports-hub/, ปุ่มกลับสารบัญ; หน้าอื่นคงเป็นเวกเตอร์ต้นฉบับ. พิจารณาป้ายกำกับเลขหน้าใหม่ในพื้นที่ปลอดภัยโดยไม่ปิดคำสั่ง/ชื่อต้นฉบับ.
4. ไม่แก้ชื่อผู้ดำรงตำแหน่ง สังกัด เวลาพิธี รายการกีฬาหรือคะแนน ไม่เติมผลการแข่งขัน. คงชื่อสีตามต้นฉบับและระบุว่าตัวอย่างยังรอรับรอง. กรณีคำสั่ง/รายชื่อไม่ผ่านการตรวจ อย่าทำให้ดูเป็นประกาศลงนามแล้ว.
5. ตรวจ QA ครบ 132 หน้า A4, text preservation / page map (38 หน้า restored + 91 หน้า R30-D original+updated), pixel risk, TOC links/bookmarks, QR readability, สำรองต้นฉบับทุกฉบับ, และตรวจคู่เปตองหน้า 64 ใน R30-D ที่ย้ายเลขหน้าแล้ว.
6. หากทำ PDF ใหม่สำเร็จ ให้อัปโหลดในโฟลเดอร์ R30 เดิมใน Google Drive พร้อม source/QA, และอัปเดต PR #139; สถานะ **DEVELOPED + AUTOMATED QA** ไม่ใช่ **APPROVED**, **MERGED** หรือ **PUBLISHED**.

## เงื่อนไขก่อนเผยแพร่
- ตรวจชื่อกรรมการกับคำสั่งลงนามฉบับล่าสุด รวมเลขข้อประกาศซ้ำ, สังกัดและความครบถ้วนของรายชื่อ.
- reconcile ข้อขัดแย้งเลขคู่เปตอง Sheets/PDF และการแก้ไข R27/R28/R29 ตามผู้จัดรับรอง.
- ตรวจพิมพ์ A4 จริง, เปิดด้วย Safari/Chrome/LINE และการแชร์ Drive ต่อบุคคลภายนอก.
- ไม่ Merge PR #139 หรือสลับสูจิบัตรหน้า Pages โดยไม่มีอนุญาตชัดเจนและหลักฐานตรวจรับ.


## ผลดำเนินงานจริง — 15 พฤศจิกายน 2569

**SOURCE CHECKED → PLAN RECORDED → PDF BUILT → AUTOMATED QA PASS → DRIVE UPLOADED → SAME DRAFT PR #139. NOT MERGED / NOT PUBLISHED / NOT APPROVED.**

- [PDF R30-E ฉบับสมบูรณ์ 132 หน้า (ตรวจร่าง)](https://drive.google.com/file/d/1pxf1-Z08PjVbKg8zmuV1CSnutkjnWdh8/view); 4,225,357 bytes; SHA-256 `2d19f0dd99338fbb7a3cbb00535ffff54f8743ba1fa80b9560933b059eb56b4a`.
- [ZIP source + QA](https://drive.google.com/file/d/1aIVQGdxd-L1Ztr1h6vENJDQLQABOIXZS/view), [QA report JSON](https://drive.google.com/file/d/16LbuMZMGt-ShC48D4hlZZYJarl8GhnYf/view), [source map](https://drive.google.com/file/d/1Hux2STHCDpK8wbSLk8Zr34-zGFYhaUCE/view), เก็บใน [โฟลเดอร์ R30](https://drive.google.com/drive/folders/1jD1nLCwLeW1j6JQCE6finHxG7GC8b2gl).
- โค้ดสร้างซ้ำ `scripts/r30e/build_r30e.py` และ `scripts/r30e/qa_r30e.py` พร้อม `docs/r30e/{README.md,QA_REPORT.md,QA_REPORT.json,source_map.json}`.
- QA: A4 132/132 หน้า; body text 131/131 หน้าเทียบต้นฉบับได้เท่ากัน; 50 bookmark; 176 links; QR ในภาพถอดกลับเป็น URL ถูกต้อง; หน้าเปตองที่ซ่อมจาก R30-D ย้ายมาอยู่หน้า 80 และสนาม 2 ยังคงอยู่.
- ตรวจด้วยโปรแกรมเท่านั้น: ยังไม่ตรวจพิมพ์จริง มือถือจริง/LINE, สิทธิ์ผู้ใช้ภายนอก, คำสั่งแต่งตั้งกรรมการฉบับลงนาม หรือข้อมูลที่ขัดกันจาก R27/R28/Sheets.
- ไม่มีการแก้ main, GitHub Pages, public-results.json, Google Sheets, และไม่ได้ Merge PR #139.
