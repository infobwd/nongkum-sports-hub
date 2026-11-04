# R11 — ลิงก์สาธารณะส่งคำขอประกาศ + UX กองอำนวยการ (Plan-first)

วันที่ 4 พฤศจิกายน 2569 · Repository: `infobwd/nongkum-sports-hub` · baseline: `be3b4c9`  
สถานะ: implementation approved; ต้อง commit เอกสารนี้ก่อนแก้โค้ด

## ข้อตกลงหลัก
- **ทุกคนที่มีลิงก์** ส่ง *คำขอ* ได้โดยไม่ต้องมี Google Account: **ไม่มีสิทธิ์ประกาศ, ดูคิว, ดูประวัติ, เปลี่ยนสถานะ หรือดูรายชื่อผู้บรรยาย**
- **กองอำนวยการ** ใช้ Web App R10 เดิม (authenticated allowlist) ใน *อีก Apps Script deployment/project* เท่านั้น เพื่อดูคิวและกด `ready/announced/cancelled`
- Public intake คือ `apps-script/PublicRequest.gs` + `apps-script/PublicRequest.html` ใน **Apps Script project ใหม่แยกจาก** `Announcer.gs`. ห้ามรวม source สอง project เป็น deployment เดียว ห้ามแชร์ source โค้ดของ private console ให้บัญชีทั่วไป
- Public app deploy `Execute as Me`, `Who has access: Anyone`; backend เปิด Spreadsheet เฉพาะ `NONGKUM_OPS_SPREADSHEET_ID` และ **append pending-only** โดยใช้ Script Property `NONGKUM_PUBLIC_INTAKE_ENABLED=true` เท่านั้น; ไม่เปิด GET private data
- Public link คือ Google Apps Script /exec URL ที่เจ้าของ Deploy แล้วเท่านั้น; ไม่เดา URL หรือ link จาก GitHub Pages
- Public request **ไม่ได้เป็นประกาศอย่างเป็นทางการ** และห้ามนำไปเปลี่ยนผล/กำหนดการแข่งขันหรือสร้างข้อมูลรับรองโดยอัตโนมัติ

## Scope
1. **Public Request** ฟอร์ม mobile-first 3 ประเภท (เรียกนักกีฬา, ตามกรรมการ, ประชาสัมพันธ์ทั่วไป), กีฬา 9 ชนิดและโรงเรียน 8 แห่งจาก *ชื่อที่มีใน JSON ปัจจุบัน* (ใช้เป็นตัวเลือกชื่อ ไม่อ้างว่าวันเวลารับรอง); รุ่น/สนามกรอกเองได้เมื่อจำเป็นเพราะยังไม่รับรองรายการสนามตามมติ
2. **Privacy:** ห้ามขอชื่อเด็ก เบอร์ โทร อีเมล และลิงก์; plain text; คำขอทั่วไปจำกัดสั้น; ผู้ส่งได้เพียงเลขอ้างอิง/สถานะ `pending` จากคำขอ *ของการส่งครั้งนั้น* ไม่สามารถค้นคิว/สถานะภายหลังผ่าน endpoint สาธารณะ
3. **Abuse controls:** honeypot, ขนาดช่องและประเภทตรวจฝั่ง server, ปฏิเสธข้อความรูปแบบ formula/URL/email/เบอร์โทร, duplicate suppression ช่วงเวลาสั้น, Global cap ต่อช่วงเวลา, LockService, form single-submit state; rate limit ยังไม่ใช่การยืนยันตัวตนและไม่ต้านการโจมตีด้วยหลายเครื่องแบบสมบูรณ์
4. **Private Console UX:** คงสิทธิ์ server-side R10, เพิ่ม mobile tabs **คิว**/**ส่งคำขอ**, ให้คิวขึ้นก่อนเมื่อเข้าจอเล็ก, ปรับหัวกระชับ, ฟอร์มเลือกกีฬา/โรงเรียนจาก 9/8 รายการที่รู้จัก, ช่องสนามใช้คำแนะนำแต่ไม่เดาวันเวลา; ไม่ทำให้ข้อมูลเก่าหาย
5. **Safety:** public script ใช้เฉพาะ public functions `doGet` และ `nkPublicCreate`; functions อื่นต้องมี underscore suffix; private R10 backend ไม่ถูกเปลี่ยนสิทธิ์; เก็บชีทภายใน private, ไม่ใส่ Spreadsheet ID/token ใน public GitHub, ไม่เชื่อมประชาสัมพันธ์ไป `06_ประกาศ`
6. **Quality:** tests Node VM mock สาธารณะ/ส่วนตัว (create pending-only, no read/mutate RPC, invalid, duplicate, cap, safe UI), existing R5–R10 regression, CI, PR and merge only if tests pass; ผู้ดูแล Deploy และตรวจบัญชีจริงหลัง merge ก่อน GO LIVE

## Architecture
```text
Public /exec  [Project A: PublicRequest.gs + PublicRequest.html]
   └── execute as Me (service owner) + Anyone → validate/lock/limit → append pending only
                                   ↓
                         Private Ops Google Sheet
                             01_คิวประกาศ
                             02_ประวัติประกาศ
                                   ↑
Staff /exec [Project B: Announcer.gs + Announcer.html]
   └── execute as User accessing + allowlist → view all / ready / announced / cancel
```

## Acceptance
- [ ] Plan commit precedes code
- [ ] Anon intake creates exactly one pending record and created history; never reads queue or updates status
- [ ] Missing `NONGKUM_PUBLIC_INTAKE_ENABLED` → fail-closed
- [ ] Invalid school/sport/category/phone/email/link/spreadsheet formula blocked
- [ ] Duplicate/cap simulated tests; no private email/queue leaks in public HTML or response
- [ ] Internal only can mark ready/announced, existing R10 tests still pass
- [ ] Mobile tabs, accessible focus, responsive buttons, compact header, protected statuses
- [ ] PR CI pass, main CI pass, deployment verified if available
- [ ] **Live public/privileged deployments NOT claimed until owner installs & runs QA** (anybody with URL could spam otherwise)

## Rollout / rollback
- Commit plan first; build on feature branch; review tests; merge.
- Owner creates dedicated public Apps Script project and pastes PublicRequest.gs + PublicRequest.html; sets separate private spreadsheet ID; deploys as Me / Anyone, verifies result with own test (then cancels test in private queue).
- Enabling public intake requires `NONGKUM_PUBLIC_INTAKE_ENABLED=true`; disable immediately by setting false if abused. Keep old private /exec active until private UX updated via Deploy > Manage deployments.
- Rollback code by reverting R11 merge; public intake has an independent feature flag, separate deployment, and cannot be disabled by merging repo alone.
