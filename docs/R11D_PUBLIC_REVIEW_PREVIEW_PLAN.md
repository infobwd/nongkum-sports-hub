# R11D — หน้าเว็บตรวจสูจิบัตรล่าสุดโดยไม่ใช้ R11B Backend

สถานะ: **PLAN-FIRST · IMPLEMENTATION IN THIS BRANCH** · 4 พฤศจิกายน 2569  
Repository: `infobwd/nongkum-sports-hub` · branch `feat/r11d-public-review-preview`  
อ้างอิง [R11A reconciliation](R11A_RECONCILIATION_2569.md) และ [data contract](SPORTS_2569_JSON_SHEETS_DOCS_CONTRACT.md)

## ข้อตัดสินใจล่าสุดของผู้จัด

- ทำ R11D **ทันที** เพื่อเปิดหน้าเว็บจริง `review.html` ให้ 8 โรงเรียน/กรรมการตรวจข้อมูลจาก PDF ล่าสุด 237 รายการ
- **พัก R11B:** ไม่ทำระบบ login, button approve, Apps Script feedback หรืออัปเดต Sheets อัตโนมัติ; ถ้าพบข้อผิดพลาดให้ส่งรายละเอียดมาในแชท ผู้ดูแล/AI ตรวจหลักฐานแล้วแก้ผ่าน Pull Request ที่มี diff และประวัติ
- คง `data/draft-schedule.json` (236) และลิงก์สั้น `m/` ของเว็บเดิมตามเดิม รวมทั้ง `data/public-results.json` approved-only
- แยกข้อมูลจาก PDF `draft_*` ออกจาก `planning_*` (เปตองนอกรอบวันที่ 12–13 พ.ย. ยืนยันเฉพาะวันและสถานที่ในข้อมูลเดิม; ไม่ทำให้เวลาใน PDF เป็น Approved)
- ไม่มีการแก้ Google Docs R11C; เจ้าของงาน Docs อ่าน revision เดียวกันได้

## Scope — ไฟล์ไม่ชนแชท R10 / Docs

- เพิ่ม `review.html`, `css/review.css`, `js/review-model.js`, `js/review.js`
- เพิ่มการ์ดเข้าหน้าตรวจที่ **หน้าโปรแกรมหลัก** (`index.html`) ด้วยลิงก์ native; ไม่แก้ข้อมูลหรือ navigation สองแท็บ R6
- เพิ่ม `scripts/ux/test-review-r11d.mjs` พร้อม CI ใน workflow แยก เพื่อให้ regression เดิมไม่ถูกลดทอน
- จัดทำคู่มือ/QA `docs/R11D_PUBLIC_REVIEW_QA.md`
- ไม่แก้ `README.md`, `apps-script/Announcer.*`, `scripts/docs/*`, `data/*`, `m/*`, `results.html`, `js/program.js`, `js/results.js` หรือ approval gate

## พฤติกรรมหน้า Review

