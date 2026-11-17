# R24-E1 — รายงาน Pages HTTP / Chromium Mobile Viewport / PDF Reader Compatibility QA

วันที่ 7 พฤศจิกายน 2569 (Asia/Bangkok)  
**สถานะ: DEVELOPED + CI PASS / PR #124 DRAFT / NOT MERGED / FIX NOT DEPLOYED / MANUAL DEVICE ACCEPTANCE BLOCKED**

## หลักฐานจริงก่อนเริ่ม R24-E1

- `main` SHA `58184fe14b92b62babc151fd0cd52176b1a59b88` หลัง PR #123 R24-D Merge
- [Pages build/deploy run 42388482234 — SUCCESS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42388482234) สำหรับ `main`; build/deploy ไม่เท่ากับ HTTP/UI/มือถือผ่าน
- อิงแผนเดิม `docs/R24E_THREE_VERSION_BOOKLET_MOBILE_ACCEPTANCE_PLAN_20261107.md`; แผนปฏิบัติใหม่เฉพาะ QA `docs/R24E_BROWSER_QA_EXECUTION_PLAN_20261107.md` บันทึกก่อนแก้โค้ด
- Repo V2 PDF 41 หน้า + V3 PDF 64 หน้าไม่แก้, เล่มรวม G2 155 หน้ายังเป็น `REVIEW ONLY`; Drive permission `access_not_verified`

## 1. Production HTTP — PASS 9/9, *เฉพาะเว็บไซต์ที่เผยแพร่จาก main เดิม*

GitHub Actions รัน `scripts/booklets/test-r24e-live-http.mjs` จาก network runner ผ่าน **9/9 GET** รหัส HTTP 200 พร้อมตรวจ HTML marker, registry JSON และ PDF magic:

1. `index.html`
2. `booklets.html`
3. `booklet-comparison.html`
4. `booklet-private-viewer.html`
5. `pdf-viewer.html`
6. `committee-pdf-viewer.html`
7. `data/booklet-versions.json`
8. `assets/souvenir-2569-v2.pdf`
9. `assets/souvenir-committee-2569-v3.pdf`

หลักฐาน: [R24-E GitHub Actions run 42390510109 — SUCCESS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510109) ใน job `production-http-probe`, artifact `r24e-production-http-probe`. นี่คือ **HTTP 200 และ body marker** ไม่ใช่การทดสอบ web UI ผ่านเครื่องจริง และยังไม่ได้ปล่อย code fix ของ PR #124 ขึ้น main

## 2. พบและแก้ PDF.js browser compatibility defect — PASS ใน PR

### Error ที่พบ

Chromium 1.56.1 (เทียบกลุ่มเบราว์เซอร์ที่ยังไม่มี JS built-in ใหม่) เปิด V2 ผ่าน PDF.js v6.4.299 `modern` จาก CDN แล้ว `PDFPageProxy.render` โยน

`TypeError: this[#da].getOrInsertComputed is not a function`

ผล: หน้า PDF ไม่แสดง, ไฮไลท์คู่แข่งขันไม่เกิด, หน้า PDF V2/V3 เดิมต้องเปิดไฟล์โดยตรงแทนในบาง browser version. จุดนี้เป็นปัญหาจริงของ **ความเข้ากันได้ของ JavaScript runtime** ไม่ใช่ไฟล์ PDF ผิดหรือพิกัดสูญหาย. หลักฐาน CI [run 42389873447](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42389873447).

### Remediation ใน PR #124

- ปรับ `js/pdf-viewer.js` และ `js/booklet-private-viewer.js` ใช้ **version-pinned pdfjs-dist@6.4.299 legacy build** ของ ESM module + worker ทั้งคู่ ตามคำแนะนำ Mozilla สำหรับ browser รุ่นที่ไม่มี JS features ใหม่
- คง URL ต้นฉบับ V2, V3, ไฟล์ PDF, พิกัด R23/R19K, fixture IDs, committee IDs, 155 private map, results and standings เดิมทั้งหมด
- แก้ expected pinned CDN assertion ใน `scripts/ux/test-pdf-viewer-r11d2.mjs` ให้ตรงรุ่น legacy ไม่ลดการตรวจ source version
- ทดสอบจริงใน Chromium ขนาด iPhone/Android/desktop แล้ว **V2 หน้า 7 พร้อมไฮไลท์ฟุตบอลคู่ที่ 6 แสดงได้, เปลี่ยนหน้า 8 ล้างกรอบ, V3 หน้า 6 แสดง PDF.js canvas ได้จริง (status hidden และไม่มี failure)**

