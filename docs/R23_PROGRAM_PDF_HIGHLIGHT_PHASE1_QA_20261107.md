# R23 Phase 1 — ผลพัฒนา/ทดสอบไฮไลท์รายการแข่งขันใน PDF V2 (7 พฤศจิกายน 2569)

**สถานะ:** DEVELOPED / SOURCE COORDINATE QA PASS / CI PASS (ตรวจบน PR #119) / DRAFT NOT MERGED / NOT DEPLOYED / MOBILE DEVICE ACCEPTANCE PENDING

## แหล่งตรวจจริง

- Repo: `infobwd/nongkum-sports-hub` branch main ณ เริ่มงาน `b023d466fcce0456e7a3808a4c857006861185f9` และ branch งาน `feat/r23-program-pdf-highlight-v2-20261107`.
- ไฟล์เว็บ `assets/souvenir-2569-v2.pdf` จำนวน 41 หน้า SHA-256 `1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf`; ตรงไฟล์ PDF 41 หน้าที่ตรวจด้วย PyMuPDF.
- Raw schedule `data/program-from-pdf-2569-20261104-draft.json`: 237 รายการ; ใช้ `js/program-corrections.js` ตัดฟุตบอลมัธยมหญิงคู่ชิงซ้ำ 20 พ.ย. ออก = **236 รายการใช้งานจริง**.
- ฝั่งกรรมการเดิม `js/committee-pdf-highlight.js` + `data/committee-pdf-positions-v3.json` (64 หน้า) เป็นแบบอ้างอิง แต่ไม่ได้แก้ไข.

## ผลดำเนินการ

1. สร้าง index `data/program-pdf-positions-v2.json` ราย ID โดยดึงจากตัวเลขในคอลัมน์ `คู่ที่` ใน PDF และหัวข้อ `รายการที่` สำหรับกรีฑา ด้วยพิกัด cropbox สัดส่วน 0..1, pin SHA ต้นฉบับและจำนวนหน้า 41
2. Mapping ครบ **236/236 active IDs**: กีฬาแข่งขัน 186 คู่, กรีฑา 50 รายการ, พิกัดที่ขาด 0, ไม่มีสองรายการใช้กรอบเดียวกัน; ตรวจอย่างน้อยเลขที่พิมพ์อยู่ในกรอบทุกกรอบ
3. กรณีเลขที่ซ้ำในต้นฉบับ:
   - ฟุตบอลหน้า 7 หมายเลข 20 สองแถว: ตัดหญิงแถวที่ยกเลิก และเน้นชายแถวสุดท้าย;
   - ตะกร้อคู่ 9 พิมพ์ซ้ำหน้า 12/13: ใช้ต้นทางหน้า 12 ของรายการที่มี ID หมายเลข 9, ไม่แย่งตำแหน่งของคู่ 10 หน้า 13;
   - กรีฑาหน้า 32 เลข 35 ชาย/หญิง และหน้า 35 เลข 48 ชาย/หญิง: แยกตำแหน่งตามเพศคนละบรรทัด.
4. เพิ่ม `js/program-pdf-highlight.js` (ตรวจ source sha, page, active fixture ID, kind, division, sport, rect) และ overlay/status สีเหลืองใน `pdf-viewer.html`; เปิดหน้าตามลิงก์ที่มีอยู่, เลื่อนไปบรรทัดครั้งแรก, ปรับตาม zoom/resize, ล้างเมื่อเปลี่ยนหน้า, หากไม่ผ่าน validator **ไม่ไฮไลท์** และแสดงข้อความให้ผู้ใช้เปิดตรวจเอง
5. รักษา `js/pdf-viewer.js` PDF.js ตัวเดียวสำหรับ program 41 หน้า/committee 64 หน้า; แยก CSS และ helper ของโปรแกรม ไม่แก้รายการ/ชื่อกรรมการ/ฐานผล/Google Sheets/ผังสูจิบัตร 155 หน้า
6. เพิ่ม `scripts/program/build-r23-pdf-positions.py` สร้างใหม่/ตรวจซ้ำด้วย SHA ที่ตรงกับ asset, `scripts/program/test-r23-pdf-highlight.mjs` ตรวจกฎและการไม่ถดถอย และ `.github/workflows/r23-program-pdf-highlight.yml`; คงชุดทดสอบเก่า R14, R19I, R11D.6 แต่ปรับให้รู้จัก cache revision `r23a1` (ไม่แก้พฤติกรรมเดิมใน tests)

## ผลตรวจด้วยภาพที่สกัดจาก PDF จริง

- หน้า 7 ฟุตบอลคู่ 6 `หนองกุ่ม – วังด้ง`: กล่องอยู่บรรทัดคู่ที่ 6
- หน้า 7 ฟุตบอลมัธยมชายคู่ที่ 20: กล่องอยู่ **แถวล่างสุด** ไม่ใช่หญิงคู่ที่ 20 ที่ถูกตัด
- หน้า 17 เปตองคู่ที่ 10: แยกบรรทัดเลขคู่ของเปตองอื่น ไม่ใช้เวลาหรือเลขสนามแทน
- หน้า 32 กรีฑาหมายเลข 35 หญิง: เน้นหัวข้อเลข 35 หญิง ไม่ใช่หัวข้อชายด้านบน
- การทดสอบ overlay เป็น **ภาพ PDF จำลองการวางกรอบตรงพิกัด** ยังไม่ใช่เครื่องจริง Safari/LINE

## CI ที่ตรวจ (PR #119)

- [R23 coordinate source + viewer regression — PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42378894598)
- [R11D public PDF preview — PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42378894699)
- [R14 program / LINE — PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42378894615)
- [R19-A/C committee — PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42378894644)
- [R19K committee coordinates — PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42378894614)
- [Validate draft data — PASS](https://github.com/infobwd/nongkum-sports-hub/actions/runs/42378894627)

*ทุก CI ข้างต้นตรวจที่ head `7ea02819e35334869309e7feec3616b11fd48bdb` ก่อน commit เพิ่ม workflow path watch; หากมี commit ต่อ ต้องตรวจ head ล่าสุดอีกครั้งก่อน Merge.*

## Acceptance ที่ยังไม่ผ่าน / งานถัดไป

1. **ยังไม่ทดสอบด้วยโทรศัพท์จริง:** iPhone Safari, LINE WebView iOS/Android, Chrome Android (portrait/landscape, pinch, swipe, zoom, back-to-card, status, active day filter). ห้ามสรุป device pass
2. **ยังไม่ Merge / ยังไม่ Deploy:** PR #119 เป็น Draft ต้องให้ผู้จัดอนุญาตก่อน; การเห็น code/CI PASS ไม่เท่ากับเว็บจริงเปลี่ยน
3. **ไม่ใช้เล่ม 155 หน้าในเฟสนี้:** PR #116/#118 ยัง Draft; เมื่อต้นฉบับ PDF หรือรายการ active เปลี่ยน SHA/row จึงต้องสร้าง map ใหม่และผ่านรีวิวก่อน Phase 2
4. **ไม่แก้ข้อมูลขัดแย้งของตารางแข่งโดยอัตโนมัติ:** วันที่ปี 2568 ในต้นฉบับ, เปตองและผังที่กำลังรอตรวจยังคงเป็นข้อความเดิม ไฮไลท์หมายถึงการเลือกแถวเท่านั้น
5. ก่อน Merge ให้ตรวจ GitHub Actions latest head และการชนกับ PR อื่นซ้ำ; คง fallback PDF ตรงและเส้นทางแชร์ LINE

สรุป: ระยะที่ 1 **พัฒนาแล้วและผ่าน CI**; การเผยแพร่และตรวจรับมือถือยังไม่เสร็จ
