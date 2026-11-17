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


## ตรวจซ้ำก่อนเตรียมขั้นติดตั้งจริง — 17 พ.ย. 2569 เวลา 11.46 น. (ไทย)

**หลักฐานที่ใช้:** GitHub PR #170 commit `5f5971ed0206e09c8143c746f7ed9998e10cf4a0` มี Actions สำเร็จ 4 ชุด:
- R43 private staging: https://github.com/infobwd/nongkum-sports-hub/actions/runs/44018277441
- R43 schedule/committee draft: https://github.com/infobwd/nongkum-sports-hub/actions/runs/44018277485
- R14 field/LINE regression: https://github.com/infobwd/nongkum-sports-hub/actions/runs/44018277392
- Validate draft data: https://github.com/infobwd/nongkum-sports-hub/actions/runs/44018277434

**Preflight Supabase Meeting อ่านอย่างเดียว:** ใช้ `scripts/r43/preflight-personal-pin-production-readonly.sql`; ผลที่ 11.46.05 น. คือ R33 active `r33-20261116-7ba60be1-fa3269b5`, 236 fixtures, R32 published 46 rows, 7 ตาราง R43 มี 0 rows, legacy actor FK 10, ตาราง PIN ใหม่ 0, RPC ตรวจ PIN ใหม่ยังไม่ติดตั้ง. ผล `PREFLIGHT_BASELINE_ONLY__BACKUP_REVIEW_APPROVAL_STILL_REQUIRED` หมายถึง *โครงสร้างยังตรงเงื่อนไขที่ใช้วางแผน* เท่านั้น **ไม่ได้แปลว่าพร้อมติดตั้งหรืออนุญาตให้ติดตั้งแล้ว**. ต้องรันซ้ำก่อนดำเนินการจริง เพราะผลแข่งขันและแหล่งตารางอาจเปลี่ยนได้ทุกเวลา.

**การเทียบ Git:** สาขา PR #170 นำหน้า `main` 50 commits และไม่ตามหลัง ณ ขณะตรวจ (ยังต้องตรวจซ้ำก่อน Merge). พบว่าไฟล์หน้าเว็บและโค้ด Supabase ใหม่อยู่ใน PR ไม่ได้อยู่ใน `main`.

### แผนขั้นติดตั้งจริงที่ยังไม่ดำเนินการ
1. **ก่อนทำจริง:** ตรวจการอนุญาต Merge อย่างชัดเจน ตรวจเวอร์ชัน R32/R33 และดึงสำเนาฐานข้อมูลพร้อมแนวทางคืนสภาพ; ไม่ใช้ snapshot ตัวเลขเพียงอย่างเดียวแทนการสำรองข้อมูลหรือการเทียบ row-level.
2. **ทบทวน migration:** สร้าง migration production ที่ผ่าน review ใหม่จากไฟล์ proposal; **ห้ามนำ** `scripts/r43/install-personal-pin-staging.psql` ไปรันจริง เพราะสคริปต์บังคับชื่อฐาน `r43_staff_test` และออกแบบเฉพาะฐานทดสอบ.
3. **ป้องกันข้อมูลเดิม:** ตรวจและล็อกช่วงเวลาที่เปลี่ยน FK อย่างเหมาะสม; หากเจอแถว R43 เดิม, FK ไม่ครบ 10, schema ใหม่อยู่แล้ว หรือ R33/R32 ไม่ตรง baseline ให้ **หยุด** และทำแผนย้ายข้อมูลรักษาประวัติก่อน ไม่ฝืนข้ามเงื่อนไข.
4. **ตั้งค่าฝั่งเซิร์ฟเวอร์:** ติดตั้ง schema, actor bridge และ RPC ด้วยธุรกรรม/การติดตาม migration ที่ตรวจสอบได้; ตรวจ RLS/EXECUTE และ secret อย่างปลอดภัย; deploy Edge โดย flags ยังปิด (ไม่ส่ง key ลับไปยัง client).
5. **สิทธิ์จริง:** ตรวจบัญชีกรรมการและคำสั่งแต่งตั้งจริงแล้วอนุมัติผู้เสนอ ผู้มอบหมาย และผู้ตรวจ **รายบุคคล**; ออก PIN สุ่มผ่านช่องทางส่วนตัว; ไม่ใส่ PIN ลง GitHub/แชตสาธารณะ.
6. **ตรวจรับก่อนเปิด:** ทดสอบคนละบัญชีเสนอ/รับรอง, ป้องกัน self-review, audit, ข้อผิดพลาด, การหมดอายุและเพิกถอน PIN, เปรียบเทียบ R32/R33 ก่อน/หลัง และตรวจ Android Chrome, iOS Safari, LINE browser ด้วยอุปกรณ์จริง. เปิด public config และ flags เมื่อผ่านเกณฑ์อนุมัติเท่านั้น.

### สถานะที่ตรวจได้ในรอบนี้
- [x] สรุป CI ลง PR (comment เดิม `#issuecomment-6938511466`).
- [x] เพิ่ม SQL preflight แบบอ่านอย่างเดียวในสาขา PR และรันจริงสำเร็จโดยไม่แก้ข้อมูล.
- [x] ตรวจว่าระบบ PIN R43 ยังไม่ติดตั้งและ 7 ตาราง R43 ยังว่าง.
- [ ] ยังไม่ได้สร้าง/ตรวจรับ production migration, สำรองฐานจริง, ลงทะเบียนผู้ได้รับสิทธิ์, ออก PIN, Merge หรือ deploy.
- [ ] ยังไม่ได้ทดสอบ Safari/Chrome/LINE บนอุปกรณ์จริง.