อ้างอิง compatibility: [Mozilla PDF.js FAQ](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions) และ [Map.getOrInsertComputed browser support](https://caniuse.com/mdn-javascript_builtins_map_getorinsertcomputed).

## 3. Browser emulation QA — PASS 3 viewport profiles

Automated Playwright Chromium **ใน local static server** (ไม่ใช่การทดสอบ GitHub Pages production UI):

| Profile | viewport | Result |
|---|---|---|
| iPhone-sized Chromium | 390 × 844 touch | PASS |
| Android-sized Chromium | 412 × 915 touch | PASS |
| Desktop Chromium | 1280 × 800 | PASS |

ตรวจ:
- ศูนย์เอกสาร 3 ใบ, V2/V3 route คงเดิม, 155 แสดง `รอตรวจสิทธิ์` และ private local-file viewer เท่านั้น
- PDF SHA ไม่ตรงและ map ทดสอบผิด → fail-closed ไม่มีการแสดง PDF/ไฮไลท์
- รายงานตรวจเทียบ **236 fixture / 250 committee / 486 PDF anchors / 486 NEEDS_REVIEW**, ไม่แสดงว่ารายการได้รับรอง
- กีฬา `ฟุตบอล` กรองได้ 20 รายการ, ค้นข้อความที่ไม่มีข้อมูลเป็น 0, ปุ่มคัดลอกแสดงผล/มี fallback
- V2 actual PDF.js render + R23 fixture highlight + page navigation; V3 actual PDF.js render+64-page counter (ไม่ถ่าย screenshot ที่มีชื่อกรรมการ)
- เมนู `เพิ่มเติม` ไปศูนย์เอกสาร, ไม่มี private Drive download จากเว็บ, ไม่มี POST/WRITE requests และไม่มี browser pageerror; หน้า document/comparison ไม่มี horizontal overflow ตาม viewport tests
- มี screenshot artifacts เฉพาะหน้าเอกสารและ local file gate ที่ไม่แสดงชื่อบุคคลหรือ private PDF

หลักฐาน: [R24-E Chromium + Production HTTP CI PASS 42390510109](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510109); artifact `r24e-chromium-local-no-personal-data`.

## 4. Regression CI ที่ตรวจบน HEAD `b61e552df7bdcea93ff234ef18ff3b9a8a60f2dc` (ก่อนเพิ่ม QA นี้)

| Suite | Evidence |
|---|---|
| R11D PDF reader | [PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510094) |
| R23 fixture highlight | [PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510087) |
| R19-A/C committee | [PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510076) |
| R19K committee coordinate | [PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510170) |
| R14 LINE/schedule | [PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510093) |
| R24-A/B registry | [PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510097) |
| R24-C private viewer | [PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510079) |
| R24-D comparison | [PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510081) |
| Validate draft data | [PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42390510058) |

## 5. Gate ที่ยังไม่ผ่าน / Rollback

1. **PR #124 ยัง DRAFT / NOT MERGED / NOT DEPLOYED**. Code fix legacy runtime ยังไม่ขึ้น live until authorized Merge, deployment and post-merge QA. ก่อน Merge ตรวจ latest HEAD and CI อีกครั้ง
2. **REAL DEVICE BLOCKED:** ยังไม่ได้ผู้ตรวจเปิด Safari iPhone จริง, LINE iOS/Android, Chrome Android และทำ screenshot/คลิปตรวจรับที่ไม่แสดงข้อมูลบุคคล โดยต้องตรวจ V2/V3 highlight, pinch, rotation, file picker, copy/share/back and load/fallback
3. **V4.2-I10 155-page official publication BLOCKED:** Drive access/rights to child photos and organizer R11E approval still not verified. Only local authorized PDF+map workflow exists; no public Google Drive URL in site
4. **Data/content equivalence BLOCKED:** 486 anchor positions ≠ 486 field-level source rows confirmed. No committee appointments/competition results/standings are approved here
5. **Rollback:** If legacy viewer causes regression after merge, revert only PDF.js URL change in R24-E, preserve V2/V3 original PDF assets and direct-open fallback. Never remove archived PDFs.
6. **Physical QA handoff:** ผู้จัดตรวจ `https://infobwd.github.io/nongkum-sports-hub/booklets.html` และ `.../booklet-comparison.html` บน iPhone Safari/LINE พร้อมตรวจ PDF V2 หน้า 7 คู่ 6 และ V3 หน้า 6; บันทึก PASS/FAIL และรุ่น iOS/LINE ในพื้นที่ private, แล้วพิจารณารับรอง R24-E

**สถานะสรุป:** `PAGES HTTP PASS`, `CHROMIUM EMULATION PASS`, `PDFJS LEGACY COMPATIBILITY FIX DEVELOPED + CI PASS`, `MERGE/NEW DEPLOY/REAL MOBILE ACCEPTANCE PENDING`.
