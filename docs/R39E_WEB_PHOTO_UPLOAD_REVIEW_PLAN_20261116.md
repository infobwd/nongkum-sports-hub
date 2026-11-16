# R39-E — อัปโหลดภาพกิจกรรมผ่านหน้าเว็บ, ตรวจภาพ, เผยแพร่รูปที่อนุมัติ
วันที่: 16 พฤศจิกายน 2569 | ต่อยอด R39 A–D จาก main PR #157 (merge `383b85ef2a152e8321323f06dca20df4089106fb`)
สถานะ: แผนในสาขาใหม่ก่อนพัฒนา; ยังไม่ Merge / deploy / ตรวจรับ

## ตรวจข้อมูลจริง
- R39-C/D มี `public-activity-media.json` แบบว่างและตัวอ่านภาพอนุญาตจากไฟล์ใน GitHub; ไม่มีอัปโหลดออนไลน์
- มี R34 editor session 6h และ R37 reviewer session 6h คนละรหัส/บทบาท; ใช้ session ที่ตรวจฝั่งเซิร์ฟเวอร์ ทุกคำขอห้ามส่งรหัส PIN ไปยัง endpoint ใหม่
- Supabase Meeting project `zprxvpfkvforoxrboqiv` มี bucket `meeting-evidence` (private): ไม่ใช้/ไม่แตะข้อมูลประชุมเดิม
- ตารางแข่ง `public.nongkum_schedule_fixtures` active มี 236 รายการ; ผูกภาพด้วย fixture_id, sport_id, division ที่เทียบกับ source_key ที่ active
- รูปนักเรียน/ข้อมูลส่วนตัวต้องตรวจการอนุญาตก่อนเผยแพร่; ไม่เผยแพร่ภาพใบคะแนน ใบเซ็นชื่อ
- PR ที่มีอยู่ #144 R33 และแผนสูจิบัตรหลาย PR — หลีกเลี่ยงแก้ไขตาราง/ผัง/ผลแข่งขัน/สูจิบัตร; ไม่มีการแก้ผลรับรอง
- ตรวจแนวทาง Supabase: private buckets, file size/type restrictions, signed URLs have limited lifetime; สื่อสาธารณะเป็นไฟล์แยกจากภาพรออนุมัติ

## R39-E1 — Backend image intake
1. สร้าง bucket `nongkum-sports-photo-pending` private และ `nongkum-sports-photo-public` public (เฉพาะรูปที่อนุมัติ), รองรับ `image/webp` ไม่เกิน 350 KB, ไม่มีสิทธิ์ anonymous write; ห้ามใช้ `meeting-evidence`.
2. ตารางส่วนตัวสำหรับภาพที่รอตรวจ เก็บ id, fixture_id, sport_id, division, caption, object path, status, image bytes, revision, submitted/reviewed-at/by และ audit; ไม่เก็บหรือเผยแพร่ PIN/hash ใน public.
3. Edge Function `nongkum-sports-photos` ตรวจ Origin, POST, size/file signature, token 6h ฝั่ง SQL, จำกัดจำนวนภาพต่อ session/day, rate-limit แบบ DB; ไม่เก็บ service key ใน browser.
4. อัปโหลดผ่านมือถือโดยย่อขนาดและแปลง WebP ใน browser (ลบ EXIF) ก่อนส่ง; เช็ก MIME/magic และปฏิเสธไฟล์เกินเกณฑ์ฝั่ง Edge Function; ไม่มีการเผยแพร่อัตโนมัติ.

## R39-E2 — Reviewer and live display
1. หน้า `photos.html` ใช้รหัสเจ้าหน้าที่จาก R34, ค้นเลือกกิจกรรมจาก program 236 fixtures โดยแสดงรุ่น ชนิดกีฬา วันที่/สนามตามข้อมูลต้นทางอย่างระมัดระวัง, แสดงตัวอย่างก่อนส่ง, caption และยืนยันว่ามีสิทธิ์ส่งภาพเพื่อตรวจ.
2. หน้า `review-photos.html` ใช้ reviewer session R37 (แยก role), รายการรอตรวจ, ดูภาพผ่าน URL private อายุสั้น, checkbox ยืนยันได้ตรวจความยินยอมก่อนกดอนุมัติ/ส่งกลับพร้อมเหตุผล.
3. หลังอนุมัติ Edge Function คัดลอกภาพจาก private ไป public และอัปเดต public-approved metadata แบบ transaction ที่สามารถตรวจย้อนหลัง; รูปใหม่แทนรูปเก่าต้องมี revision/audit.
4. `js/activity-media-r39.js` อ่าน public-approved Supabase feed แบบ read-only แล้วแสดงรูปเฉพาะ `fixture_id/event_id` ที่ sport+division ตรงบนการ์ด; fallback WebP เดิมเมื่อไม่มีภาพผ่านตรวจ; เปิดได้ใน Safari/Chrome/LINE.
5. รองรับการถอนเผยแพร่และลบไฟล์ public (best-effort + แจ้งเรื่อง CDN cache), ไม่แสดง ID/private path ในผลสาธารณะ.

## QA / security / release gate
- RLS และ grants: อ่านสาธารณะเฉพาะ approved public table; ไม่ให้ anon/authenticated อ่าน pending/audit หรือเขียน Storage.
- ไม่ทำ bulk upload, no CORS wildcard, no public secret, rate limit ต่อ session/day, no uploaded original metadata, enforce file shape and size server-side.
- ทดสอบ invalid token, expired token, duplicate, rejected, unverified consent, mismatched fixture, wrong sport/division, spoofed SVG/PNG/WebP, oversized bytes, preview/private access, rollback errors.
- บันทึกแผนก่อน code; ทดสอบในสาขาแยก, เปิด PR พร้อมหลักฐาน; **ห้าม Merge หรือ deploy production ก่อนอนุญาตและ QA**.
- ตอน PR ยังไม่ได้ Merge ระบบหน้าเว็บจริงยังไม่พร้อมใช้; การทดสอบรูปบุคคลต้องใช้ข้อมูลที่อนุญาตแล้วเท่านั้น.

## ความสอดคล้องของรุ่นและเอกสาร
- ตรวจ GitHub main/PR ก่อนแก้ไข; `nongkum_schedule_active` และ `nongkum_schedule_sources` ก่อนใช้ข้อมูลการแข่งขัน, ไม่เปลี่ยนสถานะตาราง.
- รักษา R39 A–D, R32, R33, R34, R37 และเว็บสาธารณะเดิม. ใช้ชื่อเมนูภาษาไทยเข้าใจง่ายและปุ่มขนาดมือถือ.
