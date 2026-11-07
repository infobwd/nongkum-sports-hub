# R24-A/B — ผลพัฒนาศูนย์เอกสารสามฉบับและผลตรวจ PDF 155 หน้า (7 พฤศจิกายน 2569)

**สถานะ:** `DEVELOPED / SOURCE-AUDITED / CI-PASS (ก่อน commit บันทึก QA) / DRAFT PR #121 / NOT MERGED / NOT DEPLOYED / NOT OFFICIALLY ACCEPTED`

## 1. ตรวจอะไร

- `main` ณ เริ่มงาน `339050dc6df494f22922ecc59a70a5a7dc8c9ab5` (R23 PR #119 Merge แล้ว) และเอกสารแผน R24 ใน PR #120 (Draft)
- PR #116 ยัง Draft (ผังและ page-map I10), PR #118 ยัง Draft (G2 รวมปก) — **ไม่ได้แก้ไฟล์ใน PR เหล่านั้น**
- V2 (41 หน้า) และ V3 (64 หน้า) จาก assets ที่เว็บใช้; รายละเอียด hash ถูกตรวจอัตโนมัติว่า **ไฟล์เดิมใน GitHub เป็นรุ่นเดียวกับ metadata registry ใหม่**
- Metadata Drive ของเล่ม 155 หน้า: `application/pdf`, ขนาด 4,067,611 bytes, revision เดิมตามหลักฐาน แต่ `source_visibility_status=access_not_verified`; **ยังไม่ใช่ใบอนุญาตเปิดสาธารณะ**
- PDF G2 ฉบับรวม 155 หน้าและ PDF I10 ก่อนเปลี่ยนปก 155 หน้า ที่มีต้นฉบับจริงอยู่ในพื้นที่ตรวจภายใน

## 2. R24-A — งานที่พัฒนา

- เพิ่มทางเข้าเดียวในเมนู **“เพิ่มเติม”** ของ `index.html` → `booklets.html` (ไม่เพิ่มปุ่มบนรายการตารางแข่ง)
- เพิ่มหน้ารายการเอกสาร 3 ฉบับแบบมือถือ: V2 ตารางแข่งขัน 41 หน้า, V3 กรรมการ 64 หน้า, V4.2-I10 G2 รวม 155 หน้า
- V2 เปิด `./pdf-viewer.html?page=1`, V3 เปิด `./committee-pdf-viewer.html?page=1`; **ไม่มีการแก้ reader.js, พิกัดเดิมหรือ source PDF**
- V4.2-I10 G2 เป็น **ฉบับตรวจร่าง** มีการ์ดให้เห็นเพื่อรับรู้ revision แต่ **ยังไม่เปิด URL/ดาวน์โหลด** จนกว่าสิทธิ์ไฟล์และสิทธิ์ภาพบุคคลได้รับการตรวจและอนุญาต — ไม่เก็บ Drive ID/URL ส่วนตัวใน public repo
- `data/booklet-versions.json`: registry รูปแบบ `version_id, display_name, purpose, page_count, source_kind, pdf_revision_sha256, document_status, access_mode, viewer_route, approved_at`
- `js/booklets.js`: whitelist route/จำนวนหน้า, status อย่างชัด, ข้อความแสดงด้วย `textContent`, fail closed หาก registry ไม่ถูกต้อง, ข้อความช่วยเมื่อโหลดไม่สำเร็จ
- `css/booklets.css` แยกขอบเขต ไม่ไปเปลี่ยน CSS หน้าเก่าของเว็บ

## 3. R24-B — ผล audit ของไฟล์ PDF จริง

| เกณฑ์ | ผลที่ตรวจได้ |
|---|---|
| G2 PDF SHA-256 | `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d` ตรง |
| I10 baseline SHA-256 | `0c052af59d73bbefbe66f43dd797f08c5041ef2c00733805cd95a1ffbce6edec` ตรง |
| จำนวนหน้าและขนาด | 155/155 หน้า A4 ทั้งสอง |
| สารบัญ/จุดนำทาง | 175/175 รายการ |
| แทนเฉพาะหน้าแรก | หน้า 2–155 สกัดข้อความตรงกัน 154/154 |
| จุดอ้างอิงในเล่ม G2 | 486 tokens รูปแบบ `v4{sha1-id[:12]}` |
| การซ้ำ/คลุมเครือ | 0 (ทุก token มี 1 ตำแหน่ง) |
| page + normalized rect เทียบ baseline | **486/486 ตรงทุกตัว** |
| SHA-256 of sorted newline-joined token IDs | `21feb66eb393f6fa24f0012e9dd3052a7e8eabca84bf40c3a5c73a3dda380d99` |
| ตรวจ identity กับฐาน GitHub (CI) | 236 active fixture IDs + 250 committee IDs = **486**; token digest ตรง PDF ตัวจริง |
| Private token→page/rect map | สกัดครบ 486 ตำแหน่งเป็นผลตรวจภายใน; **ไม่ commit** Map หรือ PDF รูปนักเรียนลง public GitHub |

หมายเหตุ: 486/486 หมายถึง **จุดอ้างอิงของรายการใช้งานตรงและไม่เลื่อนหลังเปลี่ยนปก** ไม่ได้หมายถึงข้อมูลทุกแถวได้รับรองโดยผู้จัด. ห้ามใช้ PDF กรรมการ/นักกีฬาเป็นฐาน public disclosure เพิ่มโดยไม่ผ่านสิทธิ์.

## 4. GitHub CI / regression

- [R24-A/B Source Catalog Audit](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42383312690) — PASS; ตรวจ SHA ของไฟล์ V2/V3 จริง + ตรง digest 486 identity
- [R11D PDF Reader Regression](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42383312617) — PASS
- [R13 Program Candidate](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42383312628) — PASS
- [R14 Schedule/LINE](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42383312604) — PASS
- [Validate](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42383312584) — PASS

> ผล CI ข้างต้นอยู่บน head ก่อนแก้สคริปต์ audit เพื่อเพิ่มการส่งออก map ส่วนตัวและก่อนเพิ่ม QA นี้; ตรวจ run ล่าสุดบน PR head ก่อน Merge. Device QA ต้องตรวจจริงบน Safari/Chrome/LINE.

## 5. ค้าง/ขั้นถัดไป

1. ผู้จัดอนุญาต Merge PR #121 และตรวจแผน PR #120 แยกตามความเหมาะสม
2. ตรวจสิทธิ์แชร์ของ PDF G2 155 หน้า โดยเฉพาะภาพนักเรียนและการเข้าถึงจากผู้ใช้เว็บทั่วไป; เมื่อผู้จัดอนุญาตจึงพัฒนา authenticated restricted link/fallback ให้คนที่มีสิทธิ์เปิดเล่มในหน้าเว็บได้
3. **R24-C**: นำ private anchor map มาผูกกับ ID ของ 236 fixture + 250 กรรมการภายใต้อำนาจตรวจรับ ก่อนเปิดตัวเลือก `เปิดตำแหน่งในเล่ม 155 หน้า`; ไม่ดึงพิกัด V2/V3 มาใช้ผิดรุ่น
4. iPhone Safari, LINE iOS/Android, Chrome Android, desktop and failure-mode tests; ตรวจลิงก์เดิมและหน้าตรวจกรรมการ
5. R11E ข้อมูลผัง/เวลา/กรรมการและสิทธิ์ภาพต้องผ่านมติก่อนประกาศฉบับรวมทางการ

**ห้ามตีความว่า PR Merge แล้วคือ PDF/สิทธิ์เผยแพร่/เนื้อหารายการได้รับรองแล้ว**
