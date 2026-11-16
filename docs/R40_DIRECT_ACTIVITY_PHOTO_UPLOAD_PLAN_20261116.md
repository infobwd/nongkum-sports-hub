# R40 — อัปโหลดภาพกิจกรรมผ่านเว็บไซต์ (ส่วนตัวก่อนอนุมัติ)
วันที่วางแผน: 16 พฤศจิกายน 2569
สถานะล่าสุด: PR #158 และ #160 Merge แล้ว · หน้าเว็บและ Supabase R40 ติดตั้งแล้ว · ยังไม่ตรวจรับด้วยบัญชีเจ้าหน้าที่และโทรศัพท์จริง

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
- [x] ตรวจ SQL/RLS/สิทธิ์รับภาพและ Deno TypeScript + runtime mocked binary ผ่านใน PR #160; ตรวจสิทธิ์หลังติดตั้ง Supabase แล้ว.
- [ ] ทดสอบ Safari/Chrome/LINE และ Android บนโทรศัพท์จริงด้วยภาพทดลองที่ไม่มีนักเรียน.
- [x] PR #158 และ PR #160 Merge แล้ว; PR #160 Merge commit `c9623d94c185f1f259a3de2bd38a76255586737c`.
- [x] ติดตั้ง migration `r40_activity_upload_private_20261116` และ Edge Function `nongkum-activity-photos` รุ่น 1 (`verify_jwt=false`, ตรวจ session เอง) และตรวจหน้าเว็บจริงแล้ว; **ยังไม่ใช่ตรวจรับการส่งภาพจริง**.
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

## R40-B — คำสั่งแก้ Android/QA และ Merge (16 พ.ย. 2569)
สถานะเริ่มงาน: วางแผนแล้วในสาขา PR #160; ห้ามอ้างว่าเปิดใช้จริงก่อนทดสอบปลายทาง

1. แก้บั๊ก Edge Function: คอมเมนต์มี `\\n` เป็นข้อความจริง ทำให้ `body` ของคำขอ Storage ถูกคอมเมนต์ และ static `deno check` ไม่จับการส่ง body หาย; เพิ่มการทดสอบ runtime/mock upload รวมทั้ง regression gate ให้ตรวจ request body เป็น `ArrayBuffer` ที่มีไบต์ตรงภาพ.
2. ปรับมือถือ Android / Chrome / LINE: แยกปุ่มถ่ายภาพกับเลือกรูป, รองรับไฟล์จากเครื่องที่ไม่แจ้ง MIME โดยให้ถอดรหัสและแปลงด้วย Canvas ก่อนเสมอ, เพิ่มสถานะขณะย่อ/ป้องกันแข่งระหว่างเลือกไฟล์และส่ง, แจ้งข้อผิดพลาดให้ชัด; ไม่อนุญาต SVG และไฟล์ที่เซิร์ฟเวอร์ไม่ตรวจ.
3. ความปลอดภัยไม่ถอยหลัง: bucket `nongkum-activity-intake` private, service role เฉพาะ Edge, ใช้สิทธิ์ผู้บันทึก/ผู้ตรวจแยกกัน, จำกัดไฟล์ 350 KB, 15 รูป/session/ชั่วโมง, ไม่แตะ `meeting-evidence`, ไม่เผยแพร่อัตโนมัติ. ตรวจ SQL และการจับคู่กับ R33 ที่ใช้งานจริง.
4. ตรวจ PR #159 ซึ่งเป็นงานชน ห้าม Merge หรือ deploy ระบบของ PR #159 ทับ `nongkum-activity-photos`; คง PR #160 เป็นสาขาต่อเนื่องไม่สร้าง PR ซ้ำ.
5. เมื่อ QA ผ่าน ตรวจ head SHA และ Merge PR #160 ตามคำสั่งผู้จัด; ตรวจ CI, GitHub Pages และลิงก์จริง. การติดตั้ง Supabase ให้แยกสถานะ deploy กับ mobile acceptance หลังตรวจ live permissions.
6. ภาพ Google Play Protect ที่ผู้ใช้แจ้ง เป็นคำเตือนจากตัวติดตั้งแอป Android/แพ็กเกจ APK ไม่ใช่หลักฐานว่าเว็บหรือระบบอัปโหลดติดมัลแวร์; อย่าชวนปิด Play Protect ให้ใช้เว็บ HTTPS หรือ Chrome PWA และตรวจเส้นทางการติดตั้งที่สร้าง APK แยก.

