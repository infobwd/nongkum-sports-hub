# R19-F/UX-4 — ปุ่มลูกศรขึ้นบนร่วมทุกหน้า

วันที่ 6 พฤศจิกายน 2569

## เป้าหมาย
ปุ่มวงกลม 48px แสดงเฉพาะลูกศรขึ้นบนหลังเลื่อน 300px ขวา 16px ต่ำสุด 20px + safe area. หากมีแถบนำทางล่างให้ยกเหนือแถบตามความสูงจริง; ซ่อนเมื่อพิมพ์. เคารพ reduced motion และใช้ accessible label.

## ขอบเขต
สร้าง js/back-to-top.js และ css/back-to-top.css ส่วนกลาง ใช้กับ index.html, results.html, standings.html, committee.html, committee-review.html และ forms/score-sheet.html; หน้าแบบพิมพ์ใช้ path ../. ลบปุ่มเดิมใน committee และไม่แก้ระบบ pull-to-refresh.

## ตรวจรับ
ตรวจการแสดง/ซ่อน, ขนาด, safe area, แถบเมนูล่าง, การพิมพ์, regression CI และตรวจจริง Safari/LINE หลัง merge.
