# R24-G — ตัวอ่านสูจิบัตร 155 หน้าแบบเดียวกับ V2/V3 (Permissioned Unified Reader)

วันที่ 8 พฤศจิกายน 2569 — เอกสารแผนบันทึกก่อนแก้โค้ด
สถานะเริ่ม: PLAN RECORDED; โค้ดยังไม่ Merge/เผยแพร่/ตรวจรับ

## หลักฐานที่ตรวจ
- main ล่าสุด `608af45f5f4ef330bb985b144188253b1c43a427`, R24-F [PR #125](https://github.com/infobwd/nongkum-sports-hub/pull/125) Merge / Pages success; เปิดเล่ม 155 ผ่าน iframe Drive เท่านั้น ไม่มีแถบควบคุมของเว็บไซต์
- `pdf-viewer.html`, `committee-pdf-viewer.html`, `js/pdf-viewer.js` ใช้ PDF.js แสดง V2 41 หน้า/V3 64 หน้า พร้อมเลือกหน้า fit, zoom, swipe, highlight; V2/V3 ต้องไม่เปลี่ยน
- `booklet-private-viewer.html`, `js/booklet-private-viewer.js` มีตรวจ SHA256 ของ 155 หน้าและ private map SHA/486 จุด, ต้องเลือกไฟล์+map
- R24-E1 [PR #124](https://github.com/infobwd/nongkum-sports-hub/pull/124) ยังเปิด Draft, แก้ `js/pdf-viewer.js`, `js/booklet-private-viewer.js`; ห้ามแก้สองไฟล์นี้ใน R24-G, ก่อน merge #124 ต้องปรับ test browser ที่สมมติ 155 = local-only
- Google Drive file ID `1C1StUK5o1rXeOGzM4mOnvnwCgeuWdPRF` ขนาด 4,067,611 bytes, access `access_not_verified`; `data/booklet-versions.json`: SHA256 `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d`, 155 หน้า, 486 anchors, `publication_approved=false`
- R11C PR #116/#118 ยัง Draft; ไม่มีมติ/สิทธิ์ภาพอนุญาตเปิดไฟล์เป็น public

## วิธีส่ง PDF ภายใต้สิทธิ์ (ไม่ใช่ Drive iframe)
- GitHub Pages เป็น static site; **ฝัง iframe Google Drive ไม่สามารถส่ง byte ให้ PDF.js ได้โดยตรง** และไม่ใช้ private Drive direct URL ผ่าน fetch แบบไม่ยืนยันตัวตน
- เพิ่ม adapter แบบผู้ใช้กดปุ่มเข้าสู่ระบบ Google แล้วขอ OAuth **read-only** ผ่าน Google Identity Services พร้อม Google Drive API `files.get?alt=media`; Google ACL เป็นผู้ตัดสิน. ต้องจัด Google Cloud OAuth Web Client ID และ authorized JavaScript origin สำหรับ GitHub Pages (นโยบายการยินยอมของ Google ขึ้นอยู่กับบัญชีและ scope)
- ค่าตั้งต้น `data/booklet-oauth-config.json` = disabled จนกว่าผู้ดูแลตั้ง Client ID/consent/permissions จริง; ไม่ใส่ client secret/access token ในเว็บ, ไม่เปิด public, ไม่มี server bypass
- เมื่อมี token จาก callback เก็บไว้ใน scope ชั่วคราวสำหรับคำขอ download เท่านั้น ไม่ใช้ localStorage/sessionStorage; ดาวน์โหลด PDF เข้า memory, ตรวจ MIME/size, **ตรวจ SHA256 ของ byte ทุกครั้ง** และจำนวนหน้า 155 ก่อนเปิด
- ไม่ตรวจ map/ไฮไลท์อัตโนมัติจาก source PDF; private map ต้องเลือกโดยผู้มีสิทธิ์ และตรวจ schema + SHA256 เดิมก่อนเชื่อม fixture/entry; หาก map ไม่มีให้เปิดหน้าอ่านทั่วไป ไม่อ้างว่า highlight สำเร็จ
- ทางเลือกใช้ไฟล์ local PDF ในตัวอ่านใหม่ได้ทันทีเพื่อทดลอง UI แบบ V2/V3; สำรอง Drive iframe และเปิด Drive link ใช้งานได้เมื่อ OAuth ยังไม่พร้อมหรือผู้ใช้ปฏิเสธ / WebView บล็อก popup

## ขอบเขตไฟล์
- เปลี่ยน `booklet-drive-viewer.html` ให้มี single reader UI (reader toolbar/nav/menu/fit/zoom/swipe) + Drive preview fallback + local PDF input + map input แบบ optional + ป้าย draft
- ใหม่ `js/booklet-unified-viewer.js`, `css/booklet-unified-viewer.css` โดยอ้างอิงหลัก UX V2/V3 แต่ไม่แก้ shared viewer
- ใหม่ `data/booklet-oauth-config.json` (disabled, client id null)
- tests `scripts/booklets/test-r24g-unified-reader.mjs` + workflow แยก; ปรับ regression R24-F เท่าที่จำเป็น
- ไม่แก้ V2/V3 PDF, `js/pdf-viewer.js`, `js/booklet-private-viewer.js`, `data/program-*.json`, committee, ผล/อันดับ, private map/asset PDF หรือสิทธิ์ Drive

## ขั้นการดำเนินงานและเกณฑ์ตรวจรับ
1. PLAN RECORDED → พัฒนาบน branch แยก → QA/CI → PR; **ไม่ Merge ถ้ายังไม่ได้รับอนุญาต**
2. Reader local PDF 155 หน้า: หน้า 1/99/100/155, prev/next, page clamp, fit page/width, zoom, swipe, resize, memory cap, PDF.js legacy fallback (รองรับ Safari)
3. OAuth ไม่พร้อมให้แสดงชัดว่าไม่พร้อมเปิดแบบเดียวกันผ่าน Drive, มี fallback ที่ยังใช้ได้; no silent public exposure.
4. OAuth พร้อม: ผู้มีสิทธิ์ login แล้ว PDF bytes ผ่าน Google Drive API, SHA+page verification, ไม่มี token leak, 403 handled; ต้องมีหลักฐานทดสอบ end-to-end ด้วยบัญชีมีสิทธิ์และไม่มีสิทธิ์
5. map optional: ไม่ไฮไลท์หาก map SHA ไม่ตรง, anchor 486 ตรวจ SHA+source ID; ไม่เผยแพร่ private map
6. V2 41 / V3 64 / active fixtures 236 / committee 250 / R24-D 486 need-review ไม่เปลี่ยน
7. CI ผ่านแยกจาก actual device acceptance; ทดสอบจริง Safari iPhone, LINE WebView, Android Chrome และอนุญาตข้อมูลก่อนเผยแพร่เล่มเป็นทางการ
8. หาก OAuth ยังไม่พร้อม: สถานะ `CODE READY / ONLINE AUTH BLOCKED` ไม่เรียกว่าเปิด unified PDF ออนไลน์เสร็จ

## Dependencies
- เจ้าของโครงการต้องสร้าง/configure Google Cloud OAuth consent & Web Client ID ที่ origin `https://infobwd.github.io` และเปิด Drive API, ตรวจความเป็น restricted scope และสิทธิ์บัญชีจริง. อย่าสร้าง client ID ปลอมหรือเก็บ secret ใน repo.
- PR #124 ต้อง rebase/reconcile browser assertions กับ UI R24-G ก่อน Merge
- R11E legal/document approval เป็น gate แยกจากการเปิดให้ผู้มีสิทธิ์อ่านร่าง
