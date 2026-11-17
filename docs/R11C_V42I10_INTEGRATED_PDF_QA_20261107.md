# R11C V42-I10 — ผลรวมผัง 44 กลุ่มเข้าสูจิบัตรฉบับตรวจร่าง (QA)

วันที่: 7 พฤศจิกายน 2569 (Asia/Bangkok)  
สถานะ: **DEVELOPED / CI PASS / PDF REVIEW ARTIFACT BUILT / NOT OFFICIALLY PUBLISHED**  
งานอ้างอิง: [แผน I10](R11C_V42I10_BOOKLET_INTEGRATION_PLAN_20261107.md), [ผัง I6–I9 PR #114](https://github.com/infobwd/nongkum-sports-hub/pull/114), [PR #116](https://github.com/infobwd/nongkum-sports-hub/pull/116)

## หลักฐานทดสอบจริง

- [GitHub Actions integrated review — **SUCCESS** #42363322571](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42363322571); รายการงาน `R11C V42-I10 Integrated Booklet PDF Review`
- Artifact `R11C-V42-I10-full-booklet-with-44-brackets-REVIEW-ONLY` (artifact ID `13570324582`, ZIP 2,061,952 bytes; ภายในมี PDF A4 ฉบับรวม, แผนที่หน้า, manifest ผัง, report และภาพ contact sheet)
- ตัวสร้างใช้ `scripts/docs/v42i10_integrate_booklet.py`, ตรวจ `scripts/docs/test-v42i10-integrated-pdf.py`; ไม่แก้ตัวสร้าง `build-v4-full.py`, `v42_cover.py`, source JSON หรือ PDF สาธารณะ
- รอบ CI แรก [#42363118577](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42363118577) พบตัวเลขลำดับผัง 44 กับเลขหน้าจริงซ้ำบนหน้าใหม่; แก้โดยตัดตัวนับ 1/44 ออกจากท้ายหน้าผัง (ยังมีลำดับผังในหัวข้อ), รันทดสอบใหม่ผ่านบน run #42363322571; ไม่ซ่อนความผิดพลาดหรือถือว่ารอบแรกผ่าน

## ผลรวมเล่มจากหลักฐาน runner

| รายการ | ค่าและผล |
|---|---|
| Baseline PDF V42-H | 125 หน้า A4, review only |
| หมวดผังเดิม | หน้า 44–57 (14 หน้า) — นำออกเฉพาะหมวดนี้ |
| หมวดผัง V42-I ใหม่ | **44 หน้า** แทนเดิม ณ หน้า 44–87 |
| ฉบับรวมใหม่ | **155 หน้า A4**, ไม่มีหน้าเปล่า |
| กลุ่มในผัง | 44 / 44; ผังสองฝั่ง 14; อีก 30 ใช้รูปแบบตามจริง |
| คู่แข่งขัน | 186/186 unique fixture IDs; effective 236 = 186 คู่ + 50 กรีฑา |
| กรรมการ | 250 รายการเดิม |
| หน้าเอกสารประกาศ PR82 | 11 หน้า, **เทียบ pixel parity ผ่าน 11/11 หน้า** |
| หน้าเนื้อหาที่ไม่ใช่หมวดผัง | **111 หน้าข้อความตรงเดิม**, ไม่นับหมวดผัง 14 หน้าเดิม |
| จุดอ้างอิง | **486/486** ตรงหน้าที่คำนวณใหม่และค้นหา token ได้ |
| เชิงอรรถ revision | ข้อความ `ปรับปรุงล่าสุด` **155/155 หน้า**, อ้าง source edit SHA จริง |
| เลขหน้า | ตรวจผ่านเลขหน้าจริงบนหน้าใหม่/หน้าที่ถูกเลื่อน |
| ภาคผนวก V3 | **17 หน้าคงไว้ครบ** |
| ข้อสังเกตของผู้จัด | **6 กลุ่มคงไว้**; ไม่มีการแก้รายชื่อ/เลขคู่โดยคาดเดา |
| สถานะเผยแพร่ | **Review only**; ไม่อัปโหลด Drive หรือเปลี่ยน PDF live / GitHub Pages |

## ผลกระทบและการข้ามแชท

- งานปก G2 อยู่ในอีกแชท: ขณะ I10 ทำงานมี PR #115 แบบอักษรปก Merge ภายหลัง (เปลี่ยนเฉพาะ `docs/R11C_V42G2_COVER_REVISION_FOOTER_AND_REMAINING_WORK_20261107.md` กับ `docs/SPORTS_2569_V42H_NEXT_STEPS_AND_DRIVE_DELIVERY_20261107.md` ไม่ชน 4 ไฟล์การพัฒนา I10). แผนกติกาปกยังไม่ใช่ไฟล์ภาพที่เผยแพร่.
- I10 จัดทำฉบับ review จาก baseline G1 fallback ตามตัวสร้างเดิมและนำผังใหม่เข้าแล้ว; **ไม่ใส่ภาพ G2 จริง** เพราะยังต้อง gate สิทธิ์ภาพ/ความละเอียด/ผู้จัดตรวจ และ R11E
- ไม่แก้ `review.html`, Google Docs/Sheets/Drive, รหัสผู้ใช้หรือระบบบันทึกผล; รูปแบบตัวผังที่ผู้จัดชอบไม่ใช่การรับรองข้อมูลทั้ง 44 กลุ่ม.

## งานที่ยังเหลือ

1. ผู้จัดตรวจตัวอย่าง **ภาพ contact sheet และ PDF 155 หน้า**, โดยเฉพาะไทย/ชื่อทีม/เส้นบาง/⚠/ⓘ, สีขาวดำและเปิด iPhone/Safari/LINE; QA อัตโนมัติไม่เท่ากับการตรวจรับการมองเห็นโดยผู้จัด
2. ให้ผู้จัด/กรรมการยืนยัน V42-H ที่ต้องแก้ข้อมูล (วอลเลย์บอลชาย/หญิง, ตะกร้อ, เปตองชาย 10 ปี ฯลฯ) แยกจากเรื่องผัง; ยังแสดง `⚠` ในฉบับตรวจร่าง
3. เมื่ออนุมัติไฟล์ปก G2 ที่ผ่านสิทธิ์ภาพและคุณภาพพิมพ์แล้วจึงสร้าง **release candidate ฉบับรวม** และทวน pixel/pagenumber/page-map ใหม่; ไม่ถือว่า PDF artifact review นี้เป็น official
4. R11E จึงอนุญาตให้อัปเดต Google Drive/Docs/เว็บ พร้อม rollback และการตรวจรับฉบับเผยแพร่จริง

**ข้อยืนยัน:** Merge PR source code ไม่เท่ากับเผยแพร่ PDF จริง, และไม่ได้หมายความว่าคู่แข่งที่ยังติด `⚠` ได้รับการรับรองแล้ว.


## หลักฐานนำส่ง Google Drive (7 พฤศจิกายน 2569)

- **ผู้จัดอนุญาตให้นำ PDF ตรวจร่างขึ้น Google Drive แล้ว** (คำสั่งในแชท: “เอาไฟล์ลง Google Drive ได้เลยไหม”)
- อัปโหลดเป็น **ไฟล์ใหม่** (ไม่เขียนทับต้นฉบับหรือ PDF 125 หน้า): [MittraphapGames_2569_V42I10_155pages_REVIEW_ONLY_20261107.pdf](https://drive.google.com/file/d/1gtT1kDOYX00cmO7cPgrixHBdAC9JEaY0/view?usp=drivesdk)
- Drive file ID: `1gtT1kDOYX00cmO7cPgrixHBdAC9JEaY0`; parent folder [สูจิบัตร](https://drive.google.com/drive/folders/1c4diWWZfqaMzEcwj3-crd3T3Up06phT0), บัญชีโครงการโรงเรียน `info@bwd.ac.th`.
- ตรวจอ่าน metadata หลังอัปโหลด: `application/pdf`, 2,077,365 bytes, parent ตรงโฟลเดอร์; ตรวจไฟล์ที่บริการอัปโหลดได้รับกับ PDF GitHub artifact: ข้อความทุกหน้าเหมือนกัน **155/155**, รูปแบบทั้งสองไฟล์ A4 และยังมี 155 หน้า. บริการไฟล์เปลี่ยน metadata PDF/ขนาด bytes โดยไม่เปลี่ยนข้อความ 155 หน้า (ไม่อ้างว่า SHA เหมือนกัน)
- สถานะ: **DELIVERED TO DRIVE FOR PRIVATE REVIEW / NOT OFFICIAL RELEASE**; ยังไม่เปลี่ยนสิทธิ์แชร์ ไม่แทน Google Docs ต้นฉบับ ไม่เปลี่ยนเว็บ และไม่อนุญาตเผยแพร่ทางการ.
- ปกใน PDF ฉบับนี้เป็น **G1 fallback ตามการสร้าง baseline CI** ไม่ใช่ไฟล์ภาพ Full Photo G2 ส่วนตัวที่อีกแชทกำลังรับรอง และยังไม่บรรจุรูปปกจริง
- ยังต้องตรวจรับบนมือถือ/พิมพ์จริง, มติคู่แข่งขันที่เตือน, ภาพปกและสิทธิ์ภาพ, R11E; PR #116 แยกจากขั้นเผยแพร่.
