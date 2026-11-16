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


## R40-C — ปรับแคชไฟล์มือถือหลัง Deploy (บันทึกแผนก่อนแก้โค้ด)
- **ปัญหา:** หน้า `upload-photos.html` และ `review-photos.html` ยังเรียก CSS ด้วย `?v=r40-1` และ `upload-photos.html` เรียก `js/upload-photos-r40.js?v=r40-1` ทั้งที่ PR #160 เปลี่ยน CSS และ JavaScript; มือถือที่มีแคชเดิมอาจได้โค้ดเก่าและปุ่มกล้องใหม่ไม่ทำงาน.
- **วิธีแก้:** อัปเดตตัวอ้างอิงเฉพาะไฟล์ที่เปลี่ยนเป็น `?v=r40-2` ทั้งหน้าส่งภาพและหน้าตรวจภาพ (CSS); เพิ่ม test guard ให้ URL version ใน HTML ถูกต้อง ไม่แตะข้อมูลตารางหรือผลแข่งขัน.
- **เกณฑ์ตรวจ:** R40 QA, Validate draft data ผ่าน; GitHub Pages จริงแสดง URL รุ่นใหม่; ไม่ถือว่าตรวจรับมือถือจริงจนทดสอบเครื่อง/เบราว์เซอร์พร้อมบัญชีเจ้าหน้าที่.

## R40-D — WebP optimization ตามคำขอผู้จัด (16 พ.ย. 2569)
- ผู้จัดขอให้ภาพเป็น WebP เพื่อลดข้อมูลรับส่ง: frontend เดิมเลือก WebP เป็นหลักอยู่แล้ว แต่เริ่มหยุดเมื่อไฟล์ต่ำกว่า 340 KB เท่านั้น.
- ปรับเป้าหมายการย่อให้ต่ำกว่าหรือเท่ากับ 250,000 bytes โดยปรับคุณภาพและขนาดภาพเป็นขั้น ไม่บีบภาพมากเกินจำเป็น; เพดานสูงสุด 350,000 bytes ตาม private Storage และ backend เดิม.
- ยังคง fallback เป็น JPEG เฉพาะเบราว์เซอร์ที่ส่งออก WebP ไม่ได้เพื่อ Safari/LINE; ภาพต้นฉบับต้องถูกวาดใหม่ผ่าน canvas เพื่อตัด EXIF/พิกัด และ backend ตรวจไฟล์จริงเสมอ.
- เพิ่ม regression tests ว่า WebP เป้าหมายและ cap 350 KB สอดคล้องกับหน้าอัปโหลด; ปรับ query version ของ JS/CSS เป็น r40-2 เพื่อไม่ค้างแคชเก่า.
- ไม่แก้กติกา ผลรับรอง R32, ตาราง R33, R34/R37 auth หรือ migration ที่ deploy แล้ว; ไม่เปลี่ยนสิทธิ์ bucket และไม่เปิดเผยรูปเอง.
- รอทดสอบมือถือจริงด้วยรูปตัวอย่าง ไม่มีนักเรียน และยืนยันคุณภาพภาพในสนามหลัง Merge ก่อนจัดว่า *ตรวจรับแล้ว*.


## R40-E — จดจำชื่อเจ้าหน้าที่ผู้ส่งภาพในเครื่อง (16 พ.ย. 2569)
- ผู้จัดแจ้งว่าต้องกรอกชื่อเจ้าหน้าที่ผู้ส่งภาพซ้ำทุกครั้ง จึงปรับใน PR #161 ที่กำลังพัฒนาอยู่ ไม่สร้าง PR ใหม่.
- หน้า `upload-photos.html` ให้ติ๊ก `จำชื่อในเครื่องนี้` (ค่าเริ่มต้นเปิดเพื่อความสะดวก) และมีปุ่ม `ลบชื่อที่จำไว้` พร้อมคำเตือนสำหรับเครื่องที่ใช้ร่วมกัน.
- เมื่ออัปโหลด **สำเร็จจริงเท่านั้น** ให้จำชื่อที่ผ่านการตรวจความยาว 2–100 อักขระไว้ใน `localStorage` ของเบราว์เซอร์นี้ 30 วัน; เปิดหน้าครั้งถัดไปเติมชื่ออัตโนมัติ แต่แก้ชื่อก่อนส่งได้.
- หากยกเลิกการจำหรือลบชื่อที่จำไว้ ให้ลบข้อมูลภายในเครื่องทันที; ปิดการจำต้องไม่กักชื่อใหม่ไว้. ชื่อที่เคยจำไม่ผูกกับ token การเข้าสู่ระบบหรือขยายเวลารหัส 6 ชั่วโมง.
- เก็บเฉพาะชื่อเจ้าหน้าที่ ไม่เก็บ PIN, token, ภาพ หรือข้อมูลนักเรียนเพิ่ม; ไม่ใส่ชื่อในหน้าสาธารณะ; ใช้ textContent/attribute ปกติไม่แทรก HTML.
- เพิ่ม regression QA สำหรับการอ่าน/เขียนชื่อ หมดอายุ 30 วัน ยกเลิกการจำ และกรณี localStorage ถูกปิดใช้งาน; ไม่แตะฐานข้อมูล Supabase หรือ Edge Function.
- เพิ่ม query version JS หน้าอัปโหลดเป็น `r40-3` ป้องกันโค้ดเก่าค้างบนมือถือ; สถานะยังไม่ตรวจรับ Android/LINE/Safari จริงจนมีหลักฐาน.


