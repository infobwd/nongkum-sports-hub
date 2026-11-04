# R11D.3 — Desktop split scroll / Mobile teacher-first review / PDF fit modes

วันที่ 4 พฤศจิกายน 2569 · **Implementation branch: `feat/r11d3-split-scroll-mobile-review-ux`**  
**ขอบเขต:** R11D.3 เฉพาะเว็บตรวจสูจิบัตรฉบับร่าง + PDF viewer; ไม่แก้ JSON/รายการแข่งขัน/ผล/Google Sheets/R10/R12/Google Docs/LINE

## 1. ปัญหาที่พบจากภาพผู้ใช้งานและโค้ด R11D.2

- Desktop PDF preview เดิมเป็น fixed overlay ขวา 54vw; body/main ซ้ายเลื่อนที่ระดับ document ร่วมกับ scroll ภายใน PDF `iframe`. ทำให้บริบทการเลื่อนสับสน และหัวเว็บกว้างเต็มจอขณะเนื้อหาแคบ
- หน้า PDF มีระยะขอบบนจากต้นฉบับมาก (เปลี่ยนเนื้อหา PDF ไม่ใช่ scope); viewer เรียก “พอดีหน้าจอ” แม้คำนวณจากความกว้าง, เปลี่ยนหน้าไม่ reset scroll
- Mobile แสดงการ์ดสถิติ 4 ใบและกล่องดาวน์โหลด PDF ก่อนตัวกรองโรงเรียน/กีฬา ทำให้ครูต้องเลื่อนมาก
- Mobile bottom navigation มี z-index 1200 แต่ PDF overlay เดิม 180 — เสี่ยงทับ PDF preview บนเครื่องจริง
- PDF viewer ยังต้องตรวจ Safari iPhone/LINE WebView/Android ด้วยเครื่องจริง, การผ่าน simulated tests ไม่ทดแทน visual QA

## 2. สิ่งที่แก้ใน R11D.3

1. **Desktop ≥1001px:** ขณะเปิด PDF ใช้ grid layout: ฝั่งรายการ/หัวเว็บ 43%, PDF 57%; ฝั่งรายการมี `overflow-y:auto` เฉพาะตัว, ภายใน PDF.js มี scroll ของตัวเอง, body ไม่เลื่อนซ้อน; หัวเว็บอยู่ในคอลัมน์ซ้าย; footer ซ่อนขณะเทียบ PDF
2. **Mobile ≤690px:** จัดแสดงสถานะร่าง → ตัวกรองโรงเรียน/กีฬา → รายการแข่ง → กล่อง PDF ทั้งเล่ม (พับ) → ตัวเลขรวม/สถิติ → คำอธิบาย. กล่อง PDF แบบ `details` เริ่มปิดบนมือถือ แต่เปิดอยู่บน Desktop และไม่มีปุ่มซ้ำ/ข้อมูลใหม่
3. **Tablet / Mobile ≤1000px:** PDF เป็น full-screen dialog, อยู่ระดับสูงกว่า bottom nav, ซ่อน nav ระหว่าง preview, ใช้ `inert` เพื่อไม่ให้โฟกัสไปส่วนเว็บด้านหลัง และกด Escape/ปุ่มกลับแล้วคืนตำแหน่งเดิม
4. **Desktop PDF เป็น nonmodal side pane:** `aria-modal=false` ทำให้รายการซ้ายกดได้; คงการคืนตำแหน่ง Scroll ฝั่งซ้ายเมื่อปิดและไม่สร้างการ์ดซ้ำ
5. **PDF viewer:** เพิ่มโหมดพอดีความกว้าง/พอดีทั้งหน้า, โชว์คำเรียกตรงความจริง; เปลี่ยนเลขหน้าแล้ว `scrollTop/scrollLeft` เป็น 0; ป้องกัน PDF ล้นซ้ายเมื่อต้องเลื่อนในโหมดขยาย และจัด `pdf-app` ให้สูงตาม viewport แบบมีพื้นที่ scroll ภายใน
6. **ข้อมูล/ลิงก์คงเดิม:** PDF local SHA, หน้า 1–41, 237 `fixture.id`, `source_pdf.page`, ลิงก์ Google Drive/LINE, `data/draft-schedule.json` 236 รายการ, `data/public-results.json` และคำเตือน “ไม่ใช่ประกาศทางการ” ไม่เปลี่ยน

## 3. จุดตรวจรับ

### Automated
```bash
node scripts/ux/test-review-r11d.mjs
node scripts/ux/test-review-r11d1.mjs
node scripts/ux/test-pdf-viewer-r11d2.mjs
node scripts/ux/test-review-r11d3.mjs
node scripts/validate-data.mjs
node scripts/validate-pdf-revision-2569.mjs
node scripts/share/build-match-pages.mjs --check
```
Workflow: `.github/workflows/r11d-review.yml`.

### Manual — ยังต้องยืนยันหลัง Deploy / ไม่ถือว่า PASS เพียงเพราะ merge
- [ ] Desktop Chrome/Edge 1440×900 และ 1024×768: Scroll wheel บนซ้ายเปลี่ยนเฉพาะการ์ด, บน PDF เปลี่ยนเฉพาะ PDF; หัวเว็บไซต์ไม่กิน PDF, ไม่มี third scrollbar
- [ ] Desktop เปิด PDF หน้า 7 → เลื่อนการ์ดซ้าย → ปิด → คืนบริบท/ตำแหน่งที่เลือก, ไม่ reset ตัวกรอง
- [ ] Desktop Zoom viewer “พอดีกว้าง/ทั้งหน้า”, เปิดหน้าต้นฉบับจากรหัสรายการ 7, 17, 23, 35
- [ ] iPhone Safari/LINE WebView และ Android Chrome: แตะเลือกโรงเรียน/กีฬาได้ก่อนส่วน PDF ทั้งเล่ม, เมนูล่างไม่ทับ PDF, ไม่เห็น status bar บังปุ่มกลับ, scroll หลังปิดคืนสภาพ
- [ ] แป้นพิมพ์: เปิด viewer, Escape ปิด, tab โฟกัสวงใน dialog บนมือถือ; ปุ่มขนาดเหมาะกับนิ้ว
- [ ] ขณะปรับแนวตั้ง/แนวนอน, Safari dynamic toolbar และเปลี่ยนขนาดหน้าต่างไม่ทำให้ PDF ล้นหรือค้าง
- [ ] Google Drive links / ดาวน์โหลด / PDF fallback ยังคงทำงาน, การเปิด PDF lazy ไม่ทำให้หน้าการ์ดหน่วง
- [ ] ยืนยันข้อมูลสูจิบัตรยังเป็นฉบับร่าง และไม่ได้เปลี่ยนโปรแกรมทางการ

## 4. การจัดการความเสี่ยง

- การแสดงผลขึ้นอยู่กับ browser zoom, scrollbar width และ PDF.js canvas; การทดสอบ Node/VM ครอบคลุม state/DOM เท่านั้น ยังต้องตรวจภาพจริง
- สำหรับขอบเขต 691–1000px ใช้ full-screen เพื่อไม่ให้แถบซ้ายแคบเกินไป; ≥1001px เปิด split
- ไม่ตัดขอบกระดาษ PDF ต้นฉบับ ไม่ค้นตำแหน่งบรรทัดภายใน PDF อัตโนมัติ; deep link ยังตรง **เลขหน้าต้นฉบับ** ไม่ใช่พิกัดของคู่
- หากพบ regressions ให้ย้อนเฉพาะ PR R11D.3; R11D.2 PDF V2 และโปรแกรมหลักต้องไม่ถูกเขียนทับ
