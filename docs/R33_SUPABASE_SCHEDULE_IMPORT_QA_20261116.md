# R33 QA — Supabase Schedule & Chat Search

**Status:** PLAN recorded; database migration APPLIED; snapshot data IMPORTED and ACTIVATED; GitHub work in branch / PR pending Merge; website source remains unchanged, mobile acceptance pending.

## Verified production DB — Project Meeting `zprxvpfkvforoxrboqiv`
- Snapshot active key: `r33-20261116-7ba60be1-fa3269b5`
- 236 fixtures = 186 matches + 50 track events; no repeated football women's final on 20 Nov
- **45** rows independently confirmed date/time; **236** rows with main venue confirmed; **all 236 source row states remain `draft`** (not officially published fixture approval).
- 89 draft-derived bracket links; two conflict links in petanque U10 men; 5 text references unresolved; 41 track lanes without confirmed school IDs (248 mapped).
- Only new R33 tables/indexes/RPC created; Meeting source and private R32 submissions left untouched. No competition scores inserted. Existing approved results remain **0**.
- RPC example `search_nongkum_schedule('วังด้ง','เปตอง',10,'ชาย')` returns first-round `petanque-p17-10-ปี-ชาย-012`, "วังด้ง – หนองกุ่ม", draft date `2026-11-12`, time `09:00` confirmed independently, venue `โรงเรียนบ้านหนองกระทุ่ม` confirmed; subfield `สนาม 2` from draft.
- `get_nongkum_schedule_bracket('petanque-p17-10-ปี-ชาย-012')` returns **conflict** for semifinal pair #10, and no inference of an actual winner.
- Alias query `'บ้านวังด้ง'/'เปตอง'/10/'หญิง'` returns first-round `วังเขาแก้ว – วังด้ง` as draft; searching `wangdong` returns 60 associated fixture/event rows (including 30 track events with mapped school IDs).
- Invalid school search returns 0; no-filter search returns 0. Direct role test `SET LOCAL ROLE anon` successfully queries approved read-only RPC.
- Security: `anon` SELECT on fixture true, INSERT false, authenticated UPDATE false, RLS true, all 236 rows `draft`, no private rosters or results publicly exposed.
- DB EXPLAIN single query example: **4.585 ms execution time** in PostgreSQL during one run — DB-only time, **not** a full ChatGPT response-time or network latency measurement.
- Immutable source proof: candidate Git blob `7ba60be1b36a2591768fc0350476edc8ff2c3ac1` + correction JS blob `fa3269b5b95ae3e3a8509b6f2c7d8d5040cbaed4`. Source SQL stored in `supabase/seeds/r33_00_reference.sql` through `r33_05_activate_verified.sql`; old JSON remains intact.

## Release gates
- Commit tests + GitHub Action source-drift detection, review new PR. Do not merge without user authorization.
- When an official schedule/PR changes, stage a new source_key, diff/approve before flipping active pointer. No automatic promotion from draft.
- ChatGPT can already query the active Supabase snapshot through connector. Validate real future conversations after PR and update Project settings only if user explicitly changes the ChatGPT project configuration.
- GitHub Pages remains on current JSON schedule; website Supabase reader integration and mobile Safari/LINE acceptance are separate unfinished gates.
