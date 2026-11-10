# R25 — สูจิบัตรมิตรภาพเกมส์ 2569: Design V2 ใหม่จากเล่ม 155 หน้า (Content-Locked Review)

วันที่วางแผน: 10 พฤศจิกายน 2569 (Asia/Bangkok)  
สถานะ: **ANALYSIS / PLAN ONLY / NOT BUILT / NOT MERGED / NOT PUBLISHED**

## 1. คำสั่งและขอบเขต
- สร้าง **PDF รุ่นออกแบบใหม่ (Design V2)** เป็นไฟล์แยก โดยคงโครงสร้างเรียงเนื้อหาจากเล่ม 155 หน้า; เป้าหมาย **ไม่เกิน 155 หน้า A4** โดยไม่ลดขนาดข้อความจนอ่านลำบาก
- **ล็อกข้อความ** จาก PDF 155 หน้าที่ปรับปรุงไว้แล้วเป็นฐาน; งานรอบแรกเป็นการออกแบบ/จัดหน้า ไม่แก้ชื่อ วันที่ เวลา คะแนน กติกา คำสั่ง/ประกาศ หรือรายชื่อจากการคาดเดา
- ไม่ทับหรือ rename `assets/souvenir-2569-v2.pdf` เพราะ **V2 เดิม 41 หน้า** ยังใช้เป็นแหล่งอ้างอิงบนเว็บ; ชื่อใหม่ที่เสนอคือ `MittraphapGames_2569_DesignV2_155pageTarget_REVIEW_ONLY.pdf`
- ไม่แก้ Google Docs ต้นฉบับ, JSON ตารางแข่งขัน/กรรมการ, Google Sheets, ผลการแข่งขัน หรือเว็บอ่าน PDF ระหว่างทำแบบ; การเผยแพร่เป็นอีกขั้นต่างหาก

## 2. ฐานข้อมูลและหลักฐานที่ต้องผูก
- Source PDF: Drive ID `1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF`, ชื่อ `MittraphapGames_2569_V42I10_G2_SelectedCover_155pages_REVIEW_ONLY_20261107.pdf`.
- Public review mirror: `assets/souvenir-2569-v42i10-g2-155pages.pdf`, SHA-256 ที่ PR #127 บันทึกไว้ `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d`, 4,067,611 bytes, 155 pages. ก่อน Build ใหม่ต้องตรวจ checksum PDF จริงซ้ำ
- Source page budget จาก PR #116: baseline 125 หน้า - หมวดผังเก่า 14 หน้า + ผังใหม่ 44 หน้า = **155 หน้า**; หน้าไม่ใช่ผัง 111 หน้า + ผัง 44 หน้า = 155
- ห้ามตกหล่น: 236 effective entries (186 คู่ + 50 กรีฑา), กรรมการ 250 แถว, ผัง 44 กลุ่ม/186 unique fixture IDs, 486 anchors, เอกสาร PR82 11 หน้า, ภาคผนวกอ้างอิง V3 17 หน้า และข้อสังเกตรอตรวจ 6 กลุ่ม
- มติการออกแบบปกจาก PR #115: Full Photo V2, ชื่อ 'มิตรภาพเกมส์' ตัวครีมขอบทอง/กรมท่าซ้อนคม **ไม่มีเงา**, เลข 2569 โทนอำพันแยกสี; ไม่ใช้ปกทดลอง PR #117 ที่ถูกปฏิเสธ
- PR #118 เป็นปกที่นำเข้า Drive แล้ว แต่ภาพ 1055×1491 px ประมาณ 127.5 dpi บน A4 และสิทธิ์ภาพ/คุณภาพงานพิมพ์ยังต้องตรวจ; ห้ามอ้างว่าเป็น print master 300 dpi

## 3. เนื้อหาล็อก: permitted versus prohibited
**อนุญาต**: เปลี่ยนระบบสี, อักษรตกแต่งส่วนหัวที่ไม่เปลี่ยนคำ, เส้นคั่น, card/table style, spacing, grid, icon ประเภทกีฬา, ภาพที่มีสิทธิ์, หน้าเลข/สารบัญที่คำนวณใหม่, PDF bookmarks และ QR/navigation ที่ตรวจ URL จริง; ยังต้องรักษาตัวอักษรไทยที่เลือก/ค้นหาได้

