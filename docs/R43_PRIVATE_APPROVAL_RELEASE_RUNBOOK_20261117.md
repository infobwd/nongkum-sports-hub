# R43-B/C/D/E — คู่มือพัฒนาระบบคำขอแก้ตารางและกรรมการ (17 พฤศจิกายน 2569)

**งานต้นทาง:** PR #168 (R43-A) → [PR #169](https://github.com/infobwd/nongkum-sports-hub/pull/169) (stacked) · **ยังไม่ Merge / ไม่ Deploy / ไม่ตรวจรับ**

## บันทึกการติดตั้งจริง 17 พฤศจิกายน 2569

- **ติดตั้งแล้วเฉพาะฐานข้อมูล R43** ผ่าน migration `20261117021414` และ `20261117021421`, มี 7 ตารางภายใน `nongkum_sports` และ 2 RPC จำกัดสิทธิ์ service_role
- ฐาน Meeting ยืนยันว่า R33 = 236 รายการ / R32 = 41 ผล, ไม่มีผู้จัดได้รับสิทธิ์ R43 และไม่มีคำขอจริง
- ไฟล์ migration ตรง SQL ที่ติดตั้งเก็บใน `supabase/migrations/` พร้อมเลขรุ่นเดิม; ห้ามติดตั้งซ้ำ
- ขั้นตอนถัดไป (ยังไม่ใช่การเปิดใช้จริง): ตรวจบัญชี Auth + กำหนดสิทธิ์, เปิด gateway ตามหลักฐาน, ทดลอง login, อนุมัติกับผู้ตรวจคนละบัญชี และตั้งค่า `enabled` เฉพาะหลัง QA ผ่าน

## สถานะตรวจระบบก่อนพัฒนา
- Supabase Meeting `zprxvpfkvforoxrboqiv` มี R33 active source `r33-20261116-7ba60be1-fa3269b5`, 236 รายการแข่งขันและ R32 ผลรับรอง 41 รายการ ณ ตรวจต้นทาง
- GitHub `main` และ PR #144/#159/#136/#137/#138/#139 ค้างบางส่วน; สาขานี้ไม่แก้ PR ดังกล่าว ไม่แก้ผล R32 หรือร่างสูจิบัตรต้นฉบับ
- R19 รายชื่อ 250 บรรทัดคือ **ข้อมูลร่าง** ห้ามถือว่าเป็นคำสั่งแต่งตั้ง; ไม่มีการนำรายชื่อเหล่านี้เป็นรายชื่อกรรมการรับรองในระบบใหม่

## สิ่งที่เพิ่มใน PR #169
| ระยะ | โค้ดที่จัดทำ | การทำงานและขอบเขต |
|---|---|---|
| R43-B | `supabase/proposals/r43_private_schedule_workflow.sql`, `r43_new_fixture_queue.sql`, Edge Function `nongkum-schedule-admin` | โครงสร้างข้อมูลส่วนตัวสำหรับ roles, people, requests, audit; ตรวจบัญชี Supabase Auth/สิทธิ์ฐานข้อมูล; คำขอเพิ่มรายการมีเพียง temporary UUID |
| R43-C | `js/r43-committee-inheritance.js`, `schedule-review.html` และ JS | เสนอ/ตรวจกรรมการโดยใช้ verified person ID, กำหนด scope กีฬา/รุ่น/รายรายการ, เช็กช่วงเวลาทับซ้อน, คิวคน/งานรอรับรอง |
| R43-D | `js/r43-release-preview.js`, action `approved_preview` | สร้างตัวอย่างชุดแก้ที่ตรวจ `source_key`, 236 IDs, R32 approved result locks; **ยังไม่ใช่ไฟล์เผยแพร่** |
| R43-E | `.github/workflows/r43-private-approval-qa.yml` และชุดทดสอบ | ฐาน PostgreSQL แยกชั่วคราว, browser จำลอง 320/375/390/430px, กรณีไม่ตั้งค่า Auth/ไม่มีสิทธิ์, ผลเดิมไม่ถูกแก้ |

