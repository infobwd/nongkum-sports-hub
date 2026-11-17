# R43-F — เตรียมติดตั้งระบบรหัสรายบุคคล (17 พฤศจิกายน 2569)

สถานะ: แผนตรวจรับ/ติดตั้ง · PR #170 ยังเป็น Draft · ยังไม่ Merge, Deploy หรือเปิดสิทธิ์จริง

## ขอบเขตและการรักษาข้อมูล
- เจ้าหน้าที่กรอก PIN ส่วนตัว 10–16 หลักช่องเดียว ไม่ต้องอีเมลหรือ LINE
- เซิร์ฟเวอร์ตรวจ PIN แบบ HMAC โดย pepper เป็น Edge secret และตรวจ session อายุไม่เกิน 6 ชั่วโมงพร้อมจำกัดการลองรหัส
- ทะเบียนตัวตน: r43_staff_identities; สิทธิ์จริง: r43_roles; UUID ผู้เสนอ/ผู้ตรวจลง audit
- อนุมัติคำขอไม่ได้แปลว่าเผยแพร่ R33 และไม่เขียนผล R32
- การเปลี่ยน FK actor 10 จุดจาก auth.users → r43_staff_identities หยุดทันทีหากมีข้อมูล R43 อยู่ก่อน

## ลำดับไฟล์ที่ต้องใช้ (หลังตรวจ CI และอนุญาต Merge)
1. supabase/proposals/r43_personal_pin_private_identity.sql — ตารางส่วนตัวและ RLS
2. supabase/proposals/r43_staff_actor_bridge.sql — ย้ายความสัมพันธ์ actor โดยไม่เขียนทับข้อมูล
3. supabase/proposals/r43_personal_pin_auth_rpc.sql — ยืนยัน session และจำกัดรหัสผิด
4. supabase/functions/nongkum-r43-pin/index.ts — ตรวจ PIN รายบุคคล
5. supabase/functions/nongkum-schedule-admin/index.ts — เสนอและรับรองคำขอหลังตรวจ session
6. schedule-review.html และ js/r43-private-review.js — หน้าจอผู้จัดและผู้ตรวจ

## เช็กลิสต์ก่อนอนุญาตติดตั้ง
- [ ] ตรวจและสำรอง R33 active/source และ R32 approved พร้อมหลักฐานเวลาตรวจ
- [ ] ยืนยันว่าตาราง r43_roles, r43_people, r43_people_audit, r43_requests, r43_audit, r43_new_fixture_requests และ r43_new_fixture_audit ยังว่างทั้งหมด; ถ้ามีข้อมูลให้หยุดและทบทวน migration
- [ ] ชุดทดสอบ legacy QA, PIN staff UUID, ตรวจสิทธิ์, self-review, R32/R33 baseline, Chromium ผ่านครบ
- [ ] ผู้จัดอนุญาต Merge PR #170 แล้วจึงติดตั้งจาก main เท่านั้น
- [ ] ตรวจผู้มีอำนาจรายบุคคล โดยใช้รายชื่อกรรมการและหลักฐานแต่งตั้ง; ผู้ตรวจที่ยืนยันชื่อแล้วคือ นายนพรุจ ลับบัวงาม แต่ยังไม่ได้ออก PIN
- [ ] ห้ามเปิดสิทธิ์รายชื่อร่างทั้ง 8 คนอัตโนมัติ
- [ ] ออก PIN สุ่มอย่างปลอดภัยและส่งให้เจ้าของเป็นการส่วนตัว ไม่ใส่ PIN หรือ pepper ใน repo, CI, log หรือหน้าเว็บ
- [ ] ตั้งค่า R43_PIN_PEPPER แบบลับอย่างน้อย 32 ตัวอักษร, และจำกัดสิทธิ์ service-role ให้อยู่ใน Edge เท่านั้น
- [ ] deploy Edge แบบปิดไว้ก่อน (R43_PERSONAL_PIN_ENABLED=false, R43_STAFF_GATEWAY_ENABLED=false) และตรวจค่า verify_jwt=false เฉพาะปลายทางที่ตรวจ opaque token ด้วยตนเอง
- [ ] ติดตั้ง SQL, role mapping และ session validator ตามลำดับ; ตรวจ RLS, FK และ function EXECUTE
- [ ] เมื่อทดสอบผ่านจึงเปิด flags และเผยแพร่ data/r43-public-pin-config.json ที่มีเฉพาะ URL กับ publishable key ไม่ใช่ secret
- [ ] ทดสอบบน Android Chrome, iOS Safari และเบราว์เซอร์ใน LINE ด้วยผู้เสนอและผู้ตรวจคนละคน รวมทั้งรหัสผิด/หมดอายุ/เพิกถอน
- [ ] ทดสอบการบันทึกคำขอจริงใน R43 พร้อม audit, self-review ต้องถูกปฏิเสธ และตาราง/ผล R33/R32 ไม่เปลี่ยน
- [ ] ตรวจเว็บไซต์จริงหลังติดตั้งและเก็บหลักฐานก่อนระบุสถานะตรวจรับ

## หมายเหตุความปลอดภัย
- PIN รายบุคคลเป็นความลับสำหรับเข้าสู่ระบบ หากรั่วอาจถูกสวมสิทธิ์ จึงต้องมีขั้นตอน reset/เพิกถอนและจำกัดอัตราการเดารหัส
- session อยู่ในหน่วยความจำของหน้าเว็บ ไม่เก็บ PIN หรือ token ใน localStorage การรีเฟรชหน้าอาจต้องกรอกรหัสใหม่
- การ Merge ไม่ใช่การ Deploy และการ Deploy ไม่ใช่การตรวจรับ
