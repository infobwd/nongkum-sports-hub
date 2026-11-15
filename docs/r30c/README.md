# มิตรภาพเกมส์ 2569 — สูจิบัตร R30-C (DRAFT)

วันที่ 15 พฤศจิกายน 2569 / PR #139 / ยังไม่ Merge หรือเผยแพร่แทนฉบับรับรอง

## ข้อมูลต้นฉบับ
- PDF 155 หน้า R25D3: https://drive.google.com/file/d/16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS/view
- PDF 94 หน้า R30-B ก่อนแก้: https://drive.google.com/file/d/1e14vfNVAXlaV889TaQLm7pouOO9lWUl0/view
- R28 PR #137: https://github.com/infobwd/nongkum-sports-hub/pull/137
- R30 PR #139: https://github.com/infobwd/nongkum-sports-hub/pull/139

## สร้างซ้ำ
ติดตั้ง Python, PyMuPDF (fitz), WeasyPrint, qrcode, Pillow และ OpenCV สำหรับการตรวจ QR; มีฟอนต์ไทย Noto Sans Thai/ Waree ติดตั้งในระบบที่สร้าง ไม่ได้คัดลอกไฟล์ฟอนต์จากต้นฉบับ

1. เก็บไฟล์ PDF 155 หน้าเป็น `source-155.pdf` ในโฟลเดอร์เดียวกับ `build_r30c_base.py`
2. `python build_r30c_base.py source-155.pdf candidate-r30c.pdf`
3. `python finalize_r30c.py candidate-r30c.pdf Mittraphap_R30C_DRAFT.pdf`
4. `python qa_r30c.py Mittraphap_R30C_DRAFT.pdf candidate-r30c.pdf`

คำเตือน: ใน `build_r30c_base.py` มีการอ้างไฟล์ CSS/QR และสร้างไฟล์ชั่วคราวในโฟลเดอร์; ใช้ลิงก์ GitHub และ Drive ตรวจสถานะต้นฉบับก่อนทุกครั้ง

## ขอบเขตการแก้
- หน้า 5 ตัดส่วนคัดลอก V3 หน้า 17 ออกจากเล่มอ่านหลัก (ต้นฉบับ 155 หน้าเก็บไว้)
- หน้า 23/26 ย้ายเซปักตะกร้อคู่ 24 ไปยังรุ่น 12 ปีหญิง; หน้า 62 แก้รุ่น (คง 14.30 น.)
- หน้า 31/64 เปตอง 10 ปีชาย คู่ 2 รางขาม–ทุ่งมะสังฯ และคู่ 10 ชนะคู่ 3–ชนะคู่ 4
- หน้า 3 สัญลักษณ์กีฬาและ QR เว็บไซต์; หน้า 94 จุดสังเกต 12 รายการและลิงก์กดไปดู
- ข่าวบ้านวังด้งเข้าชิง 10 ปีหญิง/12 ปีชายยังอยู่; ไม่สร้างคะแนน/ผลชนะหรือคู่แข่งที่ไม่รับรอง

## การตรวจรับ
ผลตรวจด้วยโปรแกรมใน `QA_REPORT.md`/`QA_REPORT.json`; ยังต้องตรวจพิมพ์จริง, มือถือ และผู้จัดรับรองก่อน Merge/เผยแพร่
