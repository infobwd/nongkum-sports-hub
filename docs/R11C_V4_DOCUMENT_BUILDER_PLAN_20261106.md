# R11C-V4 — แผนสร้างสูจิบัตรฉบับเดียวแบบจัดหน้าอัตโนมัติ

วันที่: 6 พฤศจิกายน 2569  
สถานะ: **Phase 1 — SOURCE STRUCTURE / NOT RELEASED**  
เจ้าของงาน: R11C (Google Docs / สูจิบัตร) ต่อจาก [R11C Google Docs Working Draft](R11C_GOOGLE_DOCS_WORKING_DRAFT_HANDOFF.md), [Data Contract](SPORTS_2569_JSON_SHEETS_DOCS_CONTRACT.md) และ [Parallel Workstreams](SPORTS_2569_PARALLEL_WORKSTREAMS_PLAN.md)

## 0. ตรวจงานซ้ำก่อนเริ่ม

ตรวจ `main`, รายการ PR เปิด, แผน R11C, R11A, R11D/R11E, R19K, R20 และโครงสร้างไฟล์จริงแล้ว:

- **ไม่มี PR เปิดค้าง** ณ เวลาที่เริ่มงานนี้; ไม่พบ `scripts/docs/` ที่เป็น generator สำเร็จหรือแม่แบบ V4 ใน repo
- **R11C ทำ Google Docs working copy แล้ว** และแผนเดิมเสนอ `scripts/docs/*` deterministic generator; งานนี้เป็นการดำเนินการต่อ **ไม่ตั้งสายงานซ้ำ**
- **R11A / R20-B** ดูแลข้อมูลโปรแกรมและส่วนแก้ตามที่ยืนยัน, โดยเฉพาะฟุตบอลมัธยมหญิงชิงวันที่ 18 พฤศจิกายน 2569 เพียงรายการเดียว (คัดรายการ 20 พ.ย. ออกจากมุมมองปัจจุบัน); ห้ามแก้ candidate raw เดิม
- **R19K** ดูแลพิกัด 250 ตำแหน่งของ PDF V3 ที่ SHA ล็อก; PDF V4 ต้องสร้างพิกัดใหม่หลังจัดหน้า ไม่ใช้พิกัดเดิม
- **R11D / R11E** ดูแลหน้าแสดงผลและ release gate; R11C Phase 1 ไม่แก้ reader/HTML/JSON เว็บไซต์และไม่เผยแพร่ PDF
- **R20** ดูแล Sheets/ผลแข่งขัน; ไม่แก้ข้อมูลผลและระบบกรรมการในรอบนี้

## 1. เหตุผลและเป้าหมาย

Google Docs ฉบับที่อ้างอิง V3 มี A4, **1,953 ย่อหน้า**, **0 native tables**, **0 explicit page breaks**, และข้อความหน้าเก่า `【หน้า NN / 64】` 64 ตำแหน่ง. ข้อความถูกถอดจาก PDF โดยใช้ช่องว่างจัดคอลัมน์ ทำให้ export เป็น PDF ที่จัดหน้าสวยงามอย่างมั่นคงยาก

ต้องการ: ผู้จัดปรับข้อความใน Docs/ข้อมูลที่ผ่านตรวจได้, generator สร้างสูจิบัตรฉบับ PDF A4 จัดหน้าเอง และมี Word เป็นผลผลิตทางเลือก; ไม่ให้ผู้ใช้จัดหน้า Word เองซ้ำทุกครั้ง

## 2. สถาปัตยกรรมและ source-of-truth

```
R11C Google Docs (เนื้อหาพิธีการ/ข้อความที่ตรวจรับ)
  + candidate program JSON (raw provenance, ห้ามแทนข้อมูลรับรอง)
  + R20 approved planning/schedule overlay (เฉพาะฟิลด์ที่ยืนยัน)
  + R19 committee public-review entries (draft, ไม่ใช่คำสั่งแต่งตั้ง)
      -> deterministic document model + source QA / revision gate
      -> A4 templates / page layout / print QA
      -> V4 PDF DRAFT + optional DOCX
      -> mapping fixture ID -> V4 page and committee entry ID -> V4 rectangle
      -> R11E acceptance -> เว็บไซต์เปลี่ยน PDF อย่างมี rollback
```