1. โหลด **ไฟล์ JSON staging ล่าสุดจาก repo จริง** `data/program-from-pdf-2569-20261104-draft.json` (schema 3) และถ้าโหลดได้ให้ใช้ R11A `data/reconciliation/r11a-program-diff-20261104.json` เป็นตัวช่วยแสดง "เปลี่ยนจากชุดเว็บเดิม"; ไม่อ่าน Google Sheets สด
2. ป้ายเด่นตลอดหน้า: **จาก PDF ล่าสุด · ร่างรอตรวจสอบ · ไม่ใช่ประกาศทางการ**; แสดงเลข revision `pdf69-20261104-draft-r11a` และจำนวน 187 คู่ / 50 กรีฑา / 289 ลู่
3. ตัวกรองโรงเรียน/ชนิดกีฬา/ช่วงชั้น, ค้นคำ, **เฉพาะรายการมี QA**, ระบุจำนวนรายการตรงตัวกรอง; รองรับ deep link `?fixture=<fixture.id>` และ query filters
4. สำหรับ **ทุกคู่**: กีฬา/รุ่น/เลขคู่ที่พิมพ์ใน PDF, ชื่อคู่/ทีมตาม PDF, วัน/เวลา/สนามที่ **พิมพ์ตาม PDF** พร้อมคำว่า `ยังไม่รับรอง`; ถ้ามี `planning_date`/`planning_venue` ให้แสดงแยก "ข้อมูลยืนยันเฉพาะวัน/สถานที่" ไม่รวมกับเวลา PDF
5. สำหรับ **กรีฑา**: ชื่อรายการ รุ่น เลขรายการ วันตาม PDF, รายชื่อลู่ทั้งหมด พร้อมกรองโรงเรียนตาม lane (และรายการสังกัดศูนย์ฯ ต้องไม่เดาว่าเป็นโรงเรียนใด)
6. `qa_flags` คลิกดูความหมายของรหัส QA ที่เชื่อมกับ `source_qa`; ไม่ซ่อนรายการที่ผิดปกติหรือแก้ปี 2568 เป็น 2569
7. ปุ่ม **คัดลอกรายละเอียดเพื่อแจ้งแก้ไขในแชท** รวม revision, fixture ID, กีฬา, รุ่น, หน้า PDF และช่องว่างให้ใส่ข้อความที่แก้; ไม่มี backend write/Forms/approval; ปุ่มคัดลอกลิงก์หน้านี้พร้อม fixture ID
8. มี initial skeleton, first-load error และ retry, refresh แบบยังคงข้อมูลเก่าเมื่อผิดพลาด, ไม่มี splash หรือ overlay; รายการแสดงเพิ่มเป็นชุด เพื่อลดจำนวน DOM บนมือถือ
9. ไม่ใช้ innerHTML กับข้อมูลจาก JSON โดยตรง; textContent, attribute setters และ URLSearchParams เท่านั้น; ไม่ใส่ secrets, personal data หรือส่งข้อมูลไป third-party service
10. ลิงก์ที่นำไปส่งโรงเรียนคือ `review.html` หรือ `review.html?school=<id>` (ไม่ใช่ลิงก์ LINE short ของโปรแกรมเดิม 236 รายการ); เปิดหน้า review ด้วย link native จาก index

## Acceptance gates

- [ ] ดูครบ 237 รายการใน JSON ผ่านหน้า review, pagination และการกรองไม่ทิ้งรายการ
- [ ] Filter ทุกโรงเรียนทั้ง 8 / กีฬา 9 / กรีฑา 289 ลู่ ใช้ `school_id` จาก lane ไม่เดารายการรอผล
- [ ] 70 รายการ QA flags ตรวจได้, และ 3 แถว PDF 17 พ.ย. 68 แสดงตามข้อความต้นทาง
- [ ] กรณีเปตอง 24 แถวแสดงวัน/สถานที่ยืนยันแยกจากเวลาใน PDF ที่ไม่รับรอง
- [ ] Deep link `?fixture=` เปิดรายการที่แชร์จาก page 2+ ได้
- [ ] URL/clipboard ไม่บอกว่าเป็น Approved, ไม่มีระบบกดอนุมัติ ไม่แตะ `data/public-results.json`
- [ ] Existing R1–R11A regression + new R11D regression ผ่าน GitHub Actions
- [ ] QA มือถือจริง Safari/Android/LINE หลัง GitHub Pages deploy ยังต้องทดสอบโดยผู้จัด; CI ไม่เทียบเท่าการทดสอบบนโทรศัพท์จริง

## ทางแก้ข้อมูลเมื่อผู้จัดแจ้งในแชท

ข้อความตัวอย่างจากปุ่มคัดลอก: `R11D ... revision / fixture ID / หน้า PDF / สิ่งที่ผิด / ค่าที่ถูกต้อง / หลักฐานอ้างอิง`. ผู้ดูแลตรวจ source & committee decision, แก้ **candidate/master JSON ใน PR แยก** พร้อม validation และเก็บ provenance เดิม; ไม่แก้ PDF text โดยพลการ. เมื่อข้อมูลอนุมัติแล้วจึง R11E ซึ่งสลับโปรแกรมหลักและ regenerate LINE shares/Google Docs.

> เอกสารนี้เป็นแผนและขอบเขต R11D เท่านั้น ไม่ใช่การรับรองข้อมูลคู่แข่งขันหรือการยกเลิกกฎการตรวจของผู้จัด.