## การเปิดใช้งานอย่างปลอดภัย (ยังไม่ได้ดำเนินการกับระบบจริง)
1. ตรวจ PR #168/#169 และชุดทดสอบให้ผ่านทั้งหมด ตรวจไฟล์ที่ PR #144/#159 อาจขัดกัน; **อย่า Merge อัตโนมัติ**
2. ใช้ Supabase CLI สร้าง migration จริงจาก SQL proposal ทั้ง 2 ไฟล์ตามลำดับ (CLI ไม่พร้อมในสภาพแวดล้อมทำงานรอบนี้); ทดลองกับฐาน **แยก** ก่อน ห้าม Apply ใน Meeting production เพื่อทดลองร่าง
3. ตรวจ RLS, grants และฐาน `nongkum_sports` ให้ anon/authenticated ไม่มี SELECT/INSERT/UPDATE ของตาราง R43; RPC `nongkum_r43_gateway` และ `nongkum_r43_new_fixture_gateway` ต้องเรียกได้โดย service_role เท่านั้น และ **ไม่ใช้ SECURITY DEFINER**
4. สร้างบัญชีผู้จัดอย่างน้อย 2 บุคคลใน Supabase Auth ที่ยืนยันตัวจริงแล้ว และกำหนดสมาชิก `nongkum_sports.r43_roles` ด้วย user UUID ผ่านผู้ดูแลเท่านั้น: ผู้เสนอ/จัดกรรมการและผู้รับรองต้องแยกกัน แม้คนหนึ่งได้รับหลายสิทธิ์ก็ไม่อาจรับรองคำขอของตัวเอง
5. Deploy `nongkum-schedule-admin` โดยเก็บ `SUPABASE_SERVICE_ROLE_KEY` เฉพาะใน Edge Function และใช้ explicit `/auth/v1/user` verification ในโค้ด. ปิด default verify_jwt ของ gateway เฉพาะเมื่อแน่ใจว่า own token validation ทำงาน; ตรวจการปฏิเสธ token ผิด/หมดอายุ
6. สร้าง **ไฟล์ตั้งค่าสาธารณะ** `data/r43-public-auth-config.json` หลังการติดตั้งและตรวจสิทธิ์จริงเท่านั้น ด้วยโครงสร้าง:

```json
{
  "enabled": false,
  "supabase_url": "https://zprxvpfkvforoxrboqiv.supabase.co",
  "edge_url": "https://zprxvpfkvforoxrboqiv.supabase.co/functions/v1/nongkum-schedule-admin",
  "publishable_key": ""
}
```

   แทนด้วย **publishable/anon client key เท่านั้น** เมื่อผ่านความปลอดภัย (ห้ามใส่ service role หรือ secret key), เปลี่ยน enabled เป็น true หลังทดสอบ; ถ้าไฟล์หายหรือ false หน้า `schedule-review.html` ปฏิเสธการใช้งานโดยอัตโนมัติ
7. **ไม่เปลี่ยน R34/R37** (การบันทึก/รับรองผล) และไม่แก้ Meeting app ฝั่งอื่นที่ไม่เกี่ยวข้อง. ไม่ใช้ PIN ผู้บันทึกผลหรือรหัส SMIS เป็นสิทธิ์จัดตาราง

## การทำงานของเจ้าหน้าที่
- `more.html` → **เตรียมแก้ตารางและกรรมการ** (R43-A) → ดาวน์โหลดไฟล์ส่วนตัว; ถ้าต้องส่งให้ระบบจริงต้องเข้าสู่ `schedule-review.html` ด้วยบัญชี Auth ที่ได้รับสิทธิ์แยก
- ผู้เสนอเลือก fixture ใน 236 รายการ ตรวจวัน เวลา สนาม, กรอกเหตุผล+หลักฐาน → คิว `submitted`
- หากมอบหมายกรรมการ ต้องเสนอชื่อเข้า private directory → **ผู้ตรวจอีกคน** ยืนยัน person ID → จึงเลือกมอบหมายระดับกีฬา/รุ่น/รายการ; ไม่เผยแพร่ชื่อใน JSON สาธารณะ
- ผู้ตรวจดูคิว `queue`, `people_pending`, ยืนยัน `approved` หรือ `returned` พร้อมเหตุผล; ระบบเช็ก R33 active, ผลรับรอง R32, คนซ้ำ/เวลาทับซ้อน และ revision
- การเพิ่มรายการใหม่: `new_submit` สร้าง UUID ชั่วคราว, `new_review` เพียง `ready_for_bracket_check`; **ไม่สร้าง fixture ID ทางการ ไม่แก้ผัง ไม่เพิ่มแถว R33 จนกว่าจะตรวจผังกับสูจิบัตร**
- ทุกสถานะมี audit ระบุผู้กระทำและเวลา; ประวัติร่างไม่แสดงสาธารณะ

## แนวทางเผยแพร่ R43-D ที่ **ยังไม่เปิดใช้**
1. ผู้จัดตรวจ `approved_preview` (ไม่มีชื่อกรรมการ), ตรวจคำขอเพิ่มรายการที่ยังต้องตรวจผัง, ตรวจ R32 ผลรับรองจากระบบล่าสุด; ห้ามใช้เพียงข้อมูลจำลอง
2. เช็กรุ่น R33 `nongkum_schedule_active` และ SHA ต้นฉบับ `candidate_blob_sha`/`corrections_blob_sha`, เทียบกับไฟล์ `main` และการเปลี่ยนใน PR #144 ที่ยังไม่ Merge
3. สร้าง preview `candidate_not_published` โดย `NongkumR43Release.prepare`; ตรวจแถวที่แก้, จำนวน 236 ที่ไม่ถูกเพิ่มโดยไม่ตั้งใจ, ไม่เปลี่ยน fixture IDs, สถานะยืนยันวัน/เวลา/สนามแยกจากคู่/ผัง และตรวจผล R32
4. ผู้จัดรับรองรายการเปลี่ยนและหลักฐาน → เตรียม snapshot ใหม่ใน PR พร้อมลิงก์สูจิบัตร; ห้ามนำชื่อคนที่ยังไม่ได้รับอนุญาตไปลง Repo
5. อัปเดต R33 version ใน transaction **หลัง** มีกลไก compare/reconcile กับ GitHub; GitHub + Supabase ไม่สามารถทำให้เป็น atomic transaction เดียวกันได้ ต้องมี two-phase release manifest, fail-safe status และ rollback แยก
6. เมื่อได้รับอนุญาต Merge ให้ตรวจ GitHub Pages/PWA สดและตรวจรุ่นที่หน้าเว็บจริงก่อนเรียกว่าเผยแพร่; R43-B/C/D **ไม่ได้เปลี่ยน** `nongkum_schedule_active` หรือ `js/program.js` ในรอบนี้

