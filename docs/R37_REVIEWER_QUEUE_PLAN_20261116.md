# R37 — หน้ารวมผลรอยืนยันสำหรับผู้ตรวจ (16 พฤศจิกายน 2569)

## สถานะ / คำสั่งผู้จัด
- ผู้จัดต้องการหน้าแยกสำหรับผู้ตรวจ **แสดงรายการทันทีที่กรรมการส่งผลเข้ามา** และให้ใช้รหัสผู้ตรวจแยกจากรหัสบันทึกผล
- PLAN บันทึกก่อนแก้หน้าเว็บหรือฐานข้อมูล; ไม่ Merge หรือประกาศว่าเผยแพร่สำเร็จจนมี QA / ผู้จัดอนุญาต
- ต่อยอด R15 / R20 / R32 / R34 / R35 ไม่สร้างฐานผลสาธารณะซ้ำ

## ตรวจแหล่งจริง
- GitHub main: `js/r34-card-editor.js` ส่งผลเป็น `review` เท่านั้นผ่าน `nongkum-results-editor`; `js/results-source-r32.js` อ่านเฉพาะ `public.nongkum_published_results`.
- Meeting Supabase: `nongkum_sports.result_submissions`, `result_approval_audit`, `nongkum_sports.approve_and_publish(uuid,int,text,text,text)` และ `public.nongkum_published_results` มีอยู่แล้ว.
- ที่ตรวจ ณ 16 พ.ย. มีผลกรีฑาสถานะ `review` อย่างน้อยสองรายการ; ห้ามนำออกหน้าเว็บสาธารณะก่อนอนุมัติ
- PR #139 ซึ่งยังเป็นงานสูจิบัตร/เอกสาร อย่าแก้ไฟล์ทับงานนั้น

## ประสบการณ์ผู้ใช้
1. เพิ่มทางเข้า “ยืนยันผลการแข่งขัน” ในเมนู “เพิ่มเติม” และหน้าผลการแข่งขัน; หน้า `review-results.html` เป็นหน้าเจ้าหน้าที่แยกจากผลสาธารณะ.
2. ผู้ตรวจกรอก **รหัสที่สอง** พร้อมชื่อผู้ตรวจจริงครั้งแรก เครื่องจำเพียง token 6 ชั่วโมง, เพิกถอนได้ ไม่เก็บ PIN ในเบราว์เซอร์/GitHub.
3. เมื่อปลดล็อกแล้ว แสดงจำนวนรอยืนยัน/ยืนยันแล้ว/ส่งกลับแก้ไข, การ์ดรายการรอตรวจเรียงตามเวลาส่ง, กีฬา รุ่น คู่/รายการ อันดับ คะแนน/เซ็ต ผู้ส่งและเวลาส่ง, พร้อมปุ่มรีเฟรช; ตรวจใหม่ทุก 30–60 วินาทีเมื่อหน้าเปิดอยู่.
4. ผู้ตรวจเลือก “ยืนยันและเผยแพร่” หรือ “ส่งกลับแก้ไข” (ต้องมีเหตุผล). ล็อกปุ่มซ้ำ, ตรวจ revision ป้องกันสองคนชนกัน, และรีเฟรชคิวหลังตอบกลับสำเร็จ.
5. ผู้ชมทั่วไป **ไม่สามารถอ่านคิวรอตรวจหรือเรียก API ยืนยัน** ได้; ผลเผยแพร่ยังอ่านจาก R32 เหมือนเดิม.
6. ถ้าแก้ผลรับรองแล้ว ต้องมีเหตุผลอย่างน้อย 8 ตัวอักษรและ `revision` ใหม่; ประวัติเก่าอยู่ใน `result_approval_audit`; การส่งกลับไม่ทับผลที่เผยแพร่แล้ว.
7. รายการที่อ้างอิง R33 ไม่ใช่ source ที่ใช้งานต้องถูกพัก ไม่อนุมัติจากหน้าใหม่โดยคาดเดา.

