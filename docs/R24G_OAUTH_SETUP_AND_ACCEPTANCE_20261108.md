# R24-G — ตั้งค่า OAuth และตรวจรับตัวอ่านสูจิบัตร 155 หน้า

วันที่ 8 พฤศจิกายน 2569 · สถานะ: AUTH NOT CONFIGURED / DEVICE QA NOT ACCEPTED

## สถานะจริง
- ตัวอ่านใหม่ใช้ชุดควบคุมของ V2/V3: เลือกหน้า 1–155 ซูม พอดีกว้าง/ทั้งหน้า ปัดหน้าจอ; PDF.js โหลด PDF ที่ตรวจ SHA256 ตรงต้นฉบับแล้วเท่านั้น
- `data/booklet-oauth-config.json` เริ่มที่ `enabled:false` และ `client_id:null`; จึง **ยังเข้าสู่ระบบ Google เพื่อใช้ตัวอ่านแบบ V2/V3 โดยตรงไม่ได้** จนกว่าผู้ดูแลตั้งค่า OAuth จริง
- ระหว่างนี้ใช้ Google Drive Preview (ผ่านสิทธิ์ Google ปกติ) หรือเลือกไฟล์ PDF ที่มีสิทธิ์จากเครื่องในตัวอ่านแบบใหม่; ไม่มีการ commit PDF/map หรือเปลี่ยน Drive sharing
- ใช้ OAuth Google Identity Services token model + `drive.readonly`, Google Drive API `files.get?alt=media`. access token ใช้ใน memory เท่านั้น ไม่เก็บ localStorage/cookie/sessionStorage หรือส่งไป server
- ถ้าบัญชี `canDownload=false` หรือไม่มี permission ให้ปฏิเสธการอ่าน PDF.js และคงทางเลือก Google Drive Preview

## ผู้ดูแลต้องตั้งค่าก่อนเปิดใช้งาน
1. ใช้ Google Cloud Project ที่ผู้จัดควบคุม, Enable Google Drive API และตั้งค่า OAuth consent screen โดยตระหนักว่า `drive.readonly` เป็น scope restricted ซึ่งอาจต้องผ่าน Google OAuth verification และประเมินความปลอดภัย
2. สร้าง OAuth Web application Client ID, Authorized JavaScript origin เป็น `https://infobwd.github.io` เท่านั้น (ไม่ใส่ path); **ห้ามใส่ Client Secret** ใน repo
3. เพิ่มบัญชีทดสอบที่ได้รับสิทธิ์อ่าน PDF และมี permission ดาวน์โหลด; ทดสอบบัญชีไม่มีสิทธิ์แยกด้วย
4. เปิด PR แยกปรับ `data/booklet-oauth-config.json` เป็น `enabled:true` และใส่ OAuth Client ID จริงโดยไม่เปิดสิทธิ์ PDF เป็นสาธารณะ
5. ทดสอบบน Safari iPhone, LINE WebView iOS/Android, Android Chrome ทั้งกรณี pop-up ทำงาน/บล็อก; fallback ต้องเปิด Drive ได้เสมอ

## รายการตรวจรับ
- เล่ม 155 หน้า PDF SHA256 `a2a9f47f8bf871403c3995e6b4ebd102802e600fc20c16198eb12ab73b12e89d` เท่านั้น; ทดสอบหน้า 1/99/100/155 และหน้าเกิน
- fit width/page, zoom, swipe, resize, high-DPI memory limit, กลับหน้าตาราง/กรรมการ
- แผนที่ private SHA และ 486 จุด (236 fixtures + 250 committee) ต้องตรงก่อน highlight. ไม่มีแผนที่/ผิด SHA ห้ามเน้น
- 403/no download/wrong PDF/popup denied ไม่แสดงไฟล์ที่ไม่ผ่านการตรวจ
- V2 41 หน้า และ V3 64 หน้าไม่เปลี่ยน ผล/คะแนน/อันดับไม่เปลี่ยน. เล่มใหม่ยังเป็นฉบับตรวจร่าง
- CI PASS ไม่ใช่ QA โทรศัพท์จริง/อนุมัติเผยแพร่ R11E

## สายงานที่เกี่ยวข้อง
- PR #124 ยังคง Draft และแก้ `js/pdf-viewer.js` กับ `js/booklet-private-viewer.js`; R24-G ไม่แตะสองไฟล์นี้, แต่ assertions ใน #124 อาจอิงสถานะก่อน R24-F จึงต้อง reconcile ก่อน Merge
- PR #116/#118 เป็นการจัดทำ PDF ต้นฉบับแยกสาย ไม่ถูกแก้

อ้างอิง:
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get
- https://developers.google.com/workspace/drive/api/guides/manage-downloads
