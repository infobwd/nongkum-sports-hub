# R19-E — รายชื่อกรรมการฉบับร่างปี 2569 บนหน้า GitHub Pages (6 พ.ย. 2569)

## Approval and intent
ผู้จัดการแข่งขันให้เผยแพร่ **รายชื่อครู/กรรมการตามร่างสูจิบัตรปี 2569** เพื่อให้แต่ละโรงเรียนตรวจสอบผ่านหน้า `committee.html` โดยไม่ต้องใช้รหัส; การยืนยัน/แจ้งแก้ไขยังคงผ่าน `committee-review.html` และ LINE ตามขั้นตอน R19-D ที่ใช้รหัสแต่ละโรงเรียน

## Sources and publication contract
- Source `ร่าง สูจิบัตร กีฬากลุ่ม 2569 .pdf` หน้า PDF 6–16 (source SHA256 `cab4c65eb15d5480d63da00a81a2e662f8c7857e0ae39ea80475733f5bc795e0`) extract 250 person-role entries
- `data/committee-2569-draft-public-review.json` เป็น **minimal published draft projection**: stable row ID, เลขข้อ, ชื่อที่พิมพ์, สังกัด/ตำแหน่งที่พิมพ์, บทบาท, เลขฝ่าย, ชนิดกีฬา, ข้อมูลรุ่น (ถ้ามี), หน้า PDF, review flags; **ไม่คัดลอก raw_text, เบอร์/อีเมล, รหัสครู Sillapa, รหัสปลดล็อกหรือ private source**
- 209 entries attributed to 8 schools from printed affiliation; 41 entries outside/central/unresolved with `school_id:null`; no guessing
- กรีฑา sections 15–19 map เป็น sport_id `athletics` (58 person-role lines); ตารางฟุตบอล 9, ฟุตซอล 4, ตะกร้อ 4, วอลเลย์บอล 4, เปตอง 13, เทเบิลเทนนิส 9, ชักเย่อ 5; ยิงจุดโทษไม่มีหมวดเฉพาะ
- Counts are role rows, not distinct persons or verified 2569 appointments. 151 deduplicated *name strings* unverified
- Aggregate planning JSON still `assignments_2569: []` / `approvedCount=0` because sharing **draft for review** does not equal a signed appointment order

## UI and behavior
- `committee.html`: all school names searchable publicly; 4 prior views remain: sports, committee sections, schools, review flags
- New school selector, search by person/role/affiliation, sport and division controls remain; sports show personal names and section/school views show names, not only counts
- Show first few rows and expand with details for long lists, larger tap targets; plain `textContent` for untrusted source, never `innerHTML`
- Clear banner "ร่างปี 2569 ยังไม่รับรอง"; link to `committee-review.html` remains prominent
- When user filters a specific division, persons shown at **sport-level only** with explicit caveat that specific division assignment is not confirmed
- Source flags (6 lines) are surfaced without correcting spelling by inference
- 8 school review encrypted bundles, codes, confirmation submission flow **unchanged**; public roster is designed for low-friction reading, private confirmation unchanged

## QA
- Test `scripts/committee/test-r19e.mjs`: source revision, 250 rows IDs unique, 209/41 split, 9 sports/20 committees, unsafe fields excluded, source flags, functions filter and DOM render/search/school selection, static existing review link, R19-D encrypted source untouched, 237 fixtures unchanged
- R19-A/C, R19-B, R19-D regression and other existing CI must pass before merge
- After deploy: owner should open `https://infobwd.github.io/nongkum-sports-hub/committee.html` on iPhone and LINE WebView, choose school, search a teacher, verify line-breaking, expand names, then open confirmation page
- Data quality caveat: draft includes possible typos, duplicated numbered heading 14.6, and multi-role entries; reconcile before replacing draft with confirmed official names