**ห้ามอัตโนมัติ**: เปลี่ยนคำในประกาศและคำสั่ง; แก้ข้อมูลทีม/ผู้เข้าแข่งขัน/กรรมการ/สนาม/เวลา/ผล; ลบ 17 หน้า appendix โดยไม่ผ่านการตรวจรับ; เติมหน้า sponsor/ภาพคั่น; เพิ่มคำว่า 'รับรองแล้ว'; ดึงผลการแข่งขันจำลองมาใส่; เปลี่ยนสถานะร่างเป็นฉบับทางการ

หากพบจุดข้อมูลขัดกันหรือคำผิด: ลงรายการเปรียบเทียบพร้อมหน้า/แหล่ง/ผลกระทบในรายการตรวจ **ไม่แก้เนื้อหาใน Design V2 รอบแรก**; รอผู้จัดอนุมัติเป็นงานแก้ข้อความรุ่นถัดไป

## 4. ลักษณะเฉพาะของ Design V2
**ธีม:** Friendship Games Signature Edition — premium youth sports magazine + formal official annex

| ส่วน | Design |
| --- | --- |
| ปก | ใช้ visual direction ที่รับแล้วจาก PR #115; ภาพจริงต้องผ่านสิทธิ์/print gate; ไม่ทดแทนด้วยภาพที่ไม่ใช่ต้นแบบ |
| สี | Navy `#102A4D`, Champagne Gold `#D5A43F`, Warm Ivory `#F6F2E8`, White `#FFFFFF`; พิมพ์ขาวดำแล้วยังอ่านได้ |
| ตัวอักษร | ชื่อเกม/หัวหมวด sport-display ตามแบบปก; เนื้อหา Thai Sans ชัดเจน; หน้าเอกสารทางการใช้ Sarabun และรักษาความเหมือนต้นฉบับ |
| พิธีเปิด/ปิด | Timeline ปรับช่องไฟ/เส้นเวลา ไม่เปลี่ยนช่วงเวลา |
| ประกาศ PR82 | รักษาความเป็นเอกสารราชการและ text/pixel parity 11 หน้า; ออกแบบตกแต่งเฉพาะพื้นที่ที่ไม่กระทบเนื้อหา |
| กติกา/คะแนน | ส่วนเน้นสาระและตารางที่แยกเกณฑ์กีฬา/คะแนนถ้วยรวม ไม่ลดข้อความ |
| 44 ผัง | 1 กลุ่มต่อ 1 หน้า; รักษาผังที่ผู้จัดเห็นชอบ สัญลักษณ์รอตรวจ และไม่วาดเส้นชนะ/bye จากการเดา |
| ตาราง/กรรมการ | Header สลับสี, รายการอ่านได้ทั้งจอและ A4; ไม่เปลี่ยนเลขคู่ วันเวลา หรือลำดับ |
| ภาคผนวก V3 | เก็บ 17 หน้าเป็น evidence/reference; ใช้การระบุสถานะร่างเดิม ไม่วาดซ้ำให้เป็นผลรับรอง |
| Footer | เวลา 'ปรับปรุงล่าสุด' ต้องอ้าง source revision ที่มีหลักฐาน ไม่สร้างเวลาใหม่; ตำแหน่งและสีปรับได้หากไม่เปลี่ยนความหมาย |

## 5. Page-budget และ QA ก่อนส่งตรวจ
- **เพดาน 155 หน้า A4**: non-bracket <=111, bracket 44; ภายในส่วน non-bracket ห้ามตัดสาระสำคัญเพื่อบังคับให้ครบ
- ห้ามใช้ font เล็กเกินไปเป็นวิธีประหยัดหน้า; ลดพื้นที่ตกแต่งที่ไร้สาระก่อน หากยังเกิน 155 ต้องรายงานเหตุและขออนุมัติ ไม่บีบข้อมูล
- ทุกหน้า A4 595.28×841.89pt; ไม่มีหน้าเปล่า, clipping, font missing, glyph แตก, overlay บังข้อความ, หน้า/เลขซ้ำ; QA เรนเดอร์ภาพจริง sample + ทุกหน้าอัตโนมัติ
- **Content parity**: 111/111 หน้า non-bracket ที่ไม่แก้ข้อความ; PR82 11/11 หน้า; 44/44 groups; 186 fixture IDs unique; 236 active entries; 250 committees; 486 anchors; 17 original appendix
- ถ้า page layout หรือพิกัดเปลี่ยน ให้คำนวณ **486 page-map anchors ใหม่** และตรวจ PDF viewer/highlight/backlinks; ห้ามนำพิกัด 155 เดิมมาใช้แบบ blind reuse
- PDF ต้องค้นหา/เลือกข้อความไทยได้, มี bookmarks ของหมวด, เปิด Safari iOS/Chrome/LINE WebView ได้, ทดสอบพิมพ์ A4 สี/ขาวดำ และ crop/print proof
- ภาพปกนักเรียนต้องมีสิทธิ์เผยแพร่และความละเอียดต้นฉบับเพียงพอ; ไม่ commit ภาพบุคคลที่ยังไม่ได้รับรองสู่ repo public