**เกณฑ์ตรวจรับ:** mock upload ต้องเห็นไบต์ภาพจริง; JavaScript lint/syntax + Deno check และ R40/security/validate regression ผ่าน; หลัง deploy ต้องทดสอบ upload→queue→private preview→approve/reject และการปฏิเสธ anonymous/ผู้ส่งไม่มีสิทธิ์อนุมัติ; Safari/Chrome/LINE และ Android จริงยังถือว่า *รอตรวจรับ* จนมีหลักฐาน.


## รายงานหลัง Merge / ติดตั้ง Supabase จริง — 16 พ.ย. 2569
- GitHub [PR #160](https://github.com/infobwd/nongkum-sports-hub/pull/160) Merge ด้วย SHA `c9623d94c185f1f259a3de2bd38a76255586737c`. ชุด R40 Private Photo Security QA, Validate draft data และ R14 field-ready schedule and LINE ผ่านบนหัวสาขา `8ae8911fe6bc0bf22161c8cd58a381170718324a`.
- ติดตั้ง migration R40 จากไฟล์ `supabase/migrations/20261116074000_r40_activity_upload_private.sql` ใน main สำเร็จ; สร้าง private bucket `nongkum-activity-intake` (WebP/JPEG ไม่เกิน 350,000 bytes), ตาราง `nongkum_sports.activity_photo_submissions` (RLS enabled), และ RPC `public.nongkum_activity_photo_gateway` (ให้ execute เฉพาะ `service_role`).
- Edge Function `nongkum-activity-photos` deployed รุ่น 1 สถานะ ACTIVE, `verify_jwt=false` เนื่องจากใช้โทเคน session แบบเฉพาะงาน R34/R37 ซึ่ง Edge+RPC ตรวจสิทธิ์ทางเซิร์ฟเวอร์เอง; ไม่แก้การตั้งค่า R34/R37 เดิม.
- ผลตรวจ SQL หลัง deploy: `anon` และ `authenticated` ไม่มีสิทธิ์ execute RPC; `anon` อ่านตารางภาพไม่ได้; `authenticated` เพิ่มข้อมูลตารางภาพไม่ได้. คำสั่ง `queue` และ `prepare` เมื่อใช้โทเคนทดลองที่ไม่อยู่ในระบบตอบ `expired`; ไม่มีรายการในตารางหรือไฟล์ใน bucket กีฬา. Bucket `meeting-evidence` ของระบบประชุมเดิมยังอยู่.
- Supabase Security Advisor แจ้ง `RLS enabled, no policy` ของตาราง R40 เป็นไปตามข้อกำหนด service-role-only/private; ยังมีคำเตือนด้านความปลอดภัยอื่นของระบบเดิมซึ่งงานนี้ไม่ได้แก้.
- อ่านหน้าเว็บจริง `https://infobwd.github.io/nongkum-sports-hub/upload-photos.html` และ `review-photos.html` ได้; ตรวจ HTML ของหน้าอัปโหลดจริงว่ามีปุ่มกล้องและเลือกภาพจากเครื่อง. ไม่ได้ทดสอบ hardware camera หรือใช้ PIN ของผู้จัด.
- **คงสถานะยังไม่ตรวจรับมือถือ**: ต้องใช้โทรศัพท์ Android/Chrome/LINE และ Safari จริง กับภาพทดสอบที่ไม่มีนักเรียน ผ่านเส้นทางผู้ส่ง→คิว→ผู้ตรวจ→อนุญาต/ส่งกลับ; ตรวจว่ารูปส่วนตัวไม่ปรากฏในหน้าเผยแพร่ก่อนผู้จัดคัดเลือก.
- **ปัญหาคำเตือน Google Play Protect** ยังเป็นงานแยกด้านการติดตั้งแพ็กเกจ Android; การปรับหน้าเว็บไม่ได้แก้แอป APK ที่ระบบ Android แจ้งเป้าหมายเวอร์ชันเก่า ห้ามแนะนำให้ปิด Play Protect.
- PR #159 ยังเป็นร่างที่ชนชื่อ Edge/bucket แต่สัญญาต่างกัน; **ห้าม Merge/Deploy ทับ** โดยไม่ได้เทียบและปรับให้เข้ากันก่อน.
