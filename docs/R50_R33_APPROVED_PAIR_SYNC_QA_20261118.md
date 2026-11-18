# R50 QA — 18 พฤศจิกายน 2569

สถานะ: **Supabase R33 activated and queried successfully** / GitHub branch plan and snapshot only / PR not merged / GitHub Pages and PDF **not synced** / organizer website acceptance pending.

## Production database checks
- Supabase Meeting project `zprxvpfkvforoxrboqiv`.
- R33 active switched **2026-11-18 12:47:33 UTC (19:47:33 ICT)** to `r33-20261118-r50-12pairs-r32-100`.
- Original immutable set remains at `r33-20261116-7ba60be1-fa3269b5` with **236 items (186 matches, 50 athletics)**, **89 bracket links**, **zero R50 flags**.
- New active set has **236 items (186 matches, 50 athletics)**, **89 bracket links**, **12 rows flagged `R50-PAIR-APPROVED`**.
- Bracket links: old **87 draft, 2 conflict**. New **75 draft, 12 confirmed, 2 conflict**. Original conflict exceptions not auto-approved.
- `public.nongkum_published_results` still has **100 `status=approved`** rows. This operation did not modify R32.
- All 12 target fixtures queried after activation: both participant IDs and Thai school names are populated, matching `data/r50/approved_pair_sync_20261118.json`.
- Public `search_nongkum_schedule` RPC returned the new source key and populated Table Tennis 12-year semifinal pairs #9–12 and Volleyball 12-year semifinal pairs #13–16.
- Public `get_nongkum_schedule_bracket('tabletennis-p20-12-ปี-ชาย-001')` returned next match #9 with `link_status='confirmed'`.
- All 12 rows **retain `schedule_status='draft'`**, because date/time are **not confirmed** in this source. Venue confirmation is independent and unchanged.
- Original source pair text and all prior QA flags retained (e.g., `PDF69-R02` volleyball and `PDF69-R05` petanque).
- Futsal ranking from full approved group results: A1 Wang Khao Kaeo 9 pts, A2 Phu Phrom 6; B1 Sao Hong 6, B2 Thung Masang 1 pt with -1 GD (Wang Dong -2). R48 ordering used.
- Volleyball: all 12 group matches approved; each group has an unambiguous 2–1–0 win distribution across its three schools.
- No new fixture IDs, fabricated scores, private student information or unrelated Meeting tables.

## Changes not made
- Not a confirmation of date/time, venue subfield, final-stage qualification from unfinished rounds, or bracket issues `PDF69-R02` at the **next final**.
- Not a GitHub Pages deployment: the current public web schedule is still backed by repository JSON, not by this Supabase R33 active version.
- No edits to source schedule JSON on `main`, booklet PDF, Sheets or unfinished R43 private workflow.
- GitHub branch plan and snapshot are for audit; no PR merge or official publication without authorization.

## Rollback design
- R33 prior source preserved; rollback can atomically re-point `nongkum_schedule_active.source_key` to `r33-20261116-7ba60be1-fa3269b5`, while updating source lifecycle states, **after checking newer edits**. Never erase active snapshots or approved results.
- This log records a successful direct database transaction in the 18 Nov 2026 operator session, not a replayable migration; a future R33 import should reconcile with the R50 snapshot instead of resetting 12 pairs.
