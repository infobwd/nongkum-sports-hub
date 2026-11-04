# R9 / Phase 1 — Loading UX, Skeleton และสถานะข้อผิดพลาด (IMPLEMENTATION PLAN)

สถานะเอกสาร: APPROVED SCOPE FOR IMPLEMENTATION · 4 พฤศจิกายน 2569  
Repository: `infobwd/nongkum-sports-hub` · ฐาน R8 commit `870e621`  
สาขา: `feat/r9-loading-ux`  
ขอบเขต: ระยะที่ 1 เท่านั้น; ศูนย์ประกาศสนามและ Splash/PWA เป็นระยะถัดไป

## 1. ปัญหาและเป้าหมาย

- หน้าโปรแกรม (`index.html`) และผลการแข่งขัน (`results.html`) ดึง JSON หลังโหลด HTML; ช่วงก่อนข้อมูลตอบกลับอาจเกิดช่องว่างหรือข้อความโหลดอย่างเดียว
- ต้องสื่อการโหลดครั้งแรกอย่างชัดเจน โดยไม่หน่วงการแสดงข้อมูลเพื่อเอฟเฟกต์ และไม่ทำให้การสลับแท็บแบบ native anchor จาก R6 ตอบสนองช้าลง
- ลดการกระโดดของเนื้อหา (layout shift) และทำให้ข้อความเมื่อเครือข่ายล้มเหลวชัดเจน พร้อมปุ่ม `ลองอีกครั้ง` ที่ใช้งานได้จริง
- การรีเฟรชหลังมีข้อมูลแล้วต้องแสดง **ข้อมูลล่าสุดที่เคยโหลดสำเร็จต่อไป** ห้ามเปลี่ยนกลับเป็น Skeleton หรือทำให้ผู้ชมเข้าใจว่าไม่มีรายการ
- คงเส้นทาง LINE R8: หน้า `m/f.../` ต้องแสดง HTML รายการที่แชร์ได้ทันที; หน้า `?fixture=` และ `?result=` ต้องนำทางตรงรายการ, ไม่มี splash หรือ overlay

## 2. ขอบเขตที่อนุมัติ

1. **Skeleton เฉพาะการโหลดครั้งแรก** สร้าง HTML โครงร่างการ์ด (ไม่ใช่ loading overlay) สำหรับหน้าโปรแกรมและหน้าผลการแข่งขัน พร้อมตำแหน่งการ์ดตัวอย่าง 2 ใบ, `aria-hidden="true"`; ภาคประกาศสถานะใช้ข้อความจริง `role="status"`.
2. **สามสถานะต้องแยกกัน:** loading, loaded-with-data/valid-empty, error-on-first-load. กรณีไฟล์ผลรับรองถูกต้องแต่ยังว่าง ให้แสดง empty state ไม่ใช่ error.
3. **Retry แบบใช้งานจริง:** เมื่อโหลดครั้งแรกไม่สำเร็จ ให้ซ่อน Skeleton แสดงคำอธิบาย ปุ่มลองอีกครั้ง; เมื่อสำเร็จต้องล้าง error. หากข้อมูลเดิมมีอยู่ ให้คงรายการและบอกว่ารีเฟรชไม่สำเร็จ (ไม่แสดง error เต็มส่วน).
4. **Progressive enhancement:** HTML มี skeleton ให้เห็นก่อน JS; JS ควบคุม `hidden` และ `aria-busy` ที่ส่วนรายการ; CSS ต้องไม่ override `[hidden]`.
5. **Motion และความเร็ว:** แอนิเมชัน shimmer/pulse เบา ๆ เท่านั้น มี `prefers-reduced-motion: reduce` ให้ปิด; ไม่ใช้ timer หน่วงข้อมูล; ป้องกัน flash หากโหลดเร็วที่สุดตามที่เบราว์เซอร์อนุญาต.
6. **Compatibility:** คง Noto Sans Thai, สี/ระยะ R7, Safe Area iOS, bottom nav 2 แท็บ R6, direct links/LINE R8, filter state, share, refresh 5 นาที, approved-only result data, source statuses.
7. **Security/data:** ห้ามเปลี่ยน JSON, สถานะ Draft/Approved, คำนวณคะแนน, สร้างผลสมมติ, เพิ่ม external framework, token, endpoint เขียนข้อมูลสาธารณะ หรือเปิดเผยข้อมูลบุคคล.