## 6. แผนดำเนินการเป็นลำดับ
1. **R25-A Content Snapshot:** เก็บ checksum/PDF + page index + text/semantic ledger + ข้อสังเกตทั้งหมด; ยืนยัน source 155 ที่จะล็อก
2. **R25-B Design Pilot:** ทำตัวอย่าง A4 แยก 6 หน้า (ปก, พิธี, ประกาศ, กติกา, ผัง, ตาราง) ด้วย source text จริง; ทดสอบไทย/ขอบ/สี/ภาพ ไม่แตะเว็บ
3. **R25-C Full Build:** สร้างไฟล์ **Design V2 แยก** จาก pipeline source เดิมหรือ PDF ผ่าน rendition-aware build; ห้ามเพิ่มหน้าโดยเลี่ยงไม่จำเป็น
4. **R25-D QA / Comparison:** diff เนื้อหาและ page map เทียบต้นฉบับ; แสดงรายงานเนื้อหาที่ต่าง, page budget, SHA, PDF render thumbnails, print/mobile acceptance
5. **R25-E Organizer Review:** ส่งไฟล์ Google Drive โฟลเดอร์สูจิบัตรเป็นชื่อรุ่นใหม่; ใช้สถานะ `REVIEW_ONLY`; ไม่ทับ PDF 155 ปัจจุบัน
6. **Release/Website:** หลังผู้จัดอนุมัติแยกต่างหากจึง Merge/release/อัปเดตแหล่ง PDF หน้าเว็บพร้อม rollback, ตรวจลิงก์/486 anchors และสิทธิ์ภาพ

## 7. การชนกับงานเปิดอยู่
- PR #116 (source integration 44 ผัง) และ #118 (ปก G2 155 หน้า) ยัง **Draft/Open** แม้ PDF ฉบับตรวจร่างนำขึ้น Drive แล้ว; อย่าปรับ source code ใน branch เหล่านี้จาก R25
- PR #124 แก้ PDF.js legacy/mobile compatibility ยัง **Open**, ห้ามแก้ `js/pdf-viewer.js` หรือ `js/booklet-private-viewer.js` ใน R25
- PR #130 เป็นงานอ่าน/ไฮไลท์ PDF ที่ Merge แล้ว; 486 anchors ของ Design V2 ต้องมี contract ใหม่หรือระบบแยก ไม่กระทบหน้า 41 และ 155 ที่ใช้งาน
- ใช้ branch R25 แยกและสร้าง PR review-only; **ไม่มีสิทธิ์ Merge, deploy, หรือแทนเอกสารจนผู้จัดสั่ง**

## 8. Definition of Done
**PLAN DONE** เมื่อเอกสารนี้อยู่ใน PR ให้ผู้จัดตรวจ.  
**DESIGN PILOT DONE** เมื่อผู้จัดเห็นตัวอย่างหน้า A4 จากข้อความจริงและเห็นชอบสไตล์.  
**PDF BUILT** เมื่อไฟล์ครบไม่เกิน 155 หน้าและผ่าน QA เชิงเทคนิค.  
**PUBLICATION APPROVED** เมื่อ R11E/สิทธิ์ภาพ/กติกา/รายการตรวจ/มือถือ/พิมพ์จริง ผ่านและผู้จัดอนุมัติชัดเจนเท่านั้น.

อ้างอิง:
- [PDF Drive 155 หน้า](https://drive.google.com/file/d/1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF/view)
- [PR #116](https://github.com/infobwd/nongkum-sports-hub/pull/116)
- [PR #118](https://github.com/infobwd/nongkum-sports-hub/pull/118)
- [PR #115](https://github.com/infobwd/nongkum-sports-hub/pull/115)
- [PR #127](https://github.com/infobwd/nongkum-sports-hub/pull/127)
