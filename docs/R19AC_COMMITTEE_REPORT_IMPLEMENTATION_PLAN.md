# R19-A / R19-C — แผนปรับฐานบทบาทกรรมการและหน้ารายงาน (6 พฤศจิกายน 2569)

## สถานะ
**DESIGN LOCK / ก่อนเริ่มแก้โค้ด**. ต้อง Commit แผนนี้เป็น Commit แรกของ Branch ก่อนทำ data/UI. แผนต่อจาก `docs/R19_COMMITTEE_ASSIGNMENT_REPORT_PLAN.md` และ `data/committee-roles-2569-planning.json`.

## วัตถุประสงค์
สร้างหน้ารายงาน **สารสนเทศความพร้อมกรรมการ** สำหรับผู้จัดและโรงเรียนแบบ Mobile-first ให้ดูชนิดกีฬา รุ่น ฝ่าย และโรงเรียนได้ โดยรายงานเป็นข้อมูลเตรียมการ **ไม่ใช่คำสั่งแต่งตั้งกรรมการปี 2569** และไม่ใช่ระบบรับสมัคร/ประกาศผล

## Source of truth ที่ตรวจแล้ว
1. `docs/R19_COMMITTEE_ASSIGNMENT_REPORT_PLAN.md`: 9 ชนิดกีฬา; 33 รุ่นจากข้อมูลร่าง (กรีฑารายการย่อยแยกใน candidate); แม่แบบฝ่ายจาก **คำสั่งปี 2568** 20 ฝ่าย; รายชื่อครูเต็มอยู่ใน Sheets จำกัดสิทธิ์ของ Sillapa
2. `docs/SPORTS_VENUE_AND_P08_P14_CONFIRMATION_20261106.md`: **สนามหลักโรงเรียนบ้านหนองกระทุ่มทุกกีฬา**; คำยืนยันนี้ **ไม่ครอบคลุม** การแต่งตั้งบุคคล และไม่ทำให้ทุกวัน/เวลา/สนามย่อยได้รับรอง
3. `data/committee-roles-2569-planning.json`: `assignments_2569=[]` ทุกกีฬา; ยังไม่มี approved person export
4. `index.html` และ `css/base.css`: เว็บอ่านบนมือถือ, มี fixed bottom tabs เฉพาะโปรแกรม↔ผล จึงไม่ควรเพิ่มแท็บที่สามหรือแก้ `js/navigation.js`

## Phase R19-A — Data Contract / Venue alignment
- เก็บ `legacy_2568_section` และ `legacy_2568_venue_school_id` ไว้เดิมพร้อม `legacy_venue_is_current:false` เพื่อไม่ลบหลักฐานเปรียบเทียบ
- เพิ่ม **สนามหลักปี 2569** ที่ยืนยันแล้วให้กีฬา 9 ชนิด โดยอ้างอิงเอกสารคำยืนยันใน Repo; ข้อความการยืนยันระบุเฉพาะโรงเรียนสนามหลัก (ไม่แตะสนามย่อย 1–4)
- คง `current_2569_venue` ของเปตองที่มีข้อกำหนดนอกรอบ 12–13 พ.ย. แยกจากการรับรองสนามหลักทุกกีฬา
- เพิ่ม `report_metadata` สำหรับแสดงคำอธิบาย revision/ข้อมูลรอรับรอง; **ห้าม**ใส่ชื่อบุคคลจากทะเบียนครู, `teacher_id`, เบอร์, อีเมล, Sheet ID, token หรือข้อมูลภายในลง JSON public
- ไม่เติมกรรมการเพื่อทำให้จำนวนช่องว่างเท่ากับ “จำนวนคนขาด” เนื่องจากไม่เคยกำหนด minimum staffing

