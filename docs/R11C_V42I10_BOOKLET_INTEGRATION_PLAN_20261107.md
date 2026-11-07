# R11C V4.2-I10 — รวมผังสาย 44 กลุ่มเข้าสูจิบัตร V4.2 ฉบับตรวจร่าง

วันที่เริ่ม: 7 พฤศจิกายน 2569 (Asia/Bangkok)  
สถานะ: **IMPLEMENTATION PLAN FIRST / REVIEW ONLY / NEVER AUTOMATIC PUBLICATION**  
branch: `feat/r11c-v42i10-integrated-booklet-20261107`; baseline main `1fde1f171977ac8c6b2b14c0c6adb837795c6256`

## ตรวจแล้วก่อนทำ
- PR #114 รวมเข้า main แล้ว และ [ผล CI 44 กลุ่ม](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42362178473) PASS, source 186 คู่/44 กลุ่ม, ผังสมมาตร 14 กลุ่ม, fallback ตามลักษณะการแข่งขันอีก 30 กลุ่ม.
- แผน [V42-I](R11C_V42I_SYMMETRIC_BRACKET_VISUAL_REVIEW_PLAN_20261107.md) / [I6–I9](R11C_V42I_FULL_44_GROUP_COVERAGE_IMPLEMENTATION_20261107.md) / [V42-H](R11C_V42H_ORGANIZER_BRACKET_REVIEW_PLAN_20261107.md) ยืนยันหลัก "ไม่แต่งเส้น/ทีม/ผู้ชนะ" และ 6 ประเด็นที่ต้องตรวจ.
- `scripts/docs/build-v4-full.py` สร้าง PDF review ที่มีส่วนผัง V42-E แบบเก่า ตามด้วยตารางโปรแกรม รายชื่อกรรมการและภาคผนวก V3 17 หน้า; `scripts/docs/test-v42f-pdf-qa.py` ตรวจ notice PR82 11 หน้า, กติกา, 236/250/486 และเลขหน้า.
- อีกแชทดูปก/ตัวอักษร G2: **ห้ามแก้ `v42_cover.py` หรือข้อมูลภาพ**. PR ล่าสุดตรวจไม่มีเปิดค้าง ณ เริ่ม.

## วิธีรวมที่ปลอดภัย (zero-regression)
1. **แยก output ที่สร้างใหม่จาก baseline:** รันตัวสร้าง `build-v4-full.py` เหมือนเดิมเป็น PDF review baseline โดยไม่แก้ `build-v4-full.py`; ใช้ `v42i_full_bracket_review.render_all` สร้าง 44 หน้า A4 จาก JSON เดียวกัน.
2. **แทนส่วนผัง V42-E เท่านั้น** ในฉบับทดลอง โดยระบุขอบเขตหน้าจากหัวข้อ `ผังสายและการประกบคู่ใหม่` ถึงก่อน `โปรแกรมการแข่งขัน ฟุตบอล` และตรวจพบตำแหน่งเดียว. ไม่ append ซ้ำทั้งส่วนเก่าและส่วนใหม่.
3. **รักษาเอกสารที่ไม่เกี่ยวข้อง:** ห้ามเปลี่ยนหน้าปก, บทนำ, คำสั่ง PR82 11 หน้า, กรรมการ, ตารางโปรแกรม, แบบบันทึก, ภาคผนวก V3 17 หน้า และส่วนรายการตรวจ V42-H 6 กลุ่ม; ปก fallback ยังคงเป็น review (ภาพส่วนตัว G2 ไม่เผยแพร่).
4. **เลขหน้าและท้ายหน้า:** เมื่อจำนวนหน้าขยับต้องแก้เลขหน้าจริงเฉพาะหน้าที่ถูกเลื่อน และเพิ่มตรา `ปรับปรุงล่าสุด` ตาม git source-edit timestamp ที่ผ่านการตรวจ ไม่ใช้เวลาสร้างหรือเวลาปลอม.
5. **ข้อมูล/anchors:** ถอด `fixture.id`, 486 page-map anchors ไปตำแหน่งหน้าใหม่จาก original mapping โดยตรวจ token จริงอีกครั้ง; source revision, 236 effective/186 คู่/50 กรีฑา, 250 กรรมการ, 486 anchors, 17 V3 appendix, PR82 11 หน้า ต้องเท่าเดิม.
6. **QA:** ทุกหน้า A4 ไม่เปล่า; ผัง 44 หน้า ติดแถบ REVIEW ONLY และอ้างข้อมูลจริง; ตรวจ source 186/186 ไม่ซ้ำ; เทียบข้อความหน้าที่ไม่ได้อยู่ในส่วนผังแบบ no-loss; PR82 pixel parity (ยกเว้น footer source-edit) ที่ตำแหน่งหน้าไม่เปลี่ยน; footer revision 1 ครั้ง/หน้า, เลขหน้าตามหน้าจริง, Thai text layer, ไม่มีรอยตัด/ล้น, test บนมือถือ/พิมพ์จริงเป็น gate ที่ผู้จัดต้องตรวจเพิ่มเติม.
7. **สถานะและการส่ง:** สร้าง `souvenir-v42i10-integrated-review.pdf`, `souvenir-v42i10-integration-qa.json`, `souvenir-v42i10-page-map.json` เป็น GitHub Actions artifacts **ไม่ทับไฟล์ฉบับทางการ**; เปิด PR หลังทำ CI, Merge เฉพาะเมื่อ QA ผ่านและได้รับอนุญาต, ไม่กด R11E/เผยแพร่ Google Drive/เว็บไซต์อัตโนมัติ.

## ขอบเขตไฟล์เพื่อไม่ให้ชนงานปก
- เพิ่มตัวประสานใหม่ `scripts/docs/v42i10_integrate_booklet.py` และ `scripts/docs/test-v42i10-integrated-pdf.py` (ไม่แก้ `build-v4-full.py`, `v42_cover.py`, `v42_brackets.py`, `v42_notice_pr82.py`).
- เพิ่ม workflow สำหรับผลตรวจร่าง `.github/workflows/r11c-v42i10-booklet-review.yml`, เอกสาร QA แยก.
- ห้ามแก้ `data/*.json`, `public-results.json`, GitHub Pages, Google Docs/Sheets/Drive และไฟล์ PDF ที่เผยแพร่.

## เกณฑ์หยุด
หากตรวจหัวข้อหน้าผังได้ไม่เอกฐาน, PR82 11 หน้าเปลี่ยน, anchor ขาด/ซ้ำ, 236/250/486/17 เปลี่ยน, เลขหน้าคลาดเคลื่อน, footer timestamp ซ้ำ หรือมีผลการแข่งขันที่เดาขึ้น ให้หยุด CI ก่อนส่งต่อ. หากพบรอยตัดหลังเรนเดอร์ ให้จัดแก้ PDF review บน branch เดิมและทดสอบใหม่.

**ลำดับหลัง I10:** ผู้จัดตรวจภาพผังในเล่มจริง/ขาวดำ/iPhone และมติข้อมูล 6 กลุ่ม จากนั้น gate R11E จึงพิจารณาปล่อย PDF อย่างเป็นทางการ แยกชัดจาก Merge source code.
