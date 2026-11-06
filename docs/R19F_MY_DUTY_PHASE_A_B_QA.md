# R19-F — My Duty Phase A/B | QA และบันทึกส่งมอบ (6 พ.ย. 2569)

**Repository:** `infobwd/nongkum-sports-hub`  
**แผน:** [R19F_MY_DUTY_PHASE_A_B_PLAN.md](R19F_MY_DUTY_PHASE_A_B_PLAN.md)  
**PR:** [#55](https://github.com/infobwd/nongkum-sports-hub/pull/55) — MERGED 6 พ.ย. 2569, 15:50 น. ประเทศไทย, merge SHA `a771837173bee07143951324ec06c537deded7f2`  
**สถานะ:** โค้ด Phase A/B อยู่บน `main` + CI PASS; **ยังรอการตรวจรับ GitHub Pages และมือถือ/LINE ด้วยอุปกรณ์จริง**; ไม่ใช่การรับรองคำสั่งกรรมการ

## 1. หลักฐานตรวจจาก main / PR

- `committee.html` มีส่วน **หน้าที่กรรมการของฉัน** ก่อนแผงภาพรวม, รองรับเลือกโรงเรียน ค้นชื่อ ผลรายการชื่อ และรายการหน้าที่
- `js/committee.js`: `teacherMatches`, `teacherAssignments`, `sportSchedule`; เชื่อมโปรแกรมแบบ read-only และแยกข้อผิดพลาด ไม่ทำให้ข้อมูลกรรมการหายเมื่อกำหนดการแข่งขันโหลดไม่ได้
- `css/committee.css`: ปรับ 1 คอลัมน์บนมือถือและ input/ปุ่มพื้นที่สัมผัส
- รักษามุมมองรายงานเดิม 4 แท็บและทางไป `committee-review.html`; ไม่มีการเขียนกลับ JSON/ฐานข้อมูลจากหน้า My Duty
- ไม่แก้ `data/committee-2569-draft-public-review.json`, `data/program-from-pdf-2569-20261104-draft.json`, `committee-review.html`, `results.html`, `standings.html`

## 2. CI ที่ตรวจแล้ว — ผ่าน

ณ SHA หลังแก้จุด QA `f5070aea8d4b5fab3485d706717f0593217bab20`:

| GitHub Actions | ผล |
|---|---|
| Validate draft data | PASS |
| R19-A/C committee report | PASS |
| R14 field-ready schedule and LINE | PASS |

ชุดทดสอบใหม่อยู่ที่ `scripts/committee/test-my-duty-r19f.mjs` และถูกเรียกใน `.github/workflows/validate.yml`.

กรณีสำคัญที่ทดสอบ: ค้นชื่อเฉพาะโรงเรียน, ชื่อที่มีหลายบรรทัดหน้าที่ไม่สูญหาย, ไม่จับคู่ข้ามโรงเรียน, แยกวัน confirmed/draft, ตัวกรองข้อมูลร่างและ approved count 0, JS parsing, แสดง UI หลังโหลดและเมื่อโหลดโปรแกรมไม่สำเร็จ, คงมุมมองรายงานเดิม

### หลักฐานวันแข่งขัน

- 45 fixtures มีวัน/เวลา/สถานที่ผู้จัดยืนยันตามข้อมูลวันที่ 6 พ.ย. 2569
- เปตอง 38 รายการ: 12 พ.ย. 12 รายการ, 13 พ.ย. 12 รายการ, 16 พ.ย. 14 รายการ
- ยิงจุดโทษ 7 รายการ: 16 พ.ย.
- ฟุตบอลและกีฬาอื่นหลายรายการยังเป็นวันที่จากสูจิบัตรร่าง; **ห้าม**แสดงว่าอนุมัติแล้ว
- สถานที่สนามหลักโรงเรียนบ้านหนองกระทุ่มยืนยัน แต่ `duty_date` และ `shift_start/end` ของรายบุคคลยังไม่ได้รับรอง

## 3. QA ที่ต้องทำบนอุปกรณ์จริง (ยังไม่ผ่าน)

- [ ] เปิด `https://infobwd.github.io/nongkum-sports-hub/committee.html` บน iPhone Safari ตรวจ version ล่าสุดและค้นชื่อโรงเรียนจริง
- [ ] เปิดลิงก์เดียวกันจาก LINE WebView บน iOS/Android: เนื้อหา, keyboard, focus, ปุ่มชื่อ, เลื่อนอ่านการ์ด ไม่มีส่วนหัว/แถบล่างบัง
- [ ] เลือกโรงเรียน 8 แห่ง: ตรวจ autocomplete และผลไม่พบชื่อ/ชื่อซ้ำ; สลับโรงเรียนต้องล้างการเลือกเก่า
- [ ] เลือกชื่อครูหลายหน้าที่: ทุกบรรทัดอยู่ครบพร้อมข้อ PDF/สถานะร่าง
- [ ] กรรมการเปตอง: วันแข่งขันยืนยัน 12,13,16 พ.ย. แสดงเป็น **ข้อมูลกีฬา ไม่ใช่วันเข้าเวรครู**
- [ ] กรรมการฟุตบอล: ติดป้ายวันจากร่างที่ยังไม่รับรอง
- [ ] ฝ่ายงานทั่วไป: ไม่มีวัน/เวลาแข่งขัน inferred
- [ ] กดตรวจ/แจ้งแก้ไขไป `committee-review.html`: ยังใช้ขั้นตอนเดิม ไม่เปลี่ยนการอนุมัติ
- [ ] โหลดไฟล์ schedule ไม่ได้: ค้นชื่อ/หน้าที่จากร่างยังใช้งานและแจ้งเหตุเฉพาะวันแข่งขัน
- [ ] ตรวจคู่กับต้นฉบับสุ่มชื่อ 5 ราย/โรงเรียน + ตรวจชื่อซ้ำ/หลายฝ่ายที่เป็นบุคคลคนละราย (ห้ามสรุปจากชื่อเท่านั้น)

**ข้อจำกัดการตรวจครั้งนี้:** พยายามตรวจหน้า GitHub Pages จากเครื่องมือเรียกเว็บแล้วไม่สามารถเข้าถึง URL ได้ จึง **ไม่อ้างว่า live deployment หรือ mobile QA ผ่าน** แม้ GitHub Actions และ source ผ่าน

## 4. Gate สำหรับขั้นถัดไป

**A/B code merged, CI PASS — Awaiting live mobile acceptance.**  
ยังไม่เริ่ม Phase C และไม่อนุมานวัน/เวลาปฏิบัติหน้าที่ครูจากวันแข่งขัน; Phase C ต้องได้รับชุดมอบหมายกรรมการจากผู้จัดที่ตรวจรับได้จริง พร้อม privacy/publication gate ก่อนเผยแพร่รายบุคคล

## 5. URL ใช้งาน/ตรวจรับ

- หน้า My Duty: https://infobwd.github.io/nongkum-sports-hub/committee.html
- หน้าโรงเรียนตรวจรายชื่อ: https://infobwd.github.io/nongkum-sports-hub/committee-review.html
- PR หลัก: https://github.com/infobwd/nongkum-sports-hub/pull/55