**ห้ามถือว่า Google Docs ที่ถอด PDF เป็นข้อมูลต้นฉบับที่รับรองแล้ว:** PDF V3 แสดงรายชื่อกรรมการรอตรวจ; candidate โปรแกรมมี 237 raw events (187 คู่ + 50 กรีฑา), ขณะหน้าใช้งานหลัง R20 correction ควรได้ **236** (186 คู่ + 50 กรีฑา), สถานที่หลักยืนยันโรงเรียนบ้านหนองกระทุ่ม, **45** รายการมีการยืนยันวัน/เวลา/สถานที่เฉพาะ. ผลการแข่งขันต้องอ่านจาก approved-only pipeline แยกเท่านั้น ไม่พิมพ์ผลสมมติ

**รูปแบบการอ้างอิง:** `fixture.id`, `committee_entry.id`, source revision/hash, source-page ตาม PDF เดิม และ V4 printed page (หลัง render) แยกกัน; การแบ่งหน้าของ V4 *ไม่ผูกกับ* 64 หน้าเดิม หรือสูตร V2+N

**ความเป็นส่วนตัว:** แผน/manifest สาธารณะเก็บเฉพาะชื่อกลุ่มและจำนวนรายการ หลีกเลี่ยง ID Drive ภายใน, ผู้รับรอง, PII ไม่จำเป็น; ถ้าต้องใช้ทะเบียนชื่อใช้ data public-review ที่มีอยู่และไม่สร้างสำเนารายชื่อซ้ำใน manifest

## 3. Phase 1 — โครงสร้างข้อมูลและเอกสาร (รอบที่เริ่มทำ)

1. สำรวจ Docs V3 working copy และสร้าง `data/souvenir-v4/source-outline-v1.json` เป็นแผนที่ 64 *source page markers* พร้อมกลุ่มเนื้อหา/ชนิดแม่แบบ/แหล่งข้อมูล และระบุหน้าที่มีเพียง marker ไม่มีเนื้อหาถอด
2. สร้าง `data/souvenir-v4/sample-page-contracts-v1.json` สำหรับ **ปก, กรรมการ, ฟุตบอล, เปตอง, กรีฑา, แบบบันทึกผล** ให้เห็น source binding และ QA gate โดยยังไม่ render
3. สร้าง `scripts/docs/validate-v4-phase1.mjs` เพื่อยืนยันหน้า 1–64, กลุ่ม 6 แบบ, raw 237 -> corrected 236, 45 confirmed, committee entries 250, page provenance, PDF V3 SHA และไม่มีการอ่าน/เขียนข้อมูลจริงนอก repo
4. จัดทำ `docs/R11C_V4_PHASE1_SOURCE_AUDIT_20261106.md` บันทึกข้อจำกัด ข้อมูลที่ต้องให้ผู้จัดตรวจ และสิ่งที่จะทำ Phase 2

**ไม่ทำใน Phase 1:** แก้ Google Docs ต้นฉบับ, export PDF, แก้ไฟล์ PDF V2/V3, แก้ UI/ลิงก์ PDF, เพิ่มผล, ติดตั้ง Apps Script, เปลี่ยนวัน/เวลาอัตโนมัติ

## 4. Phase 2 — ออกแบบและทดสอบแม่แบบ A4 จำนวน 6 หน้า

