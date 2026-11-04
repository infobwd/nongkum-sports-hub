# R11 — ติดตั้ง 2 ลิงก์ (รับคำขอสาธารณะ / กองอำนวยการ) และตรวจรับ

สถานะ: **CODE READY — PUBLIC LINK NOT YET DEPLOYED** · 4 พฤศจิกายน 2569  
แผนก่อนโค้ด: [R11 plan](R11_PUBLIC_REQUESTS_AND_CONSOLE_UX_PLAN.md)

## สิ่งที่สร้างใน repo
- `apps-script/PublicRequest.gs` + `apps-script/PublicRequest.html`: ลิงก์ให้ **ทุกคนที่มีลิงก์ส่งคำขอโดยไม่ลงชื่อเข้าใช้ได้**; backend รับได้เฉพาะ `nkPublicCreate`, เขียน `pending` + event `created`, ไม่อ่านคืนคิว ไม่แก้เป็น ready/announced/cancelled และไม่มี RPC ดูประวัติ
- `apps-script/Announcer.gs` + `apps-script/Announcer.html`: **แอปภายใน R10**; backend ยังตรวจอีเมล allowlist, `Execute as User accessing`, เปิดด้วยบัญชีที่มีสิทธิ์ Google Sheet; UI ใหม่มีแท็บบนมือถือ **คิว**/**ส่งคำขอ** และตัวเลือกกีฬา/โรงเรียน
- ประเภทคำขอ: เรียกผู้ควบคุมทีม, ประสานกรรมการ, ประชาสัมพันธ์ (ต้องผ่านผู้บรรยาย); ประเภทกีฬา 9 และโรงเรียน 8 ตามชื่อที่มีอยู่ใน `data/draft-schedule.json` เท่านั้น **ไม่อ้างกำหนดการที่ยังไม่ได้รับรอง**
- ข้อมูลทั้งหมดลง Google Sheet ภายใน 2 แท็บเดิม `01_คิวประกาศ` และ `02_ประวัติประกาศ`; **ไม่แก้** P2 `06_ประกาศ`, โปรแกรม, ผลแข่งขันหรือสูจิบัตรรับรอง

## ข้อกำหนดสำคัญ: แยกสอง Apps Script Projects จริง ๆ
**ห้ามเอา `PublicRequest.gs` ไปไว้ใน Apps Script โปรเจกต์เดียวกับ `Announcer.gs`.** การเปลี่ยน existing R10 deployment จาก `Execute as User accessing` เป็น `Execute as Me` แล้วเปิด Anyone โดยมีโค้ด private ร่วมกันจะเปิดทางให้ผู้ไม่ลงชื่อเข้าใช้เรียก server functions อื่นได้อย่างไม่ตั้งใจ แม้หน้า UI จะซ่อนปุ่มก็ตาม

### Project A — สำหรับทุกคนที่มีลิงก์ (Public)
1. ใช้บัญชีผู้ดูแลของ Google Sheet ภายใน เปิด [script.google.com](https://script.google.com) → **New project** `มิตรภาพเกม — รับคำขอประกาศสาธารณะ` (**แยกจากโปรเจกต์ R10**).
2. เพิ่ม 2 ไฟล์เท่านั้น: `PublicRequest.gs` เป็นไฟล์ Script, `PublicRequest.html` เป็น HTML ชื่อ `PublicRequest`. ห้ามใส่ `Announcer.gs`, `Results.gs`, `Code.gs` หรือโค้ด private ใด ๆ.
3. Project Settings → Script properties:
   - `NONGKUM_OPS_SPREADSHEET_ID`: ID ของ private Ops Google Sheet ที่เจ้าของสร้างแล้ว (อย่า commit ID ใน repo)
   - `NONGKUM_PUBLIC_INTAKE_ENABLED`: เริ่มด้วย **`false`** แล้วเปลี่ยนเป็น **`true`** เฉพาะหลังทดสอบและพร้อมเปิด
4. Deploy → New deployment → **Web app**; `Execute as: Me` (เจ้าของชีท), `Who has access: Anyone` (บัญชีใดหรือ anonymous ก็ได้, ตามความพร้อมของนโยบาย Workspace). ถ้าตัวเลือก Anyone ไม่มี แสดงว่าองค์กร/บัญชีไม่อนุญาต การส่งคำขอ anonymous ผ่าน Apps Script นี้จะเปิดไม่ได้; **ห้าม bypass**.
5. ให้อนุญาต OAuth ด้วยบัญชีเจ้าของ โดยตรวจ Scope เข้าถึง Sheet ในโปรเจกต์ A. ห้ามแชร์ Google Sheet แบบ Anyone หรือให้ Editor แก่ผู้ส่งคำขอ; เว็บ A ใช้สิทธิ์ของเจ้าของเฉพาะ append ผ่าน code.
6. ขณะ flag `false` ทดลองส่งจะต้องถูกปฏิเสธ; เปลี่ยนเป็น `true` แล้วส่งคำขอทดสอบ **หนึ่งรายการ** ด้วย browser Guest/Private Window ที่ไม่ได้ลงชื่อเข้า Google. ตรวจว่าเพิ่มแถว `pending` 1 แถวในชีทและประวัติ `created` 1 แถว.
7. เก็บ URL `/exec` สำหรับแชร์ให้โรงเรียนและสนาม; **ยังไม่ติดลิงก์สาธารณะบนเว็บหลักจนตรวจรับ**. ผู้ส่งจะได้รับ receipt `REQ-xxxxxxxx` แต่ไม่สามารถดูสถานะย้อนหลังหรือค้นหาคิวผ่าน Project A ได้.
8. หากมี spam ให้ปิดทันทีด้วย `NONGKUM_PUBLIC_INTAKE_ENABLED=false` (การแก้ Script Properties มีผลกับการส่งครั้งถัดไป); ถ้าจำเป็นปิด deployment ด้วย.

### Project B — สำหรับกองอำนวยการ (Private)
1. ใช้ Apps Script project R10 เดิม: **ยังคง** `Execute as User accessing`, จำกัดผู้ใช้ด้วย `NONGKUM_OPS_ADMIN_EMAILS`, `NONGKUM_ANNOUNCER_EMAILS`, `NONGKUM_COORDINATOR_EMAILS` ฝั่ง server; ห้ามเปลี่ยนเป็น Anyone/Me.
2. แทนที่ **เฉพาะไฟล์ `Announcer.html`** ด้วยโค้ด R11 ล่าสุด; `Announcer.gs` ไม่ต้องเปลี่ยน.
3. Deploy → Manage deployments → Edit → New version → Deploy เพื่อให้ /exec เดิมใช้หน้าใหม่ (การแก้ source อย่างเดียวไม่อัปเดต deployment version /exec)
4. ผู้ประสานและผู้บรรยายทดสอบการสลับแท็บมือถือ, คิวเร่งด่วน, เปลี่ยนสถานะ `pending → ready → announced`, การยกเลิก และข้อความสถานะบนมือถือ
5. **อย่าแชร์ URL Project B ให้ทุกคน**; ใช้เฉพาะกองอำนวยการ. แม้รู้ URL คนภายนอกก็ต้องผ่าน allowlist

## ความปลอดภัย/ขีดจำกัดของ public intake
- ตรวจข้อมูล server-side: sport 9 ชนิด, โรงเรียน 8 แห่ง, ประเภท/ความสำคัญ, max length, no HTML controls/formula/URL/email/เบอร์โทรศัพท์; honeypot
- ป้องกันคำขอซ้ำตามข้อความเดียวกัน 180 วินาทีผ่าน `CacheService`; จำกัดทั่วระบบ **60 รายการต่อ 15 นาที** ผ่าน `PropertiesService` + `LockService`. นี่คือ **best-effort abuse prevention ไม่ใช่ CAPTCHA, ไม่ใช่ per-user rate limit**, อาจมีการโจมตีแบบหลายเครื่องหรือจงใจทำให้เต็ม quota ได้; หากเริ่มมีข้อความรบกวนให้ปิด flag หรือสลับเป็น Google Form ที่ต้องลงชื่อเข้าใช้
- ทุกคำขอสาธารณะต้องผ่านการตรวจของคนจริง; กด `announced` เฉพาะเมื่ออ่านออกไมค์แล้วจริง
- ไม่มีการเผยแพร่คำขอ/รายชื่อ staff/ประวัติผ่าน GitHub Pages; รหัสการติดตามให้เฉพาะผู้ส่งครั้งนั้นและไม่ได้ใช้เป็นรหัสเข้าถึงฐานข้อมูล
- อาจมี rate limits และ OAuth limitations ของ Google Apps Script; **ทดสอบผ่านบัญชีจริงและโหมดไม่ลงชื่อเข้าใช้ก่อนเปิด**.
- อย่าใส่ชื่อ เบอร์โทร หรือข้อมูลส่วนตัวนักเรียนในช่องคำขอ

## QA gate (ต้องทำบน Web App จริง)
| ID | ทดสอบ | ต้องได้ |
|---|---|---|
| PUB-01 | เปิด public URL จาก private browsing, ไม่ login | เห็นฟอร์ม |
| PUB-02 | สลับ 3 ประเภทบน iPhone Android | ฟิลด์ปรับตามประเภท/ไม่เกิด error |
| PUB-03 | เลือกกีฬา/โรงเรียน/สนาม → ส่ง | เพิ่ม `pending` 1 แถว + log `created` |
| PUB-04 | กดส่งซ้ำติดกัน | ไม่สร้างคำขอซ้ำ |
| PUB-05 | พิมพ์ URL/อีเมล/โทร/สูตรในข้อความ | ระบบปฏิเสธ |
| PUB-06 | พยายามเรียก RPC `nkOpsBootstrap/nkOpsTransition` จาก Project A | ไม่มีฟังก์ชัน ให้เรียก |
| PUB-07 | ปิด feature flag | ส่งไม่สำเร็จ |
| OPS-11 | ผู้บรรยายใช้ Project B พร้อม login | เห็นรายการ pending และเปลี่ยน ready/announced ได้ |
| OPS-12 | ผู้ใช้ public ไม่ได้รับสิทธิ์เปิด Project B | ไม่เห็นคิวส่วนตัว |
| OPS-13 | ทดสอบ R6–R10 | ไม่มี regression ที่เว็บหลัก |
| OPS-14 | ตรวจหน้าเว็บหลัก GitHub Pages | ไม่มี public queue, ไม่มี staff emails, ไม่มีการเผยแพร่รายการจากคำขอ |

## สถานะ ณ ปัจจุบัน
- Code, regression tests และแผน: อยู่ใน GitHub
- Google Sheet ข้อมูลจริง: คงเดิม ไม่แก้ค่าหรือคิวเดิมในงานนี้
- **Public URL `/exec`: ยังไม่มีหลักฐานว่าติดตั้งและ Deploy จริง; ห้ามแต่ง URL**
- **Private Web App: เจ้าของต้องนำ HTML R11 ไป Deploy New version; merge GitHub ไม่เปลี่ยน web app ที่ติดตั้งแล้ว**