## R43-E ตรวจรับที่ยังเหลือจริง
- ต้องใช้เจ้าหน้าที่ 2 บัญชีจริงเพื่อทดสอบยืนยันตัวตนและแยกสิทธิ์
- ต้องตรวจ iPhone Safari, Android Chrome, เบราว์เซอร์ใน LINE, PWA online/offline, safe area, แถบเมนู 4 ช่อง, ปุ่มบันทึกผล R34, PDF และลิงก์ลึก
- ทดสอบปฏิเสธรายการที่มีผลรับรอง, คำขอซ้ำ, การเปลี่ยนรุ่น R33 ระหว่างส่งคำขอ/รับรอง และการคีย์รายชื่อกรรมการจากร่างที่ไม่มี person ID verified
- สำเนาเวอร์ชันและบันทึกการตรวจรับต้องไม่อยู่ใน repo สาธารณะหากมีข้อมูลบุคคล
- **อย่าอ้างว่าระบบใช้งานจริงหรือผ่านตรวจรับอุปกรณ์จริง** จากผล Chromium/Linux CI

**สถานะปัจจุบัน:** พัฒนาโครงสร้างและส่วนตรวจจำลองบน PR #169; **ยังไม่ติดตั้งฐานจริง, ไม่ deploy Edge, ไม่ Merge, ไม่เผยแพร่, ไม่ตรวจรับสนามจริง**


---

## ภาคผนวก R43-F (รอ Merge และติดตั้ง) — การใช้รหัสผลแข่งเดิม

ข้อเสนอในแผนเดิมที่ระบุว่า "ไม่ใช้ PIN ผู้บันทึกผล" ให้ตีความเป็น **ห้ามให้ PIN เพียงอย่างเดียวสร้างตัวตนหรือสิทธิ์ผู้จัดตาราง**; R43-F เพิ่มการใช้ token R34/R37 เดิมเฉพาะเมื่อผ่าน Supabase Auth และได้รับสิทธิ์ R43 ตามบุคคลจริงแล้วเท่านั้น. ข้อกำหนดเรื่อง separation of duties, RLS, audit, R32 lock และ approved-not-published ยังคงเดิมทั้งหมด

1. ตรวจ [แผน R43-F](R43F_SHARED_RESULTS_PIN_ROLE_BRIDGE_PLAN_20261117.md) และ PR #170; ต้องผ่าน SQL synthetic/Chromium QA ก่อน Merge
2. ผู้ดูแลยืนยันตัวตนและเพิ่มอย่างน้อย 2 UUID คนละคนใน r43_roles: ผู้เสนอ/จัดกรรมการ และผู้ตรวจคำขอ; **ห้ามมอบสิทธิ์อัตโนมัติตามการรู้รหัส PIN**
3. ตรวจและติดตั้ง supabase/proposals/r43_shared_results_pin_bridge.sql เป็น migration ที่ตรวจรับแล้วด้วยระบบ Supabase ตามขั้นตอนเดิม; ทดสอบ EXECUTE เฉพาะ service_role และการยกเลิก session จาก R34/R37
4. Deploy nongkum-schedule-admin ที่ผ่าน QA; ฟังก์ชันนี้ต้องตรวจ Auth JWT ของผู้ใช้ และตรวจ PIN session สำหรับแต่ละ action ด้วย RPC แบบ service-role เท่านั้น; ไม่ส่ง PIN session token เข้า R43 request/audit
5. หลังผ่านการทดสอบกับเจ้าหน้าที่ 2 คน ค่อยเปิด data/r43-public-auth-config.json ด้วย publishable key เท่านั้น; ห้ามเผยแพร่ service-role/secret ใน Repo
6. ตรวจการใช้ session R34/R37 ที่เหลือเวลาไม่เกิน 6 ชั่วโมงบนมือถือ หากหมดอายุ/revoke ต้องปฏิเสธทุกคำสั่งใหม่; ผู้เสนอยังรับรองคำขอตนเองไม่ได้แม้มีทั้งสองรหัส
7. ตรวจ iPhone Safari, Android Chrome, LINE, PWA และหน้าผล R34/R37 ไม่กระทบ ก่อนบันทึกตรวจรับงานจริง

**ก่อนผ่านขั้นตอนข้างต้น:** R43-F ยังเป็นข้อเสนอและโค้ดบน PR เท่านั้น ไม่ได้เปิดให้แก้ตารางหรือรับรองคำขอผ่านเว็บไซต์จริง
