# R25-C — Design V2 Full 155-page PDF: Delivery & QA (10 Nov 2026)

วันที่: 10 พฤศจิกายน 2569 (Asia/Bangkok)  
**สถานะ: PDF BUILT + DRIVE REVIEW COPY DELIVERED / NOT MERGED / NOT OFFICIALLY PUBLISHED / ORGANIZER PRINT & MOBILE ACCEPTANCE PENDING**

## 1. หลักฐานที่ตรวจจากต้นฉบับล่าสุด

- PDF อ้างอิงจริง: [V42-I10 G2 Selected Cover 155 หน้า](https://drive.google.com/file/d/1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF/view), `4,067,611 bytes`, SHA-256 `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d`. SHA ตรงกับ [PR #127](https://github.com/infobwd/nongkum-sports-hub/pull/127) และ public mirror บน main
- อ่านโครงสร้างต้นฉบับจริงด้วย PyMuPDF: **155 หน้า A4; PDF bookmarks 175 รายการ; ข้อความทุกหน้าสามารถแยกได้**
- อ้างอิง [R25 Design V2 plan](R25_155PAGE_DESIGN_V2_CONTENT_LOCK_PLAN_20261110.md) และ [ผลตัวอย่าง 6 หน้า](R25B_6PAGE_DESIGN_PILOT_QA_20261110.md)

## 2. สิ่งที่สร้างจริง

- **ชื่อไฟล์แยก:** `MittraphapGames_2569_DesignV2_Full_155pages_REVIEW_ONLY_20261110.pdf`
- **Google Drive — ไฟล์ใหม่:** [เปิดอ่าน Design V2 Full PDF](https://drive.google.com/file/d/11sUR37i3iIalSUyv6WjOycdUqB40XWf-/view?usp=drivesdk)
- Parent folder: [สูจิบัตร](https://drive.google.com/drive/folders/1c4diWWZfqaMzEcwj3-crd3T3Up06phT0), id `1c4diWWZfqaMzEcwj3-crd3T3Up06phT0`
- Drive upload response `success=true`; verified metadata after upload `application/pdf`, **4,164,674 bytes**, parent folder correct, new ID `11sUR37i3iIalSUyv6WjOycdUqB40XWf-`; did **not** overwrite old PDF, change sharing, edit Google Docs, GitHub Pages, or Sheets.
- Local output SHA-256 `11e3f8408b73aa9b3187a0807762a209f28df6a9700eee18f89d5dea9e96100e`
- Source file remains in original form.

## 3. Exact design strategy and limitations

**Content-locked PDF derivative** rather than word-reflow, to honor 155-page cap and preserve all prior corrected content. Each original PDF page is embedded vector-for-vector as a PDF form within new A4 page with 0.948 uniform scaling (**5.2% smaller**) centered x=15.4772 pt and y=21.8891 pt. Adds premium ivory book margin, asymmetric navy+gold chapter rail, mirrored page folios, English functional chapter ribbons (decorative only), and retains selected G2 sports-photo cover rather than pilot placeholder.

- This is a **full 155-page visual reframe** that follows the pilot's navy/gold editorial direction. **Not** a complete reflow/retypeset to the exact six-page pilot layout.
- Source names, official notice content, schedule, results fields, bracket lines, source revision captions, caveats, original appendix and selected cover pixels are retained, no new competition data.
- Original booklet review status remains; visual change does not amount to rights clearance, organizer acceptance, or official publication.
- Cover photo permission/print resolution still needs organizer gate (source G2 is approx 127.5 DPI A4); no assumption of 300 DPI print master.

## 4. QA results (executed)

| Test | Result |
| --- | --- |
| Page count and A4 | **PASS 155/155 A4**, no extra page |
| Original PDF integrity | **PASS source SHA** |
| Content-page text tokens | **PASS 155/155** pages using bag/count of every word token extracted from source in generated PDF |
| Source words retained | **PASS 19,385 source words** preserved; 22,185 output words including chapter/footer graphics |
| Original document outline | **PASS 175/175 bookmarks**; same source page index |
| Clipping and page-word bounds | **PASS 155 pages**, 0 detected out-of-page word rectangles; min 27 extracted words/page |
| Visual spot check | Rendered sample 14 representative pages covering cover, ceremony, official, committee, rules, bracket, schedule, athletics, organizer notes and appendix |
| PDF metadata/fonts | PDF 1.7, embedded Thai source fonts, text selectable; no encryption |
| Drive readback | **PASS** new file ID, MIME, size 4,164,674 bytes and parent folder |

### Content checks and scope
The source contract from V42-I10 includes 236 active program entries (186 match + 50 athletics), 250 committee rows, 44 bracket groups, PR82 official text 11 pages, original V3 appendix 17 pages, and 486 page-map references. Each entire original page is embedded intact; **not a fresh semantic recount of all fields**. The exact paper source and labels may still include `⚠`/pending issues.

### New coordinate rule (do not blindly reuse existing viewer highlight coordinates)
No page reorder: page number N stays N. For each source PDF point:
`x_v2 = 15.477164917 + 0.948 × x_source`; `y_v2 = 21.889134033 + 0.948 × y_source`.
The original web reader's coordinate maps/486 links are **not updated or redirected** in this work, because replacing the production PDF would require a separate viewer+mapping acceptance and explicit publishing approval.

## 5. Pending before official printing/publication

1. ผู้จัดตรวจหน้าจริงบน iPhone Safari / LINE WebView, Chrome Android และขาวดำ/พิมพ์ A4 (การเรนเดอร์ตัวอย่างแทนการตรวจมือจริงไม่ได้)
2. ตรวจรายละเอียดสวยงามและความอ่านง่ายหลังลดสเกล 5.2%; หากเล็กเกินไป ต้องปรับกลยุทธ์โดยไม่ตัดเนื้อหา
3. ตรวจสิทธิ์และความละเอียดปกเด็ก, ชื่อ/กติกา/ผังที่ค้างตามข้อสังเกต; มติ R11E release gate ยังไม่ครบ
4. หากต้องการเล่มหน้าตาเหมือน pilot ในระดับการจัดบล็อกข้อความและขนาดหัวข้อ ต้องทำ **re-typeset/flow QA อีกงาน** เพราะจะไม่สามารถรับรอง 155 หน้าและ text parity โดยอัตโนมัติ
5. PR #131 **Draft / NOT MERGED**, ไม่แก้ PR #116/#118/#124 และไม่เปลี่ยนไฟล์ PDF ที่ใช้อยู่บน GitHub Pages หรือ V2 41 หน้า

## 6. Status
- วางแผนแล้ว: YES (R25)
- พัฒนาตัวอย่าง 6 หน้าแล้ว: YES (R25-B)
- สร้าง PDF ฉบับเต็ม 155 หน้าแล้ว: **YES**
- QA เชิงไฟล์/เนื้อหาผ่าน: **YES**
- ส่งสำเนาแยก Google Drive ให้ตรวจร่าง: **YES**
- Merge source PR: **NO**
- แทน PDF หน้าเว็บไซต์: **NO**
- ตรวจรับใช้งาน/เผยแพร่เป็นทางการ: **NO**