## R40-F — Safari JPEG ไม่ผ่าน / ค้นหารายการแข่งขันด้วย Select2 (16 พฤศจิกายน 2569)
**สถานะ: วางแผนในสาขาแยก ก่อนแก้โค้ด / ยังไม่ Merge / ยังไม่ Deploy**

### หลักฐาน
- ผู้ใช้ส่งภาพ iPhone แสดงตัวอย่าง JPEG 244 KB ได้ แต่หลังส่งขึ้น `ไม่รองรับรูปนี้` และคู่แข่งขันเป็น native select ที่ใช้ยาก
- ตรวจ Supabase Edge `nongkum-activity-photos` พบคำขอ POST จาก Safari รุ่นล่าสุดในวันที่ 16 พ.ย. 2569 15:48 น. ได้ HTTP 400; ในฐานภาพ R40 ยังไม่มี submission และไม่มีไฟล์จริง
- โค้ด R40 เดิมปฏิเสธ JPEG ที่มี APP1–APP15 หรือ comment segment ทุกชนิด แม้ผ่าน Canvas แล้ว; **สงสัย** ว่า Safari ใส่ ICC/metadata ใน JPEG ใหม่ จำเป็นต้องทดสอบ parser เพิ่ม ไม่สรุปว่าพิสูจน์ได้จาก response 400 เพียงอย่างเดียว
- โค้ด `updateFixtures()` ใช้ native select และแสดงได้เฉพาะชื่อคู่/รุ่น ไม่รองรับการพิมพ์ค้นหา; 236 รายการเดิมต้องคง fixture ID ตรงกับ R33
- `infobwd/newsletter` เป็น repo สาธารณะ; รูปนักเรียนที่ยังไม่ได้อนุญาตห้ามย้ายจาก private Supabase ไป GitHub สาธารณะ

### แผน
1. เพิ่มตัวทำความสะอาด JPEG แบบ binary ที่ **ลบ APP1–APP15/COM ก่อนจัดเก็บ** ไม่ใช่อนุญาต metadata รั่ว; ตรวจ SOI/SOF/SOS/EOI, marker length, ความกว้าง/สูง, และเพดาน 350 KB; คง WebP simple VP8/VP8L และ fail closed สำหรับข้อมูลผิดรูปแบบ
2. เพิ่ม Deno tests synthetic JPEG ที่มี EXIF/ICC/COM, ไม่มี marker ผิดรูปแบบ, oversized, compressed image; ยืนยันข้อความซ่อนถูกลบก่อนการอัปโหลด; ไม่ใช้ภาพนักเรียนในการทดสอบ และไม่แก้ SQL หรือ Bucket
3. เปลี่ยนช่องรายการแข่งขันให้ค้นได้ **ด้วย jQuery Select2 4.0.13** (jQuery 3.7.1) จาก options ใน corrected program R33, จัดชื่อคู่+รุ่น+รอบ+กรีฑาวิ่งระยะไว้ครบ, ใช้ CDN version pin + SRI เพื่อความปลอดภัย, และ fallback เป็น native select ถ้าโหลด library ไม่สำเร็จ; รองรับ Safari/LINE และ keyboard
4. ปรับรูปแบบ mobile dropdown ให้ไม่ซ้อนขอบ/หัวหน้า, รักษาการเลือก exact fixture ID, ปรับข้อความผิดพลาดขั้นอัปโหลดชัดเจน, เปลี่ยน JS/CSS cache version
5. เพิ่ม regression tests R40 และ Deno check; PR แยก รออนุญาต Merge; Deploy เฉพาะ Edge รุ่น main ที่ Merge แล้วพร้อม QA negative token/Storage และตรวจ Pages จริง ก่อนขอภาพทดลองจากเจ้าหน้าที่

