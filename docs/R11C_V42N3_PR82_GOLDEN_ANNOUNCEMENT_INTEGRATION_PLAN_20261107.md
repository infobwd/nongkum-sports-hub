# R11C V4.2-N3 — นำประกาศแม่แบบ PR #82 กลับเข้ารวมเล่มให้ตรงแบบจริง

**วันที่ตรวจ:** 7 พฤศจิกายน 2569 (Asia/Bangkok)
**สถานะ:** DESIGN RECOVERY PLAN / **ยังไม่ได้แก้ PDF รวมเล่ม** / ไม่ใช่การอนุมัติประกาศทางการ
**แหล่งอ้างอิงหลัก:** [PR #82](https://github.com/infobwd/nongkum-sports-hub/pull/82) (merged), `scripts/docs/notice-preview-v2.py`, `.github/workflows/notice-preview-v2.yml`, ไฟล์ต้นฉบับใน Drive ชื่อ **`announcement_formal_preview_v2.pdf`** ภายใต้ `ปี 2569/สูจิบัตร`.
**ข้อกำชับผู้จัด:** ตัวอย่าง PR #82 คือ **แม่แบบที่เลือกไว้แล้วสำหรับหมวดประกาศ**; ห้ามตีความว่า V4.1/N1/N2 หรือ CSS ในสูจิบัตรล่าสุดเป็นดีไซน์แม่แบบ.

## 1. ตรวจไฟล์ PDF จริงเทียบกับเล่มปัจจุบัน

| ตรวจ | PR #82 ฉบับ Drive (golden) | V42-N2 ฉบับรวมเล่ม (current) |
|---|---|---|
| จำนวนหน้าเฉพาะประกาศ | **11 หน้า A4** เป็นประกาศต่อเนื่องหน้าเดียวกันตั้งแต่หัวเรื่องถึงลงชื่อ | **12 หน้า**: หน้าเปิดประกาศเพิ่ม 1 หน้า (PDF หน้า 8), และเนื้อหาประกาศ V3 อีก 11 หน้า (PDF หน้า 9–19) |
| หัวประกาศ | หัวและเรื่องอยู่กลางหน้ากระดาษ ไม่ต้องมี title/chapter header แยก | หัว/เรื่องถูกวางภายใต้กรอบนิตยสาร/หัวหมวด และมี **หน้าเปิดซ้ำ** |
| รายชื่อกรรมการ | แสดง **สามคอลัมน์สัมพันธ์กัน:** เลขข้อ, ชื่อ+ตำแหน่ง/สังกัด, บทบาท (ประธาน/กรรมการ/เลขานุการ) ชิดขวา; บรรทัดยาวต่อในคอลัมน์ชื่อ | แต่ละคนเป็นบรรทัดข้อความเรียงต่อกัน ตัวเลข/ชื่อ/บทบาทไม่แยกคอลัมน์ตามแบบที่รับ |
| «มีหน้าที่» | ย่อหน้าราชการตัวหนังสือธรรมดา บรรทัดต่อเนื่อง พร้อมเน้น «มีหน้าที่» และย่อหน้า | N2 รวมบรรทัดต่อได้แล้วแต่ยังไม่ได้ใช้ตัวจัดหน้ารายชื่อ/หัวข้อ/ระยะขอบของ PR #82 |
| หน้าแรก/ท้าย | บทนำ, 20 หมวด, และท้ายประกาศ–วันที่–ชื่อผู้ลงนามอยู่ในเอกสาร 11 หน้า; มีสถานะร่างบนหัว/ท้าย | แยกหน้าเปิด V4.1 พร้อมช่องลงชื่อสมมุติ แล้วแสดงต้นฉบับ V3 ที่มีรายละเอียดลงชื่ออีกครั้ง |
| สีและเครื่องหมาย | เนื้อหาดำบนพื้นขาวแบบหนังสือทางการ ไม่มีเส้นสีกรมท่าใต้ทุกหมวด | มีป้ายบอกสถานะ/เส้นสี/กรอบหัวบทจากนิตยสาร แม้ส่วนคำอธิบาย QA บางชิ้นถูกซ่อนแล้ว |
| ฟอนต์/สระ | PR #82 ใช้ Sarabun Regular/Bold เต็มและ render-only decomposition `U+0E33 → U+0E4D U+0E32` | N2 ฝัง Sarabun แล้วและตรวจ source counts ผ่าน แต่ไม่ใช่ระบบจัดหน้า PR #82 |
| ข้อมูล | PR #82 ป้องกันการหายของ 341 source-line IDs / 20 หมวด / 20 duty paragraphs | N2 ก็รักษา 341/20 แต่ตรวจเพียง source-completeness ไม่ได้ล็อกภาพการจัดหน้าไว้กับ PR #82 |

**ตัวเลขไฟล์ golden ที่ตรวจใน Drive:** 51,414 bytes, 11 A4 pages, SHA-256 `8cc68ba476192fe47310280600a9c681afdbe98378dc7881bf183d977d8928d8`; PDF มี SarabunFull และ SarabunFull-Bold; ค้นพบ «มีหน้าที่» 20 จุดและหัวข้อกรรมการ 20 หมวดใน PDF. การดึงข้อความจาก PDF สระอำเป็น Unicode แบบประกอบ `ดํา` ไม่ใช่ตัว `a` ภาษาอังกฤษ; อย่าตัดสินด้วย exact-string `ดำ` ก่อน normalizing.

**เนื้อหาที่ใช้เป็นตัวอย่างจัดหน้าคือฉบับร่าง V3** (อาจมีเลขข้อซ้ำ ชื่อ/สังกัดต่างจากทะเบียนกรรมการที่โรงเรียนแก้ล่าสุด หรือข้อมูลผู้ลงนามที่ยังไม่รับรอง); **ห้ามแก้ข้อมูลโดยคาดเดาเพื่อให้ตรงตารางตรวจชื่อ**.

## 2. สาเหตุที่ยังไม่ตรง PR #82

1. `notice-preview-v2.py` เป็น **standalone builder เฉพาะประกาศ**; PR #82 สร้าง artifact `Announcement-Full-Sarabun-V2` เท่านั้น ไม่ได้เปลี่ยน `scripts/docs/build-v4-full.py` ให้ใช้ renderer เดียวกัน
2. การรวมเล่ม N1/N2 ภายหลังกลับใช้ `v41_editorial.notice()` + `v42_official.official_full_html()` ซึ่งเป็นคนละ layout engine กับ PR #82; บทที่เพิ่มโดย N1 ทำให้มีหน้าเปิดประกาศที่ซ้ำในแง่สาระ
3. CI ของ N1/N2 ยืนยัน Thai text layer/A4/341 lines/20 duty source, แต่ **ไม่ได้ทำ visual regression ที่เทียบ golden PR #82**; จึง QA PASS ทั้งที่รูปแบบไม่ใช่ที่ผู้จัดเลือก
4. `notice-preview-v2.py` ปัจจุบัน **รับ HTML จาก builder เดิม** แล้ว parse ด้วย CSS class/source-line; N2 เปลี่ยน `v42-duty-line` เป็น nested span ทำให้การรัน script เดิมกับ HTML ปัจจุบันเสี่ยง misgroup/break. ต้องสร้าง adapter ให้ดึง **V3 source model** ที่ตรวจได้ 341 lines โดยตรง หรือปรับ contract ที่ตรึง class/IDs ชัดเจน ห้าม reuse โดย blind copy.

## 3. แนวทางแก้ที่เลือก — ให้ PR #82 เป็น source of truth ด้านรูปแบบ

### N3-A Golden renderer และ source contract

- refactor `scripts/docs/notice-preview-v2.py` ให้เรียกใช้ `render_official_notice_v2(source_model, font_regular, font_bold)` แบบ reusable; **ห้ามคัดลอก CSS มาแก้ทีละจุดใน v42_official**
- อ่าน source 341 lines จาก `build_source_model(pdf)` / V3 pages 6–16 ให้มี `id, text, kind, section`; ตอนสร้าง 11 หน้า ใช้ logic จาก PR #82: introduction, `unit` 1–20, member grid, nested sports subheading, `duty`, และ closing
- เก็บ crosswalk `source-line-ID → unit/member/duty/closing` แยกใน QA JSON, ตรวจ set/uniqueness/order 341/341; ชื่อคน/เลขข้อ/ตำแหน่งต้องไม่ถูก rewrite เงียบ ๆ. เพิ่ม diff list สำหรับความคลาดเคลื่อนจากทะเบียนกรรมการ 250 แถว แยกจาก PDF เดิม
- ใช้ฟอนต์ Sarabun Regular/Bold **ฉบับเต็มเฉพาะใน build runner** (ห้าม commit/แจกฟอนต์); render-only Thai Sara Am compatibility as in PR #82. QA query normalize `U+0E33` กับ `U+0E4D U+0E32` พร้อมตรวจไม่พบ Latin `a`/semicolon แทรกกลางคำ
- **Golden validation:** render 11 pages from current V3 snapshot and compare with hash-locked PR #82 PDF with visual examples PDF หน้า 1,6,11; form/role column widths and page count must match. Exact PDF hash may differ due metadata/font subsetting, compare the **rendered appearance and text** not raw binary equality

### N3-B รวมเข้าสูจิบัตรโดยไม่เปลี่ยนเลย์เอาต์

**Preferred route:** สร้าง PDF 11 หน้า PR #82 แยกก่อน แล้ว **แทรกเป็นหน้า PDF จริง (PyMuPDF)** เข้าไฟล์รวมเล่มหลังบทสีโรงเรียน/คำปฏิญาณและก่อนตารางตรวจรายชื่อกรรมการ 250 แถว แทนการครอบ HTML PR #82 ด้วย global CSS ของนิตยสาร (ซึ่งทำให้ระยะขอบและ page break เพี้ยน).

- เอา *ผลพิมพ์* ของ N1 หน้าเปิด V4.1 และ N2 ประกาศแบบเดิมออกจาก `pages` **ทั้งสองชิ้น** เพื่อไม่ให้หัวประกาศ/การลงชื่อซ้ำ แต่ยังเรียก `build_source_model` + `source_audit` เพื่อเก็บหลักฐานครบ; ไม่ลบ source code/เอกสารประวัติ
- หลัง `HTML(...).write_pdf(main)` หา **จุดแทรกตาม anchor/หัวบท** ที่รู้แน่ เช่น หน้าก่อน `คณะกรรมการ / หมวด 1`, ไม่ใช้หมายเลขหน้า hard-code; ตรวจว่าตำแหน่งตรงก่อนเข้าตารางกรรมการ 250
- `fitz.insert_pdf(golden-rendered_pdf)` **ก่อน** append ภาคผนวก V3 17 หน้าและก่อนทำ page-map 486 anchors เพื่อให้เลขหน้าถูกคำนวณใหม่อย่างเป็นระบบ. ห้ามแทนที่ไฟล์ Drive gold reference เดิม
- ปรับเฉพาะ header/footer ย่อยที่กล่าวว่า `(ตัวอย่างจัดหน้า)` และเลขหน้าภายในให้เหมาะกับเล่ม โดย **ไม่เปลี่ยน** หน้าเนื้อหา/ตาราง PR #82. แสดงว่าเป็น **ร่างเพื่อการตรวจรับ**, ไม่แสดงว่าเป็นประกาศที่ลงนาม. ห้ามประดิษฐ์ตราครุฑหรือภาพลายเซ็น
- บันทึก output metadata: `notice_visual_reference=PR82-V2`, `notice_rendered_pages=11`, `golden_pdf_sha256`, `source_lines=341`, `source_sections=20`, `notice_insertion_page`, และ `review_only`. เลขหน้ารวมเล่มอาจลดจาก 126 เหลือราว 125 แต่ **ห้าม assert จน build จริง**.
- หาก PyMuPDF insertion ทำให้สารบัญ/พิกัดคลิกลิงก์ขยับ ต้องตรวจ PDF anchor JSON ใหม่ทั้งหมดและทดสอบการเปิดตรงหน้าจากเว็บไซต์/มือถือใน review; ห้ามเปลี่ยนหน้าเว็บก่อน R11E

### N3-C QA ใหม่ที่วัด “ตรงแบบที่เลือก” ไม่ใช่แค่ครบข้อมูล

- [ ] PR #82 golden file เป็น **11 หน้า A4** และ hash ตรง Drive source; เก็บ render screenshots แบบ read-only page **1 / 6 / 11**
- [ ] PDF ฉบับใหม่หลังฝัง มีประกาศ **11 หน้า ไม่ซ้ำหน้าเปิดประกาศ V4.1**; ไม่มีแถบนิตยสารหรือหัวบทซ้ำในหน้า PR #82
- [ ] จัดเลขข้อ/ชื่อ/ตำแหน่ง/สังกัด/บทบาท **3 คอลัมน์** เหมือน PR #82 และย่อหน้า «มีหน้าที่» 20 จุดอยู่ใต้หมวดที่ถูกต้อง ไม่เป็นการ์ด/ตาราง dashboard
- [ ] ต้องตรวจภาพทั้ง A4 at print-size และบนมือถือ รวมหน้าทดสอบ **1, 6, 11** แบบ before/after; margin, letter spacing, glyph placement, role column/right edge, widow/orphan, ลายเซ็นข้อความ V3 และ footer
- [ ] ตรวจ **341/341 original source IDs, 20 หมวด, 20 หน้าที่, 5 closing lines**, no loss; รายชื่อ/ข้อผิดพลาดจาก V3 ไม่ถูกแก้โดยคาดเดา
- [ ] ตรวจสระ/วรรณยุกต์กับ `ดำเนินการ`, `ตำบล`, `อำนวยการ`, `จัดทำ`, `น้ำดื่ม`, `คำ`, `มีหน้าที่`, โดย normalize Unicode ก่อนค้นหา และไม่มี `a`/semicolon ที่ไม่ใช่อักษรไทย
- [ ] คง **236 รายการแข่งขัน, 250 กรรมการ (ทะเบียนตรวจชื่อแยก), 486 PDF anchors, 17 V3 appendix pages, 6 bracket review notes**, กติกา/พิธีเปิด/ปิด/สนามไม่เปลี่ยน
- [ ] ผู้จัดตรวจต้นแบบ **PDF review ทั้งเล่มและเฉพาะ 11 หน้า** ก่อน merge PR implementation; รีเช็ค no orphan page/A4 search and mobile PDF direct-page links
- [ ] แผน R11E ยังต้องตรวจรับคำสั่ง/เลขที่/ลายเซ็น/รายชื่อจริง; **ทุกไฟล์ยัง review-only**, ไม่เปลี่ยน PDF ทางการ/หน้าเว็บ/Google Docs/ผลแข่งขัน; ไม่แก้/ย้ายภาพใน Drive

## 4. การส่งงาน / การป้องกันงานชนกัน

1. ทำ N3-A (renderer+test) ใน PR แยกก่อน; **ไม่แก้ master fixtures หรือประกาศลงนาม**.
2. ทำ N3-B integration ใน PR ต่อจาก A โดยล็อก source model/CI regression; review PDF ก่อน merge
3. ส่ง review PDF ไปโฟลเดอร์ `ปี 2569/สูจิบัตร` แบบ **ชื่อรุ่นใหม่** เฉพาะเมื่อการอัปโหลดใช้ connector file reference ที่รองรับและอ่าน metadata ยืนยันได้; ห้าม overwrite `announcement_formal_preview_v2.pdf` (golden) หรือ N1/N2 เดิม
4. R11C cover G2, R20 brackets, R12 roster, R15 results แยก workstreams ได้; งาน N3 แตะเฉพาะ notice renderer, booklet builder และ QA ตามไฟล์ที่ตกลง เพื่อไม่ชนการแก้ fixtures
5. อัปเดตแผนสถานะหลักจาก `N2 QA passed` เป็น `N2 historical, **N3 implementation pending**` โดยไม่แก้ย้อนหลัง PR #82 หรือเอกสารประวัติ

## 5. Decision / next action

**แนวทางที่วิเคราะห์แนะนำ:** ใช้ **PR #82 โดยตรง** เป็น golden document สำหรับหน้าประกาศ; เปลี่ยนเนื้อหาในสูจิบัตรจาก N1+N2 12 หน้าเป็น PR82-compatible 11 หน้า; รักษาเนื้อหา/แหล่งที่มา/ชื่อผู้มีหน้าที่ครบ; QA layout เทียบกับ PDF Drive ทุกช่วง.

**สถานะ ณ บันทึกแผน:** มีการตรวจ PDF Drive/โค้ด/เปรียบเทียบภาพจริงแล้ว และบันทึกแผนเข้า Repo เท่านั้น **ยังไม่ได้เปลี่ยนตัวสร้าง PDF หรือเผยแพร่ PDF ใหม่**.
