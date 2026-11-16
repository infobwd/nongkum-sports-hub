# R40 — ส่งภาพกิจกรรมผ่านหน้าเว็บ จัดเก็บส่วนตัว และตรวจอนุญาตก่อนแสดงสาธารณะ
วันที่เริ่ม: 16 พฤศจิกายน 2569
สถานะ: วางแผนในสาขา `feat/r40-web-photo-upload-private-approval-20261116`; ยังไม่ Merge / deploy / ตรวจรับ

## ต่อจากงานเดิม
- R39 PR #157 Merge `383b85ef2a152e8321323f06dca20df4089106fb`: ผลรับรอง LINE และ catalog ภาพกิจกรรมแบบ approved-only พร้อม fallback ภาพกีฬา
- มีระบบรหัสผู้บันทึก R34 session 6 ชั่วโมงและรหัสผู้ตรวจ R37 แยกบทบาทอยู่แล้ว; **ไม่เพิ่มหรือ hardcode รหัสในโค้ด**
- Supabase Meeting project `zprxvpfkvforoxrboqiv` มี `nongkum_sports.editor_sessions`, `reviewer_sessions`; ใช้ตรวจ server-side ทุกคำสั่ง
- มี bucket `meeting-evidence` (private) ของระบบประชุมเดิม: **ห้ามแตะ**; สร้าง bucket ใหม่เฉพาะกีฬา
- ใช้รหัส fixture/event จาก `nongkum_schedule_active` / `nongkum_schedule_fixtures` ไม่คาดเดาชื่อ รายการ หรือผลการแข่งขัน
- Google Drive ภาพถ่ายเดิมใช้เป็นแหล่งสำรอง/ต้นฉบับของภาพที่อัปโหลดแยก ไม่ย้าย/ลบ/เปิดสิทธิ์ไฟล์เดิม

## สัญญาการทำงาน
1. หน้าสาธารณะ `photos.html` **ไม่แสดงรายการภาพส่วนตัวก่อนยืนยันสิทธิ์**; ผู้ส่งภาพใช้ session รหัสผู้บันทึก R34, ผู้ตรวจใช้รหัสผู้ตรวจ R37
2. ผู้ส่งภาพเลือกรายการจริง, พิมพ์ชื่อผู้ส่งที่ตรวจสอบได้, คำบรรยายสั้น และยืนยันว่ามีสิทธิ์เผยแพร่ภาพบุคคลในรูป (checkbox) ก่อนส่ง
3. เบราว์เซอร์ย่อและแปลงภาพเป็น WebP <=650 KB ลบ EXIF/ตำแหน่งที่แนบมากับภาพ; Edge Function ตรวจ token, active fixture, magic bytes, size และอัตราคำขอซ้ำก่อนส่งข้อมูลเข้า **private Storage bucket** ของกีฬา; ไม่มี service role ใน JS
4. สร้าง metadata สถานะ `pending` ใน `nongkum_sports.activity_photos`, ไม่ให้เว็บสาธารณะอ่านภาพ/private path, ไม่เปลี่ยนผลคะแนนและการรับรอง
5. ผู้ตรวจ R37 เห็นรายการรอตรวจ, ดูภาพด้วย signed URL สั้น, ตรวจสิทธิ์ใช้ภาพและเลือก **อนุมัติ / ส่งกลับพร้อมเหตุผล**. ห้ามอนุมัติจาก token ผู้บันทึก
6. เมื่ออนุมัติจริง Edge Function คัดลอก WebP เท่านั้นเข้าบักเก็ต public ที่มีสิทธิ์เขียนเฉพาะ service role จากนั้นค่อยเปลี่ยนสถานะฐานข้อมูลเป็น `approved`. ถ้าทำไม่สำเร็จให้คงเป็น `pending` และลบสำเนาสาธารณะ
7. หน้า results ใช้ API public approved-only แบบ read-only ดึงเฉพาะ `event_id`, `sport_id`, `division`, `src`, `caption`; fallback เป็น manifest R39 และภาพสัญลักษณ์ WebP เดิมเมื่อเครือข่ายล้มเหลว
8. ไม่ส่งข้อมูลนักเรียน ชื่อผู้ส่ง หลักฐานอนุญาต private path หรือ token ไป public feed, GitHub Pages หรือ LINE previews

## ความปลอดภัยและ QA
- แยกสอง Storage buckets ใหม่: `nongkum-activity-intake` (private) และ `nongkum-activity-public` (public read, private write); จำกัด image/webp, ไฟล์ไม่เกิน 650 KB, ไม่มี RLS policy สำหรับ anonymous write; storage service-key อยู่ Edge เท่านั้น
- RPC photo gateway เฉพาะ `service_role`; ทุกการกระทำที่เขียนยืนยัน editor/reviewer session ที่ยังใช้ได้, จำกัดจำนวนส่ง, รองรับกลับไปแก้, เก็บ audit
- ตรวจชนิดไฟล์จาก bytes (RIFF/WEBP), ไม่เชื่อ MIME จาก browser เพียงอย่างเดียว; ชื่อไฟล์ UUID ที่ server สร้างเท่านั้น; ห้าม SVG, HTML, GIF, ZIP, EXIF/raw original
- ห้ามเผยแพร่อัตโนมัติ, ห้ามนำรูปจาก Drive ไปเปิดสาธารณะโดยไม่มีหลักฐานการอนุญาต
- ทดสอบ auth fail, expired, reviewer-only approve, upload missing consent, forged fixture, oversize/bad magic, rollback on storage/db failure, public feed filtered, 236-fixture consistency, mobile Safari/Chrome/LINE
- Code -> tests -> PR -> Merge เมื่อได้รับอนุญาต -> apply migration/Edge deploy อย่างเป็นขั้นตอน -> ตรวจเว็บจริง/ตรวจรับมือถือ

## ขอบเขตความพร้อม
R40 นี้ทำหน้าจอและ backend source/SQL migration + automated QA ก่อนเปิด PR; **จะยังไม่ deploy production backend หรือเปิด upload ใช้งานจริงก่อน Merge และตรวจสิทธิ์**.  R39 แสดงผลรับรองเดิมต่อได้โดยอิสระหาก R40 ยังไม่ deploy.