- ปก: เลย์เอาต์ชัด มีพื้นที่โลโก้/ภาพตกแต่งที่มีสิทธิ์ใช้, สีกรมท่า-เหลือง, ชื่อเกม/วัน/สถานที่จากข้อมูลตรวจรับ
- กรรมการ: ตารางเลขข้อ/ชื่อ/สังกัด/บทบาท, คงกลุ่มและชื่อจริงที่ตรวจรับ, repeat header, ไม่ตัดแถวข้ามหน้า
- ฟุตบอล: ตารางวัน/เวลา/รุ่น/คู่/สนาม/สถานะเฉพาะที่ยืนยัน; ตัดรายการซ้ำ 20 พ.ย. ตาม R20-B โดยมีบันทึก provenance
- เปตอง: ตารางแยกนอกรอบ/ปฐมวัย/รุ่นอื่น และสนามย่อยเฉพาะที่ยืนยัน
- กรีฑา: ตารางลู่/โรงเรียน/รายการ มีหัวตารางซ้ำและไม่สร้างชื่อนักกีฬาเอง
- แบบบันทึก: ช่องว่างเขียนด้วยปากกาและพื้นที่ผู้ตัดสิน ลงนาม; ไม่พิมพ์ผลล่วงหน้า

PDF ต้องเป็น embedded-font A4, อ่านได้/ค้นหาข้อความไทยได้, หน้าไม่ล้นขอบ, ไม่มี glyph หายหรือแถวขาด, มีเลขหน้า, สามารถ print 100%; DOCX เป็นผลผลิตเสริม **ไม่ใช่ขั้นตอนจัดหน้าที่ต้องแก้ด้วยมือ**

## 5. Phase 3 — สร้าง PDF V4 เต็มฉบับ

- นำ Section Model ไป render แบบ deterministic และบันทึก SHA / template revision / content revision
- เทียบ source list ครบ, ไม่มีรายการจาก draft ตกหล่นโดยไม่รับรู้, QA กติกา/เวลา/ชื่อ
- ตรวจผลต่างจาก V3 รายหัวข้อ, review โดยผู้จัด ก่อนประกาศ

## 6. Phase 4 — Reader integration + R11E Gate

- คำนวณ `fixture.id -> V4 page` และ `committee-entry.id -> V4 rectangle` จาก PDF **จริงที่ render แล้ว**; ไม่เดาหรือใช้ offset คงที่
- ให้หน้าโปรแกรมและกรรมการใช้ PDF เดียว แต่ยังใช้ JSON/Sheets ที่รับรองแล้วในการแสดงรายการ
- CI: เปิดหน้าได้ถูก, 236 รายการ (หรือตาม approved revision ใหม่), 250 committee draft anchors, mobile/LINE, print, roll back V3/V2 ได้
- Merge เฉพาะเมื่อ R11E gate ผ่าน; เก็บ V2/V3 เป็นหลักฐานย้อนหลัง

## 7. สิ่งที่อาจทำคู่กันโดยไม่ชน

R20 บันทึกผล, R12 นักกีฬาซ้ำ, R19 School Review, R15 Standings, R11D เว็บตรวจ กำลังเป็นคนละสาย; R11C Phase1 จำกัดการเปลี่ยนไว้เฉพาะ `docs/R11C_V4*`, `data/souvenir-v4/*`, `scripts/docs/*` โดยไม่แตะ HTML, CSS, programs, results, Sheets, Apps Script หรือไฟล์ PDF ที่เผยแพร่

## 8. Gate ก่อนเริ่ม Phase 2

- Phase 1 validator ผ่าน, 64 markers ครบตาม working copy และระบุความต่างระหว่าง marker กับ actual page break
- ยืนยันข้อมูล 6 ตัวอย่างและแหล่งอ้างอิงถูกต้อง
- ผู้จัดตรวจการแก้ข้อมูล V3 จุดเสี่ยง: ฟุตบอลมัธยมหญิงซ้ำ 20 พ.ย., ตะกร้อคู่ 9 ซ้ำ, รายการ/วันอื่นที่ยังไม่ได้รับรอง
- Phase 2 ให้สร้าง **ตัวอย่าง 6 หน้า** ก่อนทั้งเล่มและรับการตรวจรับจริง