## 3. Implementation map

- `index.html`, `results.html`: เพิ่ม skeleton/โหลดผิดพลาด/ปุ่มลองใหม่ในบริเวณรายการ (ไม่แทรกลงใน shared-detail view และไม่ครอบ header/nav)
- `css/base.css`: shared skeleton, error recovery, hidden guard, reduced-motion; CSS หน้าอื่นไม่ซ้ำซ้อน
- `js/program.js`, `js/results.js`: state transitions เริ่มโหลด → สำเร็จ / ล้มเหลว, retry, รักษาข้อมูลเมื่อ refresh ไม่สำเร็จ; ไม่แตะตรรกะ approval / rendering ที่ไม่เกี่ยวข้อง
- `scripts/ux/test-loading-r9.mjs`: regression สำหรับ initial success/error/retry, refresh failure preserves loaded data, valid empty, direct-link behavior, accessibility, no splash/overlay
- `.github/workflows/validate.yml`: เพิ่ม automated regression R9; ปรับ mocks ที่ต้องรู้จัก element ใหม่โดยไม่ลด assertion เดิม
- `README.md`: เพิ่มส่วน R9 และวิธีทดสอบ

## 4. Acceptance criteria

- [ ] ระหว่าง initial fetch มี Skeleton ที่เหมือนโครงหน้า; เมื่อข้อมูลสำเร็จซ่อนทันที
- [ ] Initial fetch ล้มเหลว: ไม่มี Skeleton ค้าง และมีข้อความ error + `ลองอีกครั้ง`; ลองแล้วกู้คืนได้
- [ ] Refresh ล้มเหลวหลังเคยสำเร็จ: การ์ดและตัวกรองเดิมยังอยู่, ไม่มี loading skeleton หรือ empty-error ที่หลอกว่าไม่มีข้อมูล
- [ ] Valid approved results ว่าง: แสดงข้อความไม่มีผลรับรอง ไม่ใช่ network error
- [ ] Deep links R8 และหน้าสั้น OG ไม่มี splash, overlay, หรือ regression
- [ ] `prefers-reduced-motion`, `aria-busy`, `aria-hidden`, `hidden` ทำงานถูกต้อง
- [ ] ทดสอบ Node ที่มีอยู่ทั้งหมดใน workflow ผ่าน และ CI `main` ผ่านหลัง merge
- [ ] Manual QA ที่ต้องตรวจภายหลังบนเครื่องจริง: LINE iOS, Safari iPhone, Android Chrome, ความเร็วเครือข่ายต่ำและ offline/online

## 5. วิธีดำเนินการและการปล่อยงาน

1. Commit **แผนเอกสารนี้ก่อนการแก้ไขโค้ด** ลงสาขาทดลอง (plan-first gate).
2. แก้เฉพาะระยะที่ 1 พร้อม regression test และ CI.
3. เปิด PR ไป `main`, ตรวจ `Validate draft data` ให้ผ่าน; ถ้าไม่ผ่านแก้ก่อน merge.
4. Merge เฉพาะเมื่อผ่าน checks; ยืนยัน GitHub Pages deploy และแจ้งหลักฐาน.
5. บันทึกผลตรวจรับมือถือจริงเป็นรายการที่ยังไม่รับรองจนกว่าจะมีหลักฐานจากเครื่องจริง.

## 6. ไม่รวมในระยะนี้

- Splash Screen / PWA install flow / Offline cache
- ศูนย์ประกาศสนาม, การเรียกนักกีฬา, ติดตามกรรมการ, realtime polling
- การเปลี่ยนแหล่งข้อมูลจาก JSON เป็น Google Sheets, การเผยแพร่ผลยังไม่รับรอง
- การเปลี่ยนดีไซน์หน้าอื่นโดยไม่จำเป็น

Rollback: ย้อน merge commit R9 ได้โดยไม่ต้องเปลี่ยน schema JSON/Google Sheets.
