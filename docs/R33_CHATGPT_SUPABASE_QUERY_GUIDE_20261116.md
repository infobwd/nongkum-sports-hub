# R33 — วิธีค้นตารางการแข่งขันผ่าน ChatGPT (ฐานข้อมูล Meeting)

**Project Supabase:** `zprxvpfkvforoxrboqiv` · **Source version:** `r33-20261116-7ba60be1-fa3269b5` · **Repository:** `infobwd/nongkum-sports-hub`

## ข้อกำหนดการตอบตามคำสั่งประจำโปรเจกต์ (ผู้จัดแจ้ง 16 พ.ย. 2569)
เมื่อถามคู่แข่งขัน วัน เวลา สนาม สายการแข่งขัน หรือตาราง ให้ใช้ Supabase Meeting ก่อน ค้นตามโรงเรียน กีฬา รุ่น และเพศ. ห้ามใช้ข้อมูลร่างเป็นข้อมูลยืนยัน. **ผลแข่งขันต้องอ่านจาก R32 `public.nongkum_published_results` ที่ approved เท่านั้น**; ไม่มีสิทธิ์สรุปชนะ/แพ้จากสายร่าง. หาก Supabase เข้าไม่ถึงหรือ source_key ล้าหลัง ให้ตรวจ `main` และเอกสารผู้จัดรับรอง โดยรายงานความขัดแย้งอย่างชัดเจน.

### คำค้นที่รองรับ
- โรงเรียน เช่น `วังด้ง`, `บ้านวังด้ง`, `โรงเรียนบ้านวังด้ง`, `wangdong`; 8 โรงเรียนใช้ alias ที่กำหนดไว้ในตารางโรงเรียน
- กีฬา เช่น `เปตอง`, `petanque`; รองรับ 9 กีฬา
- รุ่นอายุเป็นเลข 8, 10, 12, หรือข้อความเต็มใน `division`; `มัธยมชาย` ใช้ division หากไม่มีอายุตัวเลข
- เพศ `ชาย`, `หญิง`; รายการที่ต้นฉบับไม่ระบุเพศจะคง `ไม่ระบุ` ไม่เดาเอง

### 1. คำสั่งหลักที่ใช้กับ Supabase connector
```sql
select fixture_id,sport_name,division,round_name,source_pair_text,
  draft_date,draft_time,field_name,venue_name,
  date_confirmed,time_confirmed,venue_confirmed,
  schedule_status,qa_flags,conflict_note,source_page,source_key
from public.search_nongkum_schedule(
  p_school    => 'วังด้ง',
  p_sport     => 'เปตอง',
  p_age_years => 10,
  p_gender    => 'ชาย'
);
```
**แปลความหมาย:** ผลค้นรายการนี้ได้ **บ้านวังด้ง พบ บ้านหนองกุ่ม**, 12 พ.ย. 2569 เวลา 09:00 แต่ **สถานะคู่/ผังยังเป็น draft**. `date_confirmed=true` และ `time_confirmed=true` หมายถึงยืนยันเฉพาะกำหนดวันเวลา; `venue_confirmed=true` ยืนยัน **โรงเรียนบ้านหนองกระทุ่ม (สนามหลัก)** ไม่ได้ยืนยันเลขสนามย่อยโดยอัตโนมัติ. คอลัมน์ `field_name` เป็นข้อมูลสนามย่อยตามร่าง PDF.

### 2. ตรวจสายอย่างปลอดภัย
```sql
select * from public.get_nongkum_schedule_bracket(
  'petanque-p17-10-ปี-ชาย-012'
);
```
ข้อมูลลิงก์ทั้งหมดจากต้นฉบับเป็น `draft` หรือ `conflict` จนกว่าจะผ่านการตรวจสาย. ตัวอย่างเปตอง 10 ปีชายคู่นี้ชี้ไปยังรอบรองคู่ที่ 10 ซึ่งติด `conflict`: โปรแกรม `main` เขียนผู้ชนะคู่ 2–4 ขณะที่เอกสารแก้ไข R27/PR #136 เสนอคู่ 3–4 และยังไม่ได้ Merge. **ห้ามยืนยันชื่อทีมคู่แข่งรอบถัดไป/ผลชนะ**.

