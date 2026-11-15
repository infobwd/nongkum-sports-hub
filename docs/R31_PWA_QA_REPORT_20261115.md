# R31 — รายงานตรวจสอบ PWA และการทดสอบเว็บไซต์ (15 พฤศจิกายน 2569)

**ขอบเขต:** branch `feature/r31-pwa-shell-20261115` / PR #140; ไม่ใช่การตรวจรับบนอุปกรณ์จริง

## หลักฐาน
- [PR #140](https://github.com/infobwd/nongkum-sports-hub/pull/140)
- [แผน R31](R31_PWA_INSTALL_OFFLINE_PLAN_20261115.md)
- [R31 PWA QA](https://github.com/infobwd/nongkum-sports-hub/actions/runs/43732413360) — **SUCCESS**
- [Validate draft data](https://github.com/infobwd/nongkum-sports-hub/actions/runs/43732413370) — **SUCCESS**
- [R13 latest public PDF program and UI](https://github.com/infobwd/nongkum-sports-hub/actions/runs/43732413530) — **SUCCESS**
- [R13 main candidate and toast](https://github.com/infobwd/nongkum-sports-hub/actions/runs/43732413400) — **SUCCESS**
- [R14 field-ready schedule and LINE](https://github.com/infobwd/nongkum-sports-hub/actions/runs/43732413397) — **SUCCESS**
- [R15-D/E mobile](https://github.com/infobwd/nongkum-sports-hub/actions/runs/43732413403) — **SUCCESS**
- GitHub Actions รวม **13 workflows ผ่าน** ณ commit `c78c9058d5108c54405534e41160441e8a492c62` (รวมเอกสารสูจิบัตร กรรมการ ตารางคะแนน และการแชร์)

## สิ่งที่ตรวจในโค้ด
- Manifest กำหนด `./` scope และ `./index.html` start URL ถูกต้องสำหรับ `/nongkum-sports-hub/` ใน GitHub Pages
- ตรวจไฟล์ PNG และขนาดไอคอน 180×180, 192×192 และ 512×512 ผ่านโดยโค้ด Node
- หัวเว็บผูก manifest และ `js/pwa.js` ใน `index.html`, `results.html`, `standings.html`, `review.html`, `committee.html` และ `install.html`
- Service Worker เปิดหน้าออฟไลน์เมื่อไม่มีเครือข่าย; เก็บ cache เฉพาะหน้า `offline.html` และไอคอนของแอป; ไม่ cache โปรแกรมการแข่งขัน, ผลการแข่งขัน, PDF, HTML, JSON หรือ endpoint เขียนข้อมูล
- ทดสอบ Service Worker จำลองการติดตั้ง, activate, การเปลี่ยน cache รุ่น, การนำทาง online/offline, การปฏิเสธการจัดการข้อมูลและคำขอ POST
- ชุดทดสอบเดิมบางชุดใช้เวลาจริงแล้วคาดว่าจะพบ 12 พฤศจิกายนเป็นวันถัดไป ซึ่งไม่ถูกต้องเมื่อรันวันที่ 15 พฤศจิกายน; ปรับเฉพาะ mock `Date` ของ test harness 3 ไฟล์เป็นวันที่ตัวอย่างก่อนแข่ง ไม่แก้ business logic วันจริงและไม่เปลี่ยนข้อมูลแข่งขัน

## สิ่งที่ไม่ถูกเปลี่ยนแปลง
- ไม่มีการแก้ไขรายการกีฬา คู่แข่งขัน คะแนน ผลรับรอง อันดับ หรือรายชื่อกรรมการ
- ไม่แก้ `booklets.html` ที่มี PR #137 เปิดอยู่
- ไม่แสดงคะแนนหรือข้อมูลเก่าแทนข้อมูลที่ได้รับการรับรองล่าสุด

## สถานะและการตรวจรับ
- [x] วางแผนใน repository ก่อนแก้ไฟล์
- [x] พัฒนาโค้ดใน branch แยกและเปิด PR
- [x] Structural / functional CI test ทุกชุดผ่าน (13 workflows)
- [ ] Merge PR #140 — **รอผู้จัดอนุญาต**
- [ ] Deploy GitHub Pages — **ยังไม่ทำ**
- [ ] Android Chrome: ติดตั้ง, ปิดเน็ต/เปิดเน็ต, refresh, deep link, อัปเดตเวอร์ชันจริง
- [ ] iPhone Safari: เพิ่มไปหน้าจอหลัก, Safe Area, refresh, เปิด PDF
- [ ] LINE ใน iOS/Android: เปิดผ่าน browser ภายนอกตามคำแนะนำ, แชร์ลิงก์และเปิดแอป
- [ ] ตรวจรับจากผู้จัด/เจ้าหน้าที่สนาม — **ยังไม่รับรอง**

**ข้อจำกัด:** PWA ในระยะนี้เน้นการติดตั้งและการกลับมาเปิดเว็บ ไม่ใช่เว็บออฟไลน์ที่แสดงผลแข่งขัน เพราะข้อมูลเปลี่ยนได้ในระหว่างวันแข่งขัน