## Phase R19-C — Public Mobile Report
- สร้าง `committee.html`, `css/committee.css`, `js/committee.js` และลิงก์เข้าจาก `index.html` อย่างไม่เปลี่ยนพฤติกรรมสองแท็บเดิม
- โหลดไฟล์ `data/committee-roles-2569-planning.json` โดย fetch แบบ read-only; แสดง skeleton/ข้อความโหลดไม่สำเร็จ/ปุ่มลองอีกครั้ง (ไม่ fallback สร้างข้อมูลสมมติ)
- ภาพรวม: 9 กีฬา, 20 ฝ่ายจากแม่แบบเดิม, 33 รุ่น, จำนวน **กรรมการปี 2569 ที่มีหลักฐานรับรองในฐานข้อมูลเท่านั้น** (เริ่ม 0)
- เมนูเลือกมุมมอง **กีฬา / ฝ่ายกรรมการ / โรงเรียน / สิ่งที่ต้องตรวจ**, เลือกกีฬา+รุ่น, ค้นหาข้อมูลที่แสดงได้; ค่าเริ่มต้นเหมาะกับมือถือ
- ขณะยังไม่มี `committee_approved`: แสดง “ยังไม่มีข้อมูลกรรมการปี 2569 ที่ผ่านการรับรองในชุดนี้” ไม่ใช้คำว่า “ไม่มีกรรมการ/ขาดคน” และไม่แสดงปี 2568 เป็นหน้าที่ปัจจุบัน
- แสดงโรงเรียนบ้านหนองกระทุ่มเป็น **สนามหลักที่ได้รับการยืนยัน** ของทุกชนิดกีฬา ขณะที่โรงเรียน 8 แห่งใน crosswalk เป็นโรงเรียนเครือข่าย ไม่แสดงว่าโรงเรียนนั้นได้กรรมการ
- ไม่เพิ่ม nav tab ที่สาม; จากหน้าใหม่มีลิงก์กลับตาราง/ผลชัดเจน; input 44px+; accessible labels, status aria-live, bottom padding, safe-area, reduced motion
- Public page read-only ไม่มีปุ่มยืนยันตัวบุคคล, publish, approve หรือแก้ไข source JSON

## การออกแบบตัวชี้วัดสถานะ
- นับ `legacy_committee_groups` เพื่อ **ความครอบคลุมแม่แบบ**, ไม่อ้างเป็นคณะกรรมการที่แต่งตั้งแล้ว
- นับ assignments จากข้อมูลที่ได้รับอนุญาตเผยแพร่และมี `committee_approved` เท่านั้น; หากไม่มีให้ 0 + คำชี้แจงชัดเจน
- สถานะทุกกีฬา = `not_verified` จนกว่าจะมีหลักฐานปี 2569; การยืนยันสนามไม่ใช่ยืนยันกรรมการ

## Scope guard / regression
- ไม่แก้ `data/program-from-pdf-2569-20261104-draft.json`, `data/draft-schedule.json`, `data/public-results.json`, `js/program.js`, `js/results.js`, `js/navigation.js`, `standings.html`, `results.html`, `apps-script/Results.gs`
- ไม่แก้ GitHub Actions ที่เดิมตรวจโปรแกรม/อันดับ; เพิ่ม isolated test สาย R19 หากต้องตรวจ
- แยก R19-B private reconciliation (จับคู่บุคคล) และ R19-D approved publication เป็นงานรอบถัดไป
- ไม่ sync ชื่อจาก Sillapa แบบ client-side fetch แม้ public directory มีบางชื่อที่อนุญาตให้แสดงในบริบท Sillapa

## Acceptance / QA
1. ผ่าน JSON schema/content checks, 9 sports unique, 33 divisions unique, 20 historical groups, 8 unique school IDs
2. สนามหลักของ 9 กีฬาเป็นบ้านหนองกระทุ่ม พร้อม confirmation scope; legacy venue ไม่ถูกเขียนทับ
3. all `assignments_2569=[]`, ไม่มี teacher identity, ไม่มีนับกรรมการเก่าเป็น current approved
4. หน้าเว็บ load / retry / search / filters / empty state / mobile nav links ทำงานและไม่มี XSS จากข้อมูล JSON
5. คำอธิบายสถานะ “ปี 2568 แม่แบบ / ปี 2569 รอรับรอง” ปรากฏชัด
6. regression เดิม program, results, standings ไม่ถูกแก้; ตรวจ syntax JS และ isolated tests; ตรวจ CI ก่อน Merge
7. browser iOS/Android/LINE WebView จริง **ยังต้องให้ผู้ใช้/ผู้ตรวจสนามตรวจรับหลัง Deploy** หากไม่มีอุปกรณ์ทดสอบจากเครื่องมือปัจจุบัน

## หลัง Merge
- R19-B: ตรวจชื่อครูในพื้นที่จำกัดสิทธิ์ของเจ้าของข้อมูล, ไม่ export public roster หรือจับคู่จากคำสะกดเพียงอย่างเดียว
- R19-D: ออกคำสั่งแต่งตั้ง 2569 ที่รับรองแล้ว → approved minimal public projection → report ถ้าได้รับอนุญาตเผยแพร่
