# R24-E — แผนตรวจรับมือถือและ Gate เผยแพร่ศูนย์สูจิบัตร 3 ฉบับ

วันที่จัดทำ: 7 พฤศจิกายน 2569  
**สถานะ: QA PLAN RECORDED / AUTOMATED BUILD PASS / MANUAL DEVICE ACCEPTANCE NOT DONE / R11E OFFICIAL RELEASE NOT APPROVED**

## 1. หลักฐานสำหรับฐานเว็บที่ Merge แล้ว

- `main` @ `5be80c7edacdd07bb5e923a3797262ae4e8a5668` ประกอบด้วย PR #120 (แผน), #121 (A/B), #122 (C). [GitHub Pages build & deployment run](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42385805714) **SUCCESS** หลัง merge. นี่เป็น **deployment mechanism success** ยังไม่ใช่ browser UI acceptance.
- PR #123 R24-D (รายงานตรวจเทียบ) ยัง Draft; R24-E นี้เป็น checklist สำหรับหลังอนุญาต Merge/Deploy PR #123 แล้ว.
- โค้ดของตัวอ่านเล่ม 155 หน้ายัง **local-only** เพราะ Drive `access_not_verified`; ไม่เปิด direct URL จาก public site.
- PR #116 ผังและ PR #118 ปกยัง Draft; R11E และสิทธิ์ภาพนักเรียนยังไม่ผ่าน gate.

## 2. Device checklist ต้องมีหลักฐานจริงก่อนติ๊กผ่าน

| อุปกรณ์/เบราว์เซอร์ | กรณีที่ต้องทดสอบ | หลักฐานที่ต้องบันทึก |
|---|---|---|
| iPhone Safari | หน้าเอกสาร 3 ฉบับ; V2 41 หน้า+R23 highlight; V3 64 หน้า+R19K highlight; local-file 155, หน้า 89/19, คีย์บอร์ด/ซูม/ปัด; หน้าเทียบ/คัดลอกข้อความ | รุ่น iPhone, iOS, Safari version, วันที่เวลา, screenshot ที่ปิดข้อมูลบุคคล |
| iPhone LINE WebView | เปิดจากลิงก์แชร์; ซูม PDF, กลับการ์ด, เลือกไฟล์จาก Files, clipboard fallback, เปิดเบราว์เซอร์ภายนอกเมื่อเลือกไฟล์ไม่ได้ | LINE version, อาการ, screenshot/วิดีโอที่ไม่เปิดข้อมูลส่วนบุคคล |
| Android Chrome | ขยาย/หมุนจอ, บรรทัดไฮไลท์ตาม rect, input file, lock/reselect, หน้าเทียบและรายการโรงเรียน | รุ่นเครื่อง/Android/Chrome และหลักฐาน |
| Android LINE WebView | deep link, back, PDF.js render, file picker, share to organizer path | LINE version + รายงาน fail/pass |
| Desktop Chrome/Safari | เปิด V2+V3 คู่กัน, cross-check 155 local map, ไม่ persist sensitive data, responsive view | browser version + screenshot |

## 3. รายการบังคับสำหรับทุกแพลตฟอร์ม

1. โปรแกรม V2 กดจากรายการแข่งขัน ID เดิม 236 รายการ: เปิดตรงหน้าและไฮไลท์ที่เลือก เลื่อนไปหน้าอื่นต้องไม่มีกรอบค้าง; ตรวจคู่ฟุตบอลเลขซ้ำและรายการกรีฑาเลข 35/48
2. กรรมการ V3 (250 รายการ): เปิดตรงหน้าและไฮไลท์ถูกคน/ข้อ ไม่มีการเปลี่ยนสถานะเป็นแต่งตั้งอย่างเป็นทางการ
3. เล่ม 155: คงป้าย `ฉบับตรวจร่าง`; เลือก PDF SHA และ map SHA ตรงจึงเปิดหน้า 89 (ฟุตบอล 6), หน้า 19 (กรรมการข้อ 1.1); เปลี่ยนหน้า/ซูม/resize/หมุนจอและ file picker
4. Failure test: PDF ไม่ตรง SHA, map จำนวนไม่ครบ/พิกัดไม่ตรง, ไม่มีสิทธิ์เข้าถึง Drive, file picker ล้มเหลว, offline/CDN timeout, session reload ต้องไม่ไฮไลท์ผิดหรือแสดงไฟล์ต่อเมื่อปิดหน้า
5. R24-D report: 236 fixture + 250 committee = 486; `MATCHED 0`, `DIFFERENT 0`, `NEEDS_REVIEW 486` จนมี field-level adjudication; ข้อมูลที่ไม่พร้อมให้ fail closed, ไม่แสดงสถานะ approval
6. R19D school review: รหัสรายโรงเรียนและข้อมูลถอดรหัสต้องไม่ปรากฏใน URL, logs, GitHub หรือ public screenshot; การกดส่ง LINE ไม่สร้าง organizer acknowledgement อัตโนมัติ
7. แสดงวัน/เวลาที่ได้รับรองตาม source เท่านั้น; fixture raw 237 vs active 236, ฟุตบอลหญิง 18 พ.ย. ไม่กลับเป็นคู่ซ้ำ; ไม่ยุ่งผล/คะแนน/อันดับ
8. ตรวจสิทธิ์ผู้รับเอกสารภาพเด็ก, ข้อกำหนดเผยแพร่และ R11E ก่อนเปลี่ยน V4.2 เป็น public release

## 4. ขั้นตรวจรับ / rollback

- QA เจ้าหน้าที่บันทึก PASS / FAIL / BLOCKED รายอุปกรณ์ พร้อม URL, commit SHA, source revision, screenshot และรายชื่อผู้ตรวจในพื้นที่ private.
- หากผู้ใช้ทั่วไปเปิดเล่ม 155 ที่ไม่มีสิทธิ์ได้ ต้องหยุด release; หากฟังก์ชันใหม่ทำให้ V2/V3 ผิด ให้ rollback เฉพาะ UI R24 (ไม่ลบเอกสารต้นฉบับ)
- `CI PASS` + `Pages build SUCCESS` **ไม่ใช่** `DEVICE PASS`; รอผู้จัดลงนามรับรองก่อนเรียกงานเสร็จครบ.

## 5. R24-D2 ที่ต้องเตรียมควบคู่

- ทำ field-by-field PDF audit จาก V2 41 หน้า, V3 64 หน้า และ V4.2-I10 155 หน้าในพื้นที่มีสิทธิ์; ตรวจคู่/รุ่น/เวลา/สนามและชื่อ/หน้าที่กรรมการรายแถว; ถ้าการสกัดภาษาไทยไม่ชัด ให้ mark `NEEDS_REVIEW` และใช้ภาพตัวจริงประกอบ.
- บันทึก `MATCHED`/`DIFFERENT` เฉพาะแถวที่มี PDF revision SHA, proof page/field และผู้ตรวจรับจริง. ไม่เพิ่มสถานะ `ORGANIZER_CONFIRMED` จากการเทียบอัตโนมัติ.
- สำหรับการยืนยันรายโรงเรียน reuse R19D ที่เข้ารหัส + organizer acknowledgement แทนการสร้างระบบลงทะเบียนใหม่.

**ยังไม่มีการทดสอบโทรศัพท์จริงหรืออนุมัติเผยแพร่ PDF 155 หน้าในระยะนี้.**
