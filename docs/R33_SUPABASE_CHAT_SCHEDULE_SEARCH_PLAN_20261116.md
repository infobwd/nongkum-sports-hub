# R33 — Supabase Meeting Schedule Search & ChatGPT Integration

**Date:** 16 November 2026 · **Status: PLAN RECORDED before changes** · **Authorisation:** user approved implementation, not an explicit PR merge. Keep PR open for review. Use existing Supabase project `zprxvpfkvforoxrboqiv`.

## Baseline verified (main + connected Supabase)
- Main `data/program-from-pdf-2569-20261104-draft.json`: 237 source rows, 187 matches + 50 athletics. `js/program-corrections.js` excludes duplicate `football-p07-มัธยมหญิง-020-repeated-final`, confirms 18 November female football final date. **236 usable rows = 186 matches and 50 track events.**
- Every source `status=review_status=draft`; 45 fixtures have **date + time** marked confirmed; all usable fixtures have confirmed venue, but this does **not** certify the entire matchup/bracket/athletics line. Do not publish guessed scores or winners.
- Existing `data/draft-schedule.json` is the older prototype (236 entries, older kickoff times), NOT the authoritative planning times for R33. Import corrected latest candidate and retain source blob SHA, statuses and historical values.
- PR #136 R27 proposed corrected male petanque U10 bracket semifinal #10 from winners #2/#4 to #3/#4 and changed match #2 opponent. This PR is still unmerged; the main source retains conflicting pairing. **Never upgrade it to confirmed.** PR #137 finalists (female U10 / male U12) is also open; it is not a published result.
- R32 Meeting Supabase has approved-only results but no schedule tables; 0 public approved results, preserve the R32 schema and all Meeting-related objects.
- User supplied project instructions in conversation: Supabase Meeting FIRST for program/opponents/date/time/field/bracket/results, filter school/sport/age/sex; show draft vs confirmed; approved-only scores; fall back to GitHub main then confirmed documents. This file records these instructions so no extra edit to user settings is needed.

## R33-A — schema and security (additive only)
- Public **read-only** `nongkum_schedule_schools` (8 school IDs/aliases), `nongkum_schedule_sports` (9 sports), `nongkum_schedule_fixtures` (236 metadata-only rows), `nongkum_schedule_bracket_links` (only source-explicit winner references; label as draft and highlight conflicts), and `nongkum_schedule_imports` (provenance).
- Read-only for anon/authenticated via RLS + SELECT; no INSERT/UPDATE/DELETE, no access to personal rosters, student names or R32 private area. Import only by trusted server/connector roles.
- Fields: fixture ID, sport, division, derived gender with explicit uncertainty, two team IDs and source labels, confirmed venue, draft date/time/subfield, independently confirmed date/time status, source match/page, schedule_state=draft, source SHA, flags. Track lanes contain school IDs when available, but unverified centre labels are **not** mapped to schools by assumption.
- Index school-ID arrays, sport + division, date. Provide `public.search_nongkum_schedule` as **SECURITY INVOKER** RPC returning narrow, typed rows with filter school/alias, sport/alias, division/age, sex; clamp limits, avoid arbitrary dynamic SQL and require at least one actual filter.
- Bracket links must remain `draft` or `conflict`, not result-derived; never identify an actual semifinal opponent absent confirmed outcomes.

## R33-B — provenance-checked import / deterministic sync
- Build `scripts/r33/import-schedule.mjs` from corrected source JSON (raw latest PDF candidate + `program-corrections.js`), including 236 count assertion, 45 independently confirmed date/time, all source row draft. Generate committed SQL seed in batches, with a new immutable `source_sha` / version. First import only if destination is empty; any later update needs diff/reconciliation, explicit review and preservation of previous versions. Do **not** blindly replace working data.
- Store source SHA and correction revision; keep former document references.
- Audit row counts, sport breakdown, match vs track count, source flags, no inserted scores.

## R33-C — fast chat queries
- Query Supabase first: RPC or parameterized SELECT by school/sport/division/gender. Example “เปตองวังด้ง 10 ปีชาย” should show first-round Wang Dong vs Nong Kum **as draft source**, with confirmed date/time/venue marked at field-level and flagged possible semifinal link conflict.
- Support Thai school shorthand; do not guess that early-childhood centre names are schools. Include explicit source and status in responses.
- If DB cannot be queried or source SHA is stale vs newly merged schedule, fall back to GitHub main and organizer-approved documents.
- No automatic edits to global project settings. Record [R33 Chat Contract] in repo to support future conversations.

## R33-D — QA, integration & release gates
- SQL: anon SELECT yes; anon INSERT/UPDATE no; RLS; service-role-only writes; no private roster leaked; no Meeting object touched.
- Real query tests: Wang Dong petanque male 10 (first-round Nong Kum); female age 10, male age 12; football women duplicate absent; 236 rows; 45 confirmed date/time; 50 athletics; 0 results.
- Browser/API GET RPC smoke with publishable key after schema; no secrets in repo.
- Document sync hook / GitHub Actions for **drift detection**; do not auto-overwrite the DB when merge occurs unless approved and reconciled. Test conflicts and no fake results.
- PR + CI, **do not Merge unless explicitly authorised**. After merge, test GitHub Pages+mobile/LINE if frontend changed; chat query availability can be independently tested in connected Supabase even while PR open.