## ความปลอดภัย/ข้อจำกัด
- Reviewer PIN ตั้งผ่านช่องผู้ดูแลปลอดภัยเท่านั้น (แฮชใน private schema) และเริ่มเป็น **disabled / ไม่มี credential**; ห้ามสร้าง PIN เดาง่ายหรือใช้ PIN ของผู้บันทึกซ้ำ
- ใช้ Edge Function แยก `nongkum-results-reviewer` และ RPC `public.nongkum_reviewer_gateway` ให้เรียกได้เฉพาะ service_role; แยก reviewer session (6 ชั่วโมง) และจำกัดการเดารหัส
- ฝั่ง backend ตรวจสิทธิ์, submission ID, revision, current active fixture/event และห้ามผลร่างออก `nongkum_published_results`; ใช้ `nongkum_sports.approve_and_publish` ของเดิมเพื่อบันทึก audit
- รหัสร่วม + ชื่อที่กรอกเอง **ไม่ใช่การพิสูจน์ตัวบุคคลระดับสูง**; ต้องให้สิทธิ์เฉพาะกรรมการที่ผู้จัดกำหนดหรือเปลี่ยนเป็นบัญชีแยกบุคคลภายหลัง
- ห้ามเปิดเผยหลักฐานส่วนตัว/ข้อมูลนักเรียน/rate-limit fingerprint/token; ไม่แก้ข้อมูล Meeting อื่น
- ยังไม่ใช้งานจริงจนกว่าจะตั้งค่ารหัสผู้ตรวจ, apply migration, deploy Edge Function, Merge PR, ตรวจ live บน Safari/Chrome/LINE และผู้จัดตรวจรับ

## ลำดับดำเนินงาน
- [x] ตรวจ source/main/backend และ PR คู่ขนาน
- [x] บันทึกแผน R37 บนสาขาแยกก่อนลงโค้ด
- [x] เพิ่มหน้า HTML/CSS/JS/mobile
- [x] เพิ่ม migration เฉพาะ reviewer credentials/sessions/actions และ server RPC
- [x] เพิ่ม Edge Function แบบ private access + regression tests
- [x] QA เบื้องต้น: JS syntax, SQL smoke transaction, permission grants, invalid-token, ผลรับรองเดิมไม่เปลี่ยน
- [ ] QA GitHub Actions + iOS Safari/Chrome/LINE และการยืนยันผลจริง (ยังไม่มีการกดรับรองผ่านหน้าใหม่)
- [ ] PR รอตรวจ, จัด credential ผ่านช่องทางปลอดภัย, deploy และทดสอบบนเว็บจริง


## บันทึกผลดำเนินงาน R37 — 16 พฤศจิกายน 2569
- **พัฒนาแล้วในสาขา:** `feat/r37-reviewer-queue-20261116`: `review-results.html`, `css/review-results.css`, `js/review-results.js`, ทางเข้าจาก `index.html` / `results.html`, Edge Function และ regression test
- **Supabase:** apply migration `20261116050648 r37_reviewer_queue_20261116` สำเร็จ; ใช้เฉพาะ sports schema ของ Meeting; มี reviewer sessions, bcrypt credential hash, throttling login, rejection audit; reviewer Edge Function ACTIVE v1; **รหัสจริงไม่เก็บใน GitHub, HTML, JS หรือ SQL migration**
- **การทดสอบภายใน:** compiler JS ผ่าน, SQL ใช้ transaction สร้าง reviewer QA session ชั่วคราวเพื่อทดสอบ status/queue และการปฏิเสธการ approve/reject ของ submission ID ที่ไม่เคยมี จากนั้น ROLLBACK ไม่มีผลปลอมค้าง; REST RPC ให้ execute เฉพาะ service_role; anon/authenticated ไม่มีสิทธิ์; anon อ่าน private table ไม่ได้; token ไม่ถูกต้องคืน expired
- **ฐานข้อมูล ณ หลังติดตั้ง:** public results คง 1 ผลรับรอง; พบผลรอตรวจ 4 รายการ (ข้อมูลเปลี่ยนได้ตามการส่งจริง); ไม่เผยแพร่หรือแก้ผลใดในรอบนี้
- **ข้อจำกัด:** หน้าเว็บสาธารณะยังไม่ merge; ผู้ใช้จึงยังเปิดหน้าใหม่จาก GitHub Pages ไม่ได้; ยังไม่มีหลักฐานทดสอบ Safari/Chrome/LINE; ชื่อผู้ตรวจเป็นชื่อที่ผู้กรอกรหัสระบุเอง ไม่ใช่การยืนยันตัวบุคคลผ่านบัญชี; รายการส่งกลับเก็บเหตุผลใน audit แต่ยังไม่มีแจ้งเตือนเหตุผลกลับหน้า R34 ผู้บันทึก; ต้องวางแผนเพิ่ม
- **ก่อนใช้งาน:** ต้องตรวจ CI PR และ Merge โดยคำสั่งผู้จัด ตรวจเว็บจริงหลัง Merge, ให้ผู้ตรวจลองเข้าใช้งานและตรวจผลที่มีหลักฐานจริง, ยืนยันว่าผลแสดงทันทีจาก R32; ห้ามเผยแพร่ผลจริงผ่านทดสอบจำลอง
