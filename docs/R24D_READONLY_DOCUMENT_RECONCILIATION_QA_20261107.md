# R24-D1 — Read-only three-version reconciliation QA (7 พฤศจิกายน 2569)

**Status: DEVELOPED / CI-PASS / PR #123 DRAFT / NOT MERGED / NOT DEPLOYED / FIELD REVIEW PENDING**

## แหล่งที่ตรวจจริง

- `main` เริ่ม `5be80c7edacdd07bb5e923a3797262ae4e8a5668` หลัง Merge PR #120, #121, #122 เรียบร้อย
- `data/program-from-pdf-2569-20261104-draft.json` 237 raw, 236 active, 186 pairs + 50 athletics; `data/program-pdf-positions-v2.json` 236 ตำแหน่ง source SHA pin
- `data/committee-2569-draft-public-review.json` 250 รายการ (ร่าง) + `data/committee-pdf-positions-v3.json` 250 ตำแหน่ง, roster revision pin
- `data/booklet-versions.json` V2 41, V3 64, V4.2 G2 155 หน้า + 486 anchor identities; PDF 155 หน้าไม่เปิด public, Drive permission ยังไม่ยืนยัน
- `committee-review.html`, `js/committee-review.js`, R19-D encrypted school bundles: ระบบประสานโรงเรียนเดิม ใช้รายโรงเรียนและส่งผลทาง LINE พร้อมให้ผู้จัดตรวจ identity/acknowledge แยก

## สิ่งที่พัฒนาใน PR #123

1. `booklet-comparison.html` อ่านอย่างเดียว ผ่านหน้า `booklets.html`. UI มือถือเลือกชนิดกีฬา/ค้นเลขคู่/รุ่น/ทีม ดูตำแหน่ง legacy V2 และไปตรวจต่อในเล่ม 155 ผ่าน local-file viewer ที่มีสิทธิ์
2. `js/booklet-comparison-model.js` ตรวจจำนวนรายการจริง, source revision SHA ของ PDF V2 และ V3, 236+250 IDs, page/number/name/rect ของตำแหน่งเดิม. หากข้อมูลใดไม่ตรงจะ **fail closed**; ไม่แสดงการเทียบที่อาจอ้างผิดรุ่น
3. แยก **ANCHOR_VERIFIED** จาก **CONTENT REVIEW** อย่างชัดเจน: 236 จุด V2 + 250 จุด V3 + 486 token เล่มรวมได้รับการตรวจพิกัดแล้ว แต่ข้อความรายช่องทุกแถวยังเป็น `NEEDS_REVIEW` จนมีผลเทียบ field-by-field และมติผู้จัด
4. สถานะเริ่มต้นในรายงาน: `MATCHED 0`, `DIFFERENT 0`, `NEEDS_REVIEW 486`, `UNAVAILABLE 0` (เมื่อ source index ถูกต้อง). **ตัวเลขนี้ไม่หมายถึงพบข้อมูลผิด 486 จุด** แต่หมายถึงยังไม่ยืนยันเนื้อหาเทียบข้ามฉบับ
5. กดคัดลอกข้อความเพื่อแจ้งผู้จัดได้ ไม่มี server save หรือการเปลี่ยน state; fallback ให้ผู้ใช้เลือกคัดลอกข้อความเองเมื่อ clipboard ไม่พร้อม
6. กรรมการไม่แสดงชื่อซ้ำในหน้าเทียบ แต่พาไปกระบวนการ R19D เข้ารหัสของโรงเรียน; 41 central/outside affiliation คงรอเจ้าของตรวจตาม SOP
7. ไม่แตะ source PDFs, program corrections, results/standings, Google Sheets, PR #116/#118.

## QA อัตโนมัติและกรณีจำลอง

- [R24-D source reconciliation — PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42386448585)
- [R24-C private booklet viewer — PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42386448558)
- `scripts/booklets/test-r24d-comparison.mjs` ทดสอบ 236/250/486 counts, source SHA, mapping page/number/name; ตัดฟุตบอลหญิงซ้ำ, ไม่อนุมาน MATCHED/DIFFERENT, source/map invalid fail-closed, no private Drive URL, LINE school review reuse
- ยืนยันจากเนื้อ PDF จริงตัวอย่าง: ฟุตบอล 12 ปีชายคู่ที่ 6 บน V2 หน้า 7 และเล่มรวมหน้า 89 (token `v4d21e56c64896`); กรรมการข้อ 1.1 ในเล่มรวมหน้า 19 (token `v41d24e7bc3d2f`). **เป็นการตรวจตัวอย่าง ไม่ใช่ field-by-field 486/486 ผ่าน**

## สถานะตรวจรับ / สิ่งที่ต้องทำก่อน R24-D2/E

- **รอการพิสูจน์เนื้อหารายช่อง** จาก PDF V2/V3 เทียบเล่ม 155 หน้า, โดยตรวจข้อความไทยที่มี glyph/normalization ต่างกัน; เพิ่มสถานะ `MATCHED` / `DIFFERENT` เฉพาะหลักฐานที่ตรวจแล้ว ห้ามเดาจาก token
- **รอสิทธิ์เปิด PDF 155 หน้าใน Drive** / สิทธิ์ภาพเด็ก / R11E; แสดงเป็นไฟล์ตรวจร่างเท่านั้น
- **รอผู้จัดตรวจรับข้อความจากโรงเรียน** ผ่านช่องทาง private ตาม R19D; การกด LINE ไม่ใช่การยืนยันของผู้จัด
- **รอ manual QA** Safari iPhone, LINE iOS/Android, Android Chrome, เปลี่ยนหน้า/ซูม, file-pick local 155, ค้นกีฬา, กลับเมนู และ failure state
- PR #123 ยัง Draft, ต้องอนุญาต Merge แล้วตรวจ deployment และ device QA แยก