### 3. ผลการแข่งขันที่รับรองแล้วเท่านั้น
```sql
select result_id,result,revision,published_at
from public.nongkum_published_results
where result->>'status'='approved'
order by published_at desc limit 50;
```
R33 **ไม่** สร้างผลแข่งขัน, ไม่เขียนทับ R32, และไม่สรุปผลจากสภาพสาย. ห้ามใช้ `nongkum_sports.result_submissions` (private) เป็นผลสาธารณะ.

### 4. เช็คว่าฐานข้อมูลรุ่นล่าสุดตรงกับ GitHub หรือไม่
```sql
select a.source_key,s.candidate_blob_sha,s.corrections_blob_sha,
  s.imported_at,s.expected_items
from public.nongkum_schedule_active a
join public.nongkum_schedule_sources s on s.source_key=a.source_key;
```
หาก SHA ไม่ตรงกับ `main` ที่มีการเปลี่ยนแปลงใหม่ ให้รายงานว่าข้อมูลอาจยังไม่อัปเดต และตรวจไฟล์ต้นทาง/PR/มติผู้จัดก่อนตอบเป็นข้อมูลยืนยัน. ไม่ดึงจาก Supabase แล้วอ้างว่าเป็นฉบับล่าสุดในกรณีไม่ตรงกัน.

### 5. วิธีอัปเดตเมื่อ GitHub Merge (ควบคุมรุ่น)
1. GitHub Actions `R33 Schedule source consistency and Supabase import QA` จะตรวจ content SHA และความตรงกับไฟล์ seed เมื่อมีการเปลี่ยนแปลงต้นทางใน `main`/PR; **หากเปลี่ยน source โดยไม่ปรับ snapshot จะ FAIL**.
2. ผู้ดูแลตรวจความต่าง, แหล่งรับรอง และ PR เดิมก่อนสร้าง source_key รุ่นใหม่; อย่าแก้ตารางเดิมทับ. เพิ่ม seed ใน PR พร้อม QA และทดสอบฐานข้อมูลก่อนเปิดใช้งาน
3. นำเข้าข้อมูลเป็น `staged` โดยเก็บรุ่นก่อนหน้าไว้; ตรวจจำนวน สถานะ ยืนยันรายช่อง และข้อขัดแย้ง
4. ย้าย active pointer เฉพาะเมื่อ QA ตรงและผู้จัดอนุญาตให้ใช้ข้อมูลที่ทบทวนแล้ว. กระบวนการนี้ **ไม่ใช่ auto-publish ที่ไร้คนตรวจ**

## สิ่งที่ยังต้องยืนยันกับกรรมการ
- 41 ช่องลู่กรีฑาเป็นชื่อศูนย์ฯ/คำที่ยังไม่มีรหัสโรงเรียนที่รับรอง: ไม่อนุมานว่าเป็นโรงเรียน
- จุดเชื่อมผัง 5 แห่งไม่พบเลขคู่ในรุ่น/กีฬาเดียวกัน (วอลเลย์บอล 4, ตะกร้อ 1) คงไว้ในข้อความต้นฉบับ ไม่สร้างเส้นเชื่อม
- เปตอง 10 ปีชายคู่ 2 และคู่รอง 10 ขัดแย้งกับ PR #136 ที่ยังไม่ Merge; status `draft` และ `conflict`
- R28 PR #137 เรื่องทีมเข้าชิงเปตองบางรุ่นยังไม่ Merge: ไม่สอดข้อมูลนั้นเข้าผลแข่งขันแบบ approved
- หน้าเว็บกีฬาเดิมยังใช้ไฟล์โปรแกรม JSON; R33 รอบนี้ทำให้ ChatGPT และ API ค้นได้โดยตรง **ไม่ได้เปลี่ยนเว็บตารางแข่งให้ดึง Supabase หรือเปิดใช้ระบบแจ้งเตือนผลแข่งขันแบบใหม่**
