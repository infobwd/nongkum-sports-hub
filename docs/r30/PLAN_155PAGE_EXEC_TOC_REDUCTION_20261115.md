# R30 — ปรับสูจิบัตร Design V2 155 หน้า ให้มีบทสรุปผู้บริหาร สารบัญและนำทางแบบ S74

วันที่ 15 พฤศจิกายน 2569 — **DRAFT** / ต้องตรวจรับก่อน Merge เผยแพร่

## ต้นฉบับที่ตรวจจริง
1. [สูจิบัตร R25D3 155 หน้า (10 พ.ย. 2569)](https://drive.google.com/file/d/16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS/view) — ตัวอักษรและเนื้อหา vector, มี bookmarks ประมาณ 175 หัวข้อ แต่ **ไม่มี internal link ในเนื้อหาหน้า PDF**, รายละเอียดซ้ำกับเอกสารหลักฐานเดิม.
2. [รายงานผู้บริหาร S74 23 หน้า (15 พ.ย. 2569)](https://drive.google.com/file/d/1WUCQzsH3uySADdY_YYfN-l7do3CLFyv_/view) — ตัวอย่างบทสรุปผู้บริหาร/การ์ดตัวเลข, สารบัญ 2 คอลัมน์, หัว/ท้าย, PDF bookmarks และลิงก์กลับสารบัญ, ใช้หลายฟอนต์. **ไม่บังคับ Sarabun**.
3. GitHub [main](https://github.com/infobwd/nongkum-sports-hub) และ PR ร่างที่ยังไม่ Merge: [#136 R27C](https://github.com/infobwd/nongkum-sports-hub/pull/136), [#137 R28](https://github.com/infobwd/nongkum-sports-hub/pull/137), [#138 R29](https://github.com/infobwd/nongkum-sports-hub/pull/138).

## ข้อเสนอและเหตุผลที่ตัด
- เก็บ **ภาพปกจริงหน้า 1**; เพิ่ม **หน้า 2 บทสรุปผู้บริหาร**, **หน้า 3 สารบัญคลิก**, และ **หน้าท้ายสรุปเรื่องรอตรวจ** จาก HTML/CSS + WeasyPrint.
- เก็บ **กติกา R25D3 หน้า 41–42**, **ผังสายครบ 44 กลุ่มหน้า 44–87**, **ตารางแข่งขันทั้งหมดหน้า 88–110**, **ตารางกรีฑาหน้า 111–131**; ทั้งหมดเป็น original vector pages; ไม่แก้คู่ ผล เวลา หรือชื่อโดยคาดเดา.
- ย้ายออกจาก **เล่มอ่านหลัก** (ยังเก็บใน PDF 155 หน้าเดิมเป็นหลักฐาน): พิธีการหน้า 3–7, ประกาศหน้า 8–18, รายชื่อคณะกรรมการฉบับยาวหน้า 19–40, หน้า 43 ซึ่งเป็นส่วนต่อเนื่องข้อความเดิม, แบบฟอร์มเปล่า 132–136, ข้อสังเกต QA แบบรายละเอียด 137–138 (ย่อประเด็นสำหรับผู้จัดในหน้าท้าย), ภาคผนวกคัดลอกข้อความจากต้นฉบับ 139–155, หน้าบทนำเก่า 2 ถูกแทน.
- ขนาดที่คาด **94 หน้า** = 1 ปก + 2 บทสรุป/สารบัญ + 2 กติกา + 44 ผัง + 23 ตารางกีฬา + 21 กรีฑา + 1 หมายเหตุท้าย; ลดจาก 155 หน้า 61 หน้า โดย **ไม่ลบหลักฐานเดิม**.
- อ้างอิงโครง 155 หน้า R25D3 ไม่อ้างว่าเป็นการรวบรวมแก้ใน R27/R28 ซึ่งเกิดภายหลัง; ให้แสดง DRAFT พร้อมข้อสังเกตว่ารอ reconcile การแก้ไขจาก PR ที่ยังเปิด. ห้ามนำเป็นประกาศ/ผลจริง.

## การผลิตและ QA
- ต้นฉบับ HTML/CSS เก็บได้ + Python assembler; ใช้ WeasyPrint 68.0 กับหน้าใหม่, PyMuPDF นำหน้า vector จากไฟล์จริงเข้าชุด โดยรักษาเนื้อหาเดิม; **ตัวเนื้อหาดั้งเดิมยังอยู่ใน PDF ไม่ใช่แปลงเป็น HTML ทุกตัวอักษร** — ระบุขอบเขตอย่างซื่อสัตย์.
- สร้างสารบัญพร้อมเลขหน้าจริง, Bookmarks จากผัง/กีฬาและหัวข้อ, Explicit GoTo ไปที่หน้าใหม่, ปุ่มกลับสารบัญทุกหน้าที่เหมาะสม; ไม่ใส่ external URL ในลิงก์ภายใน.
- เปลี่ยน **footer old page x/155** โดยวาง footer ใหม่ในพื้นที่ขอบล่างที่ตรวจแล้ว ป้องกันเลขหน้าขัดแย้ง; ห้ามทับเนื้อหาตาราง.
- ตรวจภาพทุกหน้า **150 DPI** และสุ่มตรวจจุดเสี่ยงที่ **200 DPI**, ความกว้าง A4, จำนวนหน้า, fonts embedded (Noto Sans Thai / Waree ตามหน้าที่ ไม่ใช้ Sarabun เป็นค่าเดียว), link destinations, bookmarks, crop overflow, text extraction, coverage ของหน้า 41–42 +44–131, SHA-256.
- แยกไฟล์ PDF **R30 DRAFT** ออกจาก R25D3, R27C, R28, R29; ไม่สลับเว็บ SHA-pinned PDF reader, ไม่ Merge/ไม่เผยแพร่จนตรวจรับจริง.

## ผลงาน
PDF compact, HTML/CSS หน้าใหม่, script สร้าง, source-map, QA report/preview, Drive link และ Draft PR.


## ผลส่งมอบและตรวจคุณภาพ 15 พ.ย. 2569

สถานะ: **SOURCE INSPECTED → PLAN RECORDED → GENERATED → PDF QA PASS → DRIVE UPLOADED → DRAFT PR (NOT MERGED / NOT PUBLIC)**

- [R30 สูจิบัตรฉบับย่อ 94 หน้า](https://drive.google.com/file/d/1Ep1s4ULP78DcubqwtQb0dtcBzjSLNdJU/view) — ขนาด 3,806,477 ไบต์, SHA-256 7d573ca18251a4f5fd8da79507eb5ae36873dc734393e319310740102e160f87
- [R30 ชุด HTML/CSS/Builder/QA ZIP](https://drive.google.com/file/d/1KrST6uVTE08ogLr5jz8G6J2LYDSMPJ3G/view) และ [โฟลเดอร์ Google Drive](https://drive.google.com/drive/folders/1jD1nLCwLeW1j6JQCE6finHxG7GC8b2gl).
- ตรวจเนื้อหาตาราง/กติกาที่คงจากต้นฉบับ **90/90 หน้า** ตรงกันในส่วน body ทั้งข้อความตามต้นฉบับ; ปกเดิมอีก 1 หน้า
- เพิ่มบทสรุปผู้บริหาร (หน้า 2) สารบัญและการนำทาง (หน้า 3), ข้อสังเกตและที่มา (หน้า 94); ตัดจากเล่มหลัก 64 หน้าต้นฉบับซ้ำ/เอกสารเสริม และเพิ่ม 3 หน้าใหม่ จึงลดสุทธิ 61 หน้า
- ลิงก์ Explicit GoTo **116 จุด**, PDF Bookmarks **24 หัวข้อ**, external archive link **1 จุด**, ตรวจเลขหน้า/เป้าหมายทุกลิงก์, ฝังฟอนต์ไทย, ไม่มีปัญหาอัตโนมัติ
- เรนเดอร์ **94/94 หน้า ที่ 150 DPI** และสุ่มจุดสำคัญ 10 หน้าที่ 200 DPI (เก็บ QA source map เพื่อ reproducible)
- [QA รายงาน](QA_REPORT.md), [JSON ตรวจ](QA_REPORT.json), [ผังที่มาของหน้า](source_map.json), [หน้าบทสรุป HTML](executive-summary.html), [สารบัญ HTML](contents.html), [หน้าเรื่องรอตรวจ HTML](review-notes.html), [สคริปต์](../../scripts/r30/build_compact.py) และ [CSS](../../scripts/r30/layout.css).
- Google Drive metadata readback หลังอัปโหลด: PDF และ ZIP เก็บในโฟลเดอร์ R30, ขนาด/MIME ตรง; **สิทธิ์ผู้อ่านนอกองค์กรยังไม่ตรวจ (access_not_verified)**.
- **ยังต้องตรวจรับ:** crosswalk คู่แข่งขันกับข้อมูลล่าสุด R27/R28, print A4 เครื่องจริง, Safari/Chrome/LINE, และการอนุญาต Merge / เผยแพร่. ข้อมูล R25D3 ไม่ใช่ชุดรับรองล่าสุด; PR นี้ไม่แก้โปรแกรม/JSON/Sheets/main/เว็บไซต์.
