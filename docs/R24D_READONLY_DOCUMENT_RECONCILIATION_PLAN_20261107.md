# R24-D — รายงานตรวจเทียบสูจิบัตรและข้อเสนอแก้ไขแบบอ่านอย่างเดียว

วันที่: 7 พฤศจิกายน 2569  
**PLAN RECORDED BEFORE CODE / NOT MERGED / NOT DEPLOYED / NOT OFFICIALLY APPROVED**

## แหล่งข้อมูลและงานที่มีอยู่ (Reuse-First)

- `main` ก่อนเริ่มงาน: `5be80c7edacdd07bb5e923a3797262ae4e8a5668`, รวม PR #120 (แผน R24), PR #121 (ศูนย์เอกสาร V2/V3/155 และตรวจ 486 จุด), PR #122 (viewer ไฟล์ส่วนตัวเปิดตรงรายการ).
- ตารางแข่งขัน `data/program-from-pdf-2569-20261104-draft.json`: raw 237, active 236 หลังตัดฟุตบอลหญิงนัดชิงซ้ำ; `data/program-pdf-positions-v2.json` ครบ 236 พิกัดบน PDF 41 หน้า.
- รายชื่อกรรมการ `data/committee-2569-draft-public-review.json` จำนวน 250 แถวและ `data/committee-pdf-positions-v3.json` พิกัด PDF 64 หน้า.
- 155-page V4.2-I10 G2 ตรวจยืนยัน 486 token จาก active fixture 236 + committee 250 เทียบฉบับก่อนเปลี่ยนปกแล้ว; **ความตรงกันของ ID/ตำแหน่งไม่เท่ากับความตรงกันของข้อความหรือการรับรอง**.
- **โรงเรียนมี R19-D อยู่แล้ว**: `committee-review.html` ใช้รหัสเฉพาะโรงเรียน/ข้อมูลเข้ารหัสและส่งข้อความผ่าน LINE โดยผู้จัดต้องยืนยันผู้ส่งและตอบรับก่อน; งานนี้ใช้ซ้ำ ไม่สร้างช่องทางยืนยันกรรมการใหม่ ไม่เผยแพร่ข้อมูลกรรมการที่ไม่จำเป็น.

## ขอบเขตงาน R24-D1 ที่ดำเนินการได้ทันที

1. เพิ่ม `booklet-comparison.html` เป็น **รายงานตรวจเอกสารแบบอ่านอย่างเดียว** จากศูนย์สูจิบัตร; ไม่เปลี่ยน `index.html` หรือหน้าดูกรรมการเดิม.
2. โหลด metadata ฉบับ V2/V3/155 และ source index 236/250 แบบ source-bound; ตรวจ index SHA/count, รหัสรายการ/เลขคู่/หน้าและพิกัด legacy ขณะอ่าน.
3. แสดงหลักฐานเป็นสองแกนอิสระ:
   - `ANCHOR_VERIFIED`: รหัส/พิกัดเอกสารตรวจแล้ว 236 + 250, เล่ม 155 รวม 486
   - `CONTENT_REVIEW_STATE`: `MATCHED`, `DIFFERENT`, `NEEDS_REVIEW`, `UNAVAILABLE` โดย **ห้ามแสดง MATCHED หรือ DIFFERENT ถ้าไม่มีหลักฐานเทียบเนื้อหา PDF สองฉบับรายแถวจริง**; ระยะแรกเป็น `NEEDS_REVIEW` ตามค่าเริ่มต้นหรือ `UNAVAILABLE` เมื่อ source revision ผิด. ข้อมูลวัน/เวลาที่รับรองแล้วตามมติเดิมไม่แปลว่าทั้งสอง PDF ได้รับรอง.
4. แสดงรายการแข่งขัน 236 รายการเป็นการ์ดค้นหาตามชนิดกีฬา/รุ่น/เลขคู่ พร้อมลิงก์ legacy `?page=N&fixture=ID` และลิงก์เล่ม 155 `?fixture=ID` (ใช้ file+map ส่วนตัวตาม R24-C) และตัวเลือกคัดลอก "ประเด็นรอตรวจ" สำหรับส่งให้ผู้จัดโดยไม่บันทึก server.
5. ส่วนกรรมการแสดง **เฉพาะจำนวนและทางเข้ากระบวนการ R19-D**; ไม่สร้างหน้าพิมพ์ซ้ำ 250 ชื่อหรือประกาศยืนยันใหม่.
6. เกณฑ์เก็บการยืนยันแท้จริงต้องมี reviewer identity, school authorization, source revisions, explicit organizer acknowledgement, timestamp และ audit trail ใน private storage—ไม่แก้ `approved` จากการกด Copy/LINE.
7. เพิ่ม test/CI เน้น fail closed revision, counts 236+250, original PDF routes unchanged, no public PDF 155 URL/private map/auth codes, no score/results edits, mobile-first.

## งานที่ยังไม่อนุญาตให้ทำในระยะนี้

- ไม่เผยแพร่ PDF 155 หรือพิกัด private; ไม่มีสิทธิ์ Drive `access_not_verified`, ยังรอสิทธิ์ภาพนักเรียนและมติ R11E.
- ไม่สร้างผลต่างรายบุคคลที่ยังไม่มีหลักฐาน หรือรายชื่อผู้ยืนยันที่พิสูจน์ไม่ได้.
- ไม่บันทึกหรือแสดงสถานะ `ORGANIZER_CONFIRMED` / `PUBLISHED` ใหม่.
- ไม่ Merge PR R24-D อัตโนมัติจากคำสั่งพัฒนาต่อ; PR แยกเพื่อให้ตรวจงานก่อน, device QA และ rollout แยก.

## R24-D2 / R24-E ที่ต้องทำต่อ

- ใช้สคริปต์เปรียบเทียบแหล่ง PDF V2/V3 กับ 155 หน้าจริงแบบ field-by-field ภายในพื้นที่มีสิทธิ์; ผู้จัดตรวจกรณีคำไทยสกัดไม่ตรงรูปแบบ และออก `MATCHED`/`DIFFERENT` เฉพาะ record ที่พิสูจน์ได้.
- หากต้องบันทึกผลตรวจแต่ละโรงเรียนให้ reuse R19-D และออกแบบ organizer-owned private ledger ที่ตรวจตัวตนและ acknowledgement ก่อน.
- ทดสอบ Safari iPhone, LINE iOS/Android, Chrome Android, link deep links, fallback offline, file selected, hashes, screen-reader ก่อน release acceptance.
