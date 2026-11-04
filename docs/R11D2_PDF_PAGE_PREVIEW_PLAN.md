# R11D.2 — เปิดสูจิบัตร PDF ตรงหน้ารายการ + Preview มือถือและคอมพิวเตอร์

วันที่ 4 พ.ย. 2569 · สถานะ: พัฒนาแยกสาขา / รอตรวจ GitHub Actions และเครื่องจริง

## ขอบเขตตามคำสั่งผู้จัด
1. **PDF V2 ต้นฉบับเดียวกัน:** นำไฟล์จาก Google Drive ลง `assets/souvenir-2569-v2.pdf` สำหรับดูในเว็บแบบ same-origin; ต้นฉบับ Google Drive ไม่ถูกแก้ และเก็บปุ่มเปิดไฟล์ Drive สำรอง
2. **ตรวจความตรงกัน:** PDF 41 หน้า; SHA-256 `1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf`; Git blob SHA `8282b5736100f53d8cfc0a6861f121c89f5feb63`; ตรงกับ SHA ใน candidate JSON R11A
3. **ปุ่มที่การ์ด:** `ดูต้นฉบับ หน้า X` คำนวณจากเลขหน้า `source_pdf.page`, **ไม่** เดาจากเลขคู่/ลำดับรายการ; เปิดเฉพาะหน้าที่กด ไม่เตรียม PDF 237 ภาพล่วงหน้า
4. **คอมพิวเตอร์:** ตัวอ่าน PDF ทางด้านขวาโดยคงรายการแข่งขันให้ตรวจเทียบทางซ้าย
5. **มือถือ:** เปิดตัวอ่านแบบเต็มหน้าจอ มีปุ่มกลับไปยังคู่เดิม, หน้าก่อน/ถัดไป, ขยาย/ย่อ, ระบุเลขหน้า; คงตัวกรองและตำแหน่ง scroll
6. **เทคโนโลยี:** ใช้ PDF.js display/worker build หมายเลขเวอร์ชันเดียวกันจาก CDN ที่ pin ไว้, โหลดโมดูลเมื่อเปิดตัวอ่านเท่านั้น; PDF ส่งจาก GitHub Pages same-origin; fallback เปิด PDF ตรงได้เมื่อ CDN ถูกบล็อก/ไม่รองรับ
7. **Safe Area iOS:** ให้ panel/ปุ่มกลับไม่ทับ status bar หรือ home indicator และป้องกันเนื้อหาหน้าเว็บเลื่อนใต้พื้นที่ status เมื่อเปิด viewer
8. **ไม่แก้** `data/draft-schedule.json`, `data/program-from-pdf-2569-20261104-draft.json`, `data/public-results.json`, `m/`, Sheets, R10, Docs R11C, โปรแกรมหลักหรือผลแข่งขัน

## ข้อจำกัด / สิ่งที่ยังต้องทดสอบด้วยมือถือจริง
- **เปิดได้ถึงระดับหน้า PDF** ไม่ได้ scroll ไปบรรทัดตรงคู่โดยอัตโนมัติ เพราะ JSON ไม่มีพิกัดบนหน้า PDF
- ต้องตรวจ iPhone Safari/LINE WebView/Android กับ Chrome/Edge ในเครื่องจริง รวมทั้งการดาวน์โหลด PDF, accessibility, split-pane และความเร็วเครือข่ายช้า
- เนื้อ PDF ที่เผยแพร่เป็นเอกสารร่าง แม้อยู่ GitHub Pages แล้วก็ **ไม่ได้เป็นข้อมูลรับรองทางการ**; ก่อนเผยแพร่ยืนยันว่าผู้จัดต้องการให้ PDF ร่างเปิดอ่านสาธารณะ (คำสั่งนี้ให้ดำเนินการตามแผน R11D.2)
- หากมี PDF V3 ต้องทำ SHA/เลขหน้า reconciliation อีกครั้ง ห้ามแทนไฟล์เดิมเงียบ ๆ

## Acceptance
- 237 fixtures มีหน้าต้นฉบับ `source_pdf.page` ในช่วง 1–41 และลิงก์การ์ดตรงรายการ
- หน้าตัวอ่านโหลด PDF เมื่อผู้ใช้กดเท่านั้น และเรนเดอร์ทีละหน้า; มี `#page=` fallback
- Desktop side-by-side, mobile dialog and close restoring position
- Test for source hash, page routing 7/11/17/18/23/35, safe URL selection, no network write, R11A/R11D/D1 and LINE regressions
- GitHub Actions ผ่านก่อน Merge, manual device QA ยังต้องรายงานตามจริง
