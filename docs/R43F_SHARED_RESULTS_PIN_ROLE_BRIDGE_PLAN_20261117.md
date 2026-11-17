# R43-F — ใช้รหัสผลแข่งขันเดิมกับการจัดตาราง (17 พ.ย. 2569)

## คำขอและขอบเขต
ผู้จัดต้องการใช้รหัสผู้บันทึกผล R34 สำหรับเสนอแก้ตาราง/กรรมการ และรหัสผู้ตรวจผล R37 สำหรับตรวจคำขอ R43 โดยไม่สร้างรหัสกลางชุดใหม่; ยึดบัญชีรายบุคคลเพื่อระบุผู้กระทำจริง

## หลักฐานต้นทาง
- PR #168/#169 Merge แล้ว; R43 มีตารางส่วนตัว 7 ตาราง/RLS และ r43_roles ยังไม่มีสมาชิก
- R34/R37 ใช้ session หกชั่วโมงในฐาน editor_sessions/reviewer_sessions พร้อม hash ของ token และ revoke ได้
- R43 มี Supabase Auth/JWT เพื่อระบุตัวตน และ SQL gateway จำกัดผู้เสนอ/ผู้รับรอง แยกกัน; Edge nongkum-schedule-admin ยังไม่ deploy และไฟล์เปิดใช้งานฝั่งสาธารณะยังไม่พร้อม
- PR เปิดเดิม #144 (R33) และ #159 (กิจกรรมภาพ): หลีกเลี่ยงแก้โค้ดเดิม R34/R37 และข้อมูลผล R32

## แบบที่อนุมัติให้พัฒนา
1. ใช้บัญชี Supabase Auth รายบุคคลครั้งแรก/เมื่อหมดอายุเพื่อระบุผู้ปฏิบัติ ไม่ใช่เอา shared PIN มาแทนบุคคล
2. ใช้ token R34 เดิมเพื่อเปิดงานเสนอและมอบหมาย; token R37 เดิมเพื่อเปิดคิวตรวจ/รับรอง; ถ้าปลดล็อก R34/R37 ในเครื่องแล้ว ให้ใช้ session เดิมได้ภายใน 6 ชั่วโมง ไม่เก็บ PIN
3. R43 Edge ตรวจ JWT จาก Auth ทุกคำขอ แล้วตรวจ token PIN เดิมแบบ hash กับตาราง session ที่ยังไม่หมดอายุ/ไม่ revoke จากฝั่ง service role; ไม่ส่ง token เข้า R43 gateway/audit
4. ต้องผ่าน R43 role allowlist เพิ่มเติม: can_propose/can_assign/can_review; ผู้เสนอรับรองงานตัวเองไม่ได้ (แม้มีทั้งสอง PIN)
5. ถ้าขาด Auth, สิทธิ์, token เดิม, config หรือ Edge ให้ปิดการเข้าถึง ไม่เปิด public write และไม่เผยแพร่ตาราง
6. จำกัด CORS, body size, แยก PIN role ต่อ action, ไม่ฝัง secret ลงหน้าเว็บ; การออกจาก R43 ไม่ revoke session ของ R34/R37 ที่ใช้กับหน้าผลแข่งอยู่แล้ว

## ลำดับ/เกณฑ์ตรวจ
- [x] ตรวจ main, PR, R34/R37/R43 production
- [x] บันทึกแผนนี้ก่อนแก้โค้ด
- [x] จัดทำ SQL RPC แบบอ่านอย่างเดียว (proposal สำหรับทดสอบ; ยังไม่ติดตั้ง Meeting) และให้ service_role ใช้เท่านั้น
- [x] พัฒนา Edge ตรวจ Auth + สิทธิ์ PIN ก่อนทุก action ที่มีข้อมูล/การเปลี่ยนแปลง (ยังไม่ deploy)
- [x] พัฒนา UI ใช้ session PIN เดิมหรือให้กรอก PIN เดิม หากยังไม่ปลดล็อก (ยังไม่เผยแพร่)
- [x] ทดสอบจำลอง: ไม่มี Auth, ไม่มี role, token ผิด/หมดอายุ/revoke, editor/reviewer ข้ามสิทธิ์, self-review, ไม่มี token ใน R43 gateway/audit, R33/R32 ไม่เปลี่ยน
- [x] เปิด PR #170 และ CI ผ่าน; ไม่มี Merge/deploy/เปิดสิทธิ์จริงโดยอัตโนมัติ

## ข้อจำกัดการเปิดจริง
ต้องมี Auth user UUID อย่างน้อยสองคนได้รับมอบอำนาจเป็นลายลักษณ์อักษรและอยู่ใน R43 roles; อนุมัติการ deploy Edge + public config ตาม QA และตรวจ Safari/Chrome/LINE เครื่องจริงก่อนตรวจรับ; ไม่มีการนำ shared PIN มา provision รายชื่อหรือสิทธิ์เอง

## ผลทดสอบและสถานะการส่งมอบ
- [GitHub Actions R43-F ทดสอบฐานจำลอง + Chromium ผ่าน](https://github.com/infobwd/nongkum-sports-hub/actions/runs/44006883023)
- [ทดสอบ R43-A เดิมผ่าน](https://github.com/infobwd/nongkum-sports-hub/actions/runs/44006883025), [R14 หน้าสนาม/LINE จำลองผ่าน](https://github.com/infobwd/nongkum-sports-hub/actions/runs/44006882996), [ตรวจข้อมูลเดิมผ่าน](https://github.com/infobwd/nongkum-sports-hub/actions/runs/44006883007)
- [PR #170](https://github.com/infobwd/nongkum-sports-hub/pull/170) เสนอแก้ 10 ไฟล์; **ยังไม่ Merge, ไม่ install SQL, ไม่ deploy Edge และไม่เปิด R43 production**
- ตรวจ Supabase Meeting จริงหลังพัฒนา: R33 active 236, R32 approved 43 (เพิ่มจากการตรวจต้นทาง 41 โดยไม่ได้เกิดจาก PR นี้), R43 active roles 0, R43 requests 0
- [ ] ยังต้องตรวจบัญชีเจ้าหน้าที่จริงอย่างน้อยสองคน, รับรองสิทธิ์, ติดตั้ง SQL, deploy gateway, ตั้งค่า public auth config และทดสอบอุปกรณ์จริง ก่อนเปิดใช้งาน
