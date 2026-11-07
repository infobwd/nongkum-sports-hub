# R24-E1 — Pages deployment evidence + automated mobile-viewport QA

วันที่ 7 พฤศจิกายน 2569  
**สถานะ: แผนบันทึกก่อนพัฒนา / ยังไม่ Merge PR นี้ / ยังไม่ผ่านการตรวจรับมือถือจริง**

## ตรวจต้นฉบับ/แผนเดิม
- `main` SHA `58184fe14b92b62babc151fd0cd52176b1a59b88` หลัง Merge PR #123; PR #116/#118 ยังเป็น Draft; PR #117 ถูกปฏิเสธ ห้าม Merge
- ใช้แผนเดิม `docs/R24E_THREE_VERSION_BOOKLET_MOBILE_ACCEPTANCE_PLAN_20261107.md` ที่มีอยู่แล้ว ไม่เปิดแผน R24-E ซ้ำ
- [GitHub Pages build+deployment SUCCESS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42388482234) จาก commit `58184fe14...`; คือหลักฐานการ build/deploy ไม่ได้ยืนยัน HTTP หรือ UI บนอุปกรณ์จริง
- เครื่องมือ web เปิด `https://infobwd.github.io/nongkum-sports-hub/` และหน้า R24 โดยตรงไม่ได้, เครื่องมือ Browser ไม่มี originating browser context, เครื่องมือ container ไม่มี external DNS: จึง **ไม่อนุมานว่า live 200 OK หรือมือถือผ่าน**
- `booklets.html` แสดง V2/V3 อย่างเดิม, เล่ม G2 155 หน้ายัง `access_mode=restricted_review_pending_permission`; `booklet-comparison.html` เป็น read-only และ `booklet-private-viewer.html` ใช้ไฟล์เฉพาะผู้มีสิทธิ์
- R19-D ทางตรวจกรรมการรายโรงเรียนมีระบบแยกสิทธิ์/เข้ารหัสและส่ง LINE แบบไม่บันทึกรับรองอัตโนมัติ; ต้อง reuse

## ขอบเขตพัฒนาที่ทำได้ในรอบนี้
1. เพิ่ม automated browser smoke test บน **Chromium** โหมด viewport มือถือ iPhone-size, Android-size และ desktop; รัน GitHub Actions ผ่าน static localhost (ไม่ไปเปิด PDF Drive ที่ยังรอตรวจสิทธิ์)
2. ทดสอบหน้าเอกสารสามฉบับ, การ์ด V2/V3 reader routes, ป้ายฉบับ 155 หน้ารอตรวจ, private file picker+wrong PDF/map fail-closed, หน้าเทียบ 236 fixture + 250 committee + 486 anchor, ตัวกรอง ค้นหาและรายงานคัดลอก, เมนูเพิ่มเติมและไม่ลิงก์ private Drive URL
3. ตรวจไฟล์ต้นฉบับ V2 (41 หน้า), V3 (64 หน้า), JS / JSON paths ส่ง HTTP 200 จาก **local static server only**; ห้ามรายงานเป็นการยืนยัน GitHub Pages production
4. หลักฐาน CI/หน้าจอทดสอบ synthetic Chrome emulator เก็บเฉพาะหน้าไม่แสดงข้อมูลบุคคล ไม่เก็บ PDF ภาพเด็กหรือ private map ใน public artifacts
5. เพิ่ม workflow CI แยก รอผู้จัดอนุญาต Merge; สรุปทั้ง PASS/FAIL/BLOCKED ลง `docs/R24E_*_QA_20261107.md`

## ที่ยัง BLOCKED
- Physical iPhone Safari, LINE WebView iOS/Android, Chrome Android device (real device) ยังต้องมีผู้ตรวจใช้งานจริง ถ่ายหลักฐานปลอด PII
- HTTP production page/load verified ภายนอก GitHub Actions ถ้าตรวจไม่ได้ให้ระบุ `UNVERIFIED`, ไม่เรียก LIVE PASS
- 155-page PDF G2 Drive access / child imagery rights / R11E official content release not approved, no direct public PDF link
- ตรวจ correctness 486 field-level records ไม่ใช่ scope acceptance test นี้ และไม่มีการอนุมัติผล/กรรมการอัตโนมัติ

## Regression Gate
- ห้ามแก้เอกสาร PDF V2/V3, source results/standings, roster, page-map private, Apps Script
- หาก fail ให้แก้ใน PR เดียวกันพร้อมผล CI ใหม่; PR ยัง Draft จนก่อนอนุญาต Merge

## Addendum: browser compatibility defect discovered BEFORE viewer fix

- Local Chromium runtime in Playwright 1.56.1 on Ubuntu Noble, actual PDF.js V6.4.299 modern build failed at `PDFPageProxy.render`: `TypeError: this[#da].getOrInsertComputed is not a function` (CI [evidence](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42389873447)).
- The error occurred after PDF got page 7 and canvas set dimensions, but *before* fixture highlight. Both PDF CDN scripts returned network responses; not a broken PDF or map. Modern PDF.js uses `Map.prototype.getOrInsertComputed` and browsers without that native feature cannot render.
- Public browser compatibility references: Mozilla PDF.js recommends its `legacy` distribution for browsers lacking newer JS features; browser compatibility of `Map.getOrInsertComputed` varies by Chrome/Safari versions. This specifically affects the user project's iOS/Safari/LINE support gate.
- **Scoped remediation before code:** switch `js/pdf-viewer.js` and `js/booklet-private-viewer.js` to the **matching `pdfjs-dist@6.4.299/legacy/build/pdf.min.mjs` and `pdf.worker.min.mjs`** URLs, pinned to same package version; preserve all source PDF files, coordinates and routes; update the R11D test assertion to new pinned source; run R11D, R14, R19, R24C/D/E suites and actual Chromium PDF rendering smoke. If legacy build fails, do not claim fix/acceptance.
- Avoid injecting custom unreviewed global polyfills into Safari/LINE. Do not change Drive permission or make 155-page PDF public.