### ไม่แตะต้อง
- R32 approved results / R33 fixture IDs / R34 editor session / R37 reviewer / meeting evidence
- ห้ามเผยแพร่รูปอัตโนมัติ; ไม่ย้ายรูป R40 ไป GitHub public ขณะยังไม่อนุญาต
## R40-G — อนุมัติแล้วเผยแพร่ภาพกิจกรรมอัตโนมัติ + หน้ารวมภาพรายวัน/กีฬา (16 พฤศจิกายน 2569)

**สถานะ: วางแผนแล้วในสาขา \`plan/r40g-auto-publish-gallery-20261116\` / ยังไม่พัฒนา / ยังไม่ Merge / ยังไม่เผยแพร่ / ยังไม่ตรวจรับ**

### เป้าหมายจากผู้จัด
- เจ้าหน้าที่อัปโหลดภาพที่ระบุรายการแข่งขัน → ผู้ตรวจตรวจภาพและ **อนุมัติเผยแพร่** → ระบบนำภาพที่ได้รับสิทธิ์เผยแพร่สาธารณะไปแสดงในการ์ดผลการแข่งขันของรายการนั้นเอง โดยไม่ต้องคัดลอกไฟล์หรือแก้ JSON ใน GitHub ทุกภาพ
- มีหน้า **ภาพกิจกรรม** แสดงภาพรวมตามวันที่แข่งขัน (Asia/Bangkok) กรองชนิดกีฬา และเปิดดูแยกตามรายการ/คู่แข่งขัน; รองรับภาพหลายภาพต่อหนึ่งรายการ
- คงการแปลง WebP เป็นหลัก (เป้าหมาย ≤250,000 bytes, เพดาน ≤350,000 bytes) และ JPEG เฉพาะกรณีเข้ากันไม่ได้ตาม R40-D/F

### หลักฐานระบบเดิมที่ต้องต่อยอด ไม่สร้างซ้ำ
1. PR #157 (R39) Merge: \`js/activity-media-r39.js\` อ่าน \`data/public-activity-media.json\` สำหรับภาพที่ผู้จัดเลือกและผ่านการตรวจแล้ว; ปัจจุบันรายการสาธารณะยังเป็น \`entries: []\` และ \`Map\` จำกัดภาพเดียวต่อ \`event_id\`.
2. \`js/results-renderers.js\` มีที่แสดงภาพ WebP บนการ์ดผลอยู่แล้ว แต่ใช้อ้างอิงเฉพาะ manifest สถิติดังกล่าว และแสดงเฉพาะผล R32 ที่รับรอง.
3. PR #158/#160/#161/#162 Merge: R40 รับภาพมือถือ ย่อ WebP/JPEG, ค้นหา fixture จาก R33, จำชื่อผู้ส่ง, ตรวจใน \`review-photos.html\`; ภาพอยู่ใน private bucket \`nongkum-activity-intake\` และสถานะ \`approved\` ปัจจุบันหมายถึง **อนุญาตให้ใช้ภาพในพื้นที่ส่วนตัว** ไม่ใช่เผยแพร่.
4. ตรวจ Supabase วันที่ 16 พ.ย. 2569: มี submission \`approved\` 1 รายการและวัตถุ 1 ไฟล์ใน private bucket; ห้ามนำรายการเก่าออกสาธารณะเพียงเพราะมี \`approved\`.
5. PR #163 (R41) Merge เรื่องภาพแชร์ LINE; ห้ามกระทบการสร้างภาพแชร์/ลิงก์ผลเดิม. PR #159 ยังเป็นร่างและใช้ชื่อ Edge/bucket ซ้ำกับ R40 แต่สัญญาข้อมูลต่างกัน; **ห้าม merge/deploy ทับ** จนกว่าจะตรวจและปรับความขัดแย้ง.

### แนวทางพัฒนาและขอบเขตความปลอดภัย
1. **เพิ่มการอนุมัติเผยแพร่เป็นการกระทำที่ชัดเจน:** หน้า \`review-photos.html\` ระบุชัดว่าเป็นการเผยแพร่บนเว็บสาธารณะ; ผู้ตรวจต้องยืนยันสิทธิ์ภาพ/ความยินยอมที่ครอบคลุมการเผยแพร่ภาพบุคคล โดยเฉพาะนักเรียน ตรวจความเหมาะสมและบันทึกหลักฐานภายใน (ไม่เผยแพร่หลักฐาน). แยกสิทธิ์ผู้ส่งและผู้ตรวจ R34/R37 เหมือนเดิม. สถานะ \`approved\` เดิมทั้งหมดต้องคงเป็น **อนุญาตภายใน** จนผู้ตรวจยืนยันสิทธิ์เผยแพร่เพิ่มเป็นรายภาพ. ไม่เผยแพร่ย้อนหลังอัตโนมัติ.
2. **ท่อเผยแพร่ฝั่งเซิร์ฟเวอร์หลังอนุมัติ:** ตรวจ session/role, การเปลี่ยนสถานะ, consent, fixture_id กับ R33, นามสกุลและไบต์ภาพ, ความปลอดภัย และ metadata ก่อนคัดลอก/สร้าง WebP สำหรับสาธารณะไปยังพื้นที่สาธารณะใหม่ที่แยกจาก private intake. ใช้ public object path สุ่ม/เวอร์ชัน ห้ามเปิด private bucket, private signed URL, service_role key, ชื่อ/เบอร์ผู้ส่ง หรือเหตุผลผู้ตรวจ. ย้ายเฉพาะภาพที่อนุญาตเผยแพร่แล้ว และเก็บประวัติการอนุมัติ/เผยแพร่/เพิกถอน.
3. **เผยแพร่อย่างทนทาน:** บันทึกสถานะแยก \`approved_for_publication → publishing → published\` หรือ \`publish_failed\` (ชื่อสถานะจริงให้ตกลงกับ schema ปัจจุบันก่อน migration). การอนุมัติไม่ควรตอบว่าเผยแพร่สำเร็จก่อนตรวจไฟล์และข้อมูลสาธารณะสำเร็จ; รองรับการส่งซ้ำโดยไม่สร้างภาพซ้ำ, ตรวจซ้ำ/ซ่อมการเผยแพร่ล้มเหลว, ถอดภาพหรือเพิกถอนสิทธิ์ได้ และไม่ลบหลักฐาน audit. ตรวจการอ่านแบบสาธารณะว่าเห็นเฉพาะ \`published\` เท่านั้น.
4. **แหล่งข้อมูลอ่านสาธารณะ:** ศึกษา public read-only API/วิว/รายการภาพที่เผยแพร่เท่านั้น (pagination, filtering, caching, version) เพื่อให้เว็บไซต์ GitHub Pages เห็นภาพที่อนุมัติหลังเผยแพร่สำเร็จโดยไม่ต้องแก้ \`public-activity-media.json\` ทุกครั้ง. คง fallback R39 static manifest แบบเดิมระหว่างทยอยเปลี่ยนและวางเกณฑ์การเลิกใช้. ห้ามทำ GitHub Action ที่รับไฟล์ส่วนตัวไป commit ลง repo สาธารณะโดยอัตโนมัติ.
5. **หลายภาพและข้อมูลอ้างอิง:** ใช้ id ภาพที่ไม่ซ้ำ, \`event_id/fixture_id\`, \`sport_id\`, รุ่น/เพศ/รอบจาก R33, **วันที่แข่งขันจากตารางที่เชื่อถือได้** (ไม่ใช่วันอัปโหลด), \`published_at\`, \`display_order\` และ \`is_cover\` สำหรับภาพหลักบนการ์ด. อนุญาตภาพหลายภาพต่อรายการ; คัดภาพปกตามลำดับที่แน่นอนหรือผู้ตรวจเลือกเอง ไม่ให้แผนที่ \`Map\` ภาพเดียวของ R39 ทำให้ภาพอื่นหาย. ตรวจกรณี fixture ID เปลี่ยน/ผังยังเป็นร่าง; ห้ามเดาวัน คู่ หรือผล.
6. **การ์ดผลการแข่งขัน:** นำภาพหลักที่ \`published\` เท่านั้นมาแสดงใน \`results.html\` โดยจับคู่ fixture ID ให้ตรงกับ R32; ให้แตะภาพเพื่อดูภาพอื่นในรายการได้. ไม่มีผลรับรองก็ไม่สร้างการ์ดผลปลอมหรือคะแนนจำลอง; ภาพที่เผยแพร่แต่ยังไม่มีผลแสดงได้ในหน้า **ภาพกิจกรรม** แยกต่างหาก. รูปไม่ควรบังคะแนนหรือปุ่มแชร์ LINE และคงภาพกีฬาเริ่มต้นเมื่อไม่มีรูป.
7. **หน้ารวมภาพกิจกรรม:** สร้างทางเข้าเมนูหลักหรือเมนูที่เหมาะสม โดยมี \`ทั้งหมด\` / เลือกวันที่แข่ง / ชนิดกีฬา / รายการ-รุ่น และตัวเลือกดูภาพรวมแต่ละวัน; แสดงจำนวนภาพตามข้อมูลจริง, thumbnail, ชื่อกีฬากับรายการ, เมื่อแตะภาพเปิดดูชุดภาพพร้อมปุ่มกลับ. วันอ้างอิง timezone \`Asia/Bangkok\`, ไม่เผยแพร่ภาพหรือข้อมูลบุคคลที่ไม่ผ่านการอนุญาต. รองรับมือถือ Chrome/Safari/LINE, lazy loading, การโหลดเพิ่ม และ empty/error/retry state.
8. **คุณภาพและต้นทุน:** คง WebP บนมือถือเป็นค่าเริ่มต้นตาม R40-D/F พร้อม JPEG fallback ที่ตรวจไบต์จริงและลบ EXIF/พิกัด; สร้างภาพย่อสำหรับรายการรวมเพื่อประหยัด bandwidth โดยไม่ใช้ไฟล์ต้นฉบับเต็มทุกภาพ; ตรวจการใช้โควตา storage/egress และไม่ปะปนกับ bucket \`meeting-evidence\`.
9. **การทดสอบและตรวจรับ:** ครอบคลุม positive/negative authorization (anonymous/uploader/reviewer), สิทธิ์ public consent, ไฟล์เสีย/ซ้ำ/เกินขนาด, การอนุมัติพร้อมกัน, การเพิกถอน, audit, no-leak private, fixture/date mapping, ภาพหลายภาพ/ปก/กรองวันกีฬา, fallbacks, R32/R33/R39/R40/R41 regression. ทดสอบจริง Android Chrome, iPhone Safari, LINE in-app และมือถือจอเล็กด้วย **ภาพจำลองที่ไม่ใช่นักเรียน** ก่อนเปิดใช้จริง. ตรวจ Live Pages หลัง Merge และยืนยันผู้จัดก่อนจัดว่า \`ตรวจรับแล้ว\`.

### ลำดับปฏิบัติเมื่อผู้จัดสั่งพัฒนา
- [x] ตรวจ \`main\`/PR ล่าสุดและระบบ R39/R40/R41; บันทึกแผนเพิ่มเติมในไฟล์ R40 เดิม โดยไม่สร้างแผนอัปโหลดคู่ขนาน
- [ ] ทำ data contract และ threat model ระหว่างภาพ private / การอนุญาตเผยแพร่ / public catalog; ตรวจผลกระทบ SQL, storage, Edge, R39, R32/R33, LINE, GitHub Pages, PWA cache
- [ ] ออกแบบและปรับ schema/สิทธิ์ใน migration แยกอย่างตรวจสอบย้อนหลังได้; พัฒนากระบวนการเผยแพร่และเพิกถอนแบบ idempotent
- [ ] ปรับหน้า reviewer ให้แยกอนุญาตใช้ภายในกับอนุญาตเผยแพร่สาธารณะ และแสดงผลเผยแพร่สำเร็จ/ล้มเหลวจริง
- [ ] ปรับการ์ดผลและสร้างหน้ารวมภาพรายวัน/ชนิดกีฬา พร้อมแกลเลอรีหลายภาพต่อรายการ
- [ ] เพิ่ม automated security/regression tests + mobile QA, เปิด PR พร้อมหลักฐานและให้ผู้จัดอนุญาตก่อน Merge
- [ ] Deploy และตรวจ public/private state, cache, Android/Safari/LINE กับภาพทดลอง; ให้ผู้จัดตรวจรับก่อนประกาศใช้งานจริง

### ข้อกำหนดห้ามเปลี่ยนโดยไม่ได้รับรอง
- ไม่แก้คะแนน/ผลรับรอง R32, คู่แข่งขันและวันเวลาของ R33 หรือกลไกรหัสของ R34/R37 โดยไม่เกี่ยวข้อง; ไม่สร้างผู้ชนะจากภาพ.
- ไม่เผยแพร่ภาพที่เป็นเพียง \`approved\` (R40 เดิม), ภาพนักเรียนที่ยังไม่ยืนยันสิทธิ์เผยแพร่, ภาพหลักฐานผลแข่งขันหรือภาพใน Drive ส่วนตัว.
- ไม่ merge/deploy PR #159 ที่ชนกับ R40; ไม่อ้างว่าแผนหรือ PR ที่ยังไม่ Merge คือความสามารถที่ใช้จริง.

