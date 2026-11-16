# R40 — อัปโหลดภาพกิจกรรมผ่านเว็บไซต์ (ส่วนตัวก่อนอนุมัติ)
วันที่วางแผน: 16 พฤศจิกายน 2569
สถานะล่าสุด: พัฒนาแล้ว · ส่วนหน้าเว็บ Merge ใน PR #158 และเผยแพร่แล้ว · Supabase ยังไม่ deploy · ยังไม่ตรวจรับหน้างาน

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
- [x] เขียน migration สำหรับ private bucket/table/RPC (เก็บใน main ยังไม่ได้ apply Supabase).
- [x] พัฒนา Edge Function, หน้าอัปโหลด/ตรวจรูป, CSS และ unit/regression tests (PR #158 Merge แล้ว).
- [ ] ตรวจ schema/SQL security และเว็บบนมือถือครบ: static test ผ่าน, Deno type check ผ่านใน PR #160; รอติดตั้ง backend และทดสอบ Safari/Chrome/LINE จริง.
- [x] PR #158 Merge ส่วนหน้าเว็บแล้ว; PR #160 (QA/Fix Edge Deno) เปิดพร้อมหลักฐานและ **ยังไม่ Merge**.
- [ ] Deploy migration + Edge Function หลังผ่าน security QA และอนุญาตใช้งาน; ตรวจเว็บจริงหลัง Merge.
- [ ] ตรวจรับหน้างานด้วยบัญชีเจ้าหน้าที่ โดยใช้ภาพทดสอบที่ไม่มีนักเรียนจริง.

### ข้อจำกัดสำคัญ
- **ไม่มีปุ่มเผยแพร่ทันทีใน R40**: ผู้ตรวจเพียงอนุญาตภาพในพื้นที่ส่วนตัว ผู้จัดต้องคัดเลือกภาพอีกครั้งก่อนเผยแพร่ผ่าน R39.
- ไม่ใช้รูปภาพหลักฐานผลหรือข้อมูลนักเรียนโดยอัตโนมัติ และไม่แสดงชื่อ/โทรศัพท์ผู้ส่งภาพในหน้าเว็บสาธารณะ.
- ผู้บันทึกและผู้ตรวจต้องเป็นคนละสิทธิ์; หากความยินยอมไม่ชัดเจนให้ส่งกลับ.
- Supabase ฟรีมีโควตา Storage/bandwidth: จำกัดไฟล์ต่อภาพและจำนวนครั้ง; ต้องติดตามการใช้งาน.

## บันทึกตรวจต่อหลัง PR #158 (16 พ.ย. 2569)
- `main` ณ การตรวจ: `a66fc15e763b8334c334459646fdba800443ccfc`; GitHub Pages build ผ่าน และชุด Validate ผ่าน แต่ไม่เท่ากับตรวจรับการส่งภาพจริง.
- Supabase Meeting ยังไม่มี `nongkum_sports.activity_photo_submissions`, bucket `nongkum-activity-intake`, RPC `public.nongkum_activity_photo_gateway`, หรือ Edge Function `nongkum-activity-photos`. **ยังไม่เปิดรับภาพจริง** และไม่ได้แตะ bucket `meeting-evidence`.
- พบ PR #159 (`feat/r40-web-photo-upload-private-approval-20261116`) เป็นแนวทางซ้ำที่ใช้ Edge Function / bucket ชื่อเดียวกันแต่ API และขนาด/ชนิดภาพต่างกัน มีความเสี่ยง deploy ทับ และมีการนำภาพออกสาธารณะทันทีหลัง reviewer ต่างจาก R40 ที่ใช้อยู่. บันทึกข้อขัดแย้งใน [PR #159](https://github.com/infobwd/nongkum-sports-hub/pull/159); **ห้าม merge/deploy ทับโดยไม่ reconcile**.
- [PR #160](https://github.com/infobwd/nongkum-sports-hub/pull/160) เพิ่ม GitHub Actions `deno check` ของ Edge และแก้ Deno 2.9 `TS2769` จาก `Uint8Array<ArrayBufferLike>` ให้ส่งข้อมูลเป็น `ArrayBuffer`. ชุด `R40 Private Photo Security QA` และ `Validate draft data` ผ่านบน commit `40eb4cdb72169f775f1dc1633abe30d6a2ae7d9d` ก่อนแก้เอกสารนี้.
- เกณฑ์ปิดงานคงเดิม: ตรวจ SQL/สิทธิ์จริง, ติดตั้ง migration และ Edge จากรุ่น Merge, ใช้ภาพทดสอบไม่มีนักเรียนผ่าน upload → queue → private preview → reviewer approve/reject → ตรวจ public ไม่เห็นรูป, ทดสอบมือถือ/LINE จริง และเก็บหลักฐานตรวจรับ.
