# R30-B — สูจิบัตรฉบับอ่านง่าย

## แหล่งข้อมูล
- ไฟล์ R30 94 หน้า: https://drive.google.com/file/d/1Ep1s4ULP78DcubqwtQb0dtcBzjSLNdJU/view
- ต้นฉบับ R25D3 155 หน้า: https://drive.google.com/file/d/16v6cgEk8NyjVqo7TX_Sxd3QvT2NF7aAS/view
- แผนผู้เข้าชิง R28: https://github.com/infobwd/nongkum-sports-hub/pull/137

## สร้างซ้ำ
ใช้ Python, PyMuPDF และ WeasyPrint 68.0 โดยมีฟอนต์ Noto Sans Thai หรือ Waree ที่ติดตั้งในระบบสำหรับเรนเดอร์ เรียกใช้:

`python build_readable.py /path/to/ต้นฉบับ155หน้า.pdf /path/to/ผลลัพธ์.pdf`

จากนั้น:

`python qa_readable.py /path/to/ผลลัพธ์.pdf`

ไฟล์ `source-155.pdf` ไม่รวมใน ZIP เพื่อรักษาต้นฉบับแยกต่างหาก; ให้ดาวน์โหลดจาก Drive และตรวจ SHA ก่อนใช้.

## ขอบเขต
ไฟล์ HTML/CSS แก้ไขหน้า 2/3/94 รวมทั้งแถบหัวท้ายและป้ายการเข้าชิงได้; หน้าผังและตารางเดิมเป็น vector PDF ที่คงข้อมูลไม่ใช่ HTML editable ทุกช่อง; ไม่สร้างคะแนน/ผู้ชนะ และไม่ใช้เป็นประกาศผล.
