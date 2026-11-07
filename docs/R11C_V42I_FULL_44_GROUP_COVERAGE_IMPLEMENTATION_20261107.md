# R11C V4.2-I6–I9 — แผนขยายผังสายครบ 44 กลุ่ม / Full Coverage (review only)

วันที่: 7 พ.ย. 2569  
สถานะ: **IMPLEMENTATION PLAN FIRST** (ก่อนลงมือแก้ตัวสร้าง)  
Branch: `feat/r11c-v42i-full-bracket-coverage-20261107`  
main เริ่มงาน: `72ef7f63516f3df3d9489ca2fb3b58306705637b` (PR #113 MERGED; ผู้จัดเห็นชอบรูปแบบตัวอย่าง PDF 3 หน้าแล้ว)

## ตรวจแผน/งานล่าสุด
- [แผน V42-I หลัก](R11C_V42I_SYMMETRIC_BRACKET_VISUAL_REVIEW_PLAN_20261107.md): ใช้แบบสองฝั่ง เส้นเข้า `VS` กลาง; หมายเหตุและสัญลักษณ์รอผู้จัดตรวจ
- [ผลต้นแบบ](R11C_V42I_A4_BRACKET_PREVIEW_QA_20261107.md), [PR #113](https://github.com/infobwd/nongkum-sports-hub/pull/113): ต้นแบบ 8 ทีมที่ข้อมูลครบ, เปตองที่อ้างคู่ผิด, ชักเย่อ 7 ทีม + bye; CI PASS
- [V42-E/H](R11C_V42E_BRACKET_COVERAGE_QA_20261107.md): ความสัมพันธ์ source-based และรายการตรวจ 6 กลุ่มห้าม auto-fix; คงภาคผนวก V3 17 หน้า
- [งานปก G2](R11C_V42G2_COVER_REVISION_FOOTER_AND_REMAINING_WORK_20261107.md) อยู่คนละสาย; ไม่แก้ `v42_cover.py` หรือรูปภาพเอกชน
- อ่าน candidate JSON ล่าสุดบน `main`: 237 raw entries / 186 effective match fixtures + 50 กรีฑา = 236 effective entries; กลุ่ม `sport_id + division` ที่มี match รวม **44 กลุ่ม** (9 sport IDs รวมกรีฑา; ไม่สร้างผังกรีฑา).

## เป้าหมายรอบนี้ (I6–I9)
1. สร้างตัวจัดประเภทกลุ่มอัตโนมัติจากข้อมูลจริง: `8-team knockout`, `7-team bye`, `direct-final`, `pool/round-robin`, `mixed league+final`, `semifinal+final`, `nonstandard safe fallback`; ห้ามสร้างผล, คู่, ชื่อ, เวลา หรือทีมบายโดยคาดเดา
2. สร้าง HTML รวมผัง **ทุก 44 กลุ่ม** สำหรับพิมพ์ A4 review-only จากตัวสร้างเดียว; ใช้กราฟิกสองฝั่งสำหรับ 4→2→1 และ 3→2→1 เท่านั้นเมื่อมีหลักฐาน; แบบอื่นใช้ตารางคู่จริงอ่านง่าย
3. ติด `⚠` ตาม `fixture.id` / คู่ที่ต้องตรวจ, แสดง `ⓘ` บายจริง, เชื่อมเส้นจาก `verified_links` เท่านั้น; กรณีข้ามรุ่น/หมายเลขซ้ำให้เห็นจุดรอตรวจโดยไม่ลากเส้นยืนยัน
4. บันทึก manifest ต่อรุ่น: sport/division, topology, fixture IDs, count, verified edges, blocked/review issues, source version; QA ต้องครอบคลุม 186 fixture IDs *เพียงครั้งเดียว* และ 44 กลุ่ม, ไม่มี orphan/duplicate; ชี้หมายเหตุการตรวจ V42-H ทั้ง 6 กลุ่ม
5. พิมพ์ PDF review A4 แบบไม่ใช้ภาพเด็ก/สีโรงเรียนสมมติ และทดสอบข้อความไทย, สีขาวดำ, ขอบกระดาษ, เลขคู่/ชื่อทีม, Safari/LINE (การตรวจมือถือจริงยังต้องผู้จัด)

## แยกเฟสและไฟล์ที่ไม่ควรชน
- I6/I7/I8/I9 รอบนี้: เพิ่ม `scripts/docs/v42i_full_bracket_review.py`, เพิ่ม `scripts/docs/test-v42i-full-coverage.py`, เพิ่ม GitHub Actions review-only และรายงาน QA หลังทดสอบ; reuse `v42_brackets.analyze` / `v42i_bracket_preview`. หากจำเป็นแก้เพียงโมดูลผังและ test ไม่แตะ builder หลัก.
- I10 งานรวมลงสูจิบัตร full PDF ให้เป็น **PR แยก** หลังทวน main/งานปกล่าสุด และทำ regression 236/250/486/17 + anchors + 125-page baseline. ไม่เปลี่ยน GitHub Pages หรือ Google Docs/Drive เอง.
- ไม่แก้ `data/program-from-pdf-2569-20261104-draft.json`, `js/program-corrections.js`, `public-results.json`, `v42_cover.py`, `build-v4-full.py`, PDF live, และคำสั่ง/ผู้ตัดสิน

## Publication/acceptance gate
- **เห็นชอบรูปแบบ** ≠ ยืนยันความถูกต้องของเลขคู่และทีมในทุกสาย
- V42-H 6 หมวดเป็นรายการที่ต้องตรวจ (ชักเย่อ 7 ทีมเป็นหมายเหตุ, ยิงจุดโทษเป็นข้อผิดจากการถอดข้อความ); ห้ามแก้ข้อมูลกลางอัตโนมัติ
- I6–I9 ทดสอบสำเร็จและ Merge ได้เมื่อผู้จัดอนุญาต; แต่ **R11E และงานรวมเล่มยังต้องตรวจรับก่อนเผยแพร่**.
