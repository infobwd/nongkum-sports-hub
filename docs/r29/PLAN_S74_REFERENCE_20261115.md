# R29 — ใช้รูปเล่มรายงานผู้บริหารศิลปหัตถกรรม 74 เป็นต้นแบบสูจิบัตรกีฬา

วันที่ 15 พฤศจิกายน 2569 • สถานะ DRAFT / วางแผนก่อนพัฒนา

## หลักฐานที่เปิดตรวจจริง

- [รายงานผู้บริหาร S74 23 หน้า (Google Drive)](https://drive.google.com/file/d/1WUCQzsH3uySADdY_YYfN-l7do3CLFyv_/view) — เปิดและตรวจ PDF ทั้ง metadata/หน้าปก/สารบัญ/หน้ารายงาน/ตาราง/ลิงก์จริง ไม่ใช่เพียงชื่อไฟล์
- สังเกตหน้าปกไล่เฉดน้ำเงินและแถบทอง, เนื้อหา A4 หน้าขาว พาดหัวเล็กแบบ bilingual, หัว/ท้ายหน้า, ตาราง grid สีฟ้าอ่อน, card สถิติ, margin สม่ำเสมอ, Bookmarks 23 หน้า, ลิงก์สารบัญและกลับสารบัญ, PDF link annotations
- ฟอนต์จริงมีหลายตระกูล: Thai, Thai-Bold, Waree, Waree-Bold, Noto Sans Thai/Looped (โดยบทบาท); จึง **ไม่บังคับ Sarabun** และไม่ยกกฎ WD Media มาเป็นข้อบังคับ
- ข้อมูลมิตรภาพเกมส์: [GitHub main](https://github.com/infobwd/nongkum-sports-hub) และ open PR [#136 R27-C](https://github.com/infobwd/nongkum-sports-hub/pull/136), [#137 R28 เปตองเข้าชิง](https://github.com/infobwd/nongkum-sports-hub/pull/137); R28 อยู่ในสถานะ Draft, ห้ามแปลงเป็นผลจริง

## Design contract

1. ปกแบบ editorial blue/navy + gold ไม่คัดลอกรูปทรัพย์สิน/โลโก้จากรายงานศิลปหัตถกรรม; ใช้กราฟิกที่สร้างเอง.
2. โครงภายใน A4 แนวตั้ง: สารบัญคลิกได้+เลขหน้าจริง, ภาพรวม, หน้าแยกตามกีฬา (ทีม/รุ่น/รอบ/วันเวลา/สถานที่/สถานะ), กรีฑา, ข้อสังเกตและที่มา; ตั้งเลขหน้าจริงหลัง render.
3. ตารางสนามอีกไฟล์ A4 แนวนอน; เน้นตัวอักษรใหญ่และช่องจดบันทึกผลที่ว่าง; ไม่เติมผู้ชนะหรือผลคาดเดา.
4. Fonts ตามหน้าที่: Noto Sans Thai (หัวเรื่อง/ตาราง), Waree (คำอธิบายหรือหัวข้อรองที่เหมาะ), Noto Looped Thai (ป้าย/กรอบ); ไม่ใช้ Sarabun แบบเหมารวม; ตรวจสิทธิ์การใช้/ฝังฟอนต์อย่างถูกต้อง.
5. HTML/CSS และ Python builder เป็น editable canonical source สำหรับงานออกแบบนี้; WeasyPrint 68.0. สารบัญใช้ anchor และ Explicit GoTo action, bookmarks PDF; ห้ามนำรูปฟอนต์จากรายงานต้นฉบับมาแจกจ่าย.
6. QA: render ทุกหน้าที่ 150–200 DPI, เก็บตรวจ font embeds/text/Thai mark shaping, page count, internal links/GoTo/bookmarks, clipping, ตารางข้ามหน้า, ไม่สร้างผลการแข่งขัน; บันทึกผลตรวจและ SHA-256.
7. ข้อมูล: ยึด main เมื่อรับรองแล้ว, แสดงการแก้ใน PR #136/#137 แยก Draft; ไม่สร้างวัน เวลา สนาม กรรมการ คะแนน/อันดับหรือทีมเข้ารอบที่ไม่ชัดเจน.

## แยกงานและความเสี่ยง

- PR R29 เปลี่ยนเฉพาะ `docs/r29/` และ `scripts/r29/` รวมถึง artifact PDF ใน Drive (ฉบับร่าง). **ไม่แก้** ข้อมูล JSON main, PDF viewers, และไฟล์เว็บที่ PR #137 อาจแตะ.
- R28 มีคำแจ้งบ้านวังด้งเข้าชิงเปตอง 10 ปีหญิง/12 ปีชาย แต่ยังต้องตรวจเลขคู่ 40/41 vs 42/43 และคู่แข่ง จึงเป็น **ข้อสังเกต ไม่ใช่ผลรับรอง**.
- ต้องตรวจรับผู้จัด, print test A4, Safari/Chrome/LINE ก่อน Merge หรือเผยแพร่ PDF เป็นฉบับทางการ.

## เกณฑ์ส่งมอบ

- PDF สูจิบัตร DRAFT และ PDF ตารางสนาม DRAFT, HTML/CSS, builder script, data extraction/crosswalk, QA report, PR link, Drive links.
- ไม่ Merge PR จนผู้จัดอนุญาต.


## อัปเดตการส่งมอบ R29 — 15 พฤศจิกายน 2569 (DRAFT)

**Source confirmed:** ศึกษา S74 PDF 23 หน้า (ฟอนต์ Thai/Waree/Noto Sans Thai; bookmarks 23 หน้า; internal links และหน้าปก/ตารางจริง). ไม่ใช้ Sarabun บังคับ ไม่แจก raw font.

**Generated files / Google Drive:** [R29 folder](https://drive.google.com/drive/folders/1NL-TF48_E6IJzgAosdmOwjPKdi412JVL)
- [สูจิบัตร A4 แนวตั้ง 23 หน้า](https://drive.google.com/file/d/1qm76pbd_VGYgLan2jWNp6pBZcmCrqeMt/view) SHA-256 efa4c59f945aec25d8cd00b0dcd8b9c08e4d5ce97b6620a2e95b3388ce8b1946
- [ตารางใช้งานสนาม A4 แนวนอน 33 หน้า](https://drive.google.com/file/d/1WH7axNndrJwsN2AS29OqhL_Dy6Vca7FY/view) SHA-256 0ef3a12e08352e1bdc92be807e0f384e2d3e61b74fe920c1247b2c62f0c5a257
- [ZIP ต้นฉบับ HTML/CSS/WeasyPrint 68.0 builder/QA/data](https://drive.google.com/file/d/1eXq72ZzlBCGaZ1STcst8GdoLgxXiGxIH/view) SHA-256 224f4eecc42a4d00358c05f1c6c71218ef7fc61613b2646b99f8e1677c4992c8.
- [รายงาน QA](QA_REPORT.md) / [JSON QA](qa-summary.json). สคริปต์อยู่ scripts/r29/ และ HTML snapshot docs/r29/ บน branch นี้.

**QA:** 186 คู่ + 50 กรีฑา / 289 ลู่ (รวม 236); render ทุกหน้า **56 หน้า × 150 DPI**, PDF Bookmarks **13/10**, Explicit GoTo **33/27**, ฟอนต์ฝังครบ, ไม่พบข้อความล้นขอบ. คงสถานะ DRAFT; ไม่สร้างคะแนน/ผลจริง.

**Source issues:** ข้อมูลกรีฑา **เลข 35 และ 48 ซ้ำอย่างละสองครั้ง** (ไม่มีเลข 49/50), ยังรอยืนยันเลขต้นฉบับ; PR #137 รายงานผู้เข้าชิงแต่ไม่กำหนดคู่แข่งหรือคะแนน, เลขคู่ใน Sheets กับ PDF ยังต่างกัน. ห้ามถือว่าเล่มนี้เป็นฉบับรับรอง.

**Remaining gates:** ตรวจอุปกรณ์พิมพ์ A4 จริง, iOS Safari/Android Chrome/LINE, สิทธิ์ Google Drive ภายนอก, ฟอนต์ไทยคัดลอกตัวต่อทุกหน้า, crosswalk กับ master JSON และ Google Sheets/คำสั่งที่ผู้จัดรับรอง. PR เป็น DRAFT; **ไม่ Merge ไม่สลับเว็บไซต์**.
