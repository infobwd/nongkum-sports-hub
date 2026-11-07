# R24-C — ผลพัฒนาตัวอ่านเล่ม 155 หน้าแบบไฟล์ส่วนตัวและ deep link (7 พฤศจิกายน 2569)

**สถานะ:** DEVELOPED / CI PASS / PRIVATE-LOCAL PROOF / PR #122 DRAFT (STACKED ON #121) / NOT MERGED / NOT DEPLOYED / NOT DEVICE-ACCEPTED

## แหล่งข้อมูลจริงที่ตรวจ

- GitHub `main`: `339050dc6df494f22922ecc59a70a5a7dc8c9ab5` ; PR #120 แผน, PR #121 R24-A/B, PR #116 ผัง และ PR #118 ปก ยัง Draft
- PDF V2 (41 หน้า) และ V3 (64 หน้า) ยังใช้ตัวอ่าน PDF.js และพิกัด R23/R19K โดยตรงเหมือนเดิม
- PDF G2 155 หน้า SHA256 `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d`; private map 486 แถว `R24B_155page_anchor_positions_PRIVATE_REVIEW.json` มี canonical position checksum `4ca526eb48e2e21edb72e38dc5e474429f52a3e62f8d73fd635e1329b1410e90`
- ทดลองคำนวณจริงจาก map ส่วนตัว: `football-p07-12-ปี-ชาย-006` → token `v4d21e56c64896` → PDF **หน้า 89** (หน้าอ้างอิง V2 เดิมคือหน้า 7); `pdf-p06-l15` → token `v41d24e7bc3d2f` → PDF หน้า **19** (V3 เดิมหน้า 6)
- ไฟล์ Drive 155 หน้าเก็บใน Shared Drive แต่ metadata ผ่าน plugin ยังคง `access_not_verified`. ไม่สมมติว่า permission public หรือผู้ใช้ทั่วไปเปิดได้; ไม่มีการปรับการแชร์จากงานนี้

## งานที่ทำ

1. `booklet-private-viewer.html`, `js/booklet-private-viewer.js`, `css/booklet-private-viewer.css`: ให้ผู้ได้รับสิทธิ์เลือก **PDF กับแผนที่ตำแหน่งส่วนตัวจากเครื่อง** หลังจากเลือก จึงตรวจ SHA-256 ของ PDF, map 486 row และ checksum ตาม revision; โหลด PDF.js ฉบับเดียวกับ reader เดิมเท่าที่จำเป็น
2. ลิงก์จากรายละเอียดของ fixture ใน `js/program.js` และแถวกรรมการ/รายละเอียดงานใน `js/committee.js` ส่งเฉพาะ **รหัสคงที่** ผ่าน `?fixture=...` หรือ `?entry=...`; ตรวจว่า ID นั้นอยู่ในฐาน JSON จริง (236 active, 250 committee) แล้วคำนวณ `v4` + SHA1(ID) 12 หลักเพื่อค้นหาพิกัด ไม่ส่งชื่อผู้ปฏิบัติใน URL
3. ไฮไลท์แถบสีเหลืองบริเวณแถวอ้างอิงจากแผนที่เฉพาะฉบับที่ตรวจ SHA ผ่าน; หน้า PDF อื่นแสดงปกติไม่เน้นสี; ขยาย ย่อ เลือกหน้าและกลับหน้ารายการได้
4. เพิ่มทางเข้าแบบเลือกไฟล์ส่วนตัวใน `booklets.html` โดยยังคง `viewer_route=null` และ `restricted_review_pending_permission` ของ registry เล่ม 155 หน้า; ไม่เผยแพร่ไฟล์ PDF/แผนที่พิกัด/ลิงก์ Drive ส่วนตัวใน public GitHub
5. CI R24-C ตรวจ JS, source ID, checksum-revision guard, ไม่มี Drive ID และไม่กระทบ V2/V3; CI R24-A/B, R13, R14, validate ผ่านใน commit `55c5b4ad90571c812065054010fa8db31f14d7a5`

## ผลทดสอบล่าสุด

- [R24-C Private Booklet Deep Links — SUCCESS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42384385430)
- [R24-A/B Catalog and Source Audit — SUCCESS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42384385465)
- [R14 Schedule/LINE — SUCCESS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42384385439)
- [R13 Program Candidate — SUCCESS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42384385398)
- [Validate Draft Data — SUCCESS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42384380390)

> CI เหล่านี้ตรวจที่ `55c5b4ad...` ก่อนเพิ่มเอกสาร QA; ก่อน Merge ให้ทวน latest-head results. ผล CI ไม่ใช่ผลทดสอบจริงของ Safari/LINE และไม่ใช่การรับรองรูปลักษณ์ไฮไลท์โดยผู้จัด.

## ข้อจำกัดและงานถัดไป

- ผู้มีสิทธิ์ต้องดาวน์โหลด PDF+map จากพื้นที่ส่วนตัวก่อน แล้วเลือกสองไฟล์ทุกครั้งที่เปิดหน้า; ไม่มีการบันทึกไฟล์โดยเว็บ, ไม่มีการ bypass สิทธิ์ Drive. นี่เป็น private inspection bridge ไม่ใช่ระบบ autentification/SMIS เพิ่ม.
- ต้องทดลองใช้งานจริงบน Safari iPhone/LINE WebView/Android Chrome รวมถึงการเปิดกลับจากคู่แข่งขัน/กรรมการ, zoom/rotate, cancel render, stale map, wrong file, fallback เมื่อ CDN ใช้งานไม่ได้.
- การตรวจ 486 จุดหมายถึง **ระบุตำแหน่งได้** ไม่ใช่ข้อมูล 486 แถวรับรองโดยผู้จัด; ยังมีข้อสงสัยรายการแข่งและกรรมการจากต้นฉบับตาม R11E.
- ผู้จัดต้องอนุญาต Merge PR #121 (และแผน #120 หากจะ Merge) ก่อน retarget/rebase PR #122; แยกจาก PR #116/#118. ห้าม Merge หรือ Deploy อัตโนมัติจากงานนี้.
- เมื่อสิทธิ์ Drive/ภาพนักเรียนได้รับอนุญาตและมีช่องทาง authenticated จริง จึงออกแบบ R24-D/E ตรวจเทียบ/งานรับรองและเผยแพร่โดยไม่เปิดข้อมูลบุคคลเพิ่ม.
