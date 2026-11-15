# R31 — ปรับเว็บไซต์มิตรภาพเกมส์ 2569 เป็น PWA (15 พฤศจิกายน 2569)

สถานะเริ่มต้น: **PLANNED** (ยังไม่ Merge / ไม่อ้างว่าติดตั้งใช้งานจริงผ่านการตรวจรับอุปกรณ์)
Repository: `infobwd/nongkum-sports-hub` · base: `main` · Branch: `feature/r31-pwa-shell-20261115`

## ข้อมูลที่ตรวจสอบก่อนทำ
- `index.html`, `results.html`, `standings.html`, `review.html`, `committee.html` เป็นหน้าเว็บสาธารณะบน GitHub Pages ที่ใช้ไฟล์ HTML/JS และข้อมูล JSON ที่เผยแพร่เป็น snapshot
- ไม่พบการผูก Web App Manifest หรือการลงทะเบียน Service Worker ในหน้า `index.html` ณ จุดตรวจ
- แผนเว็บปัจจุบัน: `docs/SPORTS_2569_WEB_ACTIVE_PLAN_20261107.md`; หลักการ **MERGED ≠ DEPLOYED ≠ DEVICE ACCEPTED ≠ APPROVED**
- PR เปิด #137 เปลี่ยน `booklets.html`/ข้อมูลตาราง; PR #138–139 เปลี่ยนส่วนจัดเล่มและ docs/scripts เฉพาะ; ต้องหลีกเลี่ยงแก้ไฟล์ขัดแย้งและไม่เปลี่ยนข้อมูลแข่งขัน

## ขอบเขต R31
1. เพิ่ม `manifest.webmanifest` มี `id`, `start_url`, `scope` แบบ relative สำหรับ GitHub Pages ภายใต้ `/nongkum-sports-hub/`, ชื่อ/สีธีมกรมท่า–ทอง และไอคอน 192/512 รวม Apple touch icon
2. เพิ่ม `sw.js`: จำกัด scope อยู่ใน repository, precache แค่ shell/หน้าออฟไลน์/ไอคอนที่ไม่อ่อนไหว; network-first สำหรับหน้าเว็บสาธารณะหลัก, fallback แบบระบุชัดเมื่อออฟไลน์; ปรับรุ่น cache และเคลียร์รุ่นเก่าในการ activate
3. **ห้าม cache** `/data/`, JSON, PDF, ผล/อันดับ/กรรมการที่ต้องตรวจสถานะ, query API, POST, หน้าแชร์รายคู่ `/m/`, scripts ของ Google หรือ endpoint ใดที่อาจมีสิทธิ์; ไม่ให้ข้อมูลที่แสดงแก่ผู้ชมขัดกับแหล่งรับรอง
4. เพิ่ม `js/pwa.js` ลงทะเบียน Service Worker เฉพาะ secure contexts/host รองรับ, รองรับ Android install prompt และคำแนะนำ iOS Safari/LINE โดยไม่รบกวนการเปิดลิงก์/การพิมพ์แบบ A4
5. เพิ่ม `offline.html` สำหรับอธิบายข้อจำกัดเมื่อไม่มีเน็ตและปุ่มลองอีกครั้ง ไม่สร้าง/แสดงคะแนนหรือสถานะจำลอง
6. ผูก manifest/Apple icon/registration เข้าหน้าหลัก (`index`, `results`, `standings`, `review`, `committee`); เลี่ยง `booklets.html` ระหว่าง PR #137 เปิดอยู่; สามารถติดตั้งจากหน้าแรกและเปิดหน้าเอกสารต่อเมื่อออนไลน์
7. เพิ่ม static QA ที่ทดสอบ manifest สโคป เส้นทาง icon/ไฟล์ และนโยบายไม่ cache ข้อมูลแข่งขัน

## เกณฑ์ QA และการเผยแพร่
- [ ] Manifest parse/paths/scope ถูกต้องโดยไม่ผูกกับ root โดเมน
- [ ] มีไอคอน PNG 192x192 และ 512x512 รวม Apple touch icon
- [ ] Offline fallback ทำงานแม้เว็บไซต์ถูกติดตั้งแล้ว; ไม่มีคะแนนหรือประกาศเก่าทำให้เข้าใจว่าเป็นข้อมูลใหม่
- [ ] API/JSON/PDF/หน้าแชร์/ข้อมูลที่ต้องรับรองไม่ถูกบันทึกใน Cache Storage
- [ ] Chrome Android: install, offline/reconnect; Safari iPhone: เพิ่มไปหน้าจอหลัก; LINE in-app browser: เปิดใน Safari/Chrome เพื่อทำการติดตั้ง
- [ ] ไม่มีผลต่อปุ่ม refresh, deep link, filter, โปรแกรม 236 รายการ, ผลรับรอง, ใบคะแนน และข้อจำกัดข้อมูลส่วนบุคคล
- [ ] CI และตรวจบนอุปกรณ์จริงหลัง deploy; **ไม่ปิด DEVICE QA หากไม่มีหลักฐาน**

## การควบคุมการเปลี่ยนแปลง
บันทึกแผนก่อนแก้โค้ด; งาน PR แยกจาก R28/R29/R30. ก่อน merge รอตรวจ CI และการอนุญาตของผู้จัด. หลัง merge ต้องตรวจ URL ที่เผยแพร่จริงและการติดตั้งบนเครื่องก่อนสถานะ **ACCEPTED**.

## บันทึก QA เพิ่มเติม 15 พฤศจิกายน 2569 — ตรวจพบ Regression Suite ที่ผูกวันกับเวลาจริง
- [R31 PWA Actions run #43732071134](https://github.com/infobwd/nongkum-sports-hub/actions/runs/43732071134) **PASS**: syntax, manifest, ไอคอน 180/192/512, offline simulation และไม่ cache JSON/หน้าเว็บ
- ชุดทดสอบเดิม R13/R14/validate/R15-DE คาดว่าเปิดเว็บไซต์ก่อนวันที่ 12 พ.ย. 2569 จึง assert ว่ากลุ่มแรกต้องเป็นวันที่ 12 พ.ย.; ในวันที่ 15 พ.ย. เว็บเลือกวันถัดไป 16 พ.ย. ตามการทำงานจริง ทำให้ test fail แม้ไม่เปลี่ยน `js/program.js` หรือข้อมูลใด
- เพื่อให้ CI เป็นการตรวจย้อนหลังที่ทำซ้ำได้ จะทำให้ **test harness** 3 ไฟล์ใช้วันที่จำลองก่อนการแข่งขันที่กำหนดแน่นอน (`2026-11-10T02:00:00Z`); ไม่เปลี่ยน runtime/date logic เว็บไซต์ ไม่แตะข้อมูลจริง และคง unit test เปลี่ยนวันที่ไว้ตามเดิม
