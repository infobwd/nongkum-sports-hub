# R24-F — เปิดอ่านสูจิบัตร 155 หน้าจากหน้าเว็บโดยใช้สิทธิ์ Google Drive

วันที่: 8 พฤศจิกายน 2569
สถานะเริ่มต้น: PLAN RECORDED / IMPLEMENTATION PENDING / NOT YET MERGED OR DEPLOYED

## คำสั่งผู้จัด
ผู้จัดให้เปิด PDF สูจิบัตรรวม 155 หน้าได้จากหน้าเว็บโดยตรง ไม่ต้องเลือก PDF จากอุปกรณ์ก่อนอ่าน

## ตรวจฐานงาน (main และ PR)
- main `58184fe14b92b62babc151fd0cd52176b1a59b88` หลัง R24-D PR #123 Merge; R24-A/B/C/D Merge แล้ว
- R24-E1 PR #124 ยัง Draft; แก้ `js/booklet-private-viewer.js`, `js/pdf-viewer.js` และ workflow QA. **ห้ามแก้ไฟล์สองตัวนี้ใน R24-F**
- R11C PR #116 ผัง และ #118 ปก ยัง Draft; ไม่แก้ PDF ต้นฉบับ Google Drive
- PDF ตรวจร่างรุ่น G2/I10 155 หน้า: Drive ID `1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF`, ขนาด 4,067,611 bytes ตาม metadata ณ 8 พ.ย.; source SHA256 ตาม `data/booklet-versions.json`
- Google Drive source_visibility_status = `access_not_verified`, ไม่มีหลักฐานเปิด `anyone` และไม่มีหลักฐานสิทธิ์ภาพนักเรียนครบทุกกรณี

## ความหมายของคำสั่งและข้อจำกัดด้านสิทธิ์
1. เปิดหน้า reader ของเว็บไซต์ที่มี Google Drive Preview ฝังอยู่และปุ่ม “เปิดใน Google Drive” สำหรับ Safari/LINE; **ยังคงใช้ Google Drive ACL ที่มีอยู่**. บุคคลไม่มีสิทธิ์ต้องไม่ถูกเปิดสิทธิ์เพิ่มเติมโดยโค้ดนี้
2. ไม่อัปโหลด PDF/JSON private ลง GitHub Pages, ไม่แปลงเป็นไฟล์ public, ไม่แก้ Google Drive sharing, ไม่ใช้ proxy เสิร์ฟไฟล์ข้ามสิทธิ์
3. ลิงก์ Google Drive ID ที่เผยในเว็บ **ไม่ใช่สิทธิ์เข้าถึงไฟล์**; การเข้าถึงจริงถูกกำหนดโดย Google Drive. เมื่อเปิดไม่ได้ให้แสดงคำแนะนำให้ใช้บัญชีที่ได้รับสิทธิ์ และทางเลือก private local-file reader เดิม
4. คงสถานะ `draft_review_not_approved` และ `audit_155.publication_approved=false`; ไม่เปลี่ยนเป็นสูจิบัตรทางการหรือแสดงว่าผล/กรรมการได้รับรอง
5. ถ้าผู้จัดประสงค์ให้ผู้ที่ไม่ได้รับสิทธิ์ทุกคนเปิด PDF ได้ จะต้องตรวจ/รับรองสิทธิ์ภาพนักเรียนและเนื้อหาก่อนปรับ Drive sharing แยกต่างหาก

## ขอบเขตพัฒนา
- `booklets.html`: ปรับคำอธิบายหน้าเลือกเล่ม
- `js/booklets.js`: การ์ดเล่ม 155 หน้าเพิ่มปุ่ม “เปิดอ่าน PDF 155 หน้า” เส้นทางในเว็บและเก็บปุ่ม local backup
- `data/booklet-versions.json`: ระบุการเปิดผ่าน Drive แบบอิงสิทธิ์ โดยไม่แตะ SHA/revision/486 anchors
- `booklet-drive-viewer.html`: หน้า iframe Google Drive preview และลิงก์เปิด Google Drive แยก รองรับ iOS/LINE fallback, ป้ายฉบับตรวจร่าง
- `scripts/booklets/test-r24f-permissioned-drive-reader.mjs`: static regression / source contract; `.github/workflows/r24f-booklet-drive-reader.yml`: CI
- ไม่แตะ `js/pdf-viewer.js`, `js/booklet-private-viewer.js`, `index.html`, ผล/คะแนน/อันดับ, map 486, PDF หรือ Apps Script

## Acceptance และ rollback
- A/B legacy PDF 41/64 หน้า route เดิม, active 236, committee 250, SHA 155 และ 486 anchors ไม่เปลี่ยน
- 155 card มี reader route เปิดบน GitHub Pages, Preview แสดงเฉพาะบัญชีที่ Google Drive อนุญาต; ปุ่มเปิด Drive ในแท็บใหม่
- หน้าไม่แสดงว่า approved/official; ไม่มีการแก้ sharing โดยอัตโนมัติ
- ผ่าน syntax/contract tests; เปิด Safari iPhone, LINE WebView, Android Chrome จริงยังต้องตรวจรับภายหลัง
- หาก frame ใช้ไม่ได้ให้กดเปิด Drive โดยตรง; rollback ได้โดยเอาปุ่ม/route R24-F ออกโดยไม่แก้ PDF/เอกสารเก่า

## สถานะที่ต้องแยก
- PLAN RECORDED → DEVELOPED → CI PASS → MERGED → DEPLOYED → DEVICE ACCEPTED
- การ Merge/Deploy ไม่เท่ากับการอนุมัติเผยแพร่ PDF เป็นทางการ (R11E)
