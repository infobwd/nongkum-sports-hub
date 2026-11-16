# R40 — อัปโหลดภาพกิจกรรมผ่านเว็บไซต์ (ส่วนตัวก่อนอนุมัติ)
วันที่วางแผน: 16 พฤศจิกายน 2569
สถานะ: วางแผน / ยังไม่ Merge / ยังไม่เผยแพร่ / ยังไม่ตรวจรับ

## แหล่งและข้อขัดแย้งที่ตรวจแล้ว
- R39 Merge PR #157 `383b85ef2a152e8321323f06dca20df4089106fb`.
- ข้อมูลตาราง R33 `nongkum_schedule_active` และ `nongkum_schedule_fixtures` เป็นแหล่งตรวจ ID กีฬารุ่น; แยกสถานะร่างของตารางออกจากความยินยอมเผยแพร่ภาพ.
- `nongkum_sports.editor_sessions` (R34) และ `nongkum_sports.reviewer_sessions` (R37) มี token hash/expiration/role แยกกัน; ห้ามสร้างรหัสสาธารณะหรือฝัง PIN.
- Storage มี bucket `meeting-evidence` สำหรับระบบประชุมเดิม; **ห้ามแก้ไขหรือใช้ซ้ำ**.
- R39 public manifest `data/public-activity-media.json` เริ่มว่าง พร้อม validator, UI จะแสดงรูปเฉพาะ approved media; ห้ามให้ upload กลายเป็นเผยแพร่ทันที.
- โฟลเดอร์ Google Drive `ภาพถ่ายประจำสนาม` และ `รูปภาพประกอบสูจิบัตร` คงเป็นแหล่งภาพต้นฉบับเดิม ไม่ย้ายไม่ลบ.

## สถาปัตยกรรม
1. **อัปโหลดจากมือถือโดยตรง** ผ่าน `upload-photos.html`: ใช้ session ผู้บันทึก R34 ที่ยังไม่หมดอายุหรือเข้ารหัสผู้บันทึกผ่าน R34 login เดิม; เลือกรายการจาก corrected 236 fixture ID, กรอกชื่อผู้ส่งและคำบรรยายทั่วไป, เลือก/ถ่ายรูป. หน้าเว็บใช้ Canvas แปลงเป็น WebP หรือ JPEG (Safari) และลบ metadata, จำกัดสัดส่วน/ความละเอียดและขนาด ≤ 350 KB.
2. **รับภาพที่ Edge Function** `nongkum-activity-photos`: เช็ก Origin เฉพาะ Pages, role bearer token ที่เซิร์ฟเวอร์, ขนาด payload สูงสุด, magic bytes WebP RIFF/chunks หรือ JPEG SOI/SOF และปฏิเสธ APP1-APP15/EXIF/XMP/ICC, ปฏิเสธ EXIF/XMP/ICCP, MIME/file size, ชื่อพาธสุ่มจาก server, จำกัดความถี่, และตรวจ fixture ID กับ active R33 source.
3. **Storage ใหม่สำหรับกีฬาเท่านั้น**: `nongkum-activity-intake`, private, image/webp หรือ image/jpeg, ≤350 KB; ไม่เปลี่ยน bucket meeting เดิม ไม่ให้ anon/authenticated อ่านหรือเขียน.
4. **ตารางส่วนตัว** `nongkum_sports.activity_photo_submissions`: เก็บ event/fixture ID, sport, division, uploader, caption, storage object path, hash session, state, ผู้ตรวจ, เวลา, เหตุผลส่งกลับ, version และ audit. รูปไม่เข้าสู่เว็บสาธารณะเมื่ออัปโหลด.
5. **ตรวจรูป** ผ่าน `review-photos.html`, ใช้ R37 reviewer session 6 ชั่วโมงเดิม: รายการรอตรวจ ภาพตัวอย่างส่วนตัว, ปุ่มอนุญาตใช้ภาพ/ยืนยัน และปุ่มส่งกลับเหตุผล. ห้าม reviewer ดึงรูปโดยไม่มี session และห้ามเผยแพร่รูปโดยอัตโนมัติ.
6. **เผยแพร่ภาพจริง** จะเป็นขั้นถัดไป: จากรูปที่ผ่านการตรวจแล้ว ผู้จัดคัดเลือกลง R39 public manifest และไฟล์ WebP ที่สร้างใหม่ใน PR โดยห้าม leak private Drive ID, object path, student PII. งานนี้ไม่เปลี่ยน approved competition result.
7. **Security gate**: SQL RPC service_role only, private schema RLS on; no service key on frontend; validate role server side and stage transitions; no direct client storage policy; test invalid token/origin/MIME/oversize/mismatched fixture/no-consent/replay/rate limit.

## ขั้นตอนดำเนินการ
- [x] ตรวจ main, PR, R34/R37, schedule R33, Storage และ R39.
- [x] บันทึกแผนใน repo ก่อนโค้ด.
- [ ] เขียน migration ใหม่สำหรับ private bucket/table/RPC โดยไม่ deploy ทันที.
- [ ] พัฒนา Edge Function, หน้าอัปโหลด/ตรวจรูป, CSS และ unit/regression tests.
- [ ] ตรวจ schema, SQL security, code tests, Safari/Chrome/LINE (ทดสอบจริงหลังเผยแพร่).
- [ ] PR R40 พร้อมหลักฐาน; **Merge เมื่อผู้ใช้สั่ง**.
- [ ] Deploy migration + Edge Function หลังผ่าน security QA และอนุญาตใช้งาน; ตรวจเว็บจริงหลัง Merge.
- [ ] ตรวจรับหน้างานด้วยบัญชีเจ้าหน้าที่ โดยใช้ภาพทดสอบที่ไม่มีนักเรียนจริง.

### ข้อจำกัดสำคัญ
- **ไม่มีปุ่มเผยแพร่ทันทีใน R40**: ผู้ตรวจเพียงอนุญาตภาพในพื้นที่ส่วนตัว ผู้จัดต้องคัดเลือกภาพอีกครั้งก่อนเผยแพร่ผ่าน R39.
- ไม่ใช้รูปภาพหลักฐานผลหรือข้อมูลนักเรียนโดยอัตโนมัติ และไม่แสดงชื่อ/โทรศัพท์ผู้ส่งภาพในหน้าเว็บสาธารณะ.
- ผู้บันทึกและผู้ตรวจต้องเป็นคนละสิทธิ์; หากความยินยอมไม่ชัดเจนให้ส่งกลับ.
- Supabase ฟรีมีโควตา Storage/bandwidth: จำกัดไฟล์ต่อภาพและจำนวนครั้ง; ต้องติดตามการใช้งาน.
